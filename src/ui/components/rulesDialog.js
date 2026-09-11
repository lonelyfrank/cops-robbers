/**
 * "Probabilità e regole": the whole curve for the selected difficulty.
 *
 * The table is rebuilt when the dialog opens, so it always matches the difficulty in
 * force at that moment. A click outside the box closes it, like the native backdrop.
 */
import { DIFFICULTIES, buildRiskTable } from '../../gameMath.js';
import { formatPercent } from '../../format.js';
import { buttonEl, dialogEl, el } from '../dom.js';

/**
 * @param {object} options
 * @param {import('../../gameState.js').GameState} options.game
 * @param {(target: EventTarget, type: string, handler: (event: any) => void) => void} options.on
 */
export function createRulesDialog({ game, on }) {
  const dialog = dialogEl('rules-dialog');
  const caption = el('risk-caption');
  const body = el('risk-table-body');

  function open() {
    const s = game.snapshot;
    caption.textContent = `Probabilità · ${DIFFICULTIES[s.difficulty].label}`;
    body.replaceChildren(
      ...buildRiskTable(s.difficulty).map((row) => {
        const tr = document.createElement('tr');
        for (const value of [
          String(row.n).padStart(2, '0'),
          `${formatPercent(row.greenProbability)}%`,
          `${(row.cumulativeProbability * 100).toLocaleString('it-IT', { maximumFractionDigits: 3 })}%`,
          `${row.totalMultiplier.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}×`,
        ]) {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        }
        return tr;
      }),
    );
    dialog.showModal();
  }

  on(buttonEl('help-button'), 'click', open);
  on(buttonEl('rules-button'), 'click', open);
  on(buttonEl('close-rules'), 'click', () => dialog.close());
  on(dialog, 'click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  });

  return { open, dispose: () => dialog.close() };
}
