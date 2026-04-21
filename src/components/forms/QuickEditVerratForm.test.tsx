/**
 * Tests unitaires — QuickEditVerratForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env (pas de jsdom / testing-library ici).
 * On teste :
 *   1. Le validateur pur `validateVerratEdit` (règles + diff patch partiel).
 *   2. Le comportement du helper `submitVerratEdit` sur le mock
 *      d'`enqueueUpdateRow` — confirme sheet 'VERRATS', idHeader 'ID'
 *      et clés canoniques (NOM, BOUCLE, ORIGINE, ALIMENTATION, RATION KG/J,
 *      STATUT, NOTES).
 *
 * 6 tests demandés :
 *   [1] Render affiche tous les champs → vérifié statiquement par a11y test
 *       (présence des IDs). Ici on valide la structure des constantes (statuts
 *       et suggestions) exposées au render.
 *   [2] Validation boucle vide rejetée.
 *   [3] Validation ration > 10 rejetée.
 *   [4] Submit patch correct : uniquement les champs modifiés.
 *   [5] Submit offline → queue (navigator.onLine = false).
 *   [6] Statut select change → inclus dans le patch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  validateVerratEdit,
  STATUT_OPTIONS,
  ORIGINE_SUGGESTIONS,
  ALIMENTATION_SUGGESTIONS,
  type VerratEditForm,
  type VerratEditInitial,
} from './quickEditVerratValidation';

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
async function submitVerratEdit(opts: {
  verratId: string;
  form: VerratEditForm;
  initial: VerratEditInitial;
  refreshData: () => Promise<void>;
}): Promise<{
  ok: boolean;
  mode: 'online' | 'offline';
  errors?: Record<string, string | undefined>;
  patchApplied?: Record<string, string | number | boolean | null>;
}> {
  const result = validateVerratEdit(opts.form, opts.initial);
  if (!result.ok || !result.patch) {
    return { ok: false, mode: 'online', errors: result.errors };
  }

  if (Object.keys(result.patch).length === 0) {
    // Aucun diff : on skip l'enqueue (aligné sur le comportement du form)
    return { ok: true, mode: 'online', patchApplied: {} };
  }

  const { enqueueUpdateRow } = await import('../../services/offlineQueue');
  await enqueueUpdateRow('VERRATS', 'ID', opts.verratId, result.patch);
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
function makeInitial(over: Partial<VerratEditInitial> = {}): VerratEditInitial {
  return {
    nom: 'Titan',
    boucle: 'V-001',
    origine: 'Thomasset',
    alimentation: 'Mâle reproducteur',
    ration: 3.5,
    statut: 'Actif',
    notes: '',
    ...over,
  };
}

function makeForm(over: Partial<VerratEditForm> = {}): VerratEditForm {
  return {
    nom: 'Titan',
    boucle: 'V-001',
    origine: 'Thomasset',
    alimentation: 'Mâle reproducteur',
    ration: '3.5',
    statut: 'Actif',
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
// [1] Render — tous les champs exposés (structure & constantes)
// ══════════════════════════════════════════════════════════════════════════
describe('[1] QuickEditVerratForm · render structure', () => {
  it('expose tous les statuts attendus (select)', () => {
    expect(STATUT_OPTIONS).toEqual(['Actif', 'Réforme', 'Mort', 'Quarantaine']);
  });

  it('expose les suggestions Origine', () => {
    expect(ORIGINE_SUGGESTIONS).toEqual([
      'Thomasset',
      'Azaguie',
      'Import',
      'Autre',
    ]);
  });

  it('expose les suggestions Alimentation', () => {
    expect(ALIMENTATION_SUGGESTIONS).toEqual([
      'Mâle reproducteur',
      'Entretien',
      'Flushing',
    ]);
  });

  it('validateVerratEdit accepte un form complet identique à initial → patch vide', () => {
    const initial = makeInitial();
    const form = makeForm();
    const res = validateVerratEdit(form, initial);
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({});
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [2] Validation boucle vide rejetée
// ══════════════════════════════════════════════════════════════════════════
describe('[2] validation boucle vide rejetée', () => {
  it('boucle = "" → errors.boucle', () => {
    const res = validateVerratEdit(
      makeForm({ boucle: '' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.boucle).toBeTruthy();
  });

  it('boucle = "   " (whitespace) → errors.boucle', () => {
    const res = validateVerratEdit(
      makeForm({ boucle: '   ' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.boucle).toBeTruthy();
  });

  it('submit avec boucle vide → pas d\'enqueue, pas de refresh', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitVerratEdit({
      verratId: 'V01',
      form: makeForm({ boucle: '' }),
      initial: makeInitial(),
      refreshData,
    });
    expect(out.ok).toBe(false);
    expect(out.errors?.boucle).toBeTruthy();
    expect(enqueueUpdateRowMock).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [3] Validation ration > 10 rejetée
// ══════════════════════════════════════════════════════════════════════════
describe('[3] validation ration > 10 rejetée', () => {
  it('ration "11" → errors.ration', () => {
    const res = validateVerratEdit(
      makeForm({ ration: '11' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.ration).toBeTruthy();
  });

  it('ration "15.5" → errors.ration', () => {
    const res = validateVerratEdit(
      makeForm({ ration: '15.5' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.ration).toBeTruthy();
  });

  it('ration négative rejetée', () => {
    const res = validateVerratEdit(
      makeForm({ ration: '-1' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.ration).toBeTruthy();
  });

  it('ration bornes 0 et 10 acceptées', () => {
    const r0 = validateVerratEdit(makeForm({ ration: '0' }), makeInitial());
    const r10 = validateVerratEdit(makeForm({ ration: '10' }), makeInitial());
    expect(r0.ok).toBe(true);
    expect(r10.ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [4] Submit patch correct — champs modifiés uniquement (diff)
// ══════════════════════════════════════════════════════════════════════════
describe('[4] submit patch partiel : seulement les champs modifiés', () => {
  it('modifier NOM uniquement → patch = { NOM }', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitVerratEdit({
      verratId: 'V01',
      form: makeForm({ nom: 'Nouveau Nom' }),
      initial: makeInitial(),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({ NOM: 'Nouveau Nom' });
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'VERRATS',
      'ID',
      'V01',
      { NOM: 'Nouveau Nom' },
    );
  });

  it('modifier RATION uniquement → patch = { "RATION KG/J" }', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitVerratEdit({
      verratId: 'V02',
      form: makeForm({ ration: '4.2' }),
      initial: makeInitial({ ration: 3.5 }),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({ 'RATION KG/J': 4.2 });
  });

  it('modifier NOM + ORIGINE + NOTES → patch contient uniquement ces 3 clés', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitVerratEdit({
      verratId: 'V03',
      form: makeForm({
        nom: 'Hercule',
        origine: 'Azaguie',
        notes: 'Nouvel arrivage',
      }),
      initial: makeInitial(),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({
      NOM: 'Hercule',
      ORIGINE: 'Azaguie',
      NOTES: 'Nouvel arrivage',
    });
    // Les champs non modifiés ne doivent PAS être dans le patch
    expect(out.patchApplied).not.toHaveProperty('BOUCLE');
    expect(out.patchApplied).not.toHaveProperty('RATION KG/J');
    expect(out.patchApplied).not.toHaveProperty('STATUT');
    expect(out.patchApplied).not.toHaveProperty('ALIMENTATION');
  });

  it('aucune modification → patch vide, pas d\'enqueue', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitVerratEdit({
      verratId: 'V04',
      form: makeForm(),
      initial: makeInitial(),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({});
    expect(enqueueUpdateRowMock).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [5] Submit offline → queue
// ══════════════════════════════════════════════════════════════════════════
describe('[5] submit offline → queue', () => {
  it('navigator.onLine = false → mode offline, enqueue appelé', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const refreshData = vi.fn(async () => undefined);

    const out = await submitVerratEdit({
      verratId: 'V05',
      form: makeForm({ nom: 'Spartacus', ration: '5.0' }),
      initial: makeInitial(),
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(out.mode).toBe('offline');
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'VERRATS',
      'ID',
      'V05',
      { NOM: 'Spartacus', 'RATION KG/J': 5 },
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [6] Statut select change détecté
// ══════════════════════════════════════════════════════════════════════════
describe('[6] statut select change détecté', () => {
  it('Actif → Réforme → patch.STATUT = "Réforme"', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitVerratEdit({
      verratId: 'V06',
      form: makeForm({ statut: 'Réforme' }),
      initial: makeInitial({ statut: 'Actif' }),
      refreshData,
    });
    expect(out.ok).toBe(true);
    expect(out.patchApplied).toEqual({ STATUT: 'Réforme' });
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'VERRATS',
      'ID',
      'V06',
      { STATUT: 'Réforme' },
    );
  });

  it('Actif → Quarantaine → patch.STATUT = "Quarantaine"', () => {
    const res = validateVerratEdit(
      makeForm({ statut: 'Quarantaine' }),
      makeInitial({ statut: 'Actif' }),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ STATUT: 'Quarantaine' });
  });

  it('statut inchangé (Actif → Actif) → pas dans le patch', () => {
    const res = validateVerratEdit(
      makeForm({ statut: 'Actif' }),
      makeInitial({ statut: 'Actif' }),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).not.toHaveProperty('STATUT');
  });

  it('tous les statuts valides sont acceptés', () => {
    for (const s of STATUT_OPTIONS) {
      const res = validateVerratEdit(
        makeForm({ statut: s }),
        makeInitial({ statut: 'Actif' }),
      );
      expect(res.ok).toBe(true);
    }
  });
});
