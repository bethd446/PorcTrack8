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
 * V81 Sprint 5 — Le paramètre `userOrFarmId` accepte :
 *   - un `farms.id` (V71+ multi-tenant) → on lit `farms` en priorité
 *   - un `auth.users.id` (legacy V25) → on lit `troupeaux` par user_id
 *
 * Stratégie : essayer d'abord `farms` (V71+, source de vérité actuelle), si
 * rien trouvé fallback sur `troupeaux` (legacy). Permet aux écrans qui
 * passaient `user.id` (MaFermeV70:148, SystemManagement) de continuer à
 * fonctionner sans casse, ET aux écrans V71+ qui passent `currentFarmId`
 * (FarmContext:256) de récupérer le rename `farms.name` propagé.
 *
 * `farms.metadata.secteur` est un fallback pour le legacy `troupeaux.secteur`.
 */
export async function fetchFarm(userOrFarmId: string): Promise<FarmInfo | null> {
  // 1) Priorité : table `farms` (V71+) par id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const farmsRes = await (supabase.from('farms') as any)
    .select('id, name, pays, metadata')
    .eq('id', userOrFarmId)
    .maybeSingle();
  if (!farmsRes.error && farmsRes.data) {
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

  // 2) Fallback legacy : table `troupeaux` par user_id (V25)
  const { data, error } = await supabase
    .from('troupeaux')
    .select('id, nom, nom_ferme, secteur, pays')
    .eq('user_id', userOrFarmId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    nom: data.nom,
    nomFerme: data.nom_ferme,
    secteur: data.secteur,
    pays: data.pays,
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
 * V81 Sprint 5 — Le rename ferme doit propager sur `farms.name` (V71+,
 * lu par `fetchFarm`) ET sur `troupeaux.nom` (legacy, lu par contexts non
 * encore migrés). On écrit best-effort dans les 2 tables et on n'échoue
 * que si AUCUNE écriture n'a fonctionné (un OWNER nouveau compte n'a que
 * `farms`, un compte legacy peut n'avoir que `troupeaux`).
 */
export async function updateFarm(farmId: string, patch: FarmUpdate): Promise<void> {
  const errors: string[] = [];
  let okCount = 0;

  // 1) Table actuelle `farms` (V71+) : nom → name, secteur → metadata.secteur
  if (patch.nom !== undefined || patch.secteur !== undefined) {
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
    if (farmsErr) errors.push(`farms: ${farmsErr.message}`);
    else okCount++;
  }

  // 2) Table legacy `troupeaux` : best-effort, ne bloque pas si la row
  // n'existe pas (cas nouveau compte créé après V71)
  const { error: troupeauxErr } = await supabase
    .from('troupeaux')
    .update(patch)
    .eq('id', farmId);
  if (troupeauxErr) errors.push(`troupeaux: ${troupeauxErr.message}`);
  else okCount++;

  if (okCount === 0) {
    throw new Error(`updateFarm failed everywhere — ${errors.join(' | ')}`);
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

