/**
 * supabaseWrites.ts — API write typée et complète au-dessus de Supabase.
 *
 * Couvre insert / update / delete pour toutes les tables métier (truies,
 * verrats, bandes, notes, santé, saillies, finances, aliments, véto), plus
 * des resolvers `code_id → uuid` pour préserver l'API legacy basée sur les
 * codes (T01, V03, B12).
 *
 * Conventions :
 *  - `farm_id` est auto-injecté via `getFarmId()` :
 *      1. priorité au `currentFarmId` exposé par FarmContext (V71-P2 multi-user) ;
 *      2. fallback sur `auth.uid()` (rétro-compat V71-P1 : un user = une ferme).
 *  - RLS Postgres scope par `farm_members` (helper SECURITY DEFINER).
 *  - Les `update*` retournent `WriteResult` (compat composants inline edit).
 *  - Les `insert*` retournent la row insérée typée, ou throw une erreur claire.
 *  - Les `delete*` loggent dans `deletion_log` (best-effort — si la table
 *    n'existe pas en DB, on warn et on continue).
 */
import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';
import type {
  BatchSource,
  Loge,
  LogeType,
  LogeMovement,
  Truie,
  Verrat,
  BandePorcelets,
  PorceletIndividuel,
  PorceletSexe,
  PorceletStatut,
} from '../types/farm';

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
export type PeseeRow = Database['public']['Tables']['pesees']['Row'];
export type PorceletIndividuelDbRow =
  Database['public']['Tables']['porcelets_individuels']['Row'];
export type LogeDbRow = Database['public']['Tables']['loges']['Row'];
export type LogeMovementDbRow =
  Database['public']['Tables']['loge_movements']['Row'];
export type DailyCheckMbRow =
  Database['public']['Tables']['daily_checks_mb']['Row'];
export type FeedConsumptionLogRow =
  Database['public']['Tables']['feed_consumption_logs']['Row'];

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
  | 'finances'
  | 'pesees'
  | 'porcelets_individuels'
  | 'loges'
  | 'loge_movements'
  | 'daily_checks_mb'
  | 'feed_consumption_logs';

// ── Helpers internes ─────────────────────────────────────────────────────────

/**
 * V71-P2 — Référence globale vers la `currentFarmId` exposée par FarmContext.
 *
 * Pourquoi un module-level ref plutôt qu'un import direct du contexte React ?
 * Les fonctions de ce service sont appelées depuis des handlers async (forms,
 * services tiers) qui n'ont pas accès au React tree. On garde donc une simple
 * ref settable que `FarmContext` met à jour via `setCurrentFarmIdRef()` à
 * chaque mount/switch.
 *
 * Si la ref est `null` (pas encore initialisée, ou tests qui n'utilisent pas
 * FarmContext), `getFarmId()` retombe sur `auth.uid()` — comportement
 * rétro-compatible avec le backfill V71-P2 (`farms.id = profiles.id`).
 */
let globalCurrentFarmIdRef: string | null = null;

/**
 * V71-P2 — Set la `currentFarmId` accessible depuis les services.
 * Appelé par FarmContext via useEffect au mount et à chaque `switchFarm()`.
 */
export function setCurrentFarmIdRef(farmId: string | null): void {
  globalCurrentFarmIdRef = farmId;
}

/**
 * V71-P2 phase C — Getter exporté pour permettre aux autres services
 * (peseePlanifieesService, mbWorkflowService, feedConsumptionAnalyzer, …)
 * de résoudre `farm_id` en priorité via `currentFarmId` avant fallback
 * `auth.uid()`. Évite la duplication du pattern dans chaque service.
 */
export function getCurrentFarmIdRef(): string | null {
  return globalCurrentFarmIdRef;
}

/** V71-P2 — Test-only : reset la ref globale entre tests. */
export function __resetCurrentFarmIdRefForTests(): void {
  globalCurrentFarmIdRef = null;
}

