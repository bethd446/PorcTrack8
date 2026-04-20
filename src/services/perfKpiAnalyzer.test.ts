/**
 * Tests unitaires — perfKpiAnalyzer
 * ══════════════════════════════════
 * Couvre :
 *   • computeGlobalKpis : nominal, absence de data, extrapolation 6-mois,
 *                        edge NV=0, intervalle sevrage-saillie, MB à venir.
 *   • rankTruiesByPerformance : top ELITE desc, flop avec seuil nbPortees ≥ 3.
 *   • detectTruiesAReformer : PERF_INSUFFISANTE, INACTIVE_LONG, MULTIPLE.
 */

import { describe, expect, it } from 'vitest';
import {
  computeGlobalKpis,
  rankTruiesByPerformance,
  detectTruiesAReformer,
  computeISSEMoyen,
  computeIEMMoyen,
  computeTauxMB,
  computeTauxRenouvellement,
  computeSevresParPortee,
  computeMortalitePorcelets,
  computeIndiceConso,
  computeCyclesReussis,
} from './perfKpiAnalyzer';
import type { Truie, BandePorcelets, Saillie, StockAliment } from '../types/farm';

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

function makeBande(over: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: `P${Math.random().toString(36).slice(2, 8)}`,
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

/** Date de référence figée pour rendre les tests déterministes. */
const TODAY = new Date(2025, 5, 15); // 15/06/2025

// ─── computeGlobalKpis ──────────────────────────────────────────────────────

describe('computeGlobalKpis', () => {
  it('nominal — 3 truies, 10 portées réparties sur 12 mois', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01' }),
      makeTruie({ id: 'T02', boucle: 'B02' }),
      makeTruie({ id: 'T03', boucle: 'B03' }),
    ];
    // 10 portées couvrant ~11 mois, sevrages enregistrés sur 8 d'entre elles.
    const bandes: BandePorcelets[] = [
      makeBande({ id: 'P1', truie: 'T01', dateMB: '10/07/2024', dateSevrageReelle: '31/07/2024', nv: 12, morts: 1, vivants: 11 }),
      makeBande({ id: 'P2', truie: 'T01', dateMB: '15/11/2024', dateSevrageReelle: '06/12/2024', nv: 13, morts: 1, vivants: 12 }),
      makeBande({ id: 'P3', truie: 'T01', dateMB: '01/03/2025', dateSevrageReelle: '22/03/2025', nv: 14, morts: 2, vivants: 12 }),
      makeBande({ id: 'P4', truie: 'T02', dateMB: '20/07/2024', dateSevrageReelle: '10/08/2024', nv: 11, morts: 1, vivants: 10 }),
      makeBande({ id: 'P5', truie: 'T02', dateMB: '25/11/2024', dateSevrageReelle: '16/12/2024', nv: 12, morts: 2, vivants: 10 }),
      makeBande({ id: 'P6', truie: 'T02', dateMB: '05/03/2025', dateSevrageReelle: '26/03/2025', nv: 13, morts: 1, vivants: 12 }),
      makeBande({ id: 'P7', truie: 'T03', dateMB: '01/08/2024', dateSevrageReelle: '22/08/2024', nv: 10, morts: 0, vivants: 10 }),
      makeBande({ id: 'P8', truie: 'T03', dateMB: '10/12/2024', dateSevrageReelle: '31/12/2024', nv: 11, morts: 1, vivants: 10 }),
      makeBande({ id: 'P9', truie: 'T03', dateMB: '15/04/2025', nv: 12, morts: 0, vivants: 12 }), // pas encore sevrée
      makeBande({ id: 'P10', truie: 'T01', dateMB: '01/06/2025', nv: 10, morts: 0, vivants: 10 }),
    ];

    const kpis = computeGlobalKpis(truies, bandes, [], TODAY);

    expect(kpis.nbTruiesTotal).toBe(3);
    expect(kpis.nbTruiesProductives).toBe(3);
    expect(kpis.nbPortees12m).toBe(10);
    expect(kpis.moyNV).toBeCloseTo(11.8, 1);
    expect(kpis.tauxMortaliteNaissanceSevrage).toBeGreaterThan(0);
    expect(kpis.tauxMortaliteNaissanceSevrage).toBeLessThan(20);
    expect(kpis.sevresParTruieAn).toBeGreaterThan(0);
    expect(kpis.porteesParTruieAn).toBeGreaterThan(0);
    // 8 sevrées : 11+12+12+10+10+12+10+10 = 87 sur 3 truies ≈ 29/truie
    // annualisé légèrement > réel (période couverte ~11 mois < 12)
    expect(kpis.nbSevrés12m).toBe(87);
  });

  it('sans data — tous les KPI à 0, pas de crash, intervalle null', () => {
    const kpis = computeGlobalKpis([], [], [], TODAY);
    expect(kpis.nbTruiesTotal).toBe(0);
    expect(kpis.nbTruiesProductives).toBe(0);
    expect(kpis.nbPortees12m).toBe(0);
    expect(kpis.nbSevrés12m).toBe(0);
    expect(kpis.moyNV).toBe(0);
    expect(kpis.tauxMortaliteNaissanceSevrage).toBe(0);
    expect(kpis.sevresParTruieAn).toBe(0);
    expect(kpis.porteesParTruieAn).toBe(0);
    expect(kpis.intervalSevrageSaillieMoyJours).toBeNull();
    expect(kpis.nbMbAVenir30j).toBe(0);
  });

  it('extrapolation sur 6 mois — compteurs multipliés par ~2', () => {
    const truies: Truie[] = [makeTruie({ id: 'T01', boucle: 'B01' })];
    // 3 portées réparties sur les 6 derniers mois uniquement
    const bandes: BandePorcelets[] = [
      makeBande({ id: 'P1', truie: 'T01', dateMB: '20/12/2024', dateSevrageReelle: '10/01/2025', nv: 12, morts: 1, vivants: 11 }),
      makeBande({ id: 'P2', truie: 'T01', dateMB: '20/03/2025', dateSevrageReelle: '10/04/2025', nv: 12, morts: 1, vivants: 11 }),
      makeBande({ id: 'P3', truie: 'T01', dateMB: '01/06/2025', nv: 12, morts: 1, vivants: 11 }),
    ];

    const kpis = computeGlobalKpis(truies, bandes, [], TODAY);
    // 3 portées réelles, ~177j de couverture → facteur ≈ 2.06
    expect(kpis.nbPortees12m).toBe(3);
    expect(kpis.porteesParTruieAn).toBeGreaterThan(5);
    expect(kpis.porteesParTruieAn).toBeLessThan(8);
    // 22 sevrés × 2.06 / 1 truie ≈ 45
    expect(kpis.sevresParTruieAn).toBeGreaterThan(35);
    expect(kpis.sevresParTruieAn).toBeLessThan(55);
  });

  it('edge NV=0 — pas de division par zéro sur tauxMortalite', () => {
    const truies: Truie[] = [makeTruie()];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/05/2025', nv: 0, morts: 0, vivants: 0 }),
    ];
    const kpis = computeGlobalKpis(truies, bandes, [], TODAY);
    expect(kpis.tauxMortaliteNaissanceSevrage).toBe(0);
    expect(Number.isFinite(kpis.moyNV)).toBe(true);
  });

  it('intervalle sevrage → saillie calculé correctement', () => {
    const truies: Truie[] = [makeTruie({ id: 'T01', boucle: 'B01' })];
    const bandes: BandePorcelets[] = [
      // sevrée le 01/02/2025
      makeBande({ truie: 'T01', dateMB: '10/01/2025', dateSevrageReelle: '01/02/2025', nv: 12, morts: 1, vivants: 11 }),
    ];
    const saillies: Saillie[] = [
      // saillie 6 jours après le sevrage
      makeSaillie({ truieId: 'T01', dateSaillie: '07/02/2025' }),
    ];
    const kpis = computeGlobalKpis(truies, bandes, saillies, TODAY);
    expect(kpis.intervalSevrageSaillieMoyJours).toBeCloseTo(6, 0);
  });

  it('nbMbAVenir30j compte les truies avec dateMBPrevue dans la fenêtre', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', dateMBPrevue: '25/06/2025' }), // +10j → inclus
      makeTruie({ id: 'T02', dateMBPrevue: '10/07/2025' }), // +25j → inclus
      makeTruie({ id: 'T03', dateMBPrevue: '20/07/2025' }), // +35j → exclu
      makeTruie({ id: 'T04' }),                              // pas de date → exclu
    ];
    const kpis = computeGlobalKpis(truies, [], [], TODAY);
    expect(kpis.nbMbAVenir30j).toBe(2);
  });
});

