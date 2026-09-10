import * as THREE from 'three';
import { VoxelBatch, box } from './voxelModels.js';
import { TILE_SIZE, MAIN_ROAD_Z, getCrossingX } from './mapLayout.js';

const SIGNAL_COLORS = { red: 0xff365b, yellow: 0xffbd3f, green: 0x8bff7e };
const specialMaterials = {
  window: { color: 0xe4a64f, emissive: 0xff9a26, power: 1.9 },
  lantern: { color: 0xffedb0, emissive: 0xffb239, power: 3.6 },
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

function building(batch, x, z, { width = 5, depth = 4.6, floors = 2, color = 0x946752, shop = false, striped = false, tank = false } = {}) {
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
      const w = awningWidth / strips, color = striped && j % 2 ? 0xf0d6ad : 0xbd4d4e;
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

export function createCityTile(index) {
  const root = new THREE.Group(); root.name = `district-${index}`;
  root.position.x = getCrossingX(index);
  const random = randomFor(index), batch = new VoxelBatch(), records = new Map(), halos = [], signals = [];
  const half = TILE_SIZE / 2;
  const tile = { index, root, role: 'next', reveal: 1, warmth: 0, disposed: false, signal: 'off', lampPositions: [], records, signals };
  const getMaterial = key => {
    if (!records.has(key)) {
      const config = specialMaterials[key] ?? { color: key };
      const m = new THREE.MeshStandardMaterial({ color: config.color, roughness: .85, metalness: 0, alphaHash: true, emissive: config.emissive ?? 0 });
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
  // Three buildings arranged as in the supplied reference: two left, one right.
  const brickPalettes = [0x966b55, 0x9c765e, 0x86624e];
  building(batch, -8.15, -7.55, { width: 4.7, depth: 4.6, floors: 2, color: brickPalettes[index % 3] });
  building(batch, -8.1, -.65, { width: 4.9, depth: 3.55, floors: 1, color: 0xa45f49, shop: true });
  building(batch, 7.65, -2.36, { width: 5.5, depth: 5.65, floors: 3, color: brickPalettes[(index + 1) % 3], shop: true, striped: true, tank: true });
  // Trees, planted courtyards and block walls fill the spaces between buildings.
  for (const [x,z,scale] of [[-11.2,-10.8,.88],[-4.35,-10.5,.88],[-11.4,-4.25,.8],[-4.05,-4.7,.85],[4.2,-10.15,1.1],[7.3,-10.8,1.25],[11,-9.3,.8],[11.55,-4.3,.85],[11.4,.15,.7],[-10.5,11.4,.64],[10.8,11.3,.64]]) tree(batch,x,z,scale);
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
    const sprite = new THREE.Sprite(material); sprite.position.set(x,2.84,z);sprite.scale.set(1.55,1.55,1); root.add(sprite);halos.push(sprite);
    tile.lampPositions.push(new THREE.Vector3(x,2.85,z));
  }
  for(const x of [-11.6,-4.3,4.3,11.6]) for(const z of [1.12,8.15]) streetLamp(x,z);
  streetLamp(-3.9,-10.8);streetLamp(3.9,-10.8);

  function trafficLight(x,z) {
    batch.add(0x354457,[.51,.24,.51],[x,.39,z]);
    batch.add(0x53687b,[.2,2.35,.2],[x,1.64,z]);
    batch.add(0x15213a,[.57,1.34,.47],[x,3.12,z]);
    batch.add(0x2e3e52,[.69,.13,.63],[x,3.83,z+.03]);
    const lamps = {};
    for(const [i,name] of ['red','yellow','green'].entries()) {
      const m = new THREE.MeshStandardMaterial({color:0x162436,emissive:SIGNAL_COLORS[name],roughness:.6,alphaHash:true});
      lamps[name]=box(root,[.31,.27,.08],[x,3.55-i*.43,z+.277],m,{shadow:false});
      batch.add(0x0f1c2e,[.4,.06,.19],[x,3.72-i*.43,z+.3]);
    }
    signals.push({lamps,position:new THREE.Vector3(x,3,z)});
  }
  trafficLight(-3.72,MAIN_ROAD_Z+3.36); trafficLight(3.72,MAIN_ROAD_Z-3.36);
  batch.build(root,getMaterial);

  tile.setSignal = state => {
    if(!['off','red','yellow','green'].includes(state)) throw new RangeError('Stato semaforo non valido.');
    tile.signal=state;
  };
  tile.setRole = role => {
    if(tile.role!==role && role!=='current') tile.warmth=0;
    tile.role=role;
  };
  tile.update = (dt,reveal,{reducedMotion=false,caught=false}={}) => {
    tile.reveal=reveal;
    const target = tile.role==='current' && !caught ? 1 : 0;
    tile.warmth = reducedMotion ? target : tile.warmth+(target-tile.warmth)*(1-Math.exp(-dt*6));
    if(target===0) tile.warmth=0;
    const brightness = tile.role==='current' ? .35+.65*tile.warmth : tile.role==='previous' ? .52 : .19;
    for(const record of records.values()) {
      record.material.color.copy(record.base).multiplyScalar(brightness);
      record.material.emissiveIntensity=record.power*tile.warmth;
      record.material.opacity=reveal;
    }
    for(const sprite of halos) sprite.material.opacity=tile.warmth*reveal*.75;
    for(const signal of signals) for(const [name,lamp] of Object.entries(signal.lamps)) {
      const on=tile.role==='current' && tile.signal===name;
      lamp.material.color.set(on?SIGNAL_COLORS[name]:0x112038);
      lamp.material.emissiveIntensity=on?2.5:0;
      lamp.material.opacity=reveal;
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
