/**
 * PorcTrack — File d'attente Offline (Supabase)
 * ════════════════════════════════════════════════════════
 * Persistance : Capacitor Preferences (SharedPreferences/NSUserDefaults).
 * Backend cible : Supabase via les helpers typés de `supabaseWrites.ts`.
 *
 * V75-q-D : la signature legacy `enqueueUpdateRow` a été supprimée — tous
 * les callers runtime ont migré vers `enqueueUpdate` (V75-p) puis vers les
 * writes Supabase directs (`updateSow`, `updateBoarByCode`, etc.). Reste
 * uniquement `enqueueAppendRow` pour deux callers Sheets résiduels
 * (notesApi `SHEET_DAILY`/`SHEET_WEEKLY`, phaseEngine `HISTORIQUE_TRANSITIONS`).
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
  insertPesee,
  insertPorceletIndividuel,
  insertLoge,
  insertLogeMovement,
  insertDailyCheckMb,
  insertFeedConsumptionLog,
  updateSow,
  updateBoar,
  updateBatch,
  updateNote,
  updateProduitAliment,
  updateProduitVeto,
  updatePesee,
  updatePorceletIndividuel,
  updateLogeRow,
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
  /**
   * Timestamp ISO (ms epoch) avant lequel l'item ne doit PAS être retenté.
   * Calculé à chaque échec via `BACKOFF_DELAYS_MS[tries]`. Absent ou ≤ now()
   * = éligible immédiatement. Garantit le retry exponentiel structuré
   * (1s, 5s, 30s, 5min, 30min) et évite le hammering au flush boucle.
   */
  nextAttemptAt?: number;
}

/**
 * Forme stockée dans `pt:queue_archive` : item failed (>= MAX_TRIES) +
 * timestamp d'archivage. Utilisé par la modale "Voir la file" pour
 * afficher l'historique des échecs définitifs.
 */
export interface ArchivedQueueItem extends QueueItem {
  archivedAt: string;
}

const QUEUE_KEY = 'porctrack_sync_queue_v8';
const ARCHIVE_KEY = 'pt:queue_archive';
const ARCHIVE_MAX_ITEMS = 100;

/**
 * V73 — Cap dur sur la queue active. Au-delà, les nouveaux enqueues sont
 * rejetés (UI doit afficher "queue saturée — synchroniser maintenant"). Sans
 * cap, une boucle bug ou un mode offline prolongé saturait Preferences (≈4MB
 * sur Android, ≈10MB en localStorage web) et bloquait le boot suivant.
 */
const QUEUE_MAX_ITEMS = 1000;

/**
 * V73 — Erreur explicite levée quand le cap est atteint. Les callers UI
 * peuvent intercepter pour afficher un toast plutôt que de logger silencieusement.
 */
export class QueueFullError extends Error {
  constructor(maxItems: number) {
    super(
      `[offlineQueue] queue saturée (${maxItems} items max). Synchroniser avant nouvelle action.`,
    );
    this.name = 'QueueFullError';
  }
}

/** V73 — Cap exposé en lecture seule pour l'UI (afficher le seuil). */
export const QUEUE_MAX_ITEMS_FOR_UI: number = QUEUE_MAX_ITEMS;

/**
 * Délais de backoff exponentiel par nombre de tries (index = tries actuels
 * AVANT incrément). Au 1er échec → 1s, 2e → 5s, 3e → 30s, 4e → 5min,
 * 5e → 30min puis abandon (MAX_TRIES = 5). Permet à un retry réseau
 * intermittent de se résorber sans noyer Supabase ni cramer la batterie.
 */
const BACKOFF_DELAYS_MS: readonly number[] = [
  1_000,        // après 1er fail → retry dans 1s
  5_000,        // après 2e fail → 5s
  30_000,       // après 3e fail → 30s
  5 * 60_000,   // après 4e fail → 5min
  30 * 60_000,  // après 5e fail → 30min (sécurité — abandonné juste après)
];

let _memCache: QueueItem[] = [];
let _archiveMemCache: ArchivedQueueItem[] = [];

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

async function loadArchive(): Promise<ArchivedQueueItem[]> {
  try {
    const { value } = await Preferences.get({ key: ARCHIVE_KEY });
    _archiveMemCache = value ? JSON.parse(value) : [];
    return _archiveMemCache;
  } catch {
    return _archiveMemCache;
  }
}

