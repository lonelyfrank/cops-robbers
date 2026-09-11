import * as THREE from 'three';
import { box } from '../../rendering/voxelModels.js';

/** Lamp colours of a signal head, shared by the tile materials and the scene lights. */
export const SIGNAL_COLORS = Object.freeze({ red: 0xff365b, yellow: 0xffbd3f, green: 0x8bff7e });

/**
 * A lamp whose material the tile drives directly, frame by frame.
 * @typedef {THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>} SignalLamp
 */

/**
 * One signal head. The pole and the hood are batched; the three lamps stay individual
 * meshes, because the tile drives their colour and emissive level every frame.
 *
 * @param {import('../../rendering/voxelModels.js').VoxelBatch} batch
 * @param {THREE.Object3D} lampParent Group the lamps are attached to.
 * @param {{ x: number, z: number, axis?: 'main' | 'cross' }} options
 * @returns {{ lamps: Record<string, SignalLamp>, axis: 'main' | 'cross', position: THREE.Vector3 }}
 */
export function createTrafficLight(batch, lampParent, { x, z, axis = 'main' }) {
  batch.add(0x354457, [0.51, 0.24, 0.51], [x, 0.39, z]);
  batch.add(0x53687b, [0.2, 2.35, 0.2], [x, 1.64, z]);
  batch.add(0x15213a, [0.57, 1.34, 0.47], [x, 3.12, z]);
  batch.add(0x2e3e52, [0.69, 0.13, 0.63], [x, 3.83, z + 0.03]);
  /** @type {Record<string, SignalLamp>} */
  const lamps = {};
  for (const [i, name] of ['red', 'yellow', 'green'].entries()) {
    const m = new THREE.MeshStandardMaterial({
      color: 0x162436,
      emissive: SIGNAL_COLORS[name],
      roughness: 0.6,
      alphaHash: true,
    });
    lamps[name] = /** @type {SignalLamp} */ (
      box(lampParent, [0.31, 0.27, 0.08], [x, 3.55 - i * 0.43, z + 0.277], m, {
        shadow: false,
      })
    );
    batch.add(0x0f1c2e, [0.4, 0.06, 0.19], [x, 3.72 - i * 0.43, z + 0.3]);
  }
  return { lamps, axis, position: new THREE.Vector3(x, 3, z) };
}
