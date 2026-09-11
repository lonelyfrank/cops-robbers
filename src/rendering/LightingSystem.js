import * as THREE from 'three';
import { CAPTURE, LIGHTING } from '../config/rendering.js';
import { MAIN_ROAD_Z } from '../mapLayout.js';

/**
 * Lights of the occupied district.
 *
 * The count is fixed: one hemisphere, one rim, one warm key with the only shadow map,
 * four warm fills and one signal lamp. They are repositioned as the city advances, never
 * created or destroyed, so the shader programs stay compiled.
 */

/** @param {THREE.Scene} scene */
export function createLightingSystem(scene) {
  // Cool ambient light keeps adjacent streets readable; the warm key marks the active district.
  scene.add(
    new THREE.HemisphereLight(LIGHTING.ambientSky, LIGHTING.ambientGround, LIGHTING.ambientPower),
  );
  const rim = new THREE.DirectionalLight(LIGHTING.rimColor, LIGHTING.rimPower);
  rim.position.set(4, 18, -12);
  scene.add(rim);

  const key = new THREE.SpotLight(
    LIGHTING.keyColor,
    LIGHTING.keyPower,
    LIGHTING.keyRange,
    LIGHTING.keyAngle,
    1,
    2,
  );
  key.castShadow = true;
  key.shadow.mapSize.set(LIGHTING.shadowSize, LIGHTING.shadowSize);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = LIGHTING.shadowFar;
  key.shadow.normalBias = LIGHTING.shadowNormalBias;
  key.shadow.bias = LIGHTING.shadowBias;
  scene.add(key, key.target);

  const warmLights = Array.from({ length: LIGHTING.warmOffsets.length }, () => {
    const light = new THREE.PointLight(LIGHTING.warmColor, 0, LIGHTING.warmRange, 2);
    scene.add(light);
    return light;
  });
  const signalLight = new THREE.PointLight(0xffba39, 0, LIGHTING.signalRange, 2);
  scene.add(signalLight);

  return {
    key,
    warmLights,
    signalLight,
    /**
     * Adopt the palette of a city theme. Called once per round, not per frame.
     * @param {{ keyColor: number, warmColor: number, accentColor: number }} theme
     */
    applyTheme(theme) {
      key.color.set(theme.keyColor);
      warmLights.forEach((light, i) =>
        light.color.set(i % 2 ? theme.accentColor : theme.warmColor),
      );
    },
    /**
     * @param {object} frame
     * @param {number} frame.lightX World position of the light focus.
     * @param {number} frame.occupiedX World position of the occupied junction.
     * @param {number} frame.capture Capture dimming in 0…1.
     * @param {import('../core/types.js').TrafficSignalState} frame.signal
     * @param {{ keyPower: number, fillPower?: number, fillHeight?: number }} frame.theme
     */
    update({ lightX, occupiedX, capture, signal, theme }) {
      const dim = 1 - CAPTURE.dimming * capture;
      key.position.set(lightX - 3, 23, 1);
      key.target.position.set(lightX, 0, 0);
      key.intensity = theme.keyPower * dim;
      for (let i = 0; i < warmLights.length; i++) {
        const [dx, dz] = LIGHTING.warmOffsets[i];
        warmLights[i].position.set(lightX + dx, theme.fillHeight ?? LIGHTING.warmHeight, dz);
        warmLights[i].intensity = (theme.fillPower ?? LIGHTING.warmPower) * dim;
      }
      signalLight.position.set(occupiedX + 3.72, 2.8, MAIN_ROAD_Z - 3.1);
      signalLight.color.set(signal === 'green' ? 0x8bff7e : signal === 'red' ? 0xff365b : 0xffbd3f);
      signalLight.intensity = signal === 'off' ? 0 : LIGHTING.signalPower;
    },
    dispose() {
      key.shadow.dispose();
    },
  };
}
