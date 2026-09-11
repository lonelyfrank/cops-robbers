/**
 * Economic and round tuning. Values only: no formulas, no state, no rendering.
 *
 * `RTP_TARGET` moves the level of the multipliers; the decays move how fast the risk
 * grows. They are deliberately separate knobs. Changing anything here changes the
 * published odds, so it must be matched by the maths tests and the documentation.
 */

/** Theoretical return to player, before the settlement rounding. */
export const RTP_TARGET = 0.96;

/** Probability of the first green, shared by every difficulty. */
export const INITIAL_GREEN_PROBABILITY = 0.95;

/**
 * Defensive floor for future curve changes. With the current decays the lowest
 * probability is about 0.316 (hard, twelfth junction), so the floor never applies.
 */
export const MIN_GREEN_PROBABILITY = 0.12;

/** Junctions in a run. The cap keeps payouts and the streamed city finite. */
export const MAX_CROSSINGS = 12;

/** Exponential decay of the green probability, per difficulty. */
export const DIFFICULTY_DECAY = Object.freeze({ easy: 0.035, medium: 0.065, hard: 0.1 });

/** Opening balance of the demo, in hundredths of a credit. */
export const INITIAL_BALANCE = 100_000;

/** Stake proposed before the player changes it. */
export const DEFAULT_BET = 2_500;

/** Minimum accepted stake: 1,00 CR. */
export const MIN_BET = 100;

/** Theoretical maximum stake: 1.000.000,00 CR, further limited by the balance. */
export const MAX_BET = 100_000_000;

/** Rounds kept in the history strip. */
export const HISTORY_SIZE = 8;
