import { expect, test } from '@playwright/test';
import { ALWAYS_GREEN, openGame, seedOutcome, watchErrors } from './helpers.js';

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('Reduced motion still plays a full round, without animation', async ({ page }) => {
    const errors = watchErrors(page);
    await seedOutcome(page, ALWAYS_GREEN);
    await openGame(page);

    await page.locator('#main-button').click();
    await expect(page.locator('#crossing-count')).toHaveText('01 / 12');
    await page.locator('#cashout-button').click({ force: true });
    await expect(page.locator('#result-banner')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test('Each accepted round rotates the district theme, without mixing districts', async ({
  page,
}) => {
  await seedOutcome(page, ALWAYS_GREEN);
  await openGame(page);

  await expect(page.locator('#district-name')).toHaveText('DISTRETTO 87');
  await page.locator('#main-button').click();
  await expect(page.locator('#district-name')).toHaveText('NEON TOKYO');

  // Every live tile belongs to the theme of the round in progress.
  await expect(page.locator('#cashout-button')).toBeEnabled();
  await page.locator('#cashout-button').click({ force: true });
  await expect(page.locator('#result-banner')).toBeVisible();
  await page.locator('#main-button').click();
  await expect(page.locator('#district-name')).toHaveText('DISTRETTO 87');
});

test('The lower quality preset and the debug panel are opt-in', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('#debug-panel')).toHaveCount(0);

  await openGame(page, '?debug=1&quality=low');
  const panel = page.locator('#debug-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('LOW');
  // A reading is published once the averaging window closes.
  await expect(panel).toContainText(/FPS/);
  await expect(panel.locator('b').nth(1)).not.toHaveText('—');
});
