import * as THREE from 'three';
import { createTrafficCar } from './voxelModels.js';
import { MAIN_ROAD_Z, TILE_SIZE } from './mapLayout.js';

const STOP_LINE = -5.8;
const LOOP_HALF = 18;
const COLORS = [0xcda949, 0x607f9d, 0xa75b53, 0xc3c9cc, 0x548676];

/** One car per direction, recycled outside the diorama. No traffic can enter on red. */
export class IntersectionTraffic {
  constructor(index, getMaterial) {
    this.root = new THREE.Group();
    this.root.name = 'cross-traffic';
    this.cars = [-1, 1].map((direction, lane) => {
      const variant = (index * 3 + lane) % COLORS.length;
      const { root } = createTrafficCar(COLORS[variant], variant === 0, getMaterial);
      root.rotation.y = direction === 1 ? 0 : Math.PI;
      this.root.add(root);
      return { root, direction, progress: -12 + ((index * 7 + lane * 13) % 24) };
    });
    this.update(0, true);
  }
  update(dt, open, reducedMotion = false, emergency = false) {
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
      // Recycling occurs past the street ends, never in view at the intersection.
      car.root.visible = Math.abs(car.root.position.z) < TILE_SIZE / 2 + 1.5;
    }
  }
}
