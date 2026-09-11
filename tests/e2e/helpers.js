/**
 * Shared setup for the browser checks.
 *
 * Outcomes come from `crypto.getRandomValues()`, so a deterministic run replaces that one
 * function before any script executes. Nothing in the shipped code knows about it: there
 * is no test hook in production.
 */

/** Uniform sample the game will read: 0 is always green, 0xffffffff is always red. */
export const ALWAYS_GREEN = 0;
export const ALWAYS_RED = 0xffffffff;

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} sample
 */
export async function seedOutcome(page, sample) {
  await page.addInitScript((value) => {
    const original = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    globalThis.crypto.getRandomValues = (array) => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = value;
        return array;
      }
      return original(array);
    };
  }, sample);
}

/**
 * Collect page errors and console errors, so a silent exception fails the check.
 * @param {import('@playwright/test').Page} page
 */
export function watchErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/**
 * Open the game and wait for the boot screen to hand over the controls.
 *
 * The default asks for the low preset: without a GPU the frame rate is what makes these
 * checks slow, and the preset itself is covered by the unit tests.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [query] Overrides the default query string entirely.
 */
export async function openGame(page, query = '?quality=low') {
  await page.goto(`/${query}`);
  await page.locator('#boot-screen').waitFor({ state: 'hidden', timeout: 60_000 });
  await page.locator('#main-button:not([disabled])').waitFor({ timeout: 60_000 });
}
