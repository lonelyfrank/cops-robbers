/**
 * Renderer, camera, lighting and capture tuning.
 *
 * Split by the systems that consume it, not collected into one flat blob: the scene
 * renderer, the camera controller, the lighting system and the capture effects each
 * read their own block. Values are the ones the approved look was signed off with.
 */
import { MAIN_ROAD_Z } from '../mapLayout.js';

/** WebGL context and frame budget. */
export const RENDERER = Object.freeze({
  /** Upper bound on devicePixelRatio; never raised by a user-agent check. */
  pixelRatio: 1.6,
  antialias: true,
  shadows: true,
  exposure: 1.24,
  background: 0x06132c,
  fogDensity: 0.0065,
});

/** Isometric orthographic camera that follows the thief. */
export const CAMERA = Object.freeze({
  offset: Object.freeze([-29, 33, 37]),
  /** Exponential response of the smoothed follow, per second. */
  response: 7.5,
  focusAhead: 4.7,
  captureZoom: 1.08,
  // A tighter crop fills the CCTV monitor while retaining the isometric angle.
  monitorViewHeight: 31,
  monitorMinViewWidth: 30,
});

/** Ambient, rim, key and decorative lights of the occupied district. */
export const LIGHTING = Object.freeze({
  ambientSky: 0x779edc,
  ambientGround: 0x161e36,
  ambientPower: 0.56,
  rimColor: 0x809edb,
  rimPower: 0.3,
  keyColor: 0xffd5a5,
  keyPower: 1950,
  keyRange: 65,
  keyAngle: 0.9,
  shadowSize: 1024,
  shadowFar: 70,
  shadowNormalBias: 0.055,
  shadowBias: -0.00008,
  warmColor: 0xffb458,
  warmPower: 26,
  warmRange: 11,
  warmHeight: 2.9,
  warmOffsets: Object.freeze([
    Object.freeze([-7, -1.3]),
    Object.freeze([7, -0.5]),
    Object.freeze([-6, MAIN_ROAD_Z + 3.3]),
    Object.freeze([6, MAIN_ROAD_Z + 3.3]),
  ]),
  signalPower: 13,
  signalRange: 9,
});

/** Arrest lighting and the intensity handed to the DOM overlay. */
export const CAPTURE = Object.freeze({
  color: 0x286bff,
  range: 23,
  power: Object.freeze([340, 225]),
  /** How much the warm lights are dimmed while the ring closes. */
  dimming: 0.85,
  flashBase: 0.035,
  flashPower: 0.22,
  reducedFlash: 0.09,
});
