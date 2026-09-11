import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { IntersectionTraffic } from '../src/world/TrafficController.js';
import { CharacterController } from '../src/actors/CharacterController.js';
import {
  getCrossingX,
  getStopX,
  getPursuitStopX,
  RUNNER_Z,
  MAIN_ROAD_Z,
  TILE_SIZE,
} from '../src/world/mapLayout.js';
import { createCityTile } from '../src/world/CityTile.js';

test('Cross traffic flows on green, clears the junction on red and queues before the crosswalk', () => {
  const traffic = new IntersectionTraffic(1);
  const before = traffic.cars.map((car) => car.progress);
  traffic.update(0.1, true);
  traffic.cars.forEach((car, i) => assert.ok(car.progress > before[i]));
  for (let i = 0; i < 500; i++) traffic.update(0.025, false);
  traffic.cars.forEach((car) => assert.equal(car.progress, -5.8));
  traffic.update(0.1, true);
  traffic.cars.forEach((car) => assert.ok(car.progress > -5.8));
});

test('Cars in either lane clear before the runner or simultaneous patrol can reach them', () => {
  for (const crossing of [1, 12])
    for (const dt of [1 / 60, 0.05])
      for (let progress = -5.7; progress < 8; progress += 0.6) {
        const c = new CharacterController(new THREE.Scene());
        const traffic = new IntersectionTraffic(1);
        traffic.cars.forEach((car) => {
          car.progress = progress;
        });
        c.thief.root.position.x = getStopX(crossing - 1);
        c.chase.root.position.x = getPursuitStopX(crossing - 1);
        c.run(crossing);
        for (let frame = 0; frame < Math.ceil(1.5 / dt); frame++) {
          c.update(dt);
          traffic.update(dt, false);
          for (const car of traffic.cars)
            for (const [
              actor,
              origin,
              halfLength,
              halfWidth,
            ] of /** @type {[THREE.Object3D, number, number, number][]} */ ([
              [c.thief.root, getCrossingX(crossing), 0.4, 0.5],
              [c.chase.root, getCrossingX(crossing - 1), 1.68, 0.94],
            ])) {
              const dx = Math.abs(actor.position.x - (origin + car.root.position.x));
              const dz = Math.abs(RUNNER_Z - car.root.position.z);
              assert.ok(
                dx > halfLength + 0.84 || dz > halfWidth + 1.51,
                `Overlap: dt=${dt}, progress=${progress}, frame=${frame}, actor=${actor.name}`,
              );
            }
        }
      }
});

test('Reduced motion holds civilian cars outside the crossing and leaves transforms finite', () => {
  const traffic = new IntersectionTraffic(4);
  traffic.update(1, true, true);
  const positions = traffic.cars.map((car) => car.root.position.toArray());
  traffic.update(1, false, true);
  assert.deepEqual(
    traffic.cars.map((car) => car.root.position.toArray()),
    positions,
  );
  traffic.root.updateMatrixWorld(true);
  traffic.root.traverse((object) => assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
});

test('An emergency clears civilians outwards and prevents respawning into the police ring', () => {
  for (const reducedMotion of [false, true])
    for (const progress of [-18, -5.8, -5, 0, 12]) {
      const traffic = new IntersectionTraffic(1);
      traffic.cars.forEach((car) => {
        car.progress = progress;
      });
      for (let i = 0; i < 60; i++) traffic.update(0.025, false, reducedMotion, true);
      assert.ok(traffic.cars.every((car) => !car.root.visible));
      const positions = traffic.cars.map((car) => car.progress);
      traffic.update(10, false, reducedMotion, true);
      assert.deepEqual(
        traffic.cars.map((car) => car.progress),
        positions,
      );
    }
});

test('Both lanes fade at either road end, stay solid at red and never overhang the tile', () => {
  const traffic = new IntersectionTraffic(1);
  for (const car of traffic.cars) {
    for (const edge of [-1, 1]) {
      const opacities = [];
      for (const distance of [10.4, 10.8, 11.2, 11.42, 13, 14]) {
        car.progress = (edge * distance - MAIN_ROAD_Z) / car.direction;
        traffic.update(0, true);
        opacities.push(car.opacity);
        if (car.root.visible) assert.ok(Math.abs(car.root.position.z) + 1.51 < TILE_SIZE / 2);
      }
      assert.ok(opacities[0] > opacities[1] && opacities[1] > opacities[2]);
      assert.ok(opacities[1] > 0 && opacities[1] < 1);
      assert.deepEqual(opacities.slice(3), [0, 0, 0]);
    }
    car.progress = -5.8;
    traffic.update(0, false);
    assert.equal(car.opacity, 1);
  }
  traffic.dispose();
});

test('Car fading preserves city lighting, combines tile reveal and releases only owned materials', () => {
  const tile = createCityTile(1, { theme: 'neonTokyo' });
  const [a, b] = tile.traffic.cars;
  a.progress = (11 - MAIN_ROAD_Z) / a.direction;
  b.progress = 0;
  tile.update(0, 1);
  assert.ok(a.opacity > 0 && a.opacity < 1);
  assert.equal(b.opacity, 1);
  assert.equal(a.depthMaterial.opacity, a.opacity);
  assert.equal(b.depthMaterial.opacity, 1);
  assert.notEqual(a.depthMaterial, b.depthMaterial);
  for (const [key, copy] of a.materials) {
    const source = tile.records.get(key).material;
    assert.notEqual(copy, source);
    assert.equal(copy.onBeforeCompile, source.onBeforeCompile);
    assert.equal(copy.opacity, a.opacity);
    assert.equal(source.opacity, 1);
    if (b.materials.has(key)) assert.notEqual(copy, b.materials.get(key));
  }
  const fade = a.opacity;
  tile.update(0, 0.175);
  assert.ok(Math.abs(a.opacity - fade * tile.reveal) < 1e-8);
  tile.update(0, 0);
  assert.ok(tile.traffic.cars.every((car) => !car.root.visible));
  const counts = new Map();
  for (const car of tile.traffic.cars)
    for (const mat of [...car.materials.values(), car.depthMaterial]) {
      counts.set(mat, 0);
      mat.addEventListener('dispose', () => counts.set(mat, counts.get(mat) + 1));
    }
  tile.dispose();
  tile.dispose();
  assert.ok([...counts.values()].every((count) => count === 1));
});
