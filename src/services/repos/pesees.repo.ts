/**
 * pesees.repo.ts — CRUD pesées (Supabase `pesees`).
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 3).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 *
 * Wrappers thin destinés notamment à la queue offline V72 (le runner
 * dispatche les payloads DB-shape directement).
 */
import type { Database } from '../../types/database.types';
import {
  runInsert,
  runUpdate,
  type WithoutFarm,
  type WriteResult,
} from './_shared';

export type PeseeRow = Database['public']['Tables']['pesees']['Row'];
type PeseeInsert = Database['public']['Tables']['pesees']['Insert'];

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
