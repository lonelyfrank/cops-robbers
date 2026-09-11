import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DEFAULT_QUALITY, QUALITY_PRESETS, getQualityPreset } from '../src/config/rendering.js';
import { parseRuntimeOptions } from '../src/core/runtimeOptions.js';
import { createPerformanceMonitor } from '../src/rendering/PerformanceMonitor.js';
import { createLightingSystem } from '../src/rendering/LightingSystem.js';
import { CityStream } from '../src/world/CityStream.js';
import { getCityTheme } from '../src/world/themes/index.js';

test('The default preset is exactly the approved look, and presets only go downwards', () => {
  const high = QUALITY_PRESETS[DEFAULT_QUALITY];
  assert.equal(DEFAULT_QUALITY, 'high');
  assert.deepEqual(
    { pixelRatio: high.pixelRatio, shadows: high.shadows, shadowSize: high.shadowSize },
    { pixelRatio: 1.6, shadows: true, shadowSize: 1024 },
    'the default must not change the shipped rendering',
  );
  assert.equal(high.antialias, true);
  assert.equal(high.haloIntensity, 1);
  const order = ['low', 'medium', 'high'];
  for (let i = 1; i < order.length; i++) {
    const lower = QUALITY_PRESETS[order[i - 1]];
    const higher = QUALITY_PRESETS[order[i]];
    assert.ok(lower.pixelRatio <= higher.pixelRatio);
    assert.ok(lower.shadowSize <= higher.shadowSize);
    assert.ok(lower.haloIntensity <= higher.haloIntensity);
  }
});

test('Quality is requested explicitly and falls back to the default, never guessed', () => {
  assert.equal(parseRuntimeOptions('?quality=low').quality, 'low');
  assert.equal(parseRuntimeOptions('?quality=medium').quality, 'medium');
  assert.equal(parseRuntimeOptions('').quality, DEFAULT_QUALITY);
  assert.equal(parseRuntimeOptions('?quality=ultra').quality, DEFAULT_QUALITY);
  assert.equal(parseRuntimeOptions('?quality=__proto__').quality, DEFAULT_QUALITY);
  assert.equal(getQualityPreset('nope').id, DEFAULT_QUALITY);
  // The debug panel is opt-in.
  assert.equal(parseRuntimeOptions('').debug, false);
  assert.equal(parseRuntimeOptions('?debug=1').debug, true);
  assert.equal(parseRuntimeOptions('?debug=0').debug, false);
});

test('A lower preset drops shadows and decorative lights and dims the halos', () => {
  const scene = new THREE.Scene();
  const lighting = createLightingSystem(scene, QUALITY_PRESETS.high);
  const theme = getCityTheme('district87');
  const frame = /** @type {const} */ ({
    lightX: 0,
    occupiedX: 0,
    capture: 0,
    signal: 'red',
    theme,
  });
  lighting.update(frame);
  assert.equal(lighting.key.castShadow, true);
  assert.ok(lighting.warmLights.every((light) => light.intensity > 0));

  lighting.setQuality(QUALITY_PRESETS.low);
  lighting.update(frame);
  assert.equal(lighting.key.castShadow, false);
  assert.ok(lighting.warmLights.every((light) => light.intensity === 0));
  assert.equal(lighting.key.shadow.mapSize.x, QUALITY_PRESETS.low.shadowSize);
  // The signal lamp is gameplay-relevant and survives every budget.
  assert.ok(lighting.signalLight.intensity > 0);
  lighting.dispose();

  const stream = new CityStream(scene, { reducedMotion: true, haloIntensity: 0.5 });
  stream.update(0);
  const tile = stream.activeTile;
  const halo = [];
  tile.root.traverse((node) => {
    if (node.isSprite) halo.push(node.material.opacity);
  });
  stream.haloIntensity = 1;
  stream.update(0);
  const full = [];
  tile.root.traverse((node) => {
    if (node.isSprite) full.push(node.material.opacity);
  });
  assert.ok(halo.length > 0);
  for (let i = 0; i < halo.length; i++) assert.ok(Math.abs(full[i] * 0.5 - halo[i]) < 1e-9);
  stream.dispose();
});

test('The performance monitor publishes a reading per window and reports the worst frame', () => {
  /** @type {any} */
  let info = {
    render: { calls: 12, triangles: 3400 },
    memory: { geometries: 7, textures: 3 },
    programs: [1, 2, 3],
  };
  const monitor = createPerformanceMonitor({
    getInfo: () => info,
    getTileCount: () => 3,
    getInstancedMeshCount: () => 42,
  });

  for (let i = 0; i < 29; i++) assert.equal(monitor.record(1 / 60), false);
  assert.equal(monitor.sample.fps, 0, 'nothing is published before the window closes');
  assert.equal(monitor.record(0.1), true);

  const sample = monitor.sample;
  assert.ok(sample.fps > 40 && sample.fps < 60);
  assert.ok(Math.abs(sample.worstFrameTime - 100) < 1e-9, 'the stalled frame is reported');
  assert.equal(sample.calls, 12);
  assert.equal(sample.triangles, 3400);
  assert.equal(sample.geometries, 7);
  assert.equal(sample.textures, 3);
  assert.equal(sample.programs, 3);
  assert.equal(sample.tiles, 3);
  assert.equal(sample.instancedMeshes, 42);

  // A renderer without the programs list still reports the rest.
  info = { render: { calls: 1, triangles: 2 }, memory: { geometries: 1, textures: 1 } };
  for (let i = 0; i < 30; i++) monitor.record(1 / 60);
  assert.equal(monitor.sample.programs, 0);
});