// ─── rankTruiesByPerformance ────────────────────────────────────────────────

describe('rankTruiesByPerformance', () => {
  it('top 3 ordre score desc, tier ELITE/BON uniquement', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01' }),
      makeTruie({ id: 'T02', boucle: 'B02' }),
      makeTruie({ id: 'T03', boucle: 'B03' }),
      makeTruie({ id: 'T04', boucle: 'B04' }),
    ];
    // T01 très bonne, T02 bonne, T03 moyenne, T04 primipare faible
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/01/2025', nv: 15, morts: 0, vivants: 15, dateSevrageReelle: '22/01/2025' }),
      makeBande({ truie: 'T01', dateMB: '01/05/2025', nv: 14, morts: 0, vivants: 14, dateSevrageReelle: '22/05/2025' }),
      makeBande({ truie: 'T02', dateMB: '01/01/2025', nv: 13, morts: 1, vivants: 12, dateSevrageReelle: '22/01/2025' }),
      makeBande({ truie: 'T02', dateMB: '01/05/2025', nv: 12, morts: 1, vivants: 11, dateSevrageReelle: '22/05/2025' }),
      makeBande({ truie: 'T03', dateMB: '01/01/2025', nv: 10, morts: 2, vivants: 8 }),
      makeBande({ truie: 'T04', dateMB: '01/05/2025', nv: 6, morts: 4, vivants: 2 }),
    ];

    const { top } = rankTruiesByPerformance(truies, bandes, []);
    expect(top.length).toBeGreaterThanOrEqual(1);
    expect(top.length).toBeLessThanOrEqual(3);
    // tri desc
    for (let i = 1; i < top.length; i += 1) {
      expect(top[i - 1].performance.scoreCompetence).toBeGreaterThanOrEqual(
        top[i].performance.scoreCompetence,
      );
    }
    // tous en ELITE/BON
    for (const r of top) {
      expect(['ELITE', 'BON']).toContain(r.performance.tier);
    }
    // T01 doit être 1re si son score domine
    expect(top[0].truie.id).toBe('T01');
  });

  it('flop applique seuil nbPortees ≥ 3 — exclut les primipares', () => {
    const truies: Truie[] = [
      // T01 : 3 portées catastrophiques → flop
      makeTruie({ id: 'T01', boucle: 'B01' }),
      // T02 : 1 seule portée faible → exclue du flop (data insuffisante)
      makeTruie({ id: 'T02', boucle: 'B02' }),
      // T03 : zéro portée → INSUFFISANT mais exclu
      makeTruie({ id: 'T03', boucle: 'B03' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/01/2025', nv: 6, morts: 5, vivants: 1 }),
      makeBande({ truie: 'T01', dateMB: '01/03/2025', nv: 5, morts: 4, vivants: 1 }),
      makeBande({ truie: 'T01', dateMB: '01/05/2025', nv: 7, morts: 6, vivants: 1 }),
      makeBande({ truie: 'T02', dateMB: '01/05/2025', nv: 4, morts: 3, vivants: 1 }),
    ];

    const { flop } = rankTruiesByPerformance(truies, bandes, []);
    expect(flop.length).toBe(1);
    expect(flop[0].truie.id).toBe('T01');
    expect(flop[0].performance.nbPortees).toBeGreaterThanOrEqual(3);
  });
});

