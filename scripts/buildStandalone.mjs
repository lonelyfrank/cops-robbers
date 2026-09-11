import { build } from 'vite';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await build({
  root,
  configFile: false,
  base: './',
  build: {
    write: false,
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: Infinity,
    rollupOptions: { output: { inlineDynamicImports: true } },
    // This explicit single-file export intentionally includes all of Three.js.
    chunkSizeWarningLimit: 800,
  },
});
const builds = /** @type {import('rollup').RollupOutput[]} */ (
  Array.isArray(bundle) ? bundle : [bundle]
);
const output = builds.flatMap((item) => item.output);
const entry = output.find((item) => item.fileName === 'index.html');
if (!entry || entry.type !== 'asset') throw new Error('HTML di partenza non trovato.');
const decode = (value) => (typeof value === 'string' ? value : new TextDecoder().decode(value));
let html = decode(entry.source);
html = html.replace(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, path) => {
  const chunk = output.find((item) => item.fileName === path.replace(/^\.\//, ''));
  if (!chunk || chunk.type !== 'chunk') throw new Error(`Script mancante: ${path}`);
  return `<script type="module">${chunk.code.replace(/<\/script/gi, '<\\/script')}</script>`;
});
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, (tag) => {
  const path = tag.match(/href="([^"]+)"/)?.[1];
  const asset = output.find((item) => item.fileName === path?.replace(/^\.\//, ''));
  if (!asset || asset.type !== 'asset') throw new Error(`Stile mancante: ${path}`);
  return `<style>${decode(asset.source).replace(/<\/style/gi, '<\\/style')}</style>`;
});
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '');
if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html))
  throw new Error('La versione HTML contiene ancora dipendenze esterne.');
await writeFile(resolve(root, 'cops-and-robbers.html'), html);
console.log(`HTML autonomo creato: ${Math.round(Buffer.byteLength(html) / 1024)} KiB`);