async function getFarmId(): Promise<string> {
  // 1. Priorité : currentFarmId exposé par FarmContext (multi-user).
  if (globalCurrentFarmIdRef) return globalCurrentFarmIdRef;

  // 2. Fallback : auth.uid() (rétro-compat V71-P1, backfill farms.id=profiles.id).
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

// ── V25 — Santé porcelet individuel ─────────────────────────────────────────

export type PorceletHealthLogType =
  | 'CONSULT'
  | 'TRAITEMENT'
  | 'VACCIN'
  | 'ANTIBIO'
  | 'AUTRE';

export interface PorceletHealthLogArgs {
  porceletId: string;
  batchId: string;
  logType: PorceletHealthLogType;
  symptome?: string;
  diagnostic?: string;
  treatment?: string;
  doseCount?: number;
  weightKg?: number;
  notes?: string;
}

/**
 * Insert d'un health_log lié à un porcelet individuel + auto-update statut.
 *
 * Effets :
 *  1. INSERT dans health_logs avec porcelet_id, batch_id, animal_type='PORCELET'.
 *  2. Si logType ∈ {CONSULT, TRAITEMENT} → patch porcelet.statut = 'MALADE'
 *     (best-effort, on warn si l'update échoue).
 *
 * Validation : porceletId et batchId requis ; doseCount 0..50 ; weightKg 0..200.
 */
export async function insertHealthLogForPorcelet(
  args: PorceletHealthLogArgs,
): Promise<void> {
  if (!args.porceletId) throw new Error('porceletId manquant');
  if (!args.batchId) throw new Error('batchId manquant');
  if (
    args.doseCount != null &&
    (!Number.isFinite(args.doseCount) || args.doseCount < 0 || args.doseCount > 50)
  ) {
    throw new Error('doseCount doit être entre 0 et 50');
  }
  if (
    args.weightKg != null &&
    (!Number.isFinite(args.weightKg) || args.weightKg <= 0 || args.weightKg > 200)
  ) {
    throw new Error('weightKg doit être entre 0 et 200');
  }

  const farm_id = await getFarmId();
  const ts = Date.now();
  const payload: Record<string, unknown> = {
    farm_id,
    code_id: `HL-PORC-${ts}`,
    animal_type: 'PORCELET',
    porcelet_id: args.porceletId,
    batch_id: args.batchId,
    log_type: args.logType,
    symptom: args.symptome ?? null,
    diagnosis: args.diagnostic ?? null,
    treatment: args.treatment ?? null,
    dose_count: args.doseCount ?? null,
    weight_kg: args.weightKg ?? null,
    notes: args.notes ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('health_logs') as any).insert(payload);
  if (error) {
    throw new Error(`[health_logs] insert porcelet failed: ${error.message}`);
  }

  // Auto-update statut porcelet si CONSULT/TRAITEMENT.
  if (args.logType === 'CONSULT' || args.logType === 'TRAITEMENT') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updErr } = await (supabase.from('porcelets_individuels' as any) as any)
      .update({ statut: 'MALADE' })
      .eq('id', args.porceletId);
    if (updErr) {
      console.warn(
        `[porcelets_individuels] update statut MALADE failed: ${updErr.message}`,
      );
    }
  }
}

export interface PorceletHealthLog {
  id: string;
  porceletId: string;
  batchId: string | null;
  logType: string;
  symptome: string | null;
  diagnostic: string | null;
  treatment: string | null;
  doseCount: number | null;
  weightKg: number | null;
  notes: string | null;
  loggedAt: string;
  logDate: string;
}

/** Liste les health_logs d'un porcelet, du plus récent au plus ancien. */
export async function listHealthLogsForPorcelet(
  porceletId: string,
): Promise<PorceletHealthLog[]> {
  if (!porceletId) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('health_logs') as any)
    .select(
      'id, porcelet_id, batch_id, log_type, symptom, diagnosis, treatment, dose_count, weight_kg, notes, logged_at, log_date',
    )
    .eq('porcelet_id', porceletId)
    .order('logged_at', { ascending: false });
  if (error) {
    console.warn('[health_logs] list porcelet failed:', error.message);
    return [];
  }
  return ((data ?? []) as Array<{
    id: string;
    porcelet_id: string;
    batch_id: string | null;
    log_type: string;
    symptom: string | null;
    diagnosis: string | null;
    treatment: string | null;
    dose_count: number | null;
    weight_kg: number | null;
    notes: string | null;
    logged_at: string;
    log_date: string;
  }>).map(r => ({
    id: r.id,
    porceletId: r.porcelet_id,
    batchId: r.batch_id,
    logType: r.log_type,
    symptome: r.symptom,
    diagnostic: r.diagnosis,
    treatment: r.treatment,
    doseCount: r.dose_count,
    weightKg: r.weight_kg,
    notes: r.notes,
    loggedAt: r.logged_at,
    logDate: r.log_date,
  }));
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

