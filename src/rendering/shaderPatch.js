/**
 * Guarded string patching of Three.js shaders.
 *
 * `onBeforeCompile` with string replacement is the only way to inject the city light
 * gradient and the traffic shadow fade into the standard materials, but it depends on
 * the exact text of the built-in chunks. **This code is upgrade-sensitive**: a Three.js
 * release that renames or reorders a chunk silently produces a shader without the patch,
 * and the city lighting or the fading shadows quietly stop working.
 *
 * The guard turns that silence into a message. Every marker this project relies on is
 * listed in `SHADER_MARKERS` and checked against the bundled Three.js by the test suite,
 * so a version bump fails in CI instead of on screen.
 */

/** True only under the Vite dev server; `import.meta.env` is absent in Node and in tests. */
const IS_DEV = Boolean(import.meta.env?.DEV);

/**
 * Markers the project injects into, grouped by the shader they belong to.
 * Keep in step with the call sites; the shader test walks this table.
 */
export const SHADER_MARKERS = Object.freeze({
  standardVertex: Object.freeze(['#include <common>', '#include <project_vertex>']),
  standardFragment: Object.freeze([
    '#include <common>',
    '#include <color_fragment>',
    '#include <emissivemap_fragment>',
  ]),
  depthFragment: Object.freeze(['#include <common>', 'vec4 diffuseColor = vec4( 1.0 );']),
});

/**
 * Replace a shader chunk, refusing to fail silently.
 *
 * @param {string} source Shader source handed over by Three.js.
 * @param {string} marker Exact text to replace.
 * @param {string} replacement
 * @param {string} context Name of the effect, for the error message.
 * @param {{ strict?: boolean }} [options] `strict` throws instead of reporting.
 * @returns {string} The patched source, or the original when the marker is missing.
 */
export function replaceShaderChunk(source, marker, replacement, context, { strict = IS_DEV } = {}) {
  if (source.includes(marker)) return source.replace(marker, replacement);
  const message =
    `Three.js shader patch "${context}" found no "${marker}". ` +
    'The bundled Three.js version probably changed its shader chunks: ' +
    'update the patch in the module that reported this, not the pinned version.';
  if (strict) throw new Error(message);
  console.error(message);
  return source;
}

/**
 * Apply several guarded replacements to one shader, in order.
 *
 * @param {string} source
 * @param {string} context Name of the effect, for the error message.
 * @param {[marker: string, replacement: string][]} patches
 * @param {{ strict?: boolean }} [options]
 * @returns {string}
 */
export function applyShaderPatches(source, context, patches, options) {
  let patched = source;
  for (const [marker, replacement] of patches)
    patched = replaceShaderChunk(patched, marker, replacement, context, options);
  return patched;
}
