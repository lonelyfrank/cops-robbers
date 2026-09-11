/**
 * Timing of the procedural animations.
 *
 * Only durations and response rates live here. The shaping of a single choreography —
 * when the hands go up inside the arrest, when the run pose settles — stays beside the
 * animation it belongs to, where it can be read as one sequence.
 */

/** Thief, patrol and the arrest ring. Reduced motion keeps the same states, shorter. */
export const CHARACTER = Object.freeze({
  /** Metres per second used to derive a run duration from the distance covered. */
  runSpeed: 19,
  runMinDuration: 0.65,
  reducedRunDuration: 0.45,
  caughtDuration: 2.2,
  reducedCaughtDuration: 0.85,
  alleyDuration: 1.05,
  reducedAlleyDuration: 0.65,
  /** Exponential response of the loot bag growth, per second. */
  lootResponse: 7,
});

/** District streaming and the shared light gradient. */
export const CITY = Object.freeze({
  /** Reveal speed of an arriving district, in progress units per second. */
  revealSpeed: 1.05,
  /** Retiring districts leave slightly faster than they arrive. */
  retireSpeed: 1.2,
  /** Exponential response of the light focus following the thief, per second. */
  focusResponse: 6,
  /** Exponential response of the capture dimming, per second. */
  captureResponse: 8,
});
