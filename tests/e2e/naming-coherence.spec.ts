/**
 * PorcTrack 8 — Tests E2E Naming & cohérence (V75-a)
 * ════════════════════════════════════════════════════════
 * Vérifie que les noms de bandes affichent un libellé lisible
 * (`Bande {Mois} {Année}`) et jamais un UUID 8-hex tronqué exposé
 * à l'utilisateur. Couvre la sortie de `formatBandeName` propagée
 * dans AnimalsV70.
 *
 * npx playwright test --config tests/playwright.config.ts naming-coherence
 */

import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';
const AUDIT_EMAIL = 'audit-final@porctrack.test';
const AUDIT_PASSWORD = 'AuditFinal2026!';

test.describe('Naming & cohérence', () => {
  test('Bandes affichent un nom lisible (pas d\'UUID 8 hex)', async ({ page }) => {
    // Login (pas de storageState configuré au niveau projet)
    await page.goto(`${APP_URL}/login`);
    await page.locator('#login-email').fill(AUDIT_EMAIL);
    await page.locator('#login-password').fill(AUDIT_PASSWORD);
    await page.getByRole('button', { name: /^Se connecter$/i }).click();
    await page.waitForURL(/\/today(\/|$|\?)/, { timeout: 15_000 });

    await page.goto(`${APP_URL}/troupeau`);
    await page.getByRole('tab', { name: /bandes/i }).click();

    // Au moins une bande visible avec format "Bande {Mois} {Année}"
    const items = page.locator('[role="button"]').filter({ hasText: /^Bande / });
    await expect(items.first()).toBeVisible({ timeout: 10000 });

    // Vérifier qu'aucun item n'affiche un UUID 8-hex tronqué
    const titles = await items.allInnerTexts();
    for (const t of titles) {
      expect(t).not.toMatch(/Bande [0-9a-f]{8}…/);
    }
  });

  test('Alertes Aujourd\'hui — refonte (à vendre, plus de "Réforme suggérée" sur réformées)', async ({ page }) => {
    // Login (pas de storageState configuré au niveau projet)
    await page.goto(`${APP_URL}/login`);
    await page.locator('#login-email').fill(AUDIT_EMAIL);
    await page.locator('#login-password').fill(AUDIT_PASSWORD);
    await page.getByRole('button', { name: /^Se connecter$/i }).click();
    await page.waitForURL(/\/today(\/|$|\?)/, { timeout: 15_000 });

    await page.goto(`${APP_URL}/today`);

    // 0 alerte "Réforme suggérée — T-046..T-050"
    for (const code of ['T-046', 'T-047', 'T-048', 'T-049', 'T-050']) {
      await expect(page.getByText(`Réforme suggérée — ${code}`)).toHaveCount(0);
    }

    // 5 alertes "À vendre — T-046..T-050"
    for (const code of ['T-046', 'T-047', 'T-048', 'T-049', 'T-050']) {
      await expect(page.getByText(`À vendre — ${code}`)).toBeVisible();
    }
  });

  test('Filtre "À vendre" sur Élevage > Truies → 5 résultats', async ({ page }) => {
    // Login (pas de storageState configuré au niveau projet)
    await page.goto(`${APP_URL}/login`);
    await page.locator('#login-email').fill(AUDIT_EMAIL);
    await page.locator('#login-password').fill(AUDIT_PASSWORD);
    await page.getByRole('button', { name: /^Se connecter$/i }).click();
    await page.waitForURL(/\/today(\/|$|\?)/, { timeout: 15_000 });

    await page.goto(`${APP_URL}/troupeau`);
    await page.getByRole('button', { name: /À vendre \(\d+\)/ }).click();

    for (const code of ['T-046', 'T-047', 'T-048', 'T-049', 'T-050']) {
      await expect(page.getByText(code)).toBeVisible();
    }
  });
});
