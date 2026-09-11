/**
 * Deterministic generator for the look of the city.
 *
 * **Cosmetic RNG only.** The wager outcomes come from `crypto.getRandomValues()` through
 * `GameState`, and the two never meet: nothing drawn here can move a probability, a
 * multiplier or a balance. Keeping them apart is what lets the city seed be replayed,
 * logged in a bug report or fixed for a screenshot without touching the odds.
 *
 * The sequence is a plain 32-bit linear congruential generator — the constants are the
 * ones from Numerical Recipes — chosen because it is tiny, allocation-free and gives the
 * same stream on every platform.
 */

const MULTIPLIER = 1664525;
const INCREMENT = 1013904223;
const RANGE = 4294967296;

/**
 * @param {number} seed Any integer; only the low 32 bits matter.
 * @returns {() => number} Successive samples in [0, 1).
 */
export function createSeededRandom(seed) {
  if (!Number.isFinite(seed)) throw new RangeError('Seme non valido.');
  let state = seed | 0;
  return () => {
    state = (Math.imul(state, MULTIPLIER) + INCREMENT) | 0;
    return (state >>> 0) / RANGE;
  };
}

/** Base of the district seeds; each index is spaced by a large odd stride. */
export const DISTRICT_SEED_BASE = 70241;
const DISTRICT_SEED_STRIDE = 98711;

/**
 * The generator a district draws itself with.
 *
 * Two districts with the same index always look the same, in this session and in the
 * next one, which is what the geometry regression tests rely on.
 *
 * @param {number} index District index; the approach and exit districts included.
 * @param {number} [offset] Independent stream for the same district.
 * @returns {() => number}
 */
export const createDistrictRandom = (index, offset = 0) =>
  createSeededRandom(DISTRICT_SEED_BASE + (index + offset) * DISTRICT_SEED_STRIDE);
