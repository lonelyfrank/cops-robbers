import { getCityTheme, DEFAULT_CITY_THEME } from '../cityThemes.js';

/**
 * Deterministic per-district architecture. Cosmetic only: it never feeds the wager RNG.
 * @typedef {object} BuildingStyle
 * @property {number} x
 * @property {number} z
 * @property {number} width
 * @property {number} depth
 * @property {number} floors
 * @property {number} color
 * @property {boolean} [shop]
 * @property {boolean} [striped]
 * @property {boolean} [tank]
 * @property {boolean} [fireEscape]
 * @property {number} [awning]
 *
 * @typedef {object} DistrictStyle
 * @property {import('../../core/types.js').CityThemeId} themeId
 * @property {number} amenity
 * @property {number} treeScale
 * @property {BuildingStyle[]} buildings
 */

/**
 * Deterministic per-district generator.
 *
 * Cosmetic only: it is seeded by the district index and never touches the wager RNG.
 *
 * @param {number} index
 * @returns {() => number}
 */
export function randomFor(index) {
  let seed = (70241 + index * 98711) | 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

/**
 * @param {number} index
 * @param {import('../../core/types.js').CityThemeId} [themeId]
 * @returns {DistrictStyle}
 */
export function getDistrictStyle(index, themeId = DEFAULT_CITY_THEME) {
  const theme = getCityTheme(themeId);
  const random = randomFor(index + 503);
  const palettes = [
    [0x966b55, 0xa45f49, 0x86624e],
    [0x8a8d9c, 0x82716a, 0x6c7e94],
    [0x9a826d, 0x8a695a, 0x798c87],
  ];
  const colors = palettes[index % palettes.length],
    awning = [0xbd4d4e, 0x537f88, 0xb39651][index % 3];
  return {
    themeId: theme.id,
    amenity: index % 3,
    treeScale: (theme.neon ? 1 : 0.86) + random() * 0.2,
    buildings: [
      {
        x: -8.15,
        z: -7.55,
        width: 4.5 + random() * 0.45,
        depth: 4.45 + random() * 0.3,
        floors: 2 + (index % 3 === 2 ? 1 : 0),
        color: colors[0],
        tank: index % 4 === 0,
        fireEscape: index % 2 === 0,
      },
      {
        x: -8.1,
        z: -0.75,
        width: 4.7 + random() * 0.35,
        depth: 3.35 + random() * 0.25,
        floors: 1 + (index % 4 === 3 ? 1 : 0),
        color: colors[1],
        shop: true,
        striped: index % 2 === 1,
        awning,
      },
      {
        x: 7.65,
        z: -2.5,
        width: 5.2 + random() * 0.5,
        depth: 5.3 + random() * 0.35,
        floors: 3 + (index % 3 === 1 ? 1 : 0),
        color: colors[2],
        shop: true,
        striped: index % 2 === 0,
        awning,
        tank: index % 3 !== 1,
        fireEscape: index % 3 === 1,
      },
    ],
  };
}
