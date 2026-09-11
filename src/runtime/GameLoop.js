/**
 * The animation loop, and nothing else.
 *
 * It knows about frames, elapsed time and tab visibility. It knows nothing about the
 * game, the scene or the interface: it only calls `update(dt, elapsed)`.
 */

/** Longest frame the simulation will accept, in seconds. */
const DEFAULT_MAX_DELTA = 0.05;

/**
 * @param {(dt: number, elapsed: number) => void} update
 * @param {object} [options]
 * @param {number} [options.maxDelta] Clamp for a long frame, in seconds.
 * @param {(error: unknown) => void} [options.onError] Called once, then the loop stops.
 * @returns {{ start: () => void, stop: () => void, dispose: () => void, readonly elapsed: number }}
 */
export function createGameLoop(update, { maxDelta = DEFAULT_MAX_DELTA, onError } = {}) {
  const events = new AbortController();
  let frame = 0;
  let lastTime = performance.now();
  let elapsed = 0;
  let running = false;
  let failed = false;

  // Returning to a tab must not replay the time spent away as one huge step.
  document.addEventListener(
    'visibilitychange',
    () => {
      lastTime = performance.now();
    },
    { signal: events.signal },
  );

  /** @param {number} now */
  function tick(now) {
    if (!running || failed) return;
    try {
      // A hidden tab never advances an animation behind the player.
      const hidden = document.hidden;
      const dt = hidden ? 0 : Math.min((now - lastTime) / 1000, maxDelta);
      lastTime = now;
      if (!hidden) {
        elapsed += dt;
        update(dt, elapsed);
      }
      frame = requestAnimationFrame(tick);
    } catch (error) {
      failed = true;
      running = false;
      onError?.(error);
    }
  }

  return {
    get elapsed() {
      return elapsed;
    },
    start() {
      if (running || failed) return;
      running = true;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
    dispose() {
      this.stop();
      events.abort();
    },
  };
}
