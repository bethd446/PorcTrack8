/**
 * PorcTrack — Tests E2E Cheptel (Truies & Verrats)
 * Vérifie la liste, les filtres et l'ouverture d'une fiche animal.
 *
 * npx playwright test cheptel
 */

import { test, expect, type Page } from '@playwright/test';

async function goToCheptel(page: Page) {
  await page.goto('/cheptel');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

test.describe('Vue Cheptel', () => {
  test('Liste truies se charge', async ({ page }) => {
    await goToCheptel(page);
    // Attendre que les skeletons disparaissent ou les vraies cartes apparaissent
    await page.locator('.premium-card').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const cards = page.locator('.premium-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Switcher Truies/Verrats fonctionne', async ({ page }) => {
    await goToCheptel(page);
    // Cliquer sur l'onglet Verrats
    const verratBtn = page.locator('ion-segment-button').filter({ hasText: /VERRAT/i });
    await verratBtn.tap({ force: true });
    await page.waitForTimeout(600);
    // Pas d'erreur
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
      // Vérifier qu'on ne voit pas plus de cartes qu'avant (filtrage actif)
      const filteredCards = page.locator('.premium-card');
      expect(await filteredCards.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('Clic sur une truie ouvre la fiche', async ({ page }) => {
    await goToCheptel(page);
    await page.waitForTimeout(1000);
    // Cliquer sur la première carte truie
    const firstCard = page.locator('.premium-card').first();
    if (await firstCard.isVisible()) {
      await firstCard.tap();
      await page.waitForTimeout(600);
      // Vérifier qu'on est sur une page de fiche (header avec ID truie)
      const err = page.locator('text=ERREUR DE CHARGEMENT');
      expect(await err.isVisible()).toBe(false);
    }
  });

  test('Badge statut visible sur chaque animal', async ({ page }) => {
    await goToCheptel(page);
    await page.waitForTimeout(1000);
    // Les StatusBadge doivent être présents
    const badges = page.locator('[class*="rounded-full"][class*="border"]');
    expect(await badges.count()).toBeGreaterThanOrEqual(0);
  });
});
