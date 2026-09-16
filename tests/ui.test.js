import test from 'node:test';
import assert from 'node:assert/strict';
import { mountDom, click, type, submit } from './helpers/domHarness.js';
import { GameState, PHASES } from '../src/core/gameState.js';
import { createUI } from '../src/ui/createUI.js';
import { MAX_CROSSINGS } from '../src/config/gameplay.js';
import { getMultiplier } from '../src/core/gameMath.js';

/**
 * Mount the console over the real index.html markup.
 *
 * Teardown is registered with the runner: the clock interval would otherwise keep the
 * process alive if an assertion failed before the explicit dispose.
 *
 * @param {import('node:test').TestContext} t
 * @param {{ random?: () => number, ready?: boolean }} [options]
 */
function mountConsole(t, { random = () => 0, ready = true } = {}) {
  const dom = mountDom();
  const game = new GameState({ random });
  const calls = [];
  const ui = createUI(
    game,
    {
      start: (amount) => {
        calls.push(['start', amount]);
        game.start(amount);
      },
      advance: () => {
        calls.push(['advance']);
        game.advance();
      },
      cashout: () => {
        calls.push(['cashout']);
        game.cashout();
      },
      reset: () => {
        calls.push(['reset']);
        game.resetDemo();
      },
    },
    { motion: dom.motion },
  );
  t.after(() => {
    ui.dispose();
    dom.cleanup();
  });
  if (ready) ui.setReady(true);
  const id = (name) => dom.document.getElementById(name);
  return { ...dom, game, ui, calls, id };
}

test('The console paints the opening state and only enables play once ready', (t) => {
  const { ui, id } = mountConsole(t, { ready: false });

  assert.equal(id('balance').textContent, '1.000,00');
  assert.equal(id('route-bet-value').textContent, '25,00 CR');
  assert.equal(id('crossing-count').textContent, `00 / ${MAX_CROSSINGS}`);
  assert.equal(id('route').children.length, MAX_CROSSINGS);
  assert.equal(id('history').children.length, 1, 'the empty history shows its hint');
  // Nothing is playable until the scene has rendered once.
  assert.equal(id('main-button').disabled, true);
  assert.equal(id('cashout-button').disabled, true);

  ui.setReady(true);
  assert.equal(id('main-button').disabled, false);
  assert.equal(id('cashout-button').disabled, true, 'cashing out needs a cleared junction');
  assert.equal(id('gate-probability').textContent, 'VERDE 95%');
});

test('The stake field validates Italian amounts and reports the actionable reason', (t) => {
  const c = mountConsole(t);
  const input = c.id('bet-input');

  // Grouped Italian input, within the 1.000,00 CR opening balance.
  type(input, '123,45');
  assert.equal(c.game.snapshot.bet, 12345);
  assert.equal(c.id('bet-error').textContent, '');
  assert.equal(input.getAttribute('aria-invalid'), 'false');

  type(input, 'abc');
  assert.match(c.id('bet-error').textContent, /2 decimali/);
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(c.id('main-button').disabled, true, 'an invalid stake blocks the run');

  type(input, '0,50');
  assert.match(c.id('bet-error').textContent, /minima/);

  type(input, '99.999.999,00');
  assert.match(c.id('bet-error').textContent, /insufficienti/);

  type(input, '25,00');
  assert.equal(c.id('bet-error').textContent, '');
  assert.equal(c.id('main-button').disabled, false);
});

test('The stake shortcuts halve, double and max out inside the balance', (t) => {
  const c = mountConsole(t);
  const input = c.id('bet-input');
  const shortcut = (name) => c.document.querySelector(`[data-bet="${name}"]`);

  click(shortcut('half'));
  assert.equal(input.value, '12,50');
  click(shortcut('double'));
  assert.equal(input.value, '25,00');
  click(shortcut('max'));
  assert.equal(input.value, '1000,00');
  assert.equal(c.game.snapshot.bet, 100000);
});

