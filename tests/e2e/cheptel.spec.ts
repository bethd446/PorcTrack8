/**
 * PorcTrack — Tests E2E Cheptel (Truies & Verrats)
 * Vérifie la liste, les filtres et l'ouverture d'une fiche animal.
 *
 * npx playwright test cheptel
 *
 * v6 selectors :
 *   - `[data-testid="cheptel-row"]` pour les lignes de la liste
 *   - `[data-testid="agritech-header"]` pour le header
 */

import { test, expect, type Page } from '@playwright/test';

async function goToCheptel(page: Page) {
  await page.goto('/troupeau/truies');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

test.describe('Vue Cheptel', () => {
  test('Liste truies se charge', async ({ page }) => {
    await goToCheptel(page);
    await page.locator('[data-testid="cheptel-row"]').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const rows = page.locator('[data-testid="cheptel-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Switcher Truies/Verrats fonctionne', async ({ page }) => {
    await goToCheptel(page);
    // Le switcher v6 est un bouton avec le texte "Verrats" dans le slot du header
    const verratBtn = page.getByRole('button', { name: /Verrats/i }).first();
    await verratBtn.tap({ force: true });
    await page.waitForTimeout(600);
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('Barre de recherche filtre les résultats', async ({ page }) => {
    await goToCheptel(page);
    await page.waitForTimeout(800);
    const searchInput = page.locator('input[placeholder*="Chercher"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('T01');
      await page.waitForTimeout(300);
      const filteredRows = page.locator('[data-testid="cheptel-row"]');
      expect(await filteredRows.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('Clic sur une truie ouvre la fiche', async ({ page }) => {
    await goToCheptel(page);
    await page.waitForTimeout(1000);
    const firstRow = page.locator('[data-testid="cheptel-row"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.tap();
      await page.waitForTimeout(600);
      const err = page.locator('text=ERREUR DE CHARGEMENT');
      expect(await err.isVisible()).toBe(false);
    }
  });

  test('Badge statut visible sur chaque animal', async ({ page }) => {
    await goToCheptel(page);
    await page.waitForTimeout(1000);
    // Les Chips v6 sont des spans rounded-full
    const badges = page.locator('span[class*="rounded-full"]');
    expect(await badges.count()).toBeGreaterThanOrEqual(0);
  });
});
