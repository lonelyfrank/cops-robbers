import { freezeTheme, warmMaterials } from './shared.js';

/**
 * The original city: brick blocks, warm windows, amber street lamps.
 *
 * It uses the voxel palette as authored, so `colors` is empty: nothing is remapped.
 */
export const district87 = freezeTheme({
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
});
