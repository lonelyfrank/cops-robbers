import { createThief, createPoliceCar } from '../rendering/voxelModels.js';
import { getPursuitStopX, getStopX, RUNNER_Z, ROAD_Y, sirenPulse } from '../world/mapLayout.js';
import { CHARACTER } from '../config/animation.js';
import { ANIMATIONS } from './animations/index.js';
import { clamp } from './animations/easing.js';

/**
 * One animation in flight. The kind, the clock and the callback belong to the
 * controller; every other field is created by the handler for that kind.
 *
 * @typedef {{
 *   kind: import('../core/types.js').AnimationKind,
 *   elapsed: number,
 *   duration: number,
 *   onComplete?: () => void,
 * } & Record<string, any>} ActiveAnimation
 */

export class CharacterController {
  /**
   * @param {import('three').Scene} scene
   * @param {{ reducedMotion?: boolean }} [options]
   */
  constructor(scene, { reducedMotion = false } = {}) {
    this.thief = createThief();
    this.police = createPoliceCar();
    this.chase = createPoliceCar();
    this.flankPolice = [createPoliceCar({ lights: false }), createPoliceCar({ lights: false })];
    this.flankPolice.forEach((car, i) => {
      car.root.name = i === 0 ? 'north-roadblock' : 'south-roadblock';
      car.red.material = car.blue.material;
    });
    this.chase.root.name = 'pursuit-car';
    this.chase.root.rotation.y = Math.PI / 2;
    this.chase.blueLight.distance = 21;
    this.chase.redLight.distance = 21;
    scene.add(
      this.thief.root,
      this.police.root,
      this.chase.root,
      ...this.flankPolice.map((car) => car.root),
    );
    this.reducedMotion = reducedMotion;
    /** @type {ActiveAnimation | null} */
    this.animation = null;
    this.time = 0;
    this.arrested = false;
    this.police.red.material = this.police.blue.material;
    this.police.redLight.color.set(0x467bff);
    this.reset();
  }
  reset() {
    /** @type {ActiveAnimation | null} */
    this.animation = null;
    this.arrested = false;
    this.thief.root.position.set(getStopX(0), ROAD_Y, RUNNER_Z);
    this.thief.root.rotation.set(0, 0, 0);
    this.thief.root.visible = true;
    this.thief.body.position.set(0, 0, 0);
    this.thief.body.rotation.set(0, 0, 0);
    this.lootTarget = 1;
    this.lootScale = 1;
    this.thief.lootBag.scale.set(1, 1, 1);
    this.thief.legs.forEach((leg) => leg.rotation.set(0, 0, 0));
    this.thief.arms.forEach((arm) => arm.rotation.set(0, 0, 0));
    this.police.root.visible = false;
    this.police.blueLight.intensity = 0;
    this.police.redLight.intensity = 0;
    this.flankPolice.forEach((car) => {
      car.root.visible = false;
      car.root.position.set(0, 0, 0);
      car.root.rotation.set(0, 0, 0);
    });
    this.chase.root.position.set(getPursuitStopX(0), 0.03, RUNNER_Z);
    this.chase.blueLight.intensity = 0;
    this.chase.redLight.intensity = 0;
  }
  /**
   * @param {number} n Junction the green clears.
   * @param {() => void} [onComplete]
   */
  run(n, onComplete) {
    this.#play('run', { crossing: n }, onComplete);
  }
  /**
   * @param {number} multiplier
   * @param {number} crossing
   */
  setLoot(multiplier, crossing) {
    const growth = crossing * 0.09 + Math.log2(Math.max(1, multiplier)) * 0.16;
    this.lootTarget = 1 + 1.4 * (1 - Math.exp(-growth));
  }
  /**
   * @param {number} n Junction the arrest happens on.
   * @param {() => void} [onComplete]
   */
  caught(n, onComplete) {
    this.#play('caught', { crossing: n }, onComplete);
  }
  /** @param {() => void} [onComplete] */
  escape(onComplete) {
    this.#play('alley', {}, onComplete);
  }
  /**
   * Start one animation. The controller owns the clock and the callback; the handler
   * owns the choreography.
   *
   * @param {import('../core/types.js').AnimationKind} kind
   * @param {{ crossing?: number }} options
   * @param {() => void} [onComplete]
   */
  #play(kind, options, onComplete) {
    this.animation = /** @type {ActiveAnimation} */ ({
      kind,
      elapsed: 0,
      onComplete,
      ...ANIMATIONS[kind].create(this, options),
    });
  }
  /**
   * @param {number} dt Seconds since the previous frame.
   * @param {number} [elapsed] Shared animation clock; sirens never restart on capture.
   */
  update(dt, elapsed = this.time + dt) {
    this.time = elapsed;
    this.lootScale +=
      (this.lootTarget - this.lootScale) *
      (this.reducedMotion ? 1 : 1 - Math.exp(-dt * CHARACTER.lootResponse));
    this.thief.lootBag.scale.set(this.lootScale, 1 + (this.lootScale - 1) * 0.72, this.lootScale);
    this.chase.blueLight.intensity = 230 * sirenPulse(this.time, this.reducedMotion);
    this.chase.redLight.intensity = 135 * sirenPulse(this.time, this.reducedMotion, Math.PI);
    if (this.arrested) {
      this.police.blueLight.intensity = 115 * sirenPulse(this.time, this.reducedMotion);
      this.police.redLight.intensity = 100 * sirenPulse(this.time, this.reducedMotion, 1);
    }
    const a = this.animation;
    if (!a) {
      this.thief.body.position.y = this.reducedMotion ? 0 : Math.sin(this.time * 2.7) * 0.025;
      return;
    }
    a.elapsed += dt;
    const p = clamp(a.elapsed / a.duration);
    const handler = ANIMATIONS[a.kind];
    handler.update(this, a, p);
    if (p === 1) {
      // Clear first: completion may synchronously start the next animation.
      this.animation = null;
      handler.settle?.(this, a);
      a.onComplete?.();
    }
  }
}
