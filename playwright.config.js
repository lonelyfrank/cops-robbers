import { defineConfig, devices } from '@playwright/test';

/**
 * Browser checks, deliberately kept out of `npm test`.
 *
 * The unit and jsdom suites run in about two seconds and need no browser download. These
 * need a real Chromium and a real WebGL context, so they are their own command
 * (`npm run test:e2e`) and their own CI job.
 *
 * **They are slow, and not because of the game.** Without a GPU — headless CI, this
 * machine included — Chromium rasterises in software and the scene runs at roughly two
 * frames per second. The simulation clamps a frame to 0.05 s so a stall cannot teleport
 * an animation, which means wall-clock time advances about ten times faster than the
 * animation: a 2,2 s arrest takes over twenty seconds to finish. The timeouts below are
 * sized for that, not for a healthy frame rate.
 *
 * One worker, always: several software-rendered WebGL contexts at once crash the
 * headless shell.
 */
const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 150_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /mobile\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-portrait',
      testMatch: /mobile\.spec\.js/,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
    },
    {
      // Layout only: the flows are already covered above, and repeating them here would
      // double the slowest part of the suite for no extra signal.
      name: 'mobile-landscape',
      testMatch: /layout\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 844, height: 390 } },
    },
  ],
  webServer: {
    // Bind explicitly: `localhost` can resolve to IPv6 only, which the baseURL is not.
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
