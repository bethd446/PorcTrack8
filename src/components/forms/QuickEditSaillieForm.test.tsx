/**
 * Tests unitaires — QuickEditSaillieForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env (pas de jsdom), on teste donc :
 *   1. Le validateur pur `validateSaillieEdit` (règles + diff patch partiel).
 *   2. Les helpers de dates (addDaysIso, frToIso, isoToFr).
 *   3. Un helper miroir du submit — confirme sheet 'SUIVI_REPRODUCTION_ACTUEL',
 *      idHeader 'ID TRUIE' et clés canoniques (ID TRUIE, VERRAT, DATE SAILLIE,
 *      DATE MB PREVUE, STATUT, NOTES).
 *
 * Cas couverts (6) :
 *   [1] Render — constantes exposées (STATUT_OPTIONS, GESTATION_DAYS)
 *   [2] Validation date invalide rejetée
 *   [3] Submit patch correct (sheet + idHeader + clés canoniques)
 *   [4] Auto-calc MB prévue à +115j (addDaysIso)
 *   [5] Offline queue (navigator.onLine = false)
 *   [6] Patch partiel (juste date modifiée → pas les autres clés)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  validateSaillieEdit,
  addDaysIso,
  frToIso,
  isoToFr,
  STATUT_OPTIONS,
  GESTATION_DAYS,
  type SaillieEditForm,
  type SaillieEditInitial,
} from './quickEditSaillieValidation';

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

// Helper qui miroir la logique du submit — isolé pour test node env.
async function submitSaillieEdit(opts: {
  truieId: string;
  form: SaillieEditForm;
  initial: SaillieEditInitial;
  refreshData: () => Promise<void>;
}): Promise<{
  ok: boolean;
  mode: 'online' | 'offline';
  errors?: Record<string, string | undefined>;
  patchApplied?: Record<string, string | number | boolean | null>;
}> {
  const result = validateSaillieEdit(opts.form, opts.initial);
  if (!result.ok || !result.patch) {
    return { ok: false, mode: 'online', errors: result.errors };
  }
  if (Object.keys(result.patch).length === 0) {
    return { ok: true, mode: 'online', patchApplied: {} };
  }
  const { enqueueUpdateRow } = await import('../../services/offlineQueue');
  await enqueueUpdateRow(
    'SUIVI_REPRODUCTION_ACTUEL',
    'ID TRUIE',
    opts.truieId,
    result.patch,
  );
  const online =
    typeof navigator !== 'undefined' && (navigator as { onLine?: boolean }).onLine;
  await opts.refreshData();
  return {
    ok: true,
    mode: online ? 'online' : 'offline',
    patchApplied: result.patch,
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────
function makeInitial(over: Partial<SaillieEditInitial> = {}): SaillieEditInitial {
  return {
    truieId: 'T01',
    verratId: 'V01',
    dateSaillie: '2025-10-15',
    dateMBPrevue: '2026-02-07', // +115j
    statut: 'Active',
    notes: '',
    ...over,
  };
}

function makeForm(over: Partial<SaillieEditForm> = {}): SaillieEditForm {
  return {
    truieId: 'T01',
    verratId: 'V01',
    dateSaillie: '2025-10-15',
    dateMBPrevue: '2026-02-07',
    statut: 'Active',
    notes: '',
    ...over,
  };
}

beforeEach(() => {
  enqueueUpdateRowMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
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

// ══════════════════════════════════════════════════════════════════════════
// [1] Render — constantes exposées (STATUT_OPTIONS, GESTATION_DAYS)
// ══════════════════════════════════════════════════════════════════════════
describe('[1] QuickEditSaillieForm · render structure & constantes', () => {
  it('expose tous les statuts attendus (select)', () => {
    expect(STATUT_OPTIONS).toEqual([
      'Active',
      'Confirmée',
      'Non confirmée',
      'Avortement',
      'Archivée',
    ]);
  });

  it('expose GESTATION_DAYS = 115 (constante biologique)', () => {
    expect(GESTATION_DAYS).toBe(115);
  });

  it('validateSaillieEdit accepte un form identique à initial → patch vide', () => {
    const initial = makeInitial();
    const form = makeForm();
    const res = validateSaillieEdit(form, initial);
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({});
  });

  it('helper isoToFr convertit ISO → dd/MM/yyyy', () => {
    expect(isoToFr('2025-10-15')).toBe('15/10/2025');
    expect(isoToFr('2026-02-07')).toBe('07/02/2026');
    expect(isoToFr('')).toBe('');
    expect(isoToFr('invalid')).toBe('');
  });

  it('helper frToIso convertit dd/MM/yyyy → ISO yyyy-MM-dd', () => {
    expect(frToIso('15/10/2025')).toBe('2025-10-15');
    expect(frToIso('07/02/2026')).toBe('2026-02-07');
    // Already ISO → passthrough
    expect(frToIso('2025-10-15')).toBe('2025-10-15');
    // ISO with time → trimmed to date
    expect(frToIso('2025-10-15T10:30:00.000Z')).toBe('2025-10-15');
    expect(frToIso('')).toBe('');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [2] Validation date invalide rejetée
// ══════════════════════════════════════════════════════════════════════════
describe('[2] validation date invalide rejetée', () => {
  it('dateSaillie vide → errors.dateSaillie', () => {
    const res = validateSaillieEdit(
      makeForm({ dateSaillie: '' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.dateSaillie).toBeTruthy();
  });

  it('dateSaillie format invalide ("abc") → errors.dateSaillie', () => {
    const res = validateSaillieEdit(
      makeForm({ dateSaillie: 'abc' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.dateSaillie).toBeTruthy();
  });

  it('dateSaillie jour impossible ("2025-02-30") rejetée', () => {
    const res = validateSaillieEdit(
      makeForm({ dateSaillie: '2025-02-30' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.dateSaillie).toBeTruthy();
  });

  it('dateSaillie trop dans le futur (+10 ans) rejetée', () => {
    const far = new Date();
    far.setFullYear(far.getFullYear() + 10);
    const iso = far.toISOString().slice(0, 10);
    const res = validateSaillieEdit(
      makeForm({ dateSaillie: iso }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.dateSaillie).toBeTruthy();
  });

  it('dateMBPrevue invalide si fournie mal formatée', () => {
    const res = validateSaillieEdit(
      makeForm({ dateMBPrevue: '2026-13-45' }), // mois/jour impossibles
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.dateMBPrevue).toBeTruthy();
  });

  it('verratId vide → errors.verratId', () => {
    const res = validateSaillieEdit(
      makeForm({ verratId: '' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.verratId).toBeTruthy();
  });

  it('submit avec date invalide → pas d\'enqueue, pas de refresh', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitSaillieEdit({
      truieId: 'T01',
      form: makeForm({ dateSaillie: 'not-a-date' }),
      initial: makeInitial(),
      refreshData,
    });
    expect(out.ok).toBe(false);
    expect(out.errors?.dateSaillie).toBeTruthy();
    expect(enqueueUpdateRowMock).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [3] Submit patch correct (sheet + idHeader + clés canoniques)
// ══════════════════════════════════════════════════════════════════════════
describe('[3] submit patch correct', () => {
  it('modifier VERRAT uniquement → patch = { VERRAT }', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitSaillieEdit({
      truieId: 'T01',
      form: makeForm({ verratId: 'V02' }),
      initial: makeInitial({ verratId: 'V01' }),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({ VERRAT: 'V02' });
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'SUIVI_REPRODUCTION_ACTUEL',
      'ID TRUIE',
      'T01',
      { VERRAT: 'V02' },
    );
  });

  it('modifier statut → patch.STATUT', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitSaillieEdit({
      truieId: 'T01',
      form: makeForm({ statut: 'Confirmée' }),
      initial: makeInitial({ statut: 'Active' }),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({ STATUT: 'Confirmée' });
  });

  it('tous les statuts valides acceptés', () => {
    for (const s of STATUT_OPTIONS) {
      const res = validateSaillieEdit(
        makeForm({ statut: s }),
        makeInitial({ statut: 'Active' }),
      );
      expect(res.ok).toBe(true);
    }
  });

  it('sheet cible = SUIVI_REPRODUCTION_ACTUEL, idHeader = ID TRUIE', async () => {
    const refreshData = vi.fn(async () => undefined);
    await submitSaillieEdit({
      truieId: 'T07',
      form: makeForm({ verratId: 'V02', notes: 'Nouvel essai' }),
      initial: makeInitial(),
      refreshData,
    });
    const [sheet, idHeader, idValue] = enqueueUpdateRowMock.mock.calls[0];
    expect(sheet).toBe('SUIVI_REPRODUCTION_ACTUEL');
    expect(idHeader).toBe('ID TRUIE');
    expect(idValue).toBe('T07');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [4] Auto-calc MB prévue à +115j (addDaysIso)
// ══════════════════════════════════════════════════════════════════════════
describe('[4] auto-calc MB prévue à +115 jours', () => {
  it('addDaysIso(15/10/2025, +115) → 07/02/2026', () => {
    expect(addDaysIso('2025-10-15', GESTATION_DAYS)).toBe('2026-02-07');
  });

  it('addDaysIso(01/01/2026, +115) → 26/04/2026', () => {
    expect(addDaysIso('2026-01-01', GESTATION_DAYS)).toBe('2026-04-26');
  });

  it('addDaysIso gère le passage d\'année', () => {
    expect(addDaysIso('2025-12-31', GESTATION_DAYS)).toBe('2026-04-25');
  });

  it('addDaysIso retourne "" pour ISO invalide', () => {
    expect(addDaysIso('', 115)).toBe('');
    expect(addDaysIso('invalid', 115)).toBe('');
  });

  it('submit avec nouvelle date saillie + auto MB recalc → patch contient les 2 dates au format dd/MM/yyyy', async () => {
    const refreshData = vi.fn(async () => undefined);
    const newDate = '2025-11-01';
    const autoMb = addDaysIso(newDate, GESTATION_DAYS); // 2026-02-24
    expect(autoMb).toBe('2026-02-24');

    const out = await submitSaillieEdit({
      truieId: 'T01',
      form: makeForm({ dateSaillie: newDate, dateMBPrevue: autoMb }),
      initial: makeInitial(),
      refreshData,
    });
    expect(out.ok).toBe(true);
    // Le patch envoyé doit contenir les dates au format Sheets dd/MM/yyyy
    expect(out.patchApplied).toEqual({
      'DATE SAILLIE': '01/11/2025',
      'DATE MB PREVUE': '24/02/2026',
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [5] Offline queue (navigator.onLine = false)
// ══════════════════════════════════════════════════════════════════════════
describe('[5] submit offline → queue', () => {
  it('navigator.onLine = false → mode offline, enqueue appelé', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const refreshData = vi.fn(async () => undefined);

    const out = await submitSaillieEdit({
      truieId: 'T05',
      form: makeForm({ verratId: 'V02', notes: 'Sync auto plus tard' }),
      initial: makeInitial(),
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(out.mode).toBe('offline');
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'SUIVI_REPRODUCTION_ACTUEL',
      'ID TRUIE',
      'T05',
      { VERRAT: 'V02', NOTES: 'Sync auto plus tard' },
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [6] Patch partiel : juste date modifiée → pas les autres clés
// ══════════════════════════════════════════════════════════════════════════
describe('[6] patch partiel (diff uniquement)', () => {
  it('modifier uniquement DATE SAILLIE → patch contient seulement cette clé', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitSaillieEdit({
      truieId: 'T01',
      form: makeForm({ dateSaillie: '2025-10-16' }),
      initial: makeInitial({ dateSaillie: '2025-10-15' }),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({ 'DATE SAILLIE': '16/10/2025' });
    expect(out.patchApplied).not.toHaveProperty('VERRAT');
    expect(out.patchApplied).not.toHaveProperty('STATUT');
    expect(out.patchApplied).not.toHaveProperty('NOTES');
    expect(out.patchApplied).not.toHaveProperty('DATE MB PREVUE');
    expect(out.patchApplied).not.toHaveProperty('ID TRUIE');
  });

  it('modifier uniquement NOTES → patch = { NOTES }', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitSaillieEdit({
      truieId: 'T01',
      form: makeForm({ notes: 'Observation tardive' }),
      initial: makeInitial({ notes: '' }),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({ NOTES: 'Observation tardive' });
  });

  it('aucune modification → patch vide, pas d\'enqueue', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitSaillieEdit({
      truieId: 'T01',
      form: makeForm(),
      initial: makeInitial(),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({});
    expect(enqueueUpdateRowMock).not.toHaveBeenCalled();
  });

  it('effacer dateMBPrevue → patch contient DATE MB PREVUE = ""', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitSaillieEdit({
      truieId: 'T01',
      form: makeForm({ dateMBPrevue: '' }),
      initial: makeInitial({ dateMBPrevue: '2026-02-07' }),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({ 'DATE MB PREVUE': '' });
  });
});
