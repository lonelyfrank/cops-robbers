import * as THREE from 'three';
import { QUALITY_PRESETS, RENDERER } from '../config/rendering.js';

/**
 * The WebGL context, the scene container and the canvas size.
 *
 * It owns the renderer and the resize observation, and nothing about what is drawn.
 * The pixel ratio is capped by the quality preset, never raised from a user-agent check.
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} container Element whose box drives the canvas size.
 * @param {(width: number, height: number) => void} onResize
 * @param {import('../config/rendering.js').QualityPreset} [quality]
 */
export function createSceneRenderer(canvas, container, onResize, quality = QUALITY_PRESETS.high) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    // Antialiasing is fixed at context creation; changing it later needs a new context.
    antialias: quality.antialias,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDERER.exposure;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(RENDERER.background);
  scene.fog = new THREE.FogExp2(RENDERER.background, RENDERER.fogDensity);

  let width = 1,
    height = 1;
  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    onResize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  return {
    renderer,
    scene,
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    /**
     * Apply a new frame budget to what can change without a new context.
     * @param {import('../config/rendering.js').QualityPreset} next
     */
    setQuality(next) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, next.pixelRatio));
      renderer.shadowMap.enabled = next.shadows;
      renderer.setSize(width, height, false);
    },
    /** @param {THREE.Camera} camera */
    render(camera) {
      renderer.render(scene, camera);
    },
    dispose() {
      observer.disconnect();
      scene.clear();
      renderer.dispose();
    },
  };
}
