/**
 * E2E #1 — Auth + Onboarding flow (audit-final, auto-skip-v1)
 *
 * Couvre :
 *  - GET /signup → image BG `auth-signup-bg.webp` servie (200) + h1
 *    "Démarrez avec votre ferme."
 *  - GET /login → form login fonctionnel
 *  - signInWithPassword(audit-final) → redirect /today (pas /onboarding-v2 :
 *    le compte audit-final est marqué `auto-skip-v1` côté
 *    farms.metadata.onboarding_v2)
 *  - Page /today affichée (h1 "Aujourd'hui")
 */
import { test, expect } from '@playwright/test';

const AUDIT_EMAIL = 'audit-final@porctrack.test';
const AUDIT_PASSWORD = 'AuditFinal2026!';

test.describe('Auth + Onboarding flow (audit-final)', () => {
  test('Signup page sert son BG image et son h1', async ({ page, request }) => {
    // 1. BG image accessible (200)
    const bg = await request.get('/images/auth/auth-signup-bg.webp');
    expect(bg.status()).toBe(200);
    expect(bg.headers()['content-type']).toMatch(/image|webp|octet-stream/);

    // 2. Page /signup rend le titre attendu
    await page.goto('/signup');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /Démarrez avec votre ferme/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Login audit-final → redirect /today (auto-skip-v1, pas onboarding-v2)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Form login : email + password puis submit
    await page.locator('#login-email').fill(AUDIT_EMAIL);
    await page.locator('#login-password').fill(AUDIT_PASSWORD);
    await page.getByRole('button', { name: /^Se connecter$/i }).click();

    // Redirection auto vers /today (audit-final = auto-skip-v1)
    await page.waitForURL(/\/today(\/|$|\?)/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/today/);
    expect(page.url()).not.toMatch(/\/onboarding-v2/);

    // Le titre "Aujourd'hui" est rendu (PageHeader.title du TodayV70)
    await expect(page.getByRole('heading', { name: /Aujourd'hui/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
