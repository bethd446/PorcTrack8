/**
 * health_logs.repo.ts — CRUD logs santé (Supabase `health_logs`).
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 3).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 *
 * Périmètre : logs santé animaux (truies, verrats, bandes). Les logs santé
 * porcelet individuel (`insertHealthLogForPorcelet`, `listHealthLogsForPorcelet`)
 * vivent dans `porcelets.repo.ts` car ils touchent aussi le statut porcelet.
 */
import type { Database } from '../../types/database.types';
import {
  runDelete,
  runInsert,
  type WithoutFarm,
} from './_shared';

export type HealthLogRow = Database['public']['Tables']['health_logs']['Row'];
type HealthLogInsert = Database['public']['Tables']['health_logs']['Insert'];

export function insertHealthLog(
  values: WithoutFarm<HealthLogInsert>,
): Promise<HealthLogRow> {
  return runInsert<HealthLogRow>('health_logs', values);
}

export function deleteHealthLog(id: string): Promise<void> {
  return runDelete('health_logs', id);
}
