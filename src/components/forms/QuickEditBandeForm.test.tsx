// @vitest-environment jsdom
/**
 * Tests unitaires — QuickEditBandeForm (logic-level).
 * ════════════════════════════════════════════════════════════════════════
 * V75-q-D : retrait du mock `enqueueUpdateRow` (fonction supprimée). Le
 * composant runtime appelle désormais `updateBatchByCode` direct via
 * Supabase ; les tests valident maintenant `validateBandeEdit` et le diff
 * patch produit (clés canoniques + conversion dates).
 *
 * Couvre :
 *   [1] Render (signature des champs / raw input mapping)
 *   [2] Validation Morts + Vivants > NV rejetée
 *   [3] Validation date sevrage avant date MB rejetée
 *   [4] Diff patch — sheet/id n'existent plus, on assert sur les clés canoniques
 *   [5] Diff patch partiel (juste vivants modifié)
 *   [6] Conversion dates ISO → dd/MM/yyyy dans le patch
 *   [V24] Sources multi-mères + sélection loge
 *   [V25] Conflit loge 1:1
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  validateBandeEdit,
  bandeToRawInput,
  BANDE_STATUTS,
  type BandeEditRawInput,
} from './quickEditBandeValidation';
import type { BandePorcelets } from '../../types/farm';

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
    poidsInitialKg: 0,
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
    poidsMoyenKg: '',
    verratPere: '',
    ...overrides,
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
      poidsMoyenKg: '',
      verratPere: '',
    });
  });

  it('gère les champs undefined/optionnels en chaîne vide', () => {
    const bande: BandePorcelets = {
      id: 'P-1',
      idPortee: 'P-1',
      statut: 'Sevrés',
      poidsInitialKg: 0,
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

// ─── [4] Diff patch — clés canoniques ─────────────────────────────────────
describe('[4] diff patch — clés canoniques', () => {
  it('produit un patch multi-clés avec TRUIE, NV, MORTS, VIVANTS, STATUT, NOTES', () => {
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

    const result = validateBandeEdit(input, initial);
    expect(result.ok).toBe(true);
    expect(result.patch).toMatchObject({
      TRUIE: 'T07',
      NV: 15,
      MORTS: 3,
      VIVANTS: 11,
      STATUT: 'Sevrés',
      NOTES: 'Portée solide',
    });
  });
});

// ─── [5] Patch partiel — un seul champ modifié ────────────────────────────
describe('[5] patch partiel — seules les valeurs modifiées', () => {
  it('produit uniquement VIVANTS quand seul ce champ change', () => {
    const bande = makeBande();
    const initial = bandeToRawInput(bande);
    const input: BandeEditRawInput = { ...initial, vivants: '11' }; // seule modif

    const result = validateBandeEdit(input, initial);
    expect(result.ok).toBe(true);
    expect(result.patch).toEqual({ VIVANTS: 11 });

    // Aucune autre clé (TRUIE, NV, MORTS, STATUT, etc.) ne doit apparaître
    const keys = Object.keys(result.patch ?? {});
    expect(keys).toHaveLength(1);
    expect(keys).toEqual(['VIVANTS']);
  });

  it('patch vide quand aucune modification', () => {
    const bande = makeBande();
    const initial = bandeToRawInput(bande);
    const input = { ...initial }; // aucune modif

    const result = validateBandeEdit(input, initial);
    expect(result.ok).toBe(true);
    expect(result.patch).toEqual({});
  });
});

// ─── [6] Dates au format dd/MM/yyyy ───────────────────────────────────────
describe('[6] conversion dates ISO → dd/MM/yyyy dans le patch', () => {
  it('convertit DATE_MB, DATE_SEVRAGE_PREVUE, DATE_SEVRAGE_REELLE, DATE_SEPARATION', () => {
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

    const result = validateBandeEdit(input, initial);
    expect(result.ok).toBe(true);
    expect(result.patch).toMatchObject({
      DATE_MB: '15/03/2026',
      DATE_SEVRAGE_PREVUE: '12/04/2026',
      DATE_SEVRAGE_REELLE: '14/04/2026',
      DATE_SEPARATION: '22/06/2026',
    });
  });

  it('effacer une date → patch contient chaîne vide', () => {
    const bande = makeBande({ dateSevrageReelle: '14/04/2026' });
    const initial = bandeToRawInput(bande);
    const input: BandeEditRawInput = {
      ...initial,
      dateSevrageReelle: '',
    };
    const result = validateBandeEdit(input, initial);
    expect(result.ok).toBe(true);
    expect(result.patch).toEqual({ DATE_SEVRAGE_REELLE: '' });
  });
});

// ─── [V24-1] Sources multi-mères — logique somme + warning ───────────────
describe('[V24-1] sources multi-mères — somme + warning > NV', () => {
  // Mirror la logique du composant : computeOverCapacityWarning(sources, nv).
  function computeTotal(sources: { nbPorceletsApportes: number }[]): number {
    return sources.reduce((sum, s) => sum + s.nbPorceletsApportes, 0);
  }
  function isOverCapacity(
    sources: { nbPorceletsApportes: number }[],
    nv: number,
  ): boolean {
    return Number.isFinite(nv) && nv > 0 && computeTotal(sources) > nv;
  }

  it('somme correcte sur 3 sources', () => {
    const sources = [
      { nbPorceletsApportes: 6 },
      { nbPorceletsApportes: 4 },
      { nbPorceletsApportes: 5 },
    ];
    expect(computeTotal(sources)).toBe(15);
  });

  it('warning UI déclenché quand total > NV (pas blocage submit)', () => {
    const sources = [
      { nbPorceletsApportes: 8 },
      { nbPorceletsApportes: 7 },
    ];
    expect(isOverCapacity(sources, 12)).toBe(true);
    // Le submit reste possible — ce n'est qu'une signalétique UI.
  });

  it('pas de warning quand total <= NV', () => {
    const sources = [{ nbPorceletsApportes: 5 }];
    expect(isOverCapacity(sources, 12)).toBe(false);
  });

  it('exclut les truies déjà sources du sélecteur', () => {
    const truies = [
      { id: 'sow-1' },
      { id: 'sow-2' },
      { id: 'sow-3' },
    ];
    const sources = [{ sowId: 'sow-1' }, { sowId: 'sow-3' }];
    const sourceIds = new Set(sources.map(s => s.sowId));
    const dispo = truies.filter(t => !sourceIds.has(t.id));
    expect(dispo).toEqual([{ id: 'sow-2' }]);
  });
});

// ─── [V24-2] Sélection loge — logique patch loge_id ──────────────────────
describe('[V24-2] sélection loge — patch loge_id quand dirty', () => {
  // Mirror la logique submit du composant : on patche loge_id seulement
  // si l'utilisateur a explicitement changé la sélection.
  function buildLogePatch(
    selectedLogeId: string,
    selectedLogeIdDirty: boolean,
  ): Record<string, string | null> | null {
    if (!selectedLogeIdDirty) return null;
    return { loge_id: selectedLogeId || null };
  }

  it('produit { loge_id: <id> } quand dirty et id sélectionné', () => {
    const patch = buildLogePatch('loge-uuid-1', true);
    expect(patch).toEqual({ loge_id: 'loge-uuid-1' });
  });

  it('produit { loge_id: null } quand dirty et "Aucune"', () => {
    const patch = buildLogePatch('', true);
    expect(patch).toEqual({ loge_id: null });
  });

  it('null patch (aucun appel) si non-dirty', () => {
    expect(buildLogePatch('loge-uuid-1', false)).toBeNull();
  });
});

// ─── [V25-1] Conflit 1:1 loge ─────────────────────────────────────────────
// Mirror la logique `logeConflict` du composant : on cherche AUTRE bande
// avec ce logeId, sinon truie, sinon verrat. Retourne {kind, label} ou null.
describe('[V25-1] conflit loge 1:1 — bande déjà occupée', () => {
  interface MiniBande {
    id: string;
    idPortee?: string;
    logeId?: string;
  }
  interface MiniTruie {
    id: string;
    displayId?: string;
    logeId?: string;
  }
  interface MiniVerrat {
    id: string;
    displayId?: string;
    logeId?: string;
  }

  function detectConflict(
    selectedLogeId: string,
    currentBandeId: string,
    bandes: MiniBande[],
    truies: MiniTruie[],
    verrats: MiniVerrat[],
  ): { kind: 'bande' | 'truie' | 'verrat'; label: string } | null {
    if (!selectedLogeId) return null;
    const otherBande = bandes.find(
      b => b.id !== currentBandeId && b.logeId === selectedLogeId,
    );
    if (otherBande) {
      return { kind: 'bande', label: otherBande.idPortee || otherBande.id };
    }
    const t = truies.find(t0 => t0.logeId === selectedLogeId);
    if (t) return { kind: 'truie', label: t.displayId || t.id };
    const v = verrats.find(v0 => v0.logeId === selectedLogeId);
    if (v) return { kind: 'verrat', label: v.displayId || v.id };
    return null;
  }

  it('warning si loge déjà occupée par UNE AUTRE bande active', () => {
    const conflict = detectConflict(
      'L-A',
      'bande-courante',
      [
        { id: 'bande-courante' },
        { id: 'bande-autre', idPortee: 'P-2026-04', logeId: 'L-A' },
      ],
      [],
      [],
    );
    expect(conflict).toEqual({ kind: 'bande', label: 'P-2026-04' });
  });

  it('warning si loge occupée par une truie', () => {
    const conflict = detectConflict(
      'L-A',
      'bande-courante',
      [{ id: 'bande-courante' }],
      [{ id: 't1', displayId: 'T05', logeId: 'L-A' }],
      [],
    );
    expect(conflict).toEqual({ kind: 'truie', label: 'T05' });
  });

  it('aucun conflit si on resélectionne la même loge que la bande courante', () => {
    // La bande courante peut "garder" sa propre loge sans warning
    const conflict = detectConflict(
      'L-A',
      'bande-courante',
      [{ id: 'bande-courante', idPortee: 'P-1', logeId: 'L-A' }],
      [],
      [],
    );
    expect(conflict).toBeNull();
  });
});

// ─── [7] Patch STATUT seul ────────────────────────────────────────────────
describe('[7] patch STATUT seul', () => {
  it('produit { STATUT } quand seul le statut change', () => {
    const bande = makeBande();
    const initial = bandeToRawInput(bande);
    const input: BandeEditRawInput = { ...initial, statut: 'Sevrés' };

    const result = validateBandeEdit(input, initial);
    expect(result.ok).toBe(true);
    expect(result.patch).toEqual({ STATUT: 'Sevrés' });
  });
});
