import * as THREE from 'three';
import { createTrafficCar, isInstancedMesh, material } from '../rendering/voxelModels.js';
import { MAIN_ROAD_Z, TILE_SIZE } from './mapLayout.js';
import { smoothStep } from './cityEffects.js';
import { applyShaderPatches } from '../rendering/shaderPatch.js';

const STOP_LINE = -5.8;
const LOOP_HALF = 18;
const COLORS = [0xcda949, 0x607f9d, 0xa75b53, 0xc3c9cc, 0x548676];
// Include the full bumper: cars finish fading while still supported by the road.
const VISIBLE_EDGE = TILE_SIZE / 2 - 1.51 - 0.08;
/** Name reported if Three.js stops providing one of the depth chunks this patch needs. */
const SHADOW_FADE = 'traffic shadow fade';

/** One car per direction, recycled outside the diorama. No traffic can enter on red. */
export class IntersectionTraffic {
  /**
   * @param {number} index District index; it seeds colour and starting offset.
   * @param {(color: number | string) => THREE.Material} [getMaterial]
   */
  constructor(index, getMaterial = material) {
    this.root = new THREE.Group();
    this.root.name = 'cross-traffic';
    this.cars = [-1, 1].map((direction, lane) => {
      const variant = (index * 3 + lane) % COLORS.length;
      const materials = new Map();
      const { root } = createTrafficCar(COLORS[variant], variant === 0, (key) => {
        if (!materials.has(key)) {
          const source = getMaterial(key),
            copy = source.clone();
          // Preserve the city's continuous lighting shader without sharing car opacity.
          copy.onBeforeCompile = source.onBeforeCompile;
          copy.customProgramCacheKey = source.customProgramCacheKey;
          copy.alphaHash = true;
          materials.set(key, copy);
        }
        return materials.get(key);
      });
      const depthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        alphaHash: true,
      });
      // Packed shadow depth ignores material.opacity, so supply it to alpha hashing
      // explicitly. Upgrade-sensitive: the guard reports a chunk that no longer exists
      // instead of leaving the shadows opaque while the car fades out.
      depthMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.trafficOpacity = {
          get value() {
            return depthMaterial.opacity;
          },
        };
        shader.fragmentShader = applyShaderPatches(shader.fragmentShader, SHADOW_FADE, [
          ['#include <common>', '#include <common>\nuniform float trafficOpacity;'],
          [
            'vec4 diffuseColor = vec4( 1.0 );',
            'vec4 diffuseColor = vec4(1.0, 1.0, 1.0, trafficOpacity);',
          ],
        ]);
      };
      depthMaterial.customProgramCacheKey = () => 'traffic-shadow-fade-v1';
      root.traverse((object) => {
        if (isInstancedMesh(object)) object.customDepthMaterial = depthMaterial;
      });
      root.rotation.y = direction === 1 ? 0 : Math.PI;
      this.root.add(root);
      return {
        root,
        materials,
        depthMaterial,
        direction,
        progress: -12 + ((index * 7 + lane * 13) % 24),
        opacity: 1,
      };
    });
    this.update(0, true);
  }
  /**
   * @param {number} dt Seconds since the last frame.
   * @param {boolean} open Whether the cross axis has green.
   * @param {boolean} [reducedMotion]
   * @param {boolean} [emergency] Clear both lanes for the arriving patrols.
   * @param {number} [tileOpacity] Reveal of the owning district.
   */
  update(dt, open, reducedMotion = false, emergency = false, tileOpacity = 1) {
    for (const car of this.cars) {
      // Clear both lanes for the arriving patrols without respawning into the roadblock.
      if (emergency) {
        const exiting = car.progress > STOP_LINE,
          edge = (exiting ? 1 : -1) * (LOOP_HALF + 3);
        car.progress = reducedMotion
          ? edge
          : exiting
            ? Math.min(edge, car.progress + Math.max(0, dt) * 42)
            : Math.max(edge, car.progress - Math.max(0, dt) * 24);
      } else if (reducedMotion) car.progress = STOP_LINE - 1;
      else {
        const clearing = !open && car.progress > STOP_LINE && car.progress < 8;
        const next = car.progress + Math.max(0, dt) * (clearing ? 42 : 7.5);
        car.progress = !open && car.progress <= STOP_LINE ? Math.min(STOP_LINE, next) : next;
        if (car.progress > LOOP_HALF) car.progress -= LOOP_HALF * 2;
      }
      car.root.position.set(
        -car.direction * 1.35,
        0.03,
        MAIN_ROAD_Z + car.direction * car.progress,
      );
      // Short entrance fade leaves queued cars solid; a longer exit fade eases departures.
      const remaining = VISIBLE_EDGE - Math.abs(car.root.position.z);
      const fade = reducedMotion
        ? Number(remaining > 0)
        : smoothStep(remaining / (car.progress < 0 ? 0.9 : 2.6));
      car.opacity = fade * tileOpacity;
      car.root.visible = car.opacity > 0;
      for (const material of car.materials.values()) material.opacity = car.opacity;
      car.depthMaterial.opacity = car.opacity;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.root.removeFromParent();
    for (const car of this.cars) {
      for (const material of car.materials.values()) material.dispose();
      car.depthMaterial.dispose();
    }
    this.root.traverse((object) => {
      if (isInstancedMesh(object)) object.dispose();
    });
    this.root.clear();
  }
}
