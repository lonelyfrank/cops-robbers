import test from 'node:test';
import assert from 'node:assert/strict';
import { getReelValues } from '../src/ui/components/multiplierReel.js';
import { GameState } from '../src/gameState.js';
import { getMultiplier } from '../src/gameMath.js';

test('Reel previews start at 0 / 1 / first multiplier and follow actual cleared crossings', () => {
  const game = new GameState({ random: () => 0 });
  assert.deepEqual(getReelValues(game.snapshot), {
    previousMultiplier: 0,
    currentMultiplier: 1,
    nextMultiplier: getMultiplier(1),
  });
  game.start();
  for (let n = 1; n <= 12; n++) {
    game.finishCrossing();
    const values = getReelValues(game.snapshot);
    assert.equal(values.previousMultiplier, getMultiplier(n - 1));
    assert.equal(values.currentMultiplier, getMultiplier(n));
    assert.equal(values.nextMultiplier, n === 12 ? null : getMultiplier(n + 1));
    if (n < 12) game.advance();
  }
});

test('Caught and cashed-out reels retain the earned value and original difficulty in results', () => {
  for (const lose of [false, true]) {
    let sample = 0;
    const game = new GameState({ random: () => sample });
    game.start();
    game.finishCrossing();
    game.advance();
    game.finishCrossing();
    const earned = getReelValues(game.snapshot);
    if (lose) {
      sample = 0.999999;
      game.advance();
      game.finishCaught();
    } else {
      game.cashout();
      game.finishEscape();
    }
    game.setDifficulty('hard');
    assert.deepEqual(getReelValues(game.snapshot), earned);
    game.resetDemo();
    assert.equal(getReelValues(game.snapshot).currentMultiplier, 1);
    assert.equal(getReelValues(game.snapshot).previousMultiplier, 0);
  }
});
