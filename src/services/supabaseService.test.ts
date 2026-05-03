/**
 * Tests unitaires — supabaseService (V36 short_code mapping)
 * ════════════════════════════════════════════════════════════════════════
 * Vérifie que les queries getStockVeto / getStockAliments remontent bien
 * `short_code` (colonne SQL) dans `shortCode` (champ TS), et restent
 * tolérantes quand la colonne est absente (avant migration appliquée).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock supabaseClient AVANT import du module testé.
const mockChain = {
  select: vi.fn().mockReturnThis(),
  order:  vi.fn().mockReturnThis(),
};

const fromSpy = vi.fn((_table: string) => mockChain);

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => fromSpy(table),
    auth: { getSession: vi.fn() },
  },
  isSupabaseConfigured: true,
}));

// Imports APRÈS le mock.
const { getStockVeto, getStockAliments } = await import('./supabaseService');

beforeEach(() => {
  vi.clearAllMocks();
  mockChain.select.mockReturnThis();
  mockChain.order.mockReturnThis();
});

describe('getStockVeto — V36 shortCode mapping', () => {
  it('remonte shortCode quand la colonne short_code est présente', async () => {
    mockChain.order.mockResolvedValueOnce({
      data: [
        {
          id: 'veto-1',
          libelle: 'Ivermectine',
          type: 'Antiparasitaire',
          usage: 'Injection',
          unite: 'doses',
          stock_actuel: 12,
          stock_min: 5,
          notes: null,
          fournisseur_id: null,
          short_code: 'IVRM',
        },
      ],
      error: null,
    });

    const res = await getStockVeto();
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].shortCode).toBe('IVRM');
    expect(res.data[0].produit).toBe('Ivermectine');
    expect(res.data[0].statutStock).toBe('OK');
  });

  it('laisse shortCode undefined si la colonne short_code est absente', async () => {
    mockChain.order.mockResolvedValueOnce({
      data: [
        {
          id: 'veto-2',
          libelle: 'Vétéranol',
          type: null,
          usage: null,
          unite: 'doses',
          stock_actuel: 0,
          stock_min: 5,
          notes: null,
          fournisseur_id: null,
        },
      ],
      error: null,
    });

    const res = await getStockVeto();
    expect(res.success).toBe(true);
    expect(res.data[0].shortCode).toBeUndefined();
    expect(res.data[0].statutStock).toBe('RUPTURE');
  });
});

describe('getStockAliments — V36 shortCode mapping', () => {
  it('remonte shortCode quand short_code est présent', async () => {
    mockChain.order.mockResolvedValueOnce({
      data: [
        {
          id: 'al-1',
          libelle: 'Maïs concassé',
          unite: 'kg',
          stock_actuel: 250,
          seuil_alerte: 50,
          notes: 'Sac 50kg',
          fournisseur_id: null,
          short_code: 'MAIS-CONCASSE',
        },
      ],
      error: null,
    });

    const res = await getStockAliments();
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].shortCode).toBe('MAIS-CONCASSE');
    expect(res.data[0].libelle).toBe('Maïs concassé');
    expect(res.data[0].statutStock).toBe('OK');
  });

  it('laisse shortCode undefined si la colonne short_code est absente', async () => {
    mockChain.order.mockResolvedValueOnce({
      data: [
        {
          id: 'al-2',
          libelle: 'Tourteau soja',
          unite: 'kg',
          stock_actuel: 30,
          seuil_alerte: 50,
          notes: null,
          fournisseur_id: null,
        },
      ],
      error: null,
    });

    const res = await getStockAliments();
    expect(res.success).toBe(true);
    expect(res.data[0].shortCode).toBeUndefined();
    expect(res.data[0].statutStock).toBe('BAS');
  });
});
