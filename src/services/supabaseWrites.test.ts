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
  addPorcelet,
  removePorcelet,
  setPorceletStatut,
  insertHealthLogForPorcelet,
  listHealthLogsForPorcelet,
  setCurrentFarmIdRef,
  __resetCurrentFarmIdRefForTests,
} = await import('./supabaseWrites');

const FARM_ID = 'farm-uuid-aaaa';
const BATCH_ID = 'batch-uuid-1111';
const SOW_ID = 'sow-uuid-2222';
const LOGE_ID = 'loge-uuid-3333';
// V71-P2 — UUID d'une ferme distincte de auth.uid() pour tester la priorité
// `currentFarmId` du FarmContext sur le fallback `auth.uid()`.
const CURRENT_FARM_ID = 'farm-uuid-current-bbbb';

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
  // V71-P2 — Reset entre tests pour éviter les fuites d'état.
  __resetCurrentFarmIdRefForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  __resetCurrentFarmIdRefForTests();
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

// ════════════════════════════════════════════════════════════════════════
// V25 — Tests porcelets_individuels
// ════════════════════════════════════════════════════════════════════════

describe('V25 — addPorcelet', () => {
  it('insert avec farm_id auto-injecté + statut VIVANT par défaut', async () => {
    mockChain.single.mockResolvedValueOnce({
      data: {
        id: 'porc-1',
        batch_id: BATCH_ID,
        boucle: 'P-001',
        sexe: 'M',
        poids_courant_kg: 1.5,
        statut: 'VIVANT',
        notes: null,
      },
      error: null,
    });

    const res = await addPorcelet({
      batchId: BATCH_ID,
      boucle: 'P-001',
      sexe: 'M',
      poidsCourantKg: 1.5,
    });

    expect(res.id).toBe('porc-1');
    expect(res.boucle).toBe('P-001');
    expect(res.sexe).toBe('M');
    expect(res.statut).toBe('VIVANT');
    expect(res.poidsCourantKg).toBe(1.5);
    expect(getSessionMock).toHaveBeenCalled();
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        farm_id: FARM_ID,
        batch_id: BATCH_ID,
        boucle: 'P-001',
        sexe: 'M',
        poids_courant_kg: 1.5,
        statut: 'VIVANT',
      }),
    );
  });

  it('rejette si batchId vide', async () => {
    await expect(
      addPorcelet({ batchId: '', boucle: 'P-001', sexe: 'M' }),
    ).rejects.toThrow(/batchId/);
  });

  it('rejette si boucle vide', async () => {
    await expect(
      addPorcelet({ batchId: BATCH_ID, boucle: '   ', sexe: 'F' }),
    ).rejects.toThrow(/boucle/);
  });

  it('propage l\'erreur Supabase (UNIQUE violation)', async () => {
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    });
    await expect(
      addPorcelet({ batchId: BATCH_ID, boucle: 'P-001', sexe: 'F' }),
    ).rejects.toThrow(/insert failed/);
  });
});

describe('V25 — removePorcelet', () => {
  it('appelle delete().eq(id)', async () => {
    const eqOriginal = mockChain.eq;
    mockChain.eq = vi.fn().mockImplementation((...args) => {
      eqOriginal.apply(mockChain, args);
      return Promise.resolve({ error: null });
    }) as typeof eqOriginal;

    await expect(removePorcelet('porc-1')).resolves.toBeUndefined();
    expect(fromSpy).toHaveBeenCalledWith('porcelets_individuels');
    mockChain.eq = eqOriginal;
  });

  it('rejette si id manquant', async () => {
    await expect(removePorcelet('')).rejects.toThrow(/ID manquant/);
  });
});

