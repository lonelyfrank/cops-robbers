/**
 * Typed element lookups and one cancellable listener scope.
 *
 * The interface is plain DOM: no framework, no virtual tree. These helpers only remove
 * the repeated `getElementById` casts and keep every listener attached to a single
 * `AbortController`, so a remount can drop them all at once.
 */

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
export const el = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/**
 * @param {string} id
 * @returns {HTMLInputElement}
 */
export const inputEl = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id));

/**
 * @param {string} id
 * @returns {HTMLButtonElement}
 */
export const buttonEl = (id) => /** @type {HTMLButtonElement} */ (document.getElementById(id));

/**
 * @param {string} id
 * @returns {HTMLFieldSetElement}
 */
export const fieldsetEl = (id) => /** @type {HTMLFieldSetElement} */ (document.getElementById(id));

/**
 * @param {string} id
 * @returns {HTMLDialogElement}
 */
export const dialogEl = (id) => /** @type {HTMLDialogElement} */ (document.getElementById(id));

/**
 * @param {string} id
 * @returns {HTMLTimeElement}
 */
export const timeEl = (id) => /** @type {HTMLTimeElement} */ (document.getElementById(id));

/**
 * @param {string} id
 * @returns {HTMLFormElement}
 */
export const formEl = (id) => /** @type {HTMLFormElement} */ (document.getElementById(id));

/**
 * @param {string} selector
 * @returns {HTMLElement[]}
 */
export const queryAll = (selector) => [
  .../** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(selector)),
];

/**
 * @param {string} selector
 * @returns {HTMLElement}
 */
export const query = (selector) => /** @type {HTMLElement} */ (document.querySelector(selector));

/**
 * One abortable scope for every listener of a mount.
 * @returns {{ on: (target: EventTarget, type: string, handler: (event: any) => void) => void, abort: () => void }}
 */
export function createListenerScope() {
  const events = new AbortController();
  return {
    on: (target, type, handler) =>
      target.addEventListener(type, handler, { signal: events.signal }),
    abort: () => events.abort(),
  };
}
