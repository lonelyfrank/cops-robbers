import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RTP_TARGET,
  DIFFICULTIES,
  MAX_CROSSINGS,
  MIN_GREEN_PROBABILITY,
  getGreenProbability,
  getCumulativeProbability,
  getMultiplier,
  calculatePayout,
  isGreen,
  buildRiskTable,
} from '../src/gameMath.js';

const close = (a, b, epsilon = 1e-12) =>
  assert.ok(Math.abs(a - b) <= epsilon, `${a} differs from ${b}`);

test('All difficulties start at 95%; probabilities decrease and multipliers increase', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    close(getGreenProbability(1, difficulty), 0.95);
    for (let n = 2; n <= MAX_CROSSINGS; n++) {
      assert.ok(getGreenProbability(n, difficulty) < getGreenProbability(n - 1, difficulty));
      assert.ok(getMultiplier(n, difficulty) > getMultiplier(n - 1, difficulty));
    }
  }
});

test('Actual payable multiplier gives 96% RTP at all 36 difficulty / crossing combinations', () => {
  for (const difficulty of Object.keys(DIFFICULTIES))
    for (let n = 1; n <= MAX_CROSSINGS; n++) {
      close(getCumulativeProbability(n, difficulty) * getMultiplier(n, difficulty), RTP_TARGET);
    }
});

test('Risk table matches actual cashout amounts across all crossings and difficulties', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const rows = buildRiskTable(difficulty);
    assert.equal(rows.length, MAX_CROSSINGS);
    for (const row of rows) {
      close(row.totalMultiplier, getMultiplier(row.n, difficulty));
      assert.equal(
        calculatePayout(2500, row.n, difficulty),
        Math.floor(2500 * row.totalMultiplier + 1e-8),
      );
    }
  }
});

test('Higher difficulty has lower cumulative survival and a higher payout', () => {
  for (let n = 2; n <= MAX_CROSSINGS; n++) {
    assert.ok(getCumulativeProbability(n, 'hard') < getCumulativeProbability(n, 'medium'));
    assert.ok(getCumulativeProbability(n, 'medium') < getCumulativeProbability(n, 'easy'));
    assert.ok(getMultiplier(n, 'hard') > getMultiplier(n, 'medium'));
    assert.ok(getMultiplier(n, 'medium') > getMultiplier(n, 'easy'));
  }
});

test('RTP can be recalibrated independently of risk and rendering', () => {
  for (const target of [0.9, 0.96, 0.98, 1])
    for (const d of Object.keys(DIFFICULTIES)) {
      for (const row of buildRiskTable(d, target))
        close(row.cumulativeProbability * row.totalMultiplier, target);
    }
});

test('Payouts settle in integer hundredths, never round up, and differ by less than 0.01 CR', () => {
  for (const d of Object.keys(DIFFICULTIES))
    for (let n = 1; n <= MAX_CROSSINGS; n++)
      for (const stake of [100, 123, 2500, 100000, 100000000]) {
        const exact = stake * getMultiplier(n, d),
          actual = calculatePayout(stake, n, d);
        assert.ok(Number.isSafeInteger(actual));
        assert.ok(actual <= exact + 1e-8);
        assert.ok(exact - actual < 1);
        close((getCumulativeProbability(n, d) * actual) / stake, RTP_TARGET, 1 / stake);
      }
});

test('Green uses a strict random boundary and rejects invalid samples', () => {
  const p = getGreenProbability(1, 'easy');
  assert.equal(isGreen(1, 'easy', 0), true);
  assert.equal(isGreen(1, 'easy', p - 1e-9), true);
  assert.equal(isGreen(1, 'easy', p), false);
  assert.equal(isGreen(1, 'easy', 0.99999), false);
  for (const v of [-0.1, 1, NaN, Infinity, '0.5'])
    assert.throws(() => isGreen(1, 'easy', v), RangeError);
});

test('Math rejects invalid crossing, difficulty, RTP, and unsafe monetary input', () => {
  for (const n of [-1, 0.5, 13, NaN]) assert.throws(() => getMultiplier(n), RangeError);
  for (const d of ['unknown', 'constructor', '__proto__'])
    assert.throws(() => getMultiplier(1, d), RangeError);
  assert.throws(() => getGreenProbability(0), RangeError);
  for (const rtp of [0, -1, 1.01, NaN])
    assert.throws(() => getMultiplier(1, 'easy', rtp), RangeError);
  for (const stake of [0, -1, 0.5, NaN, Number.MAX_SAFE_INTEGER])
    assert.throws(() => calculatePayout(stake, 12, 'hard'), RangeError);
  close(getCumulativeProbability(0), 1);
  close(getMultiplier(0), 1);
});

test('The probability floor is a defensive bound outside the current twelve-crossing curve', () => {
  for (const d of Object.keys(DIFFICULTIES))
    for (let n = 1; n <= MAX_CROSSINGS; n++)
      assert.ok(getGreenProbability(n, d) > MIN_GREEN_PROBABILITY);
});

test('Documented rounded RTP examples refer to the worst available cashout strategy', () => {
  for (const [stake, expected] of [
    [100, 95.54],
    [2500, 95.97],
    [100000, 96],
  ]) {
    let minimum = 1;
    for (const d of Object.keys(DIFFICULTIES))
      for (let n = 1; n <= MAX_CROSSINGS; n++)
        minimum = Math.min(
          minimum,
          (getCumulativeProbability(n, d) * calculatePayout(stake, n, d)) / stake,
        );
    assert.equal(Number((minimum * 100).toFixed(2)), expected);
  }
});
