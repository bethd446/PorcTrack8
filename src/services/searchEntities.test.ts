import { describe, expect, it } from 'vitest';
import { searchAll, type SearchSources } from './searchEntities';
import type { BandePorcelets, Truie, Verrat } from '../types/farm';

function makeTruie(over: Partial<Truie>): Truie {
  return {
    id: 'T01',
    displayId: 'T01',
    boucle: '12345',
    nom: 'Rose',
    statut: 'Pleine',
    ration: 2,
    synced: true,
    ...over,
  };
}

function makeVerrat(over: Partial<Verrat>): Verrat {
  return {
    id: 'V01',
    displayId: 'V01',
    boucle: '99001',
    nom: 'Titan',
    statut: 'Actif',
    ration: 3,
    synced: true,
    ...over,
  };
}

function makeBande(over: Partial<BandePorcelets>): BandePorcelets {
  return {
    id: 'B01',
    idPortee: 'P-2026-001',
    truie: 'T01',
    statut: 'Sous mère',
    dateMB: '01/04/2026',
    poidsInitialKg: 0,
    synced: true,
    ...over,
  };
}

const sources: SearchSources = {
  truies: [
    makeTruie({ id: 'T01', boucle: '12345', nom: 'Rose' }),
    makeTruie({ id: 'T02', displayId: 'T02', boucle: '12399', nom: 'Marguerite', statut: 'Vide' }),
    makeTruie({ id: 'T03', displayId: 'T03', boucle: '54321', nom: 'Belle', statut: 'En maternité' }),
  ],
  verrats: [
    makeVerrat({ id: 'V01', boucle: '99001', nom: 'Titan' }),
    makeVerrat({ id: 'V02', boucle: '12350', nom: 'Hercule' }),
  ],
  bandes: [
    makeBande({ id: 'B01', idPortee: 'P-2026-001', truie: 'T01' }),
    makeBande({ id: 'B02', idPortee: 'P-2026-002', truie: 'T02' }),
  ],
};

describe('searchAll', () => {
  it('retourne [] si la query est vide ou whitespace', () => {
    expect(searchAll('', sources)).toEqual([]);
    expect(searchAll('   ', sources)).toEqual([]);
  });

  it('match exact sur boucle truie en premier', () => {
    const out = searchAll('12345', sources);
    expect(out[0]).toMatchObject({
      type: 'truie',
      id: 'T01',
      primary: '12345',
      href: '/troupeau/truies/T01',
    });
  });

  it('priorise prefix numérique : "123" matche 12345/12399/12350', () => {
    const out = searchAll('123', sources);
    const ids = out.map((r) => r.id);
    expect(ids).toContain('T01');
    expect(ids).toContain('T02');
    expect(ids).toContain('V02');
    // Tous prefix matches : score identique 100, ordre stable
    expect(out.every((r) => r.primary.startsWith('123'))).toBe(true);
  });

  it('fuzzy match sur nom de truie (case-insensitive)', () => {
    const out = searchAll('rOsE', sources);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].id).toBe('T01');
  });

  it('multi-type : query qui match truie + verrat + bande', () => {
    const out = searchAll('T01', sources);
    const types = new Set(out.map((r) => r.type));
    expect(types.has('truie')).toBe(true);
    expect(types.has('bande')).toBe(true);
  });

  it('respecte le limit', () => {
    const out = searchAll('12', sources, 2);
    expect(out.length).toBe(2);
  });

  it('retourne le href correct par type', () => {
    expect(searchAll('12345', sources)[0].href).toBe('/troupeau/truies/T01');
    expect(searchAll('99001', sources)[0].href).toBe('/troupeau/verrats/V01');
    expect(searchAll('P-2026-001', sources)[0].href).toBe('/troupeau/bandes/B01');
  });

  it('exact match score > prefix match score', () => {
    const out = searchAll('12345', sources);
    // 12345 (exact) doit passer avant 12350/12399 (prefix)
    expect(out[0].id).toBe('T01');
  });
});
