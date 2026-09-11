import { CAMERA } from '../config/rendering.js';
import { CityStream } from '../world/CityStream.js';
import { getCrossingX, getStopX } from '../world/mapLayout.js';
import { retainVoxelAssets } from './voxelModels.js';
import { createCameraController } from './CameraController.js';
import { createCaptureEffects } from './CaptureEffects.js';
import { createLightingSystem } from './LightingSystem.js';
import { createSceneRenderer } from './SceneRenderer.js';
import { createWorldIndicators } from './WorldIndicators.js';

/**
 * Composition of the rendering layer.
 *
 * Each system owns one concern — context, camera, lights, markings, capture — and this
 * function only orders them per frame. It produces no DOM: the capture overlay is
 * exposed as state and applied by whoever owns the page.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} container
 * @param {{ motion?: import('../core/types.js').MotionPreference }} [options]
 */
export function createScene(canvas, container, { motion = { reduced: false } } = {}) {
  let disposed = false;
  const camera = createCameraController();
  const view = createSceneRenderer(canvas, container, camera.resize);
  const releaseVoxelAssets = retainVoxelAssets();
  const lighting = createLightingSystem(view.scene);
  const capture = createCaptureEffects(view.scene);
  const stream = new CityStream(view.scene, { reducedMotion: motion.reduced });
  const indicators = createWorldIndicators(view.scene, camera.offset);

  let followX = getStopX(0);
  /** @type {{ root: import('three').Object3D } | null} */
  let thief = null;

  /** @param {import('../core/types.js').CityThemeId} [themeId] */
  function reset(themeId = stream.theme.id) {
    stream.reset(themeId);
    lighting.applyTheme(stream.theme);
    followX = getStopX(0);
    camera.reset();
    capture.reset();
  }

  /**
   * @param {number} dt
   * @param {number} elapsed
   */
  function update(dt, elapsed) {
    if (disposed) return;
    const reducedMotion = motion.reduced;
    stream.reducedMotion = reducedMotion;
    if (thief) stream.setPlayerX(thief.root.position.x);
    stream.update(dt);

    const occupiedX = getCrossingX(stream.current);
    const lightX = stream.lighting.focusX.value;
    const dimming = stream.lighting.capture.value;
    const caught = stream.caught;

    // Camera movement is continuous; district roles change at the road connector.
    const factor = reducedMotion ? 1 : 1 - Math.exp(-dt * CAMERA.response);
    camera.update({
      targetX: caught && thief ? thief.root.position.x : followX,
      factor,
      tighten: caught && !reducedMotion,
    });
    lighting.update({
      lightX,
      occupiedX,
      capture: dimming,
      signal: stream.activeTile.signal,
      theme: stream.theme,
    });
    capture.update({ occupiedX, elapsed, caught, reducedMotion });
    indicators.update({
      thief,
      caught,
      reducedMotion,
      elapsed,
      targetTile: stream.tiles.get(indicators.targetCrossing)?.tile,
    });
    view.render(camera.camera);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stream.dispose();
    // Explicitly owned meshes; the shared pool is released only after its last scene.
    indicators.dispose();
    lighting.dispose();
    // Release the shared pool while the renderer can still free its GPU buffers.
    releaseVoxelAssets();
    view.dispose();
  }

  reset();
  return {
    scene: view.scene,
    camera: camera.camera,
    renderer: view.renderer,
    stream,
    get reducedMotion() {
      return motion.reduced;
    },
    /** Overlay state produced by the last frame; the DOM is never touched here. */
    get capture() {
      return capture.state;
    },
    reset,
    update,
    dispose,
    /** @param {import('../core/types.js').GamePhase} value */
    setPhase(value) {
      if (['idle', 'running', 'ready', 'escaping'].includes(value)) stream.setCaught(false);
      else if (value === 'caught') stream.setCaught(true);
      // Keep blue capture flashes through a losing result, until replay/reset.
    },
    /** @param {import('../core/types.js').GameSnapshot} s */
    setCrossingTarget: (s) => indicators.setCrossingTarget(s),
    /** @param {number | null} n */
    setMovement: (n) => stream.setMovement(n),
    /** @param {{ root: import('three').Object3D }} actor */
    setThief: (actor) => {
      thief = actor;
    },
    /** @param {number} x */
    follow: (x) => {
      followX = x;
    },
  };
}