// ── V24 — Batch sources (multi-mères) ───────────────────────────────────────

interface BatchSowRow {
  id: string;
  batch_id: string;
  sow_id: string;
  nb_porcelets_apportes: number;
  date_ajout: string;
  notes: string | null;
  sows?: { code_id?: string | null; boucle?: string | null; name?: string | null } | null;
}

function mapBatchSow(r: BatchSowRow): BatchSource {
  return {
    id: r.id,
    sowId: r.sow_id,
    sowCode: r.sows?.code_id ?? '',
    sowBoucle: r.sows?.boucle ?? undefined,
    sowName: r.sows?.name ?? undefined,
    nbPorceletsApportes: r.nb_porcelets_apportes,
    dateAjout: r.date_ajout,
    notes: r.notes ?? undefined,
  };
}

/**
 * Liste les truies sources d'une bande (table `batch_sows`).
 * Triées par date d'ajout asc (1ère ajoutée = mère principale conventionnelle).
 */
export async function getBatchSources(batchId: string): Promise<BatchSource[]> {
  if (!batchId) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('batch_sows' as any) as any)
    .select('id, batch_id, sow_id, nb_porcelets_apportes, date_ajout, notes, sows(code_id, boucle, name)')
    .eq('batch_id', batchId)
    .order('date_ajout', { ascending: true });
  if (error) {
    console.warn('[batch_sows] list failed:', error.message);
    return [];
  }
  return (data as BatchSowRow[] ?? []).map(mapBatchSow);
}

/**
 * Ajoute une truie source à une bande.
 *
 * Effets :
 *  - INSERT dans batch_sows
 *  - Si batches.sow_id IS NULL, PATCH avec sow_id = sowId fourni
 *    (1ère source ajoutée devient la "mère principale" auto-syncée).
 */
export async function addBatchSource(args: {
  batchId: string;
  sowId: string;
  nbPorcelets: number;
  dateAjout?: string;
  notes?: string;
}): Promise<BatchSource> {
  if (!args.batchId) throw new Error('batchId manquant');
  if (!args.sowId) throw new Error('sowId manquant');
  if (!Number.isFinite(args.nbPorcelets) || args.nbPorcelets <= 0 || args.nbPorcelets > 30) {
    throw new Error('nbPorcelets doit être entre 1 et 30');
  }

  const farm_id = await getFarmId();
  const payload = {
    farm_id,
    batch_id: args.batchId,
    sow_id: args.sowId,
    nb_porcelets_apportes: args.nbPorcelets,
    date_ajout: args.dateAjout ?? new Date().toISOString().slice(0, 10),
    notes: args.notes ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('batch_sows' as any) as any)
    .insert(payload)
    .select('id, batch_id, sow_id, nb_porcelets_apportes, date_ajout, notes, sows(code_id, boucle, name)')
    .single();
  if (error) throw new Error(`[batch_sows] insert failed: ${error.message}`);

  // Si batches.sow_id est NULL, on patche avec cette truie comme mère principale.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batchRow } = await (supabase.from('batches') as any)
    .select('sow_id')
    .eq('id', args.batchId)
    .maybeSingle();
  if (batchRow && batchRow.sow_id == null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('batches') as any)
      .update({ sow_id: args.sowId })
      .eq('id', args.batchId);
  }

  return mapBatchSow(data as BatchSowRow);
}

/** Patch un batch_source (nb porcelets ou notes uniquement). */
export async function updateBatchSource(
  id: string,
  patch: Partial<Pick<BatchSource, 'nbPorceletsApportes' | 'notes'>>,
): Promise<void> {
  if (!id) throw new Error('ID manquant');
  const dbPatch: Record<string, unknown> = {};
  if (patch.nbPorceletsApportes != null) {
    if (
      !Number.isFinite(patch.nbPorceletsApportes) ||
      patch.nbPorceletsApportes <= 0 ||
      patch.nbPorceletsApportes > 30
    ) {
      throw new Error('nbPorceletsApportes doit être entre 1 et 30');
    }
    dbPatch.nb_porcelets_apportes = patch.nbPorceletsApportes;
  }
  if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
  if (Object.keys(dbPatch).length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('batch_sows' as any) as any)
    .update(dbPatch)
    .eq('id', id);
  if (error) throw new Error(`[batch_sows] update failed: ${error.message}`);
}

