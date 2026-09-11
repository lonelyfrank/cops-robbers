import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  SHADER_MARKERS,
  applyShaderPatches,
  replaceShaderChunk,
} from '../src/rendering/shaderPatch.js';
import { applyCityLighting, createCityLighting } from '../src/world/cityEffects.js';
import { IntersectionTraffic } from '../src/world/TrafficController.js';

/**
 * These two effects patch Three.js shaders by exact text. If a release renames or
 * reorders a chunk the patch silently does nothing, so the markers are asserted against
 * the bundled version: bumping Three.js then fails here instead of on screen.
 */
test('Every shader chunk the project patches still exists in the bundled Three.js', () => {
  const sources = {
    standardVertex: THREE.ShaderLib.standard.vertexShader,
    standardFragment: THREE.ShaderLib.standard.fragmentShader,
    depthFragment: THREE.ShaderLib.depth.fragmentShader,
  };
  for (const [shader, markers] of Object.entries(SHADER_MARKERS))
    for (const marker of markers)
      assert.ok(
        sources[shader].includes(marker),
        `Three.js r${THREE.REVISION} no longer provides "${marker}" in ${shader}`,
      );
});

test('A missing chunk is reported, never applied silently', () => {
  const messages = [];
  const error = console.error;
  console.error = (message) => messages.push(message);
  try {
    const out = replaceShaderChunk('void main() {}', '#include <gone>', 'x', 'demo effect');
    assert.equal(out, 'void main() {}', 'the source is returned untouched');
    assert.equal(messages.length, 1);
    assert.match(messages[0], /demo effect/);
    assert.match(messages[0], /#include <gone>/);
  } finally {
    console.error = error;
  }
  // Under the dev server the same situation throws instead.
  assert.throws(
    () => replaceShaderChunk('void main() {}', '#include <gone>', 'x', 'demo', { strict: true }),
    /demo/,
  );
  assert.throws(
    () =>
      applyShaderPatches('void main() {}', 'demo', [['#include <gone>', 'x']], { strict: true }),
    /shader patch/,
  );
});

test('The city gradient and the traffic shadow fade really reach the compiled shader', () => {
  const lighting = createCityLighting();
  const material = new THREE.MeshStandardMaterial();
  applyCityLighting(material, lighting);
  // Three.js hands over the real program parameters; the patch only reads three fields.
  const shader = /** @type {any} */ ({
    uniforms: {},
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  });
  material.onBeforeCompile(shader, /** @type {any} */ ({}));
  assert.ok(shader.vertexShader.includes('vCityWorldX = (modelMatrix * cityPosition).x;'));
  assert.ok(shader.fragmentShader.includes('uniform float cityFocusX;'));
  assert.ok(shader.fragmentShader.includes('diffuseColor.rgb *= mix(0.66, 1.0, cityLevel);'));
  assert.ok(shader.fragmentShader.includes('totalEmissiveRadiance *= cityLevel'));
  // The gradient uniforms are the live objects the stream mutates, not copies.
  assert.equal(shader.uniforms.cityFocusX, lighting.focusX);
  assert.equal(shader.uniforms.cityCapture, lighting.capture);
  material.dispose();

  const traffic = new IntersectionTraffic(1);
  const depth = traffic.cars[0].depthMaterial;
  const depthShader = /** @type {any} */ ({
    uniforms: {},
    vertexShader: THREE.ShaderLib.depth.vertexShader,
    fragmentShader: THREE.ShaderLib.depth.fragmentShader,
  });
  depth.onBeforeCompile(depthShader, /** @type {any} */ ({}));
  assert.ok(depthShader.fragmentShader.includes('uniform float trafficOpacity;'));
  assert.ok(
    depthShader.fragmentShader.includes('vec4 diffuseColor = vec4(1.0, 1.0, 1.0, trafficOpacity);'),
  );
  // The opacity uniform reads the material live, so a fading car fades its shadow too.
  depth.opacity = 0.25;
  assert.equal(depthShader.uniforms.trafficOpacity.value, 0.25);
  traffic.dispose();
});
