import { expect, test } from '@playwright/test';
import { ALWAYS_GREEN, ALWAYS_RED, openGame, seedOutcome, watchErrors } from './helpers.js';

test('The city boots over WebGL and hands over the controls', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);

  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#balance')).toHaveText('1.000,00');
  await expect(page.locator('#cashout-button')).toBeDisabled();
  // A real context, not the fallback message.
  await expect(page.locator('#webgl-error')).toBeHidden();
  const drawn = await page.evaluate(() => {
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
    return { width: canvas.width, height: canvas.height };
  });
  expect(drawn.width).toBeGreaterThan(0);
  expect(drawn.height).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('A green crossing advances the route and offers the cashout', async ({ page }) => {
  const errors = watchErrors(page);
  await seedOutcome(page, ALWAYS_GREEN);
  await openGame(page);

  await page.locator('#main-button').click();
  await expect(page.locator('#crossing-count')).toHaveText('01 / 12');
  await expect(page.locator('#cashout-button')).toBeEnabled();
  await expect(page.locator('#payout-preview')).toBeVisible();
  await expect(page.locator('.route-step').first()).toHaveClass(/is-current/);
  expect(errors).toEqual([]);
});

test('Cashing out credits the round once and ends it', async ({ page }) => {
  await seedOutcome(page, ALWAYS_GREEN);
  await openGame(page);

  await page.locator('#main-button').click();
  await expect(page.locator('#cashout-button')).toBeEnabled();
  await page.locator('#cashout-button').click({ force: true });

  await expect(page.locator('#result-banner')).toBeVisible();
  await expect(page.locator('#result-title')).toContainText('+');
  await expect(page.locator('#history .history-card')).toHaveCount(1);
  await expect(page.locator('#balance')).not.toHaveText('1.000,00');
});

test('A red light ends the round with an arrest and no payout', async ({ page }) => {
  await seedOutcome(page, ALWAYS_RED);
  await openGame(page);

  await page.locator('#main-button').click();
  await expect(page.locator('#result-title')).toHaveText('BECCATO!');
  await expect(page.locator('#result-banner')).toHaveClass(/lost/);
  await expect(page.locator('#balance')).toHaveText('975,00');
  await expect(page.locator('.route-step').first()).toHaveClass(/is-caught/);
});

test('A new round starts after a result, and reset restores the demo', async ({ page }) => {
  await seedOutcome(page, ALWAYS_RED);
  await openGame(page);

  await page.locator('#main-button').click();
  await expect(page.locator('#result-banner')).toBeVisible();
  await expect(page.locator('#main-button')).toBeEnabled();

  await page.locator('#reset-button').click();
  await expect(page.locator('#balance')).toHaveText('1.000,00');
  await expect(page.locator('#bet-input')).toHaveValue('25,00');
  await expect(page.locator('#history .history-empty')).toBeVisible();
});

test('The rules dialog shows the whole curve and closes again', async ({ page }) => {
  await openGame(page);

  await page.locator('#rules-button').click();
  const dialog = page.locator('#rules-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#risk-table-body tr')).toHaveCount(12);
  await page.locator('#close-rules').click();
  await expect(dialog).toBeHidden();
});

test('The stake field rejects an invalid amount and blocks the run', async ({ page }) => {
  await openGame(page);

  await page.locator('#bet-input').fill('abc');
  await expect(page.locator('#bet-error')).not.toBeEmpty();
  await expect(page.locator('#bet-input')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#main-button')).toBeDisabled();

  await page.locator('#bet-input').fill('50,00');
  await expect(page.locator('#bet-error')).toBeEmpty();
  await expect(page.locator('#main-button')).toBeEnabled();
});
