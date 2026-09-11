import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CityStream } from '../src/world/CityStream.js';
import { createCityTile } from '../src/world/CityTile.js';
import { getDistrictStyle } from '../src/world/geometry/districtGeometry.js';
import { CharacterController } from '../src/actors/CharacterController.js';
import { isInstancedMesh, unitBox } from '../src/rendering/voxelModels.js';
import { getCityLightLevel } from '../src/world/cityEffects.js';
import { MAX_CROSSINGS } from '../src/config/gameplay.js';
import {
  getCurrentTile,
  getTileWindow,
  getCrossingX,
  getStopX,
  TILE_SIZE,
  sirenPulse,
} from '../src/world/mapLayout.js';

const settle = (stream) => {
  for (let i = 0; i < 25; i++) stream.update(0.05);
};
const loaded = (stream) => [...stream.tiles.keys()].sort((a, b) => a - b);

test('Road connectors meet, each successful crossing reaches the next tile, and the finale remains on the map', () => {
  for (let n = 1; n <= MAX_CROSSINGS; n++) {
    assert.equal(getCrossingX(n) + TILE_SIZE / 2, getCrossingX(n + 1) - TILE_SIZE / 2);
    assert.equal(getCurrentTile(getStopX(n - 1)), n);
    assert.equal(getCurrentTile(getStopX(n)), Math.min(n + 1, MAX_CROSSINGS));
  }
  assert.deepEqual(getTileWindow(1), [0, 1, 2]);
  assert.deepEqual(getTileWindow(MAX_CROSSINGS), [
    MAX_CROSSINGS - 1,
    MAX_CROSSINGS,
    MAX_CROSSINGS + 1,
  ]);
});

test('Adjacent districts have soft lighting and the occupied district remains highlighted', () => {
  const scene = new THREE.Scene(),
    stream = new CityStream(scene);
  assert.deepEqual(loaded(stream), [0, 1, 2]);
  for (const [n, { tile }] of stream.tiles) {
    assert.equal(tile.root.parent, scene);
    assert.ok(tile.records.get('window').material.emissiveIntensity > 0);
    if (n !== 1) assert.ok(tile.warmth < stream.activeTile.warmth);
    assert.ok(tile.records.get('lantern').material.emissiveIntensity > 0);
    assert.equal(tile.signal, 'red');
    assert.equal(tile.crossSignal, 'green');
  }
  assert.equal(stream.previousTile.role, 'previous');
  assert.equal(stream.tiles.get(2).tile.role, 'next');
  stream.dispose();
});

test('Lighting remains continuous when the occupied district changes at a connector', () => {
  const stream = new CityStream(new THREE.Scene());
  stream.setPlayerX(TILE_SIZE / 2 - 0.001);
  settle(stream);
  const before = [stream.activeTile.warmth, stream.tiles.get(2).tile.warmth];
  stream.setPlayerX(TILE_SIZE / 2 + 0.001);
  assert.equal(stream.current, 2);
  assert.ok(Math.abs(stream.previousTile.warmth - before[0]) < 0.0001);
  assert.ok(Math.abs(stream.activeTile.warmth - before[1]) < 0.0001);
  stream.setPlayerX(getStopX(1));
  settle(stream);
  assert.ok(stream.activeTile.warmth > stream.previousTile.warmth);
  assert.equal(stream.activeTile.lighting, stream.previousTile.lighting);
  stream.dispose();
});

