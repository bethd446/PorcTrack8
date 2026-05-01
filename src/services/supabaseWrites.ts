/**
 * supabaseWrites.ts — API write typée et complète au-dessus de Supabase.
 *
 * Couvre insert / update / delete pour toutes les tables métier (truies,
 * verrats, bandes, notes, santé, saillies, finances, aliments, véto), plus
 * des resolvers `code_id → uuid` pour préserver l'API legacy basée sur les
 * codes (T01, V03, B12).
 *
 * Conventions :
 *  - `farm_id` est auto-injecté à partir de `supabase.auth.getSession()`.
 *  - RLS Postgres filtre `farm_id = auth.uid()` → pas de scoping client.
 *  - Les `update*` retournent `WriteResult` (compat composants inline edit).
 *  - Les `insert*` retournent la row insérée typée, ou throw une erreur claire.
 *  - Les `delete*` loggent dans `deletion_log` (best-effort — si la table
 *    n'existe pas en DB, on warn et on continue).
 */
import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

export interface WriteResult {
  success: boolean;
  error?: string;
}

// ── Types Row (snake_case Postgres) ──────────────────────────────────────────

export type SowRow = Database['public']['Tables']['sows']['Row'];
export type BoarRow = Database['public']['Tables']['boars']['Row'];
export type BatchRow = Database['public']['Tables']['batches']['Row'];
export type NoteRow = Database['public']['Tables']['notes']['Row'];
export type HealthLogRow = Database['public']['Tables']['health_logs']['Row'];
export type SaillieRow = Database['public']['Tables']['saillies']['Row'];
export type FinanceRow = Database['public']['Tables']['finances']['Row'];
export type ProduitAlimentRow =
  Database['public']['Tables']['produits_aliments']['Row'];
export type ProduitVetoRow =
  Database['public']['Tables']['produits_veto']['Row'];

type SowInsert = Database['public']['Tables']['sows']['Insert'];
type BoarInsert = Database['public']['Tables']['boars']['Insert'];
type BatchInsert = Database['public']['Tables']['batches']['Insert'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];
type HealthLogInsert = Database['public']['Tables']['health_logs']['Insert'];
type SaillieInsert = Database['public']['Tables']['saillies']['Insert'];
type FinanceInsert = Database['public']['Tables']['finances']['Insert'];
type ProduitAlimentInsert =
  Database['public']['Tables']['produits_aliments']['Insert'];
type ProduitVetoInsert =
  Database['public']['Tables']['produits_veto']['Insert'];

type WithoutFarm<T> = Omit<T, 'farm_id'>;

type WriteTable =
  | 'sows'
  | 'boars'
  | 'batches'
  | 'produits_aliments'
  | 'produits_veto'
  | 'notes'
  | 'health_logs'
  | 'saillies'
  | 'finances';

// ── Helpers internes ─────────────────────────────────────────────────────────

