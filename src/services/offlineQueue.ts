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
    console.error('[Queue] saveQueue failed:', e);
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

/**
 * Traite toute la queue vers GAS.
 * Succès → retirés. Échecs → conservés pour retry.
 */
export async function processQueue(): Promise<{
  success: boolean; processed: number; remaining: number;
}> {
  const queue = await loadQueue();
  if (queue.length === 0) return { success: true, processed: 0, remaining: 0 };

  const remaining: QueueItem[] = [];
  let processed = 0;
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
        remaining.push(item);
        hasError = true;
      }
    } catch (e) {
      item.tries++;
      item.lastError = String(e);
      remaining.push(item);
      hasError = true;
    }
  }

  await saveQueue(remaining);
  return { success: !hasError, processed, remaining: remaining.length };
}

/** Alias rétrocompatibilité */
export const flushQueue = processQueue;

/** Vide entièrement la queue (reset manuel via SyncView) */
export async function clearQueue(): Promise<void> {
  await saveQueue([]);
}