test('A district appears below the map and the obsolete one dissolves, releasing only its owned resources', () => {
  const scene = new THREE.Scene(),
    stream = new CityStream(scene);
  const retired = stream.tiles.get(0).tile;
  let materialsDisposed = 0,
    sharedGeometryDisposed = 0;
  for (const record of retired.records.values())
    record.material.addEventListener('dispose', () => materialsDisposed++);
  const onSharedDispose = () => sharedGeometryDisposed++;
  unitBox.addEventListener('dispose', onSharedDispose);
  stream.setPlayerX(getCrossingX(2));
  assert.deepEqual(loaded(stream), [0, 1, 2, 3]);
  assert.equal(retired.role, 'retiring');
  assert.ok(stream.tiles.get(3).tile.root.position.y < 0);
  assert.equal(stream.tiles.get(3).reveal, 0);
  stream.update(0.2);
  assert.ok(retired.emerging.some((item) => item.growth < 1));
  assert.equal(retired.root.position.y, 0);
  assert.ok(stream.tiles.get(3).reveal > 0);
  settle(stream);
  assert.deepEqual(loaded(stream), [1, 2, 3]);
  assert.equal(retired.disposed, true);
  assert.equal(retired.root.parent, null);
  assert.equal(materialsDisposed, retired.records.size);
  assert.equal(sharedGeometryDisposed, 0);
  assert.equal(stream.tiles.get(3).tile.root.position.y, 0);
  stream.dispose();
  unitBox.removeEventListener('dispose', onSharedDispose);
});

test('Rapid jumps, complete traversal and repeated resets never keep more than four districts', () => {
  const scene = new THREE.Scene(),
    stream = new CityStream(scene);
  for (let n = 2; n <= MAX_CROSSINGS; n++) {
    stream.setPlayerX(getCrossingX(n));
    assert.ok(stream.tiles.size <= 4);
    for (const wanted of getTileWindow(n)) assert.ok(stream.tiles.has(wanted));
  }
  settle(stream);
  assert.deepEqual(loaded(stream), [11, 12, 13]);
  for (let i = 0; i < 3; i++) {
    stream.reset();
    assert.deepEqual(loaded(stream), [0, 1, 2]);
    assert.equal(scene.children.length, 3);
  }
  stream.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(stream.tiles.size, 0);
});

test('Capture dims the warm light, stops cross traffic and reset restores waiting at red', () => {
  const stream = new CityStream(new THREE.Scene());
  stream.setPlayerX(getCrossingX(3));
  settle(stream);
  assert.ok(stream.activeTile.warmth > 0.99);
  stream.setSignal(3, 'red');
  stream.setCaught(true);
  settle(stream);
  assert.ok(stream.activeTile.warmth < 0.2);
  assert.equal(stream.activeTile.crossSignal, 'red');
  assert.ok(stream.activeTile.records.get('lantern').material.emissiveIntensity > 0);
  assert.ok(stream.activeTile.signals[0].lamps.red.material.emissiveIntensity > 0);
  stream.reset();
  assert.equal(stream.caught, false);
  assert.equal(stream.current, 1);
  assert.equal(stream.signals.size, 1);
  assert.equal(stream.activeTile.signal, 'red');
  assert.equal(stream.activeTile.warmth, 1);
  stream.dispose();
});

test('Reduced motion keeps three stable districts and steady siren intensities', () => {
  const stream = new CityStream(new THREE.Scene(), { reducedMotion: true });
  stream.setPlayerX(getCrossingX(2));
  assert.deepEqual(loaded(stream), [1, 2, 3]);
  assert.equal(stream.activeTile.warmth, 1);
  for (const { tile } of stream.tiles.values()) {
    assert.equal(tile.reveal, 1);
    assert.equal(tile.root.position.y, 0);
  }
  assert.equal(sirenPulse(0, true), sirenPulse(100, true));
  stream.dispose();
});

test('Running enters and illuminates the next district before the safe-stop callback', () => {
  const scene = new THREE.Scene(),
    stream = new CityStream(scene),
    character = new CharacterController(scene);
  let completed = 0,
    litWhileRunning = false;
  character.run(1, () => completed++);
  for (let i = 0; i < 100; i++) {
    character.update(0.025);
    stream.setPlayerX(character.thief.root.position.x);
    stream.update(0.025);
    if (character.animation && stream.current === 2 && stream.activeTile.warmth > 0)
      litWhileRunning = true;
  }
  assert.equal(completed, 1);
  assert.equal(litWhileRunning, true);
  assert.equal(stream.current, 2);
  assert.deepEqual(loaded(stream), [1, 2, 3]);
  stream.dispose();
});