// ─── detectTruiesAReformer ──────────────────────────────────────────────────

describe('detectTruiesAReformer', () => {
  it('détecte PERF_INSUFFISANTE (≥3 portées + tier FAIBLE/INSUFFISANT)', () => {
    const truies: Truie[] = [makeTruie({ id: 'T01', boucle: 'B01', statut: 'Pleine' })];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/01/2025', nv: 6, morts: 5, vivants: 1 }),
      makeBande({ truie: 'T01', dateMB: '01/03/2025', nv: 5, morts: 4, vivants: 1 }),
      makeBande({ truie: 'T01', dateMB: '01/05/2025', nv: 7, morts: 6, vivants: 1 }),
    ];
    const rep = detectTruiesAReformer(truies, bandes, [], TODAY);
    expect(rep).toHaveLength(1);
    expect(rep[0].motif).toBe('PERF_INSUFFISANTE');
    expect(rep[0].truie.id).toBe('T01');
    expect(rep[0].detail).toMatch(/portées/);
  });

  it('détecte INACTIVE_LONG (En attente saillie + >90j)', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01', statut: 'En attente saillie' }),
      // Truie avec saillie récente → exclue
      makeTruie({ id: 'T02', boucle: 'B02', statut: 'En attente saillie' }),
      // Truie Pleine (en cycle) → exclue même si jamais saillie connue
      makeTruie({ id: 'T03', boucle: 'B03', statut: 'Pleine' }),
    ];
    const saillies: Saillie[] = [
      // T01 : dernière saillie il y a 120j (15/02/2025 vs today 15/06/2025)
      makeSaillie({ truieId: 'T01', dateSaillie: '15/02/2025' }),
      // T02 : dernière saillie il y a 30j
      makeSaillie({ truieId: 'T02', dateSaillie: '15/05/2025' }),
    ];
    const rep = detectTruiesAReformer(truies, [], saillies, TODAY);
    const ids = rep.map(r => r.truie.id);
    expect(ids).toContain('T01');
    expect(ids).not.toContain('T02');
    expect(ids).not.toContain('T03');
    const t01 = rep.find(r => r.truie.id === 'T01');
    expect(t01?.motif).toBe('INACTIVE_LONG');
    expect(t01?.detail).toMatch(/sans saillie/);
  });

  it('combine en MULTIPLE si perf faible ET inactive long', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01', statut: 'En attente saillie' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/06/2024', nv: 6, morts: 5, vivants: 1 }),
      makeBande({ truie: 'T01', dateMB: '01/09/2024', nv: 5, morts: 4, vivants: 1 }),
      makeBande({ truie: 'T01', dateMB: '01/12/2024', nv: 7, morts: 6, vivants: 1 }),
    ];
    const saillies: Saillie[] = [
      makeSaillie({ truieId: 'T01', dateSaillie: '01/01/2025' }),
    ];
    const rep = detectTruiesAReformer(truies, bandes, saillies, TODAY);
    expect(rep).toHaveLength(1);
    expect(rep[0].motif).toBe('MULTIPLE');
  });

  it('INACTIVE : aucune saillie → "Jamais saillie"', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01', statut: 'En attente saillie' }),
    ];
    const rep = detectTruiesAReformer(truies, [], [], TODAY);
    expect(rep).toHaveLength(1);
    expect(rep[0].motif).toBe('INACTIVE_LONG');
    expect(rep[0].detail).toBe('Jamais saillie');
  });

  it('détecte ISSE_ELEVE (≥2 occurrences d\'intervalle sevrage-saillie > 14j)', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01', statut: 'Pleine' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/09/2024', dateSevrageReelle: '22/09/2024', nv: 12, vivants: 11 }),
      makeBande({ truie: 'T01', dateMB: '01/01/2025', dateSevrageReelle: '22/01/2025', nv: 12, vivants: 11 }),
    ];
    const saillies: Saillie[] = [
      // ISSE 20j (hors cible, compte comme élevé)
      makeSaillie({ truieId: 'T01', dateSaillie: '12/10/2024' }),
      // ISSE 18j (hors cible) → 2e occurrence → ISSE_ELEVE
      makeSaillie({ truieId: 'T01', dateSaillie: '09/02/2025' }),
    ];
    const rep = detectTruiesAReformer(truies, bandes, saillies, TODAY);
    expect(rep).toHaveLength(1);
    expect(rep[0].motif).toBe('ISSE_ELEVE');
    expect(rep[0].detail).toMatch(/ISSE/);
  });
});

