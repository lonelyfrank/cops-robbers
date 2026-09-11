/**
 * Performance readout, off unless the page is opened with `?debug=1`.
 *
 * It builds its own element and carries its own styles, so neither the production markup
 * nor the shared stylesheets know about it. It writes text only when a new reading
 * arrives — once every thirty frames — so having it open does not meaningfully change
 * what it measures.
 */

/** Self-contained, to keep the panel out of the two shared stylesheets. */
const PANEL_STYLE = [
  'position:fixed',
  'right:12px',
  'bottom:12px',
  'z-index:999',
  'display:grid',
  'gap:2px 12px',
  'padding:10px 12px',
  'border:1px solid rgba(140,190,255,.35)',
  'border-radius:8px',
  'background:rgba(6,14,30,.86)',
  'color:#cfe4ff',
  'font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',
  'letter-spacing:.04em',
  'pointer-events:none',
  'text-transform:uppercase',
].join(';');

const ROW_STYLE = 'display:flex;gap:12px;justify-content:space-between';

const ROWS = /** @type {const} */ ([
  ['fps', 'FPS', (v) => v.toFixed(0)],
  ['frameTime', 'Frame', (v) => `${v.toFixed(2)} ms`],
  ['worstFrameTime', 'Peggiore', (v) => `${v.toFixed(2)} ms`],
  ['calls', 'Draw call', String],
  ['triangles', 'Triangoli', (v) => v.toLocaleString('it-IT')],
  ['geometries', 'Geometrie', String],
  ['textures', 'Texture', String],
  ['programs', 'Programmi', String],
  ['tiles', 'Tile vive', String],
  ['instancedMeshes', 'InstancedMesh', String],
]);

/**
 * @param {{ quality: string }} options
 */
export function createDebugPanel({ quality }) {
  const panel = document.createElement('aside');
  panel.id = 'debug-panel';
  panel.className = 'debug-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.style.cssText = PANEL_STYLE;
  const title = document.createElement('strong');
  title.style.cssText = 'color:#9fe870;margin-bottom:4px';
  title.textContent = `DIAGNOSTICA · ${quality.toLocaleUpperCase('it-IT')}`;
  panel.appendChild(title);

  /** @type {Map<string, HTMLElement>} */
  const values = new Map();
  for (const [key, label] of ROWS) {
    const row = document.createElement('div');
    row.style.cssText = ROW_STYLE;
    const name = document.createElement('span');
    name.style.opacity = '0.65';
    name.textContent = label;
    const value = document.createElement('b');
    value.textContent = '—';
    row.append(name, value);
    panel.appendChild(row);
    values.set(key, value);
  }
  document.body.appendChild(panel);

  return {
    /** @param {import('../../rendering/PerformanceMonitor.js').PerformanceSample} sample */
    render(sample) {
      for (const [key, , format] of ROWS) {
        const element = values.get(key);
        if (element) element.textContent = format(sample[key]);
      }
    },
    dispose() {
      panel.remove();
    },
  };
}
