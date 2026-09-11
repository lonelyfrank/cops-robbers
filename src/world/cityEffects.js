import { TILE_SIZE } from './mapLayout.js';
import { applyShaderPatches } from '../rendering/shaderPatch.js';

export const smoothStep = (value) => {
  const p = Math.max(0, Math.min(1, value));
  return p * p * (3 - 2 * p);
};
const LIGHT_RADIUS = TILE_SIZE * 0.72;
/** Name reported if Three.js stops providing one of the chunks this effect injects into. */
const CITY_GRADIENT = 'city light gradient';

export function createCityLighting(focusX = 0) {
  return { focusX: { value: focusX }, capture: { value: 0 }, radius: { value: LIGHT_RADIUS } };
}

export function getCityLightLevel(x, focusX = 0) {
  const distance = (x - focusX) / LIGHT_RADIUS;
  return 0.24 + 0.76 * Math.exp(-0.5 * distance * distance);
}

/**
 * Shared world-space gradient: even the two faces at a tile seam get the same light.
 *
 * Upgrade-sensitive: it injects into the standard material chunks by exact text. The
 * guard reports a chunk that no longer exists instead of returning an unpatched shader.
 *
 * @param {import('three').Material} material
 * @param {ReturnType<typeof createCityLighting>} lighting
 */
export function applyCityLighting(material, lighting) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.cityFocusX = lighting.focusX;
    shader.uniforms.cityCapture = lighting.capture;
    shader.uniforms.cityLightRadius = lighting.radius;
    shader.vertexShader = applyShaderPatches(shader.vertexShader, CITY_GRADIENT, [
      ['#include <common>', '#include <common>\nvarying float vCityWorldX;'],
      [
        '#include <project_vertex>',
        `
        vec4 cityPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          cityPosition = instanceMatrix * cityPosition;
        #endif
        vCityWorldX = (modelMatrix * cityPosition).x;
        #include <project_vertex>
      `,
      ],
    ]);
    shader.fragmentShader = applyShaderPatches(shader.fragmentShader, CITY_GRADIENT, [
      [
        '#include <common>',
        `#include <common>
        varying float vCityWorldX;
        uniform float cityFocusX;
        uniform float cityCapture;
        uniform float cityLightRadius;
      `,
      ],
      [
        '#include <color_fragment>',
        `#include <color_fragment>
        float cityDistance = (vCityWorldX - cityFocusX) / cityLightRadius;
        float cityLevel = 0.24 + 0.76 * exp(-0.5 * cityDistance * cityDistance);
        diffuseColor.rgb *= mix(0.66, 1.0, cityLevel);
      `,
      ],
      [
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance *= cityLevel * (1.0 - 0.82 * cityCapture);
      `,
      ],
    ]);
  };
  material.customProgramCacheKey = () => 'city-distance-gradient-v1';
}

/** Base first, then buildings; reversing progress retracts objects before the base falls. */
export function getTileReveal(progress) {
  return {
    base: smoothStep(progress / 0.35),
    objects: Math.max(0, Math.min(1, (progress - 0.35) / 0.65)),
  };
}
