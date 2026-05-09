// @vitest-environment jsdom
/**
 * Tests unitaires — QuickEditTruieForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * V75-q-D : retrait du mock `enqueueUpdateRow` (fonction supprimée). Le
 * composant runtime appelle désormais `updateSow` direct via Supabase ;
 * les tests se concentrent sur les validators purs et le diff patch.
 *
 * Couvre :
 *   1. Le validateur pur `validateTruieEdit` (règles nom + ration) — LEGACY.
 *   2. Le validateur étendu `validateTruieEditFull` — multi-champs, diff patch.
 *   3. Conversion date yyyy-MM-dd → dd/MM/yyyy pour le patch.
 *   4. [V25] Détection conflit loge 1:1.
 *   5. [V26-FIX] Persistance Supabase via updateSow(uuid).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  validateTruieEdit,
  validateTruieEditFull,
  isoDateToFr,
  frDateToIso,
  type TruieEditDraft,
  type TruieEditInitial,
} from './quickEditTruieValidation';

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
  dateNaissance: '',
  origine: '',
  loge: '',
  notes: 'RAS',
};

const baseDraft: TruieEditDraft = { ...baseInitial };

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

describe('validateTruieEdit — patch contenu', () => {
  it('[3] patch contient NOM + RATION KG/J pour nom + ration valides', () => {
    const result = validateTruieEdit('Hermione', '4.2');
    expect(result.ok).toBe(true);
    expect(result.patch).toEqual({ NOM: 'Hermione', 'RATION KG/J': 4.2 });
  });

  it('[4] patch retire le nom (NOM="") quand vide', () => {
    const result = validateTruieEdit('', '6');
    expect(result.ok).toBe(true);
    expect(result.patch).toEqual({ NOM: '', 'RATION KG/J': 6 });
  });

  it('submit invalide → ok=false + erreur ration', () => {
    const result = validateTruieEdit('A', '15'); // > 10
    expect(result.ok).toBe(false);
    expect(result.errors.ration).toBeTruthy();
    expect(result.patch).toBeUndefined();
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

  // [NEW-7] Patch multi-champs avec conversion date
  it('[NEW-7] patch multi-champs (race, stade, date convertie)', () => {
    const draft: TruieEditDraft = {
      ...baseInitial,
      race: 'Duroc', // modifié
      stade: 'Gestante', // modifié
      dateMBPrevue: '2026-06-15', // modifié
    };

    const result = validateTruieEditFull(draft, baseInitial);
    expect(result.ok).toBe(true);
    expect(result.patch).toEqual({
      RACE: 'Duroc',
      STADE: 'Gestante',
      DATE_MB_PREVUE: '15/06/2026', // converti yyyy-MM-dd → dd/MM/yyyy
    });
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

// ─── V25 — Validation 1:1 loge (conflit avec autre sujet) ─────────────────
// Reproduit fidèlement la dérivation `logeConflict` du composant :
//   1. Cherche AUTRE truie avec ce logeId
//   2. Sinon cherche un verrat
//   3. Sinon cherche une bande
// Retourne { kind, label } ou null.
describe('[V25] QuickEditTruieForm — conflit loge 1:1', () => {
  interface MiniTruie {
    id: string;
    displayId?: string;
    boucle?: string;
    logeId?: string;
  }
  interface MiniVerrat {
    id: string;
    displayId?: string;
    boucle?: string;
    logeId?: string;
  }
  interface MiniBande {
    id: string;
    idPortee?: string;
    logeId?: string;
  }

  function detectLogeConflict(
    selectedLogeId: string,
    currentTruieId: string,
    truies: MiniTruie[],
    verrats: MiniVerrat[],
    bandes: MiniBande[],
  ): { kind: 'truie' | 'verrat' | 'bande'; label: string } | null {
    if (!selectedLogeId) return null;
    const otherTruie = truies.find(
      t => t.id !== currentTruieId && t.logeId === selectedLogeId,
    );
    if (otherTruie) {
      return { kind: 'truie', label: otherTruie.displayId || otherTruie.boucle || otherTruie.id };
    }
    const v = verrats.find(v0 => v0.logeId === selectedLogeId);
    if (v) return { kind: 'verrat', label: v.displayId || v.boucle || v.id };
    const b = bandes.find(b0 => b0.logeId === selectedLogeId);
    if (b) return { kind: 'bande', label: b.idPortee || b.id };
    return null;
  }

  it('affiche warning si loge occupée par un verrat (cas demandé)', () => {
    const conflict = detectLogeConflict(
      'L-01',
      'truie-A',
      [{ id: 'truie-A' }],
      [{ id: 'verrat-X', displayId: 'V05', logeId: 'L-01' }],
      [],
    );
    expect(conflict).toEqual({ kind: 'verrat', label: 'V05' });
  });

  it('affiche warning si loge occupée par une autre truie', () => {
    const conflict = detectLogeConflict(
      'L-02',
      'truie-A',
      [
        { id: 'truie-A' },
        { id: 'truie-B', displayId: 'T08', logeId: 'L-02' },
      ],
      [],
      [],
    );
    expect(conflict).toEqual({ kind: 'truie', label: 'T08' });
  });

  it('affiche warning si loge occupée par une bande', () => {
    const conflict = detectLogeConflict(
      'L-03',
      'truie-A',
      [{ id: 'truie-A' }],
      [],
      [{ id: 'bande-1', idPortee: 'P-2026-03', logeId: 'L-03' }],
    );
    expect(conflict).toEqual({ kind: 'bande', label: 'P-2026-03' });
  });

  it('aucun conflit si loge vide', () => {
    expect(
      detectLogeConflict('L-99', 'truie-A', [{ id: 'truie-A' }], [], []),
    ).toBeNull();
  });

  it('aucun conflit si selectedLogeId vide', () => {
    expect(
      detectLogeConflict(
        '',
        'truie-A',
        [{ id: 'truie-A', logeId: 'L-01' }],
        [{ id: 'v1', logeId: 'L-01' }],
        [],
      ),
    ).toBeNull();
  });

  it('priorité : autre truie avant verrat avant bande', () => {
    // Les 3 sont sur L-01 → priorité truie
    const conflict = detectLogeConflict(
      'L-01',
      'truie-A',
      [
        { id: 'truie-A' },
        { id: 'truie-B', displayId: 'T08', logeId: 'L-01' },
      ],
      [{ id: 'v1', displayId: 'V01', logeId: 'L-01' }],
      [{ id: 'b1', idPortee: 'P1', logeId: 'L-01' }],
    );
    expect(conflict?.kind).toBe('truie');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [V26-FIX] Persistence Supabase — appel updateSow(uuid) au lieu de
//   updateSowByCode(uuid). Ce helper miroir le code du composant après fix.
// ═══════════════════════════════════════════════════════════════════════════
describe('[V26-FIX] submit Supabase persiste via updateSow(uuid)', () => {
  type WriteResult = { success: boolean; error?: string };
  type SupabasePatch = { code_id?: string; [k: string]: unknown };

  /**
   * Miroir exact du code QuickEditTruieForm.tsx ligne 272 après fix.
   * Échec silencieux historique : updateSowByCode(uuid) → SELECT ne trouve
   * rien (un UUID n'est pas un code_id) → return null sans throw → toast
   * succès affiché à tort.
   *
   * Fix : updateSow(uuid) opère directement sur l'UUID, et on vérifie
   * WriteResult.success avant d'afficher le toast.
   */
  async function submitSupabasePatch(
    truieId: string,
    patch: SupabasePatch,
    updateSowFn: (id: string, p: SupabasePatch) => Promise<WriteResult>,
    setToast: (msg: string) => void,
  ): Promise<{ persisted: boolean }> {
    const result = await updateSowFn(truieId, patch);
    if (!result.success) {
      setToast(`Erreur : ${result.error ?? 'Enregistrement échoué'}`);
      return { persisted: false };
    }
    setToast('Modifications enregistrées');
    return { persisted: true };
  }

  it('[V26-FIX-1] updateSow appelé avec UUID truie (pas avec displayId)', async () => {
    const updateSowFn = vi.fn(async () => ({ success: true }));
    const setToast = vi.fn();
    const truieUuid = '3f8a1c92-1234-4abc-8def-9876543210ab';

    await submitSupabasePatch(
      truieUuid,
      { code_id: 'T-009' },
      updateSowFn,
      setToast,
    );

    expect(updateSowFn).toHaveBeenCalledTimes(1);
    expect(updateSowFn).toHaveBeenCalledWith(truieUuid, { code_id: 'T-009' });
    expect(setToast).toHaveBeenCalledWith('Modifications enregistrées');
  });

  it('[V26-FIX-2] WriteResult.success=false affiche un toast erreur (plus de faux succès)', async () => {
    const updateSowFn = vi.fn(async () => ({
      success: false,
      error: 'duplicate key value violates unique constraint sows_code_id_key',
    }));
    const setToast = vi.fn();

    const out = await submitSupabasePatch(
      'truie-uuid',
      { code_id: 'T-001' },
      updateSowFn,
      setToast,
    );

    expect(out.persisted).toBe(false);
    expect(setToast).toHaveBeenCalledTimes(1);
    expect(setToast.mock.calls[0][0]).toContain('Erreur');
    expect(setToast.mock.calls[0][0]).toContain('duplicate key');
  });

  it('[V26-FIX-3] WriteResult.success=false sans error → message générique', async () => {
    const updateSowFn = vi.fn(async () => ({ success: false }));
    const setToast = vi.fn();

    await submitSupabasePatch('truie-uuid', { code_id: 'T-007' }, updateSowFn, setToast);

    expect(setToast).toHaveBeenCalledWith('Erreur : Enregistrement échoué');
  });

  it('[V26-FIX-4] code_id modifié est bien transmis dans le patch (pas filtré)', async () => {
    const updateSowFn =
      vi.fn<(id: string, p: SupabasePatch) => Promise<WriteResult>>(
        async () => ({ success: true }),
      );
    const setToast = vi.fn();

    await submitSupabasePatch(
      'truie-uuid',
      { code_id: 'T-042', notes: 'changement numéro' },
      updateSowFn,
      setToast,
    );

    const patch = updateSowFn.mock.calls[0][1];
    expect(patch).toHaveProperty('code_id', 'T-042');
    expect(patch).toHaveProperty('notes', 'changement numéro');
  });
});
