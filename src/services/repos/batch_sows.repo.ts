/**
 * batch_sows.repo.ts — CRUD multi-mères (table `batch_sows`).
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 2).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 *
 * Périmètre : liaison N-N entre `batches` et `sows` (truies sources d'une
 * bande). La 1ère truie ajoutée devient la « mère principale » (sync auto
 * de `batches.sow_id` si NULL).
 */
import { supabase } from '../supabaseClient';
import type { BatchSource } from '../../types/farm';
import { getFarmId } from './_shared';

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
