/**
 * sows.repo.ts — CRUD truies (Supabase `sows`).
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 1).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 */
import { supabase } from '../supabaseClient';
import type { Database } from '../../types/database.types';
import {
  runInsert,
  runUpdate,
  runDelete,
  resolveIdByCode,
  type WithoutFarm,
  type WriteResult,
} from './_shared';

export type SowRow = Database['public']['Tables']['sows']['Row'];
type SowInsert = Database['public']['Tables']['sows']['Insert'];

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

export function resolveSowIdByCode(code_id: string): Promise<string | null> {
  return resolveIdByCode('sows', code_id);
}