// ─── KPI repro avancés ───────────────────────────────────────────────────────

describe('computeISSEMoyen', () => {
  it('nominal : 3 truies avec séquences sevrage/saillie → moyenne correcte', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01' }),
      makeTruie({ id: 'T02', boucle: 'B02' }),
      makeTruie({ id: 'T03', boucle: 'B03' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '10/01/2025', dateSevrageReelle: '01/02/2025' }),
      makeBande({ truie: 'T02', dateMB: '10/01/2025', dateSevrageReelle: '01/02/2025' }),
      makeBande({ truie: 'T03', dateMB: '10/01/2025', dateSevrageReelle: '01/02/2025' }),
    ];
    const saillies: Saillie[] = [
      // T01 : 5j après sevrage
      makeSaillie({ truieId: 'T01', dateSaillie: '06/02/2025' }),
      // T02 : 6j après sevrage
      makeSaillie({ truieId: 'T02', dateSaillie: '07/02/2025' }),
      // T03 : 7j après sevrage
      makeSaillie({ truieId: 'T03', dateSaillie: '08/02/2025' }),
    ];
    const isse = computeISSEMoyen(truies, bandes, saillies);
    expect(isse).toBeCloseTo(6, 1); // (5 + 6 + 7) / 3 = 6
  });

  it('aucune séquence exploitable → null', () => {
    const truies: Truie[] = [makeTruie({ id: 'T01', boucle: 'B01' })];
    // Sevrage sans saillie postérieure
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '10/01/2025', dateSevrageReelle: '01/02/2025' }),
    ];
    expect(computeISSEMoyen(truies, bandes, [])).toBeNull();
    expect(computeISSEMoyen([], [], [])).toBeNull();
  });

  it('filtre les paires aberrantes > 60j', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01' }),
      makeTruie({ id: 'T02', boucle: 'B02' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '10/01/2025', dateSevrageReelle: '01/02/2025' }),
      makeBande({ truie: 'T02', dateMB: '10/01/2025', dateSevrageReelle: '01/02/2025' }),
    ];
    const saillies: Saillie[] = [
      // T01 : 5j (valide)
      makeSaillie({ truieId: 'T01', dateSaillie: '06/02/2025' }),
      // T02 : 90j (aberrant, filtré)
      makeSaillie({ truieId: 'T02', dateSaillie: '02/05/2025' }),
    ];
    const isse = computeISSEMoyen(truies, bandes, saillies);
    expect(isse).toBeCloseTo(5, 1); // seulement T01 retenu
  });
});

