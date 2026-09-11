/**
 * Every Italian string the console shows, and the pure rules that pick one.
 *
 * Keeping the wording here means the components stay about layout and state, and the
 * message rules can be tested without a DOM.
 */
import { MIN_BET } from '../config/gameplay.js';
import { formatMoney, formatPercent } from '../core/format.js';
import { PHASES } from '../core/gameState.js';

/** Wording for each rejection reason; the classification itself is pure. */
export const BET_ERRORS = Object.freeze({
  invalid: 'Inserisci una puntata con al massimo 2 decimali.',
  'below-minimum': 'Puntata minima: 1,00 CR.',
  insufficient: 'Crediti insufficienti. Riduci la puntata o ripristina la demo.',
  'above-maximum': 'Puntata massima: 1.000.000,00 CR.',
});

/**
 * Phase headline, action button label and caption, per phase.
 * @type {Record<string, [phase: string, action: string, caption: string]>}
 */
const PHASE_LABELS = Object.freeze({
  idle: ['PRONTO A PARTIRE', 'Corri!', 'Rosso al ladro, verde al traffico.'],
  running: ['VIA LIBERA', 'Attraversamento…', 'Il prossimo incrocio ti aspetta.'],
  ready: ['SEI ANCORA IN GIOCO', 'Corri!', 'Traffico in transito. Prosegui o incassa.'],
  caught: ['FINE DELLA CORSA', 'Ti hanno beccato', 'Puntata persa. Tra poco puoi ripartire.'],
  escaping: ['FUGA RIUSCITA', 'Fuga in corso…', 'Il vicolo è la tua via d’uscita.'],
});

/**
 * @param {import('../core/types.js').GameSnapshot} s
 * @returns {[phase: string, action: string, caption: string]}
 */
export function getActionLabels(s) {
  if (s.phase === PHASES.RESULT)
    return [
      s.payout > 0 ? 'AL SICURO' : 'BECCATO',
      'Corri!',
      'Imposta la puntata per una nuova partita.',
    ];
  return PHASE_LABELS[s.phase];
}

/**
 * The live region read by assistive technology. Outcomes are always spelled out in
 * words, never left to colour alone.
 *
 * @param {import('../core/types.js').GameSnapshot} s
 * @param {import('./view.js').View} view
 * @returns {string}
 */
export function getStatusMessage(s, view) {
  if (s.phase === PHASES.IDLE)
    return 'Il ladro aspetta al rosso. Imposta la puntata e avvia la fuga quando vuoi.';
  if (s.phase === PHASES.RUNNING)
    return `Verde! Stai attraversando l’incrocio ${view.pendingCrossing}.`;
  if (view.decision)
    return `Incrocio ${s.crossing} superato. Incassa ${formatMoney(view.potential)} CR oppure continua: il prossimo verde ha probabilità ${formatPercent(view.probability)}%.`;
  if (s.phase === PHASES.CAUGHT)
    return `Rosso all’incrocio ${view.pendingCrossing}. La polizia ha fermato la fuga.`;
  if (s.phase === PHASES.ESCAPING)
    return `${formatMoney(s.payout)} CR accreditati. Il ladro svolta nel vicolo.`;
  return s.payout
    ? `Fuga riuscita: incassati ${formatMoney(s.payout)} CR. Puoi iniziare una nuova partita.`
    : `Puntata persa. ${s.balance < MIN_BET ? 'Ripristina 1.000 CR per continuare la demo.' : 'Puoi iniziare una nuova partita.'}`;
}
