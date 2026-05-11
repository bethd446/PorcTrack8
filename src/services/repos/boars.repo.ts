/**
 * boars.repo.ts — CRUD verrats (Supabase `boars`).
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

export type BoarRow = Database['public']['Tables']['boars']['Row'];
type BoarInsert = Database['public']['Tables']['boars']['Insert'];

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

export function resolveBoarIdByCode(code_id: string): Promise<string | null> {
  return resolveIdByCode('boars', code_id);
}