describe('computeIEMMoyen', () => {
  it('2 portées à 145j d\'écart → 145', () => {
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/01/2025' }),
      // 145 jours plus tard
      makeBande({ truie: 'T01', dateMB: '26/05/2025' }),
    ];
    const iem = computeIEMMoyen(bandes);
    expect(iem).toBeCloseTo(145, 0);
  });

  it('aucune truie avec ≥ 2 MB → null', () => {
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/01/2025' }),
      makeBande({ truie: 'T02', dateMB: '01/02/2025' }),
    ];
    expect(computeIEMMoyen(bandes)).toBeNull();
    expect(computeIEMMoyen([])).toBeNull();
  });

  it('filtre les intervalles aberrants hors [100j, 200j]', () => {
    const bandes: BandePorcelets[] = [
      // T01 : deux intervalles — 145j (valide) puis 250j (aberrant, filtré)
      makeBande({ truie: 'T01', dateMB: '01/01/2024' }),
      makeBande({ truie: 'T01', dateMB: '25/05/2024' }), // +145j
      makeBande({ truie: 'T01', dateMB: '31/01/2025' }), // +251j → filtré
    ];
    const iem = computeIEMMoyen(bandes);
    expect(iem).toBeCloseTo(145, 0);
  });
});

describe('computeTauxMB', () => {
  it('10 saillies / 9 MB dans la fenêtre 12m → 90%', () => {
    const mkDate = (i: number): string => {
      // 10 dates uniques sur 2024-2025 (dans la fenêtre 12m avant 15/06/2025)
      const days = ['01', '05', '10', '15', '20', '25'];
      const months = ['08', '09', '10', '11', '12', '01', '02', '03', '04', '05'];
      return `${days[i % days.length]}/${months[i]}/${i < 5 ? '2024' : '2025'}`;
    };
    const bandes: BandePorcelets[] = Array.from({ length: 9 }, (_, i) =>
      makeBande({ id: `P${i}`, truie: 'T01', dateMB: mkDate(i) }),
    );
    const saillies: Saillie[] = Array.from({ length: 10 }, (_, i) => ({
      truieId: 'T01',
      dateSaillie: mkDate(i),
      verratId: 'V01',
    }));
    const taux = computeTauxMB(bandes, saillies, TODAY);
    expect(taux).toBeCloseTo(90, 1);
  });

  it('aucune saillie → null', () => {
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/03/2025' }),
    ];
    expect(computeTauxMB(bandes, [], TODAY)).toBeNull();
    expect(computeTauxMB([], [], TODAY)).toBeNull();
  });
});

