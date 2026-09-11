/** End-of-round card: gross cashout or the lost stake, never colour alone. */
import { formatMoney, formatMultiplier } from '../../core/format.js';
import { PHASES } from '../../core/gameState.js';
import { el } from '../dom.js';

export function createResultBanner() {
  const banner = el('result-banner');
  const eyebrow = el('result-eyebrow');
  const title = el('result-title');
  const description = el('result-description');

  return {
    /** @param {import('../../core/types.js').GameSnapshot} s */
    render(s) {
      const visible = s.phase === PHASES.RESULT;
      banner.hidden = !visible;
      if (!visible) return;
      const won = s.payout > 0;
      banner.classList.toggle('lost', s.payout === 0);
      eyebrow.textContent = won ? 'TRACCE PERSE' : `CIRCONDATO ALL’INCROCIO ${s.crossing + 1}`;
      title.textContent = won ? `+${formatMoney(s.payout)} CR` : 'BECCATO!';
      description.textContent = won
        ? `${s.crossing} ${s.crossing === 1 ? 'incrocio superato' : 'incroci superati'} · ${formatMultiplier(s.multiplier)}× · Utile ${formatMoney(s.payout - s.stake)} CR`
        : `Hai perso ${formatMoney(s.stake)} CR. La città ti aspetta per la prossima fuga.`;
    },
  };
}
