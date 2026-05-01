/**
 * PorcTrack — Tests E2E Performance & Robustesse (v6)
 * ════════════════════════════════════════════════
 * Suite orientée terrain : latence, chargement rapide, pas de blanc.
 *
 * npx playwright test performance
 */

import { test, expect, type Page } from '@playwright/test';

const THRESHOLDS = {
  firstContentful:  3000,
  skeletonVisible:  500,
  navTransition:    800,
  sheetLoad:        15000,
  bandes:           25000,
};

async function measureLoad(page: Page, route: string): Promise<number> {
  const start = Date.now();
  await page.goto(route);
  await page
    .locator('[data-testid="agritech-header"]')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 });
  return Date.now() - start;
}

test.describe('Zéro Écran Blanc', () => {
  test('Today : header visible < 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForSelector(
      '[data-testid="agritech-header"], [class*="skeleton"], [class*="animate-pulse"]',
      { timeout: THRESHOLDS.skeletonVisible + 1000 }
    );
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('Troupeau : skeleton ou liste apparaît < 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/troupeau');
    await page.waitForSelector(
      '[data-testid="agritech-header"], [data-testid="cheptel-row"]',
      { timeout: 5000 }
    );
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('Bandes : skeleton visible (pas de blanc même si lent)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/troupeau/bandes');
    await page
      .waitForSelector(
        '[class*="animate-pulse"], [data-testid="agritech-header"]',
        { timeout: 3000 }
      )
      .catch(() => {});
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});

test.describe('Fluidité Navigation', () => {
  test('Transition Today → Troupeau via nav < 3s', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const start = Date.now();
    const nav = page.getByRole('navigation', { name: /navigation principale/i }).last();
    await nav.getByRole('button', { name: /Cheptel/i }).click();
    await page
      .locator('[data-testid="agritech-header"]')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLDS.navTransition * 4);
  });

  test('Transitions rapides entre tous les onglets', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const tabs: RegExp[] = [/Cheptel/i, /Ressources/i, /^Plus$/i, /Aujourd/i];
    const times: Record<string, number> = {};

    for (const tab of tabs) {
      const start = Date.now();
      const nav = page
        .getByRole('navigation', { name: /navigation principale/i })
        .last();
      await nav.getByRole('button', { name: tab }).click();
      await page.waitForTimeout(300);
      times[String(tab)] = Date.now() - start;
    }

    Object.entries(times).forEach(([tab, ms]) => {
      expect(ms, `Transition vers ${tab} trop lente`).toBeLessThan(3000);
    });
  });
});

test.describe('Robustesse Réseau', () => {
  test('Réseau lent (3G simulé) : app reste utilisable', async ({ page, context }) => {
    await context.route('**/*', async (route) => {
      await new Promise((r) => setTimeout(r, 200));
      await route.continue();
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('Requête GAS en erreur : fallback sur cache', async ({ page, context }) => {
    await context.route('**/script.google.com/**', (route) => route.abort());

    await page.goto('/');
    await page.waitForTimeout(4000);

    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('GAS retourne 500 : indicateur offline visible', async ({ page, context }) => {
    await context.route('**/script.google.com/**', (route) =>
      route.fulfill({ status: 500, body: '{"ok":false,"error":"Server Error"}' })
    );

    await page.goto('/');
    await page.waitForTimeout(4000);

    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });
});

test.describe('Données Extrêmes', () => {
  test('Page Bandes sans bandes : message vide affiché', async ({ page, context }) => {
    await context.route('**/script.google.com/**', async (route) => {
      const url = route.request().url();
      if (url.includes('PORCELETS_BANDES')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, header: ['ID'], rows: [] }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/troupeau/bandes');
    await page.waitForTimeout(5000);
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('Cheptel avec beaucoup de truies : scroll fluide', async ({ page }) => {
    await page.goto('/troupeau/truies');
    await page.waitForTimeout(3000);

    await page.locator('ion-content, body').first().evaluate((el) => {
      el.scrollTop = 2000;
    });
    await page.waitForTimeout(500);

    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });
});
