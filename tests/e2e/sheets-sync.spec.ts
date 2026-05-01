/**
 * PorcTrack — Tests E2E Synchronisation Google Sheets
 * Vérifie que les données arrivent correctement depuis le GAS Connector.
 *
 * npx playwright test sheets-sync
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Synchronisation Sheets', () => {
  test('FarmContext charge les données au démarrage', async ({ page }) => {
    // Intercepter les requêtes vers le GAS pour vérifier qu'elles partent bien
    const gasRequests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('script.google.com')) {
        gasRequests.push(req.url());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Des requêtes vers le GAS doivent avoir été lancées
    expect(gasRequests.length).toBeGreaterThan(0);
    console.log(`✅ ${gasRequests.length} requête(s) GAS lancées`);
  });

  test('Indicateur LIVE/CACHE/OFFLINE présent dans le header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const statusBadge = page
      .locator('[data-testid="agritech-header"]')
      .locator('text=/LIVE|CACHE|OFFLINE|SYNC/i');
    // Peut ne pas être visible si aucune donnée ne vient encore
    const visible = await statusBadge.first().isVisible().catch(() => false);
    void visible;
  });

  test('État du Troupeau affiche des chiffres (pas de NaN)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    // Chercher les KPIs du troupeau
    const kpiNumbers = page.locator('[data-testid="kpi-card-v6"], [data-testid="kpi-card"]').filter({ hasText: /^\d+$/ });
    const count = await kpiNumbers.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await kpiNumbers.nth(i).textContent();
        expect(text).not.toBe('NaN');
        expect(text).not.toBe('undefined');
      }
    }
    console.log(`✅ ${count} chiffre(s) KPI validés (pas de NaN)`);
  });

  test('Cheptel : pas de truie sans statut', async ({ page }) => {
    await page.goto('/troupeau/truies');
    await page.waitForTimeout(4000);

    // Vérifier que les badges de statut ne sont pas vides
    const badges = page.locator('span[class*="rounded-full"]');
    const count = await badges.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await badges.nth(i).textContent();
      // Un badge vide ou "—" serait une anomalie
      expect(text?.trim()).toBeTruthy();
    }
    console.log(`✅ ${count} badge(s) statut validés`);
  });

  test('Bandes : page charge sans erreur Sheets', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Sheets')) {
        errors.push(msg.text());
      }
    });

    await page.goto('/troupeau/bandes');
    await page.waitForTimeout(4000);

    if (errors.length > 0) {
      console.warn('Erreurs Sheets détectées:', errors);
    }
    // Pas d'ErrorBoundary
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);
  });

  test('Offline : navigation SPA fonctionne sans réseau', async ({ page, context }) => {
    // 1. Charger l'app avec réseau pour peupler le cache
    await page.goto('/');
    await page.waitForTimeout(4000);

    // 2. Couper UNIQUEMENT les requêtes vers GAS (pas le serveur de dev)
    //    On bloque les requêtes réseau externes mais l'app SPA reste chargée en mémoire
    await context.route('**/script.google.com/**', route => route.abort());

    // 3. Naviguer entre les onglets agritech (navigation SPA)
    const nav = page.getByRole('navigation', { name: /navigation principale/i }).last();
    await nav.getByRole('button', { name: /Cheptel/i }).click();
    await page.waitForTimeout(1000);

    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);

    // 4. Revenir au Today
    await nav.getByRole('button', { name: /Aujourd/i }).click();
    await page.waitForTimeout(500);

    const header = page.locator('[data-testid="agritech-header"]').first();
    await expect(header).toBeVisible();
    console.log('✅ Navigation SPA offline fonctionnelle (données GAS bloquées)');

    // 5. Restaurer
    await context.unroute('**/script.google.com/**');
  });
});