test('Stake step buttons share validation and clamp to the stake and balance limits', (t) => {
  const c = mountConsole(t);
  const step = (name) => click(c.document.querySelector(`[data-bet="${name}"]`));
  step('increase');
  assert.equal(c.game.snapshot.bet, 2600);
  step('decrease');
  assert.equal(c.game.snapshot.bet, 2500);
  type(c.id('bet-input'), '1,00');
  step('decrease');
  assert.equal(c.game.snapshot.bet, 100);
  step('max');
  step('increase');
  assert.equal(c.game.snapshot.bet, 100000);
  submit(c.id('game-controls'));
  step('decrease');
  assert.equal(c.game.snapshot.stake, 100000);
});

test('Decision panel shows real earnings, risk and progression through settlement and reset', (t) => {
  const c = mountConsole(t);
  assert.equal(c.id('potential').textContent, '0,00');
  click(c.document.querySelector('[data-difficulty="hard"]'));
  submit(c.id('game-controls'));
  c.game.finishCrossing();
  assert.equal(c.id('potential').textContent, '25,26');
  assert.equal(c.id('payout-multiplier').textContent, '1,01×');
  assert.equal(c.id('route').children[0].getAttribute('aria-current'), 'step');
  for (let i = 1; i < 7; i++) {
    c.game.advance();
    c.game.finishCrossing();
    if (i === 3) assert.equal(c.id('gate-meter').closest('.gate-display').dataset.risk, 'medium');
  }
  assert.equal(c.id('gate-meter').closest('.gate-display').dataset.risk, 'high');
  const earned = c.id('potential').textContent;
  click(c.id('cashout-button'));
  c.game.finishEscape();
  assert.equal(c.id('potential').textContent, earned);
  click(c.id('reset-button'));
  assert.equal(c.id('potential').textContent, '0,00');
  assert.equal(c.id('payout-multiplier').textContent, '1,00×');
  assert.equal(c.id('gate-meter').closest('.gate-display').dataset.risk, 'low');
});

test('Selecting an alert level updates the pressed state, the caption and the curve', (t) => {
  const c = mountConsole(t);
  const hard = c.document.querySelector('[data-difficulty="hard"]');

  click(hard);
  assert.equal(c.game.snapshot.difficulty, 'hard');
  assert.equal(hard.getAttribute('aria-pressed'), 'true');
  assert.equal(
    c.document.querySelector('[data-difficulty="medium"]').getAttribute('aria-pressed'),
    'false',
  );
  assert.match(c.id('difficulty-hint').textContent, /DIFFICILE/);
  assert.equal(c.id('difficulty-fieldset').dataset.level, 'hard');
  // The CAM strip shows the multipliers of the selected curve.
  const first = c.id('route').children[0].querySelector('.step-multi').textContent;
  assert.equal(
    first,
    `${getMultiplier(1, 'hard').toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`,
  );
});

test('A green run locks configuration, then offers the cashout with its amount', (t) => {
  const c = mountConsole(t, { random: () => 0 });

  submit(c.id('game-controls'));
  assert.deepEqual(c.calls[0], ['start', 2500]);
  assert.equal(c.game.snapshot.phase, PHASES.RUNNING);
  assert.equal(c.id('bet-fieldset').disabled, true);
  assert.equal(c.id('difficulty-fieldset').disabled, true);
  assert.equal(c.id('reset-button').disabled, true);
  assert.equal(c.id('main-button').disabled, true, 'no input while the crossing resolves');
  assert.equal(c.id('main-button-label').textContent, 'Attraversamento…');

  c.game.finishCrossing();
  assert.equal(c.game.snapshot.phase, PHASES.READY);
  assert.equal(c.id('cashout-button').disabled, false);
  assert.match(c.id('cashout-amount').textContent, /CR$/);
  assert.equal(c.id('payout-preview').hidden, false);
  assert.equal(c.id('potential-label').textContent, 'Puoi incassare');
  assert.equal(c.id('crossing-count').textContent, `01 / ${MAX_CROSSINGS}`);
  assert.equal(c.id('route').children[0].classList.contains('is-current'), true);

  // Corri! on a decision advances instead of starting a second round.
  submit(c.id('game-controls'));
  assert.deepEqual(c.calls[1], ['advance']);
  assert.equal(c.calls.filter(([name]) => name === 'start').length, 1);
});

