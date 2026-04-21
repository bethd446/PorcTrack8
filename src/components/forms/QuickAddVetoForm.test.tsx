/**
 * Tests unitaires — QuickAddVetoForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env (pas de jsdom). On teste :
 *   [1] render → suggestion d'ID `suggestNextVetoId` + suggestions constantes.
 *   [2] Validation produit vide rejetée.
 *   [3] Validation stock < 0 rejetée (et NaN).
 *   [4] Submit → enqueueAppendRow appelé avec sheet STOCK_VETO
 *       + ordre colonne canonique (id, produit, type, usage, stock, unite,
 *         seuil, statut, notes).
 *   [5] Submit → statut auto-calculé via recomputeStatut (RUPTURE/BAS/OK)
 *       est bien positionné en colonne 7 de la row.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  suggestNextVetoId,
  validateAddVeto,
  buildAddVetoRow,
  TYPE_SUGGESTIONS,
  USAGE_SUGGESTIONS,
  UNITE_SUGGESTIONS,
} from './QuickAddVetoForm';
import type { SheetCell } from '../../services/offlineQueue';

// ── Mock global de offlineQueue ──────────────────────────────────────────
type EnqueueAppendRowArgs = [sheet: string, values: SheetCell[]];
const enqueueAppendRowMock = vi.fn<(...args: EnqueueAppendRowArgs) => Promise<void>>(
  async () => undefined,
);
vi.mock('../../services/offlineQueue', () => ({
  enqueueAppendRow: (...args: EnqueueAppendRowArgs) => enqueueAppendRowMock(...args),
}));

/**
 * Reflète le submit effectif du composant, isolé pour test node.
 * Valide → appel `enqueueAppendRow('STOCK_VETO', row)` → refreshData().
 */
async function submitAddVeto(draft: {
  id: string;
  produit: string;
  type: string;
  usage: string;
  stockActuel: string;
  unite: string;
  seuilAlerte: string;
  notes: string;
  refreshData: () => Promise<void>;
}): Promise<{ ok: boolean; errors?: Record<string, string> }> {
  const v = validateAddVeto({
    id: draft.id,
    produit: draft.produit,
    type: draft.type,
    usage: draft.usage,
    stockActuel: draft.stockActuel,
    unite: draft.unite,
    seuilAlerte: draft.seuilAlerte,
    notes: draft.notes,
  });
  if (!v.ok || !v.row) {
    return { ok: false, errors: v.errors };
  }
  const { enqueueAppendRow } = await import('../../services/offlineQueue');
  await enqueueAppendRow('STOCK_VETO', v.row);
  await draft.refreshData();
  return { ok: true };
}

