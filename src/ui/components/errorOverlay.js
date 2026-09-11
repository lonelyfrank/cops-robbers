/**
 * Fatal WebGL message. Shown when the context cannot start or is lost; the only way
 * out is a reload, so the demo never continues on a dead renderer.
 */
import { buttonEl, el } from '../dom.js';

/**
 * @param {object} options
 * @param {(target: EventTarget, type: string, handler: (event: any) => void) => void} options.on
 */
export function createErrorOverlay({ on }) {
  const overlay = el('webgl-error');
  const text = el('webgl-error-text');
  on(buttonEl('reload-button'), 'click', () => location.reload());

  return {
    /** @param {string} message */
    show(message) {
      text.textContent = message;
      overlay.hidden = false;
    },
  };
}
