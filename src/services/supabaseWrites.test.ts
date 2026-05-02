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
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
};

const fromSpy = vi.fn((_table: string) => mockChain);
const getSessionMock = vi.fn();

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => fromSpy(table),
    auth: { getSession: () => getSessionMock() },
  },
  isSupabaseConfigured: true,
}));

// Imports APRÈS le mock.
const {
  findLastSaillieForTruie,
  getBatchSources,
  addBatchSource,
  removeBatchSource,
  listLoges,
  createLoge,
  moveSubject,
} = await import('./supabaseWrites');

const FARM_ID = 'farm-uuid-aaaa';
const BATCH_ID = 'batch-uuid-1111';
const SOW_ID = 'sow-uuid-2222';
const LOGE_ID = 'loge-uuid-3333';

beforeEach(() => {
  vi.clearAllMocks();
  mockChain.select.mockReturnThis();
  mockChain.eq.mockReturnThis();
  mockChain.lte.mockReturnThis();
  mockChain.gte.mockReturnThis();
  mockChain.order.mockReturnThis();
  mockChain.limit.mockReturnThis();
  mockChain.insert.mockReturnThis();
  mockChain.update.mockReturnThis();
  mockChain.delete.mockReturnThis();
  getSessionMock.mockResolvedValue({
    data: { session: { user: { id: FARM_ID } } },
    error: null,
  });
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

// ════════════════════════════════════════════════════════════════════════
// V24 — Tests batch_sows + loges + moveSubject
// ════════════════════════════════════════════════════════════════════════

describe('V24 — getBatchSources', () => {
  it('retourne les sources triées + mappe sows.code_id', async () => {
    // getBatchSources appelle .select().eq().order() — order est terminal.
    // mockReturnThis chaîne, donc on stub la valeur finale via order.
    mockChain.order.mockResolvedValueOnce({
      data: [
        {
          id: 'bs-1',
          batch_id: BATCH_ID,
          sow_id: SOW_ID,
          nb_porcelets_apportes: 10,
          date_ajout: '2026-04-01',
          notes: null,
          sows: { code_id: 'T05', boucle: 'BCL-0001', name: 'Rosa' },
        },
      ],
      error: null,
    });

    const res = await getBatchSources(BATCH_ID);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      id: 'bs-1',
      sowId: SOW_ID,
      sowCode: 'T05',
      sowBoucle: 'BCL-0001',
      sowName: 'Rosa',
      nbPorceletsApportes: 10,
      dateAjout: '2026-04-01',
    });
    // Reset chain return for subsequent tests.
    mockChain.order.mockReturnThis();
  });
});

describe('V24 — addBatchSource', () => {
  it('insert + patch sow_id si batches.sow_id IS NULL', async () => {
    // 1) INSERT batch_sows → single() résout
    mockChain.single.mockResolvedValueOnce({
      data: {
        id: 'bs-new',
        batch_id: BATCH_ID,
        sow_id: SOW_ID,
        nb_porcelets_apportes: 8,
        date_ajout: '2026-05-02',
        notes: null,
        sows: { code_id: 'T07', boucle: 'BCL-0007', name: null },
      },
      error: null,
    });
    // 2) SELECT batches.sow_id → maybeSingle résout sow_id=null
    mockChain.maybeSingle.mockResolvedValueOnce({
      data: { sow_id: null },
      error: null,
    });
    // 3) UPDATE batches.sow_id : runUpdate ne renvoie rien d'attendu — eq retourne {error: null}
    // L'update final passe par .update().eq() — eq() est terminal pour update.
    // On le stub via mockChain.eq sur un appel spécifique.
    // Pour simplifier : on rend eq résoluble en {error: null}.
    const eqOriginal = mockChain.eq;
    mockChain.eq = vi.fn().mockImplementation((...args) => {
      // 3e appel = update().eq('id', BATCH_ID) → résout en promise
      // Comportement permissif : si await sur la valeur, retourne {error:null}
      const ret = eqOriginal.apply(mockChain, args);
      // chained on update : .eq() doit être awaitable
      Object.assign(ret, Promise.resolve({ error: null }));
      return ret;
    }) as typeof eqOriginal;

    const res = await addBatchSource({
      batchId: BATCH_ID,
      sowId: SOW_ID,
      nbPorcelets: 8,
    });

    expect(res.id).toBe('bs-new');
    expect(res.sowCode).toBe('T07');
    expect(res.nbPorceletsApportes).toBe(8);
    // Reset
    mockChain.eq = eqOriginal;
  });

  it('rejette nbPorcelets hors borne (1..30)', async () => {
    await expect(
      addBatchSource({ batchId: BATCH_ID, sowId: SOW_ID, nbPorcelets: 0 }),
    ).rejects.toThrow();
    await expect(
      addBatchSource({ batchId: BATCH_ID, sowId: SOW_ID, nbPorcelets: 31 }),
    ).rejects.toThrow();
  });
});

