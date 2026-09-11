import { expect, test } from '@playwright/test';
import { openGame } from './helpers.js';

test('No layout overflows horizontally, on either viewport', async ({ page }) => {
  await openGame(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Every control must stay inside the viewport, not only the page box.
  const offscreen = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return [...document.querySelectorAll('button, input')]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.left < -1 || box.right > width + 1);
      })
      .map((element) => element.id || element.className);
  });
  expect(offscreen).toEqual([]);
});
