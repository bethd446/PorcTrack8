/**
 * supabaseWrites.ts — Thin wrappers autour de `supabase.from(...).update(...)`.
 *
 * Chaque helper retourne `{ success, error? }` pour permettre aux composants
 * d'inline edit (EditableNumber / EditableText) d'afficher feedback (check
 * vert / toast erreur) sans connaître Supabase.
 *
 * RLS : `auth.uid() = farm_id` est vérifié côté Postgres → pas besoin de
 * scoper côté client. Si l'utilisateur tente d'écrire sur une ligne d'une
 * autre ferme, Supabase rejette avec `error` (et `success: false`).
 */
import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

export interface WriteResult {
  success: boolean;
  error?: string;
}

type SowUpdate = Database['public']['Tables']['sows']['Update'];
type BoarUpdate = Database['public']['Tables']['boars']['Update'];
type BatchUpdate = Database['public']['Tables']['batches']['Update'];
type ProduitAlimentUpdate =
  Database['public']['Tables']['produits_aliments']['Update'];
type ProduitVetoUpdate =
  Database['public']['Tables']['produits_veto']['Update'];
type NoteUpdate = Database['public']['Tables']['notes']['Update'];

export type SowRow = SowUpdate;
export type BoarRow = BoarUpdate;
export type BatchRow = BatchUpdate;
export type ProduitAlimentRow = ProduitAlimentUpdate;
export type ProduitVetoRow = ProduitVetoUpdate;
export type NoteRow = NoteUpdate;

/** Helper interne — uniformise le retour. */
async function runUpdate(
  table:
    | 'sows'
    | 'boars'
    | 'batches'
    | 'produits_aliments'
    | 'produits_veto'
    | 'notes',
  id: string,
  patch: Record<string, unknown>,
): Promise<WriteResult> {
  if (!id) return { success: false, error: 'ID manquant' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table) as any)
      .update(patch)
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export function updateSow(id: string, patch: Partial<SowRow>): Promise<WriteResult> {
  return runUpdate('sows', id, patch);
}

export function updateBoar(id: string, patch: Partial<BoarRow>): Promise<WriteResult> {
  return runUpdate('boars', id, patch);
}

export function updateBatch(id: string, patch: Partial<BatchRow>): Promise<WriteResult> {
  return runUpdate('batches', id, patch);
}

export function updateProduitAliment(
  id: string,
  patch: Partial<ProduitAlimentRow>,
): Promise<WriteResult> {
  return runUpdate('produits_aliments', id, patch);
}

export function updateProduitVeto(
  id: string,
  patch: Partial<ProduitVetoRow>,
): Promise<WriteResult> {
  return runUpdate('produits_veto', id, patch);
}

export function updateNote(id: string, patch: Partial<NoteRow>): Promise<WriteResult> {
  return runUpdate('notes', id, patch);
}
