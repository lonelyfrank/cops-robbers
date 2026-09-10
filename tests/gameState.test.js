import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, PHASES, INITIAL_BALANCE, MAX_BET, secureRandom } from '../src/gameState.js';
import { calculatePayout, MAX_CROSSINGS } from '../src/gameMath.js';
import { parseBet } from '../src/ui.js';

const resolveGreen = (game) => {
  assert.equal(game.snapshot.phase, PHASES.RUNNING);
  game.finishCrossing();
};

test('Starting deducts the stake exactly once, and locks round configuration', () => {
  const g = new GameState({ random: () => 0 });
  assert.equal(g.start(2500), true);
  assert.equal(g.start(2500), false);
  assert.equal(g.snapshot.balance, INITIAL_BALANCE - 2500);
  assert.equal(g.setBet(100), false);
  assert.equal(g.setDifficulty('hard'), false);
  assert.equal(g.resetDemo(), false);
  assert.equal(g.cashout(), false);
  assert.equal(g.advance(), false);
});

test('Start and advance resolve immediately and consume one random sample per accepted click', () => {
  let calls = 0;
  const g = new GameState({
    random: () => {
      calls++;
      return 0;
    },
  });
  assert.equal(g.start(), true);
  assert.equal(calls, 1);
  assert.equal(g.snapshot.phase, PHASES.RUNNING);
  assert.equal(g.start(), false);
  assert.equal(g.advance(), false);
  assert.equal(g.cashout(), false);
  assert.equal(calls, 1);
  g.finishCrossing();
  assert.equal(g.advance(), true);
  assert.equal(calls, 2);
  assert.equal(g.snapshot.phase, PHASES.RUNNING);
  assert.equal(g.advance(), false);
  assert.equal(g.start(), false);
  assert.equal(g.cashout(), false);
  assert.equal(calls, 2);
});

test('Cashout credits the correct gross payout once; completion never credits again', () => {
  const g = new GameState({ random: () => 0 });
  g.start(2500);
  resolveGreen(g);
  assert.equal(g.snapshot.phase, PHASES.READY);
  assert.equal(g.snapshot.crossing, 1);
  const payout = calculatePayout(2500, 1, 'medium');
  assert.equal(g.cashout(), true);
  assert.equal(g.cashout(), false);
  assert.equal(g.advance(), false);
  assert.equal(g.start(), false);
  assert.equal(g.snapshot.balance, INITIAL_BALANCE - 2500 + payout);
  assert.equal(g.snapshot.history.length, 1);
  assert.equal(g.snapshot.history[0].outcome, 'won');
  assert.equal(g.finishEscape(), true);
  assert.equal(g.finishEscape(), false);
  assert.equal(g.snapshot.balance, INITIAL_BALANCE - 2500 + payout);
  assert.equal(g.start(100), true);
});

test('Red loses the stake, records the attempted crossing, and allows replay only after arrest', () => {
  let calls = 0;
  const g = new GameState({ random: () => (calls++ === 0 ? 0 : 0.999) });
  g.start(1200);
  resolveGreen(g);
  g.advance();
  assert.equal(g.snapshot.phase, PHASES.CAUGHT);
  assert.equal(g.start(), false);
  assert.equal(g.cashout(), false);
  assert.equal(g.finishCaught(), true);
  assert.equal(g.finishCaught(), false);
  const s = g.snapshot;
  assert.equal(s.balance, INITIAL_BALANCE - 1200);
  assert.equal(s.history.length, 1);
  assert.equal(s.history[0].attemptedCrossing, 2);
  assert.equal(s.history[0].crossing, 1);
  assert.equal(s.history[0].payout, 0);
  assert.equal(g.start(100), true);
});

test('Cashout after five crossings pays the displayed multiplier once', () => {
  const g = new GameState({ random: () => 0 });
  g.setDifficulty('hard');
  g.start(5000);
  for (let n = 1; n <= 5; n++) {
    resolveGreen(g);
    if (n < 5) g.advance();
  }
  g.cashout();
  assert.equal(g.snapshot.payout, calculatePayout(5000, 5, 'hard'));
  assert.equal(g.snapshot.balance, INITIAL_BALANCE - 5000 + g.snapshot.payout);
});

test('The last crossing forces one cashout and cannot access an out-of-range intersection', () => {
  const g = new GameState({ random: () => 0 });
  g.start(100);
  for (let n = 1; n <= MAX_CROSSINGS; n++) {
    resolveGreen(g);
    if (n < MAX_CROSSINGS) assert.equal(g.advance(), true);
  }
  assert.equal(g.snapshot.crossing, MAX_CROSSINGS);
  assert.equal(g.snapshot.phase, PHASES.ESCAPING);
  assert.equal(g.advance(), false);
  assert.equal(g.cashout(), false);
  assert.equal(g.finishCrossing(), false);
  assert.equal(g.snapshot.history.length, 1);
});

