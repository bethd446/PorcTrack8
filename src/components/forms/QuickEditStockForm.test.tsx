/**
 * Tests unitaires — QuickEditStockForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env (pas de jsdom), on teste donc les helpers purs
 * + le flow de soumission contre un mock d'`enqueueUpdateRow`.
 *
 * 6 tests obligatoires :
 *   [1] Render mode Aliment — pré-remplissage affiche libelle
 *   [2] Render mode Véto    — pré-remplissage affiche produit + type + usage
 *   [3] Validation libellé/produit vide → rejetée
 *   [4] Submit patch correct pour Aliment (colonnes canoniques + sheet)
 *   [5] Submit patch correct pour Véto (colonnes canoniques + sheet)
 *   [6] Bouton Recalculer applique la logique stock/seuil → statut
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  recomputeStatut,
  stockLabelFor,
  toStockEditInput,
  validateStockEdit,
  type StockEditErrors,
  type StockEditInput,
} from './quickEditStockLogic';
import type { StockAliment, StockVeto } from '../../types/farm';

// ── Mock global offlineQueue ───────────────────────────────────────────────
type EnqueueUpdateRowArgs = [
  sheet: string,
  idHeader: string,
  idValue: string,
  patch: Record<string, string | number | boolean | null>,
];
const enqueueUpdateRowMock = vi.fn<(...args: EnqueueUpdateRowArgs) => Promise<void>>(
  async () => undefined,
);
vi.mock('../../services/offlineQueue', () => ({
  enqueueUpdateRow: (...args: EnqueueUpdateRowArgs) => enqueueUpdateRowMock(...args),
}));

// Helper qui miroir le submit du composant — isolé pour test node env.
async function submitStockEdit(opts: {
  id: string;
  input: StockEditInput;
  refreshData: () => Promise<void>;
}): Promise<{ ok: boolean; errors?: StockEditErrors }> {
  const result = validateStockEdit(opts.input);
  if (!result.ok || !result.patch || !result.sheetName) {
    return { ok: false, errors: result.errors };
  }
  const { enqueueUpdateRow } = await import('../../services/offlineQueue');
  await enqueueUpdateRow(result.sheetName, 'ID', opts.id, result.patch);
  await opts.refreshData();
  return { ok: true };
}

// ── Fixtures ───────────────────────────────────────────────────────────────
function makeAliment(over: Partial<StockAliment> = {}): StockAliment {
  return {
    id: 'ALIM-01',
    libelle: 'Truie gestation',
    stockActuel: 150,
    unite: 'kg',
    seuilAlerte: 100,
    statutStock: 'OK',
    notes: 'Lot 2026-Q2',
    ...over,
  };
}

function makeVeto(over: Partial<StockVeto> = {}): StockVeto {
  return {
    id: 'VET-03',
    produit: 'Ivermectine',
    type: 'Antiparasitaire',
    usage: 'Déparasitage',
    stockActuel: 25,
    unite: 'mL',
    stockMin: 10,
    seuilAlerte: 20,
    statutStock: 'OK',
    notes: '',
    ...over,
  };
}

beforeEach(() => {
  enqueueUpdateRowMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── [1] Render mode Aliment ─────────────────────────────────────────────
describe('QuickEditStockForm · Render Aliment', () => {
  it('[1] toStockEditInput pré-remplit libelle + stock + unité + seuil + statut + notes', () => {
    const aliment = makeAliment();
    const input = toStockEditInput(aliment, 'ALIMENT');
    expect(input.kind).toBe('ALIMENT');
    expect(input.libelle).toBe('Truie gestation');
    expect(input.stockActuel).toBe('150');
    expect(input.unite).toBe('kg');
    expect(input.seuilAlerte).toBe('100');
    expect(input.statut).toBe('OK');
    expect(input.notes).toBe('Lot 2026-Q2');
    // Champs véto-only ne doivent pas apparaître
    expect(input.produit).toBeUndefined();
    expect(input.type).toBeUndefined();
    expect(input.usage).toBeUndefined();
  });

  it('stockLabelFor retourne le libelle pour un aliment', () => {
    const aliment = makeAliment({ libelle: 'Porcelets finition' });
    expect(stockLabelFor(aliment, 'ALIMENT')).toBe('Porcelets finition');
  });
});

// ─── [2] Render mode Véto ───────────────────────────────────────────────
describe('QuickEditStockForm · Render Véto', () => {
  it('[2] toStockEditInput pré-remplit produit + type + usage + stock + unité', () => {
    const veto = makeVeto();
    const input = toStockEditInput(veto, 'VETO');
    expect(input.kind).toBe('VETO');
    expect(input.produit).toBe('Ivermectine');
    expect(input.type).toBe('Antiparasitaire');
    expect(input.usage).toBe('Déparasitage');
    expect(input.stockActuel).toBe('25');
    expect(input.unite).toBe('mL');
    expect(input.seuilAlerte).toBe('20');
    // Champ aliment-only absent
    expect(input.libelle).toBeUndefined();
  });

  it('stockLabelFor retourne le produit pour un véto', () => {
    const veto = makeVeto({ produit: 'Amoxicilline' });
    expect(stockLabelFor(veto, 'VETO')).toBe('Amoxicilline');
  });

  it('toStockEditInput gère type/usage absents (undefined → "")', () => {
    const veto = makeVeto({ type: undefined, usage: undefined, notes: undefined });
    const input = toStockEditInput(veto, 'VETO');
    expect(input.type).toBe('');
    expect(input.usage).toBe('');
    expect(input.notes).toBe('');
  });
});

// ─── [3] Validation libellé/produit vide rejetée ─────────────────────────
describe('QuickEditStockForm · Validation identité', () => {
  const baseAliment: StockEditInput = {
    kind: 'ALIMENT',
    libelle: '',
    stockActuel: '100',
    unite: 'kg',
    seuilAlerte: '50',
    statut: 'OK',
    notes: '',
  };
  const baseVeto: StockEditInput = {
    kind: 'VETO',
    produit: '',
    type: '',
    usage: '',
    stockActuel: '30',
    unite: 'mL',
    seuilAlerte: '20',
    statut: 'OK',
    notes: '',
  };

  it('[3a] libellé vide sur Aliment → rejeté', () => {
    const res = validateStockEdit({ ...baseAliment, libelle: '' });
    expect(res.ok).toBe(false);
    expect(res.errors.libelle).toBeTruthy();
  });

  it('[3b] libellé uniquement whitespace sur Aliment → rejeté', () => {
    const res = validateStockEdit({ ...baseAliment, libelle: '   ' });
    expect(res.ok).toBe(false);
    expect(res.errors.libelle).toBeTruthy();
  });

  it('[3c] produit vide sur Véto → rejeté', () => {
    const res = validateStockEdit({ ...baseVeto, produit: '' });
    expect(res.ok).toBe(false);
    expect(res.errors.produit).toBeTruthy();
  });

  it('[3d] produit uniquement whitespace sur Véto → rejeté', () => {
    const res = validateStockEdit({ ...baseVeto, produit: '   ' });
    expect(res.ok).toBe(false);
    expect(res.errors.produit).toBeTruthy();
  });

  it('libellé 60 chars max OK / 61 rejeté', () => {
    const ok = validateStockEdit({ ...baseAliment, libelle: 'x'.repeat(60) });
    expect(ok.ok).toBe(true);
    const ko = validateStockEdit({ ...baseAliment, libelle: 'x'.repeat(61) });
    expect(ko.ok).toBe(false);
    expect(ko.errors.libelle).toBeTruthy();
  });

  it('stockActuel négatif rejeté', () => {
    const res = validateStockEdit({ ...baseAliment, libelle: 'X', stockActuel: '-1' });
    expect(res.ok).toBe(false);
    expect(res.errors.stockActuel).toBeTruthy();
  });

  it('stockActuel > 9999 rejeté', () => {
    const res = validateStockEdit({ ...baseAliment, libelle: 'X', stockActuel: '10000' });
    expect(res.ok).toBe(false);
    expect(res.errors.stockActuel).toBeTruthy();
  });

  it('unité vide rejetée', () => {
    const res = validateStockEdit({ ...baseAliment, libelle: 'X', unite: '' });
    expect(res.ok).toBe(false);
    expect(res.errors.unite).toBeTruthy();
  });

  it('notes > 200 chars rejetées', () => {
    const res = validateStockEdit({
      ...baseAliment,
      libelle: 'X',
      notes: 'n'.repeat(201),
    });
    expect(res.ok).toBe(false);
    expect(res.errors.notes).toBeTruthy();
  });
});

// ─── [4] Submit patch correct pour Aliment ───────────────────────────────
describe('QuickEditStockForm · Submit Aliment', () => {
  it('[4] submit Aliment → enqueueUpdateRow(STOCK_ALIMENTS, ID, …) avec colonnes canoniques', async () => {
    const refreshData = vi.fn(async () => undefined);

    const input: StockEditInput = {
      kind: 'ALIMENT',
      libelle: '  Truie gestation  ', // trim attendu
      stockActuel: '250',
      unite: 'kg',
      seuilAlerte: '100',
      statut: 'OK',
      notes: 'Nouveau lot',
    };

    const out = await submitStockEdit({
      id: 'ALIM-01',
      input,
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'STOCK_ALIMENTS',
      'ID',
      'ALIM-01',
      {
        LIBELLE: 'Truie gestation',
        STOCK_ACTUEL: 250,
        UNITE: 'kg',
        SEUIL_ALERTE: 100,
        STATUT_STOCK: 'OK',
        NOTES: 'Nouveau lot',
      },
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('patch Aliment ne contient PAS les colonnes véto', async () => {
    const refreshData = vi.fn(async () => undefined);
    const input: StockEditInput = {
      kind: 'ALIMENT',
      libelle: 'Porcelets',
      stockActuel: '500',
      unite: 'kg',
      seuilAlerte: '200',
      statut: 'OK',
      notes: '',
    };

    await submitStockEdit({ id: 'ALIM-02', input, refreshData });
    const patchArg = enqueueUpdateRowMock.mock.calls[0]?.[3] ?? {};
    expect(Object.keys(patchArg)).not.toContain('PRODUIT');
    expect(Object.keys(patchArg)).not.toContain('TYPE');
    expect(Object.keys(patchArg)).not.toContain('USAGE');
  });
});

// ─── [5] Submit patch correct pour Véto ──────────────────────────────────
describe('QuickEditStockForm · Submit Véto', () => {
  it('[5] submit Véto → enqueueUpdateRow(STOCK_VETO, ID, …) avec PRODUIT + TYPE + USAGE', async () => {
    const refreshData = vi.fn(async () => undefined);

    const input: StockEditInput = {
      kind: 'VETO',
      produit: 'Ivermectine',
      type: 'Antiparasitaire',
      usage: 'Déparasitage',
      stockActuel: '50',
      unite: 'mL',
      seuilAlerte: '20',
      statut: 'OK',
      notes: 'Lot reçu 01/04',
    };

    const out = await submitStockEdit({
      id: 'VET-03',
      input,
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'STOCK_VETO',
      'ID',
      'VET-03',
      {
        PRODUIT: 'Ivermectine',
        TYPE: 'Antiparasitaire',
        USAGE: 'Déparasitage',
        STOCK_ACTUEL: 50,
        UNITE: 'mL',
        SEUIL_ALERTE: 20,
        STATUT_STOCK: 'OK',
        NOTES: 'Lot reçu 01/04',
      },
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('patch Véto ne contient PAS la colonne LIBELLE', async () => {
    const refreshData = vi.fn(async () => undefined);
    const input: StockEditInput = {
      kind: 'VETO',
      produit: 'Amoxicilline',
      type: 'Antibiotique',
      usage: '',
      stockActuel: '10',
      unite: 'doses',
      seuilAlerte: '5',
      statut: 'OK',
      notes: '',
    };

    await submitStockEdit({ id: 'VET-05', input, refreshData });
    const patchArg = enqueueUpdateRowMock.mock.calls[0]?.[3] ?? {};
    expect(Object.keys(patchArg)).not.toContain('LIBELLE');
    expect(patchArg.USAGE).toBe('');
  });
});

// ─── [6] Bouton Recalculer applique la logique correcte ──────────────────
describe('QuickEditStockForm · Recalculer statut', () => {
  it('[6a] stockActuel = 0 → RUPTURE', () => {
    expect(recomputeStatut(0, 100)).toBe('RUPTURE');
  });

  it('[6b] 0 < stockActuel <= seuilAlerte → BAS', () => {
    expect(recomputeStatut(50, 100)).toBe('BAS');
    expect(recomputeStatut(100, 100)).toBe('BAS');
    expect(recomputeStatut(1, 20)).toBe('BAS');
  });

  it('[6c] stockActuel > seuilAlerte → OK', () => {
    expect(recomputeStatut(150, 100)).toBe('OK');
    expect(recomputeStatut(500, 20)).toBe('OK');
  });

  it('[6d] seuilAlerte = 0 et stock > 0 → OK', () => {
    expect(recomputeStatut(10, 0)).toBe('OK');
  });

  it('[6e] stock non-fini → RUPTURE (fallback safe)', () => {
    expect(recomputeStatut(NaN, 100)).toBe('RUPTURE');
  });

  it('flow complet : on édite stockActuel puis Recalculer met à jour le patch', () => {
    // Simule le flow UI : l'utilisateur change stockActuel de 150 → 30,
    // clique Recalculer → statut devient BAS (car seuil = 100)
    const before = recomputeStatut(150, 100);
    const after = recomputeStatut(30, 100);
    expect(before).toBe('OK');
    expect(after).toBe('BAS');

    // Le submit ensuite doit contenir le statut recalculé
    const input: StockEditInput = {
      kind: 'ALIMENT',
      libelle: 'Truie gestation',
      stockActuel: '30',
      unite: 'kg',
      seuilAlerte: '100',
      statut: after, // ← résultat du clic Recalculer
      notes: '',
    };
    const res = validateStockEdit(input);
    expect(res.ok).toBe(true);
    expect(res.patch?.STATUT_STOCK).toBe('BAS');
  });
});
