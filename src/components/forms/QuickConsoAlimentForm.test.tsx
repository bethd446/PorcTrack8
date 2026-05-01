/**
 * Tests unitaires — QuickConsoAlimentForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env. On teste :
 *   [1] submit BANDE valide → payload OK
 *   [2] submit TRUIE valide → payload OK
 *   [3] validation kg (limites 0 < qty <= 500)
 *   [4] décrément stock après submit (simulation)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildConsoPayload,
  filterActiveBandes,
  parseConsoNum,
  toIsoDateInput,
  validateConsoForm,
  type ConsoFormInput,
} from './quickConsoAlimentLogic';
import type { BandePorcelets } from '../../types/farm';

// ── Mocks ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const insertFeedConsumptionMock = vi.fn<(...args: any[]) => Promise<{ id: string }>>(
  async () => ({ id: 'log-uuid-1' }),
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateProduitAlimentMock = vi.fn<(...args: any[]) => Promise<{ success: boolean }>>(
  async () => ({ success: true }),
);

vi.mock('../../services/feedConsumptionAnalyzer', () => ({
  insertFeedConsumption: (...args: unknown[]) =>
    insertFeedConsumptionMock(...args),
}));

vi.mock('../../services/supabaseWrites', () => ({
  updateProduitAliment: (...args: unknown[]) =>
    updateProduitAlimentMock(...args),
}));

beforeEach(() => {
  insertFeedConsumptionMock.mockClear();
  updateProduitAlimentMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Helpers fixtures ────────────────────────────────────────────────────────
function makeBande(over: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'batch-uuid-1',
    idPortee: 'P-2026-01',
    truie: 'T01',
    statut: 'Sous mère',
    poidsInitialKg: 0,
    synced: true,
    ...over,
  };
}

/** Simule le flow de submit du composant pour tests headless. */
async function simulateSubmit(
  input: ConsoFormInput,
  selectedAliment: { id: string; stockActuel: number; seuilAlerte: number } | null,
): Promise<{ ok: boolean; errors?: Record<string, string> }> {
  const v = validateConsoForm(input);
  if (!v.ok) return { ok: false, errors: v.errors };

  const payload = buildConsoPayload(input);
  const { insertFeedConsumption } = await import(
    '../../services/feedConsumptionAnalyzer'
  );
  const { updateProduitAliment } = await import(
    '../../services/supabaseWrites'
  );
  await insertFeedConsumption(payload);

  if (selectedAliment && payload.produit_aliment_id) {
    const newStock = Math.max(0, selectedAliment.stockActuel - payload.qty_kg);
    const enAlerte = newStock <= selectedAliment.seuilAlerte;
    await updateProduitAliment(selectedAliment.id, {
      stock_actuel: newStock,
      en_alerte: enAlerte,
    });
  }

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// [1] Submit BANDE
// ═══════════════════════════════════════════════════════════════════════════

describe('[1] submit BANDE valide', () => {
  it('insère un log feed_consumption pour une bande', async () => {
    const input: ConsoFormInput = {
      subject: 'BANDE',
      bandeId: 'batch-uuid-1',
      truieId: '',
      alimentId: 'alim-uuid-1',
      qtyKg: '120',
      dateConso: toIsoDateInput(),
      notes: 'Distribution matin',
    };
    const res = await simulateSubmit(input, {
      id: 'alim-uuid-1',
      stockActuel: 1000,
      seuilAlerte: 100,
    });
    expect(res.ok).toBe(true);
    expect(insertFeedConsumptionMock).toHaveBeenCalledTimes(1);
    const call = insertFeedConsumptionMock.mock.calls[0][0] as {
      batch_id: string | null;
      sow_id: string | null;
      qty_kg: number;
    };
    expect(call.batch_id).toBe('batch-uuid-1');
    expect(call.sow_id).toBeNull();
    expect(call.qty_kg).toBe(120);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [2] Submit TRUIE
// ═══════════════════════════════════════════════════════════════════════════

describe('[2] submit TRUIE valide', () => {
  it('insère un log feed_consumption pour une truie', async () => {
    const input: ConsoFormInput = {
      subject: 'TRUIE',
      bandeId: '',
      truieId: 'sow-uuid-7',
      alimentId: 'alim-uuid-2',
      qtyKg: '3.5',
      dateConso: toIsoDateInput(),
      notes: '',
    };
    const res = await simulateSubmit(input, null);
    expect(res.ok).toBe(true);
    const call = insertFeedConsumptionMock.mock.calls[0][0] as {
      batch_id: string | null;
      sow_id: string | null;
      qty_kg: number;
    };
    expect(call.batch_id).toBeNull();
    expect(call.sow_id).toBe('sow-uuid-7');
    expect(call.qty_kg).toBe(3.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [3] Validation kg
// ═══════════════════════════════════════════════════════════════════════════

describe('[3] validation kg', () => {
  const baseValid: ConsoFormInput = {
    subject: 'BANDE',
    bandeId: 'batch-uuid-1',
    truieId: '',
    alimentId: 'alim-uuid-1',
    qtyKg: '50',
    dateConso: toIsoDateInput(),
    notes: '',
  };

  it('rejette qty vide', () => {
    const v = validateConsoForm({ ...baseValid, qtyKg: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.qtyKg).toMatch(/requise/i);
  });

  it('rejette qty <= 0', () => {
    expect(validateConsoForm({ ...baseValid, qtyKg: '0' }).ok).toBe(false);
    expect(validateConsoForm({ ...baseValid, qtyKg: '-5' }).ok).toBe(false);
  });

  it('rejette qty > 500', () => {
    const v = validateConsoForm({ ...baseValid, qtyKg: '501' });
    expect(v.ok).toBe(false);
    expect(v.errors.qtyKg).toMatch(/500/);
  });

  it('accepte virgule décimale FR', () => {
    expect(parseConsoNum('12,5')).toBe(12.5);
    expect(validateConsoForm({ ...baseValid, qtyKg: '12,5' }).ok).toBe(true);
  });

  it('rejette quand sujet BANDE sans bandeId', () => {
    const v = validateConsoForm({ ...baseValid, bandeId: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.bandeId).toBeDefined();
  });

  it('filterActiveBandes exclut Vendu et RECAP', () => {
    const list = [
      makeBande({ id: 'a', statut: 'Sous mère' }),
      makeBande({ id: 'b', statut: 'Vendu' }),
      makeBande({ id: 'c', statut: 'RECAP' }),
      makeBande({ id: 'd', statut: 'En croissance' }),
    ];
    const active = filterActiveBandes(list);
    const ids = active.map(b => b.id).sort();
    expect(ids).toEqual(['a', 'd']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [4] Décrément stock
// ═══════════════════════════════════════════════════════════════════════════

describe('[4] décrément stock après submit', () => {
  it('appelle updateProduitAliment avec stock_actuel diminué', async () => {
    const input: ConsoFormInput = {
      subject: 'BANDE',
      bandeId: 'batch-uuid-1',
      truieId: '',
      alimentId: 'alim-uuid-1',
      qtyKg: '120',
      dateConso: toIsoDateInput(),
      notes: '',
    };
    await simulateSubmit(input, {
      id: 'alim-uuid-1',
      stockActuel: 500,
      seuilAlerte: 100,
    });
    expect(updateProduitAlimentMock).toHaveBeenCalledTimes(1);
    const [id, patch] = updateProduitAlimentMock.mock.calls[0] as unknown as [
      string,
      { stock_actuel: number; en_alerte: boolean },
    ];
    expect(id).toBe('alim-uuid-1');
    expect(patch.stock_actuel).toBe(380); // 500 - 120
    expect(patch.en_alerte).toBe(false);
  });

  it('marque en_alerte=true si nouveau stock <= seuil (rupture imminente)', async () => {
    const input: ConsoFormInput = {
      subject: 'BANDE',
      bandeId: 'batch-uuid-1',
      truieId: '',
      alimentId: 'alim-uuid-1',
      qtyKg: '450',
      dateConso: toIsoDateInput(),
      notes: '',
    };
    await simulateSubmit(input, {
      id: 'alim-uuid-1',
      stockActuel: 500,
      seuilAlerte: 100,
    });
    const [, patch] = updateProduitAlimentMock.mock.calls[0] as unknown as [
      string,
      { stock_actuel: number; en_alerte: boolean },
    ];
    expect(patch.stock_actuel).toBe(50);
    expect(patch.en_alerte).toBe(true);
  });
});
