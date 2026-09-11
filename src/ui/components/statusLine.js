/** The polite live region under the controls. Only written when the text changes. */
import { el } from '../dom.js';
import { getStatusMessage } from '../labels.js';

export function createStatusLine() {
  const text = el('status-text');
  let last = '';

  return {
    /**
     * @param {import('../../core/types.js').GameSnapshot} s
     * @param {import('../view.js').View} view
     */
    render(s, view) {
      const message = getStatusMessage(s, view);
      if (message === last) return;
      last = message;
      text.textContent = message;
    },
  };
}
