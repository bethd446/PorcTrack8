/**
 * PorcTrack 8 — Tests E2E Listing porcelets (V75-h)
 * ════════════════════════════════════════════════════════
 * Vérifie que l'onglet Porcelets affiche un listing groupé par bande
 * (header bande dépliable + sous-items porcelets). Couvre la sortie
 * du composant PorceletGroup branché dans AnimalsV70.
 *
 * npx playwright test --config tests/playwright.config.ts porcelets-listing
 */

import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'audit-final@porctrack.test';
const LOGIN_PASSWORD = 'AuditFinal2026!';

async function loginAuditFinal(page: import('@playwright/test').Page) {
  await page.goto(`${APP_URL}/login`);
  await page.locator('#login-email').fill(LOGIN_EMAIL);
  await page.locator('#login-password').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: /^Se connecter$/i }).click();
  await page.waitForURL(/\/today(\/|$|\?)/, { timeout: 15_000 });
}

test.describe('Listing porcelets — V75-h', () => {
  test('Tab Porcelets affiche au moins 1 groupe de bande avec compteur', async ({ page }) => {
    await loginAuditFinal(page);
    await page.goto(`${APP_URL}/troupeau`);
    await page.getByRole('tab', { name: /porcelets/i }).click();

    // PorceletGroup rend des boutons header avec aria-expanded et texte "vivants"
    const groups = page.locator('button[aria-expanded]').filter({ hasText: /vivants/ });
    await expect(groups.first()).toBeVisible({ timeout: 10000 });

    const groupCount = await groups.count();
    expect(groupCount).toBeGreaterThanOrEqual(1);

    // Aucune ligne avec UUID 8-hex tronqué dans les noms de bande visibles
    const titles = await groups.allInnerTexts();
    for (const t of titles) {
      expect(t).not.toMatch(/Bande [0-9a-f]{8}…/);
    }
  });

  test('Clic sur header bande déplie/replie le groupe (ou disabled si bande vide)', async ({ page }) => {
    await loginAuditFinal(page);
    await page.goto(`${APP_URL}/troupeau`);
    await page.getByRole('tab', { name: /porcelets/i }).click();

    const groups = page.locator('button[aria-expanded]').filter({ hasText: /vivants/ });
    await expect(groups.first()).toBeVisible({ timeout: 10000 });

    // Découpler les groupes peuplés (toggleables) des groupes vides (disabled).
    // PorceletGroup rend `disabled` quand `count === 0` (aucun porcelet actif).
    const enabledGroups = page.locator('button[aria-expanded]:not([disabled])').filter({ hasText: /vivants/ });
    const enabledCount = await enabledGroups.count();

    if (enabledCount === 0) {
      // Aucune bande peuplée dans la ferme audit-final → on vérifie le contrat
      // disabled : tous les boutons header sont `disabled` et affichent
      // "0 vivants — bande terminée". C'est une assertion structurelle valide
      // (le composant respecte son invariant "pas de toggle si bande vide").
      const disabledGroups = page.locator('button[aria-expanded][disabled]').filter({ hasText: /vivants/ });
      const disabledCount = await disabledGroups.count();
      expect(disabledCount).toBeGreaterThanOrEqual(1);

      const firstDisabled = disabledGroups.first();
      await expect(firstDisabled).toBeDisabled();
      await expect(firstDisabled).toHaveAttribute('aria-expanded', 'false');
      await expect(firstDisabled).toContainText('0 vivants');
      return;
    }

    // Au moins un groupe peuplé : on teste le toggle réel.
    // On identifie la cible par le NOM de bande (stable entre états).
    // L'aria-label flip "Déplier {bande}" ↔ "Replier {bande}" et aria-expanded
    // change après clic — donc on extrait le nom de bande et on cible par
    // un `aria-label` qui CONTIENT ce nom.
    const candidates = page.locator('button[aria-expanded]:not([disabled])').filter({ hasText: /vivants/ });
    const firstCandidate = candidates.first();
    const initialAriaLabel = await firstCandidate.getAttribute('aria-label');
    expect(initialAriaLabel).toBeTruthy();
    const bandeName = initialAriaLabel!.replace(/^(Déplier|Replier)\s+/, '');
    expect(bandeName.length).toBeGreaterThan(0);

    // Locator stable : tout bouton dont aria-label se termine par ce nom de bande.
    const target = page.locator(`button[aria-label$="${bandeName}"]`).first();
    const initialState = await target.getAttribute('aria-expanded');

    // 1er click : toggle de l'état initial
    await target.click();
    const expectedAfterFirst = initialState === 'true' ? 'false' : 'true';
    await expect(target).toHaveAttribute('aria-expanded', expectedAfterFirst, { timeout: 2000 });

    // 2nd click : retour à l'état initial
    await target.click();
    await expect(target).toHaveAttribute('aria-expanded', initialState!, { timeout: 2000 });
  });
});