beforeEach(() => {
  enqueueAppendRowMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// [1] render — suggestNextVetoId + constantes exposées
// ═══════════════════════════════════════════════════════════════════════════

describe('[1] render — suggestNextVetoId + suggestions', () => {
  it('suggère V01 quand la liste est vide (fallback)', () => {
    expect(suggestNextVetoId([])).toBe('V01');
  });

  it('suggère max(id) + 1 avec zero-padding', () => {
    expect(
      suggestNextVetoId([{ id: 'V02' }, { id: 'V05' }, { id: 'V03' }]),
    ).toBe('V06');
  });

  it('ignore les IDs non numériques mais préserve le max trouvable', () => {
    expect(
      suggestNextVetoId([{ id: 'V08' }, { id: 'abc' }, { id: 'VET-15' }]),
    ).toBe('V16');
  });

  it('expose les suggestions de type, usage et unité', () => {
    expect(TYPE_SUGGESTIONS).toContain('Antiparasitaire');
    expect(TYPE_SUGGESTIONS).toContain('Antibiotique');
    expect(TYPE_SUGGESTIONS).toContain('Vaccin');
    expect(USAGE_SUGGESTIONS).toContain('Prévention');
    expect(USAGE_SUGGESTIONS).toContain('Traitement');
    expect(UNITE_SUGGESTIONS).toContain('mL');
    expect(UNITE_SUGGESTIONS).toContain('doses');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [2] Validation produit vide rejetée
// ═══════════════════════════════════════════════════════════════════════════

describe('[2] validation produit', () => {
  const base = {
    id: 'V10',
    type: 'Antiparasitaire',
    usage: 'Prévention',
    stockActuel: '100',
    unite: 'mL',
    seuilAlerte: '10',
    notes: '',
  };

  it('produit vide → erreur', () => {
    const v = validateAddVeto({ ...base, produit: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.produit).toBeTruthy();
    expect(v.row).toBeUndefined();
  });

  it('produit whitespace → erreur', () => {
    const v = validateAddVeto({ ...base, produit: '   ' });
    expect(v.ok).toBe(false);
    expect(v.errors.produit).toBeTruthy();
  });

  it('produit valide → ok + trim appliqué', () => {
    const v = validateAddVeto({ ...base, produit: '  Ivermectine 1%  ' });
    expect(v.ok).toBe(true);
    // row[1] = PRODUIT
    expect(v.row?.[1]).toBe('Ivermectine 1%');
  });

  it('unité vide → erreur (unité obligatoire)', () => {
    const v = validateAddVeto({ ...base, produit: 'Ivermectine', unite: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.unite).toBeTruthy();
  });

  it('buildAddVetoRow renvoie null si validation échoue', () => {
    expect(
      buildAddVetoRow({ ...base, produit: '' }),
    ).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [3] Validation stock < 0 rejetée
// ═══════════════════════════════════════════════════════════════════════════

describe('[3] validation stock ≥ 0', () => {
  const base = {
    id: 'V10',
    produit: 'Ivermectine 1%',
    type: 'Antiparasitaire',
    usage: 'Prévention',
    unite: 'mL',
    seuilAlerte: '5',
    notes: '',
  };

  it('stock négatif → erreur', () => {
    const v = validateAddVeto({ ...base, stockActuel: '-5' });
    expect(v.ok).toBe(false);
    expect(v.errors.stockActuel).toBeTruthy();
  });

  it('stock non numérique → erreur', () => {
    const v = validateAddVeto({ ...base, stockActuel: 'abc' });
    expect(v.ok).toBe(false);
    expect(v.errors.stockActuel).toBeTruthy();
  });

  it('stock vide → erreur (requis)', () => {
    const v = validateAddVeto({ ...base, stockActuel: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.stockActuel).toBeTruthy();
  });

  it('stock 0 accepté (démarrage en RUPTURE)', () => {
    const v = validateAddVeto({ ...base, stockActuel: '0' });
    expect(v.ok).toBe(true);
    expect(v.row?.[4]).toBe(0);
  });

  it('stock positif avec virgule décimale FR accepté', () => {
    const v = validateAddVeto({ ...base, stockActuel: '12,5' });
    expect(v.ok).toBe(true);
    expect(v.row?.[4]).toBe(12.5);
  });

  it('seuil négatif → erreur', () => {
    const v = validateAddVeto({ ...base, stockActuel: '100', seuilAlerte: '-1' });
    expect(v.ok).toBe(false);
    expect(v.errors.seuilAlerte).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [4] Submit → enqueueAppendRow avec type/usage + ordre canonique
// ═══════════════════════════════════════════════════════════════════════════

describe('[4] submit → enqueueAppendRow sur STOCK_VETO', () => {
  it('appelle enqueueAppendRow avec sheet + row canonique (type/usage inclus)', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddVeto({
      id: 'V07',
      produit: 'Ivermectine 1%',
      type: 'Antiparasitaire',
      usage: 'Prévention',
      stockActuel: '250',
      unite: 'mL',
      seuilAlerte: '20',
      notes: 'Dose 1 mL / 33 kg PV',
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(enqueueAppendRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueAppendRowMock).toHaveBeenCalledWith(
      'STOCK_VETO',
      [
        'V07',                   // ID
        'Ivermectine 1%',        // PRODUIT
        'Antiparasitaire',       // TYPE
        'Prévention',            // USAGE
        250,                     // STOCK_ACTUEL
        'mL',                    // UNITE
        20,                      // SEUIL_ALERTE
        'OK',                    // STATUT auto (250 > 20)
        'Dose 1 mL / 33 kg PV',  // NOTES
      ],
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('submit invalide (produit vide + stock négatif) → pas d\'enqueue', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddVeto({
      id: 'V07',
      produit: '',
      type: '',
      usage: '',
      stockActuel: '-5',
      unite: '',
      seuilAlerte: '5',
      notes: '',
      refreshData,
    });
    expect(out.ok).toBe(false);
    expect(out.errors?.produit).toBeTruthy();
    expect(out.errors?.stockActuel).toBeTruthy();
    expect(out.errors?.unite).toBeTruthy();
    expect(enqueueAppendRowMock).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [5] Submit → statut auto-calculé (recomputeStatut)
// ═══════════════════════════════════════════════════════════════════════════

describe('[5] statut STOCK auto-calculé', () => {
  const base = {
    id: 'V09',
    produit: 'Vaccin rouget',
    type: 'Vaccin',
    usage: 'Prévention',
    unite: 'doses',
    notes: '',
  };

  it('stock 0 → statut RUPTURE injecté en row[7]', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddVeto({
      ...base,
      stockActuel: '0',
      seuilAlerte: '10',
      refreshData,
    });
    expect(out.ok).toBe(true);
    const row = enqueueAppendRowMock.mock.calls[0][1];
    expect(row[4]).toBe(0);          // stock
    expect(row[6]).toBe(10);         // seuil
    expect(row[7]).toBe('RUPTURE');  // statut auto
  });

  it('stock ≤ seuil (mais > 0) → statut BAS', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddVeto({
      ...base,
      stockActuel: '8',
      seuilAlerte: '10',
      refreshData,
    });
    expect(out.ok).toBe(true);
    const row = enqueueAppendRowMock.mock.calls[0][1];
    expect(row[4]).toBe(8);
    expect(row[7]).toBe('BAS');
  });

  it('stock > seuil → statut OK', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddVeto({
      ...base,
      stockActuel: '100',
      seuilAlerte: '10',
      refreshData,
    });
    expect(out.ok).toBe(true);
    const row = enqueueAppendRowMock.mock.calls[0][1];
    expect(row[4]).toBe(100);
    expect(row[7]).toBe('OK');
  });

  it('seuil 0 (désactivé) + stock positif → OK', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddVeto({
      ...base,
      stockActuel: '5',
      seuilAlerte: '0',
      refreshData,
    });
    expect(out.ok).toBe(true);
    const row = enqueueAppendRowMock.mock.calls[0][1];
    expect(row[6]).toBe(0);
    expect(row[7]).toBe('OK');
  });
});
