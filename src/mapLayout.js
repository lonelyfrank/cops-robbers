import { MAX_CROSSINGS } from './gameMath.js';

// Each square is a complete diorama: one junction and aligned road connectors.
export const TILE_SIZE = 26;
export const CROSSING_SPACING = TILE_SIZE;
export const MAIN_ROAD_Z = 4.6;
export const RUNNER_Z = MAIN_ROAD_Z + 1.25;
export const ROAD_Y = -.03;
export const STOP_DISTANCE = 4.7;
export const getCrossingX = n => (n - 1) * TILE_SIZE;
// The patrol waits before the previous zebra crossing, one district behind.
export const getPursuitStopX = completed => getCrossingX(completed) - 6.7;

// A green crosses this junction and carries the runner to the next safe stop.
// At the final junction, stop within the last playable tile for extraction.
export function getStopX(completed) {
  if (completed === MAX_CROSSINGS) return getCrossingX(completed) + STOP_DISTANCE;
  return getCrossingX(completed + 1) - STOP_DISTANCE;
}

export function getCurrentTile(x) {
  if (!Number.isFinite(x)) throw new RangeError('Posizione della mappa non valida.');
  return Math.max(1, Math.min(MAX_CROSSINGS, Math.floor((x + TILE_SIZE / 2) / TILE_SIZE) + 1));
}

export function getTileWindow(current) {
  if (!Number.isInteger(current) || current < 1 || current > MAX_CROSSINGS) throw new RangeError('Modulo non valido.');
  // 0 is the approach district; MAX+1 is the exit district, never a wager.
  return [current - 1, current, current + 1];
}

export function getTileRole(index, current) {
  return index === current ? 'current' : index === current - 1 ? 'previous' : index === current + 1 ? 'next' : 'retiring';
}

/** Smooth blue flashes, at 1.7 Hz. The same phase drives city, car and overlay. */
export function sirenPulse(time, reducedMotion = false, offset = 0) {
  if (reducedMotion) return .42;
  return .1 + .9 * Math.pow(.5 + .5 * Math.sin(time * Math.PI * 3.4 + offset), 4);
}
