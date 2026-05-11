/**
 * veto.repo.ts — CRUD produits vétérinaires (Supabase `produits_veto`).
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

export type ProduitVetoRow =
  Database['public']['Tables']['produits_veto']['Row'];
type ProduitVetoInsert =
  Database['public']['Tables']['produits_veto']['Insert'];

export function updateProduitVeto(
  id: string,
  patch: Partial<ProduitVetoRow>,
): Promise<WriteResult> {
  return runUpdate('produits_veto', id, patch);
}

export function insertProduitVeto(
  values: WithoutFarm<ProduitVetoInsert>,
): Promise<ProduitVetoRow> {
  return runInsert<ProduitVetoRow>('produits_veto', values);
}

export function deleteProduitVeto(id: string): Promise<void> {
  return runDelete('produits_veto', id);
}

export function resolveProduitVetoByCode(
  code_id: string,
): Promise<string | null> {
  return resolveIdByCode('produits_veto', code_id);
}
