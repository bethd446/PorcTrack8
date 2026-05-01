/**
 * Tests unitaires — validationWorkflow (V21-7)
 * ═══════════════════════════════════════════════════════════════════════
 * Couvre getDefaultValidationStatus, validateAction, rejectAction,
 * getPendingValidations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface UpdateCall {
  table: string;
  patch: Record<string, unknown>;
  id: string;
}

interface SelectCall {
  table: string;
  columns: string;
  status?: string;
}

const updateCalls: UpdateCall[] = [];
const selectCalls: SelectCall[] = [];

let nextUpdateError: { message: string } | null = null;
let nextSelectByTable: Record<string, { data: unknown[] | null; error: { message: string } | null }> = {};

function makeBuilder(table: string) {
  let currentSelect: SelectCall | null = null;
  let currentUpdate: UpdateCall | null = null;
  let mode: 'idle' | 'select' | 'update' = 'idle';

  const chain = {
    update(patch: Record<string, unknown>) {
      mode = 'update';
      currentUpdate = { table, patch, id: '' };
      return chain;
    },
    select(columns: string) {
      mode = 'select';
      currentSelect = { table, columns };
      return chain;
    },
    eq(col: string, value: unknown) {
      if (mode === 'update' && currentUpdate && col === 'id') {
        currentUpdate.id = String(value);
        updateCalls.push(currentUpdate);
        return Promise.resolve({ error: nextUpdateError });
      }
      if (mode === 'select' && currentSelect && col === 'validation_status') {
        currentSelect.status = String(value);
      }
      return chain;
    },
    order() {
      return chain;
    },
    then(resolve: (v: unknown) => unknown) {
      if (mode === 'select' && currentSelect) {
        selectCalls.push(currentSelect);
        const result = nextSelectByTable[table] ?? { data: [], error: null };
        return Promise.resolve(result).then(resolve);
      }
      return Promise.resolve({ data: [], error: null }).then(resolve);
    },
  };

  return chain;
}

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => makeBuilder(table),
  },
  isSupabaseConfigured: true,
}));

const {
  getDefaultValidationStatus,
  validateAction,
  rejectAction,
  getPendingValidations,
} = await import('./validationWorkflow');

beforeEach(() => {
  updateCalls.length = 0;
  selectCalls.length = 0;
  nextUpdateError = null;
  nextSelectByTable = {};
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getDefaultValidationStatus', () => {
  it('renvoie PENDING pour role WORKER', () => {
    expect(getDefaultValidationStatus('WORKER')).toBe('PENDING');
  });

  it('renvoie PENDING pour role PORCHER (legacy)', () => {
    expect(getDefaultValidationStatus('PORCHER')).toBe('PENDING');
  });

  it('renvoie VALIDATED pour role OWNER', () => {
    expect(getDefaultValidationStatus('OWNER')).toBe('VALIDATED');
  });

  it('renvoie VALIDATED pour role ADMIN', () => {
    expect(getDefaultValidationStatus('ADMIN')).toBe('VALIDATED');
  });

  it('renvoie VALIDATED pour role inconnu/null', () => {
    expect(getDefaultValidationStatus(null)).toBe('VALIDATED');
    expect(getDefaultValidationStatus(undefined)).toBe('VALIDATED');
  });
});

describe('validateAction', () => {
  it('update validation_status, validated_by, validated_at sur la table cible', async () => {
    await validateAction('health_logs', 'hl-1', 'admin-uuid');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].table).toBe('health_logs');
    expect(updateCalls[0].id).toBe('hl-1');
    expect(updateCalls[0].patch.validation_status).toBe('VALIDATED');
    expect(updateCalls[0].patch.validated_by).toBe('admin-uuid');
    expect(typeof updateCalls[0].patch.validated_at).toBe('string');
  });

  it('throw si table/id/approverId manquants', async () => {
    await expect(validateAction('' as unknown as 'health_logs', 'id', 'admin')).rejects.toThrow();
    await expect(validateAction('health_logs', '', 'admin')).rejects.toThrow();
    await expect(validateAction('health_logs', 'id', '')).rejects.toThrow();
  });

  it('throw si supabase renvoie une erreur', async () => {
    nextUpdateError = { message: 'RLS denied' };
    await expect(validateAction('finances', 'f-1', 'admin')).rejects.toThrow(/RLS denied/);
  });
});

describe('rejectAction', () => {
  it('update statut REJECTED + ajoute la raison aux notes', async () => {
    await rejectAction('batches', 'b-1', 'admin-uuid', 'erreur saisie');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].patch.validation_status).toBe('REJECTED');
    expect(updateCalls[0].patch.notes).toBe('[REJET] erreur saisie');
  });

  it('fonctionne sans raison fournie', async () => {
    await rejectAction('batches', 'b-2', 'admin-uuid');
    expect(updateCalls[0].patch.validation_status).toBe('REJECTED');
    expect(updateCalls[0].patch.notes).toBeUndefined();
  });
});

describe('getPendingValidations', () => {
  it('renvoie tableau vide quand aucune table n\'a de pending', async () => {
    const res = await getPendingValidations();
    expect(res).toEqual([]);
  });

  it('agrège health_logs / batches / finances pending et trie par date desc', async () => {
    nextSelectByTable = {
      health_logs: {
        data: [{
          id: 'hl-1',
          log_type: 'MORTALITE',
          animal_code: 'B26',
          affected_animals: 2,
          notes: 'Diarrhée',
          operator: 'Marc',
          created_at: '2026-05-01T10:00:00Z',
        }],
        error: null,
      },
      batches: {
        data: [{
          id: 'b-1',
          code_id: 'B27',
          notes: 'Vente',
          created_at: '2026-05-01T08:00:00Z',
          porcelets_nes_vivants: 10,
        }],
        error: null,
      },
      finances: {
        data: [{
          id: 'f-1',
          poste: 'Vente 12 porcs',
          type: 'REVENU',
          mensuel_fcfa: 1500000,
          notes: null,
          created_at: '2026-05-01T11:00:00Z',
        }],
        error: null,
      },
    };

    const res = await getPendingValidations();
    expect(res).toHaveLength(3);
    // Tri date desc
    expect(res[0].id).toBe('f-1');
    expect(res[1].id).toBe('hl-1');
    expect(res[2].id).toBe('b-1');
    // Type classifié correctement
    const hl = res.find((r) => r.id === 'hl-1')!;
    expect(hl.type).toBe('MORTALITE');
    const fin = res.find((r) => r.id === 'f-1')!;
    expect(fin.type).toBe('VENTE');
  });
});
