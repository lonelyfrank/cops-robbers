import * as THREE from 'three';

/** Shared unit geometry and materials keep the voxel props inexpensive. */
export const unitBox = new THREE.BoxGeometry(1, 1, 1);
const materialCache = new Map();
export function material(color, roughness = 0.85) {
  const key = `${color}:${roughness}`;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }));
  return materialCache.get(key);
}
export function box(parent, size, position, color, options = {}) {
  const mesh = new THREE.Mesh(unitBox, typeof color === 'number' ? material(color) : color);
  mesh.scale.set(...size); mesh.position.set(...position);
  mesh.castShadow = options.shadow !== false; mesh.receiveShadow = true;
  if (options.rotation) mesh.rotation.set(...options.rotation);
  parent.add(mesh); return mesh;
}

/** Character faces +X. Each limb pivots from a group, without a skeletal rig. */
export function createThief() {
  const root = new THREE.Group(); root.name = 'thief';
  const body = new THREE.Group(); root.add(body);
  box(body, [.57, .7, .62], [0, 1.18, 0], 0xd8e0e4);
  for (let i = 0; i < 3; i++) box(body, [.59, .09, .64], [0, .96 + i * .19, 0], 0x26313e);
  box(body, [.52, .48, .56], [.02, 1.78, 0], 0xc8996d);
  box(body, [.58, .22, .64], [0, 2.05, 0], 0x1a2432);
  box(body, [.67, .075, .7], [.04, 1.96, 0], 0x1a2432);
  box(body, [.045, .135, .58], [.297, 1.8, 0], 0x182130);
  box(body, [.047, .058, .115], [.323, 1.81, -.14], 0xf4f3d4);
  box(body, [.047, .058, .115], [.323, 1.81, .14], 0xf4f3d4);
  box(body, [.045, .044, .12], [.29, 1.61, .05], 0x472f2d);
  const lootBag = new THREE.Group(); lootBag.name = 'loot-bag';
  // Anchor at the shoulder: growth extends backwards, away from the face.
  lootBag.position.set(-.23, 1, .04); body.add(lootBag);
  box(lootBag, [.42, .6, .48], [-.21, .26, 0], 0x9d8250);
  box(lootBag, [.15, .16, .16], [-.25, .64, 0], 0xc9af75);
  box(lootBag, [.12, .24, .07], [-.434, .27, .08], 0xe5ce8f);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0, .84, side * .19); body.add(leg);
    box(leg, [.24, .57, .25], [0, -.28, 0], 0x233045);
    box(leg, [.38, .17, .29], [.065, -.62, 0], 0x101927);
    legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(0, 1.45, side * .41); body.add(arm);
    box(arm, [.23, .4, .23], [0, -.19, 0], 0xb7c5d1);
    box(arm, [.235, .1, .245], [0, -.26, 0], 0x273446);
    box(arm, [.23, .23, .23], [.03, -.45, 0], 0xc8996d);
    arms.push(arm);
  }
  return { root, body, legs, arms, lootBag };
}

/** Small civilian cars, batched by paint; no additional real-time lights. */
export function createTrafficCar(color, taxi = false, getMaterial = material) {
  const root = new THREE.Group(); root.name = taxi ? 'city-taxi' : 'city-car';
  const batch = new VoxelBatch();
  batch.add(color, [1.45, .47, 2.9], [0, .65, 0]);
  batch.add(0x202a39, [1.51, .13, 3.02], [0, .4, 0]);
  batch.add(0x517184, [1.26, .49, 1.43], [0, 1.08, -.12]);
  batch.add(color, [1.32, .12, 1.22], [0, 1.35, -.21]);
  for (const side of [-1, 1]) {
    batch.add(0xf0dfab, [.39, .15, .07], [side * .46, .72, 1.47]);
    batch.add(0xbb4a4f, [.31, .13, .07], [side * .47, .65, -1.47]);
    for (const z of [-.91, .91]) batch.add(0x121c29, [.17, .49, .5], [side * .75, .35, z]);
  }
  if (taxi) batch.add(0xf9e5a8, [.56, .19, .34], [0, 1.49, -.12]);
  batch.build(root, getMaterial);
  return { root };
}

/** +Z is the front of the car. Beacons use colored light, not emissive materials. */
export function createPoliceCar({lights=true}={}) {
  const root = new THREE.Group(); root.name = 'police-car';
  box(root, [1.75, .52, 3.15], [0, .72, 0], 0xd2dbe3);
  box(root, [1.83, .13, 3.35], [0, .45, 0], 0x162030);
  box(root, [1.72, .21, 1.08], [0, 1, .94], 0x203047);
  box(root, [1.54, .59, 1.46], [0, 1.23, -.13], 0x334963);
  box(root, [1.64, .13, 1.52], [0, 1.56, -.13], 0xdce3e9);
  box(root, [.04, .24, 1.72], [-.902, .79, -.16], 0x213850);
  box(root, [.04, .24, 1.72], [.902, .79, -.16], 0x213850);
  for (const side of [-1, 1]) {
    box(root, [.045, .19, .18], [side * .93, .84, -.1], 0xccb477);
    box(root, [.45, .17, .08], [side * .56, .87, 1.61], 0xf0e4bd);
    box(root, [.32, .15, .08], [side * .6, .76, -1.61], 0x992d42);
    for (const z of [-1.02, 1.02]) {
      box(root, [.22, .57, .58], [side * .91, .4, z], 0x10151d);
      box(root, [.235, .27, .27], [side * .91, .4, z], 0x536274);
    }
  }
  box(root, [1.23, .08, .34], [0, 1.66, -.14], 0x152034);
  const blue = box(root, [.48, .18, .3], [-.33, 1.78, -.14], 0x557df9);
  blue.material.emissive.set(0x315fdf);blue.material.emissiveIntensity=.75;
  const red = box(root, [.48, .18, .3], [.33, 1.78, -.14], 0xf14d65);
  const blueLight = new THREE.PointLight(0x467bff, 0, 11, 2); blueLight.position.set(-.6, 2.05, 0);
  const redLight = new THREE.PointLight(0xff385a, 0, 11, 2); redLight.position.set(.6, 2.05, 0);
  if(lights) root.add(blueLight, redLight);
  return { root, blue, red, blueLight, redLight };
}

/** Bake decorative boxes into color batches. Only the scene owner disposes them. */
export class VoxelBatch {
  constructor() { this.groups = new Map(); }
  add(color, size, position, rotation = [0, 0, 0]) {
    if (!this.groups.has(color)) this.groups.set(color, []);
    this.groups.get(color).push({ size, position, rotation });
  }
  build(parent, getMaterial = material) {
    const dummy = new THREE.Object3D();
    for (const [color, instances] of this.groups) {
      const mesh = new THREE.InstancedMesh(unitBox, getMaterial(color), instances.length);
      for (let i = 0; i < instances.length; i++) {
        dummy.position.set(...instances[i].position); dummy.scale.set(...instances[i].size); dummy.rotation.set(...instances[i].rotation); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere(); parent.add(mesh);
    }
  }
}
