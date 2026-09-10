import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CityStream } from '../src/cityStream.js';
import { createCityTile } from '../src/cityTile.js';
import { CharacterController } from '../src/characterController.js';
import { unitBox } from '../src/voxelModels.js';
import { MAX_CROSSINGS } from '../src/gameMath.js';
import { getCurrentTile, getTileWindow, getCrossingX, getStopX, TILE_SIZE, sirenPulse } from '../src/mapLayout.js';

const settle=stream=>{for(let i=0;i<25;i++)stream.update(.05);};
const loaded=stream=>[...stream.tiles.keys()].sort((a,b)=>a-b);

test('Road connectors meet, each successful crossing reaches the next tile, and the finale remains on the map',()=>{
  for(let n=1;n<=MAX_CROSSINGS;n++) {
    assert.equal(getCrossingX(n)+TILE_SIZE/2,getCrossingX(n+1)-TILE_SIZE/2);
    assert.equal(getCurrentTile(getStopX(n-1)),n);
    assert.equal(getCurrentTile(getStopX(n)),Math.min(n+1,MAX_CROSSINGS));
  }
  assert.deepEqual(getTileWindow(1),[0,1,2]);
  assert.deepEqual(getTileWindow(MAX_CROSSINGS),[MAX_CROSSINGS-1,MAX_CROSSINGS,MAX_CROSSINGS+1]);
});

test('The initial previous/current/next districts exist and only the occupied tile has warm lights',()=>{
  const scene=new THREE.Scene(),stream=new CityStream(scene);
  assert.deepEqual(loaded(stream),[0,1,2]);
  for(const [n,{tile}] of stream.tiles) {
    assert.equal(tile.root.parent,scene);
    assert.equal(tile.records.get('window').material.emissiveIntensity>0,n===1);
    assert.equal(tile.records.get('lantern').material.emissiveIntensity>0,n===1);
  }
  assert.equal(stream.previousTile.role,'previous');assert.equal(stream.tiles.get(2).tile.role,'next');
  stream.dispose();
});

test('Future windows, lamps and signal stay dark until physical entry, then the same tile wakes up',()=>{
  const stream=new CityStream(new THREE.Scene());
  const future=stream.tiles.get(2).tile;
  stream.setSignal(2,'yellow');stream.setPlayerX(TILE_SIZE/2-.001);settle(stream);
  assert.equal(stream.current,1);assert.equal(future.warmth,0);
  assert.equal(future.signals[0].lamps.yellow.material.emissiveIntensity,0);
  stream.setPlayerX(TILE_SIZE/2);stream.update(.1);
  assert.equal(stream.current,2);assert.equal(stream.activeTile,future);
  assert.ok(future.warmth>0);assert.ok(future.records.get('window').material.emissiveIntensity>0);
  assert.ok(future.signals[0].lamps.yellow.material.emissiveIntensity>0);
  assert.equal(stream.previousTile.warmth,0);
  assert.equal(stream.previousTile.records.get('window').material.emissiveIntensity,0);
  stream.dispose();
});

test('A district appears below the map and the obsolete one dissolves, releasing only its owned resources',()=>{
  const scene=new THREE.Scene(),stream=new CityStream(scene);
  const retired=stream.tiles.get(0).tile;
  let materialsDisposed=0,sharedGeometryDisposed=0;
  for(const record of retired.records.values())record.material.addEventListener('dispose',()=>materialsDisposed++);
  const onSharedDispose=()=>sharedGeometryDisposed++;unitBox.addEventListener('dispose',onSharedDispose);
  stream.setPlayerX(getCrossingX(2));
  assert.deepEqual(loaded(stream),[0,1,2,3]);
  assert.equal(retired.role,'retiring');assert.ok(stream.tiles.get(3).tile.root.position.y<0);
  assert.equal(stream.tiles.get(3).reveal,0);
  stream.update(.2);assert.ok(retired.reveal<1);assert.ok(stream.tiles.get(3).reveal>0);
  settle(stream);
  assert.deepEqual(loaded(stream),[1,2,3]);assert.equal(retired.disposed,true);assert.equal(retired.root.parent,null);
  assert.equal(materialsDisposed,retired.records.size);assert.equal(sharedGeometryDisposed,0);
  assert.equal(stream.tiles.get(3).tile.root.position.y,0);
  stream.dispose();unitBox.removeEventListener('dispose',onSharedDispose);
});

