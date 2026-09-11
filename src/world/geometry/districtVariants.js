import { getCityTheme, DEFAULT_CITY_THEME } from '../themes/index.js';
import { createDistrictRandom } from '../seededRandom.js';

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
 * @param {number} index
 * @param {import('../../core/types.js').CityThemeId} [themeId]
 * @returns {DistrictStyle}
 */
export function getDistrictStyle(index, themeId = DEFAULT_CITY_THEME) {
  const theme = getCityTheme(themeId);
  // A stream of its own, so changing the foundation cannot reshuffle the architecture.
  const random = createDistrictRandom(index, 503);
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
