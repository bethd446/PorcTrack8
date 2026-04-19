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
} from './perfKpiAnalyzer';
import type { Truie, BandePorcelets, Saillie } from '../types/farm';

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
});
