/**
 * @typedef {import('./core/types.js').CityThemeId} CityThemeId
 * @typedef {(typeof CITY_THEMES)[CityThemeId]} CityTheme
 */

/** @param {any} theme */
const freezeTheme = (theme) =>
  Object.freeze({
    ...theme,
    colors: Object.freeze(theme.colors),
    materials: Object.freeze(
      Object.fromEntries(
        Object.entries(theme.materials).map(([key, value]) => [key, Object.freeze(value)]),
      ),
    ),
  });
const warmMaterials = {
  window: { color: 0xe4a64f, emissive: 0xff9a26, power: 1.9 },
  lantern: { color: 0xffedb0, emissive: 0xffb239, power: 3.6 },
  sign: { color: 0x95cdd1, emissive: 0x458caa, power: 1.3 },
};
export const CITY_THEMES = Object.freeze({
  district87: freezeTheme({
    id: 'district87',
    name: 'Distretto 87',
    neon: false,
    keyColor: 0xffd5a5,
    keyPower: 1950,
    warmColor: 0xffb458,
    accentColor: 0xffb458,
    haloColor: 0xffb14d,
    colors: {},
    materials: warmMaterials,
  }),
  neonTokyo: freezeTheme({
    id: 'neonTokyo',
    name: 'Neon Tokyo',
    neon: true,
    keyColor: 0xbcd9ff,
    keyPower: 1650,
    warmColor: 0xb4d4ed,
    accentColor: 0xffca91,
    fillPower: 12,
    fillHeight: 5,
    haloColor: 0x8aeaff,
    colors: {
      [0x674536]: 0x333047,
      [0xada69c]: 0x8b96ad,
      [0xc4b9a8]: 0xb0bad0,
      [0xb6afa5]: 0x91a0b9,
      [0xd5c9b4]: 0xb4c8dd,
      [0x8b877d]: 0x506279,
      [0x9a9689]: 0x52637c,
      [0x1d6750]: 0x126745,
      [0x2b8253]: 0x29965a,
    },
    materials: {
      ...warmMaterials,
      window: { color: 0xdba968, emissive: 0xffa447, power: 0.65 },
      windowDim: { color: 0x867b68, emissive: 0xe59b55, power: 0.18 },
      paperLantern: { color: 0xf2bb81, emissive: 0xff9140, power: 0.85 },
      lantern: { color: 0xc3e6ed, emissive: 0x83d9ec, power: 1.8 },
      sign: { color: 0x4ddfff, emissive: 0x09c5ff, power: 2.5 },
      neonCyan: { color: 0x62cfe6, emissive: 0x06bfe8, power: 2 },
      neonPink: { color: 0xe263c0, emissive: 0xe51ca9, power: 1.8 },
      neonWhite: { color: 0xf4e6da, emissive: 0xffd5b0, power: 1.3 },
      glass: { color: 0x29485c, roughness: 0.48, metalness: 0.15 },
      [0x18233c]: { color: 0x111d31, roughness: 0.72, metalness: 0.08 },
      [0x19253d]: { color: 0x111d31, roughness: 0.72, metalness: 0.08 },
    },
  }),
});
/** Theme keys as a typed list: `Object.keys()` alone widens them to `string`. */
export const CITY_THEME_IDS = /** @type {CityThemeId[]} */ (Object.keys(CITY_THEMES));
/** @type {CityThemeId} */
export const DEFAULT_CITY_THEME = 'district87';
/** @type {readonly CityThemeId[]} */
const rotation = Object.freeze(['district87', 'neonTokyo']);
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
  return getCityTheme(rotation[round % rotation.length]);
}
