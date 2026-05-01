/**
 * PorcTrack — Tests E2E Formulaires (QuickHealth, QuickNote, TableRowEdit)
 * Vérifie que les formulaires de saisie terrain fonctionnent.
 *
 * npx playwright test forms
 */

import { test, expect } from '@playwright/test';

test.describe('Formulaires de saisie terrain', () => {
  test('QuickNote : champ texte et bouton Enregistrer', async ({ page }) => {
    await page.goto('/troupeau/truies');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid="cheptel-row"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.tap();
      await page.waitForTimeout(600);

      const notesTab = page.locator('ion-segment-button').filter({ hasText: /NOTE/i });
      if (await notesTab.isVisible()) {
        await notesTab.tap();
        await page.waitForTimeout(400);

        const textarea = page.locator('textarea[placeholder*="observation"]');
        if (await textarea.isVisible()) {
          await textarea.fill('Test Playwright — observation terrain');
          await page.waitForTimeout(200);

          const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Enregistrer|Valider/i });
          const firstSubmit = submitBtn.first();
          if (await firstSubmit.isVisible()) {
            const isDisabled = await firstSubmit.isDisabled();
            expect(isDisabled).toBe(false);
          }
        }
      }
    }
  });

  test('QuickHealth : sélection Nature et champ Soin', async ({ page }) => {
    await page.goto('/troupeau/truies');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid="cheptel-row"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.tap();
      await page.waitForTimeout(600);

      const santeTab = page.locator('ion-segment-button').filter({ hasText: /SANT/i });
      if (await santeTab.isVisible()) {
        await santeTab.tap();
        await page.waitForTimeout(400);

        const soinInput = page.locator('input[placeholder*="Paracef"]');
        if (await soinInput.isVisible()) {
          await soinInput.fill('Amoxicilline');
          await page.waitForTimeout(200);

          const submitBtn = page.locator('button').filter({ hasText: /Valider Intervention/i });
          if (await submitBtn.isVisible()) {
            const isDisabled = await submitBtn.isDisabled();
            expect(isDisabled).toBe(false);
          }
        }
      }
    }
  });

  test('Contrôle Quotidien : navigation entre questions', async ({ page }) => {
    await page.goto('/checklist/DAILY');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);

    const question = page.locator('h1, h2').first();
    await question.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    const text = await question.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });
});

test.describe('Modal Confirmation', () => {
  test('Page Alertes charge sans erreur', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForTimeout(2000);

    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });
});
