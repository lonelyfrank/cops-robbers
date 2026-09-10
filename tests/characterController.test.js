import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CharacterController } from '../src/characterController.js';
import { getStopX } from '../src/sceneManager.js';

function finish(controller, duration = 6) { for (let t = 0; t < duration; t += .025) controller.update(.025); }

test('The running animation reaches the next safe stop and invokes completion once', () => {
  const scene = new THREE.Scene(), c = new CharacterController(scene); let completed = 0;
  c.run(1, () => completed++); finish(c);
  assert.equal(completed, 1); assert.equal(c.thief.root.position.x, getStopX(1)); assert.equal(c.thief.root.visible, true);
  assert.equal(c.thief.legs[0].rotation.z, 0);
});

test('Arrest introduces a police car and raised hands; reset restores all props', () => {
  const c = new CharacterController(new THREE.Scene()); let completed = 0;
  c.caught(1, () => completed++); finish(c);
  assert.equal(completed, 1); assert.equal(c.police.root.visible, true); assert.ok(c.thief.arms[0].rotation.z < -2);
  c.reset(); assert.equal(c.police.root.visible, false); assert.equal(c.police.blueLight.intensity, 0);
  assert.equal(c.thief.root.position.x, getStopX(0)); assert.equal(c.thief.arms[0].rotation.z, 0);
});

test('Alley cashout turns the thief off the avenue and completes once', () => {
  const c = new CharacterController(new THREE.Scene()); let completed = 0;
  c.escape(2, () => completed++); finish(c);
  assert.equal(completed, 1); assert.equal(c.thief.root.visible, false); assert.ok(c.thief.root.position.z > 9);
  assert.equal(c.helicopter.root.visible, false);
});

test('Helicopter extraction works in normal and reduced motion with finite transforms', () => {
  for (const reducedMotion of [false, true]) {
    const scene = new THREE.Scene(), c = new CharacterController(scene, { reducedMotion }); let completed = 0;
    c.escape(5, () => completed++); finish(c);
    assert.equal(completed, 1); assert.equal(c.helicopter.root.visible, true); assert.equal(c.thief.root.visible, false);
    assert.ok(c.helicopter.root.position.y > 10); assert.equal(c.helicopter.rope.visible, false);
    scene.updateMatrixWorld(true);
    scene.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
    c.reset(); assert.equal(c.helicopter.root.visible, false); assert.equal(c.thief.root.visible, true);
  }
});

test('Completion callbacks can start extraction without being overwritten by a finished run', () => {
  const c = new CharacterController(new THREE.Scene()); let completed = 0;
  c.run(12, () => c.escape(12, () => completed++)); finish(c, 8);
  assert.equal(completed, 1); assert.equal(c.thief.root.visible, false);
});
