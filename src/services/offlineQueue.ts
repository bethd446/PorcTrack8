/**
 * PorcTrack — File d'attente Offline
 * ════════════════════════════════════════════════════════
 * MIGRATION v7 : localStorage → Capacitor Preferences
 * Raison : localStorage peut être vidé par Android à tout moment.
 * Capacitor Preferences est backed par SharedPreferences (Android)
 * et NSUserDefaults (iOS) — persistants entre les redémarrages app.
 */

import { Preferences } from '@capacitor/preferences';
import { updateRowById, appendRow } from './googleSheets';

/** Cellule Sheets : primitives acceptées par l'API Values.append/batchUpdate. */
export type SheetCell = string | number | boolean | null;

export type UpdateRowPayload = {
  sheet: string;
  idHeader: string;
  idValue: string;
  patch: Record<string, SheetCell>;
};

export type AppendRowPayload = {
  sheet: string;
  values: SheetCell[];
};

export type QueueItem =
  | {
      id: string;
      action: 'update_row_by_id';
      payload: UpdateRowPayload;
      timestamp: string;
      tries: number;
      lastError?: string;
    }
  | {
      id: string;
      action: 'append_row';
      payload: AppendRowPayload;
      timestamp: string;
      tries: number;
      lastError?: string;
    };

const QUEUE_KEY = 'porctrack_sync_queue_v7';

// ── Cache mémoire — permet getQueueStatus() synchrone ───────────────────────
// Les callers existants (Dashboard, Header, etc.) appellent getQueueStatus() de
// façon synchrone. On maintient une copie mémoire mise à jour à chaque write.
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
    // Le cache mémoire a été mis à jour, mais la persistance a échoué.
    // Relance l'erreur pour que l'UI puisse alerter l'utilisateur au lieu
    // d'afficher un faux toast de succès (silent failure = bug perçu côté
    // terrain : "j'enregistre mais rien ne remonte").
    console.error('[Queue] saveQueue failed:', e);
    throw e instanceof Error ? e : new Error(String(e));
  }
}

/** Initialise le cache mémoire au démarrage de l'app */
export async function initQueue(): Promise<void> {
  await loadQueue();
}

// ── API publique ─────────────────────────────────────────────────────────────

export async function enqueueUpdateRow(
  sheet: string, idHeader: string, idValue: string, patch: Record<string, SheetCell>
): Promise<void> {
  const queue = await loadQueue();
  queue.push({
    id: `UP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    action: 'update_row_by_id',
    payload: { sheet, idHeader, idValue, patch },
    timestamp: new Date().toISOString(),
    tries: 0,
  });
  await saveQueue(queue);
}

export async function enqueueAppendRow(sheet: string, values: SheetCell[]): Promise<void> {
  const queue = await loadQueue();
  queue.push({
    id: `AP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    action: 'append_row',
    payload: { sheet, values },
    timestamp: new Date().toISOString(),
    tries: 0,
  });
  await saveQueue(queue);
}

/**
 * Retourne l'état de la queue de façon SYNCHRONE (via le cache mémoire).
 * Compatible avec tous les appels existants sans await.
 * Le cache mémoire est mis à jour à chaque enqueue/processQueue.
 * Appeler initQueue() au démarrage pour charger depuis Preferences.
 */
export function getQueueStatus(): { pending: number; items: QueueItem[] } {
  return { pending: _memCache.length, items: [..._memCache] };
}

/** Retourne le nombre d'actions en attente */
export function getQueueLength(): number {
  return _memCache.length;
}

/** Vérifie si des actions ont échoué (tries > 0) */
export function hasFailedSync(): boolean {
  return _memCache.some(item => item.tries > 0);
}

/**
 * Nombre maximal de tentatives avant abandon d'une action en queue.
 * Au-delà, l'item est retiré de la queue pour éviter une accumulation non bornée.
 * L'utilisateur peut consulter l'historique des erreurs dans /sync.
 */
const MAX_TRIES = 5;

/**
 * Traite toute la queue vers GAS.
 * Succès → retirés. Échecs → conservés pour retry (jusqu'à MAX_TRIES).
 * Abandon → retirés de la queue après MAX_TRIES échecs consécutifs.
 */
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
    let result: { success: boolean; message?: string };
    try {
      if (item.action === 'update_row_by_id') {
        const { sheet, idHeader, idValue, patch } = item.payload;
        result = await updateRowById(sheet, idHeader, idValue, patch);
      } else {
        const { sheet, values } = item.payload;
        result = await appendRow(sheet, values);
      }

      if (result.success) {
        processed++;
      } else {
        item.tries++;
        item.lastError = result.message;
        if (item.tries >= MAX_TRIES) {
          console.error(`[Queue] item ${item.id} abandonné après ${MAX_TRIES} essais :`, item.lastError);
          abandoned++;
        } else {
          remaining.push(item);
        }
        hasError = true;
      }
    } catch (e) {
      item.tries++;
      item.lastError = String(e);
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

/** Alias rétrocompatibilité */
export const flushQueue = processQueue;

/** Vide entièrement la queue (reset manuel via SyncView) */
export async function clearQueue(): Promise<void> {
  await saveQueue([]);
}
