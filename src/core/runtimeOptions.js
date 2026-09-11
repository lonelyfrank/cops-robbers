/**
 * Options the page can be opened with.
 *
 * Pure: it parses a query string and nothing else. Quality is an explicit request, never
 * a guess from the user agent; the debug panel is off unless asked for.
 */
import { DEFAULT_QUALITY, QUALITY_PRESETS } from '../config/rendering.js';

/**
 * @param {string} [search] A `location.search` value.
 * @returns {{ quality: import('./types.js').RenderingQuality, debug: boolean }}
 */
export function parseRuntimeOptions(search = '') {
  const params = new URLSearchParams(search);
  const requested = params.get('quality');
  const debug = params.get('debug');
  return {
    quality:
      requested && Object.hasOwn(QUALITY_PRESETS, requested)
        ? /** @type {import('./types.js').RenderingQuality} */ (requested)
        : DEFAULT_QUALITY,
    debug: debug === '1' || debug === 'true',
  };
}
