import { describe, it, expect } from 'vitest';
import { computeTruiePerformanceEco, filterBandesForTruie } from '../truiePerformanceEco';
import type { Truie, BandePorcelets } from '../../../types/farm';

const baseTruie: Truie = {
  id: 't-001',
  displayId: 'T01',
  boucle: 'BCL-0001',
  ration: 2.5,
  statut: 'En attente saillie',
  nbPortees: 3,
  derniereNV: 11,
  dateNaissance: '2024-01-01',
  synced: true,
};

function makeBande(partial: Partial<BandePorcelets> & { id: string }): BandePorcelets {
  return {
    idPortee: partial.idPortee ?? `P-${partial.id}`,
    poidsInitialKg: 7,
    statut: 'Sevrés',
    synced: true,
    ...partial,
  } as BandePorcelets;
}

describe('filterBandesForTruie', () => {
  it('match displayId via b.truie', () => {
    const bandes = [
      makeBande({ id: 'b1', truie: 'T01' }),
      makeBande({ id: 'b2', truie: 'T02' }),
    ];
    expect(filterBandesForTruie(baseTruie, bandes)).toHaveLength(1);
  });

  it('match id direct via b.truie', () => {
    const bandes = [makeBande({ id: 'b1', truie: 't-001' })];
    expect(filterBandesForTruie(baseTruie, bandes)).toHaveLength(1);
  });

  it('match boucle via b.boucleMere', () => {
    const bandes = [makeBande({ id: 'b1', boucleMere: 'BCL-0001' })];
    expect(filterBandesForTruie(baseTruie, bandes)).toHaveLength(1);
  });
});

describe('computeTruiePerformanceEco', () => {
  it('truie sans données — retourne structure cohérente', () => {
    const truie: Truie = {
      ...baseTruie,
      nbPortees: 0,
      derniereNV: undefined,
      ration: 0,
      dateNaissance: undefined,
    };
    const res = computeTruiePerformanceEco(truie, []);
    expect(res.portees).toBe(0);
    expect(res.derniereNV).toBeNull();
    expect(res.moyNVParPortee).toBeNull();
    expect(res.alimConsommeeKg).toBeNull();
    expect(res.alimConsommeeFcfa).toBeNull();
    expect(res.margeEstimeeFcfa).toBeNull();
    expect(res.margeStatus).toBe('PAS_ENCORE_VENDUE');
  });

  it('moyenne NV calculée depuis bandes', () => {
    const bandes = [
      makeBande({ id: 'b1', truie: 'T01', nv: 10 }),
      makeBande({ id: 'b2', truie: 'T01', nv: 12 }),
      makeBande({ id: 'b3', truie: 'T01', nv: 14 }),
    ];
    const res = computeTruiePerformanceEco(baseTruie, bandes);
    expect(res.moyNVParPortee).toBe(12);
    expect(res.derniereNV).toBe(11);
  });

  it('aliment consommée = ration × jours × prix (proportionnel)', () => {
    // Naissance 2024-06-01 (été, pas de DST sur l'intervalle).
    const truie: Truie = { ...baseTruie, dateNaissance: '2024-06-01' };
    const today = new Date(2024, 8, 9); // 1er sept + 8 = 9 sept 2024 → 100j après 1er juin (jun=30, jul=31, aug=31, +8 = 100)
    const res = computeTruiePerformanceEco(truie, [], { prixAlimKgFcfa: 280, today });
    expect(res.alimConsommeeKg).toBe(2.5 * 100);
    expect(res.alimConsommeeFcfa).toBe(2.5 * 100 * 280);
  });

  it('marge calculée si VENTE avec prix', () => {
    const truie: Truie = {
      ...baseTruie,
      dateNaissance: '2024-06-01',
      typeSortie: 'VENTE',
      dateSortie: '2024-09-09', // exactement 100 jours plus tard
      prixSortieFcfa: 200_000,
    };
    const res = computeTruiePerformanceEco(truie, [], { prixAlimKgFcfa: 280 });
    expect(res.alimConsommeeFcfa).toBe(70_000);
    expect(res.margeEstimeeFcfa).toBe(130_000);
    expect(res.margeStatus).toBe('CALCULEE');
  });

  it('marge null si abattoir', () => {
    const truie: Truie = { ...baseTruie, typeSortie: 'ABATTOIR', dateSortie: '2024-04-10' };
    const res = computeTruiePerformanceEco(truie, []);
    expect(res.margeEstimeeFcfa).toBeNull();
    expect(res.margeStatus).toBe('NON_APPLICABLE');
  });

  it('marge null si pas encore vendue', () => {
    const res = computeTruiePerformanceEco(baseTruie, []);
    expect(res.margeEstimeeFcfa).toBeNull();
    expect(res.margeStatus).toBe('PAS_ENCORE_VENDUE');
  });
});