describe('V25 — setPorceletStatut', () => {
  it('patche le statut via update().eq()', async () => {
    const eqOriginal = mockChain.eq;
    mockChain.eq = vi.fn().mockImplementation((...args) => {
      eqOriginal.apply(mockChain, args);
      return Promise.resolve({ error: null });
    }) as typeof eqOriginal;

    await expect(setPorceletStatut('porc-1', 'MORT')).resolves.toBeUndefined();
    expect(fromSpy).toHaveBeenCalledWith('porcelets_individuels');
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'MORT' }),
    );
    mockChain.eq = eqOriginal;
  });

  it('rejette si id manquant', async () => {
    await expect(setPorceletStatut('', 'VIVANT')).rejects.toThrow(/ID manquant/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// V25 — Tests insertHealthLogForPorcelet + listHealthLogsForPorcelet (Sprint D)
// ════════════════════════════════════════════════════════════════════════

describe('V25 — insertHealthLogForPorcelet', () => {
  const PORC_ID = 'porc-uuid-aaaa';

  it('insert health_log avec porcelet_id + animal_type=PORCELET', async () => {
    const insertOriginal = mockChain.insert;
    mockChain.insert = vi.fn().mockImplementation((...args) => {
      insertOriginal.apply(mockChain, args);
      return Promise.resolve({ error: null });
    }) as typeof insertOriginal;

    await insertHealthLogForPorcelet({
      porceletId: PORC_ID,
      batchId: BATCH_ID,
      logType: 'VACCIN',
      symptome: 'aucun',
      treatment: 'Vaccin peste',
      doseCount: 1,
    });

    expect(fromSpy).toHaveBeenCalledWith('health_logs');
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        farm_id: FARM_ID,
        animal_type: 'PORCELET',
        porcelet_id: PORC_ID,
        batch_id: BATCH_ID,
        log_type: 'VACCIN',
        symptom: 'aucun',
        treatment: 'Vaccin peste',
        dose_count: 1,
      }),
    );
    mockChain.insert = insertOriginal;
  });

  it('CONSULT → patche porcelet.statut = MALADE après insert', async () => {
    const insertOriginal = mockChain.insert;
    mockChain.insert = vi.fn().mockImplementation((...args) => {
      insertOriginal.apply(mockChain, args);
      return Promise.resolve({ error: null });
    }) as typeof insertOriginal;

    const eqOriginal = mockChain.eq;
    mockChain.eq = vi.fn().mockImplementation((...args) => {
      eqOriginal.apply(mockChain, args);
      return Promise.resolve({ error: null });
    }) as typeof eqOriginal;

    await insertHealthLogForPorcelet({
      porceletId: PORC_ID,
      batchId: BATCH_ID,
      logType: 'CONSULT',
      symptome: 'toux',
    });

    expect(fromSpy).toHaveBeenCalledWith('porcelets_individuels');
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'MALADE' }),
    );

    mockChain.insert = insertOriginal;
    mockChain.eq = eqOriginal;
  });

  it('VACCIN → ne patche PAS le statut porcelet', async () => {
    const insertOriginal = mockChain.insert;
    mockChain.insert = vi.fn().mockImplementation((...args) => {
      insertOriginal.apply(mockChain, args);
      return Promise.resolve({ error: null });
    }) as typeof insertOriginal;

    await insertHealthLogForPorcelet({
      porceletId: PORC_ID,
      batchId: BATCH_ID,
      logType: 'VACCIN',
      symptome: 'aucun',
    });

    expect(fromSpy).toHaveBeenCalledWith('health_logs');
    expect(fromSpy).not.toHaveBeenCalledWith('porcelets_individuels');
    mockChain.insert = insertOriginal;
  });

  it('rejette si porceletId manquant', async () => {
    await expect(
      insertHealthLogForPorcelet({
        porceletId: '',
        batchId: BATCH_ID,
        logType: 'CONSULT',
      }),
    ).rejects.toThrow(/porceletId/);
  });

  it('rejette si batchId manquant', async () => {
    await expect(
      insertHealthLogForPorcelet({
        porceletId: PORC_ID,
        batchId: '',
        logType: 'CONSULT',
      }),
    ).rejects.toThrow(/batchId/);
  });

  it('rejette doseCount hors borne (0..50)', async () => {
    await expect(
      insertHealthLogForPorcelet({
        porceletId: PORC_ID,
        batchId: BATCH_ID,
        logType: 'TRAITEMENT',
        doseCount: 51,
      }),
    ).rejects.toThrow(/doseCount/);
  });

  it('rejette weightKg hors borne (0..200)', async () => {
    await expect(
      insertHealthLogForPorcelet({
        porceletId: PORC_ID,
        batchId: BATCH_ID,
        logType: 'CONSULT',
        weightKg: 250,
      }),
    ).rejects.toThrow(/weightKg/);
  });

  it('propage l\'erreur Supabase sur insert', async () => {
    const insertOriginal = mockChain.insert;
    mockChain.insert = vi.fn().mockImplementation((...args) => {
      insertOriginal.apply(mockChain, args);
      return Promise.resolve({ error: { message: 'RLS denied' } });
    }) as typeof insertOriginal;

    await expect(
      insertHealthLogForPorcelet({
        porceletId: PORC_ID,
        batchId: BATCH_ID,
        logType: 'CONSULT',
      }),
    ).rejects.toThrow(/insert porcelet failed/);
    mockChain.insert = insertOriginal;
  });
});

