import * as THREE from 'three';
import { RENDERER } from '../config/rendering.js';

/**
 * The WebGL context, the scene container and the canvas size.
 *
 * It owns the renderer and the resize observation, and nothing about what is drawn.
 * The pixel ratio is capped from configuration, never from a user-agent check.
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} container Element whose box drives the canvas size.
 * @param {(width: number, height: number) => void} onResize
 */
export function createSceneRenderer(canvas, container, onResize) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: RENDERER.antialias,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDERER.pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDERER.exposure;
  renderer.shadowMap.enabled = RENDERER.shadows;
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
