import { neonBuilding } from './neonDistrict.js';

/**
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 * @param {number} x
 * @param {number} z
 * @param {Partial<import('./districtVariants.js').BuildingStyle>} [config]
 */
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

/**
 * Add the three blocks of a district, using the architecture of the active theme.
 *
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 * @param {import('./districtVariants.js').BuildingStyle} config
 * @param {number} index District index, so a neon facade can vary with it.
 * @param {boolean} neon
 */
export function addBuilding(batch, config, index, neon) {
  if (neon) neonBuilding(batch, config, index);
  else building(batch, config.x, config.z, config);
}
