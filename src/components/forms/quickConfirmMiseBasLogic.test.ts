/**
 * Tests unitaires — quickConfirmMiseBasLogic (validation pure + helpers).
 */
import { describe, it, expect } from 'vitest';
import {
  computeMortNes,
  generateMbCodeId,
  selectSailliesProchesMB,
  validateMiseBas,
  type MiseBasDraft,
  type SaillieLike,
} from './quickConfirmMiseBasLogic';

const DRAFT_OK: MiseBasDraft = {
  dateMiseBas: '2026-05-02',
  nbTotal: '12',
  nbVivants: '11',
  poidsPorteeKg: '16.5',
  nbMales: '5',
  nbFemelles: '6',
  logeId: 'loge-uuid-abc',
};

describe('computeMortNes', () => {
  it('calcule le nombre de mort-nés total - vivants', () => {
    expect(computeMortNes(12, 10)).toBe(2);
    expect(computeMortNes(8, 8)).toBe(0);
  });

  it('clamp à 0 si vivants > total', () => {
    expect(computeMortNes(5, 10)).toBe(0);
  });

  it('retourne 0 sur input non fini', () => {
    expect(computeMortNes(NaN, 5)).toBe(0);
    expect(computeMortNes(5, NaN)).toBe(0);
  });
});

describe('generateMbCodeId', () => {
  it('génère un code B-YYYYMMDD-MB-CODE', () => {
    expect(generateMbCodeId('2026-05-02', 'T07')).toBe('B-20260502-MB-T07');
  });

  it('nettoie les caractères spéciaux du code truie', () => {
    expect(generateMbCodeId('2026-05-02', 'T 07/B')).toBe('B-20260502-MB-T-07-B');
  });

  it('fallback X si code truie vide', () => {
    expect(generateMbCodeId('2026-05-02', '')).toBe('B-20260502-MB-X');
  });
});

describe('validateMiseBas — succès', () => {
  it('accepte un draft complet bien formé', () => {
    const r = validateMiseBas(DRAFT_OK);
    expect(r.ok).toBe(true);
    expect(r.values?.nbTotal).toBe(12);
    expect(r.values?.nbVivants).toBe(11);
    expect(r.values?.nbMortNes).toBe(1);
    expect(r.values?.poidsPorteeKg).toBe(16.5);
    expect(r.values?.nbMales).toBe(5);
    expect(r.values?.nbFemelles).toBe(6);
  });

  it('accepte poids vide (optionnel)', () => {
    const r = validateMiseBas({ ...DRAFT_OK, poidsPorteeKg: '' });
    expect(r.ok).toBe(true);
    expect(r.values?.poidsPorteeKg).toBeNull();
  });

  it('accepte M/F vides (optionnel)', () => {
    const r = validateMiseBas({ ...DRAFT_OK, nbMales: '', nbFemelles: '' });
    expect(r.ok).toBe(true);
    expect(r.values?.nbMales).toBeNull();
    expect(r.values?.nbFemelles).toBeNull();
  });

  it('accepte virgule décimale dans poids (16,5)', () => {
    const r = validateMiseBas({ ...DRAFT_OK, poidsPorteeKg: '16,5' });
    expect(r.ok).toBe(true);
    expect(r.values?.poidsPorteeKg).toBe(16.5);
  });
});

