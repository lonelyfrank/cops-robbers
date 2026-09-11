/**
 * Derived view state: everything the components need that is not already in the
 * snapshot. Pure — no DOM, no Three.js — so the presentation rules are testable.
 */
import { MAX_CROSSINGS } from '../config/gameplay.js';
import { calculatePayout, getGreenProbability } from '../core/gameMath.js';
import { PHASES } from '../core/gameState.js';

/**
 * @typedef {import('../core/types.js').GameSnapshot} GameSnapshot
 *
 * @typedef {object} RenderMarks
 * @property {import('../core/types.js').GamePhase | ''} phase
 * @property {number} round
 * @property {number} crossing
 *
 * @typedef {object} View
 * @property {boolean} configure Stake and difficulty can be changed.
 * @property {boolean} decision The player may continue or cash out.
 * @property {boolean} active A round is resolving.
 * @property {boolean} changedPhase Anything that identifies the round moved.
 * @property {boolean} arrived A junction was just cleared inside the same round.
 * @property {number} pendingCrossing Junction the next green would clear.
 * @property {number} potential Minor units currently cashable, or the stake on show.
 * @property {number} probability Green probability of the pending junction.
 * @property {boolean} ready The scene finished loading and accepts input.
 * @property {boolean} betValid The stake field currently holds an acceptable amount.
 */

/**
 * Marks that mean "nothing rendered yet", so the first frame counts as a change.
 * @type {RenderMarks}
 */
export const INITIAL_MARKS = Object.freeze({ phase: '', round: -1, crossing: -1 });

/**
 * @param {GameSnapshot} s
 * @param {RenderMarks} previous State of the previous render.
 * @param {{ ready?: boolean, betValid?: boolean }} [flags]
 * @returns {View}
 */
export function deriveView(s, previous, { ready = false, betValid = false } = {}) {
  const configure = s.phase === PHASES.IDLE || s.phase === PHASES.RESULT;
  const active = !configure;
  return {
    configure,
    decision: s.phase === PHASES.READY,
    active,
    changedPhase:
      s.phase !== previous.phase || s.round !== previous.round || s.crossing !== previous.crossing,
    arrived: s.round === previous.round && s.crossing > previous.crossing,
    pendingCrossing: Math.min(s.crossing + 1, MAX_CROSSINGS),
    potential:
      s.crossing > 0
        ? calculatePayout(s.stake, s.crossing, s.difficulty)
        : active
          ? s.stake
          : s.bet,
    probability: getGreenProbability(Math.min(s.crossing + 1, MAX_CROSSINGS), s.difficulty),
    ready,
    betValid,
  };
}

/**
 * Board-wide presentation state, used by the stylesheet to tint the console.
 * @param {GameSnapshot} s
 * @returns {'idle' | 'resolving' | 'success' | 'caught' | 'cashedOut'}
 */
export function getBoardState(s) {
  if (s.phase === PHASES.CAUGHT || (s.phase === PHASES.RESULT && !s.payout)) return 'caught';
  if (s.phase === PHASES.ESCAPING || (s.phase === PHASES.RESULT && s.payout)) return 'cashedOut';
  if (s.phase === PHASES.RUNNING) return 'resolving';
  if (s.phase === PHASES.READY) return 'success';
  return 'idle';
}

/**
 * @param {GameSnapshot} s
 * @returns {RenderMarks}
 */
export const marksOf = (s) => ({ phase: s.phase, round: s.round, crossing: s.crossing });
