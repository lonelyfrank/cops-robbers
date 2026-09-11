import { TILE_SIZE, MAIN_ROAD_Z, ALLEY_LOCAL_X } from '../mapLayout.js';

/**
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 * @param {() => number} random
 */
export function buildFoundation(batch, random) {
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

/**
 * Both safe-stop lanes have real paving, including the final cashout.
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 */
export function paveAlleys(batch) {
  for (const x of ALLEY_LOCAL_X)
    for (let z = 8.5; z < 13; z += 0.6) batch.add(0xc9b994, [1.02, 0.035, 0.57], [x, 0.274, z]);
}
