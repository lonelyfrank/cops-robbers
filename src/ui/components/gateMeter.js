/**
 * Probability of the next green, on a segmented meter, plus the theoretical RTP badge.
 *
 * In idle and result the meter previews the first junction of the coming run, so a
 * finished round never leaves the previous probability on screen.
 */
import { MAX_CROSSINGS, RTP_TARGET } from '../../config/gameplay.js';
import { getGreenProbability } from '../../core/gameMath.js';
import { formatPercent } from '../../core/format.js';
import { PHASES } from '../../core/gameState.js';
import { el } from '../dom.js';

export function createGateMeter() {
  const label = el('gate-label');
  const probability = el('gate-probability');
  const meter = el('gate-meter');
  const display = meter.closest('.gate-display');
  const rtp = el('rtp-label');
  rtp.textContent = `${Math.round(RTP_TARGET * 100)}%`;

  return {
    /**
     * @param {import('../../core/types.js').GameSnapshot} s
     * @param {import('../view.js').View} view
     */
    render(s, { configure }) {
      const complete = s.crossing === MAX_CROSSINGS && !configure;
      const chance = complete
        ? 0
        : getGreenProbability(
            configure ? 1 : Math.min(s.crossing + 1, MAX_CROSSINGS),
            s.difficulty,
          );
      label.textContent = complete
        ? 'SEQUENZA COMPLETATA'
        : configure && s.phase === PHASES.RESULT
          ? 'NUOVA FUGA'
          : 'PROSSIMO VARCO';
      probability.textContent = complete ? '✓' : `VERDE ${formatPercent(chance)}%`;
      meter.style.setProperty('--gate-fill', `${chance * 100}%`);
      meter.setAttribute('aria-valuenow', (chance * 100).toFixed(1));
      meter.hidden = complete;
      display.setAttribute('data-risk', chance >= 0.75 ? 'low' : chance >= 0.5 ? 'medium' : 'high');
    },
  };
}
