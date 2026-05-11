/**
 * notes.repo.ts — CRUD notes terrain (Supabase `notes`).
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 3).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 */
import type { Database } from '../../types/database.types';
import {
  runDelete,
  runInsert,
  runUpdate,
  type WithoutFarm,
  type WriteResult,
} from './_shared';

export type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];

export function updateNote(
  id: string,
  patch: Partial<NoteRow>,
): Promise<WriteResult> {
  return runUpdate('notes', id, patch);
}

export function insertNote(
  values: WithoutFarm<NoteInsert>,
): Promise<NoteRow> {
  return runInsert<NoteRow>('notes', values);
}

export function deleteNote(id: string): Promise<void> {
  return runDelete('notes', id);
}