describe('computeTauxRenouvellement', () => {
  it('2 nouvelles / 10 totales → 20%', () => {
    const truies: Truie[] = Array.from({ length: 10 }, (_, i) =>
      makeTruie({ id: `T${i.toString().padStart(2, '0')}`, boucle: `B${i}` }),
    );
    const bandes: BandePorcelets[] = [
      // T00, T01 : 1re portée dans les 12m → nouvelles
      makeBande({ truie: 'T00', dateMB: '01/03/2025' }),
      makeBande({ truie: 'T01', dateMB: '15/04/2025' }),
      // T02...T09 : 1re portée ancienne (> 12m) → pas nouvelles
      makeBande({ truie: 'T02', dateMB: '01/01/2023' }),
      makeBande({ truie: 'T03', dateMB: '01/02/2023' }),
      makeBande({ truie: 'T04', dateMB: '01/03/2023' }),
    ];
    const taux = computeTauxRenouvellement(truies, bandes, TODAY);
    expect(taux).toBeCloseTo(20, 1);
  });

  it('aucune truie → null', () => {
    expect(computeTauxRenouvellement([], [], TODAY)).toBeNull();
  });
});

describe('computeGlobalKpis — KPI repro avancés intégrés', () => {
  it('expose isseMoyJours, iemMoyJours, tauxMBPct, tauxRenouvellementPct', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01' }),
      makeTruie({ id: 'T02', boucle: 'B02' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/09/2024', dateSevrageReelle: '22/09/2024' }),
      makeBande({ truie: 'T01', dateMB: '26/01/2025', dateSevrageReelle: '16/02/2025' }),
      makeBande({ truie: 'T02', dateMB: '01/03/2025' }),
    ];
    const saillies: Saillie[] = [
      makeSaillie({ truieId: 'T01', dateSaillie: '28/09/2024' }), // ISSE 6j
      makeSaillie({ truieId: 'T01', dateSaillie: '22/02/2025' }), // ISSE 6j
      makeSaillie({ truieId: 'T02', dateSaillie: '15/11/2024' }),
    ];
    const kpis = computeGlobalKpis(truies, bandes, saillies, TODAY);
    expect(kpis.isseMoyJours).toBeCloseTo(6, 1);
    expect(kpis.iemMoyJours).not.toBeNull(); // T01 : 147j entre 01/09/24 et 26/01/25
    expect(kpis.iemMoyJours).toBeGreaterThan(100);
    expect(kpis.iemMoyJours).toBeLessThan(200);
    // 3 MB / 3 saillies = 100%
    expect(kpis.tauxMBPct).toBeCloseTo(100, 1);
    // 2 nouvelles sur 2 truies totales = 100%
    expect(kpis.tauxRenouvellementPct).toBeCloseTo(100, 1);
    expect(kpis.nbSaillies12m).toBe(3);
    expect(kpis.nbMB12m).toBe(3);
    expect(kpis.nbTruiesAvecMBMultiples).toBe(1);
  });

  it('pas de data → tous les KPI repro avancés null ou 0', () => {
    const kpis = computeGlobalKpis([], [], [], TODAY);
    expect(kpis.isseMoyJours).toBeNull();
    expect(kpis.iemMoyJours).toBeNull();
    expect(kpis.tauxMBPct).toBeNull();
    expect(kpis.tauxRenouvellementPct).toBeNull();
    expect(kpis.nbSaillies12m).toBe(0);
    expect(kpis.nbMB12m).toBe(0);
    expect(kpis.nbTruiesAvecMBMultiples).toBe(0);
  });
});

