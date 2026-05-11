/**
 * porcelets.repo.ts — CRUD porcelets individuels + santé porcelet.
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 2).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 *
 * Périmètre :
 *  - CRUD `porcelets_individuels` (camelCase métier).
 *  - Wrappers DB-shape pour la queue offline.
 *  - Santé porcelet (`health_logs` filtrés par `porcelet_id`).
 *  - Loges effectives d'une bande (déduites des porcelets).
 */
import { supabase } from '../supabaseClient';
import type { Database } from '../../types/database.types';
import type {
  PorceletIndividuel,
  PorceletSexe,
  PorceletStatut,
} from '../../types/farm';
import {
  getFarmId,
  runInsert,
  runUpdate,
  type WithoutFarm,
  type WriteResult,
} from './_shared';

export type PorceletIndividuelDbRow =
  Database['public']['Tables']['porcelets_individuels']['Row'];
type PorceletIndividuelInsert =
  Database['public']['Tables']['porcelets_individuels']['Insert'];

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

// ── V72 — Wrappers DB-shape pour la queue offline ───────────────────────────

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
