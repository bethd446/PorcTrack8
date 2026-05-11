/**
 * finances.repo.ts — CRUD finances (Supabase `finances`).
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 4).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 */
import type { Database } from '../../types/database.types';
import { runInsert, type WithoutFarm } from './_shared';

export type FinanceRow = Database['public']['Tables']['finances']['Row'];
type FinanceInsert = Database['public']['Tables']['finances']['Insert'];

export function insertFinance(
  values: WithoutFarm<FinanceInsert>,
): Promise<FinanceRow> {
  return runInsert<FinanceRow>('finances', values);
}
