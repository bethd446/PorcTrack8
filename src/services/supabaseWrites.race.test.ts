/**
 * V73 — Tests race conditions farm switch / multi-user.
 *
 * Couvre les scénarios où une mutation est lancée pendant que `currentFarmId`
 * change (switchFarm en cours d'invitation, logout pendant requête, etc.).
 *
 * L'invariant testé : `getFarmId()` lit la ref globale au MOMENT du await
 * `getSession()`, pas au moment de l'appel à `runInsert`. Donc si on switch
 * APRÈS que getFarmId() ait résolu, le payload est déjà figé avec l'ancien
 * farm_id — comportement attendu : les requêtes en vol portent l'ancienne
 * ferme, les nouvelles utilisent la nouvelle.
 *
 * RLS Postgres garantit que même si un farm_id "ancien" arrive après un
 * switchFarm, l'INSERT échoue côté serveur si le user n'a plus le rôle.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
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

const {
  insertSow,
  setCurrentFarmIdRef,
  getCurrentFarmIdRef,
  __resetCurrentFarmIdRefForTests,
} = await import('./supabaseWrites');

const FARM_A = 'farm-uuid-aaaa';
const FARM_B = 'farm-uuid-bbbb';
const USER_ID = 'user-uuid-1234';

beforeEach(() => {
  vi.clearAllMocks();
  mockChain.select.mockReturnThis();
  mockChain.eq.mockReturnThis();
  mockChain.insert.mockReturnThis();
  mockChain.update.mockReturnThis();
  getSessionMock.mockResolvedValue({
    data: { session: { user: { id: USER_ID } } },
    error: null,
  });
  __resetCurrentFarmIdRefForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  __resetCurrentFarmIdRefForTests();
});

describe('V73 — race switchFarm pendant insert', () => {
  it('insert lancé AVANT switchFarm utilise FARM_A (farm_id figé au dispatch)', async () => {
    setCurrentFarmIdRef(FARM_A);
    expect(getCurrentFarmIdRef()).toBe(FARM_A);

    let capturedPayload: Record<string, unknown> | undefined;
    mockChain.single.mockImplementationOnce(async () => ({
      data: { id: 'sow-1', code_id: 'T-A' },
      error: null,
    }));
    mockChain.insert.mockImplementationOnce(function (this: typeof mockChain, payload: Record<string, unknown>) {
      capturedPayload = payload;
      return this;
    });

    const insertPromise = insertSow({ code_id: 'T-A', name: 'Truie A' } as never);

    // Switch APRÈS que insertSow ait été lancé. Note : getFarmId() est synchrone
    // (lit la ref globale) → le payload aura déjà été calculé avec FARM_A.
    setCurrentFarmIdRef(FARM_B);

    await insertPromise;

    expect(capturedPayload).toBeDefined();
    expect(capturedPayload?.farm_id).toBe(FARM_A);
  });

  it('insert lancé APRÈS switchFarm utilise FARM_B', async () => {
    setCurrentFarmIdRef(FARM_A);
    setCurrentFarmIdRef(FARM_B);
    expect(getCurrentFarmIdRef()).toBe(FARM_B);

    let capturedPayload: Record<string, unknown> | undefined;
    mockChain.single.mockImplementationOnce(async () => ({
      data: { id: 'sow-2', code_id: 'T-B' },
      error: null,
    }));
    mockChain.insert.mockImplementationOnce(function (this: typeof mockChain, payload: Record<string, unknown>) {
      capturedPayload = payload;
      return this;
    });

    await insertSow({ code_id: 'T-B', name: 'Truie B' } as never);

    expect(capturedPayload?.farm_id).toBe(FARM_B);
  });

  it('si currentFarmIdRef = null (logout), fallback sur auth.uid()', async () => {
    setCurrentFarmIdRef(null);

    let capturedPayload: Record<string, unknown> | undefined;
    mockChain.single.mockImplementationOnce(async () => ({
      data: { id: 'sow-3', code_id: 'T-C' },
      error: null,
    }));
    mockChain.insert.mockImplementationOnce(function (this: typeof mockChain, payload: Record<string, unknown>) {
      capturedPayload = payload;
      return this;
    });

    await insertSow({ code_id: 'T-C' } as never);

    // Fallback rétro-compat V71-P1 : auth.uid() = USER_ID.
    expect(capturedPayload?.farm_id).toBe(USER_ID);
  });

  it('logout (session=null) après ref reset → throw "connexion requise"', async () => {
    setCurrentFarmIdRef(null);
    getSessionMock.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await expect(insertSow({ code_id: 'T-D' } as never)).rejects.toThrow(
      /connexion requise/i,
    );
  });
});

describe('V73 — concurrent inserts pendant farm switch', () => {
  it('2 inserts lancés rapidement dont 1 avant 1 après switch → 2 farm_id distincts', async () => {
    setCurrentFarmIdRef(FARM_A);

    const captured: Array<Record<string, unknown>> = [];
    mockChain.single.mockResolvedValue({
      data: { id: 'sow-x' },
      error: null,
    });
    mockChain.insert.mockImplementation(function (this: typeof mockChain, payload: Record<string, unknown>) {
      captured.push(payload);
      return this;
    });

    // 1er insert → FARM_A
    const p1 = insertSow({ code_id: 'T-1' } as never);
    // Switch synchronisé entre les 2 inserts
    setCurrentFarmIdRef(FARM_B);
    // 2e insert → FARM_B
    const p2 = insertSow({ code_id: 'T-2' } as never);

    await Promise.all([p1, p2]);

    expect(captured).toHaveLength(2);
    expect(captured[0].farm_id).toBe(FARM_A);
    expect(captured[1].farm_id).toBe(FARM_B);
  });
});

describe('V73 — getCurrentFarmIdRef public getter', () => {
  it('expose la ref pour les services tiers', () => {
    setCurrentFarmIdRef(FARM_A);
    expect(getCurrentFarmIdRef()).toBe(FARM_A);
    setCurrentFarmIdRef(null);
    expect(getCurrentFarmIdRef()).toBeNull();
  });
});
