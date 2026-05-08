// @vitest-environment jsdom
/**
 * V72 — Tests backoff exponentiel + archivage failed actions.
 *
 * Couvre :
 *  - retry exponentiel : nextAttemptAt calculé selon BACKOFF_DELAYS_MS
 *  - skip d'un item dont nextAttemptAt > now()
 *  - archivage automatique après MAX_TRIES
 *  - retryItem / retryAll : reset nextAttemptAt
 *  - clearArchive
 *  - getErrorCount
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enqueueInsert,
  flushQueue,
  clearQueue,
  clearArchive,
  retryItem,
  retryAll,
  getQueueItems,
  getArchivedItems,
  getErrorCount,
  initQueue,
  __BACKOFF_DELAYS_MS_FOR_TESTS,
} from './offlineQueue';

const insertSowMock = vi.fn(async (_v: unknown) => ({ id: 's-uuid' }));

vi.mock('./supabaseWrites', () => ({
  insertSow: (v: unknown) => insertSowMock(v),
  insertBoar: vi.fn(async () => ({ id: 'b-uuid' })),
  insertBatch: vi.fn(async () => ({ id: 'batch-uuid' })),
  insertNote: vi.fn(async () => ({ id: 'note-uuid' })),
  insertHealthLog: vi.fn(async () => ({ id: 'hl-uuid' })),
  insertSaillie: vi.fn(async () => ({ id: 'sa-uuid' })),
  insertFinance: vi.fn(async () => ({ id: 'fin-uuid' })),
  insertProduitAliment: vi.fn(async () => ({ id: 'pa-uuid' })),
  insertProduitVeto: vi.fn(async () => ({ id: 'pv-uuid' })),
  insertWeightDistribution: vi.fn(async () => ({ id: 'wd-uuid' })),
  updateSow: vi.fn(async () => ({ success: true })),
  updateBoar: vi.fn(async () => ({ success: true })),
  updateBatch: vi.fn(async () => ({ success: true })),
  updateNote: vi.fn(async () => ({ success: true })),
  updateProduitAliment: vi.fn(async () => ({ success: true })),
  updateProduitVeto: vi.fn(async () => ({ success: true })),
  updateSowByCode: vi.fn(async () => null),
  updateBoarByCode: vi.fn(async () => null),
  updateBatchByCode: vi.fn(async () => null),
  deleteSow: vi.fn(async () => undefined),
  deleteBoar: vi.fn(async () => undefined),
  deleteBatch: vi.fn(async () => undefined),
  deleteNote: vi.fn(async () => undefined),
  deleteHealthLog: vi.fn(async () => undefined),
  deleteProduitAliment: vi.fn(async () => undefined),
  deleteProduitVeto: vi.fn(async () => undefined),
}));

vi.mock('@capacitor/preferences', () => {
  let store: Record<string, string> = {};
  return {
    Preferences: {
      get: vi.fn(async ({ key }: { key: string }) => ({ value: store[key] ?? null })),
      set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
        store[key] = value;
      }),
      remove: vi.fn(async ({ key }: { key: string }) => {
        delete store[key];
      }),
      clear: vi.fn(async () => {
        store = {};
      }),
    },
  };
});

beforeEach(async () => {
  insertSowMock.mockReset();
  insertSowMock.mockImplementation(async () => ({ id: 's-uuid' }));
  await clearQueue();
  await clearArchive();
  await initQueue();
});

afterEach(async () => {
  await clearQueue();
  await clearArchive();
});

describe('V72 — backoff exponentiel structuré', () => {
  it('expose les délais 1s/5s/30s/5min/30min', () => {
    expect(__BACKOFF_DELAYS_MS_FOR_TESTS).toEqual([
      1_000,
      5_000,
      30_000,
      5 * 60_000,
      30 * 60_000,
    ]);
  });

  it("après 1er échec → nextAttemptAt = now + 1s, item gardé en queue", async () => {
    insertSowMock.mockRejectedValueOnce(new Error('netfail'));
    await enqueueInsert('sows', { code_id: 'T-1' });

    const before = Date.now();
    const res = await flushQueue();
    expect(res.processed).toBe(0);
    expect(res.remaining).toBe(1);
    expect(res.abandoned).toBe(0);

    const items = getQueueItems();
    expect(items).toHaveLength(1);
    expect(items[0].tries).toBe(1);
    expect(items[0].lastError).toBe('netfail');
    expect(items[0].nextAttemptAt).toBeGreaterThanOrEqual(before + 1_000);
    expect(items[0].nextAttemptAt).toBeLessThanOrEqual(before + 1_000 + 50);
  });

  it("flush dans la fenêtre de backoff → item skippé (pas de nouvel essai)", async () => {
    insertSowMock.mockRejectedValueOnce(new Error('netfail'));
    await enqueueInsert('sows', { code_id: 'T-2' });
    await flushQueue(); // 1 fail → nextAttemptAt now+1s
    const callsAfter1 = insertSowMock.mock.calls.length;
    expect(callsAfter1).toBe(1);

    // Re-flush IMMÉDIAT → l'item est skippé, le mock n'est PAS rappelé
    const res2 = await flushQueue();
    expect(insertSowMock.mock.calls.length).toBe(callsAfter1);
    expect(res2.skipped).toBe(1);
    expect(res2.remaining).toBe(1);
  });

  it("après expiration du backoff → flush re-tente l'item", async () => {
    insertSowMock.mockRejectedValueOnce(new Error('netfail'));
    insertSowMock.mockResolvedValueOnce({ id: 's-uuid' });
    await enqueueInsert('sows', { code_id: 'T-3' });
    await flushQueue(); // 1 fail
    const items = getQueueItems();
    expect(items[0].nextAttemptAt).toBeGreaterThan(Date.now());

    // Force expiration via retryItem (équivalent boot ou retry user)
    await retryItem(items[0].id);
    const res2 = await flushQueue();
    expect(res2.processed).toBe(1);
    expect(res2.remaining).toBe(0);
  });
});

describe('V72 — archivage failed actions', () => {
  it('archive un item après MAX_TRIES (5) échecs', async () => {
    insertSowMock.mockRejectedValue(new Error('boom'));
    await enqueueInsert('sows', { code_id: 'T-99' });

    // 5 flushs séparés par retry forcé (sinon backoff bloque)
    for (let i = 0; i < 5; i++) {
      await flushQueue();
      const items = getQueueItems();
      if (items.length === 0) break;
      await retryItem(items[0].id); // reset nextAttemptAt
    }

    expect(getQueueItems()).toHaveLength(0);
    const archived = getArchivedItems();
    expect(archived).toHaveLength(1);
    expect(archived[0].tries).toBe(5);
    expect(archived[0].lastError).toBe('boom');
    expect(archived[0].archivedAt).toBeDefined();
  });

  it('clearArchive vide les items archivés', async () => {
    insertSowMock.mockRejectedValue(new Error('boom'));
    await enqueueInsert('sows', { code_id: 'T-100' });
    for (let i = 0; i < 5; i++) {
      await flushQueue();
      const items = getQueueItems();
      if (items.length === 0) break;
      await retryItem(items[0].id);
    }
    expect(getArchivedItems()).toHaveLength(1);

    await clearArchive();
    expect(getArchivedItems()).toHaveLength(0);
  });
});

describe('V72 — getErrorCount', () => {
  it('compte uniquement les items avec tries > 0', async () => {
    await enqueueInsert('sows', { code_id: 'A' });
    expect(getErrorCount()).toBe(0);

    insertSowMock.mockRejectedValueOnce(new Error('x'));
    await flushQueue();
    expect(getErrorCount()).toBe(1);
  });
});

describe('V72 — retryAll', () => {
  it('reset nextAttemptAt sur tous les items et retourne le count', async () => {
    insertSowMock.mockRejectedValue(new Error('x'));
    await enqueueInsert('sows', { code_id: 'A' });
    await enqueueInsert('sows', { code_id: 'B' });
    await flushQueue();

    const itemsAfter = getQueueItems();
    expect(itemsAfter).toHaveLength(2);
    expect(itemsAfter.every((it) => typeof it.nextAttemptAt === 'number')).toBe(true);

    const count = await retryAll();
    expect(count).toBe(2);

    const itemsRetried = getQueueItems();
    expect(itemsRetried.every((it) => it.nextAttemptAt === undefined)).toBe(true);
  });

  it('retourne 0 sur queue vide', async () => {
    expect(await retryAll()).toBe(0);
  });
});

describe('V72 — retryItem id inconnu', () => {
  it('retourne false si itemId absent', async () => {
    expect(await retryItem('nope')).toBe(false);
  });
});

describe('V72 — tryFlushIfOnline (drainage au boot)', () => {
  it('flush la queue si online + items présents', async () => {
    const { tryFlushIfOnline } = await import('./offlineQueue');
    insertSowMock.mockResolvedValueOnce({ id: 's-uuid' });
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true });
    await enqueueInsert('sows', { code_id: 'T-BOOT' });
    expect(getQueueItems()).toHaveLength(1);

    await tryFlushIfOnline();

    expect(getQueueItems()).toHaveLength(0);
    expect(insertSowMock).toHaveBeenCalledWith(expect.objectContaining({ code_id: 'T-BOOT' }));
  });

  it("ne flush PAS si offline (laisse les items en queue)", async () => {
    const { tryFlushIfOnline } = await import('./offlineQueue');
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
    await enqueueInsert('sows', { code_id: 'T-OFFLINE' });

    await tryFlushIfOnline();

    expect(getQueueItems()).toHaveLength(1);
    expect(insertSowMock).not.toHaveBeenCalled();
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true });
  });

  it("no-op si queue vide", async () => {
    const { tryFlushIfOnline } = await import('./offlineQueue');
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true });
    await tryFlushIfOnline();
    expect(insertSowMock).not.toHaveBeenCalled();
  });
});
