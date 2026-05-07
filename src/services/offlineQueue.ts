/**
 * PorcTrack — File d'attente Offline (Supabase)
 * ════════════════════════════════════════════════════════
 * Persistance : Capacitor Preferences (SharedPreferences/NSUserDefaults).
 * Backend cible : Supabase via les helpers typés de `supabaseWrites.ts`.
 *
 * Les anciennes signatures `enqueueAppendRow` / `enqueueUpdateRow` sont
 * conservées en alias rétro-compat pour ne pas casser les ~40 formulaires
 * Quick* qui les appellent encore. Vague 2b : migration de ces callers
 * vers `enqueueInsert` / `enqueueUpdate` directement.
 */

import { Preferences } from '@capacitor/preferences';
import {
  insertSow,
  insertBoar,
  insertBatch,
  insertNote,
  insertHealthLog,
  insertSaillie,
  insertFinance,
  insertProduitAliment,
  insertProduitVeto,
  insertWeightDistribution,
  updateSow,
  updateBoar,
  updateBatch,
  updateNote,
  updateProduitAliment,
  updateProduitVeto,
  updateSowByCode,
  updateBoarByCode,
  updateBatchByCode,
  deleteSow,
  deleteBoar,
  deleteBatch,
  deleteNote,
  deleteHealthLog,
  deleteProduitAliment,
  deleteProduitVeto,
} from './supabaseWrites';

/**
 * Cellule scalaire — type historique préservé pour les callers non-encore-migrés
 * (formulaires Quick*, helpers logic). La vague 2b retirera cet alias.
 */
export type SheetCell = string | number | boolean | null;

export type SupabaseTable =
  | 'sows'
  | 'boars'
  | 'batches'
  | 'notes'
  | 'health_logs'
  | 'saillies'
  | 'finances'
  | 'produits_aliments'
  | 'produits_veto'
  | 'pesees'
  | 'porcelets_individuels'
  | 'loges'
  | 'loge_movements'
  | 'daily_checks_mb'
  | 'weight_distributions'
  | 'feed_consumption_logs';

export type QueuedMutation =
  | { kind: 'insert'; table: SupabaseTable; values: Record<string, unknown> }
  | { kind: 'update'; table: SupabaseTable; id: string; fields: Record<string, unknown> }
  | { kind: 'updateByCode'; table: SupabaseTable; codeId: string; fields: Record<string, unknown> }
  | { kind: 'delete'; table: SupabaseTable; id: string; reason?: string };

export interface QueueItem {
  id: string;
  mutation: QueuedMutation;
  timestamp: string;
  tries: number;
  lastError?: string;
}

const QUEUE_KEY = 'porctrack_sync_queue_v8';

let _memCache: QueueItem[] = [];

async function loadQueue(): Promise<QueueItem[]> {
  try {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    _memCache = value ? JSON.parse(value) : [];
    return _memCache;
  } catch {
    return _memCache;
  }
}

