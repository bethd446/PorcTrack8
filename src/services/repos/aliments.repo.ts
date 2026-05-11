/**
 * aliments.repo.ts — CRUD produits alimentaires (Supabase `produits_aliments`).
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 4).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 */
import type { Database } from '../../types/database.types';
import {
  runInsert,
  runUpdate,
  runDelete,
  resolveIdByCode,
  type WithoutFarm,
  type WriteResult,
} from './_shared';

export type ProduitAlimentRow =
  Database['public']['Tables']['produits_aliments']['Row'];
type ProduitAlimentInsert =
  Database['public']['Tables']['produits_aliments']['Insert'];

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

export function resolveProduitAlimentByCode(
  code_id: string,
): Promise<string | null> {
  return resolveIdByCode('produits_aliments', code_id);
}
