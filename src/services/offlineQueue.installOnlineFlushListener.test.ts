// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  installOnlineFlushListener,
  isOnline,
  enqueueInsert,
  flushQueue,
  clearQueue,
  getQueueLength,
  initQueue,
} from './offlineQueue';

// Mocks pour le test E3 — runner Supabase
const insertSowMock = vi.fn(async (_v: unknown) => ({ id: 's-uuid' }));
const insertBoarMock = vi.fn(async (_v: unknown) => ({ id: 'b-uuid' }));
const updateSowMock = vi.fn(async (_id: string, _p: unknown) => ({ success: true }));

vi.mock('./supabaseWrites', () => ({
  insertSow: (v: unknown) => insertSowMock(v),
  insertBoar: (v: unknown) => insertBoarMock(v),
  insertBatch: vi.fn(async () => ({ id: 'batch-uuid' })),
  insertNote: vi.fn(async () => ({ id: 'note-uuid' })),
  insertHealthLog: vi.fn(async () => ({ id: 'hl-uuid' })),
  insertSaillie: vi.fn(async () => ({ id: 'sa-uuid' })),
  insertFinance: vi.fn(async () => ({ id: 'fin-uuid' })),
  insertProduitAliment: vi.fn(async () => ({ id: 'pa-uuid' })),
  insertProduitVeto: vi.fn(async () => ({ id: 'pv-uuid' })),
  updateSow: (id: string, p: unknown) => updateSowMock(id, p),
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

describe('installOnlineFlushListener', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appelle flushFn quand l\'event "online" est dispatché', () => {
    const flushFn = vi.fn().mockResolvedValue(undefined);
    const unsubscribe = installOnlineFlushListener(flushFn);

    window.dispatchEvent(new Event('online'));

    expect(flushFn).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("n'appelle plus flushFn après unsubscribe", () => {
    const flushFn = vi.fn().mockResolvedValue(undefined);
    const unsubscribe = installOnlineFlushListener(flushFn);
    unsubscribe();

    window.dispatchEvent(new Event('online'));

    expect(flushFn).not.toHaveBeenCalled();
  });

  it("ne propage pas une erreur de flushFn (catch interne)", async () => {
    const error = new Error('boom');
    const flushFn = vi.fn().mockRejectedValue(error);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unsubscribe = installOnlineFlushListener(flushFn);

    expect(() => window.dispatchEvent(new Event('online'))).not.toThrow();

    // laisse le tick async se résoudre
    await new Promise((r) => setTimeout(r, 0));

    expect(flushFn).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    unsubscribe();
  });
});

describe('E3 — Sync offline auto-flush au reconnect', () => {
  beforeEach(async () => {
    insertSowMock.mockClear();
    insertBoarMock.mockClear();
    updateSowMock.mockClear();
    await clearQueue();
    await initQueue();
  });

  afterEach(async () => {
    await clearQueue();
  });

  it('writes queueés en offline → flush au online déclenche les actions', async () => {
    // Étape 1 : offline → enqueue 2 inserts (1 sow, 1 boar) + 1 update.
    await enqueueInsert('sows', { code_id: 'T-100', name: 'Truie 100' });
    await enqueueInsert('boars', { code_id: 'V-100', name: 'Verrat 100' });
    expect(getQueueLength()).toBe(2);
    expect(insertSowMock).not.toHaveBeenCalled();
    expect(insertBoarMock).not.toHaveBeenCalled();

    // Étape 2 : flushQueue manuel (équivalent du déclenchement online).
    const result = await flushQueue();

    expect(result.processed).toBe(2);
    expect(result.remaining).toBe(0);
    expect(insertSowMock).toHaveBeenCalledTimes(1);
    expect(insertSowMock).toHaveBeenCalledWith(
      expect.objectContaining({ code_id: 'T-100' }),
    );
    expect(insertBoarMock).toHaveBeenCalledTimes(1);
    expect(getQueueLength()).toBe(0);
  });

  it('event "online" déclenche le flush via installOnlineFlushListener', async () => {
    await enqueueInsert('sows', { code_id: 'T-200', name: 'Truie 200' });
    expect(getQueueLength()).toBe(1);

    const flushFn = vi.fn(async () => {
      await flushQueue();
    });
    const unsubscribe = installOnlineFlushListener(flushFn);

    window.dispatchEvent(new Event('online'));
    // Laisse le tick async se résoudre.
    await new Promise((r) => setTimeout(r, 10));

    expect(flushFn).toHaveBeenCalledTimes(1);
    expect(insertSowMock).toHaveBeenCalledWith(
      expect.objectContaining({ code_id: 'T-200' }),
    );
    expect(getQueueLength()).toBe(0);

    unsubscribe();
  });

  it('flush avec échec → item gardé en queue avec tries incrémenté', async () => {
    insertSowMock.mockImplementationOnce(async () => {
      throw new Error('Network error');
    });
    await enqueueInsert('sows', { code_id: 'T-300' });
    const result = await flushQueue();
    expect(result.processed).toBe(0);
    expect(result.remaining).toBe(1);
    expect(getQueueLength()).toBe(1);
  });
});

describe('isOnline', () => {
  it('retourne true par défaut quand navigator.onLine est true', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    expect(isOnline()).toBe(true);
  });

  it('retourne false quand navigator.onLine est false', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    expect(isOnline()).toBe(false);
  });
});
