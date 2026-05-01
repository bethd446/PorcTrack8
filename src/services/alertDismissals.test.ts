/**
 * Tests unitaires — alertDismissals
 * ═══════════════════════════════════
 * Couvre dismissAlert / fetchDismissedAlertIds / undismissAlert.
 * Mock du client Supabase via builder chaînable minimaliste.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface InsertCall {
  table: string;
  payload: Record<string, unknown>;
}

interface SelectFilter {
  col: string;
  op: 'eq' | 'gt';
  value: unknown;
}

interface SelectCall {
  table: string;
  columns: string;
  filters: SelectFilter[];
}

interface DeleteCall {
  table: string;
  filters: SelectFilter[];
}

const insertCalls: InsertCall[] = [];
const selectCalls: SelectCall[] = [];
const deleteCalls: DeleteCall[] = [];

let nextInsertResult: { error: { message: string } | null } = { error: null };
let nextSelectResult: { data: Array<{ alert_id: string }> | null; error: { message: string } | null } = {
  data: [],
  error: null,
};
let nextDeleteResult: { error: { message: string } | null } = { error: null };

function makeBuilder(table: string) {
  let currentSelect: SelectCall | null = null;
  let currentDelete: DeleteCall | null = null;
  let mode: 'idle' | 'select' | 'delete' = 'idle';

  // Chain "thenable" : permet à la fois `.eq().eq()` ET `await chain` (pour delete).
  const chain: {
    eq: (col: string, value: unknown) => typeof chain;
    gt: (col: string, value: unknown) => Promise<typeof nextSelectResult>;
    then: (resolve: (v: typeof nextDeleteResult) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>;
  } = {
    eq: (col, value) => {
      if (mode === 'select' && currentSelect) currentSelect.filters.push({ col, op: 'eq', value });
      if (mode === 'delete' && currentDelete) currentDelete.filters.push({ col, op: 'eq', value });
      return chain;
    },
    gt: (col, value) => {
      if (mode === 'select' && currentSelect) currentSelect.filters.push({ col, op: 'gt', value });
      return Promise.resolve(nextSelectResult);
    },
    then: (resolve, reject) => Promise.resolve(nextDeleteResult).then(resolve, reject),
  };

  const builder = {
    insert: (payload: Record<string, unknown>) => {
      insertCalls.push({ table, payload });
      return Promise.resolve(nextInsertResult);
    },
    select: (columns: string) => {
      currentSelect = { table, columns, filters: [] };
      mode = 'select';
      selectCalls.push(currentSelect);
      return chain;
    },
    delete: () => {
      currentDelete = { table, filters: [] };
      mode = 'delete';
      deleteCalls.push(currentDelete);
      return chain;
    },
  };

  return builder;
}

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => makeBuilder(table),
  },
}));

import { dismissAlert, fetchDismissedAlertIds, undismissAlert } from './alertDismissals';

beforeEach(() => {
  insertCalls.length = 0;
  selectCalls.length = 0;
  deleteCalls.length = 0;
  nextInsertResult = { error: null };
  nextSelectResult = { data: [], error: null };
  nextDeleteResult = { error: null };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('alertDismissals.dismissAlert', () => {
  it('inserts row with user_id, alert_id, dismissed_by and reason', async () => {
    await dismissAlert('user-123', 'alert-abc', 'doublon');
    expect(insertCalls).toHaveLength(1);
    const [call] = insertCalls;
    expect(call.table).toBe('alert_dismissals');
    expect(call.payload).toMatchObject({
      user_id: 'user-123',
      alert_id: 'alert-abc',
      dismissed_by: 'user-123',
      reason: 'doublon',
    });
  });

  it('inserts row without reason when omitted', async () => {
    await dismissAlert('user-1', 'alert-2');
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].payload).toMatchObject({
      user_id: 'user-1',
      alert_id: 'alert-2',
      dismissed_by: 'user-1',
    });
    expect(insertCalls[0].payload.reason).toBeUndefined();
  });

  it('throws when supabase returns an error', async () => {
    nextInsertResult = { error: { message: 'RLS denied' } };
    await expect(dismissAlert('u', 'a')).rejects.toMatchObject({ message: 'RLS denied' });
  });
});

describe('alertDismissals.fetchDismissedAlertIds', () => {
  it('returns Set of alert_ids filtered by user and expires_at > now', async () => {
    nextSelectResult = {
      data: [{ alert_id: 'a1' }, { alert_id: 'a2' }, { alert_id: 'a3' }],
      error: null,
    };
    const result = await fetchDismissedAlertIds('user-x');
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(3);
    expect(result.has('a1')).toBe(true);
    expect(result.has('a3')).toBe(true);

    expect(selectCalls).toHaveLength(1);
    const call = selectCalls[0];
    expect(call.table).toBe('alert_dismissals');
    expect(call.columns).toBe('alert_id');
    const eqUser = call.filters.find((f) => f.op === 'eq' && f.col === 'user_id');
    const gtExpires = call.filters.find((f) => f.op === 'gt' && f.col === 'expires_at');
    expect(eqUser?.value).toBe('user-x');
    expect(typeof gtExpires?.value).toBe('string');
    expect(() => new Date(gtExpires?.value as string).toISOString()).not.toThrow();
  });

  it('returns empty Set when supabase returns error (no crash)', async () => {
    nextSelectResult = { data: null, error: { message: 'network down' } };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = await fetchDismissedAlertIds('user-x');
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
    warn.mockRestore();
  });

  it('returns empty Set when data is null without error', async () => {
    nextSelectResult = { data: null, error: null };
    const result = await fetchDismissedAlertIds('user-x');
    expect(result.size).toBe(0);
  });
});

describe('alertDismissals.undismissAlert', () => {
  it('deletes row matching user_id and alert_id', async () => {
    await undismissAlert('user-9', 'alert-Z');
    expect(deleteCalls).toHaveLength(1);
    const call = deleteCalls[0];
    expect(call.table).toBe('alert_dismissals');
    const userFilter = call.filters.find((f) => f.col === 'user_id');
    const alertFilter = call.filters.find((f) => f.col === 'alert_id');
    expect(userFilter?.value).toBe('user-9');
    expect(alertFilter?.value).toBe('alert-Z');
  });

  it('does not throw when supabase returns error (best-effort)', async () => {
    nextDeleteResult = { error: { message: 'not found' } };
    await expect(undismissAlert('u', 'a')).resolves.toBeUndefined();
  });
});
