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
  box(body, [.42, .6, .48], [-.44, 1.26, .04], 0x9d8250);
  box(body, [.15, .16, .16], [-.48, 1.64, .04], 0xc9af75);
  box(body, [.12, .24, .07], [-.664, 1.27, .12], 0xe5ce8f);
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
  return { root, body, legs, arms };
}

/** +Z is the front of the car. Beacons use colored light, not emissive materials. */
export function createPoliceCar() {
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
  const red = box(root, [.48, .18, .3], [.33, 1.78, -.14], 0xf14d65);
  const blueLight = new THREE.PointLight(0x467bff, 0, 11, 2); blueLight.position.set(-.6, 2.05, 0);
  const redLight = new THREE.PointLight(0xff385a, 0, 11, 2); redLight.position.set(.6, 2.05, 0);
  root.add(blueLight, redLight);
  return { root, blue, red, blueLight, redLight };
}

export function createHelicopter() {
  const root = new THREE.Group(); root.name = 'getaway-helicopter';
  box(root, [1.6, 1.27, 2.9], [0, .38, 0], 0x566854);
  box(root, [1.37, .91, 1.28], [0, .38, 1.67], 0x3c5866);
  box(root, [.12, 1.02, 1.22], [0, .4, 1.76], 0x7a8c63);
  box(root, [1.67, .16, 2.05], [0, 1.05, .25], 0x809369);
  box(root, [.39, .43, 3.48], [0, .45, -2.62], 0x6b805c);
  box(root, [.24, 1.25, .67], [0, .95, -4.13], 0xa6bb70);
  box(root, [1.65, .14, .54], [0, .61, -3.68], 0x95a96a);
  for (const side of [-1, 1]) {
    box(root, [.13, .57, .13], [side * 1.01, -.57, .83], 0xa1adb1);
    box(root, [.13, .57, .13], [side * 1.01, -.57, -.81], 0xa1adb1);
    box(root, [.18, .17, 3.76], [side * 1.01, -.9, .22], 0x7d8c92);
  }
  box(root, [.2, .53, .2], [0, 1.36, -.13], 0x17232c);
  const rotor = new THREE.Group(); rotor.position.set(0, 1.65, -.13); root.add(rotor);
  box(rotor, [7.8, .06, .27], [0, 0, 0], 0x1b2933);
  box(rotor, [.27, .06, 7.8], [0, 0, 0], 0x1b2933);
  box(rotor, [.37, .16, .37], [0, .03, 0], 0xa8b69b);
  const tailRotor = new THREE.Group(); tailRotor.position.set(.22, .85, -4.18); root.add(tailRotor);
  box(tailRotor, [.055, 1.4, .14], [0, 0, 0], 0x24343c);
  box(tailRotor, [.055, .14, 1.4], [0, 0, 0], 0x24343c);
  const rope = box(root, [.06, 1, .06], [.97, -1.5, 0], 0xd1be86);
  return { root, rotor, tailRotor, rope };
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
