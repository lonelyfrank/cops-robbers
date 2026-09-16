/**
 * Stake panel: the credits field, the ½ / 2× / MAX shortcuts and the error line.
 *
 * The component owns the field; parsing, clamping and classification stay in
 * `core/money.js`, and only the wording lives here.
 */
import { DEFAULT_BET, MIN_BET } from '../../config/gameplay.js';
import { clampBet, formatBetInput, getBetError, parseBet } from '../../core/money.js';
import { BET_ERRORS } from '../labels.js';
import { fieldsetEl, el, inputEl, queryAll } from '../dom.js';

/**
 * @param {object} options
 * @param {import('../../core/gameState.js').GameState} options.game
 * @param {(target: EventTarget, type: string, handler: (event: any) => void) => void} options.on
 * @param {() => void} options.onRequestRender Re-render after a refused stake change.
 */
export function createBetControls({ game, on, onRequestRender }) {
  const input = inputEl('bet-input');
  const fieldset = fieldsetEl('bet-fieldset');
  const error = el('bet-error');
  const shortcuts = queryAll('[data-bet]');

  /**
   * @param {boolean} [showError] Write the message into the live region.
   * @returns {number | null} Accepted minor units, or null.
   */
  function validate(showError = false) {
    const value = parseBet(input.value);
    const reason = getBetError(value, game.snapshot.balance);
    if (showError) {
      error.textContent = reason ? BET_ERRORS[reason] : '';
      input.setAttribute('aria-invalid', String(Boolean(reason)));
    }
    return reason ? null : value;
  }

  on(input, 'input', () => {
    const amount = validate(true);
    if (amount === null || !game.setBet(amount)) onRequestRender();
  });
  on(input, 'blur', () => {
    const amount = validate(true);
    if (amount !== null) input.value = formatBetInput(amount);
  });
  for (const button of shortcuts)
    on(button, 'click', () => {
      const s = game.snapshot;
      if (!game.canConfigure) return;
      const current = parseBet(input.value) ?? s.bet;
      const requested =
        button.dataset.bet === 'half'
          ? Math.floor(current / 2)
          : button.dataset.bet === 'double'
            ? current * 2
            : button.dataset.bet === 'decrease'
              ? current - MIN_BET
              : button.dataset.bet === 'increase'
                ? current + MIN_BET
                : s.balance;
      const amount = clampBet(requested, s.balance);
      input.value = formatBetInput(amount);
      validate(true);
      if (!game.setBet(amount)) onRequestRender();
    });

  return {
    validate,
    focus: () => input.focus(),
    /** Restore the opening stake when the demo is reset. */
    restoreDefault() {
      input.value = formatBetInput(DEFAULT_BET);
      error.textContent = '';
      input.setAttribute('aria-invalid', 'false');
    },
    /**
     * @param {import('../../core/types.js').GameSnapshot} _s
     * @param {import('../view.js').View} view
     */
    render(_s, { active, ready }) {
      input.classList.toggle('is-wide', input.value.length > 8);
      fieldset.disabled = active || !ready;
    },
  };
}
