/**
 * Pieces every city theme starts from.
 *
 * A theme is data: colours, material descriptions and a few light powers. Nothing here
 * touches gameplay, and a theme never samples the wager generator.
 */

/**
 * Freeze a theme and its nested tables, so a district cannot mutate the palette it draws
 * from. `colors` remaps voxel palette entries; `materials` describes named materials.
 *
 * @param {any} theme
 */
export const freezeTheme = (theme) =>
  Object.freeze({
    ...theme,
    colors: Object.freeze(theme.colors),
    materials: Object.freeze(
      Object.fromEntries(
        Object.entries(theme.materials).map(([key, value]) => [key, Object.freeze(value)]),
      ),
    ),
  });

/** Warm interiors shared by every theme, before its own overrides. */
export const warmMaterials = {
  window: { color: 0xe4a64f, emissive: 0xff9a26, power: 1.9 },
  lantern: { color: 0xffedb0, emissive: 0xffb239, power: 3.6 },
  sign: { color: 0x95cdd1, emissive: 0x458caa, power: 1.3 },
};
