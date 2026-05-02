/**
 * Tests unitaires — peseePlanifieesService
 * ════════════════════════════════════════
 * Couvre listPeseePending, createPeseePlanifiee, markPeseeEffectuee, autoScheduleMonthly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface InsertCall {
  table: string;
  payload: Record<string, unknown>;
}

interface SelectCall {
  table: string;
  columns: string;
  filters: Array<{ col: string; op: string; value: unknown }>;
  order?: { col: string; ascending: boolean };
}

interface UpdateCall {
  table: string;
  patch: Record<string, unknown>;
  filters: Array<{ col: string; value: unknown }>;
}

const insertCalls: InsertCall[] = [];
const selectCalls: SelectCall[] = [];
const updateCalls: UpdateCall[] = [];

let nextSelectData: Array<Record<string, unknown>> = [];
let nextInsertResult: Record<string, unknown> = {};

function makeBuilder(table: string) {
  let mode: 'idle' | 'select' | 'update' = 'idle';
  let currentSelect: SelectCall | null = null;
  let currentUpdate: UpdateCall | null = null;

  const chain: {
    eq: (col: string, value: unknown) => typeof chain;
    gte: (col: string, value: unknown) => typeof chain;
    lte: (col: string, value: unknown) => typeof chain;
    order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: null }>;
    select: () => typeof chain;
    single: () => Promise<{ data: unknown; error: null }>;
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>;
  } = {
    eq: (col, value) => {
      if (mode === 'select' && currentSelect) currentSelect.filters.push({ col, op: 'eq', value });
      if (mode === 'update' && currentUpdate) currentUpdate.filters.push({ col, value });
      return chain;
    },
    gte: (col, value) => {
      if (mode === 'select' && currentSelect) currentSelect.filters.push({ col, op: 'gte', value });
      return chain;
    },
    lte: (col, value) => {
      if (mode === 'select' && currentSelect) currentSelect.filters.push({ col, op: 'lte', value });
      return chain;
    },
    order: (col, opts) => {
      if (mode === 'select' && currentSelect) currentSelect.order = { col, ascending: opts.ascending };
      return Promise.resolve({ data: nextSelectData, error: null });
    },
    select: () => chain,
    single: () => Promise.resolve({ data: nextInsertResult, error: null }),
    then: (resolve, reject) => {
      // Pour select sans .order : retourne data directement
      if (mode === 'select') {
        return Promise.resolve({ data: nextSelectData, error: null }).then(resolve, reject);
      }
      // Pour update : success
      return Promise.resolve({ error: null }).then(resolve, reject);
    },
  };

  return {
    select: (columns: string) => {
      currentSelect = { table, columns, filters: [] };
      mode = 'select';
      selectCalls.push(currentSelect);
      return chain;
    },
    insert: (payload: Record<string, unknown>) => {
      insertCalls.push({ table, payload });
      return {
        select: () => ({
          single: () => Promise.resolve({ data: nextInsertResult, error: null }),
        }),
      };
    },
    update: (patch: Record<string, unknown>) => {
      currentUpdate = { table, patch, filters: [] };
      mode = 'update';
      updateCalls.push(currentUpdate);
      return chain;
    },
  };
}

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => makeBuilder(table),
    auth: {
      getSession: () => Promise.resolve({
        data: { session: { user: { id: 'farm-uuid' } } },
        error: null,
      }),
    },
  },
}));

import {
  listPeseePending,
  createPeseePlanifiee,
  markPeseeEffectuee,
  autoScheduleMonthly,
} from './peseePlanifieesService';
import type { BandePorcelets } from '../types/farm';

beforeEach(() => {
  insertCalls.length = 0;
  selectCalls.length = 0;
  updateCalls.length = 0;
  nextSelectData = [];
  nextInsertResult = {};
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('listPeseePending', () => {
  it('selects effectuee=false rows ordered by date_prevue ASC', async () => {
    nextSelectData = [
      {
        id: 'p1',
        batch_id: 'b1',
        porcelet_id: null,
        date_prevue: '2026-05-15',
        rappel_j1: false,
        rappel_j3: false,
        effectuee: false,
        date_effectuee: null,
      },
    ];
    const result = await listPeseePending();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'p1', batchId: 'b1', datePrevue: '2026-05-15' });
    expect(selectCalls).toHaveLength(1);
    expect(selectCalls[0].table).toBe('pesee_planifiees');
    expect(selectCalls[0].filters.find(f => f.col === 'effectuee')?.value).toBe(false);
    expect(selectCalls[0].order?.col).toBe('date_prevue');
    expect(selectCalls[0].order?.ascending).toBe(true);
  });
});

describe('createPeseePlanifiee', () => {
  it('inserts with farm_id auto-injected and returns model', async () => {
    nextInsertResult = {
      id: 'new-id',
      batch_id: 'batch-x',
      porcelet_id: null,
      date_prevue: '2026-06-01',
      rappel_j1: false,
      rappel_j3: false,
      effectuee: false,
      date_effectuee: null,
    };
    const result = await createPeseePlanifiee({ batchId: 'batch-x', datePrevue: '2026-06-01' });
    expect(result.id).toBe('new-id');
    expect(result.batchId).toBe('batch-x');
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].table).toBe('pesee_planifiees');
    expect(insertCalls[0].payload).toMatchObject({
      farm_id: 'farm-uuid',
      batch_id: 'batch-x',
      porcelet_id: null,
      date_prevue: '2026-06-01',
    });
  });

  it('throws if neither batchId nor porceletId provided', async () => {
    await expect(createPeseePlanifiee({ datePrevue: '2026-06-01' })).rejects.toThrow();
  });
});

describe('markPeseeEffectuee', () => {
  it('updates effectuee=true and date_effectuee=today', async () => {
    await markPeseeEffectuee('pesee-1');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].table).toBe('pesee_planifiees');
    expect(updateCalls[0].patch.effectuee).toBe(true);
    expect(updateCalls[0].patch.date_effectuee).toBeTypeOf('string');
    expect(updateCalls[0].filters.find(f => f.col === 'id')?.value).toBe('pesee-1');
  });
});

describe('autoScheduleMonthly', () => {
  it('creates 1 pesee per active bande without scheduled pesee in next 30d', async () => {
    nextSelectData = []; // Aucune pesée existante
    nextInsertResult = {
      id: 'new',
      batch_id: 'b1',
      porcelet_id: null,
      date_prevue: '2026-06-01',
      rappel_j1: false,
      rappel_j3: false,
      effectuee: false,
      date_effectuee: null,
    };

    const bandes: BandePorcelets[] = [
      {
        id: 'b1', idPortee: 'P1', statut: 'En croissance',
        synced: true, poidsInitialKg: 6,
      },
      {
        id: 'b2', idPortee: 'P2', statut: 'RECAP', // Doit être ignorée
        synced: true, poidsInitialKg: 6,
      },
      {
        id: 'b3', idPortee: 'P3', statut: 'Sous mère',
        synced: true, poidsInitialKg: 6,
      },
    ];
    const created = await autoScheduleMonthly(bandes);
    // 2 actives (b1 + b3), 0 existantes → 2 créations
    expect(created).toBe(2);
    expect(insertCalls.length).toBe(2);
    const insertedBatchIds = insertCalls.map(c => c.payload.batch_id);
    expect(insertedBatchIds).toContain('b1');
    expect(insertedBatchIds).toContain('b3');
    expect(insertedBatchIds).not.toContain('b2');
  });

  it('skips bandes with existing pesee in horizon', async () => {
    nextSelectData = [
      { batch_id: 'b1', date_prevue: '2026-05-15', effectuee: false },
    ];
    nextInsertResult = {
      id: 'new',
      batch_id: 'b2',
      porcelet_id: null,
      date_prevue: '2026-06-01',
      rappel_j1: false,
      rappel_j3: false,
      effectuee: false,
      date_effectuee: null,
    };
    const bandes: BandePorcelets[] = [
      { id: 'b1', idPortee: 'P1', statut: 'En croissance', synced: true, poidsInitialKg: 6 },
      { id: 'b2', idPortee: 'P2', statut: 'En croissance', synced: true, poidsInitialKg: 6 },
    ];
    const created = await autoScheduleMonthly(bandes);
    // b1 a déjà une pesée → 1 seule création (b2)
    expect(created).toBe(1);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].payload.batch_id).toBe('b2');
  });
});
