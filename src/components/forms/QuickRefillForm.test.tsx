/**
 * Tests unitaires — QuickRefillForm helpers
 * ════════════════════════════════════════════════════════════════════════════
 * L'environnement Vitest du projet tourne en `node` (pas jsdom), on teste
 * donc les helpers purs exportés par `QuickRefillForm` qui encapsulent la
 * logique métier de réapprovisionnement :
 *   • `recomputeStatut`      — règles OK / BAS / RUPTURE
 *   • `toRefillItem`         — discriminant kind aliment/véto
 *   • `buildRefillPayloads`  — prépare UPDATE STOCK + APPEND FINANCES
 *
 * Les tests d'intégration offline (`enqueueUpdateRow` vs `enqueueAppendRow`)
 * vérifient que la queue garde des entrées distinctes pour STOCK_* et
 * FINANCES — c'est le comportement réel observé sur le module `offlineQueue`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recomputeStatut,
  toRefillItem,
  buildRefillPayloads,
  toFrDate,
  toIsoDateInput,
  labelFor,
  type RefillStockItem,
} from './quickRefillLogic';
import type { StockAliment, StockVeto } from '../../types/farm';

// ── Mock Capacitor pour isoler offlineQueue en mode web ────────────────────
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: (): boolean => false },
}));

// Preferences → mémoire locale pour simuler la persistance queue
const prefsStore = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: prefsStore.get(key) ?? null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      prefsStore.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      prefsStore.delete(key);
    }),
    keys: vi.fn(async () => ({ keys: Array.from(prefsStore.keys()) })),
    clear: vi.fn(async () => {
      prefsStore.clear();
    }),
  },
}));

// googleSheets est importé par offlineQueue — on stub pour éviter fetch/node
vi.mock('../../services/googleSheets', () => ({
  updateRowById: vi.fn(async () => ({ success: true })),
  appendRow: vi.fn(async () => ({ success: true })),
}));

// ── Helpers fixtures ───────────────────────────────────────────────────────

function makeAliment(over: Partial<StockAliment> = {}): StockAliment {
  return {
    id: 'ALIM-01',
    libelle: 'Truie gestation',
    stockActuel: 0,
    unite: 'kg',
    seuilAlerte: 100,
    statutStock: 'RUPTURE',
    ...over,
  };
}

function makeVeto(over: Partial<StockVeto> = {}): StockVeto {
  return {
    id: 'VET-03',
    produit: 'Ivermectine',
    type: 'Antiparasitaire',
    usage: 'Déparasitage',
    stockActuel: 0,
    unite: 'mL',
    stockMin: 10,
    seuilAlerte: 20,
    statutStock: 'RUPTURE',
    ...over,
  };
}

// ─── recomputeStatut ────────────────────────────────────────────────────────

describe('recomputeStatut', () => {
  it('retourne RUPTURE quand stock <= 0', () => {
    expect(recomputeStatut(0, 100)).toBe('RUPTURE');
    expect(recomputeStatut(-5, 100)).toBe('RUPTURE');
  });

  it('retourne BAS quand 0 < stock <= seuilAlerte', () => {
    expect(recomputeStatut(100, 100)).toBe('BAS');
    expect(recomputeStatut(50, 100)).toBe('BAS');
    expect(recomputeStatut(0.5, 1)).toBe('BAS');
  });

  it('retourne OK quand stock > seuilAlerte', () => {
    expect(recomputeStatut(101, 100)).toBe('OK');
    expect(recomputeStatut(500, 100)).toBe('OK');
  });

  it('retourne OK quand seuilAlerte <= 0 et stock > 0', () => {
    // Pas de seuil configuré : dès qu'on a du stock, c'est OK.
    expect(recomputeStatut(10, 0)).toBe('OK');
    expect(recomputeStatut(10, -1)).toBe('OK');
  });

  it('transition RUPTURE → OK après ajout au-dessus du seuil', () => {
    const item = makeAliment({ stockActuel: 0, seuilAlerte: 100 });
    const newStock = item.stockActuel + 500;
    expect(recomputeStatut(newStock, item.seuilAlerte)).toBe('OK');
  });
});

// ─── Date helpers ───────────────────────────────────────────────────────────

describe('toFrDate / toIsoDateInput', () => {
  it('convertit YYYY-MM-DD → DD/MM/YYYY', () => {
    expect(toFrDate('2026-04-19')).toBe('19/04/2026');
    expect(toFrDate('2026-01-05')).toBe('05/01/2026');
  });

  it('renvoie la date ISO du jour au bon format YYYY-MM-DD', () => {
    const iso = toIsoDateInput(new Date(2026, 3, 19)); // avril = index 3
    expect(iso).toBe('2026-04-19');
  });
});

// ─── toRefillItem / labelFor ────────────────────────────────────────────────

describe('toRefillItem + labelFor', () => {
  it('retourne le libelle pour un aliment', () => {
    const item = toRefillItem(makeAliment(), 'ALIMENT');
    expect(item.kind).toBe('ALIMENT');
    expect(labelFor(item)).toBe('Truie gestation');
  });

  it('retourne le produit pour un véto', () => {
    const item = toRefillItem(makeVeto(), 'VETO');
    expect(item.kind).toBe('VETO');
    expect(labelFor(item)).toBe('Ivermectine');
  });
});

// ─── buildRefillPayloads ────────────────────────────────────────────────────

describe('buildRefillPayloads', () => {
  it('happy path : 500 kg ajoutés sur aliment en RUPTURE → statut OK', () => {
    const item: RefillStockItem = toRefillItem(
      makeAliment({ stockActuel: 0, seuilAlerte: 100, statutStock: 'RUPTURE' }),
      'ALIMENT',
    );

    const payloads = buildRefillPayloads({
      item,
      quantite: 500,
      dateIso: '2026-04-19',
    });

    expect(payloads.stockSheet).toBe('STOCK_ALIMENTS');
    expect(payloads.stockIdHeader).toBe('ID');
    expect(payloads.stockIdValue).toBe('ALIM-01');
    expect(payloads.stockPatch.STOCK_ACTUEL).toBe(500);
    expect(payloads.stockPatch.STATUT_STOCK).toBe('OK');
    // Pas de prix → pas de ligne finance
    expect(payloads.financeValues).toBeNull();
  });

  it('prix fourni → ligne FINANCES créée avec categorie ALIMENT + montant total', () => {
    const item = toRefillItem(
      makeAliment({ id: 'ALIM-01', libelle: 'Truie gestation', stockActuel: 0 }),
      'ALIMENT',
    );

    const payloads = buildRefillPayloads({
      item,
      quantite: 500,
      fournisseur: 'SENAC Feed',
      prixUnitaire: 350,
      dateIso: '2026-04-19',
    });

    expect(payloads.financeValues).not.toBeNull();
    const values = payloads.financeValues!;
    // Schema FINANCES : DATE · CATEGORIE · LIBELLE · MONTANT · TYPE · NOTES
    expect(values[0]).toBe('19/04/2026');
    expect(values[1]).toBe('ALIMENT');
    expect(values[2]).toBe('Reapprovisionnement Truie gestation');
    expect(values[3]).toBe(500 * 350); // 175 000
    expect(values[4]).toBe('DEPENSE');
    expect(String(values[5])).toContain('ref:ALIM-01');
    expect(String(values[5])).toContain('fournisseur:SENAC Feed');
  });

  it('véto : categorie FINANCES = SANTE + sheet STOCK_VETO', () => {
    const item = toRefillItem(makeVeto({ stockActuel: 0, seuilAlerte: 20 }), 'VETO');

    const payloads = buildRefillPayloads({
      item,
      quantite: 30,
      prixUnitaire: 250,
      dateIso: '2026-04-19',
    });

    expect(payloads.stockSheet).toBe('STOCK_VETO');
    expect(payloads.stockPatch.STOCK_ACTUEL).toBe(30);
    expect(payloads.stockPatch.STATUT_STOCK).toBe('OK'); // 30 > seuil 20
    expect(payloads.financeValues?.[1]).toBe('SANTE');
    expect(payloads.financeValues?.[3]).toBe(7500);
  });

  it('prix zéro ou vide → pas de ligne finance', () => {
    const item = toRefillItem(makeAliment(), 'ALIMENT');
    expect(
      buildRefillPayloads({ item, quantite: 100, prixUnitaire: 0, dateIso: '2026-04-19' })
        .financeValues,
    ).toBeNull();
    expect(
      buildRefillPayloads({ item, quantite: 100, dateIso: '2026-04-19' }).financeValues,
    ).toBeNull();
  });

  it('recompute BAS si newStock au-dessus de 0 mais <= seuil', () => {
    const item = toRefillItem(
      makeAliment({ stockActuel: 0, seuilAlerte: 100 }),
      'ALIMENT',
    );
    const payloads = buildRefillPayloads({
      item,
      quantite: 50,
      dateIso: '2026-04-19',
    });
    expect(payloads.stockPatch.STATUT_STOCK).toBe('BAS');
    expect(payloads.stockPatch.STOCK_ACTUEL).toBe(50);
  });
});

// ─── Intégration offlineQueue : STOCK_* et FINANCES distincts ──────────────

describe('Offline queue — réappro produit deux entrées distinctes', () => {
  beforeEach(async () => {
    prefsStore.clear();
    // Force reload du cache mémoire de la queue
    const mod = await import('../../services/offlineQueue');
    await mod.clearQueue();
  });

  afterEach(() => {
    prefsStore.clear();
  });

  it('enqueue STOCK_ALIMENTS puis FINANCES → 2 items distincts dans la queue', async () => {
    const { enqueueUpdateRow, enqueueAppendRow, getQueueStatus } = await import(
      '../../services/offlineQueue'
    );

    const item = toRefillItem(
      makeAliment({ id: 'ALIM-01', stockActuel: 0 }),
      'ALIMENT',
    );
    const payloads = buildRefillPayloads({
      item,
      quantite: 500,
      prixUnitaire: 350,
      dateIso: '2026-04-19',
    });

    await enqueueUpdateRow(
      payloads.stockSheet,
      payloads.stockIdHeader,
      payloads.stockIdValue,
      payloads.stockPatch,
    );
    expect(payloads.financeValues).not.toBeNull();
    await enqueueAppendRow('FINANCES', payloads.financeValues!);

    const { pending, items } = getQueueStatus();
    expect(pending).toBe(2);

    // Item 1 — update STOCK_ALIMENTS
    const upd = items.find((i) => i.action === 'update_row_by_id');
    expect(upd).toBeDefined();
    if (upd && upd.action === 'update_row_by_id') {
      expect(upd.payload.sheet).toBe('STOCK_ALIMENTS');
      expect(upd.payload.idHeader).toBe('ID');
      expect(upd.payload.idValue).toBe('ALIM-01');
      expect(upd.payload.patch.STOCK_ACTUEL).toBe(500);
      expect(upd.payload.patch.STATUT_STOCK).toBe('OK');
    }

    // Item 2 — append FINANCES
    const app = items.find((i) => i.action === 'append_row');
    expect(app).toBeDefined();
    if (app && app.action === 'append_row') {
      expect(app.payload.sheet).toBe('FINANCES');
      expect(app.payload.values[1]).toBe('ALIMENT');
      expect(app.payload.values[3]).toBe(175_000);
      expect(app.payload.values[4]).toBe('DEPENSE');
    }
  });

  it('pas de prix → queue ne contient que l\'update STOCK_*', async () => {
    const { enqueueUpdateRow, getQueueStatus } = await import(
      '../../services/offlineQueue'
    );

    const item = toRefillItem(makeVeto({ id: 'VET-03', stockActuel: 0 }), 'VETO');
    const payloads = buildRefillPayloads({
      item,
      quantite: 30,
      dateIso: '2026-04-19',
    });

    await enqueueUpdateRow(
      payloads.stockSheet,
      payloads.stockIdHeader,
      payloads.stockIdValue,
      payloads.stockPatch,
    );

    expect(payloads.financeValues).toBeNull();
    const { pending, items } = getQueueStatus();
    expect(pending).toBe(1);
    if (items[0].action === 'update_row_by_id') {
      expect(items[0].payload.sheet).toBe('STOCK_VETO');
    }
  });
});