// ─── Sparkline KPIs PilotageHub ─────────────────────────────────────────────

describe('computeSevresParPortee', () => {
  it('happy path : moyenne vivants par portée sevrée sur la période 90J', () => {
    // TODAY = 15/06/2025 → fenêtre 90J = [17/03/2025, 15/06/2025]
    const bandes: BandePorcelets[] = [
      // 2 portées sevrées dans la période : vivants 11 + 13 → moy 12
      makeBande({ truie: 'T01', dateMB: '01/04/2025', dateSevrageReelle: '22/04/2025', nv: 12, morts: 1, vivants: 11 }),
      makeBande({ truie: 'T02', dateMB: '01/05/2025', dateSevrageReelle: '22/05/2025', nv: 14, morts: 1, vivants: 13 }),
      // 1 portée hors fenêtre (avant) → ignorée
      makeBande({ truie: 'T03', dateMB: '01/01/2025', dateSevrageReelle: '22/01/2025', nv: 10, morts: 0, vivants: 10 }),
      // 1 portée dans la fenêtre mais pas encore sevrée → ignorée
      makeBande({ truie: 'T04', dateMB: '10/06/2025', nv: 11, morts: 0, vivants: 11 }),
    ];
    const result = computeSevresParPortee(bandes, '90J', TODAY);
    expect(result.value).toBeCloseTo(12, 1);
    expect(result.series).toHaveLength(7);
    // Chaque bucket a x = son index
    result.series.forEach((p, i) => expect(p.x).toBe(i));
    // Toutes les valeurs y sont des nombres finis
    result.series.forEach(p => expect(Number.isFinite(p.y)).toBe(true));
  });

  it('edge 0 data → value=0, delta=0, série de 7 zéros', () => {
    const result = computeSevresParPortee([], '30J', TODAY);
    expect(result.value).toBe(0);
    expect(result.delta).toBe(0);
    expect(result.series).toHaveLength(7);
    expect(result.series.every(p => p.y === 0)).toBe(true);
  });
});

