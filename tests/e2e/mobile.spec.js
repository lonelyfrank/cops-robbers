import { expect, test } from '@playwright/test';
import { ALWAYS_GREEN, ALWAYS_RED, openGame, seedOutcome, watchErrors } from './helpers.js';

// Exercise real touch input and the shared renderer/state machine. Shorter animations
// keep the software-rendered browser affordable; desktop covers normal motion too.
test.use({ reducedMotion: 'reduce' });

test('Portable console: menu, stake shortcuts, progression and cashout work by touch', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await seedOutcome(page, ALWAYS_GREEN);
  await openGame(page);
  await page.locator('#menu-button').tap();
  await expect(page.locator('#console-menu')).toBeVisible();
  await page.locator('#menu-rules').tap();
  await expect(page.locator('#console-menu')).toBeHidden();
  await expect(page.locator('#risk-table-body tr')).toHaveCount(12);
  await page.locator('#close-rules').tap();
  await page.locator('#menu-button').tap();
  await page.keyboard.press('Escape');
  await expect(page.locator('#console-menu')).toBeHidden();
  await expect(page.locator('#menu-button')).toBeFocused();

  await page.locator('[data-bet="increase"]').tap();
  await expect(page.locator('#bet-input')).toHaveValue('26,00');
  await page.locator('[data-bet="decrease"]').tap();
  await page.locator('[data-bet="half"]').tap();
  await expect(page.locator('#bet-input')).toHaveValue('12,50');
  await page.locator('[data-bet="double"]').tap();
  await expect(page.locator('#bet-input')).toHaveValue('25,00');
  await page.locator('[data-bet="max"]').tap();
  await expect(page.locator('#bet-input')).toHaveValue('1000,00');
  await page.locator('#bet-input').fill('25,00');
  await page.locator('[data-difficulty="hard"]').tap();
  await expect(page.locator('[data-difficulty="hard"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#main-button').tap();
  await expect(page.locator('#cashout-button')).toBeEnabled();
  await expect(page.locator('#balance')).toHaveText('975,00');
  await expect(page.locator('#potential')).toHaveText('25,26');
  await page.screenshot({ path: testInfo.outputPath('mobile-ready.png'), fullPage: true });
  await expect(page.locator('#multiplier-reel')).toHaveAttribute('data-current', '1,01');
  await page.locator('#main-button').tap();
  await expect(page.locator('#crossing-count')).toHaveText('02 / 12');
  await expect(page.locator('#camera-label')).toHaveText('CAM 03');
  await expect(page.locator('.route-step').nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#payout-multiplier')).toHaveText('1,18×');
  await expect(page.locator('#potential')).toHaveText('29,38');
  await page.locator('#cashout-button').tap();
  await expect(page.locator('#result-banner')).toBeVisible();
  await expect(page.locator('#balance')).toHaveText('1.004,38');
  await page.locator('#menu-button').tap();
  await page.locator('#menu-history').tap();
  await expect(page.locator('.history-section')).toHaveAttribute('open', '');
  await expect(page.locator('#history .history-card')).toBeVisible();
  await page.locator('#reset-button').tap();
  await expect(page.locator('#balance')).toHaveText('1.000,00');
  await expect(page.locator('#potential')).toHaveText('0,00');
  await expect(page.locator('#crossing-count')).toHaveText('00 / 12');
  expect(errors).toEqual([]);
});

test('Portable console: arrest, new run and reset retain the real balance', async ({ page }) => {
  const errors = watchErrors(page);
  await seedOutcome(page, ALWAYS_RED);
  await openGame(page);
  await page.locator('#main-button').tap();
  await expect(page.locator('#result-title')).toHaveText('BECCATO!');
  await expect(page.locator('#balance')).toHaveText('975,00');
  await expect(page.locator('#cashout-button')).toBeDisabled();
  await page.locator('#main-button').tap();
  await expect(page.locator('#balance')).toHaveText('950,00');
  await expect(page.locator('#main-button')).toBeEnabled();
  await page.locator('#menu-button').tap();
  await page.locator('#menu-history').tap();
  await expect(page.locator('#history .history-card')).toHaveCount(2);
  await page.locator('#reset-button').tap();
  await expect(page.locator('#balance')).toHaveText('1.000,00');
  await expect(page.locator('#bet-input')).toHaveValue('25,00');
  await expect(page.locator('#history .history-empty')).toBeVisible();
  expect(errors).toEqual([]);
});
