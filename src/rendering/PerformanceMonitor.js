/**
 * Frame timing and renderer counters, as plain numbers.
 *
 * Pure measurement: no DOM, no rendering. Whoever wants to show the figures reads
 * `sample()`; an adaptive quality controller would read the same numbers and decide from
 * measured frame time — never from a user agent string.
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
 */
export function createPerformanceMonitor({ getInfo, getTileCount, getInstancedMeshCount }) {
  let frames = 0;
  let accumulated = 0;
  let worst = 0;
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
     * @param {number} dt Seconds of the frame just drawn.
     * @returns {boolean} Whether a new reading was published.
     */
    record(dt) {
      const ms = dt * 1000;
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