describe('computeMortalitePorcelets', () => {
  it('happy path : mortalité agrégée = morts / (morts+vivants) × 100', () => {
    // Période 30J = [16/05/2025, 15/06/2025]
    const bandes: BandePorcelets[] = [
      // 2 morts + 8 vivants = 10 → 20%
      makeBande({ truie: 'T01', dateMB: '20/05/2025', nv: 10, morts: 2, vivants: 8 }),
      // 3 morts + 7 vivants = 10 → 30%
      makeBande({ truie: 'T02', dateMB: '01/06/2025', nv: 10, morts: 3, vivants: 7 }),
      // Hors fenêtre
      makeBande({ truie: 'T03', dateMB: '01/01/2025', nv: 10, morts: 1, vivants: 9 }),
    ];
    const result = computeMortalitePorcelets(bandes, '30J', TODAY);
    // (2+3) / (2+3+8+7) × 100 = 5/20 × 100 = 25
    expect(result.value).toBeCloseTo(25, 1);
    expect(result.series).toHaveLength(7);
  });

  it('edge 0 data → 0% mortalité, série constante à 0', () => {
    const result = computeMortalitePorcelets([], '7J', TODAY);
    expect(result.value).toBe(0);
    expect(result.delta).toBe(0);
    expect(result.series).toHaveLength(7);
    expect(result.series.every(p => p.y === 0)).toBe(true);
  });
});

describe('computeIndiceConso', () => {
  it('sans données de pesée → retourne IC par défaut 2.85 constant', () => {
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/06/2025', nv: 12, morts: 1, vivants: 11 }),
    ];
    const stock: StockAliment[] = [
      { id: 'A01', libelle: 'Croissance', stockActuel: 500, unite: 'kg', seuilAlerte: 100, statutStock: 'OK' },
    ];
    const result = computeIndiceConso(bandes, stock, '30J', TODAY);
    expect(result.value).toBeCloseTo(2.85, 2);
    expect(result.delta).toBe(0);
    expect(result.series).toHaveLength(7);
    expect(result.series.every(p => p.y === 2.85)).toBe(true);
  });

  it('edge 0 bandes + 0 stock → IC par défaut, pas de crash', () => {
    const result = computeIndiceConso([], [], '1A', TODAY);
    expect(result.value).toBeCloseTo(2.85, 2);
    expect(result.series).toHaveLength(7);
    expect(Number.isFinite(result.value)).toBe(true);
  });
});

describe('computeCyclesReussis', () => {
  it('happy path : 3 portées dont 2 avec ≥1 vivant → 66.7%', () => {
    const truies: Truie[] = [
      makeTruie({ id: 'T01', boucle: 'B01' }),
      makeTruie({ id: 'T02', boucle: 'B02' }),
      makeTruie({ id: 'T03', boucle: 'B03' }),
    ];
    const bandes: BandePorcelets[] = [
      // Réussie : nv=12, vivants=11
      makeBande({ truie: 'T01', dateMB: '01/04/2025', nv: 12, morts: 1, vivants: 11 }),
      // Réussie : nv=10, vivants=10
      makeBande({ truie: 'T02', dateMB: '15/05/2025', nv: 10, morts: 0, vivants: 10 }),
      // Échouée : mortinatalité totale (vivants=0)
      makeBande({ truie: 'T03', dateMB: '01/06/2025', nv: 8, morts: 8, vivants: 0 }),
    ];
    const result = computeCyclesReussis(truies, bandes, '90J', TODAY);
    // 2/3 = 66.666... → arrondi 1 décimale = 66.7
    expect(result.value).toBeCloseTo(66.7, 1);
    expect(result.series).toHaveLength(7);
    result.series.forEach((p, i) => expect(p.x).toBe(i));
  });

  it('edge 0 data → 0% et série vide (que des 0)', () => {
    const result = computeCyclesReussis([], [], '30J', TODAY);
    expect(result.value).toBe(0);
    expect(result.delta).toBe(0);
    expect(result.series).toHaveLength(7);
    expect(result.series.every(p => p.y === 0)).toBe(true);
  });
});
