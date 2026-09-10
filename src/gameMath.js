/** All probability / payout functions are pure. No Three.js or browser imports. */
export const RTP_TARGET = 0.96;
export const INITIAL_GREEN_PROBABILITY = 0.95;
// Defensive floor for future curve changes; not reached within the current twelve crossings.
export const MIN_GREEN_PROBABILITY = 0.12;
export const MAX_CROSSINGS = 12;
export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ label: 'Facile', decay: 0.035, description: 'Il rischio cresce piano.' }),
  medium: Object.freeze({
    label: 'Medio',
    decay: 0.065,
    description: 'Più rischio, più moltiplicatore.',
  }),
  hard: Object.freeze({
    label: 'Difficile',
    decay: 0.1,
    description: 'Il rischio cresce in fretta.',
  }),
});

function validate(n, difficulty) {
  if (!Number.isInteger(n) || n < 0 || n > MAX_CROSSINGS)
    throw new RangeError('Incrocio non valido.');
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) throw new RangeError('Difficoltà non valida.');
}

export function getGreenProbability(n, difficulty = 'medium') {
  validate(n, difficulty);
  if (n === 0) throw new RangeError('Gli incroci partono da 1.');
  return Math.max(
    MIN_GREEN_PROBABILITY,
    INITIAL_GREEN_PROBABILITY * Math.exp(-DIFFICULTIES[difficulty].decay * (n - 1)),
  );
}

export function getCumulativeProbability(n, difficulty = 'medium') {
  validate(n, difficulty);
  let probability = 1;
  for (let i = 1; i <= n; i++) probability *= getGreenProbability(i, difficulty);
  return probability;
}

/** The effective multiplier paid at cashout. */
export function getMultiplier(n, difficulty = 'medium', rtp = RTP_TARGET) {
  validate(n, difficulty);
  if (!Number.isFinite(rtp) || rtp <= 0 || rtp > 1) {
    throw new RangeError('RTP deve essere maggiore di 0 e non superiore a 1.');
  }
  return n === 0 ? 1 : rtp / getCumulativeProbability(n, difficulty);
}

/** Account in hundredths of a credit; round only at settlement. */
export function calculatePayout(stakeMinor, n, difficulty = 'medium', rtp = RTP_TARGET) {
  if (!Number.isSafeInteger(stakeMinor) || stakeMinor <= 0)
    throw new RangeError('Puntata non valida.');
  const payout = Math.floor(stakeMinor * getMultiplier(n, difficulty, rtp) + 1e-8);
  if (!Number.isSafeInteger(payout)) throw new RangeError('Vincita troppo grande.');
  return payout;
}

/** Inject the random sample for deterministic tests. Actual gameplay uses crypto. */
export function isGreen(n, difficulty, sample) {
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1)
    throw new RangeError('Campione casuale non valido.');
  return sample < getGreenProbability(n, difficulty);
}

export function buildRiskTable(difficulty = 'medium', rtp = RTP_TARGET) {
  return Array.from({ length: MAX_CROSSINGS }, (_, index) => {
    const n = index + 1;
    return {
      n,
      greenProbability: getGreenProbability(n, difficulty),
      cumulativeProbability: getCumulativeProbability(n, difficulty),
      totalMultiplier: getMultiplier(n, difficulty, rtp),
    };
  });
}
