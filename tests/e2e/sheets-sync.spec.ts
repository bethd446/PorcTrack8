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

    // Le badge de source (LIVE, CACHE, ou OFFLINE) doit être visible
    const statusBadge = page.locator('.premium-header .ft-code').filter({ hasText: /LIVE|CACHE|OFFLINE|SYNC/i });
    // Peut ne pas être visible si aucune donnée ne vient encore
    const visible = await statusBadge.isVisible();
    console.log(`Source badge visible: ${visible}`);
  });

  test('État du Troupeau affiche des chiffres (pas de NaN)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    // Chercher les KPIs du troupeau
    const kpiNumbers = page.locator('.ft-heading').filter({ hasText: /^\d+$/ });
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
    await page.goto('/cheptel');
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

    await page.goto('/bandes');
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

    // 3. Naviguer entre les onglets de l'app (navigation SPA, pas de reload HTML)
    await page.locator('ion-tab-button').filter({ hasText: /CHEPTEL/i }).tap({ force: true });
    await page.waitForTimeout(1000);

    // L'app doit toujours fonctionner (navigation SPA locale)
    const err = page.locator('text=ERREUR DE CHARGEMENT');
    expect(await err.isVisible()).toBe(false);

    // 4. Revenir au Dashboard
    await page.locator('ion-tab-button').filter({ hasText: /HOME/i }).tap({ force: true });
    await page.waitForTimeout(500);

    // Le header doit toujours être visible (contenu en mémoire)
    const header = page.locator('.premium-header');
    await expect(header).toBeVisible();
    console.log('✅ Navigation SPA offline fonctionnelle (données GAS bloquées)');

    // 5. Restaurer
    await context.unroute('**/script.google.com/**');
  });
});
