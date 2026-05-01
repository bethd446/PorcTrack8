/**
 * Tests unitaires — supabaseWrites.findLastSaillieForTruie
 * ════════════════════════════════════════════════════════════════════════
 * Couvre la résolution automatique de la saillie source pour le workflow
 * Saillie → Mise-bas → Auto-création bande/portée.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock supabaseClient AVANT import du module testé.
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
};

const fromSpy = vi.fn((_table: string) => mockChain);

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => fromSpy(table),
  },
  isSupabaseConfigured: true,
}));

// Imports APRÈS le mock.
const { findLastSaillieForTruie } = await import('./supabaseWrites');

beforeEach(() => {
  vi.clearAllMocks();
  mockChain.select.mockReturnThis();
  mockChain.eq.mockReturnThis();
  mockChain.lte.mockReturnThis();
  mockChain.gte.mockReturnThis();
  mockChain.order.mockReturnThis();
  mockChain.limit.mockReturnThis();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('findLastSaillieForTruie', () => {
  const sowUuid = '12345678-1234-1234-1234-123456789abc';
  const dateMB = new Date('2026-04-25');

  it('renvoie la saillie la plus récente avec boar_id et code', async () => {
    mockChain.maybeSingle.mockResolvedValueOnce({
      data: {
        boar_id: 'aaaa1111-2222-3333-4444-555555555555',
        boar_code_id: 'V01',
        date_saillie: '2026-01-01',
        boars: { code_id: 'V01' },
      },
      error: null,
    });

    const res = await findLastSaillieForTruie(sowUuid, dateMB);
    expect(res).not.toBeNull();
    expect(res!.boar_id).toBe('aaaa1111-2222-3333-4444-555555555555');
    expect(res!.boar_code_id).toBe('V01');
    expect(res!.date_saillie).toBe('2026-01-01');
  });

  it('renvoie null si aucune saillie dans la fenêtre (130 jours)', async () => {
    mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const res = await findLastSaillieForTruie(sowUuid, dateMB);
    expect(res).toBeNull();
  });

  it('renvoie null si truie vide', async () => {
    const res = await findLastSaillieForTruie('', dateMB);
    expect(res).toBeNull();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('renvoie null si erreur Supabase', async () => {
    mockChain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'RLS denied' },
    });
    const res = await findLastSaillieForTruie(sowUuid, dateMB);
    expect(res).toBeNull();
  });

  it('renvoie null si dateMB invalide', async () => {
    const res = await findLastSaillieForTruie(sowUuid, new Date('not-a-date'));
    expect(res).toBeNull();
  });

  it('utilise la fenêtre 130 jours par défaut (115 ± 15)', async () => {
    mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await findLastSaillieForTruie(sowUuid, dateMB);

    // upper bound = dateMB
    expect(mockChain.lte).toHaveBeenCalledWith('date_saillie', '2026-04-25');
    // lower bound = dateMB - 130j → 2025-12-16
    expect(mockChain.gte).toHaveBeenCalledWith('date_saillie', '2025-12-16');
  });

  it('accepte une fenêtre custom', async () => {
    mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await findLastSaillieForTruie(sowUuid, dateMB, 30);
    expect(mockChain.gte).toHaveBeenCalledWith('date_saillie', '2026-03-26');
  });

  it('résout un code_id (T07) en sow_id avant la query', async () => {
    // 1er appel : resolve sows.id depuis code_id
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: { id: sowUuid }, error: null })
      .mockResolvedValueOnce({
        data: {
          boar_id: 'bbbb',
          boar_code_id: 'V02',
          date_saillie: '2026-02-01',
          boars: { code_id: 'V02' },
        },
        error: null,
      });

    const res = await findLastSaillieForTruie('T07', dateMB);
    expect(res).not.toBeNull();
    expect(res!.boar_code_id).toBe('V02');
    // Vérifie qu'on a bien fait l'eq('sow_id', sowUuid) sur la 2e query.
    expect(mockChain.eq).toHaveBeenCalledWith('sow_id', sowUuid);
  });
});
