import * as THREE from 'three';
import { MAX_CROSSINGS } from '../config/gameplay.js';
import { getMultiplier } from '../gameMath.js';
import { formatMultiplier } from '../format.js';
import { getCrossingX, MAIN_ROAD_Z } from '../mapLayout.js';

/**
 * The two markings drawn on the world itself: the diamond under the thief and the
 * multiplier painted between the crosswalks.
 *
 * The decal is a canvas texture on the asphalt plane, occluded like any other mesh. Its
 * baseline is parallel to the camera's right axis, so the number reads horizontally
 * without floating above the scene.
 */

const DECAL_WIDTH = 1024;
const DECAL_HEIGHT = 512;

/**
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} cameraOffset
 */
export function createWorldIndicators(scene, cameraOffset) {
  const indicator = new THREE.Mesh(
    new THREE.RingGeometry(0.67, 0.79, 4),
    new THREE.MeshBasicMaterial({
      color: 0xd6efae,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  indicator.rotation.x = -Math.PI / 2;
  indicator.rotation.z = Math.PI / 4;
  scene.add(indicator);

  const canvas = document.createElement('canvas');
  canvas.width = DECAL_WIDTH;
  canvas.height = DECAL_HEIGHT;
  const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 2.6),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  decal.name = 'road-multiplier';
  decal.rotation.x = -Math.PI / 2;
  decal.rotation.z = Math.atan2(cameraOffset.x, cameraOffset.z);
  decal.visible = false;
  scene.add(decal);

  let targetCrossing = 1;
  let painted = '';

  return {
    indicator,
    decal,
    get targetCrossing() {
      return targetCrossing;
    },
    /**
     * Repaint the decal only when the printed value actually changes.
     * @param {import('../core/types.js').GameSnapshot} s
     */
    setCrossingTarget(s) {
      targetCrossing = Math.min(s.crossing + 1, MAX_CROSSINGS);
      decal.visible = s.crossing < MAX_CROSSINGS && !['escaping', 'result'].includes(s.phase);
      const text = `${formatMultiplier(getMultiplier(targetCrossing, s.difficulty))}×`;
      if (text === painted) return;
      painted = text;
      context.clearRect(0, 0, DECAL_WIDTH, DECAL_HEIGHT);
      context.font = 'bold 360px Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#c9f57a';
      context.fillText(text, DECAL_WIDTH / 2, DECAL_HEIGHT / 2, 940);
      texture.needsUpdate = true;
    },
    /**
     * @param {object} frame
     * @param {{ root: THREE.Object3D } | null} frame.thief
     * @param {boolean} frame.caught
     * @param {boolean} frame.reducedMotion
     * @param {number} frame.elapsed
     * @param {{ root: THREE.Object3D, reveal: number } | undefined} frame.targetTile
     */
    update({ thief, caught, reducedMotion, elapsed, targetTile }) {
      if (thief) {
        const material = /** @type {THREE.MeshBasicMaterial} */ (indicator.material);
        indicator.visible = thief.root.visible && thief.root.position.y < 1.5;
        indicator.position.set(thief.root.position.x, 0.143, thief.root.position.z);
        material.color.set(caught ? 0x6aa5ff : 0xc9ef9b);
        material.opacity = reducedMotion ? 0.55 : 0.43 + Math.sin(elapsed * 2) * 0.1;
      }
      decal.position.set(
        getCrossingX(targetCrossing),
        0.16 + (targetTile?.root.position.y ?? 0),
        MAIN_ROAD_Z,
      );
      /** @type {THREE.MeshBasicMaterial} */ (decal.material).opacity = targetTile?.reveal ?? 0;
    },
    dispose() {
      for (const mesh of [indicator, decal]) {
        mesh.geometry.dispose();
        /** @type {THREE.Material} */ (mesh.material).dispose();
      }
      texture.dispose();
    },
  };
}
