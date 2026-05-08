/**
 * E2E #2 — Saillie complete flow (T-001 × V-001)
 *
 * Scénario terrain :
 *  1. Login audit-final
 *  2. Naviguer vers la fiche T-001 (truie en attente saillie)
 *  3. Cliquer "+ Saisir évènement" → BottomSheet "Saisir un évènement pour T-001"
 *  4. Cliquer "Saillie" → form "Enregistrer une saillie" (truie pré-cochée T-001)
 *  5. Sélectionner V-001 → "Confirmer la saillie"
 *  6. Vérifier toast success "Saillie enregistrée"
 *  7. Vérifier compteur Marius dans la fiche
 *  8. Cleanup : DELETE la saillie créée (idempotence)
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const AUDIT_EMAIL = 'audit-final@porctrack.test';
const AUDIT_PASSWORD = 'AuditFinal2026!';
const AUDIT_FARM_ID = '0f2577f1-ba42-4895-b43f-d3d4acc29867';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://jcritwravdwefwqwyjvk.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjcml0d3JhdmR3ZWZ3cXd5anZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTEwMTIsImV4cCI6MjA5Mjk2NzAxMn0.hG0DzvTkeVVRAeedwunOIuudqtcvATJxbRt9NzEf_tY';

test.describe('Saillie complete flow', () => {
  test('T-001 × V-001 : action sheet → form → toast → cleanup', async ({ page }) => {
    // ── 0. Pré-condition : T-001 doit être en "En attente saillie" pour
    //      apparaître dans la liste des truies disponibles à la saillie.
    //      Le trigger `saillies_set_sow_pleine` bascule en Pleine après
    //      INSERT, et le DELETE ne ré-init pas. On force l'état initial.
    const adminCli = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const adminLogin = await adminCli.auth.signInWithPassword({
      email: AUDIT_EMAIL,
      password: AUDIT_PASSWORD,
    });
    expect(adminLogin.error).toBeNull();
    const { error: resetErr } = await adminCli
      .from('sows')
      .update({ statut: 'En attente saillie' })
      .eq('farm_id', AUDIT_FARM_ID)
      .eq('code_id', 'T-001');
    expect(resetErr).toBeNull();
    await adminCli.auth.signOut();

    // ── 1. Login ────────────────────────────────────────────────────────────
    await page.goto('/login');
    await page.locator('#login-email').fill(AUDIT_EMAIL);
    await page.locator('#login-password').fill(AUDIT_PASSWORD);
    await page.getByRole('button', { name: /^Se connecter$/i }).click();
    await page.waitForURL(/\/today(\/|$|\?)/, { timeout: 15_000 });

    // ── 2. Fiche T-001 ──────────────────────────────────────────────────────
    await page.goto('/troupeau/truies/T-001');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /T-001/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // ── 3. + Saisir évènement → ActionSheet ─────────────────────────────────
    await page.getByRole('button', { name: /\+ Saisir évènement/i }).first().click();
    await expect(page.getByText(/Saisir un évènement pour T-001/i)).toBeVisible({
      timeout: 5_000,
    });

    // ── 4. Choix "Saillie" → form QuickSaillie ──────────────────────────────
    await page.getByRole('button', { name: /^Saillie — Enregistrer une saillie/i }).click();
    await expect(page.getByText(/Enregistrer une saillie/i).first()).toBeVisible({
      timeout: 5_000,
    });
    // T-001 pré-cochée (defaultTruieDisplayId)
    await expect(
      page.getByRole('radio', { name: /Sélectionner la truie T-001/i }),
    ).toHaveAttribute('aria-checked', 'true');

    // ── 5. Sélection V-001 → Confirmer ──────────────────────────────────────
    await page.getByRole('radio', { name: /Sélectionner le verrat V-001/i }).click();
    await page.getByRole('button', { name: /Confirmer la saillie/i }).click();

    // ── 6. Toast success "Saillie enregistrée …" ────────────────────────────
    // Le toast est rendu via context/ToastContext (sonner). On attrape le
    // message qui contient "Saillie enregistrée".
    await expect(page.getByText(/Saillie enregistrée/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // ── 7. Compteur Marius dans la fiche T-001 ──────────────────────────────
    // MariusPanel : "T-001 compte X saillies au registre dont Y confirmées."
    // Après reload, le compteur a été incrémenté. On vérifie juste qu'on a
    // bien un message contenant "compte" + "saillies" dans l'aperçu Marius.
    await page.waitForTimeout(2000); // laisser le refreshData() s'appliquer
    await page.goto('/troupeau/truies/T-001');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/compte\s+\d+\s+saillies/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // ── 8. Cleanup : DELETE la saillie créée (idempotence) ──────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: signinErr } = await supabase.auth.signInWithPassword({
      email: AUDIT_EMAIL,
      password: AUDIT_PASSWORD,
    });
    expect(signinErr).toBeNull();

    const today = new Date().toISOString().slice(0, 10);
    // Récupérer la saillie la plus récente créée aujourd'hui par notre test
    const { data: saillies, error: selErr } = await supabase
      .from('saillies')
      .select('id, sow_code_id, boar_code_id, date_saillie, notes')
      .eq('farm_id', AUDIT_FARM_ID)
      .eq('sow_code_id', 'T-001')
      .eq('boar_code_id', 'V-001')
      .eq('date_saillie', today)
      .order('created_at', { ascending: false })
      .limit(1);
    expect(selErr).toBeNull();
    expect(saillies?.length ?? 0).toBeGreaterThan(0);

    const idToDelete = saillies![0].id;
    const { error: delErr } = await supabase.from('saillies').delete().eq('id', idToDelete);
    expect(delErr).toBeNull();

    // Vérifier que la ligne n'existe plus
    const { data: after } = await supabase.from('saillies').select('id').eq('id', idToDelete);
    expect(after?.length ?? 0).toBe(0);

    // Remettre T-001 en "En attente saillie" (état initial selon brief)
    const { error: restoreErr } = await supabase
      .from('sows')
      .update({ statut: 'En attente saillie' })
      .eq('farm_id', AUDIT_FARM_ID)
      .eq('code_id', 'T-001');
    expect(restoreErr).toBeNull();
  });
});
