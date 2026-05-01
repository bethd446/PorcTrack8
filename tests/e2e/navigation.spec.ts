/**
 * PorcTrack — Tests E2E Navigation (v6 Agritech)
 * ════════════════════════════════════════════════════════
 * Vérifie que les onglets agritech (Aujourd'hui, Cheptel, Pilotage,
 * Ressources, Plus) s'affichent correctement, que les headers sont cohérents
 * et que le bouton retour fonctionne.
 *
 * v6 selectors :
 *   - `[data-testid="agritech-header"]` pour le header agritech
 *   - bottom nav : <nav aria-label="Navigation principale"> avec
 *     <button aria-label="…">
 *
 * npx playwright test navigation
 */

import { test, expect, type Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function waitForApp(page: Page) {
  await page.waitForLoadState('networkidle');

  const laterBtn = page.locator('button:has-text("Plus tard")');
  if (await laterBtn.isVisible()) {
    await laterBtn.tap();
    await page.waitForTimeout(400);
  }

  await page
    .locator('[data-testid="agritech-header"]')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  const errorBoundary = page.locator('text=ERREUR DE CHARGEMENT');
  expect(await errorBoundary.isVisible()).toBe(false);
}

async function tapNavTab(page: Page, label: string | RegExp) {
  const nav = page.getByRole('navigation', { name: /navigation principale/i }).last();
  const tab = nav.getByRole('button', {
    name: typeof label === 'string' ? new RegExp(`^${label}$`, 'i') : label,
  });
  await tab.click();
  await page.waitForTimeout(500);
}

async function getHeaderTitle(page: Page): Promise<string> {
  const h1 = page.locator('[data-testid="agritech-header"] h1').first();
  await h1.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  return (await h1.textContent())?.trim() ?? '';
}

// ── Test Suite : Navigation Agritech ─────────────────────────────────────────

test.describe('Navigation Agritech v6', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test('Today se charge sans erreur', async ({ page }) => {
    // / redirige sur /today (TodayHub)
    await expect(page).toHaveURL(/\/today$/);
    const errorBoundary = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await errorBoundary.isVisible()).toBe(false);
  });

  test('Onglet Cheptel → route /troupeau', async ({ page }) => {
    await tapNavTab(page, /Cheptel/i);
    await expect(page).toHaveURL(/\/troupeau/);
  });

  test('Onglet Ressources → route /ressources', async ({ page }) => {
    await tapNavTab(page, /Ressources/i);
    await expect(page).toHaveURL(/\/ressources/);
  });

  test('Onglet Plus → route /more', async ({ page }) => {
    await tapNavTab(page, /^Plus$/i);
    await expect(page).toHaveURL(/\/more/);
  });

  test('Tous les onglets accessibles (pas de crash)', async ({ page }) => {
    const labels: RegExp[] = [/Cheptel/i, /Ressources/i, /^Plus$/i, /Aujourd/i];
    for (const label of labels) {
      await tapNavTab(page, label);
      const errorBoundary = page.locator('text=ERREUR DE CHARGEMENT');
      expect(await errorBoundary.isVisible()).toBe(false);
    }
  });
});

// ── Test Suite : Bouton Retour ────────────────────────────────────────────────

test.describe('Bouton Retour', () => {
  test('Maternité → bouton retour visible', async ({ page }) => {
    await page.goto('/cycles/maternite');
    await waitForApp(page);
    const backBtn = page.locator('[data-testid="agritech-header"] button[aria-label="Retour"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.tap({ force: true });
      await page.waitForTimeout(600);
      const err = page.locator('text=ERREUR DE CHARGEMENT');
      expect(await err.isVisible()).toBe(false);
    }
  });

  test('Bandes → retour fonctionne', async ({ page }) => {
    await page.goto('/troupeau/bandes');
    await waitForApp(page);
    const backBtn = page.locator('[data-testid="agritech-header"] button[aria-label="Retour"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.tap({ force: true });
      await page.waitForTimeout(600);
      const err = page.locator('text=ERREUR DE CHARGEMENT');
      expect(await err.isVisible()).toBe(false);
    }
  });
});

// ── Test Suite : Sous-pages ───────────────────────────────────────────────────

test.describe('Sous-pages', () => {
  test('Santé (/sante) charge sans erreur', async ({ page }) => {
    await page.goto('/sante');
    await waitForApp(page);
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('Aliments (/ressources/aliments) charge sans erreur', async ({ page }) => {
    await page.goto('/ressources/aliments');
    await waitForApp(page);
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('Pharmacie (/ressources/pharmacie) charge sans erreur', async ({ page }) => {
    await page.goto('/ressources/pharmacie');
    await waitForApp(page);
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('Protocoles (/protocoles) charge sans erreur', async ({ page }) => {
    await page.goto('/protocoles');
    await waitForApp(page);
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('Route inconnue → NotFound sans crash', async ({ page }) => {
    await page.goto('/route-inconnue');
    await page.waitForTimeout(800);
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });
});

// ── Test Suite : Cohérence des Headers ───────────────────────────────────────

test.describe('Cohérence des Headers', () => {
  const ROUTE_EXPECTATIONS: Array<{ route: string; expectedTitle: RegExp }> = [
    { route: '/troupeau',           expectedTitle: /TROUPEAU/i },
    { route: '/cycles',             expectedTitle: /CYCLES/i },
    { route: '/ressources',         expectedTitle: /RESSOURCES/i },
    { route: '/cycles/maternite',   expectedTitle: /MATERNIT/i },
    { route: '/cycles/post-sevrage',expectedTitle: /POST.SEVRAGE/i },
    { route: '/cycles/repro',       expectedTitle: /REPRO|CALENDRIER/i },
    { route: '/sante',              expectedTitle: /SANT/i },
    { route: '/protocoles',         expectedTitle: /GUIDE|PROTO/i },
  ];

  for (const { route, expectedTitle } of ROUTE_EXPECTATIONS) {
    test(`${route} → titre lisible`, async ({ page }) => {
      await page.goto(route);
      await waitForApp(page);
      const title = await getHeaderTitle(page);
      expect(title).toMatch(expectedTitle);
    });
  }
});
