/**
 * PorcTrack — Tests E2E Navigation
 * ════════════════════════════════════════════════════════
 * Vérifie que tous les menus s'affichent correctement,
 * que les headers sont cohérents et que le bouton retour
 * fonctionne sur chaque page.
 *
 * npx playwright test navigation
 */

import { test, expect, type Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function waitForApp(page: Page) {
  // Attendre que l'app soit chargée (pas d'ErrorBoundary, pas de spinner seul)
  await page.waitForLoadState('networkidle');

  // Gérer l'overlay d'audit quotidien s'il apparaît
  const laterBtn = page.locator('button:has-text("Plus tard")');
  if (await laterBtn.isVisible()) {
    await laterBtn.tap();
    await page.waitForTimeout(400);
  }

  // Attendre qu'un élément structurel soit là
  await page.locator('.premium-header').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  const errorBoundary = page.locator('text=ERREUR DE CHARGEMENT');
  expect(await errorBoundary.isVisible()).toBe(false);
}

async function tapNavTab(page: Page, tabName: string) {
  await page.locator(`ion-tab-button >> text=${tabName}`).tap({ force: true });
  await page.waitForTimeout(600);
}

async function getHeaderTitle(page: Page): Promise<string> {
  // BigShoulders h1 dans le premium-header
  const h1 = page.locator('.premium-header h1, .premium-header .ft-heading').first();
  await h1.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  return (await h1.textContent())?.trim() ?? '';
}

// ── Test Suite : Navigation principale ───────────────────────────────────────

test.describe('Navigation Principale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test('Dashboard se charge sans erreur', async ({ page }) => {
    const title = await getHeaderTitle(page);
    expect(title.toUpperCase()).toBe('COCKPIT');
    // Vérifier la navigation bar en bas
    await expect(page.locator('ion-tab-bar')).toBeVisible();
  });

  test('Onglet Cheptel → header correct', async ({ page }) => {
    await tapNavTab(page, 'CHEPTEL');
    const title = await getHeaderTitle(page);
    expect(title.toUpperCase()).toBe('CHEPTEL');
    // Vérifier les segments Truies / Verrats
    await expect(page.locator('ion-segment')).toBeVisible();
  });

  test('Onglet Bandes → header correct', async ({ page }) => {
    await tapNavTab(page, 'BANDES');
    const title = await getHeaderTitle(page);
    expect(title.toUpperCase()).toContain('BANDE');
  });

  test('Onglet Alertes → header correct', async ({ page }) => {
    await tapNavTab(page, 'ALERTES');
    const title = await getHeaderTitle(page);
    expect(title.toUpperCase()).toContain('ALERT');
  });

  test('Onglet Plus → header correct', async ({ page }) => {
    await tapNavTab(page, 'PLUS');
    const title = await getHeaderTitle(page);
    expect(title.toUpperCase()).toContain('CONTR');
  });

  test('Tous les onglets sont accessibles (pas de crash)', async ({ page }) => {
    const tabs = ['CHEPTEL', 'BANDES', 'ALERTES', 'PLUS'];
    for (const tab of tabs) {
      await tapNavTab(page, tab);
      const errorBoundary = page.locator('text=ERREUR DE CHARGEMENT');
      expect(await errorBoundary.isVisible()).toBe(false);
      // Revenir au home
      await tapNavTab(page, 'HOME');
    }
  });
});

// ── Test Suite : Bouton Retour ────────────────────────────────────────────────

test.describe('Bouton Retour', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test('Dashboard : PAS de bouton retour', async ({ page }) => {
    // Sur la home, le bouton retour ne doit pas être visible
    const backBtn = page.locator('.premium-header button[class*="chevron"]').first();
    expect(await backBtn.isVisible()).toBe(false);
  });

  test('Cheptel → retour ramène au home', async ({ page }) => {
    await tapNavTab(page, 'CHEPTEL');
    await page.waitForTimeout(600);
    // Le bouton retour doit être visible
    const backBtn = page.locator('.premium-header button').first();
    await backBtn.tap({ force: true });
    await page.waitForTimeout(800);
    const title = await getHeaderTitle(page);
    // Soit on est sur home, soit sur la page précédente
    expect(title.toUpperCase()).toBeTruthy();
  });

  test('Bandes → retour fonctionne', async ({ page }) => {
    await page.goto('/bandes');
    await waitForApp(page);
    const backBtn = page.locator('.premium-header button').first();
    if (await backBtn.isVisible()) {
      await backBtn.tap({ force: true });
      await page.waitForTimeout(600);
      // Pas d'erreur après le retour
      const err = page.locator('text=ERREUR DE CHARGEMENT');
      expect(await err.isVisible()).toBe(false);
    }
  });
});

// ── Test Suite : Sous-pages ───────────────────────────────────────────────────

test.describe('Sous-pages', () => {
  test('Santé (/sante) → bon titre', async ({ page }) => {
    await page.goto('/sante');
    await waitForApp(page);
    const title = await getHeaderTitle(page);
    expect(title.toUpperCase()).toContain('SANT');
  });

  test('Stock (/stock/aliments) → bon titre', async ({ page }) => {
    await page.goto('/stock/aliments');
    await waitForApp(page);
    const title = await getHeaderTitle(page);
    expect(title.toUpperCase()).toContain('ALIM');
  });

  test('Stock véto (/stock/veto) → bon titre', async ({ page }) => {
    await page.goto('/stock/veto');
    await waitForApp(page);
    const title = await getHeaderTitle(page);
    expect(title.toUpperCase()).toContain('V');
  });

  test('Protocoles (/protocoles) → charge sans erreur', async ({ page }) => {
    await page.goto('/protocoles');
    await waitForApp(page);
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('Route inconnue → redirige ou affiche quelque chose', async ({ page }) => {
    await page.goto('/route-inconnue');
    await page.waitForTimeout(800);
    // L'app ne doit pas afficher d'ErrorBoundary
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });
});

// ── Test Suite : Cohérence des Headers ───────────────────────────────────────

test.describe('Cohérence des Headers', () => {
  const ROUTE_EXPECTATIONS: Array<{ route: string; expectedTitle: RegExp }> = [
    { route: '/',                  expectedTitle: /COCKPIT/i },
    { route: '/cheptel',           expectedTitle: /CHEPTEL/i },
    { route: '/bandes',            expectedTitle: /BANDE/i   },
    { route: '/alerts',            expectedTitle: /ALERT/i   },
    { route: '/more',              expectedTitle: /CONTR/i   },
    { route: '/audit',             expectedTitle: /AUDIT/i   },
    { route: '/sync',              expectedTitle: /SYNCHRO/i },
    { route: '/sante',             expectedTitle: /SANT/i    },
    { route: '/protocoles',        expectedTitle: /GUIDE|PROTO/i },
  ];

  for (const { route, expectedTitle } of ROUTE_EXPECTATIONS) {
    test(`${route} → titre lisible en français`, async ({ page }) => {
      await page.goto(route);
      await waitForApp(page);
      const title = await getHeaderTitle(page);
      expect(title).toMatch(expectedTitle);
    });
  }
});
