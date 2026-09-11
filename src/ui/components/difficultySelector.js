/** Alert level panel: the three traffic-light buttons and their protocol caption. */
import { DIFFICULTIES } from '../../gameMath.js';
import { el, fieldsetEl, queryAll } from '../dom.js';

/**
 * @param {object} options
 * @param {import('../../gameState.js').GameState} options.game
 * @param {(target: EventTarget, type: string, handler: (event: any) => void) => void} options.on
 */
export function createDifficultySelector({ game, on }) {
  const fieldset = fieldsetEl('difficulty-fieldset');
  const hint = el('difficulty-hint');
  const buttons = queryAll('[data-difficulty]');

  for (const button of buttons)
    on(button, 'click', () =>
      game.setDifficulty(
        /** @type {import('../../core/types.js').DifficultyId} */ (button.dataset.difficulty),
      ),
    );

  return {
    /**
     * @param {import('../../core/types.js').GameSnapshot} s
     * @param {import('../view.js').View} view
     */
    render(s, { active, ready }) {
      fieldset.disabled = active || !ready;
      for (const button of buttons)
        button.setAttribute('aria-pressed', String(button.dataset.difficulty === s.difficulty));
      hint.textContent = `PROTOCOLLO ${DIFFICULTIES[s.difficulty].label.toLocaleUpperCase('it-IT')}`;
      hint.title = DIFFICULTIES[s.difficulty].description;
      fieldset.dataset.level = s.difficulty;
    },
  };
}