test('Invalid or unaffordable stakes never mutate balance or begin a round', () => {
  let calls = 0;
  const g = new GameState({
    random: () => {
      calls++;
      return 0;
    },
  });
  const before = g.snapshot;
  for (const bet of [0, -100, 99, 123.4, NaN, Infinity, '2500', INITIAL_BALANCE + 1, MAX_BET + 1])
    assert.equal(g.start(bet), false);
  assert.deepEqual(g.snapshot, before);
  assert.equal(calls, 0);
  assert.equal(g.setDifficulty('constructor'), false);
});

test('Maximum stake loss, insufficient balance, and demo reset work without negative credits', () => {
  const g = new GameState({ random: () => 0.99 });
  g.start(INITIAL_BALANCE);
  g.finishCaught();
  assert.equal(g.snapshot.balance, 0);
  assert.equal(g.start(100), false);
  assert.equal(g.resetDemo(), true);
  assert.equal(g.snapshot.balance, INITIAL_BALANCE);
  assert.equal(g.snapshot.phase, PHASES.IDLE);
  assert.equal(g.snapshot.history.length, 0);
  assert.equal(g.snapshot.bet, 2500);
});

test('Snapshots cannot modify the internal history; history retains only the latest eight rounds', () => {
  const g = new GameState({ random: () => 0 });
  for (let i = 0; i < 10; i++) {
    g.start(100);
    resolveGreen(g);
    g.cashout();
    g.finishEscape();
  }
  const snapshot = g.snapshot;
  assert.equal(snapshot.history.length, 8);
  assert.equal(snapshot.history[0].id, 10);
  snapshot.history.pop();
  assert.equal(g.snapshot.history.length, 8);
  assert.throws(() => {
    snapshot.history[0].payout = 0;
  }, TypeError);
});

test('An immediate red blocks repeated clicks and records only one loss', () => {
  let calls = 0;
  const g = new GameState({
    random: () => {
      calls++;
      return 0.999;
    },
  });
  const phases = [];
  g.subscribe((s) => phases.push(s.phase));
  assert.equal(g.start(2500), true);
  assert.equal(g.snapshot.phase, PHASES.CAUGHT);
  assert.equal(g.start(), false);
  assert.equal(g.advance(), false);
  assert.equal(g.cashout(), false);
  assert.equal(calls, 1);
  assert.equal(g.snapshot.balance, INITIAL_BALANCE - 2500);
  assert.equal(g.finishCaught(), true);
  assert.equal(g.finishCaught(), false);
  assert.equal(g.snapshot.history.length, 1);
  assert.deepEqual(phases, [PHASES.IDLE, PHASES.CAUGHT, PHASES.RESULT]);
});

test('Credit input accepts Italian decimals and rejects precision loss or invalid strings', () => {
  assert.equal(parseBet('25'), 2500);
  assert.equal(parseBet('1,25'), 125);
  assert.equal(parseBet(' 25.01 '), 2501);
  // A decimal comma disambiguates the dots, so the grouped amounts the interface itself
  // prints (balance 1.000,00; the maximum quoted as 1.000.000,00) can be pasted back in.
  assert.equal(parseBet('1.000,00'), 100000);
  assert.equal(parseBet('1.234,50'), 123450);
  assert.equal(parseBet('1.000.000,00'), 100000000);
  // Without that comma a lone dot stays ambiguous and is still refused.
  for (const text of ['', 'abc', '-25', '1e3', '1.234', 'Infinity', '9007199254740993'])
    assert.equal(parseBet(text), null);
});

test('The production random generator returns finite numbers in [0, 1)', () => {
  for (let i = 0; i < 32; i++) {
    const value = secureRandom();
    assert.ok(Number.isFinite(value) && value >= 0 && value < 1);
  }
});

test('The final crossing emits one settled state and never exposes READY at twelve', () => {
  const g = new GameState({ random: () => 0 }),
    observed = [];
  g.subscribe((s) => observed.push(s));
  g.start(2500);
  for (let n = 1; n < MAX_CROSSINGS; n++) {
    g.finishCrossing();
    g.advance();
  }
  const before = observed.length;
  g.finishCrossing();
  assert.equal(observed.length, before + 1);
  assert.equal(g.snapshot.phase, PHASES.ESCAPING);
  assert.ok(observed.every((s) => !(s.phase === PHASES.READY && s.crossing === MAX_CROSSINGS)));
  assert.equal(g.snapshot.history.length, 1);
  assert.equal(g.cashout(), false);
});
