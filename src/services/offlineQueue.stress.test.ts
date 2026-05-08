// @vitest-environment jsdom
/**
 * V73 — Tests stress queue offline.
 *
 * Couvre :
 *  - 50 INSERT offline → flush → tous traités sans duplication (idempotence UUID)
 *  - Cap dur QUEUE_MAX_ITEMS : enqueueInsert rejette QueueFullError au-delà
 *  - Mutex in-flight : 2 processQueue() concurrents → 1 seul dispatch
 *  - Network flapping : enchaîner online/offline 10x → pas de double flush
 *  - Idempotence : même UUID conservé après crash + replay
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueInsert,
  flushQueue,
  processQueue,
  clearQueue,
  clearArchive,
  initQueue,
  getQueueItems,
  getQueueLength,
  QueueFullError,
  QUEUE_MAX_ITEMS_FOR_UI,
  __resetQueueForTests,
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
  insertPesee: vi.fn(async () => ({ id: 'pe-uuid' })),
  insertPorceletIndividuel: vi.fn(async () => ({ id: 'pi-uuid' })),
  insertLoge: vi.fn(async () => ({ id: 'lo-uuid' })),
  insertLogeMovement: vi.fn(async () => ({ id: 'lm-uuid' })),
  insertDailyCheckMb: vi.fn(async () => ({ id: 'dc-uuid' })),
  insertFeedConsumptionLog: vi.fn(async () => ({ id: 'fc-uuid' })),
  updateSow: vi.fn(async () => ({ success: true })),
  updateBoar: vi.fn(async () => ({ success: true })),
  updateBatch: vi.fn(async () => ({ success: true })),
  updateNote: vi.fn(async () => ({ success: true })),
  updateProduitAliment: vi.fn(async () => ({ success: true })),
  updateProduitVeto: vi.fn(async () => ({ success: true })),
  updatePesee: vi.fn(async () => ({ success: true })),
  updatePorceletIndividuel: vi.fn(async () => ({ success: true })),
  updateLogeRow: vi.fn(async () => ({ success: true })),
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
  __resetQueueForTests();
  await clearQueue();
  await clearArchive();
  await initQueue();
});

afterEach(async () => {
  __resetQueueForTests();
  await clearQueue();
  await clearArchive();
});

describe('V73 — stress 50 INSERT offline → flush', () => {
  it('queue 50 inserts puis flush les drain tous', async () => {
    for (let i = 0; i < 50; i++) {
      await enqueueInsert('sows', { code_id: `T-${i}` });
    }
    expect(getQueueLength()).toBe(50);

    const res = await flushQueue();
    expect(res.processed).toBe(50);
    expect(res.remaining).toBe(0);
    expect(insertSowMock).toHaveBeenCalledTimes(50);
  });

  it('idempotence UUID : chaque enqueueInsert sans id reçoit un UUID v4 stable', async () => {
    await enqueueInsert('sows', { code_id: 'T-A' });
    await enqueueInsert('sows', { code_id: 'T-B' });

    const items = getQueueItems();
    const ids = items
      .filter((it) => it.mutation.kind === 'insert')
      .map((it) => (it.mutation as unknown as { values: { id: string } }).values.id);

    expect(ids).toHaveLength(2);
    // UUIDs distincts
    expect(ids[0]).not.toBe(ids[1]);
    // Format UUID v4
    const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(ids[0]).toMatch(UUID_V4);
    expect(ids[1]).toMatch(UUID_V4);
  });

  it('idempotence replay : même UUID préservé entre 2 flush partiels', async () => {
    // Premier insert qui échoue → reste en queue avec son UUID original
    insertSowMock.mockRejectedValueOnce(new Error('netfail'));
    await enqueueInsert('sows', { code_id: 'T-IDEM' });
    const itemsBefore = getQueueItems();
    const uuidBefore = (itemsBefore[0].mutation as unknown as { values: { id: string } }).values.id;

    await flushQueue(); // fail → reste en queue, tries=1
    const itemsAfter = getQueueItems();
    expect(itemsAfter).toHaveLength(1);
    const uuidAfter = (itemsAfter[0].mutation as unknown as { values: { id: string } }).values.id;

    // L'UUID DOIT être inchangé pour permettre l'idempotence côté Postgres.
    expect(uuidAfter).toBe(uuidBefore);
  });
});

describe('V73 — cap dur QUEUE_MAX_ITEMS', () => {
  it('expose QUEUE_MAX_ITEMS_FOR_UI = 1000', () => {
    expect(QUEUE_MAX_ITEMS_FOR_UI).toBe(1000);
  });

  it('enqueueInsert rejette QueueFullError au-delà du cap', async () => {
    // Atteint volontairement le cap par injection directe en Preferences.
    // Plus rapide que 1000 enqueue sequentiels.
    const { Preferences } = await import('@capacitor/preferences');
    const fakeQueue = Array.from({ length: 1000 }, (_, i) => ({
      id: `INS-${i}`,
      mutation: { kind: 'insert', table: 'sows', values: { id: `id-${i}` } },
      timestamp: new Date().toISOString(),
      tries: 0,
    }));
    await Preferences.set({
      key: 'porctrack_sync_queue_v8',
      value: JSON.stringify(fakeQueue),
    });
    // Recharge mémoire via initQueue
    await initQueue();
    expect(getQueueLength()).toBe(1000);

    // L'enqueue suivant doit throw QueueFullError
    await expect(enqueueInsert('sows', { code_id: 'T-OVERFLOW' })).rejects.toThrow(
      QueueFullError,
    );
  });

  it('flushQueue partiel libère de la place pour de nouveaux enqueues', async () => {
    // Pré-remplit à 999 items
    const { Preferences } = await import('@capacitor/preferences');
    const fakeQueue = Array.from({ length: 999 }, (_, i) => ({
      id: `INS-${i}`,
      mutation: { kind: 'insert', table: 'sows', values: { id: `id-${i}` } },
      timestamp: new Date().toISOString(),
      tries: 0,
    }));
    await Preferences.set({
      key: 'porctrack_sync_queue_v8',
      value: JSON.stringify(fakeQueue),
    });
    await initQueue();

    // 1 insert encore possible (passe à 1000)
    await expect(enqueueInsert('sows', { code_id: 'T-LAST' })).resolves.toBeUndefined();
    expect(getQueueLength()).toBe(1000);

    // Flush draine tout
    insertSowMock.mockResolvedValue({ id: 's-uuid' });
    await flushQueue();
    expect(getQueueLength()).toBe(0);

    // Espace dispo à nouveau
    await expect(enqueueInsert('sows', { code_id: 'T-AFTER' })).resolves.toBeUndefined();
  });
});

describe('V73 — mutex in-flight (anti double-flush)', () => {
  it('2 processQueue() concurrents partagent la même promise (1 seul dispatch)', async () => {
    // Mutation qui throttle pour laisser le 2e appel partir avant la fin.
    let resolveInsert: ((v: { id: string }) => void) | undefined;
    const pending = new Promise<{ id: string }>((resolve) => {
      resolveInsert = resolve;
    });
    insertSowMock.mockReturnValueOnce(pending);
    await enqueueInsert('sows', { code_id: 'T-CONC' });
    expect(getQueueLength()).toBe(1);

    // Lance 2 processQueue() en parallèle SANS attendre.
    const p1 = processQueue();
    const p2 = processQueue();

    // Les deux promises sont identiques (même référence si mutex actif).
    expect(p1).toBe(p2);

    // Résout le mock pour débloquer l'insert en cours.
    resolveInsert!({ id: 's-uuid' });
    const [r1, r2] = await Promise.all([p1, p2]);

    // Même résultat retourné, et insertSow appelé 1 SEULE fois.
    expect(r1).toEqual(r2);
    expect(insertSowMock).toHaveBeenCalledTimes(1);
  });

  it('après que le 1er flush termine, un nouveau processQueue() peut démarrer', async () => {
    insertSowMock.mockResolvedValue({ id: 's-uuid' });
    await enqueueInsert('sows', { code_id: 'T-A' });
    await processQueue();
    expect(getQueueLength()).toBe(0);

    // 2e flush sur queue vide → no-op.
    const r2 = await processQueue();
    expect(r2.processed).toBe(0);
    expect(r2.remaining).toBe(0);
  });
});

describe('V73 — network flapping', () => {
  it('online/offline 10x rapide → pas de double dispatch (mutex coalesce)', async () => {
    insertSowMock.mockResolvedValue({ id: 's-uuid' });
    await enqueueInsert('sows', { code_id: 'T-FLAP' });

    // 10 flush en parallèle synchrones (avant qu'un seul ne résolve) →
    // doivent être coalescés par le mutex.
    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < 10; i++) promises.push(processQueue());
    await Promise.all(promises);

    // L'insert doit avoir été appelé 1 SEULE fois malgré 10 flush.
    expect(insertSowMock).toHaveBeenCalledTimes(1);
    expect(getQueueLength()).toBe(0);
  });
});