describe('validateMiseBas — erreurs', () => {
  it('rejette nbVivants > nbTotal', () => {
    const r = validateMiseBas({ ...DRAFT_OK, nbTotal: '8', nbVivants: '10' });
    expect(r.ok).toBe(false);
    expect(r.errors.nbVivants).toMatch(/dépasser/i);
  });

  it('rejette nbTotal hors borne (>25)', () => {
    const r = validateMiseBas({ ...DRAFT_OK, nbTotal: '30' });
    expect(r.ok).toBe(false);
    expect(r.errors.nbTotal).toMatch(/1 et 25/);
  });

  it('rejette nbTotal=0', () => {
    const r = validateMiseBas({ ...DRAFT_OK, nbTotal: '0' });
    expect(r.ok).toBe(false);
    expect(r.errors.nbTotal).toBeTruthy();
  });

  it('rejette M+F > vivants', () => {
    const r = validateMiseBas({ ...DRAFT_OK, nbVivants: '10', nbMales: '6', nbFemelles: '6' });
    expect(r.ok).toBe(false);
    expect(r.errors.nbMales).toMatch(/M \+ F/);
  });

  it('rejette date future', () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const r = validateMiseBas({ ...DRAFT_OK, dateMiseBas: future });
    expect(r.ok).toBe(false);
    expect(r.errors.dateMiseBas).toMatch(/future/i);
  });

  it('rejette date format invalide', () => {
    const r = validateMiseBas({ ...DRAFT_OK, dateMiseBas: '02/05/2026' });
    expect(r.ok).toBe(false);
    expect(r.errors.dateMiseBas).toBeTruthy();
  });

  it('rejette logeId vide', () => {
    const r = validateMiseBas({ ...DRAFT_OK, logeId: '' });
    expect(r.ok).toBe(false);
    expect(r.errors.logeId).toBeTruthy();
  });

  it('rejette poids hors borne (>50)', () => {
    const r = validateMiseBas({ ...DRAFT_OK, poidsPorteeKg: '60' });
    expect(r.ok).toBe(false);
    expect(r.errors.poidsPorteeKg).toBeTruthy();
  });

  it('rejette nbVivants négatif', () => {
    const r = validateMiseBas({ ...DRAFT_OK, nbVivants: '-1' });
    expect(r.ok).toBe(false);
    expect(r.errors.nbVivants).toBeTruthy();
  });
});

describe('selectSailliesProchesMB', () => {
  const ref = new Date('2026-05-02T12:00:00Z');

  function mkSaillie(id: string, dateSaillie: string, prevueOverride?: string): SaillieLike {
    return {
      id,
      sow_id: `sow-${id}`,
      boar_id: `boar-${id}`,
      date_saillie: dateSaillie,
      date_mb_prevue: prevueOverride ?? null,
    };
  }

  it('retourne saillies dont MB prévue tombe J-3 à J+2', () => {
    const saillies: SaillieLike[] = [
      // J-3 (prévue 2026-05-05) → DANS la fenêtre
      mkSaillie('s1', '2026-01-10', '2026-05-05'),
      // J+2 (prévue 2026-04-30) → DANS la fenêtre (retard)
      mkSaillie('s2', '2026-01-05', '2026-04-30'),
      // J+5 (prévue 2026-04-27) → HORS fenêtre (trop ancien)
      mkSaillie('s3', '2026-01-02', '2026-04-27'),
      // J-10 (prévue 2026-05-12) → HORS fenêtre (trop loin)
      mkSaillie('s4', '2026-01-17', '2026-05-12'),
    ];
    const r = selectSailliesProchesMB(saillies, ref);
    expect(r.map(s => s.id)).toEqual(['s2', 's1']);
  });

  it('dérive date_mb_prevue depuis date_saillie + 115j si manquante', () => {
    // 2026-01-08 + 115j = 2026-05-03 (J-1) → DANS fenêtre
    const saillies: SaillieLike[] = [mkSaillie('sX', '2026-01-08')];
    const r = selectSailliesProchesMB(saillies, ref);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('sX');
    expect(r[0].date_mb_prevue).toBe('2026-05-03');
  });

  it('exclut saillies sans date utilisable', () => {
    const saillies: SaillieLike[] = [
      { id: 's-null', sow_id: null, boar_id: null, date_saillie: null, date_mb_prevue: null },
    ];
    const r = selectSailliesProchesMB(saillies, ref);
    expect(r).toEqual([]);
  });

  it('tri urgence : retard (négatif) en premier', () => {
    const saillies: SaillieLike[] = [
      mkSaillie('s-future', '2026-01-12', '2026-05-05'), // J+3 trop tard? J-3
      mkSaillie('s-now', '2026-01-07', '2026-05-02'),    // J 0
      mkSaillie('s-late', '2026-01-04', '2026-04-30'),   // J+2 retard
    ];
    const r = selectSailliesProchesMB(saillies, ref);
    expect(r.map(s => s.id)).toEqual(['s-late', 's-now', 's-future']);
  });
});
