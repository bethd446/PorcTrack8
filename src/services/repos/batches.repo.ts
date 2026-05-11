/**
 * batches.repo.ts — CRUD bandes (Supabase `batches`) + extras métier liés.
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 2).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 *
 * Périmètre :
 *  - CRUD `batches` (insert/update/delete, par UUID ou code).
 *  - `setBandePoidsInitial` (helper poids initial validé).
 *  - `splitBatch` (split d'une bande vers une nouvelle).
 *  - `adoptions` (insert + ajustement des bandes source/destination).
 *  - `weight_distributions` (V21-4 : tri par poids engraissement).
 */
import { supabase } from '../supabaseClient';
import type { Database } from '../../types/database.types';
import {
  getFarmId,
  resolveIdByCode,
  runDelete,
  runInsert,
  runUpdate,
  type WithoutFarm,
  type WriteResult,
} from './_shared';

export type BatchRow = Database['public']['Tables']['batches']['Row'];
type BatchInsert = Database['public']['Tables']['batches']['Insert'];

// ── CRUD batches ─────────────────────────────────────────────────────────────

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

export function resolveBatchIdByCode(code_id: string): Promise<string | null> {
  return resolveIdByCode('batches', code_id);
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

// Pattern UUID v4 / v1 (basique, suffisant pour distinguer d'un code_id type "B-...").
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
