/**
 * Credits arithmetic, parsing and validation. Pure: no DOM, no Three.js, no
 * formatting decisions that belong to a specific screen.
 *
 * Every amount is an integer number of hundredths of a credit (minor units).
 */

/** Minimum accepted stake: 1,00 CR. */
export const MIN_BET = 100;
/** Theoretical maximum stake: 1.000.000,00 CR, further limited by the balance. */
export const MAX_BET = 100_000_000;

/**
 * Why a stake cannot be accepted. The caller owns the wording.
 * @typedef {'invalid' | 'below-minimum' | 'insufficient' | 'above-maximum'} BetError
 */

/**
 * Parse a credit amount written the Italian way.
 *
 * `25`, `1,25`, `1.000,00`, `1.234,50` and `1.000.000,00` are accepted; a decimal
 * comma makes every preceding dot a thousands group. Anything else — more than two
 * decimals, letters, an empty string, a value beyond the safe integer range — is
 * rejected with `null`.
 *
 * @param {string | number} text
 * @returns {number | null} Minor units, or null when the input is not a valid amount.
 */
export function parseBet(text) {
  const raw = String(text).trim();
  // it-IT writes 1.000,00: a decimal comma makes every preceding dot a thousands group.
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const minor = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

/**
 * Render minor units for the stake field: two decimals, decimal comma, no grouping.
 * Grouped display belongs to `format.js`; this is what the input element holds.
 *
 * @param {number} minor
 * @returns {string}
 */
export function formatBetInput(minor) {
  return (minor / 100).toFixed(2).replace('.', ',');
}

/**
 * Clamp a requested stake into the playable range for the current balance.
 *
 * @param {number} requested Minor units.
 * @param {number} balance Minor units currently available.
 * @returns {number}
 */
export function clampBet(requested, balance) {
  return Math.min(Math.max(MIN_BET, requested), balance, MAX_BET);
}

/**
 * Classify a parsed stake against the limits and the balance.
 *
 * @param {number | null} value Minor units, or null when parsing already failed.
 * @param {number} balance Minor units currently available.
 * @returns {BetError | null} null when the stake can be accepted.
 */
export function getBetError(value, balance) {
  if (value === null) return 'invalid';
  if (value < MIN_BET) return 'below-minimum';
  if (value > balance) return 'insufficient';
  if (value > MAX_BET) return 'above-maximum';
  return null;
}
