import { CHARACTER } from '../../config/animation.js';
import { RUNNER_Z, TILE_SIZE, getCrossingX } from '../../world/mapLayout.js';
import { lerp, poseRun, smooth } from './easing.js';

/**
 * Four patrols close a ring around the thief, who slows down and raises his hands.
 *
 * Every car enters along a street that already exists: one from behind, one head-on from
 * the far end, two from the sides of the junction. Each is only shown once it is inside
 * the diorama, so none of them appears out of thin air.
 *
 * @type {import('./index.js').AnimationHandler}
 */
export const caughtAnimation = {
  create(actor, { crossing }) {
    const x = getCrossingX(crossing);
    actor.arrested = true;
    actor.police.root.visible = false;
    actor.police.root.position.set(x + TILE_SIZE * 2, 0.03, RUNNER_Z);
    actor.police.root.rotation.y = -Math.PI / 2;
    actor.flankPolice.forEach((car, i) => {
      car.root.visible = false;
      car.root.rotation.y = i === 0 ? 0 : Math.PI;
      car.root.position.set(x + (i === 0 ? -1.35 : 1.35), 0.03, i === 0 ? -22 : RUNNER_Z + 22);
    });
    return {
      duration: actor.reducedMotion ? CHARACTER.reducedCaughtDuration : CHARACTER.caughtDuration,
      // Fixed references, so the stopping pose does not depend on the frame rate.
      handsFrom: actor.thief.arms.map((arm) => arm.rotation.z),
      bodyFrom: actor.thief.body.rotation.z,
      crossingX: x,
      captureX: x - 0.2,
      fromX: actor.thief.root.position.x,
      policeFromX: x + TILE_SIZE * 2,
      chaseFromX: actor.chase.root.position.x,
    };
  },
  update(actor, a, p) {
    actor.thief.root.position.x = lerp(a.fromX, a.captureX, smooth(p / 0.32));
    poseRun(actor.thief, a.elapsed, 1 - smooth(p / 0.32));
    actor.chase.root.position.x = lerp(a.chaseFromX, a.captureX - 3.8, smooth((p - 0.05) / 0.75));
    actor.police.root.position.x = lerp(a.policeFromX, a.captureX + 3.6, smooth(p / 0.78));
    actor.police.root.visible = actor.police.root.position.x <= a.crossingX + TILE_SIZE * 1.5 - 0.5;
    const [north, south] = actor.flankPolice;
    north.root.position.z = lerp(-22, RUNNER_Z - 3.4, smooth((p - 0.12) / 0.65));
    south.root.position.z = lerp(RUNNER_Z + 22, RUNNER_Z + 3.4, smooth((p - 0.22) / 0.6));
    north.root.visible = north.root.position.z >= -TILE_SIZE / 2 - 1.5;
    south.root.visible = south.root.position.z <= TILE_SIZE / 2 + 1.5;
    // Hands go up only after the run has decelerated.
    if (p < 0.32) return;
    const handsUp = smooth((p - 0.32) / 0.35);
    actor.thief.arms.forEach((arm, i) => {
      arm.rotation.z = lerp(a.handsFrom[i], -2.65, handsUp);
    });
    actor.thief.body.rotation.z = lerp(a.bodyFrom, 0.06, handsUp);
  },
};
