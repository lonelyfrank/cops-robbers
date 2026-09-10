import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CITY_THEMES, getCityTheme, getRoundTheme } from '../src/cityThemes.js';
import { CityStream } from '../src/cityStream.js';
import { createCityTile } from '../src/cityTile.js';
import { getCrossingX, getCurrentTile, getStopX } from '../src/mapLayout.js';
import { GameState } from '../src/gameState.js';

test('A new accepted round changes theme without consuming extra wager samples', () => {
  let calls = 0;
  const game = new GameState({
    random: () => {
      calls++;
      return 0.99999;
    },
  });
  const initial = getRoundTheme(game.snapshot.round);
  assert.equal(initial.name, 'Distretto 87');
  assert.equal(game.start(0), false);
  assert.equal(getRoundTheme(game.snapshot.round), initial);
  for (let round = 1; round <= 6; round++) {
    const before = getRoundTheme(game.snapshot.round);
    game.start();
    assert.notEqual(getRoundTheme(game.snapshot.round), before);
    assert.equal(calls, round);
    assert.equal(game.start(), false);
    const current = getRoundTheme(game.snapshot.round);
    game.finishCaught();
    game.setDifficulty(round % 2 ? 'easy' : 'hard');
    assert.equal(getRoundTheme(game.snapshot.round), current);
    game.resetDemo();
    assert.equal(getRoundTheme(game.snapshot.round), current);
  }
  assert.throws(() => getCityTheme('unknown'), RangeError);
});

test('Every streamed and retiring tile keeps the round theme, with no old tiles after a swap', () => {
  const scene = new THREE.Scene(),
    stream = new CityStream(scene);
  for (const theme of ['neonTokyo', 'district87', 'neonTokyo']) {
    const old = [...stream.tiles.values()].map(({ tile }) => tile);
    stream.reset(theme);
    assert.ok(old.every((tile) => tile.disposed && tile.root.parent === null));
    for (let n = 1; n <= 12; n++) {
      stream.setPlayerX(getCrossingX(n));
      stream.update(0.2);
      assert.ok(stream.tiles.size <= 4);
      assert.ok(
        [...stream.tiles.values()].every(
          ({ tile }) => tile.themeId === theme && tile.style.themeId === theme,
        ),
      );
      assert.equal(scene.children.length, stream.tiles.size);
    }
  }
  stream.dispose();
});

test('Themes have different geometry and materials without changing road or alley coordinates', () => {
  for (const theme of Object.keys(CITY_THEMES))
    for (let n = 1; n <= 12; n++) {
      const x = getStopX(n),
        tile = createCityTile(getCurrentTile(x), { theme });
      tile.update(0, 1);
      tile.root.updateMatrixWorld(true);
      assert.equal(tile.records.has('neonCyan'), theme === 'neonTokyo');
      assert.ok(tile.records.get('window').material.emissiveIntensity > 0);
      let alley = false;
      const matrix = new THREE.Matrix4(),
        point = new THREE.Vector3();
      tile.root.traverse((mesh) => {
        assert.ok(mesh.matrixWorld.elements.every(Number.isFinite));
        if (mesh.isInstancedMesh && mesh.material.color.getHex() === 0xc9b994)
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, matrix);
            point.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld);
            if (Math.abs(point.x - x) < 1e-5 && point.z > 12) alley = true;
          }
      });
      assert.ok(alley, `Missing final alley for ${theme} at ${n}`);
      tile.dispose();
    }
});
