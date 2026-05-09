// @vitest-environment jsdom
/**
 * Tests unitaires — QuickEditVerratForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * V75-q-D : retrait du mock `enqueueUpdateRow` (fonction supprimée). Le
 * composant runtime appelle désormais `updateBoarByCode` direct via
 * Supabase ; les tests valident `validateVerratEdit` et le diff patch
 * (clés canoniques NOM, BOUCLE, ORIGINE, ALIMENTATION, RATION KG/J, …).
 *
 * Couvre :
 *   [1] Render — structure des constantes (statuts/suggestions).
 *   [2] Validation boucle vide rejetée.
 *   [3] Validation ration > 10 rejetée.
 *   [4] Diff patch partiel : seulement les champs modifiés.
 *   [5] Patch multi-champs (nom + ration).
 *   [6] Statut select change → inclus dans le patch.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  validateVerratEdit,
  STATUT_OPTIONS,
  ORIGINE_SUGGESTIONS,
  ALIMENTATION_SUGGESTIONS,
  type VerratEditForm,
  type VerratEditInitial,
} from './quickEditVerratValidation';

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
    dateNaissance: '',
    loge: '',
    race: '',
    lignee: '',
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
    dateNaissance: '',
    loge: '',
    race: '',
    lignee: '',
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
      'Verrat standard',
      'Verrat premium',
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

  it('boucle vide → ok=false, pas de patch', () => {
    const res = validateVerratEdit(
      makeForm({ boucle: '' }),
      makeInitial(),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.boucle).toBeTruthy();
    expect(res.patch).toBeUndefined();
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
// [4] Diff patch — champs modifiés uniquement
// ══════════════════════════════════════════════════════════════════════════
describe('[4] diff patch : seulement les champs modifiés', () => {
  it('modifier NOM uniquement → patch = { NOM }', () => {
    const res = validateVerratEdit(
      makeForm({ nom: 'Nouveau Nom' }),
      makeInitial(),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ NOM: 'Nouveau Nom' });
  });

  it('modifier RATION uniquement → patch = { "RATION KG/J" }', () => {
    const res = validateVerratEdit(
      makeForm({ ration: '4.2' }),
      makeInitial({ ration: 3.5 }),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ 'RATION KG/J': 4.2 });
  });

  it('modifier NOM + ORIGINE + NOTES → patch contient uniquement ces 3 clés', () => {
    const res = validateVerratEdit(
      makeForm({
        nom: 'Hercule',
        origine: 'Azaguie',
        notes: 'Nouvel arrivage',
      }),
      makeInitial(),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({
      NOM: 'Hercule',
      ORIGINE: 'Azaguie',
      NOTES: 'Nouvel arrivage',
    });
    // Les champs non modifiés ne doivent PAS être dans le patch
    expect(res.patch).not.toHaveProperty('BOUCLE');
    expect(res.patch).not.toHaveProperty('RATION KG/J');
    expect(res.patch).not.toHaveProperty('STATUT');
    expect(res.patch).not.toHaveProperty('ALIMENTATION');
  });

  it('aucune modification → patch vide', () => {
    const res = validateVerratEdit(makeForm(), makeInitial());
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({});
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [5] Patch multi-champs (nom + ration)
// ══════════════════════════════════════════════════════════════════════════
describe('[5] patch multi-champs', () => {
  it('nom + ration modifiés → patch = { NOM, "RATION KG/J" }', () => {
    const res = validateVerratEdit(
      makeForm({ nom: 'Spartacus', ration: '5.0' }),
      makeInitial(),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ NOM: 'Spartacus', 'RATION KG/J': 5 });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// [6] Statut select change détecté
// ══════════════════════════════════════════════════════════════════════════
describe('[6] statut select change détecté', () => {
  it('Actif → Réforme → patch.STATUT = "Réforme"', () => {
    const res = validateVerratEdit(
      makeForm({ statut: 'Réforme' }),
      makeInitial({ statut: 'Actif' }),
    );
    expect(res.ok).toBe(true);
    expect(res.patch).toEqual({ STATUT: 'Réforme' });
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
