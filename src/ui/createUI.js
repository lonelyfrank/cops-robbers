/**
 * Composition root of the console.
 *
 * It owns nothing on screen: it wires the game actions, derives the view once per
 * update and hands the same snapshot to every component. Each component owns its own
 * elements, its own listeners and its own memoisation.
 */
import { PHASES } from '../core/gameState.js';
import { createListenerScope, buttonEl, formEl, query } from './dom.js';
import { INITIAL_MARKS, deriveView, getBoardState, marksOf } from './view.js';
import { createActionBar } from './components/actionBar.js';
import { createBetControls } from './components/betControls.js';
import { createDifficultySelector } from './components/difficultySelector.js';
import { createErrorOverlay } from './components/errorOverlay.js';
import { createGateMeter } from './components/gateMeter.js';
import { createHistoryList } from './components/historyList.js';
import { createResultBanner } from './components/resultBanner.js';
import { createRouteDisplay } from './components/routeDisplay.js';
import { createRulesDialog } from './components/rulesDialog.js';
import { createStatusLine } from './components/statusLine.js';
import { createSurveillanceHud } from './components/surveillanceHud.js';

/**
 * @param {import('../core/gameState.js').GameState} game
 * @param {{ start: (amount: number) => void, advance: () => void, cashout: () => void, reset: () => void }} actions
 * @param {{ motion?: import('../core/types.js').MotionPreference }} [options]
 */
export function createUI(game, actions, { motion = { reduced: false } } = {}) {
  const board = query('.game-board');
  const form = formEl('game-controls');
  const resetButton = buttonEl('reset-button');
  const { on, abort } = createListenerScope();

  let ready = false;
  let marks = INITIAL_MARKS;

  const render = () => paint(game.snapshot);

  const hud = createSurveillanceHud({ motion });
  const bet = createBetControls({ game, on, onRequestRender: render });
  const difficulty = createDifficultySelector({ game, on });
  const gate = createGateMeter();
  const actionBar = createActionBar();
  const route = createRouteDisplay({ motion });
  const result = createResultBanner();
  const status = createStatusLine();
  const history = createHistoryList();
  const rules = createRulesDialog({ game, on });
  const errorOverlay = createErrorOverlay({ on });

  on(form, 'submit', (event) => {
    event.preventDefault();
    if (!ready) return;
    if (game.snapshot.phase === PHASES.READY) {
      actions.advance();
      return;
    }
    if (!game.canConfigure) return;
    const amount = bet.validate(true);
    if (amount === null) {
      bet.focus();
      return;
    }
    actions.start(amount);
  });
  on(actionBar.cashoutButton, 'click', () => {
    if (ready) actions.cashout();
  });
  on(resetButton, 'click', () => {
    if (!game.canConfigure) return;
    bet.restoreDefault();
    actions.reset();
  });

  /** @param {import('../core/types.js').GameSnapshot} s */
  function paint(s) {
    const view = deriveView(s, marks, { ready, betValid: bet.validate() !== null });
    board.dataset.state = getBoardState(s);
    hud.render(s, view);
    bet.render(s, view);
    difficulty.render(s, view);
    gate.render(s, view);
    actionBar.render(s, view);
    result.render(s);
    route.render(s, view);
    status.render(s, view);
    history.render(s);
    resetButton.disabled = view.active || !ready;
    marks = marksOf(s);
  }

  const unsubscribe = game.subscribe(paint);

  return {
    /** @param {boolean} value The scene is ready and the controls can be used. */
    setReady(value) {
      ready = value;
      render();
    },
    /** @param {string} message */
    showError(message) {
      ready = false;
      render();
      errorOverlay.show(message);
    },
    dispose() {
      hud.dispose();
      rules.dispose();
      abort();
      unsubscribe();
    },
  };
}