test('Rapid jumps, complete traversal and repeated resets never keep more than four districts',()=>{
  const scene=new THREE.Scene(),stream=new CityStream(scene);
  for(let n=2;n<=MAX_CROSSINGS;n++) {
    stream.setPlayerX(getCrossingX(n));assert.ok(stream.tiles.size<=4);
    for(const wanted of getTileWindow(n))assert.ok(stream.tiles.has(wanted));
  }
  settle(stream);assert.deepEqual(loaded(stream),[11,12,13]);
  for(let i=0;i<3;i++){stream.reset();assert.deepEqual(loaded(stream),[0,1,2]);assert.equal(scene.children.length,3);}
  stream.dispose();assert.equal(scene.children.length,0);assert.equal(stream.tiles.size,0);
});

test('Capture extinguishes the occupied district and reset clears the arrest and signal history',()=>{
  const stream=new CityStream(new THREE.Scene());
  stream.setPlayerX(getCrossingX(3));settle(stream);assert.ok(stream.activeTile.warmth>.99);
  stream.setSignal(3,'red');stream.setCaught(true);stream.update(.05);
  assert.equal(stream.activeTile.warmth,0);
  assert.equal(stream.activeTile.records.get('lantern').material.emissiveIntensity,0);
  assert.ok(stream.activeTile.signals[0].lamps.red.material.emissiveIntensity>0);
  stream.reset();assert.equal(stream.caught,false);assert.equal(stream.current,1);
  assert.equal(stream.signals.size,1);assert.equal(stream.activeTile.signal,'yellow');
  assert.equal(stream.activeTile.warmth,1);stream.dispose();
});

test('Reduced motion keeps three stable districts and steady siren intensities',()=>{
  const stream=new CityStream(new THREE.Scene(),{reducedMotion:true});
  stream.setPlayerX(getCrossingX(2));assert.deepEqual(loaded(stream),[1,2,3]);
  assert.equal(stream.activeTile.warmth,1);
  for(const {tile} of stream.tiles.values()){assert.equal(tile.reveal,1);assert.equal(tile.root.position.y,0);}
  assert.equal(sirenPulse(0,true),sirenPulse(100,true));stream.dispose();
});

test('Running enters and illuminates the next district before the safe-stop callback',()=>{
  const scene=new THREE.Scene(),stream=new CityStream(scene),character=new CharacterController(scene);
  let completed=0,litWhileRunning=false;
  character.run(1,()=>completed++);
  for(let i=0;i<100;i++) {
    character.update(.025);stream.setPlayerX(character.thief.root.position.x);stream.update(.025);
    if(character.animation&&stream.current===2&&stream.activeTile.warmth>0)litWhileRunning=true;
  }
  assert.equal(completed,1);assert.equal(litWhileRunning,true);assert.equal(stream.current,2);
  assert.deepEqual(loaded(stream),[1,2,3]);stream.dispose();
});

test('Arrest beacons are blue and keep flashing after the arrest animation, then reset cleanly',()=>{
  const character=new CharacterController(new THREE.Scene());let finished=0;
  character.caught(1,()=>finished++);
  for(let i=0;i<120;i++)character.update(.025);
  assert.equal(finished,1);assert.equal(character.arrested,true);
  assert.equal(character.police.blueLight.color.getHex(),character.police.redLight.color.getHex());
  const before=character.police.blueLight.intensity;character.update(.15);
  assert.notEqual(character.police.blueLight.intensity,before);
  character.reset();assert.equal(character.arrested,false);assert.equal(character.police.blueLight.intensity,0);
});

test('Diorama batches keep finite transforms, independent per-tile materials and deterministic geometry',()=>{
  const a=createCityTile(2),b=createCityTile(2);
  a.setRole('current');a.update(.1,1);b.setRole('next');b.update(.1,1);
  assert.notEqual(a.records.get('window').material,b.records.get('window').material);
  assert.equal(b.records.get('window').material.emissiveIntensity,0);
  a.root.updateMatrixWorld(true);a.root.traverse(object=>{
    assert.ok(object.matrixWorld.elements.every(Number.isFinite));
    if(object.isInstancedMesh)assert.ok(object.instanceMatrix.array.every(Number.isFinite));
  });
  const matrices=tile=>tile.root.children.filter(object=>object.isInstancedMesh).map(mesh=>Array.from(mesh.instanceMatrix.array));
  assert.deepEqual(matrices(a),matrices(b));a.dispose();b.dispose();
});
