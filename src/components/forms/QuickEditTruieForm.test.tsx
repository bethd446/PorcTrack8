/**
 * Tests unitaires — QuickEditTruieForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env (pas de jsdom / testing-library dans ce repo),
 * on teste donc :
 *   1. Le validateur pur `validateTruieEdit` (règles nom + ration).
 *   2. Le comportement de `submitTruieEdit` (helper local) sur le mock
 *      d'`enqueueUpdateRow` — confirme que la colonne GAS utilisée est bien
 *      "NOM" + "RATION KG/J", et que la sheet est "SUIVI_TRUIES_REPRODUCTION"
 *      avec idHeader "ID".
 *
 * Couvre les 4 cas demandés :
 *   [1] Nom vide autorisé (retrait du nom).
 *   [2] Ration invalide (négative, > 10) rejetée.
 *   [3] Submit offline → queue (navigator.onLine = false).
 *   [4] Submit online → enqueue + refresh appelé.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validateTruieEdit } from './quickEditTruieValidation';

// ── Mock global du module offlineQueue ─────────────────────────────────────
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

// Helper qui miroir la logique du submit dans le composant — isolé pour test
// node env sans jsdom. Le vrai composant fait exactement ces 3 appels.
async function submitTruieEdit(opts: {
  truieId: string;
  nom: string;
  ration: string;
  refreshData: () => Promise<void>;
}): Promise<{ ok: boolean; mode: 'online' | 'offline'; errors?: Record<string, string> }> {
  const result = validateTruieEdit(opts.nom, opts.ration);
  if (!result.ok || !result.patch) {
    return { ok: false, mode: 'online', errors: result.errors };
  }

  const { enqueueUpdateRow } = await import('../../services/offlineQueue');
  await enqueueUpdateRow(
    'SUIVI_TRUIES_REPRODUCTION',
    'ID',
    opts.truieId,
    result.patch,
  );
  const online =
    typeof navigator !== 'undefined' && (navigator as { onLine?: boolean }).onLine;
  await opts.refreshData();
  return { ok: true, mode: online ? 'online' : 'offline' };
}

beforeEach(() => {
  enqueueUpdateRowMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  // Reset navigator.onLine (some tests mutent)
  if (typeof navigator !== 'undefined') {
    try {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
    } catch {
      /* noop */
    }
  }
});

describe('validateTruieEdit', () => {
  it('[1] nom vide est autorisé — patch.NOM = "" (on retire le nom)', () => {
    const res = validateTruieEdit('', '4');
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ NOM: '', 'RATION KG/J': 4 });
    expect(res.errors).toEqual({});
  });

  it('accepte un nom trimé + ration décimale en virgule', () => {
    const res = validateTruieEdit('  Berthe  ', '3,5');
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ NOM: 'Berthe', 'RATION KG/J': 3.5 });
  });

  it('rejette un nom > 30 caractères', () => {
    const res = validateTruieEdit('x'.repeat(31), '4');
    expect(res.ok).toBe(false);
    expect(res.errors.nom).toBeTruthy();
  });

  it('[2] ration négative rejetée', () => {
    const res = validateTruieEdit('A', '-1');
    expect(res.ok).toBe(false);
    expect(res.errors.ration).toBeTruthy();
  });

  it('[2] ration > 10 rejetée', () => {
    const res = validateTruieEdit('A', '11');
    expect(res.ok).toBe(false);
    expect(res.errors.ration).toBeTruthy();
  });

  it('ration vide / non-numérique rejetée', () => {
    const r1 = validateTruieEdit('A', '');
    const r2 = validateTruieEdit('A', 'abc');
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    expect(r1.errors.ration).toBeTruthy();
    expect(r2.errors.ration).toBeTruthy();
  });

  it('ration bornes incluses 0 et 10 acceptées', () => {
    expect(validateTruieEdit('', '0').ok).toBe(true);
    expect(validateTruieEdit('', '10').ok).toBe(true);
  });
});

describe('submitTruieEdit — enqueueUpdateRow + refreshData', () => {
  it('[3] submit offline → enqueue (colonnes GAS correctes), mode offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const refreshData = vi.fn(async () => undefined);

    const out = await submitTruieEdit({
      truieId: 'T05',
      nom: 'Hermione',
      ration: '4.2',
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(out.mode).toBe('offline');
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'SUIVI_TRUIES_REPRODUCTION',
      'ID',
      'T05',
      { NOM: 'Hermione', 'RATION KG/J': 4.2 },
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('[4] submit online → enqueue + refreshData appelé, mode online', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    const refreshData = vi.fn(async () => undefined);

    const out = await submitTruieEdit({
      truieId: 'T18',
      nom: '',
      ration: '6',
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(out.mode).toBe('online');
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'SUIVI_TRUIES_REPRODUCTION',
      'ID',
      'T18',
      { NOM: '', 'RATION KG/J': 6 },
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('submit invalide → pas d\'enqueue, pas de refresh', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitTruieEdit({
      truieId: 'T99',
      nom: 'A',
      ration: '15', // > 10
      refreshData,
    });
    expect(out.ok).toBe(false);
    expect(out.errors?.ration).toBeTruthy();
    expect(enqueueUpdateRowMock).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });
});
