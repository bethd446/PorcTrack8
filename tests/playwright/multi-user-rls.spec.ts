/**
 * E2E #3 — Multi-user RLS (test SQL pur, sans browser)
 *
 * Vérifie que la policy RLS `saillies_all` (USING farm_id IN
 * SELECT current_user_farms()) bloque correctement :
 *  - succès attendu : audit-final (membre de sa propre farm) peut INSERT
 *  - échec attendu  : client anon (aucune session) ne peut PAS INSERT
 *    pour la farm audit-final → erreur RLS (code 42501 ou retour vide).
 *
 * Idempotent : la saillie de succès est DELETE en fin de test.
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

// Identifiants connus de la ferme audit-final (vérifiés en DB) :
const T001_ID = 'c4aa4952-a367-4597-bb80-201a10b14465';
const V001_ID = '6904a913-e362-4e2e-9cd4-9f9591d77f75';

test.describe('Multi-user RLS — saillies', () => {
  test('audit-final = succès, client anon = blocked (RLS)', async () => {
    // ── 1. Client authentifié (audit-final) → INSERT doit passer ────────────
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: signinErr } = await authed.auth.signInWithPassword({
      email: AUDIT_EMAIL,
      password: AUDIT_PASSWORD,
    });
    expect(signinErr).toBeNull();

    const today = new Date().toISOString().slice(0, 10);
    const insertPayload = {
      farm_id: AUDIT_FARM_ID,
      sow_id: T001_ID,
      boar_id: V001_ID,
      sow_code_id: 'T-001',
      boar_code_id: 'V-001',
      date_saillie: today,
      statut: 'SAILLIE' as const,
      notes: '[E2E multi-user-rls] succès attendu (audit-final)',
    };

    const { data: insOk, error: insOkErr } = await authed
      .from('saillies')
      .insert(insertPayload)
      .select('id')
      .single();
    expect(insOkErr).toBeNull();
    expect(insOk?.id).toBeTruthy();
    const insertedId = insOk!.id;

    // ── 2. Client anon (sans session) → INSERT pour la farm audit-final
    //    doit échouer (RLS). On crée un nouveau client SANS auth.signIn.
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Sécurité : pas de session → request envoyée avec role=anon
    const { error: anonErr } = await anon.from('saillies').insert(insertPayload).select('id');
    expect(anonErr).not.toBeNull();
    // RLS Postgres renvoie typiquement 42501 (insufficient privilege) avec
    // le message "new row violates row-level security policy" ; on accepte
    // toute erreur non-null car l'important est que l'INSERT NE soit PAS
    // accepté.
    expect(
      /row-level security|policy|permission|denied|42501/i.test(anonErr?.message ?? ''),
    ).toBe(true);

    // ── 3. Cleanup : DELETE la saillie créée par le client authentifié ──────
    const { error: delErr } = await authed.from('saillies').delete().eq('id', insertedId);
    expect(delErr).toBeNull();

    // Vérifier que la ligne n'existe plus
    const { data: after } = await authed
      .from('saillies')
      .select('id')
      .eq('id', insertedId);
    expect(after?.length ?? 0).toBe(0);

    // Le trigger `saillies_set_sow_pleine` a basculé T-001 en "Pleine" après
    // l'INSERT. Le DELETE ne déclenche aucun trigger inverse → on remet
    // explicitement T-001 en "En attente saillie" pour conserver l'état
    // initial (idempotence cross-tests).
    const { error: restoreErr } = await authed
      .from('sows')
      .update({ statut: 'En attente saillie' })
      .eq('farm_id', AUDIT_FARM_ID)
      .eq('code_id', 'T-001');
    expect(restoreErr).toBeNull();
  });
});
