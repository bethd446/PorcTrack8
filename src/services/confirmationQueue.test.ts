/**
 * Tests unitaires — confirmationQueue
 * ═══════════════════════════════════════
 * Couvre enqueueAlert / getPendingConfirmations / confirmAction / dismissAction.
 * Mock @capacitor/preferences (storage en mémoire) + supabaseWrites (helpers
 * d'écriture). On n'utilise PAS le vrai client Supabase ici.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FarmAlert, AlertAction } from './alertEngine';

// ── Storage mémoire pour Capacitor Preferences ──────────────────────────────
const memStore = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: memStore.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      memStore.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      memStore.delete(key);
    }),
  },
}));

// ── Spies sur supabaseWrites ────────────────────────────────────────────────
const updateBatchByCode = vi.fn(async () => ({ id: 'b-uuid' }));
const updateSowByCode = vi.fn(async () => ({ id: 's-uuid' }));
const insertBatch = vi.fn(async () => ({ id: 'b-uuid' }));
const insertNote = vi.fn(async () => ({ id: 'n-uuid' }));

vi.mock('./supabaseWrites', () => ({
  updateBatchByCode: (...args: unknown[]) => updateBatchByCode(...(args as [])),
  updateSowByCode: (...args: unknown[]) => updateSowByCode(...(args as [])),
  insertBatch: (...args: unknown[]) => insertBatch(...(args as [])),
  insertNote: (...args: unknown[]) => insertNote(...(args as [])),
}));

import {
  enqueueAlert,
  getPendingConfirmations,
  confirmAction,
  dismissAction,
  getPendingCount,
  getConfirmationHistory,
} from './confirmationQueue';

// ── Helpers de fabrication d'objets test ────────────────────────────────────
function makeAlert(overrides: Partial<FarmAlert> = {}): FarmAlert {
  return {
    id: 'alert-1',
    priority: 'HAUTE',
    category: 'REPRO',
    subjectId: 'T01',
    subjectLabel: 'Truie 01',
    title: 'Sevrage prévu',
    message: 'J+28 atteint',
    requiresAction: true,
    actions: [],
    createdAt: new Date('2026-05-01T08:00:00Z'),
    ...overrides,
  };
}

function makeAction(type: AlertAction['type'], payload: Record<string, unknown> = {}): AlertAction {
  return { type, label: type, payload };
}

beforeEach(() => {
  memStore.clear();
  updateBatchByCode.mockClear();
  updateSowByCode.mockClear();
  insertBatch.mockClear();
  insertNote.mockClear();
  // Restaure le comportement par défaut (resolve)
  updateBatchByCode.mockResolvedValue({ id: 'b-uuid' });
  updateSowByCode.mockResolvedValue({ id: 's-uuid' });
  insertBatch.mockResolvedValue({ id: 'b-uuid' });
  insertNote.mockResolvedValue({ id: 'n-uuid' });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('confirmationQueue.enqueueAlert', () => {
  it('enqueues a new pending item', async () => {
    const alert = makeAlert();
    const action = makeAction('CONFIRM_SEVRAGE', { idValue: 'B12' });
    await enqueueAlert(alert, action);
    const pending = await getPendingConfirmations();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('PENDING');
    expect(pending[0].alertId).toBe('alert-1');
    expect(pending[0].action.type).toBe('CONFIRM_SEVRAGE');
    expect(pending[0].id).toBe('alert-1-CONFIRM_SEVRAGE');
  });

  it('does not duplicate when same alert+action enqueued twice', async () => {
    const alert = makeAlert();
    const action = makeAction('CONFIRM_SEVRAGE');
    await enqueueAlert(alert, action);
    await enqueueAlert(alert, action);
    const pending = await getPendingConfirmations();
    expect(pending).toHaveLength(1);
  });

  it('allows different action types for same alert', async () => {
    const alert = makeAlert();
    await enqueueAlert(alert, makeAction('CONFIRM_SEVRAGE'));
    await enqueueAlert(alert, makeAction('DISMISS'));
    const pending = await getPendingConfirmations();
    expect(pending).toHaveLength(2);
  });
});

describe('confirmationQueue.getPendingConfirmations', () => {
  it('returns only PENDING items, not CONFIRMED/DISMISSED', async () => {
    const a1 = makeAlert({ id: 'A' });
    const a2 = makeAlert({ id: 'B' });
    await enqueueAlert(a1, makeAction('CONFIRM_REFORME', { idValue: 'T01' }));
    await enqueueAlert(a2, makeAction('CONFIRM_REFORME', { idValue: 'T02' }));

    const all = await getPendingConfirmations();
    await confirmAction(all[0].id);

    const pending = await getPendingConfirmations();
    expect(pending).toHaveLength(1);
    expect(pending[0].alertId).toBe('B');
  });

  it('returns empty list when queue is empty', async () => {
    const pending = await getPendingConfirmations();
    expect(pending).toEqual([]);
  });
});

describe('confirmationQueue.confirmAction — CONFIRM_SEVRAGE', () => {
  it('updates batch by code and secondary truie update', async () => {
    const alert = makeAlert({ id: 'sev-1' });
    const action = makeAction('CONFIRM_SEVRAGE', {
      idValue: 'B12',
      patch: {
        DATE_SEVRAGE_REELLE: '2026-05-01',
        STATUT: 'Sevrés',
      },
      truieUpdate: {
        sheet: 'sows',
        idValue: 'T01',
        patch: { STATUT: 'En attente saillie' },
      },
    });
    await enqueueAlert(alert, action);
    const [pending] = await getPendingConfirmations();
    const result = await confirmAction(pending.id);

    expect(result.success).toBe(true);
    expect(updateBatchByCode).toHaveBeenCalledTimes(1);
    expect(updateBatchByCode).toHaveBeenCalledWith(
      'B12',
      expect.objectContaining({
        date_sevrage: '2026-05-01',
        statut: 'Sevrés',
      }),
    );
    expect(updateSowByCode).toHaveBeenCalledTimes(1);
    expect(updateSowByCode).toHaveBeenCalledWith(
      'T01',
      expect.objectContaining({ statut: 'En attente saillie' }),
    );

    // L'item est passé à CONFIRMED
    const history = await getConfirmationHistory();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('CONFIRMED');
    expect(history[0].resolvedAt).toBeDefined();
  });

  it('passes the user note to updateBatchByCode patch', async () => {
    const alert = makeAlert({ id: 'sev-2' });
    await enqueueAlert(
      alert,
      makeAction('CONFIRM_SEVRAGE', { idValue: 'B12', patch: {} }),
    );
    const [pending] = await getPendingConfirmations();
    await confirmAction(pending.id, 'Tout va bien');
    expect(updateBatchByCode).toHaveBeenCalledWith(
      'B12',
      expect.objectContaining({ notes: 'Tout va bien' }),
    );
  });
});

describe('confirmationQueue.confirmAction — CONFIRM_REFORME', () => {
  it('updates sow by code with statut Réforme', async () => {
    const alert = makeAlert({ id: 'ref-1' });
    const action = makeAction('CONFIRM_REFORME', {
      idValue: 'T05',
      patch: { STATUT: 'Réforme' },
    });
    await enqueueAlert(alert, action);
    const [pending] = await getPendingConfirmations();
    const result = await confirmAction(pending.id);

    expect(result.success).toBe(true);
    expect(updateSowByCode).toHaveBeenCalledWith(
      'T05',
      expect.objectContaining({ statut: 'Réforme' }),
    );
  });

  it('uses default STATUT=Réforme if patch is missing', async () => {
    const alert = makeAlert({ id: 'ref-2' });
    const action = makeAction('CONFIRM_REFORME', { idValue: 'T06' });
    await enqueueAlert(alert, action);
    const [pending] = await getPendingConfirmations();
    await confirmAction(pending.id);
    expect(updateSowByCode).toHaveBeenCalledWith(
      'T06',
      expect.objectContaining({ statut: 'Réforme' }),
    );
  });
});

describe('confirmationQueue.confirmAction — error handling', () => {
  it('marks item as FAILED when update throws', async () => {
    updateSowByCode.mockRejectedValueOnce(new Error('Supabase 500'));
    const alert = makeAlert({ id: 'fail-1' });
    await enqueueAlert(
      alert,
      makeAction('CONFIRM_REFORME', { idValue: 'T07' }),
    );
    const [pending] = await getPendingConfirmations();
    const result = await confirmAction(pending.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Supabase 500');

    const history = await getConfirmationHistory();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('FAILED');
    expect(history[0].error).toBe('Supabase 500');
  });

  it('returns error when itemId not found', async () => {
    const result = await confirmAction('nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Action introuvable');
  });

  it('returns error when item is not PENDING anymore', async () => {
    const alert = makeAlert({ id: 'twice' });
    await enqueueAlert(alert, makeAction('CONFIRM_REFORME', { idValue: 'T01' }));
    const [pending] = await getPendingConfirmations();
    await confirmAction(pending.id);
    const second = await confirmAction(pending.id);
    expect(second.success).toBe(false);
    expect(second.error).toBe('Action déjà traitée');
  });
});

describe('confirmationQueue.dismissAction', () => {
  it('marks pending item as DISMISSED', async () => {
    const alert = makeAlert({ id: 'dis-1' });
    await enqueueAlert(alert, makeAction('CONFIRM_REFORME', { idValue: 'T01' }));
    const [pending] = await getPendingConfirmations();
    await dismissAction(pending.id, 'Pas pertinent');

    const stillPending = await getPendingConfirmations();
    expect(stillPending).toHaveLength(0);

    const history = await getConfirmationHistory();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('DISMISSED');
    expect(history[0].note).toBe('Pas pertinent');
    expect(updateSowByCode).not.toHaveBeenCalled();
  });

  it('is a no-op for unknown id', async () => {
    await expect(dismissAction('nope')).resolves.toBeUndefined();
  });
});

describe('confirmationQueue.getPendingCount', () => {
  it('returns the number of pending items', async () => {
    expect(await getPendingCount()).toBe(0);
    await enqueueAlert(makeAlert({ id: 'a' }), makeAction('CONFIRM_REFORME'));
    await enqueueAlert(makeAlert({ id: 'b' }), makeAction('CONFIRM_REFORME'));
    expect(await getPendingCount()).toBe(2);
  });
});
