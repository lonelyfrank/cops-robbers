import * as THREE from 'three';
import { VoxelBatch, box } from './voxelModels.js';
import { TILE_SIZE, MAIN_ROAD_Z, getCrossingX } from './mapLayout.js';
import { IntersectionTraffic } from './trafficController.js';
import { createCityLighting, applyCityLighting, getCityLightLevel, getTileReveal, smoothStep } from './cityEffects.js';

const SIGNAL_COLORS = { red: 0xff365b, yellow: 0xffbd3f, green: 0x8bff7e };
const specialMaterials = {
  window: { color: 0xe4a64f, emissive: 0xff9a26, power: 1.9 },
  lantern: { color: 0xffedb0, emissive: 0xffb239, power: 3.6 },
  sign: { color: 0x95cdd1, emissive: 0x458caa, power: 1.3 },
};

// Tiny procedural light halo; shared across districts, never downloaded.
const haloBytes = new Uint8Array(32 * 32 * 4);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const i = (y * 32 + x) * 4, r = Math.hypot((x - 15.5) / 16, (y - 15.5) / 16);
  haloBytes[i] = haloBytes[i + 1] = haloBytes[i + 2] = 255;
  haloBytes[i + 3] = Math.round(255 * Math.max(0, 1 - r) ** 2.5);
}
const haloTexture = new THREE.DataTexture(haloBytes, 32, 32, THREE.RGBAFormat);
haloTexture.needsUpdate = true;

function randomFor(index) {
  let seed = (70241 + index * 98711) | 0;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
}

export function getDistrictStyle(index) {
  const random = randomFor(index + 503);
  const palettes = [[0x966b55,0xa45f49,0x86624e], [0x8a8d9c,0x82716a,0x6c7e94], [0x9a826d,0x8a695a,0x798c87]];
  const colors = palettes[index % palettes.length], awning = [0xbd4d4e,0x537f88,0xb39651][index % 3];
  return {
    amenity: index % 3, treeScale: .86 + random() * .2,
    buildings: [
      { x:-8.15, z:-7.55, width:4.5+random()*.45, depth:4.45+random()*.3, floors:2+(index%3===2?1:0), color:colors[0], tank:index%4===0, fireEscape:index%2===0 },
      { x:-8.1, z:-.75, width:4.7+random()*.35, depth:3.35+random()*.25, floors:1+(index%4===3?1:0), color:colors[1], shop:true, striped:index%2===1, awning },
      { x:7.65, z:-2.5, width:5.2+random()*.5, depth:5.3+random()*.35, floors:3+(index%3===1?1:0), color:colors[2], shop:true, striped:index%2===0, awning, tank:index%3!==1, fireEscape:index%3===1 },
    ],
  };
}

