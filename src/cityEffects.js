import { TILE_SIZE } from './mapLayout.js';

export const smoothStep = value => { const p=Math.max(0,Math.min(1,value));return p*p*(3-2*p); };
const LIGHT_RADIUS = TILE_SIZE * .72;

export function createCityLighting(focusX=0) {
  return { focusX:{value:focusX}, capture:{value:0}, radius:{value:LIGHT_RADIUS} };
}

export function getCityLightLevel(x,focusX=0) {
  const distance=(x-focusX)/LIGHT_RADIUS;
  return .24+.76*Math.exp(-.5*distance*distance);
}

/** Shared world-space gradient: even the two faces at a tile seam get the same light. */
export function applyCityLighting(material,lighting) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.cityFocusX=lighting.focusX;
    shader.uniforms.cityCapture=lighting.capture;
    shader.uniforms.cityLightRadius=lighting.radius;
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying float vCityWorldX;')
      .replace('#include <project_vertex>',`
        vec4 cityPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          cityPosition = instanceMatrix * cityPosition;
        #endif
        vCityWorldX = (modelMatrix * cityPosition).x;
        #include <project_vertex>
      `);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        varying float vCityWorldX;
        uniform float cityFocusX;
        uniform float cityCapture;
        uniform float cityLightRadius;
      `)
      .replace('#include <color_fragment>',`#include <color_fragment>
        float cityDistance = (vCityWorldX - cityFocusX) / cityLightRadius;
        float cityLevel = 0.24 + 0.76 * exp(-0.5 * cityDistance * cityDistance);
        diffuseColor.rgb *= mix(0.66, 1.0, cityLevel);
      `)
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        totalEmissiveRadiance *= cityLevel * (1.0 - 0.82 * cityCapture);
      `);
  };
  material.customProgramCacheKey=()=> 'city-distance-gradient-v1';
}

/** Base first, then buildings; reversing progress retracts objects before the base falls. */
export function getTileReveal(progress) {
  return { base:smoothStep(progress/.35), objects:Math.max(0,Math.min(1,(progress-.35)/.65)) };
}
