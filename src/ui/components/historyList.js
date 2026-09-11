/**
 * The last rounds. Positive amounts are the gross cashout, including the stake; the
 * net profit is in the tooltip and in the end-of-round card.
 */
import { DIFFICULTIES } from '../../gameMath.js';
import { formatMoney, formatMultiplier } from '../../format.js';
import { el } from '../dom.js';

export function createHistoryList() {
  const list = el('history');
  /** @type {string | null} Null means "never rendered", so the empty state paints once. */
  let key = null;

  /** @param {import('../../core/types.js').GameHistoryEntry} round */
  function card(round) {
    const item = document.createElement('li');
    item.className = `history-card ${round.outcome}`;
    const won = round.outcome === 'won';
    const outcome = document.createElement('span');
    outcome.className = 'history-outcome';
    outcome.textContent = won ? 'Al sicuro' : 'Beccato';
    const multi = document.createElement('strong');
    multi.className = 'history-multi';
    multi.textContent = `${formatMultiplier(round.multiplier)}×`;
    const detail = document.createElement('span');
    detail.className = 'history-detail';
    detail.textContent = `${DIFFICULTIES[round.difficulty].label} · ${round.crossing} superati`;
    const amount = document.createElement('span');
    amount.className = 'history-amount';
    amount.textContent = `${won ? '+' : '−'}${formatMoney(won ? round.payout : round.stake)} CR`;
    item.title = won
      ? `Puntata ${formatMoney(round.stake)} CR; incasso ${formatMoney(round.payout)} CR; utile ${formatMoney(round.payout - round.stake)} CR.`
      : `Puntata ${formatMoney(round.stake)} CR persa all’incrocio ${round.attemptedCrossing}. Moltiplicatore raggiunto: ${formatMultiplier(round.multiplier)}×.`;
    item.append(outcome, multi, detail, amount);
    return item;
  }

  function empty() {
    const item = document.createElement('li');
    item.className = 'history-empty';
    const hint = document.createElement('span');
    hint.textContent = 'Attraversa il primo incrocio per metterti alla prova.';
    item.append('Le tue fughe iniziano qui.', hint);
    return item;
  }

  return {
    /** @param {import('../../core/types.js').GameSnapshot} s */
    render(s) {
      const nextKey = s.history.map((r) => `${r.id}:${r.outcome}`).join(',');
      if (nextKey === key) return;
      key = nextKey;
      list.replaceChildren(...(s.history.length ? s.history.map(card) : [empty()]));
    },
  };
}
