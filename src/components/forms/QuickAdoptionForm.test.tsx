/**
 * Tests unitaires — QuickAdoptionForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 *
 * Couvre :
 *  [1] validateAddAdoption : payload happy path + clamps numériques.
 *  [2] no-self-adoption : bande source = destination → error.
 *  [3] capacité source : nb_porcelets > vivants → error.
 *  [4] insertAdoption appelle ajustement vivants source/destination
 *      (mock supabaseClient).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  validateAddAdoption,
  todayISO,
  ADOPTION_MOTIFS,
} from './quickAdoptionLogic';

describe('[1] validateAddAdoption · happy path', () => {
  it('payload normalisé avec tous les champs', () => {
    const r = validateAddAdoption({
      fromBatchId: 'B01',
      toBatchId: 'B02',
      nbPorcelets: '3',
      dateAdoption: '2026-05-01',
      motif: 'EQUILIBRAGE',
      notes: '  rééquilibrage portée  ',
      fromBatchVivants: 12,
    });
    expect(r.ok).toBe(true);
    expect(r.payload).toEqual({
      from_batch_id: 'B01',
      to_batch_id: 'B02',
      nb_porcelets: 3,
      date_adoption: '2026-05-01',
      motif: 'EQUILIBRAGE',
      notes: 'rééquilibrage portée',
    });
  });

  it('motif vide → null dans payload (autorisé)', () => {
    const r = validateAddAdoption({
      fromBatchId: 'B01',
      toBatchId: 'B02',
      nbPorcelets: 1,
      dateAdoption: '2026-05-01',
      motif: '',
      notes: '',
    });
    expect(r.ok).toBe(true);
    expect(r.payload?.motif).toBe(null);
  });
});

describe('[2] no-self-adoption', () => {
  it('rejette quand fromBatchId === toBatchId', () => {
    const r = validateAddAdoption({
      fromBatchId: 'B01',
      toBatchId: 'B01',
      nbPorcelets: 2,
      dateAdoption: '2026-05-01',
      motif: 'EQUILIBRAGE',
      notes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.toBatchId).toMatch(/identique/i);
  });
});

describe('[3] validation nb_porcelets', () => {
  it('rejette nb <= 0', () => {
    const r = validateAddAdoption({
      fromBatchId: 'B01',
      toBatchId: 'B02',
      nbPorcelets: 0,
      dateAdoption: '2026-05-01',
      motif: 'EQUILIBRAGE',
      notes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.nbPorcelets).toBeTruthy();
  });

  it('rejette nb > vivants source', () => {
    const r = validateAddAdoption({
      fromBatchId: 'B01',
      toBatchId: 'B02',
      nbPorcelets: 15,
      dateAdoption: '2026-05-01',
      motif: 'EQUILIBRAGE',
      notes: '',
      fromBatchVivants: 10,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.nbPorcelets).toMatch(/Max/i);
  });

  it('rejette date invalide', () => {
    const r = validateAddAdoption({
      fromBatchId: 'B01',
      toBatchId: 'B02',
      nbPorcelets: 1,
      dateAdoption: 'pas-une-date',
      motif: 'EQUILIBRAGE',
      notes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.dateAdoption).toBeTruthy();
  });
});

// ── [4] insertAdoption — mock supabaseClient pour vérifier ajustement vivants ─

const insertCalls: unknown[] = [];
const updateCalls: { batchId: string; vivants: number }[] = [];
const sessionUid = '00000000-0000-0000-0000-000000000001';

vi.mock('../../services/supabaseClient', () => {
  const auth = {
    getSession: async () => ({
      data: { session: { user: { id: sessionUid } } },
      error: null,
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function from(table: string): any {
    function makeQuery(boundId: string | null) {
      const q = {
        insert(payload: unknown) {
          insertCalls.push({ table, payload });
          return {
            select: () => ({
              single: async () => ({
                data: { id: 'adoption-uuid', ...(payload as object) },
                error: null,
              }),
            }),
          };
        },
        select(_: string) {
          return q;
        },
        eq(_col: string, val: string) {
          return makeQuery(val);
        },
        single: async () => {
          if (table === 'batches') {
            return { data: { porcelets_nes_vivants: 10 }, error: null };
          }
          return { data: null, error: null };
        },
        maybeSingle: async () => ({ data: null, error: null }),
        update(patch: Record<string, number>) {
          if (table === 'batches' && 'porcelets_nes_vivants' in patch) {
            return {
              eq: async (_col: string, batchId: string) => {
                updateCalls.push({
                  batchId,
                  vivants: patch.porcelets_nes_vivants,
                });
                return { error: null };
              },
            };
          }
          return {
            eq: async () => ({ error: null }),
          };
        },
        delete: () => ({
          eq: async () => ({ error: null }),
        }),
      };
      // Use boundId in update path: when single() is called after eq(),
      // the closure carries `boundId`. For batches read flow, this is enough.
      void boundId;
      return q;
    }
    return makeQuery(null);
  }
  return { supabase: { auth, from } };
});

beforeEach(() => {
  insertCalls.length = 0;
  updateCalls.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('[4] insertAdoption · ajustement vivants source/destination', () => {
  it('appelle update sur les deux bandes avec deltas inverses', async () => {
    const { insertAdoption } = await import('../../services/supabaseWrites');
    await insertAdoption({
      from_batch_id: 'batch-A',
      to_batch_id: 'batch-B',
      nb_porcelets: 4,
      date_adoption: '2026-05-01',
      motif: 'EQUILIBRAGE',
      notes: null,
      created_by: sessionUid,
    });
    // 1 insert dans adoptions
    expect(insertCalls.some(c => (c as { table: string }).table === 'adoptions')).toBe(true);
    // 2 updates batches : -4 et +4 sur la base 10 ⇒ 6 et 14
    expect(updateCalls).toEqual([
      { batchId: 'batch-A', vivants: 6 },
      { batchId: 'batch-B', vivants: 14 },
    ]);
  });

  it('rejette les bandes identiques avant tout appel réseau', async () => {
    const { insertAdoption } = await import('../../services/supabaseWrites');
    await expect(
      insertAdoption({
        from_batch_id: 'X',
        to_batch_id: 'X',
        nb_porcelets: 1,
        date_adoption: '2026-05-01',
        motif: null,
        notes: null,
        created_by: sessionUid,
      }),
    ).rejects.toThrow(/no_self_adoption/);
  });
});

describe('helpers', () => {
  it('todayISO retourne format YYYY-MM-DD', () => {
    const s = todayISO(new Date(2026, 4, 1));
    expect(s).toBe('2026-05-01');
  });

  it('ADOPTION_MOTIFS contient les 3 valeurs', () => {
    expect(ADOPTION_MOTIFS).toEqual([
      'EQUILIBRAGE',
      'TRUIE_INSUFFISANTE_LAIT',
      'AUTRE',
    ]);
  });
});
