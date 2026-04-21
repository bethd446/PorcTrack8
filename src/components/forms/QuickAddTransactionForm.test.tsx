/**
 * Tests unitaires — QuickAddTransactionForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   [1] render — constantes CATEGORIES/TYPES, valeurs par défaut du draft
 *       via todayIso + isoToFrDate.
 *   [2] validation — libellé vide rejeté, montant négatif / zéro rejeté,
 *       date invalide rejetée, notes > 200 rejeté.
 *   [3] submit → enqueueAppendRow avec sheet + row dans l'ordre canonique.
 *   [4] offline queue — pas d'appel si validation échoue ; pas de refresh.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  validateAddTransaction,
  buildAddTransactionRow,
  isoToFrDate,
  todayIso,
  CATEGORIES,
  TYPES,
  type AddTransactionDraft,
} from './QuickAddTransactionForm';
import type { SheetCell } from '../../services/offlineQueue';

// ── Mock global de offlineQueue ─────────────────────────────────────────────
type EnqueueAppendRowArgs = [sheet: string, values: SheetCell[]];
const enqueueAppendRowMock = vi.fn<(...args: EnqueueAppendRowArgs) => Promise<void>>(
  async () => undefined,
);
vi.mock('../../services/offlineQueue', () => ({
  enqueueAppendRow: (...args: EnqueueAppendRowArgs) => enqueueAppendRowMock(...args),
}));

// Mirror du submit du composant pour tests node (sans React).
async function submitAddTransaction(draft: AddTransactionDraft & {
  refreshData: () => Promise<void>;
}): Promise<{ ok: boolean; errors?: Record<string, string> }> {
  const v = validateAddTransaction({
    date: draft.date,
    type: draft.type,
    categorie: draft.categorie,
    libelle: draft.libelle,
    montant: draft.montant,
    bandeId: draft.bandeId,
    notes: draft.notes,
  });
  if (!v.ok || !v.row) {
    return { ok: false, errors: v.errors };
  }
  const { enqueueAppendRow } = await import('../../services/offlineQueue');
  await enqueueAppendRow('FINANCES', v.row);
  await draft.refreshData();
  return { ok: true };
}

const baseDraft: AddTransactionDraft = {
  date: '2026-04-19',
  type: 'DEPENSE',
  categorie: 'ALIMENT',
  libelle: 'Sac croissance 50kg',
  montant: '18500',
  bandeId: '',
  notes: '',
};

beforeEach(() => {
  enqueueAppendRowMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// [1] Render / constantes
// ═══════════════════════════════════════════════════════════════════════════

describe('[1] render — constantes & defaults', () => {
  it('expose 8 catégories canoniques', () => {
    expect(CATEGORIES).toEqual([
      'ALIMENT',
      'VETO',
      'VETERINAIRE',
      'MAIN_OEUVRE',
      'MAINTENANCE',
      'VENTE_PORCS',
      'VENTE_AUTRE',
      'AUTRE',
    ]);
  });

  it('expose TYPES = [REVENU, DEPENSE]', () => {
    expect(TYPES).toEqual(['REVENU', 'DEPENSE']);
  });

  it('todayIso() renvoie un format yyyy-MM-dd valide', () => {
    const iso = todayIso(new Date(2026, 3, 19)); // 19 avril 2026
    expect(iso).toBe('2026-04-19');
  });

  it('isoToFrDate convertit bien en dd/MM/yyyy', () => {
    expect(isoToFrDate('2026-04-19')).toBe('19/04/2026');
    expect(isoToFrDate('')).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [2] Validation — règles critiques
// ═══════════════════════════════════════════════════════════════════════════

describe('[2] validation', () => {
  it('libellé vide → erreur', () => {
    const v = validateAddTransaction({ ...baseDraft, libelle: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.libelle).toBeTruthy();
  });

  it('libellé whitespace → erreur', () => {
    const v = validateAddTransaction({ ...baseDraft, libelle: '   ' });
    expect(v.ok).toBe(false);
    expect(v.errors.libelle).toBeTruthy();
  });

  it('montant négatif → erreur', () => {
    const v = validateAddTransaction({ ...baseDraft, montant: '-100' });
    expect(v.ok).toBe(false);
    expect(v.errors.montant).toBeTruthy();
  });

  it('montant = 0 → erreur (doit être strictement positif)', () => {
    const v = validateAddTransaction({ ...baseDraft, montant: '0' });
    expect(v.ok).toBe(false);
    expect(v.errors.montant).toBeTruthy();
  });

  it('montant vide → erreur', () => {
    const v = validateAddTransaction({ ...baseDraft, montant: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.montant).toBeTruthy();
  });

  it('date vide → erreur', () => {
    const v = validateAddTransaction({ ...baseDraft, date: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.date).toBeTruthy();
  });

  it('date format dd/MM/yyyy rejetée (input attend ISO)', () => {
    const v = validateAddTransaction({ ...baseDraft, date: '19/04/2026' });
    expect(v.ok).toBe(false);
    expect(v.errors.date).toBeTruthy();
  });

  it('notes > 200 → erreur', () => {
    const v = validateAddTransaction({ ...baseDraft, notes: 'x'.repeat(201) });
    expect(v.ok).toBe(false);
    expect(v.errors.notes).toBeTruthy();
  });

  it('montant accepte virgule décimale FR', () => {
    const v = validateAddTransaction({ ...baseDraft, montant: '18500,50' });
    expect(v.ok).toBe(true);
    // row[3] = MONTANT
    expect(v.row?.[3]).toBe(18500.5);
  });

  it('draft valide → ok', () => {
    const v = validateAddTransaction(baseDraft);
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [3] Submit → enqueueAppendRow (ordre canonique)
// ═══════════════════════════════════════════════════════════════════════════

describe('[3] submit → enqueueAppendRow', () => {
  it('appelle enqueueAppendRow avec sheet FINANCES et row canonique', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddTransaction({
      ...baseDraft,
      date: '2026-04-19',
      type: 'REVENU',
      categorie: 'VENTE_PORCS',
      libelle: 'Vente 12 porcs engraissés',
      montant: '480000',
      bandeId: 'P-2026-01',
      notes: 'Facture F-2026-042',
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(enqueueAppendRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueAppendRowMock).toHaveBeenCalledWith(
      'FINANCES',
      [
        '19/04/2026',                   // DATE (dd/MM/yyyy)
        'VENTE_PORCS',                  // CATEGORIE
        'Vente 12 porcs engraissés',    // LIBELLE
        480000,                         // MONTANT
        'REVENU',                       // TYPE
        'P-2026-01',                    // BANDE_ID
        'Facture F-2026-042',           // NOTES
      ],
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('libellé trimé dans la row finale', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddTransaction({
      ...baseDraft,
      libelle: '  Achat veto  ',
      refreshData,
    });
    expect(out.ok).toBe(true);
    const call = enqueueAppendRowMock.mock.calls[0];
    expect(call[1][2]).toBe('Achat veto');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [4] Offline queue & cas dégénérés
// ═══════════════════════════════════════════════════════════════════════════

describe('[4] offline queue / buildAddTransactionRow', () => {
  it('submit invalide → pas d\'enqueue, pas de refresh (queue offline n\'est PAS sollicitée)', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddTransaction({
      ...baseDraft,
      libelle: '',
      montant: '-5',
      refreshData,
    });
    expect(out.ok).toBe(false);
    expect(out.errors?.libelle).toBeTruthy();
    expect(out.errors?.montant).toBeTruthy();
    expect(enqueueAppendRowMock).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });

  it('enqueueAppendRow est appelée une seule fois (queue ajoute en FIFO)', async () => {
    const refreshData = vi.fn(async () => undefined);
    await submitAddTransaction({ ...baseDraft, refreshData });
    await submitAddTransaction({
      ...baseDraft,
      libelle: 'Autre dépense',
      refreshData,
    });
    expect(enqueueAppendRowMock).toHaveBeenCalledTimes(2);
  });

  it('buildAddTransactionRow renvoie null si invalide', () => {
    expect(
      buildAddTransactionRow({
        date: '',
        type: 'DEPENSE',
        categorie: 'ALIMENT',
        libelle: '',
        montant: '',
        bandeId: '',
        notes: '',
      }),
    ).toBeNull();
  });

  it('buildAddTransactionRow renvoie une row valide sinon', () => {
    const row = buildAddTransactionRow(baseDraft);
    expect(row).not.toBeNull();
    expect(row).toHaveLength(7);
    expect(row?.[0]).toBe('19/04/2026');
    expect(row?.[4]).toBe('DEPENSE');
  });
});
