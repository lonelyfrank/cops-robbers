/**
 * Frame timing and renderer counters, as plain numbers.
 *
 * Pure measurement: no DOM, no rendering. Whoever wants to show the figures reads
 * `sample`; an adaptive quality controller would read the same numbers and decide from
 * measured frame time — never from a user agent string.
 *
 * It keeps its own clock on purpose. The simulation clamps a long frame to 0.05 s so a
 * stall cannot teleport an animation, and reading that clamped delta would report a
 * healthy 20 FPS on a machine actually drawing three. The panel exists to expose exactly
 * that case, so it measures wall-clock time instead.
 */

/** Frames averaged before a reading is published. */
const WINDOW = 30;

/**
 * @typedef {object} PerformanceSample
 * @property {number} fps Frames per second over the averaging window.
 * @property {number} frameTime Milliseconds per frame over the same window.
 * @property {number} worstFrameTime Longest frame in the window, in milliseconds.
 * @property {number} calls Draw calls of the last frame.
 * @property {number} triangles Triangles of the last frame.
 * @property {number} geometries Geometries currently on the GPU.
 * @property {number} textures Textures currently on the GPU.
 * @property {number} programs Compiled shader programs, when the renderer exposes them.
 * @property {number} tiles Districts currently alive.
 * @property {number} instancedMeshes Instanced meshes in the scene.
 */

/**
 * @param {object} deps
 * @param {() => import('three').WebGLRenderer['info']} deps.getInfo
 * @param {() => number} deps.getTileCount
 * @param {() => number} deps.getInstancedMeshCount
 * @param {() => number} [deps.now] Injectable clock, in milliseconds.
 */
export function createPerformanceMonitor({
  getInfo,
  getTileCount,
  getInstancedMeshCount,
  now = () => performance.now(),
}) {
  let frames = 0;
  let accumulated = 0;
  let worst = 0;
  let last = now();
  /** @type {PerformanceSample} */
  let sample = {
    fps: 0,
    frameTime: 0,
    worstFrameTime: 0,
    calls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
    tiles: 0,
    instancedMeshes: 0,
  };

  return {
    get sample() {
      return sample;
    },
    /**
     * Call once per drawn frame.
     * @returns {boolean} Whether a new reading was published.
     */
    record() {
      const stamp = now();
      const ms = stamp - last;
      last = stamp;
      accumulated += ms;
      worst = Math.max(worst, ms);
      if (++frames < WINDOW) return false;
      const info = getInfo();
      sample = {
        fps: accumulated > 0 ? (frames * 1000) / accumulated : 0,
        frameTime: accumulated / frames,
        worstFrameTime: worst,
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0,
        tiles: getTileCount(),
        instancedMeshes: getInstancedMeshCount(),
      };
      frames = 0;
      accumulated = 0;
      worst = 0;
      return true;
    },
  };
}
