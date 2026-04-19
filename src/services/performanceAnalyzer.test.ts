/**
 * Tests unitaires — performanceAnalyzer
 * ═════════════════════════════════════
 * Couvre :
 *   • Calcul TruiePerformance (nominal, 0 portées, mortalité élevée)
 *   • Matching portée via boucleMere
 *   • Division par zéro (NV = 0, saillies = 0)
 *   • Calcul VerratPerformance (nominal, 0 saillies)
 *   • Matching verrat → portée via saillie
 */

import { describe, expect, it } from 'vitest';
import {
  computeTruiePerformance,
  computeVerratPerformance,
  findPorteesForTruie,
  findPorteesForVerrat,
  scoreToTier,
} from './performanceAnalyzer';
import type { Truie, Verrat, BandePorcelets, Saillie } from '../types/farm';

// ─── Fixture helpers ────────────────────────────────────────────────────────

function makeTruie(over: Partial<Truie> = {}): Truie {
  return {
    id: 'T01',
    displayId: 'T01',
    boucle: 'B001',
    statut: 'Pleine',
    ration: 3,
    synced: true,
    ...over,
  };
}

function makeVerrat(over: Partial<Verrat> = {}): Verrat {
  return {
    id: 'V01',
    displayId: 'V01',
    boucle: 'BV001',
    statut: 'Actif',
    ration: 3,
    synced: true,
    ...over,
  };
}

function makeBande(over: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: `P${Math.random().toString(36).substr(2, 4)}`,
    idPortee: 'P-X',
    truie: 'T01',
    dateMB: '01/01/2025',
    nv: 12,
    morts: 1,
    vivants: 11,
    statut: 'Sous mère',
    synced: true,
    ...over,
  };
}

function makeSaillie(over: Partial<Saillie> = {}): Saillie {
  return {
    truieId: 'T01',
    dateSaillie: '01/09/2024',
    verratId: 'V01',
    dateMBPrevue: '24/12/2024',
    ...over,
  };
}

// ─── computeTruiePerformance ─────────────────────────────────────────────────

describe('computeTruiePerformance', () => {
  it('truie avec 3 portées cohérentes → score et tier cohérents', () => {
    const truie = makeTruie();
    const bandes: BandePorcelets[] = [
      makeBande({ id: 'P1', dateMB: '01/01/2024', nv: 12, morts: 1, vivants: 11, dateSevrageReelle: '22/01/2024' }),
      makeBande({ id: 'P2', dateMB: '01/05/2024', nv: 13, morts: 1, vivants: 12, dateSevrageReelle: '22/05/2024' }),
      makeBande({ id: 'P3', dateMB: '01/09/2024', nv: 14, morts: 2, vivants: 12 }),
    ];
    const saillies: Saillie[] = [
      makeSaillie({ dateSaillie: '10/09/2023', dateMBPrevue: '02/01/2024' }),
      makeSaillie({ dateSaillie: '10/01/2024', dateMBPrevue: '04/05/2024' }),
      makeSaillie({ dateSaillie: '10/05/2024', dateMBPrevue: '03/09/2024' }),
    ];

    const perf = computeTruiePerformance(truie, bandes, saillies);

    expect(perf.nbPortees).toBe(3);
    expect(perf.nbPorteesAvecMB).toBe(3);
    expect(perf.moyNV).toBeCloseTo(13, 1);
    expect(perf.tauxSurvieNaissance).toBeGreaterThan(85);
    expect(perf.nbSailliesReussies).toBe(3);
    expect(perf.tauxFertilite).toBe(100);
    expect(perf.scoreCompetence).toBeGreaterThan(55);
    expect(['ELITE', 'BON', 'MOYEN']).toContain(perf.tier);
    expect(perf.dernierMBDate).toBe('01/09/2024');
  });

  it('truie 0 portées → tier INSUFFISANT + score 0', () => {
    const truie = makeTruie({ id: 'T99' });
    const perf = computeTruiePerformance(truie, [], []);
    expect(perf.nbPortees).toBe(0);
    expect(perf.tier).toBe('INSUFFISANT');
    expect(perf.scoreCompetence).toBe(0);
    expect(perf.moyNV).toBe(0);
  });

  it('truie avec mortalité très élevée → score bas', () => {
    const truie = makeTruie();
    const bandes: BandePorcelets[] = [
      makeBande({ id: 'P1', nv: 10, morts: 9, vivants: 1 }),
      makeBande({ id: 'P2', nv: 8, morts: 7, vivants: 1 }),
    ];
    const perf = computeTruiePerformance(truie, bandes, []);
    expect(perf.tauxSurvieNaissance).toBeLessThan(20);
    expect(perf.scoreCompetence).toBeLessThan(55);
    expect(['FAIBLE', 'INSUFFISANT', 'MOYEN']).toContain(perf.tier);
  });

  it('match portée via boucleMere (pas d ID truie)', () => {
    const truie = makeTruie({ boucle: 'FR-12345' });
    const bandes: BandePorcelets[] = [
      makeBande({ id: 'P1', truie: undefined, boucleMere: 'FR-12345', nv: 10, morts: 1, vivants: 9 }),
    ];
    const portees = findPorteesForTruie(truie, bandes);
    expect(portees).toHaveLength(1);

    const perf = computeTruiePerformance(truie, bandes, []);
    expect(perf.nbPortees).toBe(1);
    expect(perf.moyNV).toBe(10);
  });

  it('edge : NV = 0 → pas de division par zéro', () => {
    const truie = makeTruie();
    const bandes: BandePorcelets[] = [
      makeBande({ id: 'P1', nv: 0, morts: 0, vivants: 0 }),
    ];
    const perf = computeTruiePerformance(truie, bandes, []);
    expect(perf.tauxSurvieNaissance).toBe(0);
    expect(perf.tauxSevrage).toBe(0);
    expect(Number.isFinite(perf.scoreCompetence)).toBe(true);
  });

  it('edge : truie sans saillies (primipare en attente) → fertilité = 0, pas NaN', () => {
    const truie = makeTruie();
    const bandes: BandePorcelets[] = [
      makeBande({ id: 'P1', nv: 12, morts: 1, vivants: 11 }),
    ];
    const perf = computeTruiePerformance(truie, bandes, []);
    expect(perf.nbSaillies).toBe(0);
    expect(perf.tauxFertilite).toBe(0);
    expect(Number.isFinite(perf.scoreCompetence)).toBe(true);
  });
});