/** Supprime un batch_source (retire une truie source). */
export async function removeBatchSource(id: string): Promise<void> {
  if (!id) throw new Error('ID manquant');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('batch_sows' as any) as any)
    .delete()
    .eq('id', id);
  if (error) throw new Error(`[batch_sows] delete failed: ${error.message}`);
}

// ── V24 — Loges (référentiel structuré) ─────────────────────────────────────

interface LogeRow {
  id: string;
  numero: string;
  type: LogeType;
  batiment: string | null;
  capacite_max: number | null;
  notes: string | null;
  active: boolean;
}

function mapLoge(r: LogeRow): Loge {
  return {
    id: r.id,
    numero: r.numero,
    type: r.type,
    batiment: r.batiment ?? undefined,
    capaciteMax: r.capacite_max ?? undefined,
    notes: r.notes ?? undefined,
    active: r.active,
  };
}

/**
 * Liste les loges de la ferme (RLS scope farm_id auto via auth.uid()).
 * Inclut les loges archivées (active=false) — filtrer côté UI si besoin.
 */
export async function listLoges(): Promise<Loge[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('loges' as any) as any)
    .select('id, numero, type, batiment, capacite_max, notes, active')
    .order('numero', { ascending: true });
  if (error) {
    console.warn('[loges] list failed:', error.message);
    return [];
  }
  return (data as LogeRow[] ?? []).map(mapLoge);
}

/** Crée une nouvelle loge. `active` défaut à true. */
export async function createLoge(
  data: Omit<Loge, 'id' | 'active'> & { active?: boolean },
): Promise<Loge> {
  if (!data.numero || !data.numero.trim()) throw new Error('numero requis');
  const farm_id = await getFarmId();
  const payload = {
    farm_id,
    numero: data.numero.trim(),
    type: data.type,
    batiment: data.batiment ?? null,
    capacite_max: data.capaciteMax ?? null,
    notes: data.notes ?? null,
    active: data.active ?? true,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase.from('loges' as any) as any)
    .insert(payload)
    .select('id, numero, type, batiment, capacite_max, notes, active')
    .single();
  if (error) throw new Error(`[loges] insert failed: ${error.message}`);
  return mapLoge(row as LogeRow);
}

/** Patch partiel d'une loge. */
export async function updateLoge(
  id: string,
  patch: Partial<Loge>,
): Promise<void> {
  if (!id) throw new Error('ID manquant');
  const dbPatch: Record<string, unknown> = {};
  if (patch.numero !== undefined) dbPatch.numero = patch.numero;
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.batiment !== undefined) dbPatch.batiment = patch.batiment ?? null;
  if (patch.capaciteMax !== undefined) dbPatch.capacite_max = patch.capaciteMax ?? null;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
  if (patch.active !== undefined) dbPatch.active = patch.active;
  if (Object.keys(dbPatch).length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('loges' as any) as any)
    .update(dbPatch)
    .eq('id', id);
  if (error) throw new Error(`[loges] update failed: ${error.message}`);
}

/** Soft-delete : passe active=false (préserve historique mouvements). */
export async function deactivateLoge(id: string): Promise<void> {
  return updateLoge(id, { active: false });
}

// ── V24 — Mouvements inter-loges ────────────────────────────────────────────

interface LogeMovementRow {
  id: string;
  subject_type: 'TRUIE' | 'VERRAT' | 'BANDE';
  subject_id: string;
  from_loge_id: string | null;
  to_loge_id: string | null;
  date_mvt: string;
  reason: string | null;
}

function mapLogeMovement(r: LogeMovementRow): LogeMovement {
  return {
    id: r.id,
    subjectType: r.subject_type,
    subjectId: r.subject_id,
    fromLogeId: r.from_loge_id ?? undefined,
    toLogeId: r.to_loge_id ?? undefined,
    dateMvt: r.date_mvt,
    reason: r.reason ?? undefined,
  };
}

/**
 * Déplace un sujet (truie / verrat / bande) vers une nouvelle loge.
 *
 * Effets :
 *  1. Lit subject.loge_id actuel = from_loge_id
 *  2. INSERT loge_movements (historique)
 *  3. PATCH subject.loge_id = toLogeId
 */
