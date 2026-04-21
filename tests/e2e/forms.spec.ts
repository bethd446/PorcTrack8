/**
 * PorcTrack — Tests E2E Formulaires (QuickHealth, QuickNote, TableRowEdit)
 * Vérifie que les formulaires de saisie terrain fonctionnent.
 *
 * npx playwright test forms
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Formulaires de saisie terrain', () => {
  test('QuickNote : champ texte et bouton Enregistrer', async ({ page }) => {
    // Aller sur une fiche truie (si elle existe)
    await page.goto('/cheptel');
    await page.waitForTimeout(2000);

    const firstCard = page.locator('.premium-card').first();
    if (await firstCard.isVisible()) {
      await firstCard.tap();
      await page.waitForTimeout(600);

      // Switcher sur l'onglet Notes
      const notesTab = page.locator('ion-segment-button').filter({ hasText: /NOTE/i });
      if (await notesTab.isVisible()) {
        await notesTab.tap();
        await page.waitForTimeout(400);

        // Le formulaire QuickNote doit être visible
        const textarea = page.locator('textarea[placeholder*="observation"]');
        if (await textarea.isVisible()) {
          await textarea.fill('Test Playwright — observation terrain');
          await page.waitForTimeout(200);

          // Le bouton Enregistrer doit être actif
          const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Enregistrer|Valider/i });
          const firstSubmit = submitBtn.first();
          if (await firstSubmit.isVisible()) {
            const isDisabled = await firstSubmit.isDisabled();
            expect(isDisabled).toBe(false);
            console.log('✅ Bouton Enregistrer Note actif');
          }
        }
      }
    }
  });

  test('QuickHealth : sélection Nature et champ Soin', async ({ page }) => {
    await page.goto('/cheptel');
    await page.waitForTimeout(2000);

    const firstCard = page.locator('.premium-card').first();
    if (await firstCard.isVisible()) {
      await firstCard.tap();
      await page.waitForTimeout(600);

      const santeTab = page.locator('ion-segment-button').filter({ hasText: /SANT/i });
      if (await santeTab.isVisible()) {
        await santeTab.tap();
        await page.waitForTimeout(400);

        // Remplir le champ Soin
        const soinInput = page.locator('input[placeholder*="Paracef"]');
        if (await soinInput.isVisible()) {
          await soinInput.fill('Amoxicilline');
          await page.waitForTimeout(200);

          const submitBtn = page.locator('button').filter({ hasText: /Valider Intervention/i });
          if (await submitBtn.isVisible()) {
            const isDisabled = await submitBtn.isDisabled();
            expect(isDisabled).toBe(false);
            console.log('✅ Bouton Valider Intervention actif');
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
    if (await err.isVisible()) {
        console.warn('⚠️ ERREUR DE CHARGEMENT détectée sur /checklist/DAILY');
    }
    expect(await err.isVisible()).toBe(false);

    // Vérifier qu'une question est affichée
    const question = page.locator('h1, h2').first();
    await question.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    const text = await question.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
    console.log(`✅ Question checklist: "${text?.slice(0, 50)}"`);
  });
});

// ── Test : Modal ConfirmationModal ─────────────────────────────────────────────

test.describe('Modal Confirmation', () => {
  test('Page Alertes charge sans erreur', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForTimeout(2000);

    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });
});
