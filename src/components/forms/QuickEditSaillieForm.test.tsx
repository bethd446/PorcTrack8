// @vitest-environment jsdom
/**
 * Tests unitaires — QuickEditSaillieForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * V75-q-D : retrait du mock `enqueueUpdateRow` (fonction supprimée). Le
 * composant runtime appelle désormais `supabase.from('saillies').update(...)`
 * direct ; les tests valident `validateSaillieEdit` et le diff patch produit.
 *
 * Couvre :
 *   [1] Render — constantes exposées (STATUT_OPTIONS, GESTATION_DAYS).
 *   [2] Validation date invalide rejetée.
 *   [3] Diff patch — clés canoniques (VERRAT, STATUT, …).
 *   [4] Auto-calc MB prévue à +115j (addDaysIso).
 *   [5] Patch multi-champs (verrat + notes).
 *   [6] Patch partiel (juste date modifiée → pas les autres clés).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

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

  it('date invalide → ok=false, pas de patch', () => {
    const res = validateSaillieEdit(
      makeForm({ dateSaillie: 'not-a-date' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.dateSaillie).toBeTruthy();
    expect(res.patch).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [3] Diff patch — clés canoniques
// ══════════════════════════════════════════════════════════════════════════
describe('[3] diff patch — clés canoniques', () => {
  it('modifier VERRAT uniquement → patch = { VERRAT }', () => {
    const res = validateSaillieEdit(
      makeForm({ verratId: 'V02' }),
      makeInitial({ verratId: 'V01' }),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ VERRAT: 'V02' });
  });

  it('modifier statut → patch.STATUT', () => {
    const res = validateSaillieEdit(
      makeForm({ statut: 'Confirmée' }),
      makeInitial({ statut: 'Active' }),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ STATUT: 'Confirmée' });
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

  it('nouvelle date saillie + auto MB recalc → patch contient les 2 dates au format dd/MM/yyyy', () => {
    const newDate = '2025-11-01';
    const autoMb = addDaysIso(newDate, GESTATION_DAYS); // 2026-02-24
    expect(autoMb).toBe('2026-02-24');

    const res = validateSaillieEdit(
      makeForm({ dateSaillie: newDate, dateMBPrevue: autoMb }),
      makeInitial(),
    );
    expect(res.ok).toBe(true);
    // Le patch produit doit contenir les dates au format dd/MM/yyyy
    expect(res.patch).toEqual({
      'DATE SAILLIE': '01/11/2025',
      'DATE MB PREVUE': '24/02/2026',
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [5] Patch multi-champs (verrat + notes)
// ══════════════════════════════════════════════════════════════════════════
describe('[5] patch multi-champs', () => {
  it('verrat + notes modifiés → patch = { VERRAT, NOTES }', () => {
    const res = validateSaillieEdit(
      makeForm({ verratId: 'V02', notes: 'Sync auto plus tard' }),
      makeInitial(),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({
      VERRAT: 'V02',
      NOTES: 'Sync auto plus tard',
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [6] Patch partiel : juste date modifiée → pas les autres clés
// ══════════════════════════════════════════════════════════════════════════
describe('[6] patch partiel (diff uniquement)', () => {
  it('modifier uniquement DATE SAILLIE → patch contient seulement cette clé', () => {
    const res = validateSaillieEdit(
      makeForm({ dateSaillie: '2025-10-16' }),
      makeInitial({ dateSaillie: '2025-10-15' }),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ 'DATE SAILLIE': '16/10/2025' });
    expect(res.patch).not.toHaveProperty('VERRAT');
    expect(res.patch).not.toHaveProperty('STATUT');
    expect(res.patch).not.toHaveProperty('NOTES');
    expect(res.patch).not.toHaveProperty('DATE MB PREVUE');
    expect(res.patch).not.toHaveProperty('ID TRUIE');
  });

  it('modifier uniquement NOTES → patch = { NOTES }', () => {
    const res = validateSaillieEdit(
      makeForm({ notes: 'Observation tardive' }),
      makeInitial({ notes: '' }),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ NOTES: 'Observation tardive' });
  });

  it('aucune modification → patch vide', () => {
    const res = validateSaillieEdit(makeForm(), makeInitial());
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({});
  });

  it('effacer dateMBPrevue → patch contient DATE MB PREVUE = ""', () => {
    const res = validateSaillieEdit(
      makeForm({ dateMBPrevue: '' }),
      makeInitial({ dateMBPrevue: '2026-02-07' }),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ 'DATE MB PREVUE': '' });
  });
});
