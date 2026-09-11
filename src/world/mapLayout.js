import { MAX_CROSSINGS } from '../config/gameplay.js';

/** @typedef {import('../core/types.js').TileRole} TileRole */

// Each square is a complete diorama: one junction and aligned road connectors.
export const TILE_SIZE = 26;
export const MAIN_ROAD_Z = 4.6;
export const RUNNER_Z = MAIN_ROAD_Z + 1.25;
export const ROAD_Y = -0.03;
export const STOP_DISTANCE = 4.7;
export const ALLEY_LOCAL_X = Object.freeze([-STOP_DISTANCE, STOP_DISTANCE]);
/** @param {number} n Junction number, counted from 1. */
export const getCrossingX = (n) => (n - 1) * TILE_SIZE;
// The patrol waits before the previous zebra crossing, one district behind.
/** @param {number} completed Junctions already cleared. */
export const getPursuitStopX = (completed) => getCrossingX(completed) - 6.7;

// A green crosses this junction and carries the runner to the next safe stop.
// At the final junction, stop within the last playable tile for extraction.
/**
 * @param {number} completed
 * @returns {number}
 */
export function getStopX(completed) {
  if (completed === MAX_CROSSINGS) return getCrossingX(completed) + STOP_DISTANCE;
  return getCrossingX(completed + 1) - STOP_DISTANCE;
}

/**
 * @param {number} x World position of the thief.
 * @returns {number} District index holding that position.
 */
export function getCurrentTile(x) {
  if (!Number.isFinite(x)) throw new RangeError('Posizione della mappa non valida.');
  return Math.max(1, Math.min(MAX_CROSSINGS, Math.floor((x + TILE_SIZE / 2) / TILE_SIZE) + 1));
}

/**
 * @param {number} current
 * @returns {number[]} The three district indices that must stay live.
 */
export function getTileWindow(current) {
  if (!Number.isInteger(current) || current < 1 || current > MAX_CROSSINGS)
    throw new RangeError('Modulo non valido.');
  // 0 is the approach district; MAX+1 is the exit district, never a wager.
  return [current - 1, current, current + 1];
}

/**
 * @param {number} index
 * @param {number} current
 * @returns {TileRole}
 */
export function getTileRole(index, current) {
  return index === current
    ? 'current'
    : index === current - 1
      ? 'previous'
      : index === current + 1
        ? 'next'
        : 'retiring';
}

/**
 * Smooth blue flashes, at 1.7 Hz. The same phase drives city, car and overlay.
 * @param {number} time Seconds on the shared animation clock.
 * @param {boolean} [reducedMotion]
 * @param {number} [offset] Phase offset in radians.
 * @returns {number}
 */
export function sirenPulse(time, reducedMotion = false, offset = 0) {
  if (reducedMotion) return 0.42;
  return 0.1 + 0.9 * Math.pow(0.5 + 0.5 * Math.sin(time * Math.PI * 3.4 + offset), 4);
}
