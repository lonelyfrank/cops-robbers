import { CHARACTER } from '../../config/animation.js';
import { ROAD_Y } from '../../world/mapLayout.js';
import { lerp, poseRun, smooth } from './easing.js';

/**
 * The cashout: the thief turns off the avenue into the alley and is gone.
 *
 * Used at every junction, including the automatic settlement at the twelfth.
 *
 * @type {import('./index.js').AnimationHandler}
 */
export const alleyAnimation = {
  create(actor) {
    return {
      duration: actor.reducedMotion ? CHARACTER.reducedAlleyDuration : CHARACTER.alleyDuration,
      z: actor.thief.root.position.z,
    };
  },
  update(actor, a, p) {
    actor.thief.root.rotation.y = (-Math.PI / 2) * smooth(p * 3);
    actor.thief.root.position.z = lerp(a.z, 12.7, smooth(p));
    poseRun(actor.thief, a.elapsed);
    actor.thief.root.position.y = lerp(ROAD_Y, 0.13, smooth((p - 0.2) / 0.3));
    if (p > 0.9) actor.thief.root.visible = false;
  },
};
