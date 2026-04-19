import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for PorcTrack 8 e2e tests.
 *
 * Le dev server Vite est lancé automatiquement via `webServer` si ce n'est
 * pas déjà le cas (reuseExistingServer). Les tests ciblent `localhost:5173`.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './playwright-artifacts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 390, height: 844 }, // iPhone-ish (app mobile Ionic)
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: '..',
  },
});
