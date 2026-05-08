import { defineConfig, devices } from '@playwright/test';

/**
 * PorcTrack 8 — Playwright config (E2E scénarios métier critiques)
 *
 * Ciblé sur les 3 tests métier critiques v3.0.0 :
 *   - tests/playwright/auth-onboarding-flow.spec.ts
 *   - tests/playwright/saillie-complete-flow.spec.ts
 *   - tests/playwright/multi-user-rls.spec.ts (SQL pur, pas de browser)
 *
 * Cohabite avec tests/playwright.config.ts (suite e2e legacy) sans la
 * remplacer. Les tests sont idempotents (cleanup obligatoire).
 *
 * Pré-requis : dev server Vite en cours sur http://localhost:5173
 *   (relancé automatiquement via webServer si absent en local).
 */
export default defineConfig({
  testDir: './tests/playwright',
  outputDir: './tests/playwright-artifacts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: './tests/playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