function building(batch, x, z, { width = 5, depth = 4.6, floors = 2, color = 0x946752, shop = false, striped = false, tank = false, awning = 0xbd4d4e, fireEscape = false } = {}) {
  const ground = .25, height = floors * 1.85 + 1.45;
  const front = z + depth / 2, left = x - width / 2;
  batch.add(color, [width, height, depth], [x, ground + height / 2, z]);
  batch.add(0x79564c, [width + .13, .31, depth + .13], [x, .4, z]);
  // Stone lintels, roof cornices and low parapets give the blocks depth.
  for (let i = 1; i <= floors; i++) batch.add(0xb29b86, [width + .18, .15, depth + .18], [x, i * 1.85 + .36, z]);
  batch.add(0x687292, [width + .5, .24, depth + .5], [x, height + ground + .1, z]);
  batch.add(0x3c496c, [width + .28, .08, depth + .28], [x, height + ground + .27, z]);
  for (const sign of [-1, 1]) {
    batch.add(0x848aad, [width + .42, .23, .16], [x, height + .64, z + sign * (depth / 2 + .12)]);
    batch.add(0x848aad, [.16, .23, depth + .42], [x + sign * (width / 2 + .12), height + .64, z]);
  }
  const frontXs = [-width * .29, width * .29];
  for (let floor = 0; floor < floors; floor++) {
    const y = 2.65 + floor * 1.85;
    for (const dx of frontXs) {
      batch.add(0x382f39, [1.02, 1.29, .11], [x + dx, y, front + .07]);
      batch.add('window', [.71, 1.02, .13], [x + dx, y, front + .13]);
      batch.add(0xc3a786, [.075, 1.03, .16], [x + dx, y, front + .16]);
      batch.add(0xc3a786, [.77, .075, .16], [x + dx, y, front + .16]);
      batch.add(0xaa9077, [1.14, .15, .31], [x + dx, y - .7, front + .14]);
    }
    for (const dz of [-depth * .26, depth * .26]) {
      batch.add(0x382f39, [.11, 1.29, .96], [left - .065, y, z + dz]);
      batch.add('window', [.13, 1.02, .64], [left - .11, y, z + dz]);
      batch.add(0xc3a786, [.16, 1.03, .065], [left - .13, y, z + dz]);
      batch.add(0xc3a786, [.16, .075, .72], [left - .13, y, z + dz]);
      batch.add(0xaa9077, [.3, .15, 1.1], [left - .14, y - .7, z + dz]);
    }
  }
  // Ground-floor door and illuminated shop windows.
  batch.add(0x2e303e, [.8, 1.53, .13], [x, 1.07, front + .06]);
  batch.add(0x647272, [.12, .12, .17], [x + .23, 1.05, front + .13]);
  if (shop) {
    for (const dx of frontXs) {
      batch.add(0x40323a, [1.45, 1.43, .1], [x + dx, 1.07, front + .07]);
      batch.add('window', [1.19, 1.16, .13], [x + dx, 1.1, front + .12]);
      batch.add(0x684538, [.07, 1.22, .17], [x + dx, 1.08, front + .17]);
    }
    const awningWidth = width - .25, strips = striped ? 10 : 1;
    for (let j = 0; j < strips; j++) {
      const w = awningWidth / strips, color = striped && j % 2 ? 0xf0d6ad : awning;
      batch.add(color, [w, .15, .87], [x - awningWidth / 2 + (j + .5) * w, 1.92, front + .39], [-.22, 0, 0]);
      batch.add(color, [w, .24, .14], [x - awningWidth / 2 + (j + .5) * w, 1.73, front + .8]);
    }
  }
  // Roof hardware: AC units, antenna and a blocky water tank.
  batch.add(0x8b93a5, [1.04, .66, .97], [x - 1, height + .73, z - .55]);
  batch.add(0x4e5974, [.62, .39, .07], [x - 1, height + .75, z - .02]);
  for (let i = 0; i < 4; i++) batch.add(0x737f93, [.72, .045, .085], [x - 1, height + .59 + i * .1, z + .015]);
  batch.add(0x697c9b, [.12, 2.7, .12], [x + 1.4, height + 1.59, z - 1.2]);
  for (let i = 0; i < 3; i++) {
    batch.add(0x727d99, [.8, .1, .12], [x + 1.4, height + .86 + i * .7, z - 1.2]);
    batch.add(0x98a1bb, [.18, .26, .22], [x + 1.05, height + .96 + i * .7, z - 1.2]);
  }
  if (tank) {
    batch.add(0x303b51, [1.58, .15, 1.58], [x + .65, height + .67, z + .57]);
    for (const dx of [-.58, .58]) for (const dz of [-.58, .58]) batch.add(0x343f50, [.13, .63, .13], [x + .65 + dx, height + .98, z + .57 + dz]);
    batch.add(0x87503f, [1.42, 1.19, 1.42], [x + .65, height + 1.75, z + .57]);
    batch.add(0x333d54, [1.53, .16, 1.53], [x + .65, height + 2.38, z + .57]);
  }
  if (fireEscape) {
    for (let floor = 1; floor <= floors; floor++) {
      const y = .5 + floor * 1.85;
      batch.add(0x424e62, [.65,.1,1.8], [left-.32,y,z]);
      batch.add(0x424e62, [.08,.55,1.8], [left-.63,y+.3,z]);
    }
    for (const dz of [-.42,.42]) batch.add(0x424e62,[.1,height-.5,.08],[left-.45,height/2+.55,z+dz]);
    for (let y=1;y<height;y+=.32) batch.add(0x67788b,[.1,.07,.9],[left-.45,y,z]);
  }
}

