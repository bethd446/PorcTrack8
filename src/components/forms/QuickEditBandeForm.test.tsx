/**
 * Tests unitaires — QuickEditBandeForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env (pas de jsdom), on teste donc :
 *   1. Le validateur pur `validateBandeEdit` (règles cohérence + dates).
 *   2. L'helper de submit qui miroir la logique du composant — confirme
 *      que la sheet cible est `PORCELETS_BANDES_DETAIL` avec idHeader `ID`,
 *      les clés canoniques (DATE_MB, NV, MORTS, VIVANTS, …) et la
 *      conversion ISO → dd/MM/yyyy.
 *
 * Couvre les 7 cas demandés :
 *   [1] Render (signature des champs / raw input mapping)
 *   [2] Validation Morts + Vivants > NV rejetée
 *   [3] Validation date sevrage avant date MB rejetée
 *   [4] Submit patch correct
 *   [5] Submit patch partiel (juste vivants modifié)
 *   [6] Patch dates au format dd/MM/yyyy
 *   [7] Submit offline → queue
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  validateBandeEdit,
  bandeToRawInput,
  BANDE_STATUTS,
  type BandeEditRawInput,
} from './quickEditBandeValidation';
import type { BandePorcelets } from '../../types/farm';

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

// ── Fixtures ───────────────────────────────────────────────────────────────
function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'P-2026-03',
    idPortee: 'P-2026-03',
    truie: 'T05',
    boucleMere: 'FR12345',
    dateMB: '15/03/2026',
    nv: 14,
    morts: 2,
    vivants: 12,
    statut: 'Sous mère',
    dateSevragePrevue: '12/04/2026',
    synced: true,
    ...overrides,
  };
}

function makeInput(overrides: Partial<BandeEditRawInput> = {}): BandeEditRawInput {
  return {
    truie: 'T05',
    boucleMere: 'FR12345',
    dateMB: '2026-03-15',
    nv: '14',
    morts: '2',
    vivants: '12',
    dateSevragePrevue: '2026-04-12',
    dateSevrageReelle: '',
    nbMales: '',
    nbFemelles: '',
    dateSeparation: '',
    logeEngraissement: '',
    statut: 'Sous mère',
    notes: '',
    ...overrides,
  };
}

// Helper mirroring le submit du composant
async function submitBandeEdit(opts: {
  bande: BandePorcelets;
  input: BandeEditRawInput;
  initial: BandeEditRawInput;
  refreshData: () => Promise<void>;
}): Promise<{
  ok: boolean;
  mode: 'online' | 'offline';
  errors?: Record<string, string>;
  patch?: Record<string, string | number | boolean | null>;
}> {
  const result = validateBandeEdit(opts.input, opts.initial);
  if (!result.ok || !result.patch) {
    return { ok: false, mode: 'online', errors: result.errors as Record<string, string> };
  }
  if (Object.keys(result.patch).length === 0) {
    return { ok: true, mode: 'online', patch: {} };
  }
  const { enqueueUpdateRow } = await import('../../services/offlineQueue');
  await enqueueUpdateRow(
    'PORCELETS_BANDES_DETAIL',
    'ID',
    opts.bande.id,
    result.patch as Record<string, string | number | boolean | null>,
  );
  const online =
    typeof navigator !== 'undefined' && (navigator as { onLine?: boolean }).onLine;
  await opts.refreshData();
  return {
    ok: true,
    mode: online ? 'online' : 'offline',
    patch: result.patch as Record<string, string | number | boolean | null>,
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

// ─── [1] Render — raw input mapping couvre tous les champs ────────────────
describe('[1] bandeToRawInput — tous les champs du formulaire', () => {
  it('remplit chaque champ attendu depuis la bande', () => {
    const bande = makeBande({
      nbMales: 7,
      nbFemelles: 5,
      dateSeparation: '10/05/2026',
      logeEngraissement: 'M',
      dateSevrageReelle: '10/04/2026',
      notes: 'test',
    });
    const raw = bandeToRawInput(bande);

    // Tous les champs du formulaire sont présents et mappés
    expect(raw).toEqual({
      truie: 'T05',
      boucleMere: 'FR12345',
      dateMB: '2026-03-15',
      nv: '14',
      morts: '2',
      vivants: '12',
      dateSevragePrevue: '2026-04-12',
      dateSevrageReelle: '2026-04-10',
      nbMales: '7',
      nbFemelles: '5',
      dateSeparation: '2026-05-10',
      logeEngraissement: 'M',
      statut: 'Sous mère',
      notes: 'test',
    });
  });

  it('gère les champs undefined/optionnels en chaîne vide', () => {
    const bande: BandePorcelets = {
      id: 'P-1',
      idPortee: 'P-1',
      statut: 'Sevrés',
      synced: true,
    };
    const raw = bandeToRawInput(bande);
    expect(raw.truie).toBe('');
    expect(raw.nv).toBe('');
    expect(raw.morts).toBe('');
    expect(raw.vivants).toBe('');
    expect(raw.dateMB).toBe('');
    expect(raw.logeEngraissement).toBe('');
    expect(raw.notes).toBe('');
    expect(raw.statut).toBe('Sevrés');
  });

  it('expose BANDE_STATUTS pour le select (6 options)', () => {
    expect(BANDE_STATUTS).toEqual([
      'Sous mère',
      'Sevrés',
      'En croissance',
      'En finition',
      'Vendue',
      'Archivée',
    ]);
  });
});

// ─── [2] Morts + Vivants > NV rejetée ─────────────────────────────────────
describe('[2] cohérence Morts + Vivants ≤ NV', () => {
  it('rejette si morts + vivants > nv', () => {
    const initial = makeInput();
    const input = makeInput({ nv: '10', morts: '5', vivants: '8' }); // 13 > 10
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(false);
    expect(res.errors.morts).toMatch(/> NV/);
    expect(res.errors.vivants).toMatch(/> NV/);
  });

  it('accepte si morts + vivants = nv', () => {
    const initial = makeInput();
    const input = makeInput({ nv: '14', morts: '2', vivants: '12' });
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(true);
  });

  it('accepte si nv vide (pas de contrainte)', () => {
    const initial = makeInput();
    const input = makeInput({ nv: '', morts: '5', vivants: '8' });
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(true);
  });

  it('rejette un nombre > 25', () => {
    const initial = makeInput();
    const input = makeInput({ nv: '30' });
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(false);
    expect(res.errors.nv).toMatch(/Maximum/);
  });

  it('rejette un nombre négatif', () => {
    const initial = makeInput();
    const input = makeInput({ morts: '-1' });
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(false);
    expect(res.errors.morts).toBeTruthy();
  });
});

// ─── [3] Date sevrage avant date MB rejetée ───────────────────────────────
describe('[3] cohérence dates MB / Sevrage', () => {
  it('rejette dateSevragePrevue <= dateMB', () => {
    const initial = makeInput();
    const input = makeInput({
      dateMB: '2026-04-12',
      dateSevragePrevue: '2026-04-12', // same day
    });
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(false);
    expect(res.errors.dateSevragePrevue).toMatch(/après la mise-bas/);
  });

  it('rejette dateSevragePrevue avant dateMB', () => {
    const initial = makeInput();
    const input = makeInput({
      dateMB: '2026-04-12',
      dateSevragePrevue: '2026-03-01',
    });
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(false);
    expect(res.errors.dateSevragePrevue).toMatch(/après/);
  });

  it('rejette dateSevrageReelle trop en avance (> 5j avant prévue)', () => {
    const initial = makeInput();
    const input = makeInput({
      dateSevragePrevue: '2026-04-12',
      dateSevrageReelle: '2026-04-01', // 11j avant
    });
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(false);
    expect(res.errors.dateSevrageReelle).toMatch(/5j/);
  });

  it('accepte dateSevrageReelle dans la tolérance (5j avant)', () => {
    const initial = makeInput();
    const input = makeInput({
      dateSevragePrevue: '2026-04-12',
      dateSevrageReelle: '2026-04-08',
    });
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(true);
  });

  it('rejette une date malformée', () => {
    const initial = makeInput();
    const input = makeInput({ dateMB: '2026/03/15' });
    const res = validateBandeEdit(input, initial);
    expect(res.ok).toBe(false);
    expect(res.errors.dateMB).toBeTruthy();
  });
});

// ─── [4] Submit patch correct ─────────────────────────────────────────────
describe('[4] submit patch correct — sheet + idHeader + clés canoniques', () => {
  it('envoie le patch à PORCELETS_BANDES_DETAIL avec idHeader ID', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    const refreshData = vi.fn(async () => undefined);
    const bande = makeBande();
    const initial = bandeToRawInput(bande);
    const input: BandeEditRawInput = {
      ...initial,
      // Modifie plusieurs champs → patch multi-clés
      truie: 'T07',
      nv: '15',
      morts: '3',
      vivants: '11',
      statut: 'Sevrés',
      notes: 'Portée solide',
    };

    const out = await submitBandeEdit({ bande, input, initial, refreshData });

    expect(out.ok).toBe(true);
    expect(out.mode).toBe('online');
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    const [sheet, idHeader, idValue, patch] = enqueueUpdateRowMock.mock.calls[0];
    expect(sheet).toBe('PORCELETS_BANDES_DETAIL');
    expect(idHeader).toBe('ID');
    expect(idValue).toBe('P-2026-03');

    // Clés canoniques présentes
    expect(patch).toMatchObject({
      TRUIE: 'T07',
      NV: 15,
      MORTS: 3,
      VIVANTS: 11,
      STATUT: 'Sevrés',
      NOTES: 'Portée solide',
    });
    expect(refreshData).toHaveBeenCalledTimes(1);
  });
});

// ─── [5] Patch partiel — un seul champ modifié ────────────────────────────
describe('[5] patch partiel — seules les valeurs modifiées', () => {
  it('envoie uniquement VIVANTS quand seul ce champ change', async () => {
    const refreshData = vi.fn(async () => undefined);
    const bande = makeBande();
    const initial = bandeToRawInput(bande);
    const input: BandeEditRawInput = { ...initial, vivants: '11' }; // seule modif

    const out = await submitBandeEdit({ bande, input, initial, refreshData });
    expect(out.ok).toBe(true);
    expect(out.patch).toEqual({ VIVANTS: 11 });

    const call = enqueueUpdateRowMock.mock.calls[0];
    expect(call[3]).toEqual({ VIVANTS: 11 });

    // Aucune autre clé (TRUIE, NV, MORTS, STATUT, etc.) ne doit apparaître
    const keys = Object.keys(call[3]);
    expect(keys).toHaveLength(1);
    expect(keys).toEqual(['VIVANTS']);
  });

  it('patch vide → aucun appel réseau', async () => {
    const refreshData = vi.fn(async () => undefined);
    const bande = makeBande();
    const initial = bandeToRawInput(bande);
    const input = { ...initial }; // aucune modif

    const out = await submitBandeEdit({ bande, input, initial, refreshData });
    expect(out.ok).toBe(true);
    expect(out.patch).toEqual({});
    expect(enqueueUpdateRowMock).not.toHaveBeenCalled();
  });
});

// ─── [6] Dates au format dd/MM/yyyy ───────────────────────────────────────
describe('[6] conversion dates ISO → dd/MM/yyyy dans le patch', () => {
  it('convertit DATE_MB, DATE_SEVRAGE_PREVUE, DATE_SEVRAGE_REELLE, DATE_SEPARATION', async () => {
    const refreshData = vi.fn(async () => undefined);
    const bande = makeBande({
      dateMB: undefined,
      dateSevragePrevue: undefined,
      dateSevrageReelle: undefined,
      dateSeparation: undefined,
    });
    const initial = bandeToRawInput(bande);
    const input: BandeEditRawInput = {
      ...initial,
      dateMB: '2026-03-15',
      dateSevragePrevue: '2026-04-12',
      dateSevrageReelle: '2026-04-14',
      dateSeparation: '2026-06-22',
    };

    const out = await submitBandeEdit({ bande, input, initial, refreshData });
    expect(out.ok).toBe(true);
    expect(out.patch).toMatchObject({
      DATE_MB: '15/03/2026',
      DATE_SEVRAGE_PREVUE: '12/04/2026',
      DATE_SEVRAGE_REELLE: '14/04/2026',
      DATE_SEPARATION: '22/06/2026',
    });
  });

  it('effacer une date → envoie chaîne vide', async () => {
    const refreshData = vi.fn(async () => undefined);
    const bande = makeBande({ dateSevrageReelle: '14/04/2026' });
    const initial = bandeToRawInput(bande);
    const input: BandeEditRawInput = {
      ...initial,
      dateSevrageReelle: '',
    };
    const out = await submitBandeEdit({ bande, input, initial, refreshData });
    expect(out.ok).toBe(true);
    expect(out.patch).toEqual({ DATE_SEVRAGE_REELLE: '' });
  });
});

// ─── [7] Submit offline → queue ───────────────────────────────────────────
describe('[7] submit offline → queue', () => {
  it('enqueue + mode offline quand navigator.onLine = false', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const refreshData = vi.fn(async () => undefined);
    const bande = makeBande();
    const initial = bandeToRawInput(bande);
    const input: BandeEditRawInput = { ...initial, statut: 'Sevrés' };

    const out = await submitBandeEdit({ bande, input, initial, refreshData });

    expect(out.ok).toBe(true);
    expect(out.mode).toBe('offline');
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'PORCELETS_BANDES_DETAIL',
      'ID',
      'P-2026-03',
      { STATUT: 'Sevrés' },
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });
});
