import { createThief, createPoliceCar, createHelicopter } from './voxelModels.js';
import { getCrossingX, getStopX, MAIN_ROAD_Z, RUNNER_Z, ROAD_Y, sirenPulse } from './mapLayout.js';
import { HELICOPTER_THRESHOLD } from './gameMath.js';

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
const lerp = (a, b, t) => a + (b - a) * t;

export class CharacterController {
  constructor(scene, { reducedMotion = false } = {}) {
    this.thief = createThief(); this.police = createPoliceCar(); this.helicopter = createHelicopter();
    scene.add(this.thief.root, this.police.root, this.helicopter.root);
    this.reducedMotion = reducedMotion; this.animation = null; this.time = 0; this.arrested = false;
    this.police.red.material = this.police.blue.material;
    this.police.redLight.color.set(0x467bff);
    this.reset();
  }
  reset() {
    this.animation = null; this.arrested = false; this.time = 0;
    this.thief.root.position.set(getStopX(0), ROAD_Y, RUNNER_Z); this.thief.root.rotation.set(0, 0, 0); this.thief.root.visible = true;
    this.thief.body.position.set(0, 0, 0); this.thief.body.rotation.set(0, 0, 0);
    this.thief.legs.forEach(leg => leg.rotation.set(0, 0, 0)); this.thief.arms.forEach(arm => arm.rotation.set(0, 0, 0));
    this.police.root.visible = false; this.police.blueLight.intensity = 0; this.police.redLight.intensity = 0;
    this.helicopter.root.visible = false;
  }
  run(n, onComplete) {
    this.animation = { kind: 'run', elapsed: 0, duration: this.reducedMotion ? .65 : 2.05, fromX: this.thief.root.position.x, toX: getStopX(n), onComplete };
  }
  caught(n, onComplete) {
    const x = getCrossingX(n);
    this.arrested = true; this.time = 0;
    this.police.root.visible = true; this.police.root.position.set(x, .08, -11.6); this.police.root.rotation.y = 0;
    this.animation = { kind: 'caught', elapsed: 0, duration: this.reducedMotion ? 1 : 2.4, onComplete };
  }
  escape(n, onComplete) {
    const kind = n >= HELICOPTER_THRESHOLD ? 'helicopter' : 'alley';
    this.animation = { kind, elapsed: 0, duration: this.reducedMotion ? 1 : kind === 'helicopter' ? 4.4 : 1.7, x: this.thief.root.position.x, z: this.thief.root.position.z, onComplete };
    if (kind === 'helicopter') {
      this.helicopter.root.visible = true;
      this.helicopter.root.rotation.set(0, -Math.PI / 2, 0);
      this.helicopter.root.position.set(this.animation.x + 15, 12, RUNNER_Z + .85);
      this.helicopter.rope.visible = true;
    }
  }
  poseRun(time) {
    const wave = Math.sin(time * 18);
    this.thief.legs[0].rotation.z = wave * .73; this.thief.legs[1].rotation.z = -wave * .73;
    this.thief.arms[0].rotation.z = -wave * .55; this.thief.arms[1].rotation.z = wave * .55;
    this.thief.body.position.y = Math.abs(Math.sin(time * 18)) * .085;
    this.thief.body.rotation.z = -.08;
  }
  update(dt) {
    this.time += dt;
    if (this.arrested) {
      this.police.blueLight.intensity = 115 * sirenPulse(this.time, this.reducedMotion);
      this.police.redLight.intensity = 100 * sirenPulse(this.time, this.reducedMotion, 1);
    }
    const a = this.animation;
    if (!a) {
      this.thief.body.position.y = this.reducedMotion ? 0 : Math.sin(this.time * 2.7) * .025;
      return;
    }
    a.elapsed += dt;
    const p = clamp(a.elapsed / a.duration);
    if (a.kind === 'run') {
      this.thief.root.position.x = lerp(a.fromX, a.toX, smooth(p));
      this.poseRun(a.elapsed);
    } else if (a.kind === 'caught') {
      this.police.root.position.z = lerp(-11.6, MAIN_ROAD_Z, 1 - (1 - clamp(p * 1.8)) ** 3);
      const handsUp = smooth((p - .15) / .3);
      this.thief.arms[0].rotation.z = -2.65 * handsUp; this.thief.arms[1].rotation.z = -2.65 * handsUp;
      this.thief.body.rotation.z = .06 * handsUp;
      this.thief.legs.forEach(leg => { leg.rotation.z = 0; });
    } else if (a.kind === 'alley') {
      this.thief.root.rotation.y = -Math.PI / 2 * smooth(p * 3);
      this.thief.root.position.z = lerp(a.z, 12.7, smooth(p)); this.poseRun(a.elapsed);
      this.thief.root.position.y = lerp(ROAD_Y, .13, smooth((p-.2)/.3));
      if (p > .9) this.thief.root.visible = false;
    } else if (a.kind === 'helicopter') {
      const h = this.helicopter;
      h.rotor.rotation.y += dt * (this.reducedMotion ? 3 : 34); h.tailRotor.rotation.x += dt * (this.reducedMotion ? 3 : 42);
      const approach = smooth(p / .37), lift = smooth((p - .5) / .24), depart = smooth((p - .73) / .27);
      h.root.position.set(lerp(a.x + 15, a.x, approach) - depart * 17, lerp(12, 5.3, approach) + depart * 10, RUNNER_Z + .85);
      h.root.rotation.z = depart * .12;
      const ropeLength = Math.max(.5, (h.root.position.y - 2.4) * (1 - lift));
      h.rope.scale.y = ropeLength; h.rope.position.y = -1 - ropeLength / 2;
      if (p > .37) {
        this.thief.arms.forEach(arm => { arm.rotation.z = -2.9 * smooth((p - .37) / .13); });
        this.thief.root.position.y = ROAD_Y + lift * 3.5;
        this.thief.root.position.z = lerp(a.z, RUNNER_Z + 1.82, smooth((p - .37) / .12));
      }
      if (p > .72) { this.thief.root.visible = false; h.rope.visible = false; }
    }
    if (p === 1) {
      // Clear first: completion may synchronously start the next animation.
      this.animation = null;
      if (a.kind === 'run') {
        this.thief.body.rotation.z = 0; this.thief.body.position.y = 0;
        this.thief.legs.forEach(leg => { leg.rotation.z = 0; }); this.thief.arms.forEach(arm => { arm.rotation.z = 0; });
      }
      a.onComplete?.();
    }
  }
}
