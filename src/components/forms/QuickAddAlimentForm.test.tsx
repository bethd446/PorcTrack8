/**
 * Tests unitaires — QuickAddAlimentForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env (pas de jsdom). On teste :
 *   [1] render : suggestion d'ID (`suggestNextAlimentId`) + defaults
 *   [2] validation libellé vide rejetée
 *   [3] validation stock < 0 rejetée
 *   [4] submit → enqueue avec statut RUPTURE si stock = 0
 *   [5] submit → enqueue avec statut OK si stock > seuil
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  suggestNextAlimentId,
  validateAddAliment,
  buildAddAlimentRow,
  UNITE_SUGGESTIONS,
} from './QuickAddAlimentForm';
import type { SheetCell } from '../../services/offlineQueue';

// ── Mock global de offlineQueue ──────────────────────────────────────────
type EnqueueAppendRowArgs = [sheet: string, values: SheetCell[]];
const enqueueAppendRowMock = vi.fn<(...args: EnqueueAppendRowArgs) => Promise<void>>(
  async () => undefined,
);
vi.mock('../../services/offlineQueue', () => ({
  enqueueAppendRow: (...args: EnqueueAppendRowArgs) => enqueueAppendRowMock(...args),
}));

// Reflect the actual submit the component does, isolé pour tests node.
async function submitAddAliment(draft: {
  id: string;
  libelle: string;
  stockActuel: string;
  unite: string;
  seuilAlerte: string;
  notes: string;
  refreshData: () => Promise<void>;
}): Promise<{ ok: boolean; errors?: Record<string, string> }> {
  const v = validateAddAliment({
    id: draft.id,
    libelle: draft.libelle,
    stockActuel: draft.stockActuel,
    unite: draft.unite,
    seuilAlerte: draft.seuilAlerte,
    notes: draft.notes,
  });
  if (!v.ok || !v.row) {
    return { ok: false, errors: v.errors as Record<string, string> };
  }
  const { enqueueAppendRow } = await import('../../services/offlineQueue');
  await enqueueAppendRow('STOCK_ALIMENTS', v.row);
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
// [1] Render / suggestion ID + defaults
// ═══════════════════════════════════════════════════════════════════════════

describe('[1] render — suggestNextAlimentId + defaults', () => {
  it('suggère A01 quand la liste est vide (fallback)', () => {
    expect(suggestNextAlimentId([])).toBe('A01');
  });

  it('suggère max(id) + 1 avec zero-padding', () => {
    expect(
      suggestNextAlimentId([{ id: 'A05' }, { id: 'A12' }, { id: 'A07' }]),
    ).toBe('A13');
  });

  it('ignore les IDs non numériques mais prend le max trouvable', () => {
    expect(
      suggestNextAlimentId([{ id: 'A08' }, { id: 'xxx' }, { id: 'ALIM-15' }]),
    ).toBe('A16');
  });

  it('expose UNITE_SUGGESTIONS (kg/sac/tonne)', () => {
    expect(UNITE_SUGGESTIONS).toContain('kg');
    expect(UNITE_SUGGESTIONS).toContain('sac');
    expect(UNITE_SUGGESTIONS).toContain('tonne');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [2] Validation libellé vide rejetée
// ═══════════════════════════════════════════════════════════════════════════

describe('[2] validation libellé', () => {
  const base = {
    id: 'A01',
    stockActuel: '100',
    unite: 'kg',
    seuilAlerte: '50',
    notes: '',
  };

  it('libellé vide → erreur', () => {
    const v = validateAddAliment({ ...base, libelle: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.libelle).toBeTruthy();
    expect(v.row).toBeUndefined();
  });

  it('libellé whitespace → erreur', () => {
    const v = validateAddAliment({ ...base, libelle: '   ' });
    expect(v.ok).toBe(false);
    expect(v.errors.libelle).toBeTruthy();
  });

  it('libellé > 60 caractères → erreur', () => {
    const v = validateAddAliment({ ...base, libelle: 'X'.repeat(61) });
    expect(v.ok).toBe(false);
    expect(v.errors.libelle).toBeTruthy();
  });

  it('libellé valide → ok + trim appliqué', () => {
    const v = validateAddAliment({ ...base, libelle: '  Maïs grain  ' });
    expect(v.ok).toBe(true);
    // row[1] = LIBELLE
    expect(v.row?.[1]).toBe('Maïs grain');
  });

  it('buildAddAlimentRow renvoie null si validation échoue (libellé vide)', () => {
    expect(
      buildAddAlimentRow({
        ...base,
        libelle: '',
      }),
    ).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [3] Validation stock < 0 rejetée
// ═══════════════════════════════════════════════════════════════════════════

describe('[3] validation stock & seuil', () => {
  const base = {
    id: 'A01',
    libelle: 'Maïs',
    unite: 'kg',
    seuilAlerte: '50',
    notes: '',
  };

  it('stock négatif → erreur', () => {
    const v = validateAddAliment({ ...base, stockActuel: '-1' });
    expect(v.ok).toBe(false);
    expect(v.errors.stockActuel).toBeTruthy();
  });

  it('stock = 0 → accepté (ok, statut RUPTURE)', () => {
    const v = validateAddAliment({ ...base, stockActuel: '0' });
    expect(v.ok).toBe(true);
    expect(v.statut).toBe('RUPTURE');
  });

  it('stock non numérique → erreur', () => {
    const v = validateAddAliment({ ...base, stockActuel: 'abc' });
    expect(v.ok).toBe(false);
    expect(v.errors.stockActuel).toBeTruthy();
  });

  it('seuil négatif → erreur', () => {
    const v = validateAddAliment({
      ...base,
      stockActuel: '10',
      seuilAlerte: '-5',
    });
    expect(v.ok).toBe(false);
    expect(v.errors.seuilAlerte).toBeTruthy();
  });

  it('unité vide → erreur', () => {
    const v = validateAddAliment({
      ...base,
      stockActuel: '10',
      unite: '',
    });
    expect(v.ok).toBe(false);
    expect(v.errors.unite).toBeTruthy();
  });

  it('id format invalide → erreur', () => {
    const v = validateAddAliment({
      ...base,
      id: '42',
      stockActuel: '10',
    });
    expect(v.ok).toBe(false);
    expect(v.errors.id).toBeTruthy();
  });

  it('stock en virgule décimale FR acceptée', () => {
    const v = validateAddAliment({ ...base, stockActuel: '12,5' });
    expect(v.ok).toBe(true);
    // row[2] = STOCK_ACTUEL
    expect(v.row?.[2]).toBe(12.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [4] Submit enqueue avec statut RUPTURE si stock = 0
// ═══════════════════════════════════════════════════════════════════════════

describe('[4] submit → enqueue avec statut RUPTURE si stock = 0', () => {
  it('appelle enqueueAppendRow avec STATUT=RUPTURE quand stock=0', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddAliment({
      id: 'A10',
      libelle: 'Tourteau soja',
      stockActuel: '0',
      unite: 'kg',
      seuilAlerte: '100',
      notes: 'Rupture à la création',
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(enqueueAppendRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueAppendRowMock).toHaveBeenCalledWith('STOCK_ALIMENTS', [
      'A10',                      // ID
      'Tourteau soja',            // LIBELLE
      0,                          // STOCK_ACTUEL
      'kg',                       // UNITE
      100,                        // SEUIL_ALERTE
      'RUPTURE',                  // STATUT (auto-calculé)
      'Rupture à la création',    // NOTES
    ]);
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('submit invalide (libellé vide) → pas d\'enqueue, pas de refresh', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddAliment({
      id: 'A11',
      libelle: '',
      stockActuel: '100',
      unite: 'kg',
      seuilAlerte: '50',
      notes: '',
      refreshData,
    });
    expect(out.ok).toBe(false);
    expect(out.errors?.libelle).toBeTruthy();
    expect(enqueueAppendRowMock).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [5] Submit enqueue avec statut OK si stock > seuil
// ═══════════════════════════════════════════════════════════════════════════

describe('[5] submit → enqueue avec statut OK si stock > seuil', () => {
  it('STATUT=OK quand stock > seuilAlerte', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddAliment({
      id: 'A20',
      libelle: 'Maïs grain',
      stockActuel: '500',
      unite: 'kg',
      seuilAlerte: '100',
      notes: '',
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(enqueueAppendRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueAppendRowMock).toHaveBeenCalledWith('STOCK_ALIMENTS', [
      'A20',          // ID
      'Maïs grain',   // LIBELLE
      500,            // STOCK_ACTUEL
      'kg',           // UNITE
      100,            // SEUIL_ALERTE
      'OK',           // STATUT (auto-calculé, stock > seuil)
      '',             // NOTES
    ]);
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('STATUT=BAS quand 0 < stock <= seuilAlerte', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddAliment({
      id: 'A21',
      libelle: 'Son de blé',
      stockActuel: '30',
      unite: 'kg',
      seuilAlerte: '100',
      notes: '',
      refreshData,
    });

    expect(out.ok).toBe(true);
    // row[5] = STATUT
    const call = enqueueAppendRowMock.mock.calls[0];
    expect(call[0]).toBe('STOCK_ALIMENTS');
    expect(call[1][5]).toBe('BAS');
  });
});