export async function moveSubject(args: {
  subjectType: 'TRUIE' | 'VERRAT' | 'BANDE';
  subjectId: string;
  toLogeId: string;
  reason?: string;
}): Promise<LogeMovement> {
  if (!args.subjectId) throw new Error('subjectId manquant');
  if (!args.toLogeId) throw new Error('toLogeId manquant');

  const tableMap = {
    TRUIE: 'sows',
    VERRAT: 'boars',
    BANDE: 'batches',
  } as const;
  const table = tableMap[args.subjectType];

  // 1. Lis loge_id actuel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cur } = await (supabase.from(table) as any)
    .select('loge_id')
    .eq('id', args.subjectId)
    .maybeSingle();
  const fromLogeId = (cur as { loge_id?: string | null } | null)?.loge_id ?? null;

  const farm_id = await getFarmId();

  // 2. INSERT mouvement
  const payload = {
    farm_id,
    subject_type: args.subjectType,
    subject_id: args.subjectId,
    from_loge_id: fromLogeId,
    to_loge_id: args.toLogeId,
    date_mvt: new Date().toISOString().slice(0, 10),
    reason: args.reason ?? null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mvt, error: mvtErr } = await (supabase.from('loge_movements' as any) as any)
    .insert(payload)
    .select('id, subject_type, subject_id, from_loge_id, to_loge_id, date_mvt, reason')
    .single();
  if (mvtErr) throw new Error(`[loge_movements] insert failed: ${mvtErr.message}`);

  // 3. PATCH loge_id sur le sujet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase.from(table) as any)
    .update({ loge_id: args.toLogeId })
    .eq('id', args.subjectId);
  if (updErr) {
    console.warn(`[${table}] update loge_id failed: ${updErr.message}`);
  }

  return mapLogeMovement(mvt as LogeMovementRow);
}

/**
 * Liste les sujets actuellement présents dans une loge donnée.
 * Retourne {truies, verrats, bandes, totalAnimaux}.
 */
export async function getLogeContents(logeId: string): Promise<{
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  totalAnimaux: number;
}> {
  if (!logeId) {
    return { truies: [], verrats: [], bandes: [], totalAnimaux: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: sowsData }, { data: boarsData }, { data: batchesData }] =
    await Promise.all([
      (supabase.from('sows') as any).select('*').eq('loge_id', logeId),
      (supabase.from('boars') as any).select('*').eq('loge_id', logeId),
      (supabase.from('batches') as any).select('*').eq('loge_id', logeId),
    ]);

  const truies: Truie[] = ((sowsData as Record<string, unknown>[]) ?? []).map(r => ({
    id: r.id as string,
    displayId: (r.code_id as string) ?? '',
    boucle: (r.boucle as string) ?? '',
    nom: (r.name as string) ?? undefined,
    statut: (r.statut as string) ?? 'En attente saillie',
    ration: (r.ration_kg_j as number) ?? 0,
    logeId: (r.loge_id as string) ?? undefined,
    synced: true,
  }));

  const verrats: Verrat[] = ((boarsData as Record<string, unknown>[]) ?? []).map(r => ({
    id: r.id as string,
    displayId: (r.code_id as string) ?? '',
    boucle: (r.boucle as string) ?? '',
    nom: (r.name as string) ?? undefined,
    statut: (r.statut as string) ?? 'Actif',
    ration: (r.ration_kg_j as number) ?? 0,
    logeId: (r.loge_id as string) ?? undefined,
    synced: true,
  }));

  const bandes: BandePorcelets[] = ((batchesData as Record<string, unknown>[]) ?? []).map(r => {
    const nv = (r.porcelets_nes_vivants as number) ?? 0;
    const morts = (r.nb_mort_nes as number) ?? 0;
    return {
      id: r.id as string,
      idPortee: (r.code_id as string) ?? '',
      statut: (r.statut as string) ?? 'Sous mère',
      poidsInitialKg: (r.poids_initial_kg as number) ?? 0,
      nv,
      morts,
      vivants: nv - morts,
      logeId: (r.loge_id as string) ?? undefined,
      synced: true,
    };
  });

  const totalAnimaux =
    truies.length +
    verrats.length +
    bandes.reduce((sum, b) => sum + (b.vivants ?? 0), 0);

  return { truies, verrats, bandes, totalAnimaux };
}