test('Arrest beacons are blue and keep flashing after the arrest animation, then reset cleanly', () => {
  const character = new CharacterController(new THREE.Scene());
  let finished = 0;
  character.caught(1, () => finished++);
  for (let i = 0; i < 120; i++) character.update(0.025);
  assert.equal(finished, 1);
  assert.equal(character.arrested, true);
  assert.equal(character.police.blueLight.color.getHex(), character.police.redLight.color.getHex());
  const before = character.police.blueLight.intensity;
  character.update(0.15);
  assert.notEqual(character.police.blueLight.intensity, before);
  character.reset();
  assert.equal(character.arrested, false);
  assert.equal(character.police.blueLight.intensity, 0);
});

test('Diorama batches keep finite transforms, independent per-tile materials and deterministic geometry', () => {
  const a = createCityTile(2),
    b = createCityTile(2);
  a.setRole('current');
  a.update(0.1, 1);
  b.setRole('next');
  b.update(0.1, 1);
  assert.notEqual(a.records.get('window').material, b.records.get('window').material);
  assert.ok(b.records.get('window').material.emissiveIntensity > 0);
  assert.equal(b.warmth, a.warmth);
  assert.equal(
    b.records.get('window').material.emissiveIntensity,
    a.records.get('window').material.emissiveIntensity,
  );
  a.root.updateMatrixWorld(true);
  a.root.traverse((object) => {
    assert.ok(object.matrixWorld.elements.every(Number.isFinite));
    if (isInstancedMesh(object)) assert.ok(object.instanceMatrix.array.every(Number.isFinite));
  });
  const matrices = (tile) => {
    const result = [];
    tile.root.traverse((mesh) => {
      if (isInstancedMesh(mesh)) result.push(Array.from(mesh.instanceMatrix.array));
    });
    return result;
  };
  assert.deepEqual(matrices(a), matrices(b));
  a.dispose();
  b.dispose();
});

test('District architecture varies reproducibly without blocking the road parcels', () => {
  for (let index = 0; index <= MAX_CROSSINGS; index++) {
    const style = getDistrictStyle(index);
    assert.deepEqual(style, getDistrictStyle(index));
    assert.notDeepEqual(style, getDistrictStyle(index + 1));
    for (const building of style.buildings) {
      assert.ok(Math.abs(building.x) - building.width / 2 > 3.3);
      assert.ok(building.floors >= 1 && building.floors <= 4);
    }
  }
});

test('Runner and patrol junctions open together; the next waiting junction stays red', () => {
  const stream = new CityStream(new THREE.Scene(), { reducedMotion: true });
  stream.setMovement(1);
  stream.update(0);
  for (const n of [0, 1]) {
    assert.equal(stream.tiles.get(n).tile.signal, 'green');
    assert.equal(stream.tiles.get(n).tile.crossSignal, 'red');
  }
  stream.setPlayerX(getStopX(1));
  assert.equal(stream.current, 2);
  assert.equal(stream.activeTile.signal, 'red');
  assert.equal(stream.activeTile.crossSignal, 'green');
  stream.setMovement(null);
  stream.update(0);
  assert.equal(stream.previousTile.signal, 'red');
  assert.equal(stream.previousTile.crossSignal, 'green');
  stream.dispose();
});

test('The spatial light gradient is symmetric and has no seam at district edges', () => {
  assert.equal(getCityLightLevel(0), 1);
  for (let x = 1; x <= 78; x++) {
    assert.equal(getCityLightLevel(x), getCityLightLevel(-x));
    assert.ok(getCityLightLevel(x) < getCityLightLevel(x - 1));
  }
  for (const edge of [-39, -13, 13, 39])
    assert.ok(Math.abs(getCityLightLevel(edge - 0.001) - getCityLightLevel(edge + 0.001)) < 0.001);
});

