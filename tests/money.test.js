import test from 'node:test';
import assert from 'node:assert/strict';
import { clampBet, formatBetInput, getBetError, parseBet } from '../src/core/money.js';
import { MAX_BET, MIN_BET } from '../src/config/gameplay.js';

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

test('The stake field round-trips through its own formatter without grouping', () => {
  for (const minor of [MIN_BET, 2500, 123450, 100000, MAX_BET]) {
    const text = formatBetInput(minor);
    assert.ok(!text.includes('.'), `${text} must not carry a thousands separator`);
    assert.equal(parseBet(text), minor);
  }
  assert.equal(formatBetInput(2500), '25,00');
  assert.equal(formatBetInput(123450), '1234,50');
});

test('Clamping keeps a requested stake inside the limits and the balance', () => {
  assert.equal(clampBet(0, 100000), MIN_BET);
  assert.equal(clampBet(-500, 100000), MIN_BET);
  assert.equal(clampBet(250000, 100000), 100000);
  assert.equal(clampBet(2500, 100000), 2500);
  assert.equal(clampBet(MAX_BET * 2, MAX_BET * 2), MAX_BET);
  // An empty balance still reports the floor rather than a negative stake.
  assert.equal(clampBet(2500, 0), 0);
});

test('Stake classification separates the reason from its wording', () => {
  assert.equal(getBetError(2500, 100000), null);
  assert.equal(getBetError(null, 100000), 'invalid');
  assert.equal(getBetError(MIN_BET - 1, 100000), 'below-minimum');
  assert.equal(getBetError(100001, 100000), 'insufficient');
  assert.equal(getBetError(MAX_BET + 1, MAX_BET * 2), 'above-maximum');
  // The balance is checked before the ceiling: the player sees the actionable message.
  assert.equal(getBetError(MAX_BET + 1, 100000), 'insufficient');
});
