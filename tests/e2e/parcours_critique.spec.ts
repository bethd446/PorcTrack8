import { test, expect } from '@playwright/test';

test('parcours critique: login, ajout pesée, sync', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@porctrack.tech');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');

  // 2. Ajout d'une pesée (on clique sur le hub cheptel)
  await page.click('text=Cheptel');
  await page.click('text=Ajouter Pesée');
  await page.fill('input[name="poids"]', '120');
  await page.click('button:has-text("Enregistrer")');

  // 3. Vérification du badge Sync (devrait montrer 1 pending)
  const syncBadge = page.locator('.bg-amber-100');
  await expect(syncBadge).toContainText('Sync: 1 pend.');

  // Simulation: on attend que le worker sync (ici on vérifie juste le changement d'état UI)
  // Dans un test réel, on intercepterait la requête réseau.
  console.log('Parcours critique validé: pesée ajoutée et badge en attente.');
});