describe('V25 — listHealthLogsForPorcelet', () => {
  const PORC_ID = 'porc-uuid-bbbb';

  it('retourne logs mappés (snake → camel)', async () => {
    mockChain.order.mockResolvedValueOnce({
      data: [
        {
          id: 'hl-1',
          porcelet_id: PORC_ID,
          batch_id: BATCH_ID,
          log_type: 'CONSULT',
          symptom: 'fièvre',
          diagnosis: null,
          treatment: null,
          dose_count: null,
          weight_kg: 5.2,
          notes: 'observ.',
          logged_at: '2026-05-02T10:00:00Z',
          log_date: '2026-05-02',
        },
      ],
      error: null,
    });

    const res = await listHealthLogsForPorcelet(PORC_ID);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      id: 'hl-1',
      porceletId: PORC_ID,
      batchId: BATCH_ID,
      logType: 'CONSULT',
      symptome: 'fièvre',
      weightKg: 5.2,
      notes: 'observ.',
    });
    mockChain.order.mockReturnThis();
  });

  it('retourne [] si porceletId vide', async () => {
    const res = await listHealthLogsForPorcelet('');
    expect(res).toEqual([]);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('retourne [] si erreur Supabase', async () => {
    mockChain.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'RLS denied' },
    });
    const res = await listHealthLogsForPorcelet(PORC_ID);
    expect(res).toEqual([]);
    mockChain.order.mockReturnThis();
  });
});

// ════════════════════════════════════════════════════════════════════════
// V71-P2 — Tests multi-user : getFarmId() priorise currentFarmIdRef
// ════════════════════════════════════════════════════════════════════════

describe('V71-P2 — getFarmId via currentFarmIdRef (multi-user)', () => {
  it('utilise currentFarmIdRef quand setCurrentFarmIdRef() a été appelé', async () => {
    // Set la ferme courante (simule FarmContext.switchFarm())
    setCurrentFarmIdRef(CURRENT_FARM_ID);

    // Stub insert path : un addPorcelet déclenche getFarmId() en interne.
    mockChain.single.mockResolvedValueOnce({
      data: {
        id: 'porc-x',
        batch_id: BATCH_ID,
        boucle: 'P-X',
        sexe: 'M',
        poids_courant_kg: null,
        statut: 'VIVANT',
        notes: null,
      },
      error: null,
    });

    await addPorcelet({ batchId: BATCH_ID, boucle: 'P-X', sexe: 'M' });

    // Le farm_id injecté doit être CURRENT_FARM_ID (priorité), pas FARM_ID.
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ farm_id: CURRENT_FARM_ID }),
    );
    // Et getSession() ne doit PAS avoir été appelé puisque la ref a court-circuité.
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('retombe sur auth.uid() (fallback) si currentFarmIdRef est null', async () => {
    // Pas de setCurrentFarmIdRef → ref est null après __resetCurrentFarmIdRefForTests.
    mockChain.single.mockResolvedValueOnce({
      data: {
        id: 'porc-y',
        batch_id: BATCH_ID,
        boucle: 'P-Y',
        sexe: 'F',
        poids_courant_kg: null,
        statut: 'VIVANT',
        notes: null,
      },
      error: null,
    });

    await addPorcelet({ batchId: BATCH_ID, boucle: 'P-Y', sexe: 'F' });

    // Fallback → farm_id = auth.uid() = FARM_ID (mock).
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ farm_id: FARM_ID }),
    );
    expect(getSessionMock).toHaveBeenCalled();
  });

  it('switch de ferme : changement dynamique de la ref', async () => {
    setCurrentFarmIdRef(CURRENT_FARM_ID);
    mockChain.single.mockResolvedValueOnce({
      data: { id: 'p1', batch_id: BATCH_ID, boucle: 'A', sexe: 'M', poids_courant_kg: null, statut: 'VIVANT', notes: null },
      error: null,
    });
    await addPorcelet({ batchId: BATCH_ID, boucle: 'A', sexe: 'M' });
    expect(mockChain.insert).toHaveBeenLastCalledWith(
      expect.objectContaining({ farm_id: CURRENT_FARM_ID }),
    );

    // Bascule sur une autre ferme.
    const OTHER_FARM = 'farm-uuid-other-cccc';
    setCurrentFarmIdRef(OTHER_FARM);
    mockChain.single.mockResolvedValueOnce({
      data: { id: 'p2', batch_id: BATCH_ID, boucle: 'B', sexe: 'F', poids_courant_kg: null, statut: 'VIVANT', notes: null },
      error: null,
    });
    await addPorcelet({ batchId: BATCH_ID, boucle: 'B', sexe: 'F' });
    expect(mockChain.insert).toHaveBeenLastCalledWith(
      expect.objectContaining({ farm_id: OTHER_FARM }),
    );
  });
});
