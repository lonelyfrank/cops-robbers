import * as THREE from 'three';
import { CAPTURE } from '../config/rendering.js';
import { MAIN_ROAD_Z, sirenPulse } from '../mapLayout.js';

/**
 * Blue lights of the arrest, and the overlay intensity that goes with them.
 *
 * The effect produces plain numbers — see `CaptureState` — and never touches a document
 * element. Whoever owns the page decides what to do with them, which keeps this layer
 * usable from a standalone canvas, a replay renderer or a test.
 */

/** @param {THREE.Scene} scene */
export function createCaptureEffects(scene) {
  const lights = Array.from({ length: CAPTURE.power.length }, () => {
    const light = new THREE.PointLight(CAPTURE.color, 0, CAPTURE.range, 2);
    scene.add(light);
    return light;
  });
  /** @type {import('../core/types.js').CaptureState} */
  let state = { caught: false, sirenIntensity: 0, captureIntensity: 0 };

  return {
    get state() {
      return state;
    },
    reset() {
      for (const light of lights) light.intensity = 0;
      state = { caught: false, sirenIntensity: 0, captureIntensity: 0 };
    },
    /**
     * @param {object} frame
     * @param {number} frame.occupiedX
     * @param {number} frame.elapsed Seconds on the shared animation clock.
     * @param {boolean} frame.caught
     * @param {boolean} frame.reducedMotion
     * @returns {import('../core/types.js').CaptureState}
     */
    update({ occupiedX, elapsed, caught, reducedMotion }) {
      const pulse = sirenPulse(elapsed, reducedMotion);
      lights[0].position.set(occupiedX - 5, 3.5, MAIN_ROAD_Z - 1);
      lights[1].position.set(occupiedX + 4, 4, MAIN_ROAD_Z + 2);
      lights[0].intensity = caught ? CAPTURE.power[0] * pulse : 0;
      lights[1].intensity = caught ? CAPTURE.power[1] * sirenPulse(elapsed, reducedMotion, 1) : 0;
      state = {
        caught,
        sirenIntensity: caught ? pulse : 0,
        captureIntensity: caught
          ? reducedMotion
            ? CAPTURE.reducedFlash
            : CAPTURE.flashBase + pulse * CAPTURE.flashPower
          : 0,
      };
      return state;
    },
  };
}
