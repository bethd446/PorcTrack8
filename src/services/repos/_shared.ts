/**
 * repos/_shared.ts — Helpers internes partagés par les repos par entité.
 *
 * Extrait depuis `services/supabaseWrites.ts` lors du découpage P2-ARCHI.
 * Ces helpers ne sont PAS destinés à être consommés directement par l'UI ;
 * ils sont réexportés via `supabaseWrites.ts` pour préserver les call-sites.
 */
import { supabase } from '../supabaseClient';

export interface WriteResult {
  success: boolean;
  error?: string;
}

export type WriteTable =
  | 'sows'
  | 'boars'
  | 'batches'
  | 'produits_aliments'
  | 'produits_veto'
  | 'notes'
  | 'health_logs'
  | 'saillies'
  | 'finances'
  | 'pesees'
  | 'porcelets_individuels'
  | 'loges'
  | 'loge_movements'
  | 'daily_checks_mb'
  | 'feed_consumption_logs';

export type WithoutFarm<T> = Omit<T, 'farm_id'>;

// ── V71-P2 — Référence globale vers la `currentFarmId` (FarmContext) ────────

let globalCurrentFarmIdRef: string | null = null;

export function setCurrentFarmIdRef(farmId: string | null): void {
  globalCurrentFarmIdRef = farmId;
}

export function getCurrentFarmIdRef(): string | null {
  return globalCurrentFarmIdRef;
}

export function __resetCurrentFarmIdRefForTests(): void {
  globalCurrentFarmIdRef = null;
}

export async function getFarmId(): Promise<string> {
  // 1. Priorité : currentFarmId exposé par FarmContext (multi-user).
  if (globalCurrentFarmIdRef) return globalCurrentFarmIdRef;

  // 2. Fallback : auth.uid() (rétro-compat V71-P1, backfill farms.id=profiles.id).
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Auth session error: ${error.message}`);
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Aucune session authentifiée — connexion requise');
  return uid;
}

export async function runUpdate(
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

export async function runInsert<TRow>(
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

export async function runDelete(
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

export async function resolveIdByCode(
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
