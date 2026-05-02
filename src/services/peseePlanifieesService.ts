/**
 * peseePlanifieesService — Pesées planifiées (mensuelles) par bande / porcelet.
 * ════════════════════════════════════════════════════════════════════════════
 * Adossé à la table `pesee_planifiees` (migration V25). RLS : `farm_id = auth.uid()`.
 *
 * Auto-scheduling : `autoScheduleMonthly(bandes)` crée 1 pesée par bande active
 * sans pesée prévue dans les 30 prochains jours, datée à J+30.
 */

import { supabase } from './supabaseClient';
import { logger } from './logger';
import type { BandePorcelets } from '../types/farm';

const SCOPE = 'peseePlanifieesService';
const TABLE = 'pesee_planifiees';
const DEFAULT_HORIZON_DAYS = 30;

export interface PeseePlanifiee {
  id: string;
  batchId?: string;
  porceletId?: string;
  datePrevue: string;
  rappelJ1: boolean;
  rappelJ3: boolean;
  effectuee: boolean;
  dateEffectuee?: string;
}

interface PeseePlanifieeRow {
  id: string;
  batch_id: string | null;
  porcelet_id: string | null;
  date_prevue: string;
  rappel_j1: boolean;
  rappel_j3: boolean;
  effectuee: boolean;
  date_effectuee: string | null;
}

function rowToModel(r: PeseePlanifieeRow): PeseePlanifiee {
  return {
    id: r.id,
    batchId: r.batch_id ?? undefined,
    porceletId: r.porcelet_id ?? undefined,
    datePrevue: r.date_prevue,
    rappelJ1: !!r.rappel_j1,
    rappelJ3: !!r.rappel_j3,
    effectuee: !!r.effectuee,
    dateEffectuee: r.date_effectuee ?? undefined,
  };
}

async function getFarmId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Auth session error: ${error.message}`);
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Aucune session authentifiée — connexion requise');
  return uid;
}

/** SELECT effectuee=false ORDER BY date_prevue ASC. */
export async function listPeseePending(): Promise<PeseePlanifiee[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(TABLE as any) as any)
    .select('id, batch_id, porcelet_id, date_prevue, rappel_j1, rappel_j3, effectuee, date_effectuee')
    .eq('effectuee', false)
    .order('date_prevue', { ascending: true });
  if (error) {
    logger.error(SCOPE, 'listPeseePending failed', error);
    return [];
  }
  return ((data as PeseePlanifieeRow[] | null) ?? []).map(rowToModel);
}

export async function createPeseePlanifiee(args: {
  batchId?: string;
  porceletId?: string;
  datePrevue: string;
}): Promise<PeseePlanifiee> {
  if (!args.batchId && !args.porceletId) {
    throw new Error('createPeseePlanifiee : batchId ou porceletId requis');
  }
  const farm_id = await getFarmId();
  const payload = {
    farm_id,
    batch_id: args.batchId ?? null,
    porcelet_id: args.porceletId ?? null,
    date_prevue: args.datePrevue,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(TABLE as any) as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`[pesee_planifiees] insert failed: ${error.message}`);
  return rowToModel(data as PeseePlanifieeRow);
}

export async function markPeseeEffectuee(id: string): Promise<void> {
  if (!id) throw new Error('markPeseeEffectuee : id requis');
  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(TABLE as any) as any)
    .update({ effectuee: true, date_effectuee: today })
    .eq('id', id);
  if (error) throw new Error(`[pesee_planifiees] markEffectuee failed: ${error.message}`);
}

export async function markRappel(id: string, type: 'J1' | 'J3'): Promise<void> {
  if (!id) throw new Error('markRappel : id requis');
  const patch = type === 'J1' ? { rappel_j1: true } : { rappel_j3: true };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(TABLE as any) as any)
    .update(patch)
    .eq('id', id);
  if (error) throw new Error(`[pesee_planifiees] markRappel ${type} failed: ${error.message}`);
}

/** Statuts considérés comme "actifs" (éligibles à pesée). */
function isBandeActive(b: BandePorcelets): boolean {
  const s = (b.statut || '').toLowerCase();
  if (!s) return false;
  if (s.includes('recap')) return false;
  if (s.includes('vendu')) return false;
  if (s.includes('sortie')) return false;
  return true;
}

/**
 * Pour chaque bande active sans pesée prévue dans les 30 prochains jours,
 * crée une pesée à J+30. Retourne le nombre de créations.
 */
export async function autoScheduleMonthly(
  bandes: readonly BandePorcelets[],
  today: Date = new Date(),
): Promise<number> {
  if (bandes.length === 0) return 0;

  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + DEFAULT_HORIZON_DAYS);
  const horizonIso = horizon.toISOString().slice(0, 10);
  const todayIso = today.toISOString().slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(TABLE as any) as any)
    .select('batch_id, date_prevue, effectuee')
    .eq('effectuee', false)
    .gte('date_prevue', todayIso)
    .lte('date_prevue', horizonIso);

  if (error) {
    logger.error(SCOPE, 'autoScheduleMonthly select failed', error);
    return 0;
  }

  const existing = new Set<string>();
  for (const r of (data as Array<{ batch_id: string | null }> | null) ?? []) {
    if (r.batch_id) existing.add(r.batch_id);
  }

  const target = new Date(today);
  target.setDate(target.getDate() + DEFAULT_HORIZON_DAYS);
  const targetIso = target.toISOString().slice(0, 10);

  let created = 0;
  for (const b of bandes) {
    if (!isBandeActive(b)) continue;
    if (existing.has(b.id)) continue;
    try {
      await createPeseePlanifiee({ batchId: b.id, datePrevue: targetIso });
      created += 1;
    } catch (e) {
      logger.warn(SCOPE, `autoScheduleMonthly create failed for ${b.id}`, e);
    }
  }
  return created;
}
