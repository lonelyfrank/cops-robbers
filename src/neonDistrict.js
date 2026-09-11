/** Neon storefront lettering is built into the facade, using tiny voxel strokes. */
const GLYPHS = Object.freeze([
  ['11111', '00001', '11111', '00001', '00010'], // ラ
  ['00000', '00000', '11111', '00000', '00000'], // ー
  ['00001', '01010', '00100', '01010', '10000'], // メ
  ['10000', '01000', '00001', '00010', '11100'], // ン
]);
const CAFE_GLYPHS = Object.freeze([
  ['00100', '11111', '00101', '01001', '10010'], // カ
  ['11111', '00001', '00001', '00010', '01100'], // フ
  ['00000', '01110', '00100', '00100', '01110'], // ェ
]);
/**
 * @param {import('./voxelModels.js').VoxelBatch} batch
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {string} color Theme material key for the neon strokes.
 * @param {boolean} ramen
 * @param {number} [height]
 */
function verticalSign(batch, x, y, z, color, ramen, height = 3.1) {
  batch.add(0x191c39, [0.83, height, 0.28], [x, y, z]);
  for (const dx of [-0.44, 0.44])
    batch.add(color, [0.065, height + 0.12, 0.08], [x + dx, y, z + 0.19]);
  for (const dy of [-height / 2, height / 2])
    batch.add(color, [0.92, 0.07, 0.08], [x, y + dy, z + 0.19]);
  (ramen ? GLYPHS : CAFE_GLYPHS).forEach((glyph, index) =>
    glyph.forEach((row, r) =>
      [...row].forEach((pixel, c) => {
        if (pixel === '1')
          batch.add(
            'neonWhite',
            [0.085, 0.085, 0.045],
            [x + (c - 2) * 0.105, y + height / 2 - 0.3 - index * 0.67 - r * 0.105, z + 0.2],
          );
      }),
    ),
  );
}
/**
 * @param {import('./voxelModels.js').VoxelBatch} batch
 * @param {import('./districtGeometry.js').BuildingStyle} config
 * @param {number} variant
 */
