/**
 * Minimal DOM harness for the console tests.
 *
 * The real `index.html` is parsed by jsdom, so the tests exercise the same markup the
 * browser gets. jsdom 30 does not implement a few APIs the interface uses; each stub
 * below is the smallest stand-in that keeps the behaviour under test observable.
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

/** Keys copied onto globalThis so the browser modules find their globals. */
const GLOBAL_KEYS = [
  'window',
  'document',
  // The listener scope builds an AbortController; jsdom only accepts its own signal.
  'AbortController',
  'AbortSignal',
  'Node',
  'Element',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'CustomEvent',
  'Event',
  'MouseEvent',
  'getComputedStyle',
];

/**
 * @returns {{ window: any, document: any, motion: any, cleanup: () => void }}
 */
export function mountDom() {
  const dom = new JSDOM(indexHtml, { url: 'https://example.test/' });
  const { window } = dom;

  // Not implemented by jsdom: the reel animates, the CAM strip scrolls, the rules
  // dialog is a real <dialog>. The stubs keep their observable effects.
  window.Element.prototype.animate = function () {
    return { cancel() {}, finished: Promise.resolve(), playState: 'finished' };
  };
  window.Element.prototype.scrollTo = function () {};
  const dialog = window.HTMLDialogElement.prototype;
  dialog.showModal = function () {
    this.open = true;
  };
  dialog.close = function () {
    this.open = false;
  };
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });

  const saved = new Map();
  for (const key of GLOBAL_KEYS) {
    saved.set(key, Reflect.get(globalThis, key));
    Reflect.set(globalThis, key, window[key]);
  }

  return {
    window,
    document: window.document,
    /** Reduced motion off, with a no-op subscription, as on a normal desktop. */
    motion: { reduced: false, subscribe: () => () => {} },
    cleanup() {
      for (const [key, value] of saved)
        if (value === undefined) Reflect.deleteProperty(globalThis, key);
        else Reflect.set(globalThis, key, value);
      window.close();
    },
  };
}

/** @param {any} element */
export const click = (element) =>
  element.dispatchEvent(new globalThis.window.MouseEvent('click', { bubbles: true }));

/**
 * @param {any} element
 * @param {string} value
 */
export function type(element, value) {
  element.value = value;
  element.dispatchEvent(new globalThis.window.Event('input', { bubbles: true }));
}

/** @param {any} form */
export const submit = (form) =>
  form.dispatchEvent(new globalThis.window.Event('submit', { bubbles: true, cancelable: true }));
