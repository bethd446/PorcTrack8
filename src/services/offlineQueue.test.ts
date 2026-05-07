// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enqueueInsert,
  generateUUID,
  getQueueStatus,
  clearQueue,
  initQueue,
} from './offlineQueue';

vi.mock('./supabaseWrites', () => ({
  insertSow: vi.fn(async () => ({ id: 's-uuid' })),
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

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateUUID', () => {
  it('produit un UUID v4 valide', () => {
    const id = generateUUID();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('produit des UUID distincts à chaque appel', () => {
    const a = generateUUID();
    const b = generateUUID();
    expect(a).not.toBe(b);
  });

  it('fallback polyfill produit aussi un UUID v4 valide', () => {
    const original = globalThis.crypto;
    // Simule l'absence de crypto.randomUUID (ancien navigateur / JSDOM minimal)
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });
    try {
      const id = generateUUID();
      expect(id).toMatch(UUID_V4_REGEX);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: original,
      });
    }
  });
});

describe('enqueueInsert — idempotence id client-side', () => {
  beforeEach(async () => {
    await clearQueue();
    await initQueue();
  });

  afterEach(async () => {
    await clearQueue();
  });

  it('génère un UUID v4 si payload sans id', async () => {
    await enqueueInsert('sows', { code_id: 'T-100', name: 'Truie 100' });

    const { items } = getQueueStatus();
    expect(items).toHaveLength(1);
    const mutation = items[0].mutation;
    expect(mutation.kind).toBe('insert');
    if (mutation.kind !== 'insert') return;
    expect(mutation.values.id).toBeDefined();
    expect(typeof mutation.values.id).toBe('string');
    expect(mutation.values.id as string).toMatch(UUID_V4_REGEX);
    expect(mutation.values.code_id).toBe('T-100');
  });

  it("préserve l'id existant si le payload en contient un", async () => {
    const existingId = 'a3bb189e-8bf9-3888-9912-ace4e6543002';
    await enqueueInsert('sows', { id: existingId, code_id: 'T-101' });

    const { items } = getQueueStatus();
    const mutation = items[0].mutation;
    if (mutation.kind !== 'insert') throw new Error('kind mismatch');
    expect(mutation.values.id).toBe(existingId);
  });

  it("génère un UUID si l'id existant est vide ou non-string", async () => {
    await enqueueInsert('sows', { id: '', code_id: 'T-102' });

    const { items } = getQueueStatus();
    const mutation = items[0].mutation;
    if (mutation.kind !== 'insert') throw new Error('kind mismatch');
    expect(typeof mutation.values.id).toBe('string');
    expect(mutation.values.id as string).toMatch(UUID_V4_REGEX);
  });

  it('idempotence replay : 2 enqueueInsert avec même id → 2 entries gardent CE id', async () => {
    const sharedId = 'b3bb189e-8bf9-4888-9912-ace4e6543002';

    await enqueueInsert('sows', { id: sharedId, code_id: 'T-200' });
    await enqueueInsert('sows', { id: sharedId, code_id: 'T-200' });

    const { items } = getQueueStatus();
    expect(items).toHaveLength(2);
    const ids = items.map((it) => {
      if (it.mutation.kind !== 'insert') throw new Error('kind mismatch');
      return it.mutation.values.id;
    });
    expect(ids).toEqual([sharedId, sharedId]);
  });

  it('2 enqueueInsert sans id → 2 UUID DIFFÉRENTS (chaque payload reçoit son id)', async () => {
    await enqueueInsert('sows', { code_id: 'T-300' });
    await enqueueInsert('sows', { code_id: 'T-301' });

    const { items } = getQueueStatus();
    expect(items).toHaveLength(2);
    const ids = items.map((it) => {
      if (it.mutation.kind !== 'insert') throw new Error('kind mismatch');
      return it.mutation.values.id as string;
    });
    expect(ids[0]).toMatch(UUID_V4_REGEX);
    expect(ids[1]).toMatch(UUID_V4_REGEX);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
