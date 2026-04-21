/**
 * Tests unitaires — QuickEditTruieForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env (pas de jsdom / testing-library dans ce repo),
 * on teste donc :
 *   1. Le validateur pur `validateTruieEdit` (règles nom + ration) — LEGACY.
 *   2. Le validateur étendu `validateTruieEditFull` — multi-champs, diff patch.
 *   3. Le comportement de `submitTruieEdit` (helper local) sur le mock
 *      d'`enqueueUpdateRow` — confirme colonnes GAS, sheet et idHeader.
 *   4. Conversion date yyyy-MM-dd → dd/MM/yyyy pour GAS.
 *
 * Couvre les cas historiques + les 8 nouveaux cas demandés pour la v2.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  validateTruieEdit,
  validateTruieEditFull,
  isoDateToFr,
  frDateToIso,
  type TruieEditDraft,
  type TruieEditInitial,
} from './quickEditTruieValidation';

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

// Helper miroir du submit v2 (multi-champs avec diff patch)
async function submitTruieEditFull(opts: {
  truieId: string;
  draft: TruieEditDraft;
  initial: TruieEditInitial;
  refreshData: () => Promise<void>;
}): Promise<{ ok: boolean; mode: 'online' | 'offline'; errors?: Record<string, string>; patch?: Record<string, unknown> }> {
  const result = validateTruieEditFull(opts.draft, opts.initial);
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
  return { ok: true, mode: online ? 'online' : 'offline', patch: result.patch };
}

// ── Fixtures ────────────────────────────────────────────────────────────────
const baseInitial: TruieEditInitial = {
  nom: 'Berthe',
  boucle: 'FR-001-0001',
  race: 'Large White',
  poids: '210',
  stade: 'Reproductrice',
  statut: 'Pleine',
  ration: '3.5',
  nbPortees: '4',
  derniereNV: '12',
  dateMBPrevue: '2026-05-10',
  notes: 'RAS',
};

const baseDraft: TruieEditDraft = { ...baseInitial };

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
// 1. LEGACY — validateTruieEdit(nom, ration) — tests historiques conservés
// ══════════════════════════════════════════════════════════════════════════
describe('validateTruieEdit (legacy 2-args)', () => {
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

  it("submit invalide → pas d'enqueue, pas de refresh", async () => {
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

// ══════════════════════════════════════════════════════════════════════════
// 2. V2 — validateTruieEditFull — multi-champs + diff patch
//    8 nouveaux tests pour la mission d'extension
// ══════════════════════════════════════════════════════════════════════════
describe('validateTruieEditFull (v2 multi-champs)', () => {
  // [NEW-1] Render — tous les champs attendus sont validables
  it('[NEW-1] accepte un draft complet non modifié → patch vide', () => {
    const res = validateTruieEditFull({ ...baseDraft }, baseInitial);
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({});
  });

  // [NEW-2] Validation : boucle vide rejetée
  it('[NEW-2] boucle vide est rejetée (champ obligatoire)', () => {
    const res = validateTruieEditFull(
      { ...baseDraft, boucle: '   ' },
      baseInitial,
    );
    expect(res.ok).toBe(false);
    expect(res.errors.boucle).toBeTruthy();
    expect(res.patch).toBeUndefined();
  });

  // [NEW-3] Validation : poids > 350 rejeté
  it('[NEW-3] poids > 350 est rejeté', () => {
    const res = validateTruieEditFull(
      { ...baseDraft, poids: '400' },
      baseInitial,
    );
    expect(res.ok).toBe(false);
    expect(res.errors.poids).toBeTruthy();
  });

  // [NEW-4] Validation : ration > 10 rejetée (même règle que legacy)
  it('[NEW-4] ration > 10 est rejetée', () => {
    const res = validateTruieEditFull(
      { ...baseDraft, ration: '12' },
      baseInitial,
    );
    expect(res.ok).toBe(false);
    expect(res.errors.ration).toBeTruthy();
  });

  // [NEW-5] Submit patch correct : uniquement les champs modifiés
  it('[NEW-5] submit patch contient UNIQUEMENT les champs modifiés', () => {
    const draft: TruieEditDraft = {
      ...baseInitial,
      nom: 'Ginette', // modifié
      poids: '225', // modifié
      ration: '4.0', // modifié (3.5 → 4.0)
    };
    const res = validateTruieEditFull(draft, baseInitial);
    expect(res.ok).toBe(true);
    expect(res.patch).toBeDefined();
    // Champs modifiés uniquement
    expect(res.patch).toEqual({
      NOM: 'Ginette',
      POIDS: 225,
      'RATION KG/J': 4,
    });
    // Confirme que rien d'autre n'est dans le patch
    expect(Object.keys(res.patch ?? {})).toHaveLength(3);
  });

  // [NEW-6] Submit ne touche pas les champs inchangés (race, stade, statut)
  it('[NEW-6] submit ne touche pas les champs inchangés', () => {
    const draft: TruieEditDraft = {
      ...baseInitial,
      notes: 'Observation vétérinaire', // seul champ modifié
    };
    const res = validateTruieEditFull(draft, baseInitial);
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ NOTES: 'Observation vétérinaire' });
    expect(res.patch).not.toHaveProperty('RACE');
    expect(res.patch).not.toHaveProperty('STADE');
    expect(res.patch).not.toHaveProperty('STATUT');
    expect(res.patch).not.toHaveProperty('BOUCLE');
    expect(res.patch).not.toHaveProperty('POIDS');
  });

  // [NEW-7] Submit offline → queue
  it('[NEW-7] submit offline → enqueue avec patch multi-champs', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const refreshData = vi.fn(async () => undefined);

    const draft: TruieEditDraft = {
      ...baseInitial,
      race: 'Duroc', // modifié
      stade: 'Gestante', // modifié
      dateMBPrevue: '2026-06-15', // modifié
    };

    const out = await submitTruieEditFull({
      truieId: 'T07',
      draft,
      initial: baseInitial,
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(out.mode).toBe('offline');
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'SUIVI_TRUIES_REPRODUCTION',
      'ID',
      'T07',
      {
        RACE: 'Duroc',
        STADE: 'Gestante',
        DATE_MB_PREVUE: '15/06/2026', // converti yyyy-MM-dd → dd/MM/yyyy
      },
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  // [NEW-8] Date MB prévue : conversion yyyy-MM-dd → dd/MM/yyyy
  it('[NEW-8] dateMBPrevue convertit yyyy-MM-dd → dd/MM/yyyy dans le patch', () => {
    // Conversion pure
    expect(isoDateToFr('2026-07-03')).toBe('03/07/2026');
    expect(isoDateToFr('')).toBe('');
    expect(frDateToIso('03/07/2026')).toBe('2026-07-03');
    expect(frDateToIso('3/7/2026')).toBe('2026-07-03');

    // Integration dans le patch
    const draft: TruieEditDraft = {
      ...baseInitial,
      dateMBPrevue: '2026-07-03',
    };
    const initialSansDate: TruieEditInitial = {
      ...baseInitial,
      dateMBPrevue: '',
    };
    const res = validateTruieEditFull(draft, initialSansDate);
    expect(res.ok).toBe(true);
    expect(res.patch?.DATE_MB_PREVUE).toBe('03/07/2026');
  });

  // ── Tests additionnels (complément) ────────────────────────────────────
  it('nbPortees > 20 rejeté', () => {
    const res = validateTruieEditFull(
      { ...baseDraft, nbPortees: '25' },
      baseInitial,
    );
    expect(res.ok).toBe(false);
    expect(res.errors.nbPortees).toBeTruthy();
  });

  it('derniereNV float rejeté (entier requis)', () => {
    const res = validateTruieEditFull(
      { ...baseDraft, derniereNV: '12.5' },
      baseInitial,
    );
    expect(res.ok).toBe(false);
    expect(res.errors.derniereNV).toBeTruthy();
  });

  it('notes > 200 chars rejeté', () => {
    const res = validateTruieEditFull(
      { ...baseDraft, notes: 'x'.repeat(201) },
      baseInitial,
    );
    expect(res.ok).toBe(false);
    expect(res.errors.notes).toBeTruthy();
  });

  it('race > 40 chars rejeté', () => {
    const res = validateTruieEditFull(
      { ...baseDraft, race: 'y'.repeat(41) },
      baseInitial,
    );
    expect(res.ok).toBe(false);
    expect(res.errors.race).toBeTruthy();
  });

  it('sans initial → patch contient tous les champs', () => {
    const res = validateTruieEditFull(baseDraft);
    expect(res.ok).toBe(true);
    expect(res.patch).toBeDefined();
    expect(Object.keys(res.patch ?? {})).toEqual(
      expect.arrayContaining([
        'NOM',
        'BOUCLE',
        'RACE',
        'POIDS',
        'STADE',
        'STATUT',
        'RATION KG/J',
        'NB_PORTEES',
        'DERNIERE_NV',
        'DATE_MB_PREVUE',
        'NOTES',
      ]),
    );
  });

  it('compat ascendante : truie sans poids/race (initial avec poids="" et race="")', () => {
    const initialSansOpt: TruieEditInitial = {
      ...baseInitial,
      poids: '',
      race: '',
    };
    const draft: TruieEditDraft = {
      ...initialSansOpt,
      nom: 'Changed',
    };
    const res = validateTruieEditFull(draft, initialSansOpt);
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ NOM: 'Changed' });
  });
});
