import { createCityTile, createHaloTexture } from './cityTile.js';
import { getCurrentTile, getTileWindow, getTileRole, getStopX, getCrossingX } from './mapLayout.js';
import { MAX_CROSSINGS } from './gameMath.js';
import { createCityLighting } from './cityEffects.js';

/** Owns precisely three live districts and at most one dissolving old district. */
export class CityStream {
  constructor(scene, { reducedMotion = false, createTile = createCityTile } = {}) {
    this.scene = scene;
    this.reducedMotion = reducedMotion;
    this.createTile = createTile;
    this.lighting = createCityLighting();
    this.haloTexture = createHaloTexture();
    this.playerX = getStopX(0);
    this.tiles = new Map();
    this.current = 1;
    this.signals = new Map([[1, 'red']]);
    this.caught = false;
    this.disposed = false;
    this.reset();
  }
  get activeTile() {
    return this.tiles.get(this.current)?.tile;
  }
  // Read-only inspection hook for district-boundary tests.
  get previousTile() {
    return this.tiles.get(this.current - 1)?.tile;
  }
  // Single-signal diagnostic hook; gameplay uses setMovement().
  setSignal(n, state) {
    this.signals.set(n, state);
    this.tiles.get(n)?.tile.setSignal(state);
  }
  setMovement(crossing) {
    // Open the runner's junction and the patrol's previous junction together.
    this.signals.clear();
    if (crossing !== null) {
      this.signals.set(crossing, 'green');
      this.signals.set(crossing - 1, 'green');
    }
    for (const [index, { tile }] of this.tiles) tile.setSignal(this.signals.get(index) ?? 'red');
  }
  setCaught(value) {
    this.caught = Boolean(value);
  }
  setPlayerX(x) {
    const next = getCurrentTile(x);
    this.playerX = x;
    if (next !== this.current) this.sync(next);
  }
  sync(current, immediate = false) {
    if (this.disposed) return;
    const wanted = new Set(getTileWindow(current));
    this.current = current;
    for (const index of wanted) {
      if (!this.tiles.has(index)) {
        const tile = this.createTile(index, {
          lighting: this.lighting,
          haloTexture: this.haloTexture,
        });
        const reveal = immediate || this.reducedMotion ? 1 : 0;
        tile.setSignal(this.signals.get(index) ?? 'red');
        this.scene.add(tile.root);
        this.tiles.set(index, { tile, reveal, target: 1 });
      }
      const entry = this.tiles.get(index);
      entry.target = 1;
      entry.tile.setRole(getTileRole(index, current));
      if (immediate) entry.reveal = 1;
    }
    for (const [index, entry] of this.tiles)
      if (!wanted.has(index)) {
        entry.target = 0;
        entry.tile.setRole('retiring');
        if (immediate || this.reducedMotion) {
          entry.tile.dispose();
          this.tiles.delete(index);
        }
      }
    // Even an interrupted transition or a large position jump cannot leak tiles.
    const retiring = [...this.tiles.entries()]
      .filter(([, entry]) => entry.target === 0)
      .sort((a, b) => Math.abs(a[0] - current) - Math.abs(b[0] - current));
    for (const [index, entry] of retiring.slice(1)) {
      entry.tile.dispose();
      this.tiles.delete(index);
    }
    this.update(0);
  }
  update(dt) {
    if (this.disposed) return;
    const focus = Math.max(0, Math.min(getCrossingX(MAX_CROSSINGS), this.playerX));
    this.lighting.focusX.value +=
      (focus - this.lighting.focusX.value) *
      (this.reducedMotion ? 1 : 1 - Math.exp(-Math.max(0, dt) * 6));
    this.lighting.capture.value +=
      ((this.caught ? 1 : 0) - this.lighting.capture.value) *
      (this.reducedMotion ? 1 : 1 - Math.exp(-Math.max(0, dt) * 8));
    for (const [index, entry] of this.tiles) {
      const speed = entry.target === 1 ? 1.05 : 1.2;
      const delta = this.reducedMotion ? 1 : Math.max(0, dt) * speed;
      entry.reveal =
        entry.target === 1 ? Math.min(1, entry.reveal + delta) : Math.max(0, entry.reveal - delta);
      if (entry.target === 0 && entry.reveal === 0) {
        entry.tile.dispose();
        this.tiles.delete(index);
        continue;
      }
      entry.tile.update(dt, entry.reveal, {
        reducedMotion: this.reducedMotion,
        trafficBlocked: this.caught,
      });
    }
  }
  reset() {
    for (const { tile } of this.tiles.values()) tile.dispose();
    this.tiles.clear();
    this.playerX = getStopX(0);
    this.lighting.focusX.value = 0;
    this.lighting.capture.value = 0;
    this.caught = false;
    this.signals.clear();
    this.signals.set(1, 'red');
    this.sync(1, true);
  }
  dispose() {
    if (this.disposed) return;
    for (const { tile } of this.tiles.values()) tile.dispose();
    this.tiles.clear();
    this.haloTexture.dispose();
    this.disposed = true;
  }
}
