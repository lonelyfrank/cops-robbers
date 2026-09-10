import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CharacterController } from '../src/characterController.js';
import { getStopX } from '../src/sceneManager.js';
import { getPursuitStopX, getCrossingX, RUNNER_Z, TILE_SIZE } from '../src/mapLayout.js';
import { getMultiplier } from '../src/gameMath.js';

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
  c.escape(() => completed++); finish(c);
  assert.equal(completed, 1); assert.equal(c.thief.root.visible, false); assert.ok(c.thief.root.position.z > 9);
});

test('Cashout uses the alley at every crossing in normal and reduced motion', () => {
  for (const reducedMotion of [false, true]) for (let n=1;n<=12;n++) {
    const scene = new THREE.Scene(), c = new CharacterController(scene, { reducedMotion }); let completed = 0;
    c.thief.root.position.x=getStopX(n);
    c.escape(() => completed++); finish(c);
    assert.equal(completed, 1); assert.equal(c.thief.root.visible, false);
    assert.equal(c.thief.root.position.x,getStopX(n)); assert.ok(c.thief.root.position.z>12);
    scene.updateMatrixWorld(true);
    scene.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
    c.reset(); assert.equal(c.thief.root.visible, true); assert.equal(c.thief.root.position.z,RUNNER_Z);
  }
});

test('Completion callbacks can start extraction without being overwritten by a finished run', () => {
  const c = new CharacterController(new THREE.Scene()); let completed = 0;
  c.thief.root.position.x = getStopX(11);
  c.chase.root.position.x = getPursuitStopX(11);
  c.run(12, () => c.escape(() => completed++)); finish(c, 8);
  assert.equal(completed, 1); assert.equal(c.thief.root.visible, false);
});

test('Running reacts on the first frame and settles its pose before stopping', () => {
  const c = new CharacterController(new THREE.Scene());
  const startX = c.thief.root.position.x;
  c.run(1);
  c.update(1 / 60);
  assert.ok(c.thief.root.position.x > startX);
  const duration = c.animation.duration;
  assert.ok(duration < 1.5);
  c.update(duration - 1 / 60 - .01);
  assert.ok(c.animation);
  assert.ok(Math.abs(c.thief.legs[0].rotation.z) < .01);
  assert.ok(Math.abs(c.thief.body.rotation.z) < .01);
  finish(c, .1);
  assert.equal(c.thief.root.position.x, getStopX(1));
  assert.equal(c.animation, null);
});

test('The patrol waits still, then advances alongside the thief from the first frame', () => {
  const c = new CharacterController(new THREE.Scene());
  const startX = c.chase.root.position.x;
  c.update(.5); assert.equal(c.chase.root.position.x, startX);
  c.run(1); c.update(1 / 60);
  assert.ok(c.chase.root.position.x > startX);
  const runnerDistance = c.thief.root.position.x - getStopX(0);
  assert.ok(Math.abs(c.chase.root.position.x - startX - runnerDistance) < 1e-9);
  finish(c, 1.5);
  assert.equal(c.chase.root.position.x, getPursuitStopX(1));
  c.update(.5); assert.equal(c.chase.root.position.x, getPursuitStopX(1));
});

test('The arrest car approaches head-on and stops in front without touching the thief', () => {
  const c = new CharacterController(new THREE.Scene());
  c.caught(1); const startX = c.police.root.position.x;
  c.update(.1);
  assert.ok(c.police.root.position.x < startX);
  assert.equal(c.police.root.position.z, RUNNER_Z);
  assert.equal(c.police.root.rotation.y, -Math.PI / 2);
  finish(c, 1.5);
  assert.ok(c.police.root.position.x - c.thief.root.position.x > 3);
  assert.equal(c.police.root.position.z, c.thief.root.position.z);
});

test('Loot grows smoothly at every multiplier, stays bounded and resets for a new round', () => {
  for(const reducedMotion of [false,true]) {
    const c = new CharacterController(new THREE.Scene(),{reducedMotion});
    let previous = 1;
    for(let n=1;n<=12;n++) {
      c.setLoot(getMultiplier(n,'medium'),n);
      if(!reducedMotion) assert.equal(c.thief.lootBag.scale.x,previous);
      c.update(.1);
      assert.ok(c.thief.lootBag.scale.x>previous);
      assert.ok(c.thief.lootBag.scale.x<=2.4);
      previous=c.thief.lootBag.scale.x;
    }
    c.reset(); assert.equal(c.thief.lootBag.scale.x,1);assert.equal(c.lootTarget,1);
  }
});

test('Capture cars enter from street ends and form a four-sided ring around the thief',()=>{
  for(const reducedMotion of [false,true]) {
    const c=new CharacterController(new THREE.Scene(),{reducedMotion});let completed=0;
    c.caught(1,()=>completed++);
    assert.ok(c.police.root.position.x>getCrossingX(1)+TILE_SIZE*1.5);
    assert.equal(c.police.root.visible,false);
    assert.ok(c.flankPolice.every(car=>!car.root.visible));
    finish(c,2.5);
    const thief=c.thief.root.position,[north,south]=c.flankPolice;
    assert.ok(c.police.root.position.x>thief.x+3);
    assert.ok(c.chase.root.position.x<thief.x-3);
    assert.ok(north.root.position.z<thief.z-3);
    assert.ok(south.root.position.z>thief.z+3);
    assert.ok([c.police,c.chase,north,south].every(car=>car.root.visible));
    assert.equal(completed,1);
    c.reset();assert.ok(c.flankPolice.every(car=>!car.root.visible));assert.equal(c.police.root.visible,false);
  }
});
