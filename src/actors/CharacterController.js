import { createThief, createPoliceCar } from '../rendering/voxelModels.js';
import {
  getCrossingX,
  getStopX,
  getPursuitStopX,
  RUNNER_Z,
  ROAD_Y,
  TILE_SIZE,
  sirenPulse,
} from '../world/mapLayout.js';
import { CHARACTER } from '../config/animation.js';

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const p = clamp(value);
  return p * p * (3 - 2 * p);
};
const lerp = (a, b, t) => a + (b - a) * t;

export class CharacterController {
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
    this.animation = null;
    this.time = 0;
    this.arrested = false;
    this.police.red.material = this.police.blue.material;
    this.police.redLight.color.set(0x467bff);
    this.reset();
  }
  reset() {
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
  run(n, onComplete) {
    const fromX = this.thief.root.position.x,
      toX = getStopX(n);
    const chaseFromX = this.chase.root.position.x,
      chaseToX = getPursuitStopX(n);
    const duration = this.reducedMotion
      ? CHARACTER.reducedRunDuration
      : Math.max(
          CHARACTER.runMinDuration,
          Math.abs(toX - fromX) / CHARACTER.runSpeed,
          Math.abs(chaseToX - chaseFromX) / CHARACTER.runSpeed,
        );
    this.animation = {
      kind: 'run',
      elapsed: 0,
      duration,
      fromX,
      toX,
      chaseFromX,
      chaseToX,
      onComplete,
    };
  }
  setLoot(multiplier, crossing) {
    const growth = crossing * 0.09 + Math.log2(Math.max(1, multiplier)) * 0.16;
    this.lootTarget = 1 + 1.4 * (1 - Math.exp(-growth));
  }
  caught(n, onComplete) {
    const x = getCrossingX(n);
    this.arrested = true;
    this.police.root.visible = false;
    this.police.root.position.set(x + TILE_SIZE * 2, 0.03, RUNNER_Z);
    this.police.root.rotation.y = -Math.PI / 2;
    this.flankPolice.forEach((car, i) => {
      car.root.visible = false;
      car.root.rotation.y = i === 0 ? 0 : Math.PI;
      car.root.position.set(x + (i === 0 ? -1.35 : 1.35), 0.03, i === 0 ? -22 : RUNNER_Z + 22);
    });
    this.animation = {
      kind: 'caught',
      elapsed: 0,
      duration: this.reducedMotion ? CHARACTER.reducedCaughtDuration : CHARACTER.caughtDuration,
      handsFrom: this.thief.arms.map((arm) => arm.rotation.z),
      bodyFrom: this.thief.body.rotation.z,
      crossingX: x,
      captureX: x - 0.2,
      fromX: this.thief.root.position.x,
      policeFromX: x + TILE_SIZE * 2,
      chaseFromX: this.chase.root.position.x,
      onComplete,
    };
  }
  escape(onComplete) {
    this.animation = {
      kind: 'alley',
      elapsed: 0,
      duration: this.reducedMotion ? CHARACTER.reducedAlleyDuration : CHARACTER.alleyDuration,
      z: this.thief.root.position.z,
      onComplete,
    };
  }
  poseRun(time, strength = 1) {
    const wave = Math.sin(time * 18) * strength;
    this.thief.legs[0].rotation.z = wave * 0.73;
    this.thief.legs[1].rotation.z = -wave * 0.73;
    this.thief.arms[0].rotation.z = -wave * 0.55;
    this.thief.arms[1].rotation.z = wave * 0.55;
    this.thief.body.position.y = Math.abs(wave) * 0.085;
    this.thief.body.rotation.z = -0.08 * strength;
  }
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
    if (a.kind === 'run') {
      this.thief.root.position.x = lerp(a.fromX, a.toX, smooth(p));
      this.chase.root.position.x = lerp(a.chaseFromX, a.chaseToX, smooth(p));
      this.poseRun(a.elapsed, smooth(p / 0.12) * (1 - smooth((p - 0.8) / 0.2)));
    } else if (a.kind === 'caught') {
      // The thief enters the junction; four cars close a ring from existing roads.
      this.thief.root.position.x = lerp(a.fromX, a.captureX, smooth(p / 0.32));
      this.poseRun(a.elapsed, 1 - smooth(p / 0.32));
      this.chase.root.position.x = lerp(a.chaseFromX, a.captureX - 3.8, smooth((p - 0.05) / 0.75));
      this.police.root.position.x = lerp(a.policeFromX, a.captureX + 3.6, smooth(p / 0.78));
      this.police.root.visible = this.police.root.position.x <= a.crossingX + TILE_SIZE * 1.5 - 0.5;
      const [north, south] = this.flankPolice;
      north.root.position.z = lerp(-22, RUNNER_Z - 3.4, smooth((p - 0.12) / 0.65));
      south.root.position.z = lerp(RUNNER_Z + 22, RUNNER_Z + 3.4, smooth((p - 0.22) / 0.6));
      north.root.visible = north.root.position.z >= -TILE_SIZE / 2 - 1.5;
      south.root.visible = south.root.position.z <= TILE_SIZE / 2 + 1.5;
      const handsUp = smooth((p - 0.32) / 0.35);
      if (p >= 0.32) {
        this.thief.arms.forEach((arm, i) => {
          arm.rotation.z = lerp(a.handsFrom[i], -2.65, handsUp);
        });
        this.thief.body.rotation.z = lerp(a.bodyFrom, 0.06, handsUp);
      }
    } else if (a.kind === 'alley') {
      this.thief.root.rotation.y = (-Math.PI / 2) * smooth(p * 3);
      this.thief.root.position.z = lerp(a.z, 12.7, smooth(p));
      this.poseRun(a.elapsed);
      this.thief.root.position.y = lerp(ROAD_Y, 0.13, smooth((p - 0.2) / 0.3));
      if (p > 0.9) this.thief.root.visible = false;
    }
    if (p === 1) {
      // Clear first: completion may synchronously start the next animation.
      this.animation = null;
      if (a.kind === 'run') {
        this.thief.root.position.x = a.toX;
        this.chase.root.position.x = a.chaseToX;
        this.thief.body.rotation.z = 0;
        this.thief.body.position.y = 0;
        this.thief.legs.forEach((leg) => {
          leg.rotation.z = 0;
        });
        this.thief.arms.forEach((arm) => {
          arm.rotation.z = 0;
        });
      }
      a.onComplete?.();
    }
  }
}
