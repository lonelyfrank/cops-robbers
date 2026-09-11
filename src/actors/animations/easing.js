/** Shared easing for the procedural animations. No Three.js, no state. */

/** @param {number} value */
export const clamp = (value) => Math.max(0, Math.min(1, value));

/** Smoothstep on a normalised progress. @param {number} value */
export const smooth = (value) => {
  const p = clamp(value);
  return p * p * (3 - 2 * p);
};

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * The running pose: legs and arms out of phase, a small bounce and a forward lean.
 *
 * Taken from the animation's own elapsed time rather than accumulated per frame, so the
 * pose at a given moment is the same at 30, 60 or 120 Hz.
 *
 * @param {any} thief
 * @param {number} time Seconds since this animation started.
 * @param {number} [strength] 0 stands still, 1 is a full stride.
 */
export function poseRun(thief, time, strength = 1) {
  const wave = Math.sin(time * 18) * strength;
  thief.legs[0].rotation.z = wave * 0.73;
  thief.legs[1].rotation.z = -wave * 0.73;
  thief.arms[0].rotation.z = -wave * 0.55;
  thief.arms[1].rotation.z = wave * 0.55;
  thief.body.position.y = Math.abs(wave) * 0.085;
  thief.body.rotation.z = -0.08 * strength;
}
