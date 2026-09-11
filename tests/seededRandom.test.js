import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISTRICT_SEED_BASE,
  createDistrictRandom,
  createSeededRandom,
} from '../src/world/seededRandom.js';
import { getDistrictStyle } from '../src/world/geometry/index.js';
import { GameState } from '../src/core/gameState.js';
import { MAX_CROSSINGS } from '../src/config/gameplay.js';

test('The same seed replays the same stream, and different seeds diverge', () => {
  const a = createSeededRandom(12345);
  const b = createSeededRandom(12345);
  const c = createSeededRandom(12346);
  const first = Array.from({ length: 64 }, () => a());
  const second = Array.from({ length: 64 }, () => b());
  const other = Array.from({ length: 64 }, () => c());
  assert.deepEqual(first, second, 'a seed is a replayable stream');
  assert.notDeepEqual(first, other);
  for (const value of first) assert.ok(Number.isFinite(value) && value >= 0 && value < 1);
  assert.throws(() => createSeededRandom(NaN), RangeError);
});

test('District seeds are spaced, so neighbours never share a look', () => {
  assert.deepEqual(
    Array.from({ length: 8 }, () => createDistrictRandom(0)()),
    Array.from({ length: 8 }, () => createSeededRandom(DISTRICT_SEED_BASE)()),
  );
  const streams = [];
  for (let index = 0; index <= MAX_CROSSINGS + 1; index++) {
    const random = createDistrictRandom(index);
    streams.push(Array.from({ length: 6 }, () => random()).join(','));
  }
  assert.equal(new Set(streams).size, streams.length, 'each district gets its own stream');
  // The architecture uses an offset stream, independent from the foundation's.
  assert.notEqual(createDistrictRandom(3)(), createDistrictRandom(3, 503)());
});

test('District style is reproducible for an index and independent of the wager RNG', () => {
  for (const index of [0, 1, 7, MAX_CROSSINGS + 1])
    assert.deepEqual(getDistrictStyle(index), getDistrictStyle(index));

  // Building a whole city must not consume a single wager sample.
  let samples = 0;
  const game = new GameState({
    random: () => {
      samples++;
      return 0;
    },
  });
  game.start(2500);
  const before = samples;
  for (let index = 0; index <= MAX_CROSSINGS + 1; index++) {
    getDistrictStyle(index, 'district87');
    getDistrictStyle(index, 'neonTokyo');
  }
  assert.equal(samples, before, 'cosmetic generation never touches the gameplay generator');
});
