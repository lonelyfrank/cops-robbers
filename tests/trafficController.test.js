import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { IntersectionTraffic } from '../src/trafficController.js';
import { CharacterController } from '../src/characterController.js';
import { getCrossingX, getStopX, getPursuitStopX, RUNNER_Z } from '../src/mapLayout.js';

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
            for (const [actor, origin, halfLength, halfWidth] of [
              [c.thief.root, getCrossingX(crossing), 0.4, 0.5],
              [c.chase.root, getCrossingX(crossing - 1), 1.68, 0.94],
            ]) {
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