// ─── computeVerratPerformance ────────────────────────────────────────────────

describe('computeVerratPerformance', () => {
  it('verrat 5 saillies dont 4 avec portée → tauxSucces 80 %', () => {
    const verrat = makeVerrat();
    const saillies: Saillie[] = [
      makeSaillie({ truieId: 'T01', dateMBPrevue: '01/01/2024' }),
      makeSaillie({ truieId: 'T02', dateMBPrevue: '01/02/2024' }),
      makeSaillie({ truieId: 'T03', dateMBPrevue: '01/03/2024' }),
      makeSaillie({ truieId: 'T04', dateMBPrevue: '01/04/2024' }),
      makeSaillie({ truieId: 'T05', dateMBPrevue: '01/05/2024' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ id: 'P1', truie: 'T01', dateMB: '02/01/2024', nv: 12, morts: 1, vivants: 11 }),
      makeBande({ id: 'P2', truie: 'T02', dateMB: '02/02/2024', nv: 13, morts: 1, vivants: 12 }),
      makeBande({ id: 'P3', truie: 'T03', dateMB: '02/03/2024', nv: 11, morts: 1, vivants: 10 }),
      makeBande({ id: 'P4', truie: 'T04', dateMB: '02/04/2024', nv: 14, morts: 2, vivants: 12 }),
      // T05 : pas de portée (échec)
    ];

    const perf = computeVerratPerformance(verrat, bandes, saillies, []);

    expect(perf.nbSaillies).toBe(5);
    expect(perf.nbPorteesEngendrees).toBe(4);
    expect(perf.tauxSuccesSaillie).toBe(80);
    expect(perf.moyNVEngendrees).toBeCloseTo(12.5, 1);
    expect(perf.scoreFertilite).toBeGreaterThan(55);
    expect(['ELITE', 'BON', 'MOYEN']).toContain(perf.tier);
  });

  it('verrat 0 saillies → INSUFFISANT', () => {
    const verrat = makeVerrat({ id: 'V99' });
    const perf = computeVerratPerformance(verrat, [], [], []);
    expect(perf.nbSaillies).toBe(0);
    expect(perf.tier).toBe('INSUFFISANT');
    expect(perf.scoreFertilite).toBe(0);
  });

  it('match verrat → portée via saillie (même truie + date MB proche)', () => {
    const verrat = makeVerrat();
    const saillies: Saillie[] = [
      makeSaillie({ verratId: 'V01', truieId: 'T07', dateMBPrevue: '15/06/2024' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ id: 'P77', truie: 'T07', dateMB: '16/06/2024', nv: 13, morts: 1, vivants: 12 }),
      // bande d'une autre truie — doit être ignorée
      makeBande({ id: 'P88', truie: 'T08', dateMB: '16/06/2024', nv: 10, morts: 0, vivants: 10 }),
    ];
    const portees = findPorteesForVerrat(verrat, saillies, bandes);
    expect(portees).toHaveLength(1);
    expect(portees[0].id).toBe('P77');
  });
});

// ─── scoreToTier ─────────────────────────────────────────────────────────────

describe('scoreToTier', () => {
  it('mappe correctement les paliers', () => {
    expect(scoreToTier(95)).toBe('ELITE');
    expect(scoreToTier(85)).toBe('ELITE');
    expect(scoreToTier(80)).toBe('BON');
    expect(scoreToTier(70)).toBe('BON');
    expect(scoreToTier(60)).toBe('MOYEN');
    expect(scoreToTier(55)).toBe('MOYEN');
    expect(scoreToTier(45)).toBe('FAIBLE');
    expect(scoreToTier(40)).toBe('FAIBLE');
    expect(scoreToTier(39)).toBe('INSUFFISANT');
    expect(scoreToTier(0)).toBe('INSUFFISANT');
  });
});
