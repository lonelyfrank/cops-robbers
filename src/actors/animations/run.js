import { CHARACTER } from '../../config/animation.js';
import { getPursuitStopX, getStopX } from '../../world/mapLayout.js';
import { lerp, poseRun, smooth } from './easing.js';

/**
 * Thief and patrol cross together and stop before the next junction.
 *
 * The duration comes from the longer of the two distances, so they arrive as one move;
 * reduced motion uses a fixed short duration instead.
 *
 * @type {import('./index.js').AnimationHandler}
 */
export const runAnimation = {
  create(actor, { crossing }) {
    const fromX = actor.thief.root.position.x;
    const toX = getStopX(crossing);
    const chaseFromX = actor.chase.root.position.x;
    const chaseToX = getPursuitStopX(crossing);
    return {
      duration: actor.reducedMotion
        ? CHARACTER.reducedRunDuration
        : Math.max(
            CHARACTER.runMinDuration,
            Math.abs(toX - fromX) / CHARACTER.runSpeed,
            Math.abs(chaseToX - chaseFromX) / CHARACTER.runSpeed,
          ),
      fromX,
      toX,
      chaseFromX,
      chaseToX,
    };
  },
  update(actor, a, p) {
    actor.thief.root.position.x = lerp(a.fromX, a.toX, smooth(p));
    actor.chase.root.position.x = lerp(a.chaseFromX, a.chaseToX, smooth(p));
    // Ramp the stride in quickly, then settle it before the stop.
    poseRun(actor.thief, a.elapsed, smooth(p / 0.12) * (1 - smooth((p - 0.8) / 0.2)));
  },
  settle(actor, a) {
    actor.thief.root.position.x = a.toX;
    actor.chase.root.position.x = a.chaseToX;
    actor.thief.body.rotation.z = 0;
    actor.thief.body.position.y = 0;
    for (const leg of actor.thief.legs) leg.rotation.z = 0;
    for (const arm of actor.thief.arms) arm.rotation.z = 0;
  },
};
