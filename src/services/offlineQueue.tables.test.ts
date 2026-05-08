// @vitest-environment jsdom
/**
 * V72 — Tests extension offlineQueue aux 6 tables qui throwaient
 * « insert non supporté » : pesees, porcelets_individuels, loges,
 * loge_movements, daily_checks_mb, feed_consumption_logs.
 *
 * Couvre :
 *  - insert online → helper appelé une fois, queue vide
 *  - persistence offline (mock failure) → item gardé en queue avec tries=1
 *  - update online pour les 3 tables qui supportent update (pesees, porcelets, loges)
 *  - throw d'erreur claire pour les 3 tables append-only quand on tente un update
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enqueueInsert,
  enqueueUpdate,
  flushQueue,
  clearQueue,
  clearArchive,
  getQueueItems,
  initQueue,
} from './offlineQueue';

const insertPeseeMock = vi.fn(async (_v: unknown) => ({ id: 'pe-uuid' }));
const insertPorceletMock = vi.fn(async (_v: unknown) => ({ id: 'pi-uuid' }));
const insertLogeMock = vi.fn(async (_v: unknown) => ({ id: 'lg-uuid' }));
const insertLogeMovementMock = vi.fn(async (_v: unknown) => ({ id: 'lm-uuid' }));
const insertDailyCheckMbMock = vi.fn(async (_v: unknown) => ({ id: 'dc-uuid' }));
const insertFeedConsumptionLogMock = vi.fn(async (_v: unknown) => ({ id: 'fc-uuid' }));

const updatePeseeMock = vi.fn(async (_id: string, _patch: unknown) => ({ success: true }));
const updatePorceletMock = vi.fn(async (_id: string, _patch: unknown) => ({ success: true }));
const updateLogeRowMock = vi.fn(async (_id: string, _patch: unknown) => ({ success: true }));

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
  insertPesee: (v: unknown) => insertPeseeMock(v),
  insertPorceletIndividuel: (v: unknown) => insertPorceletMock(v),
  insertLoge: (v: unknown) => insertLogeMock(v),
  insertLogeMovement: (v: unknown) => insertLogeMovementMock(v),
  insertDailyCheckMb: (v: unknown) => insertDailyCheckMbMock(v),
  insertFeedConsumptionLog: (v: unknown) => insertFeedConsumptionLogMock(v),
  updateSow: vi.fn(async () => ({ success: true })),
  updateBoar: vi.fn(async () => ({ success: true })),
  updateBatch: vi.fn(async () => ({ success: true })),
  updateNote: vi.fn(async () => ({ success: true })),
  updateProduitAliment: vi.fn(async () => ({ success: true })),
  updateProduitVeto: vi.fn(async () => ({ success: true })),
  updatePesee: (id: string, patch: unknown) => updatePeseeMock(id, patch),
  updatePorceletIndividuel: (id: string, patch: unknown) => updatePorceletMock(id, patch),
  updateLogeRow: (id: string, patch: unknown) => updateLogeRowMock(id, patch),
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
  insertPeseeMock.mockReset();
  insertPeseeMock.mockImplementation(async () => ({ id: 'pe-uuid' }));
  insertPorceletMock.mockReset();
  insertPorceletMock.mockImplementation(async () => ({ id: 'pi-uuid' }));
  insertLogeMock.mockReset();
  insertLogeMock.mockImplementation(async () => ({ id: 'lg-uuid' }));
  insertLogeMovementMock.mockReset();
  insertLogeMovementMock.mockImplementation(async () => ({ id: 'lm-uuid' }));
  insertDailyCheckMbMock.mockReset();
  insertDailyCheckMbMock.mockImplementation(async () => ({ id: 'dc-uuid' }));
  insertFeedConsumptionLogMock.mockReset();
  insertFeedConsumptionLogMock.mockImplementation(async () => ({ id: 'fc-uuid' }));
  updatePeseeMock.mockReset();
  updatePeseeMock.mockImplementation(async () => ({ success: true }));
  updatePorceletMock.mockReset();
  updatePorceletMock.mockImplementation(async () => ({ success: true }));
  updateLogeRowMock.mockReset();
  updateLogeRowMock.mockImplementation(async () => ({ success: true }));
  await clearQueue();
  await clearArchive();
  await initQueue();
});

afterEach(async () => {
  await clearQueue();
  await clearArchive();
});

describe('V72 — runner insert pour les 6 tables nouvellement supportées', () => {
  it.each([
    ['pesees', () => insertPeseeMock, { porcelet_id: 'p-1', poids_kg: 8.4, date_pesee: '2026-05-08' }],
    ['porcelets_individuels', () => insertPorceletMock, { batch_id: 'B-1', boucle: 'P001', sexe: 'M' }],
    ['loges', () => insertLogeMock, { numero: 'M-01', type: 'MATERNITE' }],
    ['loge_movements', () => insertLogeMovementMock, { subject_type: 'TRUIE', subject_id: 'T-1', to_loge_id: 'L-1' }],
    ['daily_checks_mb', () => insertDailyCheckMbMock, { batch_id: 'B-1', morts_jour: 0 }],
    ['feed_consumption_logs', () => insertFeedConsumptionLogMock, { qty_kg: 12.5, date_conso: '2026-05-08', created_by: 'u-1' }],
  ] as const)(
    "insert online %s → helper appelé une fois, queue vide",
    async (table, getMock, payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await enqueueInsert(table as any, payload as Record<string, unknown>);
      expect(getQueueItems()).toHaveLength(1);

      const res = await flushQueue();
      expect(res.processed).toBe(1);
      expect(res.remaining).toBe(0);
      expect(getQueueItems()).toHaveLength(0);
      expect(getMock()).toHaveBeenCalledTimes(1);
      // L'id auto-généré côté client doit être propagé dans le payload.
      const callArg = getMock().mock.calls[0][0] as Record<string, unknown>;
      expect(typeof callArg.id).toBe('string');
      expect((callArg.id as string).length).toBeGreaterThan(0);
    },
  );

  it('persistence offline : insertPesee échoue → item gardé en queue avec tries=1', async () => {
    insertPeseeMock.mockRejectedValueOnce(new Error('netfail'));
    await enqueueInsert('pesees', {
      porcelet_id: 'p-99',
      poids_kg: 9.2,
      date_pesee: '2026-05-08',
    });

    const res = await flushQueue();
    expect(res.processed).toBe(0);
    expect(res.remaining).toBe(1);
    expect(res.abandoned).toBe(0);

    const items = getQueueItems();
    expect(items).toHaveLength(1);
    expect(items[0].tries).toBe(1);
    expect(items[0].lastError).toBe('netfail');
  });
});

describe('V72 — runner update pour pesees / porcelets_individuels / loges', () => {
  it('update pesees → updatePesee appelé', async () => {
    await enqueueUpdate('pesees', 'pe-1', { poids_kg: 10.5 });
    const res = await flushQueue();
    expect(res.processed).toBe(1);
    expect(updatePeseeMock).toHaveBeenCalledTimes(1);
    expect(updatePeseeMock).toHaveBeenCalledWith('pe-1', { poids_kg: 10.5 });
  });

  it('update porcelets_individuels → updatePorceletIndividuel appelé', async () => {
    await enqueueUpdate('porcelets_individuels', 'pi-1', { batch_id: 'B-2' });
    const res = await flushQueue();
    expect(res.processed).toBe(1);
    expect(updatePorceletMock).toHaveBeenCalledWith('pi-1', { batch_id: 'B-2' });
  });

  it('update loges → updateLogeRow appelé', async () => {
    await enqueueUpdate('loges', 'lg-1', { active: false });
    const res = await flushQueue();
    expect(res.processed).toBe(1);
    expect(updateLogeRowMock).toHaveBeenCalledWith('lg-1', { active: false });
  });
});

describe('V72 — append-only tables : update throws', () => {
  it.each([
    'loge_movements',
    'daily_checks_mb',
    'feed_consumption_logs',
  ] as const)('update %s → erreur explicite (table append-only)', async (table) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await enqueueUpdate(table as any, 'fake-id', { foo: 'bar' });
    const res = await flushQueue();
    // L'item échoue mais reste en queue (tries=1) plutôt que d'être processed.
    expect(res.processed).toBe(0);
    expect(res.remaining).toBe(1);
    const items = getQueueItems();
    expect(items[0].tries).toBe(1);
    expect(items[0].lastError).toContain('update non supporté');
  });
});

describe('V72 — cascade FK : porcelets_individuels.batch_id', () => {
  it('insert porcelets_individuels avec batch_id pré-existant → propagé au helper', async () => {
    await enqueueInsert('porcelets_individuels', {
      batch_id: 'B-99',
      boucle: 'P-CASCADE',
      sexe: 'F',
    });
    const res = await flushQueue();
    expect(res.processed).toBe(1);
    const callArg = insertPorceletMock.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.batch_id).toBe('B-99');
    expect(callArg.boucle).toBe('P-CASCADE');
    expect(callArg.sexe).toBe('F');
  });

  it('insert batches puis porcelets dans la queue → ordre préservé', async () => {
    // Commit dans l'ordre : batch d'abord (FK), porcelet ensuite.
    await enqueueInsert('batches', { code_id: 'B-CASCADE', poids_initial_kg: 8 });
    await enqueueInsert('porcelets_individuels', {
      batch_id: 'B-CASCADE',
      boucle: 'P-FK',
      sexe: 'M',
    });

    const items = getQueueItems();
    expect(items).toHaveLength(2);
    expect(items[0].mutation).toMatchObject({ kind: 'insert', table: 'batches' });
    expect(items[1].mutation).toMatchObject({ kind: 'insert', table: 'porcelets_individuels' });

    const res = await flushQueue();
    expect(res.processed).toBe(2);
    expect(res.remaining).toBe(0);
  });
});