async function saveArchive(items: ArchivedQueueItem[]): Promise<void> {
  // Cap dur à ARCHIVE_MAX_ITEMS — on conserve les plus récents.
  const capped = items.slice(-ARCHIVE_MAX_ITEMS);
  _archiveMemCache = capped;
  try {
    await Preferences.set({ key: ARCHIVE_KEY, value: JSON.stringify(capped) });
  } catch (e) {
    console.error('[Queue] saveArchive failed:', e);
  }
}

export async function initQueue(): Promise<void> {
  await loadQueue();
  await loadArchive();
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
  if (queue.length >= QUEUE_MAX_ITEMS) throw new QueueFullError(QUEUE_MAX_ITEMS);
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
  if (queue.length >= QUEUE_MAX_ITEMS) throw new QueueFullError(QUEUE_MAX_ITEMS);
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
  if (queue.length >= QUEUE_MAX_ITEMS) throw new QueueFullError(QUEUE_MAX_ITEMS);
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
  if (queue.length >= QUEUE_MAX_ITEMS) throw new QueueFullError(QUEUE_MAX_ITEMS);
  queue.push({
    id: newId('DEL'),
    mutation: { kind: 'delete', table, id, reason },
    timestamp: new Date().toISOString(),
    tries: 0,
  });
  await saveQueue(queue);
}

// ── Alias rétro-compat (signature Sheets héritée) ───────────────────────────
// Ne fonctionne plus runtime côté Sheets — les deux callers résiduels
// (notesApi, phaseEngine) écrivent dans des sheets sans équivalent Supabase.
// La fonction logge un warning et drop silencieusement les valeurs.

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

/**
 * Nombre d'items ayant déjà subi au moins un échec — utilisé par l'UI
 * pour afficher "X erreurs Sync" (variante danger du badge).
 */
export function getErrorCount(): number {
  return _memCache.filter((item) => item.tries > 0).length;
}

/** Liste figée des items en attente (clone shallow). */
export function getQueueItems(): QueueItem[] {
  return [..._memCache];
}

/** Archive en mémoire (items abandonnés après MAX_TRIES). */
export function getArchivedItems(): ArchivedQueueItem[] {
  return [..._archiveMemCache];
}

/** Vide l'archive (debug / cleanup côté écran "Voir la file"). */
export async function clearArchive(): Promise<void> {
  await saveArchive([]);
}

/**
 * Force un retry immédiat sur un item en queue : reset `nextAttemptAt`
 * pour qu'il soit éligible au prochain `processQueue`. Ne change PAS
 * `tries` — le compteur reste honnête.
 */
export async function retryItem(itemId: string): Promise<boolean> {
  const queue = await loadQueue();
  const idx = queue.findIndex((it) => it.id === itemId);
  if (idx === -1) return false;
  queue[idx] = { ...queue[idx], nextAttemptAt: undefined };
  await saveQueue(queue);
  return true;
}

/**
 * Force un retry immédiat sur tous les items en queue.
 */
