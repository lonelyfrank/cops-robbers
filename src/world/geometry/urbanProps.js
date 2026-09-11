import * as THREE from 'three';

/**
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 * @param {number} variant
 */
export function urbanAmenity(batch, variant) {
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

/**
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 * @param {number} x
 * @param {number} z
 * @param {number} [scale]
 * @param {number} [color]
 */
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

/**
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 * @param {number} x
 * @param {number} z
 * @param {number} width
 * @param {number} depth
 */
function planter(batch, x, z, width, depth) {
  batch.add(0x778076, [width, 0.47, depth], [x, 0.43, z]);
  batch.add(0x374530, [width - 0.24, 0.13, depth - 0.24], [x, 0.69, z]);
  for (let dx = -width / 2 + 0.4; dx < width / 2; dx += 0.63)
    for (let dz = -depth / 2 + 0.4; dz < depth / 2; dz += 0.7) {
      batch.add(0x4d813f, [0.55, 0.45, 0.52], [x + dx, 0.94, z + dz]);
    }
}

/**
 * Trees, planted courtyards and the bushes that fill the gaps between blocks.
 *
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 * @param {number} treeScale District-wide size variation.
 * @param {() => number} random The district's own deterministic generator.
 */
export function addGreenery(batch, treeScale, random) {
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
    tree(batch, x, z, scale * treeScale);
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
}

/**
 * Low block walls along the sidewalks and the two foreground benches.
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 */
export function addStreetFurniture(batch) {
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
}

/**
 * A street lamp, plus the additive halo sprite that belongs to it.
 *
 * The sprite is an object, not a batched voxel, because its opacity follows the city
 * light gradient every frame.
 *
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 * @param {THREE.Object3D} spriteParent
 * @param {{ x: number, z: number, haloTexture: THREE.Texture, haloColor: number }} options
 * @returns {THREE.Sprite}
 */
export function createStreetLamp(batch, spriteParent, { x, z, haloTexture, haloColor }) {
  batch.add(0x344252, [0.48, 0.3, 0.48], [x, 0.39, z]);
  batch.add(0x586573, [0.16, 2.05, 0.16], [x, 1.47, z]);
  batch.add(0x344252, [0.46, 0.1, 0.46], [x, 2.54, z]);
  batch.add('lantern', [0.3, 0.48, 0.3], [x, 2.8, z]);
  batch.add(0x3d4b5c, [0.49, 0.12, 0.49], [x, 3.1, z]);
  const material = new THREE.SpriteMaterial({
    map: haloTexture,
    color: haloColor,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, 2.84, z);
  sprite.scale.set(1.55, 1.55, 1);
  spriteParent.add(sprite);
  return sprite;
}

/** Where the lamps stand. The foreground corner stays clear of the road multiplier. */
export const LAMP_POSITIONS = Object.freeze([
  ...[-11.6, -4.3, 4.3, 11.6].flatMap((x) =>
    [1.12, 8.15].map((z) => /** @type {[number, number]} */ ([x, z])),
  ),
  /** @type {[number, number]} */ ([-3.9, -10.8]),
  /** @type {[number, number]} */ ([3.9, -10.8]),
]).filter(([x, z]) => !(x === -4.3 && z === 8.15));