test('Buildings emerge after the base arrives and retract before the base drops', () => {
  const tile = createCityTile(2);
  tile.update(0, 0.2);
  assert.ok(tile.root.position.y < 0);
  assert.ok(tile.emerging.every((item) => !item.root.visible));
  tile.update(0, 0.65);
  assert.equal(tile.root.position.y, 0);
  assert.ok(tile.emerging.every((item) => item.growth > 0 && item.growth < 1));
  const building = tile.emerging[0].root;
  tile.root.updateMatrixWorld(true);
  const partial = new THREE.Box3().setFromObject(building);
  assert.ok(Math.abs(partial.min.y - 0.25) < 0.01);
  tile.update(0, 1);
  tile.root.updateMatrixWorld(true);
  const full = new THREE.Box3().setFromObject(building);
  assert.ok(full.max.y > partial.max.y);
  tile.update(0, 0.4);
  assert.equal(tile.root.position.y, 0);
  tile.update(0, 0.3);
  assert.ok(tile.root.position.y < 0);
  assert.ok(tile.emerging.every((item) => !item.root.visible));
  tile.update(0, 0, { reducedMotion: true });
  assert.equal(tile.root.position.y, 0);
  assert.ok(tile.emerging.every((item) => item.growth === 1));
  tile.dispose();
});

test('Every cashout stop aligns with actual alley paving, including crossing twelve', () => {
  for (let n = 1; n <= MAX_CROSSINGS; n++) {
    const x = getStopX(n),
      index = getCurrentTile(x),
      tile = createCityTile(index);
    tile.update(0, 1);
    tile.root.updateMatrixWorld(true);
    const paving = [];
    const matrix = new THREE.Matrix4(),
      point = new THREE.Vector3();
    tile.root.traverse((mesh) => {
      if (!isInstancedMesh(mesh)) return;
      if (/** @type {THREE.MeshStandardMaterial} */ (mesh.material).color.getHex() !== 0xc9b994)
        return;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        point.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld);
        paving.push(point.clone());
      }
    });
    for (let z = 8.5; z < 13; z += 0.6)
      assert.ok(
        paving.some((p) => Math.abs(p.x - x) < 1e-5 && Math.abs(p.z - z) < 1e-5),
        `Missing paving at crossing ${n}, x=${x}, z=${z}`,
      );
    tile.dispose();
  }
});

test('A stream owns its halo texture and releases it once without disposing shared voxel geometry', () => {
  const first = new CityStream(new THREE.Scene());
  let disposed = 0,
    boxes = 0;
  const texture = first.haloTexture;
  texture.addEventListener('dispose', () => disposed++);
  const onBox = () => boxes++;
  unitBox.addEventListener('dispose', onBox);
  first.reset();
  assert.equal(disposed, 0);
  first.dispose();
  first.dispose();
  assert.equal(disposed, 1);
  assert.equal(boxes, 0);
  const second = new CityStream(new THREE.Scene());
  assert.notEqual(second.haloTexture, texture);
  second.dispose();
  unitBox.removeEventListener('dispose', onBox);
});

test('Stable tile materials stay untouched and alpha hashing is used only during base fades', () => {
  const tile = createCityTile(1);
  tile.update(0, 1);
  let writes = 0;
  const materials = [...tile.records.values()].map((record) => record.material);
  for (const material of materials) {
    let opacity = material.opacity;
    Object.defineProperty(material, 'opacity', {
      get: () => opacity,
      set: (value) => {
        writes++;
        opacity = value;
      },
      configurable: true,
    });
    assert.equal(material.alphaHash, false);
  }
  for (let i = 0; i < 60; i++) tile.update(1 / 60, 1);
  assert.equal(writes, 0);
  tile.update(0, 0.2);
  assert.ok(materials.every((material) => material.alphaHash));
  tile.update(0, 1);
  assert.ok(materials.every((material) => !material.alphaHash));
  tile.dispose();
});

test('Shared voxel assets survive concurrent owners and are recreated after the last scene closes', async () => {
  const models = await import('../src/rendering/voxelModels.js');
  const releaseA = models.retainVoxelAssets(),
    releaseB = models.retainVoxelAssets();
  const geometry = models.unitBox,
    material = models.material(0xabcdef);
  let disposed = 0;
  geometry.addEventListener('dispose', () => disposed++);
  material.addEventListener('dispose', () => disposed++);
  releaseA();
  assert.equal(disposed, 0);
  assert.equal(models.unitBox, geometry);
  releaseB();
  releaseB();
  assert.equal(disposed, 2);
  assert.notEqual(models.unitBox, geometry);
  assert.notEqual(models.material(0xabcdef), material);
});
