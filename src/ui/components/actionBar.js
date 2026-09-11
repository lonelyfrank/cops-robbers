/**
 * Corri! and Incassa, with the phase headline and the caption under them.
 *
 * Incassa always stays on screen and is only disabled, so the controls do not shift
 * between phases.
 */
import { formatMoney } from '../../format.js';
import { buttonEl, el } from '../dom.js';
import { getActionLabels } from '../labels.js';

export function createActionBar() {
  const mainButton = buttonEl('main-button');
  const mainLabel = el('main-button-label');
  const cashoutButton = buttonEl('cashout-button');
  const cashoutAmount = el('cashout-amount');
  const phaseLabel = el('phase-label');
  const caption = el('action-caption');

  return {
    cashoutButton,
    /**
     * @param {import('../../core/types.js').GameSnapshot} s
     * @param {import('../view.js').View} view
     */
    render(s, { configure, decision, potential, ready, betValid }) {
      cashoutButton.disabled = !decision || !ready;
      cashoutAmount.textContent = decision ? `${formatMoney(potential)} CR` : '';
      mainButton.disabled = !ready || !(configure || decision) || (configure && !betValid);
      const [phase, action, text] = getActionLabels(s);
      phaseLabel.textContent = phase;
      mainLabel.textContent = action;
      caption.textContent = text;
    },
  };
}
