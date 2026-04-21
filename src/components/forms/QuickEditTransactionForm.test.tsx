/**
 * Tests unitaires — QuickEditTransactionForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   [1] render — transactionToDraft convertit dd/MM/yyyy → yyyy-MM-dd.
 *   [2] validation — montant négatif rejeté, libellé vide rejeté, notes > 200.
 *   [3] submit update — enqueueUpdateRow appelé avec sheet FINANCES + id.
 *   [4] offline queue — appel même sans navigator.onLine.
 *   [5] patch partiel — seuls les champs modifiés sont envoyés.
 *   [6] conversion date → dd/MM/yyyy dans le patch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  validateEditTransaction,
  buildEditPatch,
  transactionToDraft,
  frToIsoDate,
  type EditTransactionDraft,
  type EditTransactionPatch,
} from './QuickEditTransactionForm';
import type { FinanceEntry } from '../../types/farm';
import type { SheetCell } from '../../services/offlineQueue';

// ── Mock global de offlineQueue ─────────────────────────────────────────────
type EnqueueUpdateRowArgs = [
  sheet: string,
  idHeader: string,
  idValue: string,
  patch: Record<string, SheetCell>,
];
const enqueueUpdateRowMock = vi.fn<(...args: EnqueueUpdateRowArgs) => Promise<void>>(
  async () => undefined,
);
vi.mock('../../services/offlineQueue', () => ({
  enqueueUpdateRow: (...args: EnqueueUpdateRowArgs) => enqueueUpdateRowMock(...args),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────
function makeTx(overrides: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    date: '15/04/2026',
    categorie: 'ALIMENT',
    libelle: 'Sac aliment',
    montant: 18500,
    type: 'DEPENSE',
    notes: '',
    ...overrides,
  };
}

function makeDraft(overrides: Partial<EditTransactionDraft> = {}): EditTransactionDraft {
  return {
    date: '2026-04-15',
    type: 'DEPENSE',
    categorie: 'ALIMENT',
    libelle: 'Sac aliment',
    montant: '18500',
    bandeId: '',
    notes: '',
    ...overrides,
  };
}

// Mirror du submit composant pour tests node.
async function submitEdit(
  input: EditTransactionDraft,
  initial: EditTransactionDraft,
  id: string,
  refreshData: () => Promise<void>,
): Promise<{ ok: boolean; patch?: EditTransactionPatch; errors?: Record<string, string> }> {
  const v = validateEditTransaction(input, initial);
  if (!v.ok || !v.patch) {
    return { ok: false, errors: v.errors };
  }
  if (Object.keys(v.patch).length === 0) {
    return { ok: true, patch: {} };
  }
  const { enqueueUpdateRow } = await import('../../services/offlineQueue');
  await enqueueUpdateRow('FINANCES', 'ID', id, v.patch);
  await refreshData();
  return { ok: true, patch: v.patch };
}

beforeEach(() => {
  enqueueUpdateRowMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// [1] Render — transactionToDraft
// ═══════════════════════════════════════════════════════════════════════════

describe('[1] render — transactionToDraft & frToIsoDate', () => {
  it('convertit une FinanceEntry dd/MM/yyyy en draft ISO yyyy-MM-dd', () => {
    const tx = makeTx({ date: '15/04/2026', montant: 18500 });
    const draft = transactionToDraft(tx);
    expect(draft.date).toBe('2026-04-15');
    expect(draft.categorie).toBe('ALIMENT');
    expect(draft.libelle).toBe('Sac aliment');
    expect(draft.montant).toBe('18500');
    expect(draft.type).toBe('DEPENSE');
  });

  it('frToIsoDate tolère ISO et vide', () => {
    expect(frToIsoDate('')).toBe('');
    expect(frToIsoDate(undefined)).toBe('');
    expect(frToIsoDate('2026-04-15')).toBe('2026-04-15');
    expect(frToIsoDate('1/4/2026')).toBe('2026-04-01');
  });

  it('montant 0 → string vide dans draft (rejetée par validation ensuite)', () => {
    const draft = transactionToDraft(makeTx({ montant: 0 }));
    expect(draft.montant).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [2] Validation
// ═══════════════════════════════════════════════════════════════════════════

describe('[2] validation', () => {
  const initial = makeDraft();

  it('montant négatif → erreur', () => {
    const v = validateEditTransaction(
      makeDraft({ montant: '-500' }),
      initial,
    );
    expect(v.ok).toBe(false);
    expect(v.errors.montant).toBeTruthy();
  });

  it('montant = 0 → erreur', () => {
    const v = validateEditTransaction(
      makeDraft({ montant: '0' }),
      initial,
    );
    expect(v.ok).toBe(false);
    expect(v.errors.montant).toBeTruthy();
  });

  it('libellé vide → erreur', () => {
    const v = validateEditTransaction(
      makeDraft({ libelle: '' }),
      initial,
    );
    expect(v.ok).toBe(false);
    expect(v.errors.libelle).toBeTruthy();
  });

  it('notes > 200 → erreur', () => {
    const v = validateEditTransaction(
      makeDraft({ notes: 'z'.repeat(201) }),
      initial,
    );
    expect(v.ok).toBe(false);
    expect(v.errors.notes).toBeTruthy();
  });

  it('date invalide → erreur', () => {
    const v = validateEditTransaction(
      makeDraft({ date: '15/04/2026' }),
      initial,
    );
    expect(v.ok).toBe(false);
    expect(v.errors.date).toBeTruthy();
  });

  it('aucune modification → ok + patch vide', () => {
    const v = validateEditTransaction(initial, initial);
    expect(v.ok).toBe(true);
    expect(v.patch).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [3] Submit → enqueueUpdateRow (sheet + id corrects)
// ═══════════════════════════════════════════════════════════════════════════

describe('[3] submit → enqueueUpdateRow', () => {
  it('appelle enqueueUpdateRow avec FINANCES/ID/id + patch complet', async () => {
    const initial = makeDraft();
    const input = makeDraft({
      libelle: 'Sac aliment v2',
      montant: '22000',
      categorie: 'VETO',
      type: 'REVENU',
      bandeId: 'P-2026-03',
      notes: 'correction',
    });
    const refreshData = vi.fn(async () => undefined);
    const out = await submitEdit(input, initial, 'FIN-2026-042', refreshData);

    expect(out.ok).toBe(true);
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    const [sheet, idHeader, idValue, patch] = enqueueUpdateRowMock.mock.calls[0];
    expect(sheet).toBe('FINANCES');
    expect(idHeader).toBe('ID');
    expect(idValue).toBe('FIN-2026-042');

    expect(patch.LIBELLE).toBe('Sac aliment v2');
    expect(patch.MONTANT).toBe(22000);
    expect(patch.CATEGORIE).toBe('VETO');
    expect(patch.TYPE).toBe('REVENU');
    expect(patch.BANDE_ID).toBe('P-2026-03');
    expect(patch.NOTES).toBe('correction');
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('submit invalide → pas d\'enqueue', async () => {
    const initial = makeDraft();
    const refreshData = vi.fn(async () => undefined);
    const out = await submitEdit(
      makeDraft({ libelle: '', montant: '-2' }),
      initial,
      'FIN-999',
      refreshData,
    );
    expect(out.ok).toBe(false);
    expect(enqueueUpdateRowMock).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [4] Offline queue
// ═══════════════════════════════════════════════════════════════════════════

describe('[4] offline queue — indépendante de navigator.onLine', () => {
  it('enqueueUpdateRow est appelée même offline (la queue gère la persistance)', async () => {
    // Simule offline via vi.stubGlobal (pas d'impact sur l'appel à enqueue)
    vi.stubGlobal('navigator', { onLine: false });
    const initial = makeDraft();
    const input = makeDraft({ montant: '19000' });
    const refreshData = vi.fn(async () => undefined);
    const out = await submitEdit(input, initial, 'FIN-1', refreshData);

    expect(out.ok).toBe(true);
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('patch vide → pas d\'enqueue (rien à faire)', async () => {
    const initial = makeDraft();
    const refreshData = vi.fn(async () => undefined);
    const out = await submitEdit(initial, initial, 'FIN-1', refreshData);
    expect(out.ok).toBe(true);
    expect(out.patch).toEqual({});
    expect(enqueueUpdateRowMock).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [5] Patch partiel — uniquement les champs modifiés
// ═══════════════════════════════════════════════════════════════════════════

describe('[5] patch partiel', () => {
  it('seul le montant modifié → patch = { MONTANT }', () => {
    const initial = makeDraft();
    const input = makeDraft({ montant: '25000' });
    const patch = buildEditPatch(input, initial);
    expect(patch).toEqual({ MONTANT: 25000 });
  });

  it('seul le libellé modifié → patch = { LIBELLE }', () => {
    const initial = makeDraft();
    const input = makeDraft({ libelle: 'Nouveau libellé' });
    const patch = buildEditPatch(input, initial);
    expect(patch).toEqual({ LIBELLE: 'Nouveau libellé' });
  });

  it('seul le type modifié → patch = { TYPE }', () => {
    const initial = makeDraft({ type: 'DEPENSE' });
    const input = makeDraft({ type: 'REVENU' });
    const patch = buildEditPatch(input, initial);
    expect(patch).toEqual({ TYPE: 'REVENU' });
  });

  it('plusieurs champs modifiés → tous présents, les autres absents', () => {
    const initial = makeDraft();
    const input = makeDraft({
      libelle: 'Corrigé',
      bandeId: 'P-42',
    });
    const patch = buildEditPatch(input, initial);
    expect(patch).toEqual({
      LIBELLE: 'Corrigé',
      BANDE_ID: 'P-42',
    });
    expect(patch).not.toHaveProperty('MONTANT');
    expect(patch).not.toHaveProperty('DATE');
    expect(patch).not.toHaveProperty('TYPE');
  });

  it('notes avec trim → patch utilise la version trimée', () => {
    const initial = makeDraft({ notes: '' });
    const input = makeDraft({ notes: '  ref facture  ' });
    const patch = buildEditPatch(input, initial);
    expect(patch).toEqual({ NOTES: 'ref facture' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [6] Conversion date → dd/MM/yyyy dans le patch
// ═══════════════════════════════════════════════════════════════════════════

describe('[6] conversion date pour Sheets GAS', () => {
  it('date modifiée → patch.DATE au format dd/MM/yyyy', () => {
    const initial = makeDraft({ date: '2026-04-15' });
    const input = makeDraft({ date: '2026-05-01' });
    const patch = buildEditPatch(input, initial);
    expect(patch?.DATE).toBe('01/05/2026');
  });

  it('date identique → DATE absente du patch', () => {
    const initial = makeDraft({ date: '2026-04-15' });
    const input = makeDraft({ date: '2026-04-15' });
    const patch = buildEditPatch(input, initial);
    expect(patch).not.toHaveProperty('DATE');
  });
});