describe('V24 — removeBatchSource', () => {
  it('appelle delete().eq(id)', async () => {
    // .delete().eq() — eq résout sur un promise-like
    const eqOriginal = mockChain.eq;
    mockChain.eq = vi.fn().mockImplementation((...args) => {
      eqOriginal.apply(mockChain, args);
      return Promise.resolve({ error: null });
    }) as typeof eqOriginal;

    await expect(removeBatchSource('bs-1')).resolves.toBeUndefined();
    expect(fromSpy).toHaveBeenCalledWith('batch_sows');
    mockChain.eq = eqOriginal;
  });

  it('rejette si id manquant', async () => {
    await expect(removeBatchSource('')).rejects.toThrow(/ID manquant/);
  });
});

describe('V24 — listLoges', () => {
  it('retourne loges mappées (snake → camel)', async () => {
    mockChain.order.mockResolvedValueOnce({
      data: [
        {
          id: LOGE_ID,
          numero: 'M-01',
          type: 'MATERNITE',
          batiment: 'Bât. A',
          capacite_max: 8,
          notes: null,
          active: true,
        },
      ],
      error: null,
    });

    const res = await listLoges();
    expect(res).toHaveLength(1);
    expect(res[0]).toEqual({
      id: LOGE_ID,
      numero: 'M-01',
      type: 'MATERNITE',
      batiment: 'Bât. A',
      capaciteMax: 8,
      notes: undefined,
      active: true,
    });
    mockChain.order.mockReturnThis();
  });

  it('retourne [] si erreur Supabase', async () => {
    mockChain.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'RLS denied' },
    });
    const res = await listLoges();
    expect(res).toEqual([]);
    mockChain.order.mockReturnThis();
  });
});

describe('V24 — createLoge', () => {
  it('insert avec farm_id auto-injecté + active=true par défaut', async () => {
    mockChain.single.mockResolvedValueOnce({
      data: {
        id: LOGE_ID,
        numero: 'PS-03',
        type: 'POST_SEVRAGE',
        batiment: null,
        capacite_max: 30,
        notes: null,
        active: true,
      },
      error: null,
    });

    const res = await createLoge({
      numero: 'PS-03',
      type: 'POST_SEVRAGE',
      capaciteMax: 30,
    });

    expect(res.id).toBe(LOGE_ID);
    expect(res.numero).toBe('PS-03');
    expect(res.active).toBe(true);
    // Vérifie que farm_id a été injecté via l'auth mock
    expect(getSessionMock).toHaveBeenCalled();
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        farm_id: FARM_ID,
        numero: 'PS-03',
        type: 'POST_SEVRAGE',
        capacite_max: 30,
        active: true,
      }),
    );
  });

  it('rejette si numero vide', async () => {
    await expect(
      createLoge({ numero: '   ', type: 'AUTRE' }),
    ).rejects.toThrow(/numero requis/);
  });
});

describe('V24 — moveSubject', () => {
  it('lit loge_id actuel + INSERT mvt + UPDATE subject.loge_id', async () => {
    // 1) SELECT subject.loge_id (maybeSingle)
    mockChain.maybeSingle.mockResolvedValueOnce({
      data: { loge_id: 'old-loge' },
      error: null,
    });
    // 2) INSERT loge_movements (single)
    mockChain.single.mockResolvedValueOnce({
      data: {
        id: 'mvt-1',
        subject_type: 'BANDE',
        subject_id: BATCH_ID,
        from_loge_id: 'old-loge',
        to_loge_id: LOGE_ID,
        date_mvt: '2026-05-02',
        reason: 'Sevrage',
      },
      error: null,
    });
    // 3) UPDATE subject — eq résout en promise
    const eqOriginal = mockChain.eq;
    mockChain.eq = vi.fn().mockImplementation((...args) => {
      const ret = eqOriginal.apply(mockChain, args);
      Object.assign(ret, Promise.resolve({ error: null }));
      return ret;
    }) as typeof eqOriginal;

    const res = await moveSubject({
      subjectType: 'BANDE',
      subjectId: BATCH_ID,
      toLogeId: LOGE_ID,
      reason: 'Sevrage',
    });

    expect(res.id).toBe('mvt-1');
    expect(res.subjectType).toBe('BANDE');
    expect(res.fromLogeId).toBe('old-loge');
    expect(res.toLogeId).toBe(LOGE_ID);
    expect(res.dateMvt).toBe('2026-05-02');
    // Vérifie que la table cible est bien batches (BANDE → batches)
    expect(fromSpy).toHaveBeenCalledWith('batches');
    expect(fromSpy).toHaveBeenCalledWith('loge_movements');
    mockChain.eq = eqOriginal;
  });

  it('rejette si subjectId ou toLogeId manquant', async () => {
    await expect(
      moveSubject({
        subjectType: 'TRUIE',
        subjectId: '',
        toLogeId: LOGE_ID,
      }),
    ).rejects.toThrow(/subjectId/);
    await expect(
      moveSubject({
        subjectType: 'TRUIE',
        subjectId: SOW_ID,
        toLogeId: '',
      }),
    ).rejects.toThrow(/toLogeId/);
  });
});
