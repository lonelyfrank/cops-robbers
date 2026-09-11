import { freezeTheme, warmMaterials } from './shared.js';

/**
 * Dark glass facades, amber windows, cyan outlines and magenta signs built into the
 * buildings, with ramen shops, vending machines and roof gardens.
 *
 * The neon stays on the signs and the outlines: diffuse light and matte asphalt keep the
 * street free of artificial cyan and magenta patches. `colors` remaps the voxel palette,
 * `materials` overrides the named ones.
 */
export const neonTokyo = freezeTheme({
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
});
