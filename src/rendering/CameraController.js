import * as THREE from 'three';
import { CAMERA } from '../config/rendering.js';

/**
 * The isometric orthographic camera.
 *
 * The follow is continuous and slightly ahead of the thief, so district roles can change
 * at a road connector without the frame jumping. Reduced motion snaps instead of easing.
 */
export function createCameraController() {
  const camera = new THREE.OrthographicCamera(-40, 40, 20, -20, 0.1, 190);
  const offset = new THREE.Vector3(...CAMERA.offset);
  const focus = new THREE.Vector3(0, 1.1, 1.1);

  return {
    camera,
    offset,
    /**
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
      const aspect = width / height;
      // A tighter crop fills the CCTV monitor while retaining the isometric angle.
      const viewHeight = Math.max(CAMERA.monitorViewHeight, CAMERA.monitorMinViewWidth / aspect);
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    },
    reset() {
      focus.set(0, 1.1, 1.1);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
    },
    /**
     * @param {object} frame
     * @param {number} frame.targetX World position the camera should settle on.
     * @param {number} frame.factor Interpolation factor for this frame, already eased.
     * @param {boolean} frame.tighten Pull in slightly, as the arrest ring closes.
     */
    update({ targetX, factor, tighten }) {
      focus.x += (targetX + CAMERA.focusAhead - focus.x) * factor;
      const zoomTarget = tighten ? CAMERA.captureZoom : 1;
      const zoom = camera.zoom + (zoomTarget - camera.zoom) * factor;
      if (Math.abs(zoom - camera.zoom) > 0.00001) {
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
      }
      camera.position.copy(focus).add(offset);
      camera.lookAt(focus);
      camera.updateMatrixWorld();
    },
  };
}