test('Cashing out shows the credited amount; an arrest names the junction', (t) => {
  const won = mountConsole(t, { random: () => 0 });
  submit(won.id('game-controls'));
  won.game.finishCrossing();
  click(won.id('cashout-button'));
  assert.equal(won.game.snapshot.phase, PHASES.ESCAPING);
  won.game.finishEscape();
  assert.equal(won.id('result-banner').hidden, false);
  assert.equal(won.id('result-banner').classList.contains('lost'), false);
  assert.match(won.id('result-title').textContent, /^\+/);
  assert.match(won.id('result-description').textContent, /Utile/);
  assert.equal(won.id('history').children.length, 1);
  assert.match(won.id('history').children[0].textContent, /Al sicuro/);
  const lost = mountConsole(t, { random: () => 0.999 });
  submit(lost.id('game-controls'));
  assert.equal(lost.game.snapshot.phase, PHASES.CAUGHT);
  assert.equal(lost.id('main-button-label').textContent, 'Ti hanno beccato');
  lost.game.finishCaught();
  assert.equal(lost.id('result-title').textContent, 'BECCATO!');
  assert.equal(lost.id('result-banner').classList.contains('lost'), true);
  assert.match(lost.id('result-eyebrow').textContent, /INCROCIO 1/);
  assert.equal(lost.id('route').children[0].classList.contains('is-caught'), true);
  assert.match(lost.id('history').children[0].textContent, /Beccato/);
});

test('The rules dialog opens with the full curve of the selected difficulty', (t) => {
  const c = mountConsole(t);
  click(c.document.querySelector('[data-difficulty="easy"]'));
  click(c.id('rules-button'));

  assert.equal(c.id('rules-dialog').open, true);
  assert.equal(c.id('risk-table-body').children.length, MAX_CROSSINGS);
  assert.match(c.id('risk-caption').textContent, /Facile/);
  click(c.id('close-rules'));
  assert.equal(c.id('rules-dialog').open, false);
});

test('Resetting the demo restores the opening stake and a fatal error locks the controls', (t) => {
  const c = mountConsole(t);
  type(c.id('bet-input'), '500,00');
  click(c.id('reset-button'));
  assert.equal(c.id('bet-input').value, '25,00');
  assert.equal(c.game.snapshot.balance, 100000);

  c.ui.showError('Contesto perso.');
  assert.equal(c.id('webgl-error').hidden, false);
  assert.equal(c.id('webgl-error-text').textContent, 'Contesto perso.');
  assert.equal(c.id('main-button').disabled, true);
});

test('The portable menu opens the existing rules and is released with the UI', (t) => {
  const c = mountConsole(t);
  click(c.id('menu-button'));
  assert.equal(c.id('console-menu').open, true);
  click(c.id('menu-rules'));
  assert.equal(c.id('console-menu').open, false);
  assert.equal(c.id('rules-dialog').open, true);
  assert.equal(c.id('risk-table-body').children.length, MAX_CROSSINGS);
  click(c.id('close-rules'));
  click(c.id('menu-button'));
  c.ui.dispose();
  assert.equal(c.id('console-menu').open, false);
  click(c.id('menu-button'));
  assert.equal(c.id('console-menu').open, false);
});

test('Disposing detaches every listener, so a remount cannot double-handle a click', (t) => {
  const c = mountConsole(t);
  c.ui.dispose();

  submit(c.id('game-controls'));
  click(c.id('cashout-button'));
  click(c.id('reset-button'));
  type(c.id('bet-input'), '100,00');
  assert.deepEqual(c.calls, []);
  assert.equal(c.game.snapshot.phase, PHASES.IDLE);
});
