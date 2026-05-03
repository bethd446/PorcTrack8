/**
 * Tests unitaires — dailyMBChecklistLogic (validation pure).
 */
import { describe, it, expect } from 'vitest';
import {
  emptyDraft,
  validateDailyMB,
  type DailyMBDraft,
} from './dailyMBChecklistLogic';

const DRAFT_OK: DailyMBDraft = {
  mortsJour: '0',
  comportement: 'NORMAL',
  truieAlimentation: 'OUI',
  mamellesUtilisees: true,
  diarrhee: 'AUCUN',
  respirationOk: true,
  lampeOk: true,
  eauOk: true,
  notes: '',
  photoUrl: '',
};

describe('emptyDraft', () => {
  it('retourne morts_jour à "0" et autres null/empty', () => {
    const d = emptyDraft();
    expect(d.mortsJour).toBe('0');
    expect(d.comportement).toBe('');
    expect(d.mamellesUtilisees).toBeNull();
  });
});

describe('validateDailyMB — succès', () => {
  it('accepte un draft complet', () => {
    const r = validateDailyMB(DRAFT_OK);
    expect(r.ok).toBe(true);
    expect(r.values?.mortsJour).toBe(0);
    expect(r.values?.comportement).toBe('NORMAL');
    expect(r.values?.truieAlimentation).toBe('OUI');
  });

  it('accepte morts_jour vide → 0 par défaut', () => {
    const r = validateDailyMB({ ...DRAFT_OK, mortsJour: '' });
    expect(r.ok).toBe(true);
    expect(r.values?.mortsJour).toBe(0);
  });

  it('accepte enums vides (optionnels)', () => {
    const r = validateDailyMB({
      ...DRAFT_OK,
      comportement: '',
      truieAlimentation: '',
      diarrhee: '',
    });
    expect(r.ok).toBe(true);
    expect(r.values?.comportement).toBeNull();
    expect(r.values?.truieAlimentation).toBeNull();
    expect(r.values?.diarrhee).toBeNull();
  });

  it('trim notes et retourne null si vide', () => {
    const r = validateDailyMB({ ...DRAFT_OK, notes: '   ' });
    expect(r.ok).toBe(true);
    expect(r.values?.notes).toBeNull();
  });

  it('préserve valeurs notes non vides', () => {
    const r = validateDailyMB({ ...DRAFT_OK, notes: 'porcelet n°3 chétif' });
    expect(r.ok).toBe(true);
    expect(r.values?.notes).toBe('porcelet n°3 chétif');
  });

  it('booleans null restent null', () => {
    const r = validateDailyMB({
      ...DRAFT_OK,
      mamellesUtilisees: null,
      respirationOk: null,
      lampeOk: null,
      eauOk: null,
    });
    expect(r.ok).toBe(true);
    expect(r.values?.mamellesUtilisees).toBeNull();
    expect(r.values?.respirationOk).toBeNull();
  });
});

describe('validateDailyMB — erreurs', () => {
  it('rejette mortsJour négatif', () => {
    const r = validateDailyMB({ ...DRAFT_OK, mortsJour: '-1' });
    expect(r.ok).toBe(false);
    expect(r.errors.mortsJour).toBeTruthy();
  });

  it('rejette mortsJour > 50', () => {
    const r = validateDailyMB({ ...DRAFT_OK, mortsJour: '99' });
    expect(r.ok).toBe(false);
    expect(r.errors.mortsJour).toMatch(/0 et 50/);
  });

  it('rejette mortsJour décimal', () => {
    const r = validateDailyMB({ ...DRAFT_OK, mortsJour: '1.5' });
    expect(r.ok).toBe(false);
    expect(r.errors.mortsJour).toBeTruthy();
  });

  it('rejette mortsJour non numérique', () => {
    const r = validateDailyMB({ ...DRAFT_OK, mortsJour: 'abc' });
    expect(r.ok).toBe(false);
    expect(r.errors.mortsJour).toBeTruthy();
  });

  it('rejette comportement invalide', () => {
    const r = validateDailyMB({
      ...DRAFT_OK,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comportement: 'WAT' as any,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.comportement).toBeTruthy();
  });

  it('rejette diarrhée invalide', () => {
    const r = validateDailyMB({
      ...DRAFT_OK,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      diarrhee: 'PEUT_ETRE' as any,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.diarrhee).toBeTruthy();
  });

  it('rejette notes >1000 chars', () => {
    const r = validateDailyMB({ ...DRAFT_OK, notes: 'a'.repeat(1001) });
    expect(r.ok).toBe(false);
    expect(r.errors.notes).toMatch(/1000/);
  });
});