// ── V25 — Porcelets individuels (table `porcelets_individuels`) ─────────────

interface PorceletIndividuelRow {
  id: string;
  batch_id: string;
  boucle: string;
  sexe: PorceletSexe;
  poids_courant_kg: number | null;
  statut: PorceletStatut;
  notes: string | null;
}

function mapPorcelet(r: PorceletIndividuelRow): PorceletIndividuel {
  return {
    id: r.id,
    batchId: r.batch_id,
    boucle: r.boucle,
    sexe: r.sexe,
    poidsCourantKg: r.poids_courant_kg ?? undefined,
    statut: r.statut,
    notes: r.notes ?? undefined,
  };
}

/**
 * Liste les porcelets individuels d'une bande, triés par boucle asc.
 */
export async function listPorceletsByBatch(
  batchId: string,
): Promise<PorceletIndividuel[]> {
  if (!batchId) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('porcelets_individuels' as any) as any)
    .select('id, batch_id, boucle, sexe, poids_courant_kg, statut, notes')
    .eq('batch_id', batchId)
    .order('boucle', { ascending: true });
  if (error) {
    console.warn('[porcelets_individuels] list failed:', error.message);
    return [];
  }
  return ((data as PorceletIndividuelRow[]) ?? []).map(mapPorcelet);
}

/**
 * V72-P4 — Loge effective d'une bande, déduite des porcelets de cette bande.
 *
 * Une bande peut occuper jusqu'à 2 loges (1 femelles + 1 mâles, ou 1 mixte).
 * Cette fonction lit `porcelets_individuels.loge_id` (V72-P4 column) JOIN
 * `loges` et dédoublonne par loge.
 *
 * Retourne 0..2 entrées triées par numéro asc.
 */
export interface BandeLogeEffective {
  id: string;
  numero: string;
  type: string;
  porceletsCount: number;
  /** Sexes contenus dans cette loge (pour cette bande). */
  sexes: Array<'M' | 'F' | 'INCONNU'>;
}

export async function listLogesEffectivesParBande(
  batchId: string,
): Promise<BandeLogeEffective[]> {
  if (!batchId) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('porcelets_individuels' as any) as any)
    .select('id, sexe, loge_id, loges(id, numero, type)')
    .eq('batch_id', batchId);
  if (error) {
    console.warn('[porcelets_individuels] list loges effectives failed:', error.message);
    return [];
  }
  type Row = {
    id: string;
    sexe: 'M' | 'F' | 'INCONNU' | null;
    loge_id: string | null;
    loges: { id: string; numero: string; type: string } | null;
  };
  const rows = ((data as Row[] | null) ?? []).filter((r) => r.loge_id && r.loges);
  const buckets = new Map<string, BandeLogeEffective>();
  for (const r of rows) {
    const lid = r.loge_id as string;
    const existing = buckets.get(lid);
    const sexe = r.sexe ?? 'INCONNU';
    if (existing) {
      existing.porceletsCount += 1;
      if (!existing.sexes.includes(sexe)) existing.sexes.push(sexe);
    } else {
      buckets.set(lid, {
        id: lid,
        numero: r.loges!.numero,
        type: r.loges!.type,
        porceletsCount: 1,
        sexes: [sexe],
      });
    }
  }
  return Array.from(buckets.values()).sort((a, b) =>
    a.numero.localeCompare(b.numero),
  );
}

/**
 * Crée un porcelet individuel rattaché à une bande.
 * Boucle UNIQUE par farm (contrainte DB) — l'erreur remonte si conflit.
 */
export async function addPorcelet(args: {
  batchId: string;
  boucle: string;
  sexe: PorceletSexe;
  poidsCourantKg?: number;
  notes?: string;
}): Promise<PorceletIndividuel> {
  if (!args.batchId) throw new Error('batchId manquant');
  if (!args.boucle || !args.boucle.trim()) throw new Error('boucle requise');
  const farm_id = await getFarmId();
  const payload = {
    farm_id,
    batch_id: args.batchId,
    boucle: args.boucle.trim(),
    sexe: args.sexe,
    poids_courant_kg: args.poidsCourantKg ?? null,
    statut: 'VIVANT' as PorceletStatut,
    notes: args.notes ?? null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('porcelets_individuels' as any) as any)
    .insert(payload)
    .select('id, batch_id, boucle, sexe, poids_courant_kg, statut, notes')
    .single();
  if (error) throw new Error(`[porcelets_individuels] insert failed: ${error.message}`);
  return mapPorcelet(data as PorceletIndividuelRow);
}

