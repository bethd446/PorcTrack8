/**
 * supabaseWrites.ts — API write typée et complète au-dessus de Supabase.
 *
 * Couvre insert / update / delete pour toutes les tables métier (truies,
 * verrats, bandes, notes, santé, saillies, finances, aliments, véto), plus
 * des resolvers `code_id → uuid` pour préserver l'API legacy basée sur les
 * codes (T01, V03, B12).
 *
 * Conventions :
 *  - `farm_id` est auto-injecté à partir de `supabase.auth.getSession()`.
 *  - RLS Postgres filtre `farm_id = auth.uid()` → pas de scoping client.
 *  - Les `update*` retournent `WriteResult` (compat composants inline edit).
 *  - Les `insert*` retournent la row insérée typée, ou throw une erreur claire.
 *  - Les `delete*` loggent dans `deletion_log` (best-effort — si la table
 *    n'existe pas en DB, on warn et on continue).
 */
import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

export interface WriteResult {
  success: boolean;
  error?: string;
}

// ── Types Row (snake_case Postgres) ──────────────────────────────────────────

export type SowRow = Database['public']['Tables']['sows']['Row'];
export type BoarRow = Database['public']['Tables']['boars']['Row'];
export type BatchRow = Database['public']['Tables']['batches']['Row'];
export type NoteRow = Database['public']['Tables']['notes']['Row'];
export type HealthLogRow = Database['public']['Tables']['health_logs']['Row'];
export type SaillieRow = Database['public']['Tables']['saillies']['Row'];
export type FinanceRow = Database['public']['Tables']['finances']['Row'];
export type ProduitAlimentRow =
  Database['public']['Tables']['produits_aliments']['Row'];
export type ProduitVetoRow =
  Database['public']['Tables']['produits_veto']['Row'];

type SowInsert = Database['public']['Tables']['sows']['Insert'];
type BoarInsert = Database['public']['Tables']['boars']['Insert'];
type BatchInsert = Database['public']['Tables']['batches']['Insert'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];
type HealthLogInsert = Database['public']['Tables']['health_logs']['Insert'];
type SaillieInsert = Database['public']['Tables']['saillies']['Insert'];
type FinanceInsert = Database['public']['Tables']['finances']['Insert'];
type ProduitAlimentInsert =
  Database['public']['Tables']['produits_aliments']['Insert'];
type ProduitVetoInsert =
  Database['public']['Tables']['produits_veto']['Insert'];

type WithoutFarm<T> = Omit<T, 'farm_id'>;

type WriteTable =
  | 'sows'
  | 'boars'
  | 'batches'
  | 'produits_aliments'
  | 'produits_veto'
  | 'notes'
  | 'health_logs'
  | 'saillies'
  | 'finances';

// ── Helpers internes ─────────────────────────────────────────────────────────

async function getFarmId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Auth session error: ${error.message}`);
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Aucune session authentifiée — connexion requise');
  return uid;
}

async function runUpdate(
  table: WriteTable,
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

async function runInsert<TRow>(
  table: WriteTable,
  values: Record<string, unknown>,
): Promise<TRow> {
  const farm_id = await getFarmId();
  const payload = { ...values, farm_id };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table) as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`[${table}] insert failed: ${error.message}`);
  return data as TRow;
}

async function logDeletion(
  table: WriteTable,
  id: string,
  reason: string | undefined,
): Promise<void> {
  try {
    const farm_id = await getFarmId();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('deletion_log' as any) as any)
      .insert({
        farm_id,
        table_name: table,
        row_id: id,
        reason: reason ?? null,
        deleted_by: farm_id,
      });
    if (error) {
      console.warn(
        `[deletion_log] skip (table absente ou RLS) — ${error.message}`,
      );
    }
  } catch (e) {
    console.warn('[deletion_log] skip — auth indisponible', e);
  }
}

async function runDelete(
  table: WriteTable,
  id: string,
  reason?: string,
): Promise<void> {
  if (!id) throw new Error('ID manquant');
  await logDeletion(table, id, reason);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).delete().eq('id', id);
  if (error) throw new Error(`[${table}] delete failed: ${error.message}`);
}

async function resolveIdByCode(
  table: 'sows' | 'boars' | 'batches' | 'produits_aliments' | 'produits_veto',
  code_id: string,
): Promise<string | null> {
  if (!code_id) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table) as any)
    .select('id')
    .eq('code_id', code_id)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

// ── Truies ───────────────────────────────────────────────────────────────────

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

// ── Verrats ──────────────────────────────────────────────────────────────────

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

// ── Bandes ───────────────────────────────────────────────────────────────────

export function updateBatch(
  id: string,
  patch: Partial<BatchRow>,
): Promise<WriteResult> {
  return runUpdate('batches', id, patch);
}

export function insertBatch(
  values: WithoutFarm<BatchInsert>,
): Promise<BatchRow> {
  return runInsert<BatchRow>('batches', values);
}

export function deleteBatch(id: string, reason?: string): Promise<void> {
  return runDelete('batches', id, reason);
}

export async function updateBatchByCode(
  code_id: string,
  patch: Partial<BatchRow>,
): Promise<BatchRow | null> {
  const id = await resolveIdByCode('batches', code_id);
  if (!id) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('batches') as any)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`[batches] updateByCode failed: ${error.message}`);
  return data as BatchRow;
}

// ── Notes ────────────────────────────────────────────────────────────────────

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

// ── Santé ────────────────────────────────────────────────────────────────────

export function insertHealthLog(
  values: WithoutFarm<HealthLogInsert>,
): Promise<HealthLogRow> {
  return runInsert<HealthLogRow>('health_logs', values);
}

export function deleteHealthLog(id: string): Promise<void> {
  return runDelete('health_logs', id);
}

// ── Saillies ─────────────────────────────────────────────────────────────────

export function insertSaillie(
  values: WithoutFarm<SaillieInsert>,
): Promise<SaillieRow> {
  return runInsert<SaillieRow>('saillies', values);
}

// ── Finances ─────────────────────────────────────────────────────────────────

export function insertFinance(
  values: WithoutFarm<FinanceInsert>,
): Promise<FinanceRow> {
  return runInsert<FinanceRow>('finances', values);
}

// ── Aliments ─────────────────────────────────────────────────────────────────

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

// ── Vétérinaire ──────────────────────────────────────────────────────────────

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

// ── Resolvers code_id → uuid ─────────────────────────────────────────────────

export function resolveSowIdByCode(code_id: string): Promise<string | null> {
  return resolveIdByCode('sows', code_id);
}

export function resolveBoarIdByCode(code_id: string): Promise<string | null> {
  return resolveIdByCode('boars', code_id);
}

export function resolveBatchIdByCode(code_id: string): Promise<string | null> {
  return resolveIdByCode('batches', code_id);
}

export function resolveProduitAlimentByCode(
  code_id: string,
): Promise<string | null> {
  return resolveIdByCode('produits_aliments', code_id);
}

export function resolveProduitVetoByCode(
  code_id: string,
): Promise<string | null> {
  return resolveIdByCode('produits_veto', code_id);
}
