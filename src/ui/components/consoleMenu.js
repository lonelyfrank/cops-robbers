import { buttonEl, dialogEl, query } from '../dom.js';

/**
 * Compact navigation for the portable console. Game actions stay in the main form.
 * @param {object} options
 * @param {(target: EventTarget, type: string, handler: (event: any) => void) => void} options.on
 * @param {() => void} options.openRules
 * @param {import('../../core/types.js').MotionPreference} options.motion
 */
export function createConsoleMenu({ on, openRules, motion }) {
  const dialog = dialogEl('console-menu');
  on(buttonEl('menu-button'), 'click', () => dialog.showModal());
  on(buttonEl('close-menu'), 'click', () => dialog.close());
  on(buttonEl('menu-rules'), 'click', () => {
    dialog.close();
    openRules();
  });
  on(buttonEl('menu-history'), 'click', () => {
    dialog.close();
    const history = /** @type {HTMLDetailsElement} */ (query('.history-section'));
    history.open = true;
    query('.history-section summary').focus({ preventScroll: true });
    history.scrollIntoView({ behavior: motion.reduced ? 'instant' : 'smooth', block: 'start' });
  });
  return { dispose: () => dialog.close() };
}