/** Patch partiel d'un porcelet individuel. */
export async function updatePorcelet(
  id: string,
  patch: Partial<Pick<PorceletIndividuel, 'boucle' | 'sexe' | 'poidsCourantKg' | 'statut' | 'notes'>>,
): Promise<void> {
  if (!id) throw new Error('ID manquant');
  const dbPatch: Record<string, unknown> = {};
  if (patch.boucle !== undefined) dbPatch.boucle = patch.boucle;
  if (patch.sexe !== undefined) dbPatch.sexe = patch.sexe;
  if (patch.poidsCourantKg !== undefined) {
    dbPatch.poids_courant_kg = patch.poidsCourantKg ?? null;
  }
  if (patch.statut !== undefined) dbPatch.statut = patch.statut;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
  if (Object.keys(dbPatch).length === 0) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('porcelets_individuels' as any) as any)
    .update(dbPatch)
    .eq('id', id);
  if (error) throw new Error(`[porcelets_individuels] update failed: ${error.message}`);
}

/** Supprime un porcelet individuel. */
export async function removePorcelet(id: string): Promise<void> {
  if (!id) throw new Error('ID manquant');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('porcelets_individuels' as any) as any)
    .delete()
    .eq('id', id);
  if (error) throw new Error(`[porcelets_individuels] delete failed: ${error.message}`);
}

/** Patch rapide du statut d'un porcelet (raccourci pour mortalité, vente, quarantaine). */
export async function setPorceletStatut(
  id: string,
  statut: PorceletStatut,
): Promise<void> {
  return updatePorcelet(id, { statut });
}

// ── V36-E P3 — Split d'une bande ───────────────────────────────────────────

export interface SplitBatchResult {
  /** ID UUID de la nouvelle bande créée. */
  newBatchId: string;
  /** Code_id de la nouvelle bande (B-YYYYMMDD-{logeNumero}). */
  newCodeId: string;
  /** Nombre de porcelets effectivement déplacés. */
  movedCount: number;
  /** Si true, la bande source a été passée en RECAP (vide après split). */
  sourceArchivedAsRecap: boolean;
}

/**
 * Splitte une bande source en déplaçant un sous-ensemble de porcelets vers
 * une nouvelle bande dans une loge destination.
 *
 * Effets (séquentiels, pas en transaction RPC — Supabase JS ne l'expose pas
 * sans Edge Function dédiée) :
 *  1. INSERT batches (sow_id=NULL, validation_status=VALIDATED, loge_id, phase)
 *  2. UPDATE porcelets_individuels SET batch_id=newId WHERE id IN (...)
 *  3. Si la source est vide après split → UPDATE batches SET statut='RECAP'
 *
 * En cas d'échec sur l'étape 2, l'INSERT batch n'est PAS rollback (best-effort).
 * L'utilisateur peut alors supprimer la bande créée manuellement si besoin.
 */
// Pattern UUID v4 / v1 (basique, suffisant pour distinguer d'un code_id type "B-...").
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function splitBatch(args: {
  sourceBatchId: string;
  porceletsIds: string[];
  newBatchPayload: WithoutFarm<BatchInsert>;
}): Promise<SplitBatchResult> {
  if (!args.sourceBatchId) throw new Error('sourceBatchId manquant');
  if (!args.porceletsIds || args.porceletsIds.length === 0) {
    throw new Error('Aucun porcelet à déplacer');
  }
  if (!args.newBatchPayload) throw new Error('newBatchPayload manquant');

  // Résolution code_id → UUID si nécessaire (rétrocompat avec callers
  // qui passent l'ID display de la bande).
  let sourceUuid = args.sourceBatchId;
  if (!UUID_PATTERN.test(sourceUuid)) {
    const resolved = await resolveIdByCode('batches', args.sourceBatchId);
    if (!resolved) {
      throw new Error(`[split] bande source introuvable: ${args.sourceBatchId}`);
    }
    sourceUuid = resolved;
  }

  // 1. INSERT nouvelle bande
  const created = await runInsert<BatchRow>('batches', args.newBatchPayload);
  const newBatchId = created.id;
  const newCodeId = (created as unknown as { code_id?: string }).code_id ?? '';

  // 2. UPDATE porcelets_individuels.batch_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase.from('porcelets_individuels' as any) as any)
    .update({ batch_id: newBatchId })
    .in('id', args.porceletsIds);
  if (updErr) {
    throw new Error(`[split] update porcelets failed: ${updErr.message}`);
  }

  // 3. Si bande source vide → marquer RECAP
  let sourceArchivedAsRecap = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error: cntErr } = await (supabase.from('porcelets_individuels' as any) as any)
    .select('id', { count: 'exact', head: true })
    .eq('batch_id', sourceUuid);
  if (!cntErr && (count ?? 0) === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: srcErr } = await (supabase.from('batches') as any)
      .update({ statut: 'RECAP' })
      .eq('id', sourceUuid);
    if (!srcErr) sourceArchivedAsRecap = true;
  }

  return {
    newBatchId,
    newCodeId,
    movedCount: args.porceletsIds.length,
    sourceArchivedAsRecap,
  };
}