async function saveQueue(queue: QueueItem[]): Promise<void> {
  _memCache = queue;
  try {
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) });
  } catch (e) {
    console.error('[Queue] saveQueue failed:', e);
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export async function initQueue(): Promise<void> {
  await loadQueue();
}

// ── API publique typée Supabase ──────────────────────────────────────────────

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * UUID v4 client-side. Si `crypto.randomUUID` est dispo, on l'utilise ;
 * sinon polyfill (JSDOM ancien, navigateurs hors HTTPS, etc.). Garantit
 * l'idempotence du replay : un payload sans id reçoit un UUID stable, donc
 * un retry post-crash insère le MÊME row Supabase (pas de doublon).
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function enqueueInsert(
  table: SupabaseTable,
  values: Record<string, unknown>,
): Promise<void> {
  // Idempotence : si pas d'id, on en génère un client-side. Supabase respecte
  // l'id fourni s'il s'agit d'un UUID valide, ce qui rend le replay safe.
  const enriched: Record<string, unknown> = {
    ...values,
    id: typeof values.id === 'string' && values.id.length > 0 ? values.id : generateUUID(),
  };
  const queue = await loadQueue();
  queue.push({
    id: newId('INS'),
    mutation: { kind: 'insert', table, values: enriched },
    timestamp: new Date().toISOString(),
    tries: 0,
  });
  await saveQueue(queue);
}

export async function enqueueUpdate(
  table: SupabaseTable,
  id: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const queue = await loadQueue();
  queue.push({
    id: newId('UPD'),
    mutation: { kind: 'update', table, id, fields },
    timestamp: new Date().toISOString(),
    tries: 0,
  });
  await saveQueue(queue);
}

export async function enqueueUpdateByCode(
  table: SupabaseTable,
  codeId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const queue = await loadQueue();
  queue.push({
    id: newId('UPC'),
    mutation: { kind: 'updateByCode', table, codeId, fields },
    timestamp: new Date().toISOString(),
    tries: 0,
  });
  await saveQueue(queue);
}

export async function enqueueDelete(
  table: SupabaseTable,
  id: string,
  reason?: string,
): Promise<void> {
  const queue = await loadQueue();
  queue.push({
    id: newId('DEL'),
    mutation: { kind: 'delete', table, id, reason },
    timestamp: new Date().toISOString(),
    tries: 0,
  });
  await saveQueue(queue);
}

// ── Alias rétro-compat (signatures Sheets héritées) ─────────────────────────
// Ne fonctionnent plus runtime côté Sheets — la vague 2b migrera leurs callers
// vers enqueueInsert/enqueueUpdate. Ils compilent et logguent un warning pour
// signaler les usages qui restent.

/** @deprecated migrer vers enqueueInsert(table, values) */
export async function enqueueAppendRow(
  sheet: string,
  values: SheetCell[],
): Promise<void> {
  console.warn(
    `[offlineQueue] enqueueAppendRow('${sheet}', …) appelé — caller à migrer vers enqueueInsert (vague 2b).`,
  );
  void values;
}

/** @deprecated migrer vers enqueueUpdate(table, id, fields) */
export async function enqueueUpdateRow(
  sheet: string,
  idHeader: string,
  idValue: string,
  patch: Record<string, SheetCell>,
): Promise<void> {
  console.warn(
    `[offlineQueue] enqueueUpdateRow('${sheet}', '${idHeader}'='${idValue}', …) appelé — caller à migrer vers enqueueUpdate (vague 2b).`,
  );
  void patch;
}

// ── Lecture cache mémoire ────────────────────────────────────────────────────

export function getQueueStatus(): { pending: number; items: QueueItem[] } {
  return { pending: _memCache.length, items: [..._memCache] };
}

export function getQueueLength(): number {
  return _memCache.length;
}

export function hasFailedSync(): boolean {
  return _memCache.some((item) => item.tries > 0);
}

// ── Runner ───────────────────────────────────────────────────────────────────

const MAX_TRIES = 5;

async function runMutation(m: QueuedMutation): Promise<void> {
  switch (m.kind) {
    case 'insert':
      await runInsert(m.table, m.values);
      return;
    case 'update':
      await runUpdate(m.table, m.id, m.fields);
      return;
    case 'updateByCode':
      await runUpdateByCode(m.table, m.codeId, m.fields);
      return;
    case 'delete':
      await runDelete(m.table, m.id, m.reason);
      return;
  }
}

async function runInsert(
  table: SupabaseTable,
  values: Record<string, unknown>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = values as any;
  switch (table) {
    case 'sows':                  await insertSow(v); return;
    case 'boars':                 await insertBoar(v); return;
    case 'batches':               await insertBatch(v); return;
    case 'notes':                 await insertNote(v); return;
    case 'health_logs':           await insertHealthLog(v); return;
    case 'saillies':              await insertSaillie(v); return;
    case 'finances':              await insertFinance(v); return;
    case 'produits_aliments':     await insertProduitAliment(v); return;
    case 'produits_veto':         await insertProduitVeto(v); return;
    case 'weight_distributions':  await insertWeightDistribution(v); return;
    // TODO: brancher sur supabaseWrites quand les helpers existeront
    case 'pesees':
    case 'porcelets_individuels':
    case 'loges':
    case 'loge_movements':
    case 'daily_checks_mb':
    case 'feed_consumption_logs':
      throw new Error(`[offlineQueue] insert non supporté pour la table '${table}' (helper manquant dans supabaseWrites)`);
  }
}

async function runUpdate(
  table: SupabaseTable,
  id: string,
  fields: Record<string, unknown>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = fields as any;
  let res: { success: boolean; error?: string };
  switch (table) {
    case 'sows':              res = await updateSow(id, f); break;
    case 'boars':             res = await updateBoar(id, f); break;
    case 'batches':           res = await updateBatch(id, f); break;
    case 'notes':             res = await updateNote(id, f); break;
    case 'produits_aliments': res = await updateProduitAliment(id, f); break;
    case 'produits_veto':     res = await updateProduitVeto(id, f); break;
    case 'health_logs':
    case 'saillies':
    case 'finances':
    case 'pesees':
    case 'porcelets_individuels':
    case 'loges':
    case 'loge_movements':
    case 'daily_checks_mb':
    case 'weight_distributions':
    case 'feed_consumption_logs':
      throw new Error(`[offlineQueue] update non supporté pour la table '${table}'`);
  }
  if (!res.success) throw new Error(res.error ?? `update ${table} failed`);
}

async function runUpdateByCode(
  table: SupabaseTable,
  codeId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = fields as any;
  switch (table) {
    case 'sows':    await updateSowByCode(codeId, f); return;
    case 'boars':   await updateBoarByCode(codeId, f); return;
    case 'batches': await updateBatchByCode(codeId, f); return;
    default:
      throw new Error(`[offlineQueue] updateByCode non supporté pour '${table}'`);
  }
}

async function runDelete(
  table: SupabaseTable,
  id: string,
  reason?: string,
): Promise<void> {
  switch (table) {
    case 'sows':              await deleteSow(id, reason); return;
    case 'boars':             await deleteBoar(id, reason); return;
    case 'batches':           await deleteBatch(id, reason); return;
    case 'notes':             await deleteNote(id); return;
    case 'health_logs':       await deleteHealthLog(id); return;
    case 'produits_aliments': await deleteProduitAliment(id); return;
    case 'produits_veto':     await deleteProduitVeto(id); return;
    case 'saillies':
    case 'finances':
    case 'pesees':
    case 'porcelets_individuels':
    case 'loges':
    case 'loge_movements':
    case 'daily_checks_mb':
    case 'weight_distributions':
    case 'feed_consumption_logs':
      throw new Error(`[offlineQueue] delete non supporté pour la table '${table}'`);
  }
}

export async function processQueue(): Promise<{
  success: boolean; processed: number; remaining: number; abandoned: number;
}> {
  const queue = await loadQueue();
  if (queue.length === 0) return { success: true, processed: 0, remaining: 0, abandoned: 0 };

  const remaining: QueueItem[] = [];
  let processed = 0;
  let abandoned = 0;
  let hasError = false;

  for (const item of queue) {
    try {
      await runMutation(item.mutation);
      processed++;
    } catch (e) {
      item.tries++;
      item.lastError = e instanceof Error ? e.message : String(e);
      if (item.tries >= MAX_TRIES) {
        console.error(`[Queue] item ${item.id} abandonné après ${MAX_TRIES} essais :`, item.lastError);
        abandoned++;
      } else {
        remaining.push(item);
      }
      hasError = true;
    }
  }

  await saveQueue(remaining);
  return { success: !hasError, processed, remaining: remaining.length, abandoned };
}

export const flushQueue = processQueue;

export async function clearQueue(): Promise<void> {
  await saveQueue([]);
}

// ── Online detection + auto-flush ────────────────────────────────────────────

/**
 * Renvoie `true` si l'app est considérée connectée. Fallback `true` en SSR
 * (pas de `navigator`) pour éviter de bloquer le premier rendu.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

/**
 * Installe un listener `window.online` qui invoque `flushFn` à chaque
 * reconnexion. Idempotent par instance : retourne une fonction
 * d'unsubscribe à appeler au unmount.
 *
 * `flushFn` est appelé sans attente : les erreurs sont logguées sans
 * être propagées (le listener ne doit jamais throw).
 */
export function installOnlineFlushListener(
  flushFn: () => Promise<void>,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (): void => {
    void flushFn().catch((e) => {
      console.warn('[offlineQueue] auto-flush on online failed:', e);
    });
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
