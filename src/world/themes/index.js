import { district87 } from './district87.js';
import { neonTokyo } from './neonTokyo.js';

/**
 * The theme registry and the per-round rotation.
 *
 * Themes are data-driven: adding one means adding a module and listing it here. The
 * rotation is purely scenographic — it never samples the wager generator — and a round
 * keeps its theme through all twelve junctions, the cashout and the arrest.
 *
 * @typedef {import('../../core/types.js').CityThemeId} CityThemeId
 * @typedef {(typeof CITY_THEMES)[CityThemeId]} CityTheme
 */
export const CITY_THEMES = Object.freeze({ district87, neonTokyo });

/** Theme keys as a typed list: `Object.keys()` alone widens them to `string`. */
export const CITY_THEME_IDS = /** @type {CityThemeId[]} */ (Object.keys(CITY_THEMES));

/** @type {CityThemeId} */
export const DEFAULT_CITY_THEME = 'district87';

/** Order of the cosmetic rotation. A new theme joins by being listed here. */
const ROTATION = /** @type {readonly CityThemeId[]} */ (Object.freeze(['district87', 'neonTokyo']));

/**
 * @param {CityThemeId} [id]
 * @returns {CityTheme}
 */
export function getCityTheme(id = DEFAULT_CITY_THEME) {
  if (!Object.hasOwn(CITY_THEMES, id)) throw new RangeError('Tema della città non valido.');
  return CITY_THEMES[id];
}

/**
 * Cosmetic rotation only: never consumes the wager RNG. A round keeps its theme to the end.
 * @param {number} round
 * @returns {CityTheme}
 */
export function getRoundTheme(round) {
  if (!Number.isSafeInteger(round) || round < 0)
    throw new RangeError('Numero di corsa non valido.');
  return getCityTheme(ROTATION[round % ROTATION.length]);
}
