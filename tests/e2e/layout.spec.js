import { expect, test } from '@playwright/test';
import { openGame, watchErrors } from './helpers.js';

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

test('CCTV panels fit desktop targets and stack on portrait mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Viewport matrix runs once.');
  const errors = watchErrors(page);
  await openGame(page);
  for (const [width, height] of [
    [390, 844],
    [360, 800],
    [375, 812],
    [412, 915],
    [430, 932],
    [320, 740],
    [1920, 1080],
    [1600, 900],
    [1440, 900],
    [1366, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: testInfo.outputPath(`console-${width}.png`), fullPage: true });
    const layout = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
      return {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        monitor: rect('.monitor-shell'),
        reel: rect('.multiplier-reel'),
        panel: rect('.board-console'),
        caption: rect('.action-caption'),
        difficulty: rect('.difficulty-options'),
        gate: rect('.gate-display'),
        payout: rect('#payout-preview'),
        route: rect('.route-area'),
        run: rect('#main-button'),
        cashout: rect('#cashout-button'),
      };
    });
    expect(layout.width, `${width}: horizontal overflow`).toBeLessThanOrEqual(width);
    expect(layout.caption.bottom, `${width}: controls overflow panel`).toBeLessThanOrEqual(
      layout.panel.bottom,
    );
    expect(layout.difficulty.bottom, `${width}: difficulty overflows panel`).toBeLessThanOrEqual(
      layout.panel.bottom,
    );
    expect(layout.run.height).toBeGreaterThanOrEqual(44);
    expect(layout.cashout.height).toBeGreaterThanOrEqual(44);
    if (width >= 900) {
      expect(layout.height, `${width}: vertical overflow`).toBeLessThanOrEqual(height);
      expect(layout.monitor.right).toBeLessThan(layout.panel.left);
      expect(layout.reel.bottom).toBeLessThanOrEqual(layout.monitor.top);
      expect(layout.route.top).toBeGreaterThan(layout.panel.bottom);
    } else {
      expect(layout.monitor.top).toBeGreaterThan(layout.reel.bottom);
      expect(layout.panel.top).toBeGreaterThan(layout.monitor.bottom);
      expect(layout.run.top).toBeGreaterThan(layout.difficulty.bottom);
      expect(layout.run.top).toBeGreaterThan(layout.payout.bottom);
      expect(layout.cashout.top).toBeGreaterThan(layout.run.bottom);
      expect(layout.run.width).toBeGreaterThan(width * 0.8);
      expect(layout.route.top).toBeGreaterThan(layout.panel.bottom);
      const badTargets = await page.evaluate(() =>
        [...document.querySelectorAll('button, input, summary')]
          .filter((element) => {
            const { width, height, left, right } = element.getBoundingClientRect();
            return width > 0 && (width < 44 || height < 44 || left < 0 || right > innerWidth);
          })
          .map((element) => element.id || element.tagName),
      );
      expect(badTargets, `${width}: touch targets`).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});
