import * as THREE from 'three';
import { getCrossingX } from './mapLayout.js';
import { isInstancedMesh } from '../rendering/voxelModels.js';
import { buildDistrictGeometry, SIGNAL_COLORS } from './geometry/index.js';
import {
  createCityLighting,
  applyCityLighting,
  getCityLightLevel,
  getTileReveal,
  smoothStep,
} from './cityEffects.js';

import { getCityTheme, DEFAULT_CITY_THEME } from './themes/index.js';

export function createHaloTexture() {
  // Tiny procedural light halo; shared across districts, never downloaded.
  const haloBytes = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4,
        r = Math.hypot((x - 15.5) / 16, (y - 15.5) / 16);
      haloBytes[i] = haloBytes[i + 1] = haloBytes[i + 2] = 255;
      haloBytes[i + 3] = Math.round(255 * Math.max(0, 1 - r) ** 2.5);
    }
  const texture = new THREE.DataTexture(haloBytes, 32, 32, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Tile owns its materials and instance buffers; a stream owns the shared halo texture.
 * @param {number} index
 * @param {{
 *   lighting?: ReturnType<typeof createCityLighting>,
 *   haloTexture?: THREE.Texture,
 *   theme?: import('../core/types.js').CityThemeId,
 * }} [options]
 */
export function createCityTile(
  index,
  { lighting = createCityLighting(), haloTexture, theme: themeId = DEFAULT_CITY_THEME } = {},
) {
  const theme = getCityTheme(themeId);
  const ownsTexture = !haloTexture;
  haloTexture ??= createHaloTexture();
  const root = new THREE.Group();
  root.name = `district-${index}`;
  root.position.x = getCrossingX(index);
  const records = new Map();
  /** @param {number | string} key */
  const getMaterial = (key) => {
    if (!records.has(key)) {
      const config = theme.materials[key] ?? { color: theme.colors[key] ?? key };
      const material = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: config.roughness ?? 0.85,
        metalness: config.metalness ?? 0,
        emissive: config.emissive ?? 0,
        emissiveIntensity: config.power ?? 0,
      });
      applyCityLighting(material, lighting);
      records.set(key, { material });
    }
    return records.get(key).material;
  };
  const { style, halos, signals, emerging, traffic } = buildDistrictGeometry(
    index,
    root,
    getMaterial,
    haloTexture,
    theme.id,
  );
  const tile = {
    index,
    themeId: theme.id,
    root,
    style,
    lighting,
    emerging,
    traffic,
    records,
    signals,
    role: 'next',
    reveal: 1,
    warmth: 0.2,
    disposed: false,
    signal: 'red',
    crossSignal: 'green',
  };
  let lastProgress = null,
    lastOpacity = null,
    lastFocus = null,
    lastCapture = null,
    lastSignal = null,
    lastHalo = 1;
  /**
   * @param {THREE.Material & { opacity: number, alphaHash: boolean }} material
   * @param {number} opacity
   */
  function setOpacity(material, opacity) {
    material.opacity = opacity;
    const alphaHash = opacity < 1;
    if (material.alphaHash !== alphaHash) {
      material.alphaHash = alphaHash;
      material.needsUpdate = true;
    }
  }
  /** @param {import('../core/types.js').TrafficSignalState} state */
  tile.setSignal = (state) => {
    if (!['off', 'red', 'yellow', 'green'].includes(state))
      throw new RangeError('Stato semaforo non valido.');
    tile.signal = state;
  };
  /** @param {import('../core/types.js').TileRole} role */
  tile.setRole = (role) => {
    tile.role = role;
  };
  /**
   * @param {number} dt
   * @param {number} progress Reveal progress in [0, 1].
   * @param {{ reducedMotion?: boolean, trafficBlocked?: boolean, haloIntensity?: number }} [options]
   */
  tile.update = (
    dt,
    progress,
    { reducedMotion = false, trafficBlocked = false, haloIntensity = 1 } = {},
  ) => {
    progress = reducedMotion ? 1 : progress;
    const reveal = getTileReveal(progress),
      focus = lighting.focusX.value,
      capture = 1 - 0.82 * lighting.capture.value;
    if (progress !== lastProgress) {
      tile.reveal = reveal.base;
      root.position.y = (reveal.base - 1) * 3.4;
      for (const item of emerging) {
        item.growth = smoothStep((reveal.objects - item.delay) / (1 - item.delay));
        item.root.scale.y = Math.max(0.001, item.growth);
        item.root.visible = item.growth > 0.001;
      }
      lastProgress = progress;
    }
    if (reveal.base !== lastOpacity) {
      for (const { material } of records.values()) setOpacity(material, reveal.base);
      for (const signal of signals)
        for (const lamp of Object.values(signal.lamps)) setOpacity(lamp.material, reveal.base);
    }
    if (
      focus !== lastFocus ||
      capture !== lastCapture ||
      reveal.base !== lastOpacity ||
      haloIntensity !== lastHalo
    ) {
      tile.warmth = getCityLightLevel(root.position.x, focus) * capture;
      for (const sprite of halos)
        sprite.material.opacity =
          getCityLightLevel(root.position.x + sprite.position.x, focus) *
          capture *
          reveal.base *
          0.75 *
          haloIntensity;
    }
    tile.crossSignal = !trafficBlocked && tile.signal === 'red' ? 'green' : 'red';
    traffic.update(dt, tile.crossSignal === 'green', reducedMotion, trafficBlocked, reveal.base);
    const signalKey = `${tile.signal}:${tile.crossSignal}:${tile.role}`;
    if (signalKey !== lastSignal || focus !== lastFocus) {
      for (const signal of signals)
        for (const [name, lamp] of Object.entries(signal.lamps)) {
          const on =
            tile.role !== 'retiring' &&
            (signal.axis === 'main' ? tile.signal : tile.crossSignal) === name;
          lamp.material.color.set(on ? SIGNAL_COLORS[name] : 0x112038);
          lamp.material.emissiveIntensity = on
            ? 2.5 * getCityLightLevel(root.position.x + signal.position.x, focus)
            : 0;
        }
    }
    lastOpacity = reveal.base;
    lastFocus = focus;
    lastCapture = capture;
    lastSignal = signalKey;
    lastHalo = haloIntensity;
  };
  tile.dispose = () => {
    if (tile.disposed) return;
    tile.disposed = true;
    root.removeFromParent();
    traffic.dispose();
    for (const { material } of records.values()) material.dispose();
    for (const signal of signals)
      for (const lamp of Object.values(signal.lamps)) lamp.material.dispose();
    for (const sprite of halos) sprite.material.dispose();
    if (ownsTexture) haloTexture.dispose();
    root.traverse((object) => {
      if (isInstancedMesh(object)) object.dispose();
    });
    root.clear();
  };
  return tile;
}