export function neonBuilding(batch, { x, z, width, depth, floors, shop }, variant) {
  const base = 0.25,
    height = floors * 1.85 + 1.45,
    front = z + depth / 2,
    left = x - width / 2,
    right = x + width / 2;
  const facade = variant % 2 === 0 ? 0x26384a : 0x353447;
  batch.add(facade, [width, height, depth], [x, base + height / 2, z]);
  batch.add(0x415574, [width + 0.2, 0.25, depth + 0.2], [x, 0.38, z]);
  // Amber glazing separated by dark steel mullions, on both visible facades.
  for (let floor = 0; floor < floors; floor++) {
    const y = 2.6 + floor * 1.85;
    for (let col = 0; col < 4; col++) {
      const dx = ((col - 1.5) * width) / 4;
      batch.add(
        ['window', 'windowDim', 'window', 'glass'][(floor + col + variant) % 4],
        [width / 4 - 0.28, 1.24, 0.1],
        [x + dx, y, front + 0.06],
      );
      batch.add(0x172b41, [0.1, 1.62, 0.2], [x + dx - width / 8, y, front + 0.1]);
      batch.add(0x293743, [width / 4 - 0.25, 0.065, 0.13], [x + dx, y + 0.15, front + 0.12]);
      batch.add(0x293743, [0.055, 1.24, 0.13], [x + dx, y, front + 0.12]);
    }
    for (let col = 0; col < 3; col++) {
      const dz = ((col - 1) * depth) / 3;
      batch.add(
        ['glass', 'window', 'windowDim'][(floor + col + variant) % 3],
        [0.1, 1.24, depth / 3 - 0.28],
        [left - 0.07, y, z + dz],
      );
      batch.add(0x172b41, [0.2, 1.62, 0.1], [left - 0.1, y, z + dz - depth / 6]);
      batch.add(0x293743, [0.13, 0.065, depth / 3 - 0.25], [left - 0.12, y + 0.15, z + dz]);
      batch.add(0x293743, [0.13, 1.24, 0.055], [left - 0.12, y, z + dz]);
    }
    batch.add(0x172b41, [width + 0.22, 0.17, 0.22], [x, y + 0.82, front + 0.08]);
    batch.add(0x172b41, [0.22, 0.17, depth + 0.22], [left - 0.08, y + 0.82, z]);
  }
  for (const level of [1.85, height + 0.38]) {
    batch.add(0x425575, [width + 0.48, 0.22, depth + 0.48], [x, level, z]);
    batch.add('neonCyan', [width + 0.4, 0.045, 0.07], [x, level + 0.11, front + 0.25]);
    batch.add('neonCyan', [0.07, 0.045, depth + 0.4], [left - 0.25, level + 0.11, z]);
  }
  // Timber screens give the side facade depth without covering every floor in neon.
  if (variant % 2 === 0)
    for (let i = 0; i < 6; i++)
      batch.add(0x685247, [0.16, 1.32, 0.065], [left - 0.2, 2.6, z - depth * 0.22 + i * 0.16]);
  // Shop windows and a street-level awning; the low block becomes a ramen shop.
  batch.add('glass', [0.85, 1.35, 0.14], [x, 1, front + 0.1]);
  for (const side of [-1, 1])
    batch.add('window', [width * 0.3, 1.3, 0.14], [x + side * width * 0.31, 1, front + 0.1]);
  if (shop && floors <= 2) {
    for (let i = 0; i < 10; i++)
      batch.add(
        i % 2 === 0 ? 0xdc3a68 : 0xf2d5b3,
        [(width - 0.2) / 10, 0.15, 0.85],
        [left + 0.1 + ((i + 0.5) * (width - 0.2)) / 10, 1.75, front + 0.42],
        [-0.2, 0, 0],
      );
    batch.add(0x30243b, [2.1, 0.8, 0.12], [x, 2.35, front + 0.18]);
    for (const dy of [-0.4, 0.4])
      batch.add('neonPink', [2.1, 0.045, 0.06], [x, 2.35 + dy, front + 0.26]);
    // Bowl and rising steam in physical white neon above the canopy.
    batch.add('neonWhite', [1.02, 0.07, 0.07], [x, 2.42, front + 0.26]);
    batch.add('neonWhite', [0.66, 0.07, 0.07], [x, 2.16, front + 0.26]);
    for (const side of [-1, 1])
      batch.add(
        'neonWhite',
        [0.07, 0.24, 0.07],
        [x + side * 0.42, 2.29, front + 0.26],
        [0, 0, side * -0.45],
      );
    for (const dx of [-0.26, 0, 0.26])
      batch.add('neonWhite', [0.045, 0.18, 0.055], [x + dx, 2.66, front + 0.26], [0, 0, 0.25]);
    // Split noren curtains and small paper lanterns frame the entrance.
    for (const side of [-1, 1]) {
      batch.add(0x933d4c, [0.36, 0.35, 0.06], [x + side * 0.23, 1.45, front + 0.22]);
      batch.add(
        'paperLantern',
        [0.32, 0.48, 0.32],
        [x + side * (width / 2 - 0.42), 1.3, front + 0.46],
      );
      for (const dy of [-0.26, 0.26])
        batch.add(
          0x352c32,
          [0.26, 0.055, 0.26],
          [x + side * (width / 2 - 0.42), 1.3 + dy, front + 0.46],
        );
    }
  }
  verticalSign(
    batch,
    right - 0.5,
    Math.max(3, height - 1),
    front + 0.36,
    variant % 2 ? 'neonPink' : 'neonCyan',
    shop && floors <= 2,
  );
  // Flat rooftop garden, air conditioning units and aerials.
  batch.add(0x293650, [width + 0.1, 0.1, depth + 0.1], [x, height + 0.54, z]);
  for (const dx of [-width * 0.25, width * 0.2]) {
    batch.add(0x718198, [0.95, 0.58, 0.8], [x + dx, height + 0.87, z - 0.45]);
    batch.add(0x2c3b56, [0.66, 0.35, 0.055], [x + dx, height + 0.9, z - 0.015]);
    for (let j = 0; j < 3; j++)
      batch.add(0xa2b5c8, [0.52, 0.03, 0.065], [x + dx, height + 0.79 + j * 0.11, z + 0.025]);
  }
  batch.add(0x4b6b83, [0.1, 1.5, 0.1], [left + 0.5, height + 1.3, z - depth * 0.26]);
  batch.add(0x72869b, [0.55, 0.06, 0.06], [left + 0.5, height + 1.85, z - depth * 0.26]);
  if (variant % 2 === 0) {
    batch.add(0x41566b, [width - 0.7, 0.4, 0.55], [x, height + 0.76, z + depth * 0.33]);
    for (let i = 0; i < 5; i++)
      batch.add(
        0x2d915c,
        [0.47, 0.4 + (i % 2) * 0.16, 0.48],
        [left + 0.65 + (i * (width - 1.3)) / 4, height + 1.1, z + depth * 0.33],
      );
  }
  if (floors >= 3)
    for (let i = 0; i < 2; i++) {
      const vx = left + 1.1 + i * 0.85;
      batch.add(i ? 0x306c86 : 0xbc9c6a, [0.69, 1.4, 0.52], [vx, 0.96, front + 0.48]);
      batch.add('glass', [0.53, 0.83, 0.055], [vx, 1.1, front + 0.77]);
      for (let j = 0; j < 3; j++)
        batch.add('window', [0.39, 0.12, 0.07], [vx, 1.32 - j * 0.22, front + 0.8]);
      batch.add(0x14283e, [0.4, 0.12, 0.06], [vx, 0.5, front + 0.8]);
    }
}
/** @param {import('./voxelModels.js').VoxelBatch} batch */
export function neonStreetDetails(batch) {
  // Subway canopy and lit entrance board in the same back-right urban parcel.
  batch.add(0x23334b, [3.4, 0.16, 2.15], [7.5, 2.4, -10]);
  batch.add('neonCyan', [3.5, 0.08, 0.09], [7.5, 2.52, -8.88]);
  for (const x of [6, 9]) batch.add(0x667f9b, [0.14, 2.2, 0.14], [x, 1.35, -10]);
  batch.add(0x23334b, [1.5, 0.45, 0.12], [7.5, 2.08, -8.9]);
  batch.add('neonWhite', [0.85, 0.055, 0.06], [7.5, 2.08, -8.82]);
  batch.add(0x172a42, [2.7, 0.08, 2], [7.5, 0.29, -10]);
  for (let i = 0; i < 4; i++)
    batch.add(0x728aa3, [2.3, 0.07, 0.32], [7.5, 0.32 + i * 0.08, -10.5 + i * 0.33]);
}
