/**
 * Blue police flash at the edges of the stage.
 *
 * The renderer computes the intensity and hands it over as a plain number; the document
 * element is touched only here, so the rendering layer stays free of DOM lookups.
 */
import { el } from '../dom.js';

export function createCaptureOverlay() {
  const flash = el('police-flash');
  let painted = '';

  /** @param {string} opacity */
  function apply(opacity) {
    if (!flash || opacity === painted) return;
    painted = opacity;
    flash.style.opacity = opacity;
  }

  return {
    /** @param {import('../../core/types.js').CaptureState} state */
    render: (state) => apply(String(state.captureIntensity)),
    clear: () => apply('0'),
  };
}
