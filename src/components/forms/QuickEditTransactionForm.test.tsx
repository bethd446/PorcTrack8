/**
 * Tests unitaires — QuickEditTransactionForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 * V75-q-D : retrait du mock `enqueueUpdateRow` (fonction supprimée). Le
 * composant runtime appelle désormais `supabase.from('finances').update(...)`
 * direct ; les tests valident maintenant `validateEditTransaction` et le
 * diff patch produit (clés canoniques + conversion date).
 *
 * Couvre :
 *   [1] render — transactionToDraft convertit dd/MM/yyyy → yyyy-MM-dd.
 *   [2] validation — montant négatif rejeté, libellé vide rejeté, notes > 200.
 *   [3] diff patch — clés canoniques (LIBELLE, MONTANT, CATEGORIE, TYPE, …).
 *   [4] patch partiel — seuls les champs modifiés sont envoyés.
 *   [5] patch partiel — les valeurs construites par buildEditPatch.
 *   [6] conversion date → dd/MM/yyyy dans le patch.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  validateEditTransaction,
  buildEditPatch,
  transactionToDraft,
  frToIsoDate,
  type EditTransactionDraft,
} from './QuickEditTransactionForm';
import type { FinanceEntry } from '../../types/farm';

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
// [3] Diff patch — clés canoniques
// ═══════════════════════════════════════════════════════════════════════════

describe('[3] diff patch — clés canoniques', () => {
  it('produit un patch complet avec LIBELLE, MONTANT, CATEGORIE, TYPE, BANDE_ID, NOTES', () => {
    const initial = makeDraft();
    const input = makeDraft({
      libelle: 'Sac aliment v2',
      montant: '22000',
      categorie: 'VETO',
      type: 'REVENU',
      bandeId: 'P-2026-03',
      notes: 'correction',
    });
    const v = validateEditTransaction(input, initial);
    expect(v.ok).toBe(true);
    expect(v.patch).toBeDefined();
    const patch = v.patch ?? {};
    expect(patch.LIBELLE).toBe('Sac aliment v2');
    expect(patch.MONTANT).toBe(22000);
    expect(patch.CATEGORIE).toBe('VETO');
    expect(patch.TYPE).toBe('REVENU');
    expect(patch.BANDE_ID).toBe('P-2026-03');
    expect(patch.NOTES).toBe('correction');
  });

  it('input invalide → ok=false, pas de patch', () => {
    const initial = makeDraft();
    const v = validateEditTransaction(
      makeDraft({ libelle: '', montant: '-2' }),
      initial,
    );
    expect(v.ok).toBe(false);
    expect(v.patch).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [4] Patch vide quand aucune modification
// ═══════════════════════════════════════════════════════════════════════════

describe('[4] patch vide quand aucune modification', () => {
  it('input identique à initial → patch vide', () => {
    const initial = makeDraft();
    const v = validateEditTransaction(initial, initial);
    expect(v.ok).toBe(true);
    expect(v.patch).toEqual({});
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
