import { alleyAnimation } from './alley.js';
import { caughtAnimation } from './caught.js';
import { runAnimation } from './run.js';

/**
 * One handler per procedural animation, looked up by kind.
 *
 * A handler builds its own state in `create`, applies a pose in `update` and may settle
 * exact end values in `settle`. The controller only owns the clock and the completion
 * callback, so adding an animation never grows an `if / else if` chain.
 *
 * These are procedural voxel poses: no skeleton, no glTF, no AnimationMixer.
 *
 * @typedef {object} AnimationHandler
 * @property {(actor: any, options: { crossing?: number }) => Record<string, any>} create
 * @property {(actor: any, state: any, progress: number) => void} update
 * @property {(actor: any, state: any) => void} [settle]
 */

/** @type {Record<import('../../core/types.js').AnimationKind, AnimationHandler>} */
export const ANIMATIONS = Object.freeze({
  run: runAnimation,
  caught: caughtAnimation,
  alley: alleyAnimation,
});