async function getFarmId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Auth session error: ${error.message}`);
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Aucune session authentifiée — connexion requise');
  return uid;
}

async function runUpdate(
  table: WriteTable,
  id: string,
  patch: Record<string, unknown>,
): Promise<WriteResult> {
  if (!id) return { success: false, error: 'ID manquant' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table) as any)
      .update(patch)
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

async function runInsert<TRow>(
  table: WriteTable,
  values: Record<string, unknown>,
): Promise<TRow> {
  const farm_id = await getFarmId();
  const payload = { ...values, farm_id };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table) as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`[${table}] insert failed: ${error.message}`);
  return data as TRow;
}

async function logDeletion(
  table: WriteTable,
  id: string,
  reason: string | undefined,
): Promise<void> {
  try {
    const farm_id = await getFarmId();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('deletion_log' as any) as any)
      .insert({
        farm_id,
        table_name: table,
        row_id: id,
        reason: reason ?? null,
        deleted_by: farm_id,
      });
    if (error) {
      console.warn(
        `[deletion_log] skip (table absente ou RLS) — ${error.message}`,
      );
    }
  } catch (e) {
    console.warn('[deletion_log] skip — auth indisponible', e);
  }
}

async function runDelete(
  table: WriteTable,
  id: string,
  reason?: string,
): Promise<void> {
  if (!id) throw new Error('ID manquant');
  await logDeletion(table, id, reason);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).delete().eq('id', id);
  if (error) throw new Error(`[${table}] delete failed: ${error.message}`);
}

async function resolveIdByCode(
  table: 'sows' | 'boars' | 'batches' | 'produits_aliments' | 'produits_veto',
  code_id: string,
): Promise<string | null> {
  if (!code_id) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table) as any)
    .select('id')
    .eq('code_id', code_id)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

// ── Truies ───────────────────────────────────────────────────────────────────

export function updateSow(
  id: string,
  patch: Partial<SowRow>,
): Promise<WriteResult> {
  return runUpdate('sows', id, patch);
}

export function insertSow(
  values: WithoutFarm<SowInsert>,
): Promise<SowRow> {
  return runInsert<SowRow>('sows', values);
}

export function deleteSow(id: string, reason?: string): Promise<void> {
  return runDelete('sows', id, reason);
}

export async function updateSowByCode(
  code_id: string,
  patch: Partial<SowRow>,
): Promise<SowRow | null> {
  const id = await resolveIdByCode('sows', code_id);
  if (!id) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sows') as any)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`[sows] updateByCode failed: ${error.message}`);
  return data as SowRow;
}

// ── Verrats ──────────────────────────────────────────────────────────────────

export function updateBoar(
  id: string,
  patch: Partial<BoarRow>,
): Promise<WriteResult> {
  return runUpdate('boars', id, patch);
}

export function insertBoar(
  values: WithoutFarm<BoarInsert>,
): Promise<BoarRow> {
  return runInsert<BoarRow>('boars', values);
}

export function deleteBoar(id: string, reason?: string): Promise<void> {
  return runDelete('boars', id, reason);
}

export async function updateBoarByCode(
  code_id: string,
  patch: Partial<BoarRow>,
): Promise<BoarRow | null> {
  const id = await resolveIdByCode('boars', code_id);
  if (!id) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('boars') as any)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`[boars] updateByCode failed: ${error.message}`);
  return data as BoarRow;
}

// ── Bandes ───────────────────────────────────────────────────────────────────

export function updateBatch(
  id: string,
  patch: Partial<BatchRow>,
): Promise<WriteResult> {
  return runUpdate('batches', id, patch);
}

export function insertBatch(
  values: WithoutFarm<BatchInsert>,
): Promise<BatchRow> {
  return runInsert<BatchRow>('batches', values);
}

export function deleteBatch(id: string, reason?: string): Promise<void> {
  return runDelete('batches', id, reason);
}

export async function updateBatchByCode(
  code_id: string,
  patch: Partial<BatchRow> & { poids_initial_kg?: number | null },
): Promise<BatchRow | null> {
  const id = await resolveIdByCode('batches', code_id);
  if (!id) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('batches') as any)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`[batches] updateByCode failed: ${error.message}`);
  return data as BatchRow;
}

/**
 * Met à jour le poids initial (au sevrage) d'une bande identifiée par son code.
 * Source de vérité pour les calculs IC et GMQ. Validation côté DB :
 * `poids_initial_kg > 0 AND <= 200` (CHECK constraint).
 */
export async function setBandePoidsInitial(
  code_id: string,
  poidsKg: number,
): Promise<WriteResult> {
  if (!Number.isFinite(poidsKg) || poidsKg <= 0 || poidsKg > 200) {
    return { success: false, error: 'Poids invalide' };
  }
  const id = await resolveIdByCode('batches', code_id);
  if (!id) return { success: false, error: `Bande ${code_id} introuvable` };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('batches') as any)
    .update({ poids_initial_kg: poidsKg, poids_moyen_kg: poidsKg })
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Notes ────────────────────────────────────────────────────────────────────

export function updateNote(
  id: string,
  patch: Partial<NoteRow>,
): Promise<WriteResult> {
  return runUpdate('notes', id, patch);
}

export function insertNote(
  values: WithoutFarm<NoteInsert>,
): Promise<NoteRow> {
  return runInsert<NoteRow>('notes', values);
}

export function deleteNote(id: string): Promise<void> {
  return runDelete('notes', id);
}

// ── Santé ────────────────────────────────────────────────────────────────────

export function insertHealthLog(
  values: WithoutFarm<HealthLogInsert>,
): Promise<HealthLogRow> {
  return runInsert<HealthLogRow>('health_logs', values);
}

export function deleteHealthLog(id: string): Promise<void> {
  return runDelete('health_logs', id);
}

// ── Saillies ─────────────────────────────────────────────────────────────────

export function insertSaillie(
  values: WithoutFarm<SaillieInsert>,
): Promise<SaillieRow> {
  return runInsert<SaillieRow>('saillies', values);
}

/**
 * Patch partiel d'une saillie. Accepte les champs métier `Update` ainsi que
 * les nouvelles colonnes V21 d'échographie (`statut_echo`, `date_echo`,
 * `notes_echo`) qui ne sont pas encore régénérées dans Database types.
 */
export type SaillieUpdatePatch = Partial<SaillieRow> & {
  statut_echo?: 'CONFIRMEE' | 'VIDE' | 'DOUTEUSE' | null;
  date_echo?: string | null;
  notes_echo?: string | null;
};

export function updateSaillie(
  id: string,
  patch: SaillieUpdatePatch,
): Promise<WriteResult> {
  return runUpdate('saillies', id, patch as Record<string, unknown>);
}

// ── Finances ─────────────────────────────────────────────────────────────────

export function insertFinance(
  values: WithoutFarm<FinanceInsert>,
): Promise<FinanceRow> {
  return runInsert<FinanceRow>('finances', values);
}

// ── Weight distributions (V21-4 — tri par poids engraissement) ──────────────

export interface WeightDistributionInsert {
  batch_id: string;
  date_pesee: string; // YYYY-MM-DD
  nb_under_90kg: number;
  nb_90_to_100kg: number;
  nb_100_to_110kg: number;
  nb_above_110kg: number;
  notes: string | null;
  created_by: string;
}

/**
 * Insert dans `weight_distributions`. Table créée par la migration V21-4 ;
 * pas encore présente dans `Database` types, donc cast `any`.
 */
export async function insertWeightDistribution(
  values: WeightDistributionInsert,
): Promise<{ id: string }> {
  const farm_id = await getFarmId();
  const payload = { ...values, farm_id };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('weight_distributions' as any) as any)
    .insert(payload)
    .select()
    .single();
  if (error) {
    throw new Error(`[weight_distributions] insert failed: ${error.message}`);
  }
  return data as { id: string };
}

export interface WeightDistributionRow {
  id: string;
  farm_id: string;
  batch_id: string;
  date_pesee: string;
  nb_under_90kg: number;
  nb_90_to_100kg: number;
  nb_100_to_110kg: number;
  nb_above_110kg: number;
  notes: string | null;
  created_at: string;
  created_by: string;
}

/** Liste les distributions de poids pour une bande, du plus récent au plus ancien. */
export async function listWeightDistributions(
  batch_id: string,
): Promise<WeightDistributionRow[]> {
  if (!batch_id) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('weight_distributions' as any) as any)
    .select('*')
    .eq('batch_id', batch_id)
    .order('date_pesee', { ascending: false })
    .limit(50);
  if (error) {
    console.warn('[weight_distributions] list failed:', error.message);
    return [];
  }
  return (data ?? []) as WeightDistributionRow[];
}

// ── Fournisseurs (V21-D1) ───────────────────────────────────────────────────

export type FournisseurType = 'ALIMENT' | 'PHARMACIE' | 'GENETIQUE' | 'AUTRE';

export interface FournisseurRow {
  id: string;
  farm_id: string;
  nom: string;
  type: FournisseurType | null;
  whatsapp_number: string | null;
  email: string | null;
  notes: string | null;
  is_default: boolean;
  created_at: string;
}

export interface FournisseurInsert {
  nom: string;
  type: FournisseurType | null;
  whatsapp_number: string | null;
  email: string | null;
  notes: string | null;
  is_default: boolean;
}

export async function insertFournisseur(
  values: FournisseurInsert,
): Promise<FournisseurRow> {
  const farm_id = await getFarmId();
  const payload = { ...values, farm_id };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('fournisseurs' as any) as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`[fournisseurs] insert failed: ${error.message}`);
  return data as FournisseurRow;
}

export async function listFournisseurs(): Promise<FournisseurRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('fournisseurs' as any) as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[fournisseurs] list failed:', error.message);
    return [];
  }
  return (data ?? []) as FournisseurRow[];
}

export async function updateFournisseur(
  id: string,
  patch: Partial<FournisseurInsert>,
): Promise<WriteResult> {
  if (!id) return { success: false, error: 'ID manquant' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('fournisseurs' as any) as any)
      .update(patch)
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteFournisseur(id: string): Promise<void> {
  if (!id) throw new Error('ID manquant');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('fournisseurs' as any) as any)
    .delete()
    .eq('id', id);
  if (error) throw new Error(`[fournisseurs] delete failed: ${error.message}`);
}

// ── Adoptions (V21-D2) ──────────────────────────────────────────────────────

export type AdoptionMotif = 'EQUILIBRAGE' | 'TRUIE_INSUFFISANTE_LAIT' | 'AUTRE';

export interface AdoptionInsert {
  from_batch_id: string;
  to_batch_id: string;
  nb_porcelets: number;
  date_adoption: string; // YYYY-MM-DD
  motif: AdoptionMotif | null;
  notes: string | null;
  created_by: string;
}

export interface AdoptionRow extends AdoptionInsert {
  id: string;
  farm_id: string;
  created_at: string;
}

/**
 * Insert d'une adoption + ajustement des porcelets vivants des deux bandes.
 *
 * Workflow :
 *  1. Insert dans `adoptions` (RLS contrôlée).
 *  2. Décrémente `from_batch.porcelets_nes_vivants` de `nb_porcelets`.
 *  3. Incrémente `to_batch.porcelets_nes_vivants` de `nb_porcelets`.
 *
 * En cas d'échec d'une étape post-insert, on logue mais on ne rollback pas
 * automatiquement (à faire manuellement par l'utilisateur).
 */
export async function insertAdoption(
  values: AdoptionInsert,
): Promise<AdoptionRow> {
  if (values.from_batch_id === values.to_batch_id) {
    throw new Error('Bande source et destination identiques (no_self_adoption)');
  }
  if (!Number.isFinite(values.nb_porcelets) || values.nb_porcelets <= 0) {
    throw new Error('nb_porcelets doit être > 0');
  }

  const farm_id = await getFarmId();
  const payload = { ...values, farm_id };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('adoptions' as any) as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`[adoptions] insert failed: ${error.message}`);

  // Adjust batches.porcelets_nes_vivants
  await adjustBatchVivants(values.from_batch_id, -values.nb_porcelets);
  await adjustBatchVivants(values.to_batch_id, values.nb_porcelets);

  return data as AdoptionRow;
}

async function adjustBatchVivants(batchId: string, delta: number): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('batches') as any)
    .select('porcelets_nes_vivants')
    .eq('id', batchId)
    .single();
  if (error || !data) {
    console.warn(`[adoptions] adjust batch ${batchId}: cannot read current vivants`, error);
    return;
  }
  const current = Number(data.porcelets_nes_vivants ?? 0);
  const next = Math.max(0, current + delta);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase.from('batches') as any)
    .update({ porcelets_nes_vivants: next })
    .eq('id', batchId);
  if (updErr) {
    console.warn(`[adoptions] adjust batch ${batchId}: update failed`, updErr);
  }
}

// ── Aliments ─────────────────────────────────────────────────────────────────

export function updateProduitAliment(
  id: string,
  patch: Partial<ProduitAlimentRow>,
): Promise<WriteResult> {
  return runUpdate('produits_aliments', id, patch);
}

export function insertProduitAliment(
  values: WithoutFarm<ProduitAlimentInsert>,
): Promise<ProduitAlimentRow> {
  return runInsert<ProduitAlimentRow>('produits_aliments', values);
}

export function deleteProduitAliment(id: string): Promise<void> {
  return runDelete('produits_aliments', id);
}

// ── Vétérinaire ──────────────────────────────────────────────────────────────

export function updateProduitVeto(
  id: string,
  patch: Partial<ProduitVetoRow>,
): Promise<WriteResult> {
  return runUpdate('produits_veto', id, patch);
}

export function insertProduitVeto(
  values: WithoutFarm<ProduitVetoInsert>,
): Promise<ProduitVetoRow> {
  return runInsert<ProduitVetoRow>('produits_veto', values);
}

export function deleteProduitVeto(id: string): Promise<void> {
  return runDelete('produits_veto', id);
}

// ── Resolvers code_id → uuid ─────────────────────────────────────────────────

export function resolveSowIdByCode(code_id: string): Promise<string | null> {
  return resolveIdByCode('sows', code_id);
}

export function resolveBoarIdByCode(code_id: string): Promise<string | null> {
  return resolveIdByCode('boars', code_id);
}

export function resolveBatchIdByCode(code_id: string): Promise<string | null> {
  return resolveIdByCode('batches', code_id);
}

export function resolveProduitAlimentByCode(
  code_id: string,
): Promise<string | null> {
  return resolveIdByCode('produits_aliments', code_id);
}

export function resolveProduitVetoByCode(
  code_id: string,
): Promise<string | null> {
  return resolveIdByCode('produits_veto', code_id);
}

// ── Saillie resolver (workflow Saillie → Mise-bas) ───────────────────────────

export interface LastSaillieResolved {
  /** UUID du verrat (FK boars.id), ou null si la saillie n'a pas de verrat lié. */
  boar_id: string | null;
  /** Code du verrat (ex: V01) pour affichage UI, si disponible. */
  boar_code_id: string | null;
  /** Date de saillie au format ISO yyyy-MM-dd. */
  date_saillie: string;
}

/**
 * Saillie « en cours » d'une truie (saillie active dont la MB n'a pas encore
 * eu lieu). Retourne l'UUID de la saillie pour pouvoir patcher (statut_echo,
 * date_echo, notes_echo) — utilisé par le QuickEchographieForm.
 */
export interface PendingSaillie {
  saillie_id: string;
  sow_id: string;
  sow_code_id: string | null;
  boar_code_id: string | null;
  date_saillie: string;
  /** Jours depuis la saillie (calculé côté serveur via dateRef). */
  days_since: number;
}

/**
 * Liste les saillies « en attente d'écho » : saillies d'au moins `minDaysAgo`
 * jours pour lesquelles le statut écho n'est pas encore renseigné.
 *
 * Utilisé pour alimenter le sélecteur du QuickEchographieForm. Ordre :
 * plus récente d'abord.
 */
export async function listPendingEchographies(
  options: { minDaysAgo?: number; dateRef?: Date } = {},
): Promise<PendingSaillie[]> {
  const minDaysAgo = options.minDaysAgo ?? 21;
  const dateRef = options.dateRef ?? new Date();
  if (!Number.isFinite(dateRef.getTime())) return [];

  const upperIso = new Date(dateRef.getTime() - minDaysAgo * 86400000)
    .toISOString()
    .slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('saillies') as any)
    .select('id, sow_id, sow_code_id, boar_code_id, date_saillie, statut_echo, sows(code_id)')
    .lte('date_saillie', upperIso)
    .is('statut_echo', null)
    .order('date_saillie', { ascending: false });

  if (error || !data) return [];

  const refTs = dateRef.getTime();
  return (data as Array<{
    id: string;
    sow_id: string | null;
    sow_code_id: string | null;
    boar_code_id: string | null;
    date_saillie: string | null;
    sows?: { code_id?: string | null } | null;
  }>)
    .filter(r => !!r.id && !!r.sow_id && !!r.date_saillie)
    .map(r => {
      const ds = new Date(r.date_saillie as string);
      const daysSince = Number.isFinite(ds.getTime())
        ? Math.max(0, Math.round((refTs - ds.getTime()) / 86400000))
        : 0;
      return {
        saillie_id: r.id,
        sow_id: r.sow_id as string,
        sow_code_id: r.sows?.code_id ?? r.sow_code_id ?? null,
        boar_code_id: r.boar_code_id ?? null,
        date_saillie: r.date_saillie as string,
        days_since: daysSince,
      };
    });
}

/**
 * Cherche la saillie la plus récente AVANT `dateMB` pour la truie donnée.
 *
 * Utilisé par QuickMiseBasForm pour auto-résoudre le verrat père au moment
 * d'enregistrer une mise-bas. Fenêtre par défaut : 130 jours (115 ± 15).
 *
 * Le paramètre `truie` accepte SOIT un UUID (sows.id) SOIT un code_id
 * (sows.code_id, ex: T07) — résolution interne.
 *
 * @returns la saillie résolue, ou `null` si aucune saillie dans la fenêtre.
 */
export async function findLastSaillieForTruie(
  truie: string,
  dateMB: Date | string,
  windowDays = 130,
): Promise<LastSaillieResolved | null> {
  if (!truie) return null;

  // Accepte UUID ou code_id (T07) — résolution si nécessaire.
  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(truie);
  const sowId = looksLikeUuid ? truie : await resolveIdByCode('sows', truie);
  if (!sowId) return null;

  const dateRef = typeof dateMB === 'string' ? new Date(dateMB) : dateMB;
  if (!Number.isFinite(dateRef.getTime())) return null;
  const upperIso = dateRef.toISOString().slice(0, 10);
  const lowerIso = new Date(dateRef.getTime() - windowDays * 86400000)
    .toISOString()
    .slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('saillies') as any)
    .select('boar_id, boar_code_id, date_saillie, boars(code_id)')
    .eq('sow_id', sowId)
    .lte('date_saillie', upperIso)
    .gte('date_saillie', lowerIso)
    .order('date_saillie', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as {
    boar_id: string | null;
    boar_code_id: string | null;
    date_saillie: string | null;
    boars?: { code_id?: string | null } | null;
  };
  return {
    boar_id: row.boar_id ?? null,
    boar_code_id: row.boars?.code_id ?? row.boar_code_id ?? null,
    date_saillie: row.date_saillie ?? '',
  };
}
