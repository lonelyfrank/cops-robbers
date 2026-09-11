import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;

/** @returns {string[]} Every .js file under src/, as paths relative to src/. */
function sources(dir = SRC) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return entry.name.endsWith('.js') ? [relative(SRC, full)] : [];
  });
}

const IMPORT = /(?:from\s+'|import\('|import\s+')(\.{1,2}\/[^']+)'/g;

/** @param {string} file Path relative to src/. */
function importsOf(file) {
  const text = readFileSync(join(SRC, file), 'utf8');
  return [...text.matchAll(IMPORT)]
    .map((m) => relative(SRC, resolve(dirname(join(SRC, file)), m[1])))
    .filter((target) => target.endsWith('.js'));
}

const layerOf = (file) => file.split('/')[0];

/**
 * These are the boundaries docs/ARCHITECTURE.md promises. They are cheap to check and
 * expensive to notice by eye, so they are asserted rather than only written down.
 */
test('core/ stays pure: it never imports a layer that owns a screen or a scene', () => {
  const forbidden = new Set(['ui', 'world', 'rendering', 'runtime', 'actors']);
  for (const file of sources().filter((f) => layerOf(f) === 'core'))
    for (const target of importsOf(file))
      assert.ok(
        !forbidden.has(layerOf(target)),
        `${file} imports ${target}: core must not depend on ${layerOf(target)}/`,
      );
});

test('Only the interface reaches into the page', () => {
  const allowed = new Set(['ui', 'main.js']);
  const offenders = [];
  for (const file of sources()) {
    if (allowed.has(layerOf(file))) continue;
    const text = readFileSync(join(SRC, file), 'utf8');
    // Comments describe the rule; only real calls count.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    if (/document\.getElementById|document\.querySelector/.test(code)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], 'these modules look up page elements outside ui/');
});

test('The world and the actors never touch the document at all', () => {
  const offenders = [];
  for (const file of sources().filter((f) => ['world', 'actors'].includes(layerOf(f)))) {
    const code = readFileSync(join(SRC, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    // Property access only: 'window' is also the name of a voxel material for shop fronts.
    if (/\b(?:document|window)\s*[.[]/.test(code)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('Rendering draws offscreen only: no page element lookups', () => {
  for (const file of sources().filter((f) => layerOf(f) === 'rendering')) {
    const code = readFileSync(join(SRC, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    const calls = [...code.matchAll(/document\.(\w+)/g)].map((m) => m[1]);
    for (const call of calls) assert.equal(call, 'createElement', `${file} calls document.${call}`);
  }
});

test('config/ holds values: it depends on the map coordinates and on types, nothing else', () => {
  // core/types.js emits no runtime code; referencing it costs nothing at build time.
  const allowed = new Set(['world/mapLayout.js', 'core/types.js']);
  for (const file of sources().filter((f) => layerOf(f) === 'config'))
    for (const target of importsOf(file))
      assert.ok(
        allowed.has(target),
        `${file} imports ${target}: configuration must not depend on behaviour`,
      );
});

test('Every source file is reachable from the entry point', () => {
  const all = new Set(sources());
  const seen = new Set();
  const queue = ['main.js'];
  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    for (const target of importsOf(file)) if (all.has(target)) queue.push(target);
  }
  // types.js is JSDoc-only, so nothing imports it at runtime.
  const orphans = [...all].filter((file) => !seen.has(file) && file !== 'core/types.js');
  assert.deepEqual(orphans, [], 'dead modules: nothing reaches them from main.js');
});
