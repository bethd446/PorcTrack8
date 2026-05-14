import { supabase } from './supabaseClient';

export interface FarmInfo {
  id: string;
  nom: string;
  nomFerme: string | null;
  secteur: string | null;
  pays: string | null;
}

export interface ProfileUpdate {
  full_name?: string;
}

export interface FarmUpdate {
  nom?: string;
  secteur?: string | null;
}

/**
 * Sprint 20 — Lecture de la ferme depuis `farms` (V71+, source de vérité
 * unique). Le fallback legacy `troupeaux` a été retiré : les 10 comptes V25
 * ont été backfillés vers `farms` (migration
 * 20260514_sprint20_backfill_troupeaux_to_farms.sql).
 *
 * Le paramètre `farmId` est un `farms.id`. Pour les comptes legacy,
 * `farms.id === auth.users.id`, donc les écrans qui passent encore `user.id`
 * (MaFermeV70, SystemManagement) restent fonctionnels.
 *
 * `farms.metadata.secteur` porte le secteur (ex-`troupeaux.secteur`).
 */
export async function fetchFarm(farmId: string): Promise<FarmInfo | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const farmsRes = await (supabase.from('farms') as any)
    .select('id, name, pays, metadata')
    .eq('id', farmId)
    .maybeSingle();
  if (farmsRes.error || !farmsRes.data) return null;
  const meta = (farmsRes.data.metadata ?? {}) as Record<string, unknown>;
  const name = String(farmsRes.data.name ?? '').trim();
  return {
    id: farmsRes.data.id,
    nom: name,
    nomFerme: name || null,
    secteur: typeof meta.secteur === 'string' ? (meta.secteur as string) : null,
    pays: farmsRes.data.pays ?? null,
  };
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId);
  if (error) throw error;
}

/**
 * Sprint 20 — Le rename ferme propage sur `farms.name` (V71+, source de
 * vérité unique). L'écriture best-effort legacy `troupeaux` a été retirée :
 * tous les comptes ont une row `farms` (cf. migration de backfill Sprint 20).
 */
export async function updateFarm(farmId: string, patch: FarmUpdate): Promise<void> {
  if (patch.nom === undefined && patch.secteur === undefined) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const farmsPatch: Record<string, any> = {};
  if (patch.nom !== undefined) farmsPatch.name = patch.nom;
  if (patch.secteur !== undefined) {
    // merge metadata.secteur sans écraser d'autres clés
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('farms') as any)
      .select('metadata')
      .eq('id', farmId)
      .maybeSingle();
    const metaCurrent = (existing?.metadata ?? {}) as Record<string, unknown>;
    farmsPatch.metadata = { ...metaCurrent, secteur: patch.secteur };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: farmsErr } = await (supabase.from('farms') as any)
    .update(farmsPatch)
    .eq('id', farmId);
  if (farmsErr) {
    throw new Error(`updateFarm failed — farms: ${farmsErr.message}`);
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