function urbanAmenity(batch, variant) {
  const x=7.5,z=-10;
  if(variant===0) {
    // Glass bus shelter with a lit route panel, without floating text.
    batch.add(0x52667a,[3.35,.12,1.55],[x,2.55,z]);
    batch.add(0x45647a,[3.2,1.8,.1],[x,1.55,z-.65]);
    for(const dx of [-1.5,1.5]) batch.add(0x738391,[.12,2.25,.12],[x+dx,1.4,z]);
    batch.add(0x857867,[2.5,.14,.4],[x,.85,z-.15]);
    batch.add('sign',[.65,1.3,.12],[x+1.05,1.62,z-.56]);
  } else if(variant===1) {
    // Subway stairwell and low guard rails.
    batch.add(0x182337,[2.8,.06,2.6],[x,.28,z]);
    for(let step=0;step<5;step++) batch.add(0x7a8791,[2.2,.08,.35],[x,.32+step*.085,z-.8+step*.35]);
    for(const dx of [-1.4,1.4]) {
      batch.add(0x54787c,[.12,.1,2.8],[x+dx,1.35,z]);
      for(const dz of [-1.2,1.2]) batch.add(0x54787c,[.1,1.05,.1],[x+dx,.85,z+dz]);
    }
    batch.add('sign',[1.1,.45,.12],[x,1.4,z-1.3]);
  } else {
    // Compact newsstand, roof canopy and bright display.
    batch.add(0x476f72,[2.25,1.85,1.6],[x,1.2,z]);
    batch.add(0x9c8968,[2.75,.17,2],[x,2.22,z+.1]);
    batch.add('sign',[1.8,.7,.1],[x,1.5,z+.83]);
    batch.add(0xc9b698,[1.9,.15,.55],[x,.95,z+1]);
  }
}

function tree(batch, x, z, scale = 1, color = 0x1d6750) {
  batch.add(0x704b34, [.36 * scale, 1.75 * scale, .38 * scale], [x, .35 + .86 * scale, z]);
  batch.add(color, [1.72 * scale, 1.16 * scale, 1.69 * scale], [x, .3 + 2.15 * scale, z]);
  batch.add(0x2b8253, [1.24 * scale, .63 * scale, 1.26 * scale], [x - .12 * scale, .3 + 2.9 * scale, z]);
  batch.add(0x215b47, [.65 * scale, .83 * scale, .79 * scale], [x + .84 * scale, .3 + 1.91 * scale, z + .06]);
}

function planter(batch, x, z, width, depth) {
  batch.add(0x778076, [width, .47, depth], [x, .43, z]);
  batch.add(0x374530, [width - .24, .13, depth - .24], [x, .69, z]);
  for (let dx = -width / 2 + .4; dx < width / 2; dx += .63) for (let dz = -depth / 2 + .4; dz < depth / 2; dz += .7) {
    batch.add(0x4d813f, [.55, .45, .52], [x + dx, .94, z + dz]);
  }
}

