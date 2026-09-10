import * as THREE from 'three';
import { VoxelBatch, box } from './voxelModels.js';
import { TILE_SIZE, MAIN_ROAD_Z, ALLEY_LOCAL_X } from './mapLayout.js';
import { IntersectionTraffic } from './trafficController.js';
export const SIGNAL_COLORS = Object.freeze({ red: 0xff365b, yellow: 0xffbd3f, green: 0x8bff7e });

function randomFor(index) {
  let seed = (70241 + index * 98711) | 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

export function getDistrictStyle(index) {
  const random = randomFor(index + 503);
  const palettes = [
    [0x966b55, 0xa45f49, 0x86624e],
    [0x8a8d9c, 0x82716a, 0x6c7e94],
    [0x9a826d, 0x8a695a, 0x798c87],
  ];
  const colors = palettes[index % palettes.length],
    awning = [0xbd4d4e, 0x537f88, 0xb39651][index % 3];
  return {
    amenity: index % 3,
    treeScale: 0.86 + random() * 0.2,
    buildings: [
      {
        x: -8.15,
        z: -7.55,
        width: 4.5 + random() * 0.45,
        depth: 4.45 + random() * 0.3,
        floors: 2 + (index % 3 === 2 ? 1 : 0),
        color: colors[0],
        tank: index % 4 === 0,
        fireEscape: index % 2 === 0,
      },
      {
        x: -8.1,
        z: -0.75,
        width: 4.7 + random() * 0.35,
        depth: 3.35 + random() * 0.25,
        floors: 1 + (index % 4 === 3 ? 1 : 0),
        color: colors[1],
        shop: true,
        striped: index % 2 === 1,
        awning,
      },
      {
        x: 7.65,
        z: -2.5,
        width: 5.2 + random() * 0.5,
        depth: 5.3 + random() * 0.35,
        floors: 3 + (index % 3 === 1 ? 1 : 0),
        color: colors[2],
        shop: true,
        striped: index % 2 === 0,
        awning,
        tank: index % 3 !== 1,
        fireEscape: index % 3 === 1,
      },
    ],
  };
}

function building(
  batch,
  x,
  z,
  {
    width = 5,
    depth = 4.6,
    floors = 2,
    color = 0x946752,
    shop = false,
    striped = false,
    tank = false,
    awning = 0xbd4d4e,
    fireEscape = false,
  } = {},
) {
  const ground = 0.25,
    height = floors * 1.85 + 1.45;
  const front = z + depth / 2,
    left = x - width / 2;
  batch.add(color, [width, height, depth], [x, ground + height / 2, z]);
  batch.add(0x79564c, [width + 0.13, 0.31, depth + 0.13], [x, 0.4, z]);
  // Stone lintels, roof cornices and low parapets give the blocks depth.
  for (let i = 1; i <= floors; i++)
    batch.add(0xb29b86, [width + 0.18, 0.15, depth + 0.18], [x, i * 1.85 + 0.36, z]);
  batch.add(0x687292, [width + 0.5, 0.24, depth + 0.5], [x, height + ground + 0.1, z]);
  batch.add(0x3c496c, [width + 0.28, 0.08, depth + 0.28], [x, height + ground + 0.27, z]);
  for (const sign of [-1, 1]) {
    batch.add(
      0x848aad,
      [width + 0.42, 0.23, 0.16],
      [x, height + 0.64, z + sign * (depth / 2 + 0.12)],
    );
    batch.add(
      0x848aad,
      [0.16, 0.23, depth + 0.42],
      [x + sign * (width / 2 + 0.12), height + 0.64, z],
    );
  }
  const frontXs = [-width * 0.29, width * 0.29];
  for (let floor = 0; floor < floors; floor++) {
    const y = 2.65 + floor * 1.85;
    for (const dx of frontXs) {
      batch.add(0x382f39, [1.02, 1.29, 0.11], [x + dx, y, front + 0.07]);
      batch.add('window', [0.71, 1.02, 0.13], [x + dx, y, front + 0.13]);
      batch.add(0xc3a786, [0.075, 1.03, 0.16], [x + dx, y, front + 0.16]);
      batch.add(0xc3a786, [0.77, 0.075, 0.16], [x + dx, y, front + 0.16]);
      batch.add(0xaa9077, [1.14, 0.15, 0.31], [x + dx, y - 0.7, front + 0.14]);
    }
    for (const dz of [-depth * 0.26, depth * 0.26]) {
      batch.add(0x382f39, [0.11, 1.29, 0.96], [left - 0.065, y, z + dz]);
      batch.add('window', [0.13, 1.02, 0.64], [left - 0.11, y, z + dz]);
      batch.add(0xc3a786, [0.16, 1.03, 0.065], [left - 0.13, y, z + dz]);
      batch.add(0xc3a786, [0.16, 0.075, 0.72], [left - 0.13, y, z + dz]);
      batch.add(0xaa9077, [0.3, 0.15, 1.1], [left - 0.14, y - 0.7, z + dz]);
    }
  }
  // Ground-floor door and illuminated shop windows.
  batch.add(0x2e303e, [0.8, 1.53, 0.13], [x, 1.07, front + 0.06]);
  batch.add(0x647272, [0.12, 0.12, 0.17], [x + 0.23, 1.05, front + 0.13]);
  if (shop) {
    for (const dx of frontXs) {
      batch.add(0x40323a, [1.45, 1.43, 0.1], [x + dx, 1.07, front + 0.07]);
      batch.add('window', [1.19, 1.16, 0.13], [x + dx, 1.1, front + 0.12]);
      batch.add(0x684538, [0.07, 1.22, 0.17], [x + dx, 1.08, front + 0.17]);
    }
    const awningWidth = width - 0.25,
      strips = striped ? 10 : 1;
    for (let j = 0; j < strips; j++) {
      const w = awningWidth / strips,
        color = striped && j % 2 ? 0xf0d6ad : awning;
      batch.add(
        color,
        [w, 0.15, 0.87],
        [x - awningWidth / 2 + (j + 0.5) * w, 1.92, front + 0.39],
        [-0.22, 0, 0],
      );
      batch.add(color, [w, 0.24, 0.14], [x - awningWidth / 2 + (j + 0.5) * w, 1.73, front + 0.8]);
    }
  }
  // Roof hardware: AC units, antenna and a blocky water tank.
  batch.add(0x8b93a5, [1.04, 0.66, 0.97], [x - 1, height + 0.73, z - 0.55]);
  batch.add(0x4e5974, [0.62, 0.39, 0.07], [x - 1, height + 0.75, z - 0.02]);
  for (let i = 0; i < 4; i++)
    batch.add(0x737f93, [0.72, 0.045, 0.085], [x - 1, height + 0.59 + i * 0.1, z + 0.015]);
  batch.add(0x697c9b, [0.12, 2.7, 0.12], [x + 1.4, height + 1.59, z - 1.2]);
  for (let i = 0; i < 3; i++) {
    batch.add(0x727d99, [0.8, 0.1, 0.12], [x + 1.4, height + 0.86 + i * 0.7, z - 1.2]);
    batch.add(0x98a1bb, [0.18, 0.26, 0.22], [x + 1.05, height + 0.96 + i * 0.7, z - 1.2]);
  }
  if (tank) {
    batch.add(0x303b51, [1.58, 0.15, 1.58], [x + 0.65, height + 0.67, z + 0.57]);
    for (const dx of [-0.58, 0.58])
      for (const dz of [-0.58, 0.58])
        batch.add(0x343f50, [0.13, 0.63, 0.13], [x + 0.65 + dx, height + 0.98, z + 0.57 + dz]);
    batch.add(0x87503f, [1.42, 1.19, 1.42], [x + 0.65, height + 1.75, z + 0.57]);
    batch.add(0x333d54, [1.53, 0.16, 1.53], [x + 0.65, height + 2.38, z + 0.57]);
  }
  if (fireEscape) {
    for (let floor = 1; floor <= floors; floor++) {
      const y = 0.5 + floor * 1.85;
      batch.add(0x424e62, [0.65, 0.1, 1.8], [left - 0.32, y, z]);
      batch.add(0x424e62, [0.08, 0.55, 1.8], [left - 0.63, y + 0.3, z]);
    }
    for (const dz of [-0.42, 0.42])
      batch.add(0x424e62, [0.1, height - 0.5, 0.08], [left - 0.45, height / 2 + 0.55, z + dz]);
    for (let y = 1; y < height; y += 0.32)
      batch.add(0x67788b, [0.1, 0.07, 0.9], [left - 0.45, y, z]);
  }
}

function urbanAmenity(batch, variant) {
  const x = 7.5,
    z = -10;
  if (variant === 0) {
    // Glass bus shelter with a lit route panel, without floating text.
    batch.add(0x52667a, [3.35, 0.12, 1.55], [x, 2.55, z]);
    batch.add(0x45647a, [3.2, 1.8, 0.1], [x, 1.55, z - 0.65]);
    for (const dx of [-1.5, 1.5]) batch.add(0x738391, [0.12, 2.25, 0.12], [x + dx, 1.4, z]);
    batch.add(0x857867, [2.5, 0.14, 0.4], [x, 0.85, z - 0.15]);
    batch.add('sign', [0.65, 1.3, 0.12], [x + 1.05, 1.62, z - 0.56]);
  } else if (variant === 1) {
    // Subway stairwell and low guard rails.
    batch.add(0x182337, [2.8, 0.06, 2.6], [x, 0.28, z]);
    for (let step = 0; step < 5; step++)
      batch.add(0x7a8791, [2.2, 0.08, 0.35], [x, 0.32 + step * 0.085, z - 0.8 + step * 0.35]);
    for (const dx of [-1.4, 1.4]) {
      batch.add(0x54787c, [0.12, 0.1, 2.8], [x + dx, 1.35, z]);
      for (const dz of [-1.2, 1.2]) batch.add(0x54787c, [0.1, 1.05, 0.1], [x + dx, 0.85, z + dz]);
    }
    batch.add('sign', [1.1, 0.45, 0.12], [x, 1.4, z - 1.3]);
  } else {
    // Compact newsstand, roof canopy and bright display.
    batch.add(0x476f72, [2.25, 1.85, 1.6], [x, 1.2, z]);
    batch.add(0x9c8968, [2.75, 0.17, 2], [x, 2.22, z + 0.1]);
    batch.add('sign', [1.8, 0.7, 0.1], [x, 1.5, z + 0.83]);
    batch.add(0xc9b698, [1.9, 0.15, 0.55], [x, 0.95, z + 1]);
  }
}

function tree(batch, x, z, scale = 1, color = 0x1d6750) {
  batch.add(0x704b34, [0.36 * scale, 1.75 * scale, 0.38 * scale], [x, 0.35 + 0.86 * scale, z]);
  batch.add(color, [1.72 * scale, 1.16 * scale, 1.69 * scale], [x, 0.3 + 2.15 * scale, z]);
  batch.add(
    0x2b8253,
    [1.24 * scale, 0.63 * scale, 1.26 * scale],
    [x - 0.12 * scale, 0.3 + 2.9 * scale, z],
  );
  batch.add(
    0x215b47,
    [0.65 * scale, 0.83 * scale, 0.79 * scale],
    [x + 0.84 * scale, 0.3 + 1.91 * scale, z + 0.06],
  );
}

function planter(batch, x, z, width, depth) {
  batch.add(0x778076, [width, 0.47, depth], [x, 0.43, z]);
  batch.add(0x374530, [width - 0.24, 0.13, depth - 0.24], [x, 0.69, z]);
  for (let dx = -width / 2 + 0.4; dx < width / 2; dx += 0.63)
    for (let dz = -depth / 2 + 0.4; dz < depth / 2; dz += 0.7) {
      batch.add(0x4d813f, [0.55, 0.45, 0.52], [x + dx, 0.94, z + dz]);
    }
}

function buildFoundation(batch, random) {
  const half = TILE_SIZE / 2;
  // Square floating foundation, with exposed, staggered voxel strata.
  batch.add(0x21324e, [TILE_SIZE, 2.6, TILE_SIZE], [0, -1.52, 0]);
  batch.add(0x674536, [TILE_SIZE, 0.65, TILE_SIZE], [0, -0.54, 0]);
  batch.add(0xada69c, [TILE_SIZE, 0.3, TILE_SIZE], [0, -0.05, 0]);
  for (let edge = -half + 1; edge < half; edge += 2) {
    for (const sign of [-1, 1]) {
      const color = random() > 0.45 ? 0x1b2e4b : 0x2b3b56;
      const depth = 0.5 + random() * 0.65;
      batch.add(color, [1.97, depth, 0.32], [edge, -2.72 - depth / 2, sign * (half - 0.1)]);
      batch.add(color, [0.32, depth, 1.97], [sign * (half - 0.1), -2.72 - depth / 2, edge]);
      batch.add(0x544238, [1.98, 0.44, 0.13], [edge, -1.08, sign * (half + 0.025)]);
    }
  }
  // Pale paving blocks across the four blocks, with two actual crossing streets.
  for (let x = -half + 0.5; x < half; x += 1)
    for (let z = -half + 0.5; z < half; z += 1) {
      if (Math.abs(x) < 3 || Math.abs(z - MAIN_ROAD_Z) < 3) continue;
      batch.add(random() > 0.66 ? 0xc4b9a8 : 0xb6afa5, [0.975, 0.13, 0.975], [x, 0.185, z]);
    }
  batch.add(0x18233c, [TILE_SIZE, 0.08, 5.8], [0, 0.065, MAIN_ROAD_Z]);
  batch.add(0x19253d, [5.8, 0.081, TILE_SIZE], [0, 0.071, 0]);
  for (const side of [-1, 1]) {
    for (const z of [MAIN_ROAD_Z - 3, MAIN_ROAD_Z + 3]) {
      batch.add(0xd5c9b4, [9.85, 0.27, 0.22], [side * 7.96, 0.205, z]);
      batch.add(
        0xe7d7bd,
        [9.78, 0.017, 0.065],
        [side * 8, 0.122, z + (z < MAIN_ROAD_Z ? 0.2 : -0.2)],
      );
    }
    batch.add(0xd5c9b4, [0.22, 0.27, 14.55], [side * 3, 0.205, -5.72]);
    batch.add(0xd5c9b4, [0.22, 0.27, 5.3], [side * 3, 0.205, 10.35]);
    batch.add(0xe7d7bd, [0.065, 0.018, 14.45], [side * 2.78, 0.13, -5.73]);
    batch.add(0xe7d7bd, [0.065, 0.018, 5.18], [side * 2.78, 0.13, 10.34]);
  }
  // Dashed lane markings align exactly at tile connectors.
  for (let x = -12; x <= 12; x += 3)
    if (Math.abs(x) > 4) batch.add(0xd9dcdf, [1.08, 0.018, 0.11], [x, 0.122, MAIN_ROAD_Z]);
  for (let z = -11.5; z < 13; z += 3)
    if (Math.abs(z - MAIN_ROAD_Z) > 4) batch.add(0xd9dcdf, [0.11, 0.018, 1.05], [0, 0.127, z]);
  for (const side of [-1, 1])
    for (let i = 0; i < 8; i++) {
      batch.add(0xf0eadc, [1.22, 0.025, 0.4], [side * 3.73, 0.137, MAIN_ROAD_Z - 2.43 + i * 0.695]);
      batch.add(
        0xf0eadc,
        [0.4, 0.025, 1.22],
        [-2.43 + i * 0.695, 0.142, MAIN_ROAD_Z + side * 3.73],
      );
    }
}

export function buildDistrictGeometry(index, root, getMaterial, haloTexture) {
  const random = randomFor(index),
    style = getDistrictStyle(index),
    halos = [],
    signals = [],
    emerging = [];
  let batch = new VoxelBatch();
  // Roads stay flat while individual structures rise from their ground anchors.
  buildFoundation(batch, random);
  batch.build(root, getMaterial);
  function growthGroup(name, delay) {
    const anchor = new THREE.Group(),
      content = new THREE.Group();
    anchor.name = name;
    anchor.position.y = 0.25;
    content.position.y = -0.25;
    anchor.add(content);
    root.add(anchor);
    emerging.push({ root: anchor, delay, growth: 1 });
    return content;
  }
  for (const [i, config] of style.buildings.entries()) {
    const buildingBatch = new VoxelBatch();
    building(buildingBatch, config.x, config.z, config);
    buildingBatch.build(growthGroup(`building-${i}`, i * 0.12), getMaterial);
  }
  const objectRoot = growthGroup('street-objects', 0.08);
  batch = new VoxelBatch();
  urbanAmenity(batch, style.amenity);
  // Trees, planted courtyards and block walls fill the spaces between buildings.
  for (const [x, z, scale] of [
    [-11.2, -10.8, 0.88],
    [-4.35, -10.5, 0.88],
    [-11.4, -4.25, 0.8],
    [-4.05, -4.7, 0.85],
    [4.2, -10.15, 1.1],
    [11, -9.3, 0.8],
    [11.55, -4.3, 0.85],
    [11.4, 0.15, 0.7],
    [-10.5, 11.4, 0.64],
    [10.8, 11.3, 0.64],
  ])
    tree(batch, x, z, scale * style.treeScale);
  planter(batch, -4.3, -7.35, 1.17, 3.45);
  planter(batch, 5.35, -8.2, 3.6, 1.16);
  planter(batch, 10.9, -6.3, 1.15, 3.35);
  for (const [x, z] of [
    [-11.25, -0.3],
    [-5.15, 0.25],
    [4.6, -0.3],
    [10.6, 0.32],
    [-6.6, 11.2],
    [7.1, 11.2],
  ]) {
    batch.add(0xa58065, [0.56, 0.57, 0.56], [x, 0.54, z]);
    batch.add(0x43894a, [0.7, 0.63, 0.67], [x, 1.02, z]);
    batch.add(random() > 0.5 ? 0xda7451 : 0xc09b58, [0.19, 0.2, 0.19], [x + 0.12, 1.4, z + 0.08]);
  }
  for (const side of [-1, 1]) {
    for (let z = -12; z < 0.6; z += 0.93)
      batch.add(0x8b877d, [0.27, 0.62, 0.9], [side * 12.42, 0.56, z]);
    for (let x = 3.4; x < 12.5; x += 0.92)
      batch.add(0x9a9689, [0.89, 0.61, 0.25], [side * x, 0.56, -12.4]);
    // Short benches on the open foreground sidewalk leave the escape alley clear.
    const x = side * 8.4;
    batch.add(0x5f5644, [1.7, 0.12, 0.44], [x, 0.83, 10.15]);
    batch.add(0x475969, [1.8, 0.43, 0.12], [x, 1.17, 10.4]);
    for (const dx of [-0.7, 0.7]) batch.add(0x344b61, [0.12, 0.62, 0.12], [x + dx, 0.56, 10.15]);
  }
  // Both safe-stop lanes have real paving, including the final cashout.
  for (const x of ALLEY_LOCAL_X)
    for (let z = 8.5; z < 13; z += 0.6) batch.add(0xc9b994, [1.02, 0.035, 0.57], [x, 0.274, z]);

  function streetLamp(x, z) {
    batch.add(0x344252, [0.48, 0.3, 0.48], [x, 0.39, z]);
    batch.add(0x586573, [0.16, 2.05, 0.16], [x, 1.47, z]);
    batch.add(0x344252, [0.46, 0.1, 0.46], [x, 2.54, z]);
    batch.add('lantern', [0.3, 0.48, 0.3], [x, 2.8, z]);
    batch.add(0x3d4b5c, [0.49, 0.12, 0.49], [x, 3.1, z]);
    const material = new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0xffb14d,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, 2.84, z);
    sprite.scale.set(1.55, 1.55, 1);
    objectRoot.add(sprite);
    halos.push(sprite);
  }
  for (const x of [-11.6, -4.3, 4.3, 11.6])
    for (const z of [1.12, 8.15]) {
      // Keep the foreground corner clear so poles cannot cover the road multiplier.
      if (x === -4.3 && z === 8.15) continue;
      streetLamp(x, z);
    }
  streetLamp(-3.9, -10.8);
  streetLamp(3.9, -10.8);

  function trafficLight(x, z, axis = 'main') {
    batch.add(0x354457, [0.51, 0.24, 0.51], [x, 0.39, z]);
    batch.add(0x53687b, [0.2, 2.35, 0.2], [x, 1.64, z]);
    batch.add(0x15213a, [0.57, 1.34, 0.47], [x, 3.12, z]);
    batch.add(0x2e3e52, [0.69, 0.13, 0.63], [x, 3.83, z + 0.03]);
    const lamps = {};
    for (const [i, name] of ['red', 'yellow', 'green'].entries()) {
      const m = new THREE.MeshStandardMaterial({
        color: 0x162436,
        emissive: SIGNAL_COLORS[name],
        roughness: 0.6,
        alphaHash: true,
      });
      lamps[name] = box(objectRoot, [0.31, 0.27, 0.08], [x, 3.55 - i * 0.43, z + 0.277], m, {
        shadow: false,
      });
      batch.add(0x0f1c2e, [0.4, 0.06, 0.19], [x, 3.72 - i * 0.43, z + 0.3]);
    }
    signals.push({ lamps, axis, position: new THREE.Vector3(x, 3, z) });
  }
  trafficLight(3.72, MAIN_ROAD_Z - 3.36);
  trafficLight(-3.72, MAIN_ROAD_Z - 3.36, 'cross');
  batch.build(objectRoot, getMaterial);
  const traffic = new IntersectionTraffic(index, getMaterial);
  objectRoot.add(traffic.root);

  return { style, halos, signals, emerging, traffic };
}