export async function retryAll(): Promise<number> {
  const queue = await loadQueue();
  if (queue.length === 0) return 0;
  const next = queue.map((it) => ({ ...it, nextAttemptAt: undefined }));
  await saveQueue(next);
  return next.length;
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
    // V72 — branchés sur les helpers thin de supabaseWrites
    case 'pesees':                await insertPesee(v); return;
    case 'porcelets_individuels': await insertPorceletIndividuel(v); return;
    case 'loges':                 await insertLoge(v); return;
    case 'loge_movements':        await insertLogeMovement(v); return;
    case 'daily_checks_mb':       await insertDailyCheckMb(v); return;
    case 'feed_consumption_logs': await insertFeedConsumptionLog(v); return;
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
    // V72 — update branchés
    case 'pesees':                res = await updatePesee(id, f); break;
    case 'porcelets_individuels': res = await updatePorceletIndividuel(id, f); break;
    case 'loges':                 res = await updateLogeRow(id, f); break;
    case 'health_logs':
    case 'saillies':
    case 'finances':
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

/**
 * V73 — Mutex in-flight pour empêcher 2 flushs concurrents.
 *
 * Sans ce verrou, deux events `online` rapprochés (ou un boot + un reconnect)
 * pouvaient charger la même queue, dispatcher les mêmes INSERT en parallèle,
 * et produire :
 *  - succès du 1er → INSERT serveur OK ;
 *  - 2e dispatch après 1er save → unique violation côté Postgres ;
 *  - tries++ sur item DÉJÀ inséré → archivage erroné après MAX_TRIES.
 *
 * Pattern : la 2e invocation s'aligne sur la promise en cours, retourne le
 * MÊME résultat. Pas de file d'attente FIFO : les évènements `online` qui
 * arrivent pendant un flush sont coalescés en un seul flush.
 */
let _inFlight: Promise<ProcessQueueResult> | null = null;

export interface ProcessQueueResult {
  success: boolean;
  processed: number;
  remaining: number;
  abandoned: number;
  skipped: number;
}

export function processQueue(): Promise<ProcessQueueResult> {
  // NOTE : non-async délibérément pour retourner la MÊME référence de promesse
  // au 2e appel concurrent (coalescing). Un wrapper `async` créerait une
  // nouvelle promesse englobante et casserait l'invariant `p1 === p2`.
  if (_inFlight) return _inFlight;
  const p = _processQueueInner().finally(() => {
    if (_inFlight === p) _inFlight = null;
  });
  _inFlight = p;
  return p;
}

async function _processQueueInner(): Promise<ProcessQueueResult> {
  const queue = await loadQueue();
  if (queue.length === 0) return { success: true, processed: 0, remaining: 0, abandoned: 0, skipped: 0 };

  const now = Date.now();
  const remaining: QueueItem[] = [];
  const archivedNow: ArchivedQueueItem[] = [];
  let processed = 0;
  let abandoned = 0;
  let skipped = 0;
  let hasError = false;

  for (const item of queue) {
    // Backoff exponentiel : on skippe les items pas encore éligibles. Le
    // listener `online` ré-essaiera, et l'auto-flush via polling rattrapera
    // les retries différés au tick suivant.
    if (typeof item.nextAttemptAt === 'number' && item.nextAttemptAt > now) {
      remaining.push(item);
      skipped++;
      continue;
    }
    try {
      await runMutation(item.mutation);
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // V81 Sprint 5 — Conflit d'unicité (PostgreSQL 23505) = item DÉJÀ
      // inséré (cas typique : retry réseau idempotent grâce à l'UUID client
      // pré-généré OU conflit de code_id parce qu'un autre device a inséré
      // la même chose pendant que l'item était en file). Le retry est inutile
      // et créerait juste 5 logs d'erreur avant l'archivage. On compte
      // comme succès idempotent et on retire de la file.
      if (/duplicate key|unique constraint|23505/i.test(msg)) {
        console.info(`[Queue] item ${item.id} déjà inséré (unique_violation) — ignoré idempotent`);
        processed++;
        continue;
      }
      item.tries++;
      item.lastError = msg;
      if (item.tries >= MAX_TRIES) {
        console.error(`[Queue] item ${item.id} abandonné après ${MAX_TRIES} essais :`, item.lastError);
        archivedNow.push({ ...item, archivedAt: new Date().toISOString() });
        abandoned++;
      } else {
        const delay = BACKOFF_DELAYS_MS[item.tries - 1] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
        item.nextAttemptAt = Date.now() + delay;
        remaining.push(item);
      }
      hasError = true;
    }
  }

  await saveQueue(remaining);
  if (archivedNow.length > 0) {
    const archive = await loadArchive();
    await saveArchive([...archive, ...archivedNow]);
  }
  return { success: !hasError, processed, remaining: remaining.length, abandoned, skipped };
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

/**
 * Tente un flush si l'app est en ligne et que la queue n'est pas vide.
 * À appeler au boot après `initQueue()` pour drainer ce qui reste d'une
 * session précédente. No-op silencieux en cas d'erreur réseau.
 */
export async function tryFlushIfOnline(): Promise<void> {
  if (!isOnline()) return;
  if (_memCache.length === 0) return;
  try {
    await processQueue();
  } catch (e) {
    console.warn('[offlineQueue] tryFlushIfOnline failed:', e);
  }
}

/** Test-only helper to reset module state between tests. */
export function __resetQueueForTests(): void {
  _memCache = [];
  _archiveMemCache = [];
  _inFlight = null;
}

/** Délais de backoff exposés pour les tests (lecture seule). */
export const __BACKOFF_DELAYS_MS_FOR_TESTS = BACKOFF_DELAYS_MS;