// ── V72 — Helpers d'écriture pour la queue offline ──────────────────────────
// Wrappers thin pour brancher `offlineQueue.runner` sur les 6 tables qui
// throwaient « insert non supporté ». Pattern uniforme `runInsert/runUpdate`,
// signatures `(values: Record<string, unknown>)` compatibles dispatcher.
//
// Coexistent avec les helpers métier riches (`createLoge`, `addPorcelet`,
// `submitDailyCheck`, `insertFeedConsumption`, `moveSubject`) — non touchés
// pour rétro-compat des call sites existants.

type PeseeInsert = Database['public']['Tables']['pesees']['Insert'];
type PorceletIndividuelInsert =
  Database['public']['Tables']['porcelets_individuels']['Insert'];
type LogeInsert = Database['public']['Tables']['loges']['Insert'];
type LogeMovementInsert =
  Database['public']['Tables']['loge_movements']['Insert'];
type DailyCheckMbInsert =
  Database['public']['Tables']['daily_checks_mb']['Insert'];
type FeedConsumptionLogInsert =
  Database['public']['Tables']['feed_consumption_logs']['Insert'];

export function insertPesee(
  values: WithoutFarm<PeseeInsert>,
): Promise<PeseeRow> {
  return runInsert<PeseeRow>('pesees', values);
}

export function updatePesee(
  id: string,
  patch: Partial<PeseeRow>,
): Promise<WriteResult> {
  return runUpdate('pesees', id, patch);
}

export function insertPorceletIndividuel(
  values: WithoutFarm<PorceletIndividuelInsert>,
): Promise<PorceletIndividuelDbRow> {
  return runInsert<PorceletIndividuelDbRow>('porcelets_individuels', values);
}

export function updatePorceletIndividuel(
  id: string,
  patch: Partial<PorceletIndividuelDbRow>,
): Promise<WriteResult> {
  return runUpdate('porcelets_individuels', id, patch);
}

export function insertLoge(
  values: WithoutFarm<LogeInsert>,
): Promise<LogeDbRow> {
  return runInsert<LogeDbRow>('loges', values);
}

/**
 * Patch DB-shape (snake_case). Distinct de `updateLoge(id, Partial<Loge>)`
 * historique qui mappe le shape camelCase métier — celui-ci est consommé
 * par le runner de la queue offline qui passe directement le payload DB.
 */
export function updateLogeRow(
  id: string,
  patch: Partial<LogeDbRow>,
): Promise<WriteResult> {
  return runUpdate('loges', id, patch);
}

export function insertLogeMovement(
  values: WithoutFarm<LogeMovementInsert>,
): Promise<LogeMovementDbRow> {
  return runInsert<LogeMovementDbRow>('loge_movements', values);
}

export function insertDailyCheckMb(
  values: WithoutFarm<DailyCheckMbInsert>,
): Promise<DailyCheckMbRow> {
  return runInsert<DailyCheckMbRow>('daily_checks_mb', values);
}

export function insertFeedConsumptionLog(
  values: WithoutFarm<FeedConsumptionLogInsert>,
): Promise<FeedConsumptionLogRow> {
  return runInsert<FeedConsumptionLogRow>('feed_consumption_logs', values);
}