export function createCityTile(index,{lighting=createCityLighting()}={}) {
  const root = new THREE.Group(); root.name = `district-${index}`;
  root.position.x = getCrossingX(index);
  const random = randomFor(index), records = new Map(), halos = [], signals = [], emerging = [];
  let batch = new VoxelBatch();
  const half = TILE_SIZE / 2;
  const style = getDistrictStyle(index);
  const tile = { index, root, style, lighting, emerging, role: 'next', reveal: 1, warmth: .2, disposed: false, signal: 'red', crossSignal: 'green', lampPositions: [], records, signals };
  const getMaterial = key => {
    if (!records.has(key)) {
      const config = specialMaterials[key] ?? { color: key };
      const m = new THREE.MeshStandardMaterial({ color: config.color, roughness: .85, metalness: 0, alphaHash: true, emissive: config.emissive ?? 0 });
      applyCityLighting(m,lighting);
      records.set(key, { material: m, base: new THREE.Color(config.color), power: config.power ?? 0, kind: config.power ? 'warm' : 'solid' });
    }
    return records.get(key).material;
  };

  // Square floating foundation, with exposed, staggered voxel strata.
  batch.add(0x21324e, [TILE_SIZE, 2.6, TILE_SIZE], [0, -1.52, 0]);
  batch.add(0x674536, [TILE_SIZE, .65, TILE_SIZE], [0, -.54, 0]);
  batch.add(0xada69c, [TILE_SIZE, .3, TILE_SIZE], [0, -.05, 0]);
  for (let edge = -half + 1; edge < half; edge += 2) {
    for (const sign of [-1, 1]) {
      const color = random() > .45 ? 0x1b2e4b : 0x2b3b56;
      const depth = .5 + random() * .65;
      batch.add(color, [1.97, depth, .32], [edge, -2.72 - depth / 2, sign * (half - .1)]);
      batch.add(color, [.32, depth, 1.97], [sign * (half - .1), -2.72 - depth / 2, edge]);
      batch.add(0x544238, [1.98, .44, .13], [edge, -1.08, sign * (half + .025)]);
    }
  }
  // Pale paving blocks across the four blocks, with two actual crossing streets.
  for (let x = -half + .5; x < half; x += 1) for (let z = -half + .5; z < half; z += 1) {
    if (Math.abs(x) < 3 || Math.abs(z - MAIN_ROAD_Z) < 3) continue;
    batch.add(random() > .66 ? 0xc4b9a8 : 0xb6afa5, [.975, .13, .975], [x, .185, z]);
  }
  batch.add(0x18233c, [TILE_SIZE, .08, 5.8], [0, .065, MAIN_ROAD_Z]);
  batch.add(0x19253d, [5.8, .081, TILE_SIZE], [0, .071, 0]);
  for (const side of [-1, 1]) {
    for (const z of [MAIN_ROAD_Z - 3, MAIN_ROAD_Z + 3]) {
      batch.add(0xd5c9b4, [9.85, .27, .22], [side * 7.96, .205, z]);
      batch.add(0xe7d7bd, [9.78, .017, .065], [side * 8, .122, z + (z < MAIN_ROAD_Z ? .2 : -.2)]);
    }
    batch.add(0xd5c9b4, [.22, .27, 14.55], [side * 3, .205, -5.72]);
    batch.add(0xd5c9b4, [.22, .27, 5.3], [side * 3, .205, 10.35]);
    batch.add(0xe7d7bd, [.065, .018, 14.45], [side * 2.78, .13, -5.73]);
    batch.add(0xe7d7bd, [.065, .018, 5.18], [side * 2.78, .13, 10.34]);
  }
  // Dashed lane markings align exactly at tile connectors.
  for (let x = -12; x <= 12; x += 3) if (Math.abs(x) > 4) batch.add(0xd9dcdf, [1.08, .018, .11], [x, .122, MAIN_ROAD_Z]);
  for (let z = -11.5; z < 13; z += 3) if (Math.abs(z - MAIN_ROAD_Z) > 4) batch.add(0xd9dcdf, [.11, .018, 1.05], [0, .127, z]);
  for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
    batch.add(0xf0eadc, [1.22, .025, .4], [side * 3.73, .137, MAIN_ROAD_Z - 2.43 + i * .695]);
    batch.add(0xf0eadc, [.4, .025, 1.22], [-2.43 + i * .695, .142, MAIN_ROAD_Z + side * 3.73]);
  }
  // Roads stay flat while individual structures rise from their ground anchors.
  batch.build(root,getMaterial);
  function growthGroup(name,delay) {
    const anchor=new THREE.Group(),content=new THREE.Group();
    anchor.name=name;anchor.position.y=.25;content.position.y=-.25;
    anchor.add(content);root.add(anchor);emerging.push({root:anchor,delay,growth:1});
    return content;
  }
  for(const [i,config] of style.buildings.entries()) {
    const buildingBatch=new VoxelBatch();
    building(buildingBatch,config.x,config.z,config);
    buildingBatch.build(growthGroup(`building-${i}`,i*.12),getMaterial);
  }
  const objectRoot=growthGroup('street-objects',.08);
  batch=new VoxelBatch();
  urbanAmenity(batch,style.amenity);
  // Trees, planted courtyards and block walls fill the spaces between buildings.
  for (const [x,z,scale] of [[-11.2,-10.8,.88],[-4.35,-10.5,.88],[-11.4,-4.25,.8],[-4.05,-4.7,.85],[4.2,-10.15,1.1],[11,-9.3,.8],[11.55,-4.3,.85],[11.4,.15,.7],[-10.5,11.4,.64],[10.8,11.3,.64]]) tree(batch,x,z,scale*style.treeScale);
  planter(batch, -4.3, -7.35, 1.17, 3.45); planter(batch, 5.35, -8.2, 3.6, 1.16); planter(batch, 10.9, -6.3, 1.15, 3.35);
  for (const [x,z] of [[-11.25,-.3],[-5.15,.25],[4.6,-.3],[10.6,.32],[-6.6,11.2],[7.1,11.2]]) {
    batch.add(0xa58065, [.56,.57,.56], [x,.54,z]); batch.add(0x43894a, [.7,.63,.67], [x,1.02,z]);
    batch.add(random() > .5 ? 0xda7451 : 0xc09b58, [.19,.2,.19], [x+.12,1.4,z+.08]);
  }
  for (const side of [-1,1]) {
    for (let z=-12;z<.6;z+=.93) batch.add(0x8b877d, [.27,.62,.9], [side*12.42,.56,z]);
    for (let x=3.4;x<12.5;x+=.92) batch.add(0x9a9689, [.89,.61,.25], [side*x,.56,-12.4]);
    // Short benches on the open foreground sidewalk leave the escape alley clear.
    const x=side*8.4;
    batch.add(0x5f5644,[1.7,.12,.44],[x,.83,10.15]);
    batch.add(0x475969,[1.8,.43,.12],[x,1.17,10.4]);
    for(const dx of [-.7,.7]) batch.add(0x344b61,[.12,.62,.12],[x+dx,.56,10.15]);
  }
  // Actual cashout alley, aligned with the waiting position on the next tile.
  for(let z=8.5;z<13;z+=.6) batch.add(0xc9b994,[1.02,.035,.57],[-4.7,.274,z]);

  function streetLamp(x,z) {
    batch.add(0x344252,[.48,.3,.48],[x,.39,z]);
    batch.add(0x586573,[.16,2.05,.16],[x,1.47,z]);
    batch.add(0x344252,[.46,.1,.46],[x,2.54,z]);
    batch.add('lantern',[.3,.48,.3],[x,2.8,z]);
    batch.add(0x3d4b5c,[.49,.12,.49],[x,3.1,z]);
    const material = new THREE.SpriteMaterial({map:haloTexture,color:0xffb14d,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const sprite = new THREE.Sprite(material); sprite.position.set(x,2.84,z);sprite.scale.set(1.55,1.55,1); objectRoot.add(sprite);halos.push(sprite);
    tile.lampPositions.push(new THREE.Vector3(x,2.85,z));
  }
  for(const x of [-11.6,-4.3,4.3,11.6]) for(const z of [1.12,8.15]) {
    // Keep the foreground corner clear so poles cannot cover the road multiplier.
    if(x===-4.3&&z===8.15) continue;
    streetLamp(x,z);
  }
  streetLamp(-3.9,-10.8);streetLamp(3.9,-10.8);

  function trafficLight(x,z,axis='main') {
    batch.add(0x354457,[.51,.24,.51],[x,.39,z]);
    batch.add(0x53687b,[.2,2.35,.2],[x,1.64,z]);
    batch.add(0x15213a,[.57,1.34,.47],[x,3.12,z]);
    batch.add(0x2e3e52,[.69,.13,.63],[x,3.83,z+.03]);
    const lamps = {};
    for(const [i,name] of ['red','yellow','green'].entries()) {
      const m = new THREE.MeshStandardMaterial({color:0x162436,emissive:SIGNAL_COLORS[name],roughness:.6,alphaHash:true});
      lamps[name]=box(objectRoot,[.31,.27,.08],[x,3.55-i*.43,z+.277],m,{shadow:false});
      batch.add(0x0f1c2e,[.4,.06,.19],[x,3.72-i*.43,z+.3]);
    }
    signals.push({lamps,axis,position:new THREE.Vector3(x,3,z)});
  }
  trafficLight(3.72,MAIN_ROAD_Z-3.36);
  trafficLight(-3.72,MAIN_ROAD_Z-3.36,'cross');
  batch.build(objectRoot,getMaterial);
  tile.traffic = new IntersectionTraffic(index,getMaterial); objectRoot.add(tile.traffic.root);

  tile.setSignal = state => {
    if(!['off','red','yellow','green'].includes(state)) throw new RangeError('Stato semaforo non valido.');
    tile.signal=state;
  };
  tile.setRole = role => { tile.role=role; };
  tile.update = (dt,progress,{reducedMotion=false,trafficBlocked=false}={}) => {
    const reveal=getTileReveal(reducedMotion?1:progress);
    tile.reveal=reveal.base;tile.progress=progress;
    root.position.y=(reveal.base-1)*3.4;
    for(const item of emerging) {
      item.growth=smoothStep((reveal.objects-item.delay)/(1-item.delay));
      item.root.scale.y=Math.max(.001,item.growth);
      item.root.visible=item.growth>.001;
    }
    const focus=lighting.focusX.value,capture=1-.82*lighting.capture.value;
    tile.warmth=getCityLightLevel(root.position.x,focus)*capture;
    for(const record of records.values()) {
      record.material.color.copy(record.base);
      record.material.emissiveIntensity=record.power;
      record.material.opacity=reveal.base;
    }
    for(const sprite of halos) sprite.material.opacity=getCityLightLevel(root.position.x+sprite.position.x,focus)*capture*reveal.base*.75;
    tile.crossSignal = !trafficBlocked && tile.signal==='red' ? 'green' : 'red';
    tile.traffic.update(dt,tile.crossSignal==='green',reducedMotion,trafficBlocked);
    for(const signal of signals) for(const [name,lamp] of Object.entries(signal.lamps)) {
      const on=tile.role!=='retiring' && (signal.axis==='main'?tile.signal:tile.crossSignal)===name;
      lamp.material.color.set(on?SIGNAL_COLORS[name]:0x112038);
      lamp.material.emissiveIntensity=on?2.5*getCityLightLevel(root.position.x+signal.position.x,focus):0;
      lamp.material.opacity=reveal.base;
    }
  };
  tile.dispose = () => {
    if(tile.disposed)return;
    tile.disposed=true;root.removeFromParent();
    records.forEach(record=>record.material.dispose());
    signals.forEach(signal=>Object.values(signal.lamps).forEach(lamp=>lamp.material.dispose()));
    halos.forEach(sprite=>sprite.material.dispose());
    // InstancedMesh.dispose releases instance buffers without touching unitBox.
    root.traverse(object=>{if(object.isInstancedMesh)object.dispose();});root.clear();
  };
  return tile;
}

export function disposeTileSharedAssets(){haloTexture.dispose();}
