import { describe, it, expect } from 'vitest';
import {
  isReformed,
  needsReformConsideration,
  alreadySortedOut,
  reformReason,
} from '../reformLogic';

const baseTruie = {
  id: 't-001',
  displayId: 'T-001',
  boucle: 'BCL-0001',
  ration: 0,
  statut: 'En attente saillie' as string,
  nbPortees: 2,
  dateNaissance: '2024-01-01',
};

describe('isReformed', () => {
  it('vrai si statut contient "réforme"', () => {
    expect(isReformed({ ...baseTruie, statut: 'Réforme' })).toBe(true);
  });

  it('vrai si statut contient "reforme" sans accent', () => {
    expect(isReformed({ ...baseTruie, statut: 'reforme' })).toBe(true);
  });

  it('faux si statut autre', () => {
    expect(isReformed({ ...baseTruie, statut: 'Pleine' })).toBe(false);
  });
});

describe('needsReformConsideration', () => {
  it('parité ≥ 6 → vrai', () => {
    expect(needsReformConsideration({ ...baseTruie, nbPortees: 6 })).toBe(true);
  });

  it('0 portée + âge ≥ 12 mois → vrai', () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    expect(
      needsReformConsideration({
        ...baseTruie,
        nbPortees: 0,
        dateNaissance: oldDate.toISOString().slice(0, 10),
      }),
    ).toBe(true);
  });

  it('jeune avec 0 portée → faux', () => {
    const recent = new Date();
    recent.setMonth(recent.getMonth() - 6);
    expect(
      needsReformConsideration({
        ...baseTruie,
        nbPortees: 0,
        dateNaissance: recent.toISOString().slice(0, 10),
      }),
    ).toBe(false);
  });

  it('parité moyenne, productive → faux', () => {
    expect(needsReformConsideration({ ...baseTruie, nbPortees: 3 })).toBe(false);
  });
});

describe('alreadySortedOut', () => {
  it('vrai si dateSortie présente', () => {
    expect(alreadySortedOut({ ...baseTruie, dateSortie: '2026-04-01' } as any)).toBe(true);
  });

  it('faux si dateSortie absente', () => {
    expect(alreadySortedOut(baseTruie as any)).toBe(false);
  });
});

describe('reformReason', () => {
  it('parité ≥ 6 → texte spécifique', () => {
    expect(reformReason({ ...baseTruie, nbPortees: 6 })).toBe('Truie âgée — 6 portées ou plus');
  });

  it('0 portée âgée → texte spécifique', () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    expect(
      reformReason({
        ...baseTruie,
        nbPortees: 0,
        dateNaissance: oldDate.toISOString().slice(0, 10),
      }),
    ).toBe('Trop âgée ou pas assez de portées');
  });
});
