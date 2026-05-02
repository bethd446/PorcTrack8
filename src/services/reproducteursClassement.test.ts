/**
 * Tests unitaires — reproducteursClassement (Sprint V23-S3).
 * ──────────────────────────────────────────────────────────
 * Couvre :
 *   • computeVerratPerformance : 0 saillie, plein succès, score haut
 *   • rankVerratsByPerformance : top, exclusion flop si nbSaillies < 3
 *   • buildClassementRows      : filtres, tris, hrefs.
 */
import { describe, expect, it } from 'vitest';
import {
  computeVerratPerformance,
  rankVerratsByPerformance,
  buildClassementRows,
} from './reproducteursClassement';
import type {
  Truie,
  Verrat,
  Saillie,
  BandePorcelets,
} from '../types/farm';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeVerrat(over: Partial<Verrat> = {}): Verrat {
  const id = over.id ?? 'V01';
  return {
    id,
    displayId: id,
    boucle: `B${id}`,
    statut: 'Actif',
    ration: 3,
    synced: true,
    ...over,
  };
}

function makeTruie(over: Partial<Truie> = {}): Truie {
  const id = over.id ?? 'T01';
  return {
    id,
    displayId: id,
    boucle: `B${id}`,
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
    dateMB: '01/05/2025',
    nv: 12,
    morts: 1,
    vivants: 11,
    statut: 'Sous mère',
    poidsInitialKg: 0,
    synced: true,
    ...over,
  };
}

function makeSaillie(over: Partial<Saillie> = {}): Saillie {
  return {
    truieId: 'T01',
    dateSaillie: '06/01/2025',
    verratId: 'V01',
    ...over,
  };
}

// ─── computeVerratPerformance ────────────────────────────────────────────────

describe('computeVerratPerformance', () => {
  it('verrat sans saillie → score 0, tier INSUFFISANT', () => {
    const verrat = makeVerrat();
    const perf = computeVerratPerformance(verrat, [], []);

    expect(perf.nbSaillies).toBe(0);
    expect(perf.nbSailliesReussies).toBe(0);
    expect(perf.tauxReussitePct).toBe(0);
    expect(perf.porceletsVivantsMoyenne).toBe(0);
    expect(perf.scoreCompetence).toBe(0);
    expect(perf.tier).toBe('INSUFFISANT');
  });

  it('5/5 saillies réussies, 12 vivants moyens → score haut, tier ELITE/BON', () => {
    const verrat = makeVerrat({ id: 'V01' });
    // 5 truies différentes, chaque saillie matchée à 115j (±0) par dateMB
    // saillie 06/01/2025 → MB ≈ 01/05/2025 (115j après)
    const saillies: Saillie[] = [
      makeSaillie({ truieId: 'T01', dateSaillie: '06/01/2025' }),
      makeSaillie({ truieId: 'T02', dateSaillie: '06/01/2025' }),
      makeSaillie({ truieId: 'T03', dateSaillie: '06/01/2025' }),
      makeSaillie({ truieId: 'T04', dateSaillie: '06/01/2025' }),
      makeSaillie({ truieId: 'T05', dateSaillie: '06/01/2025' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/05/2025', nv: 12 }),
      makeBande({ truie: 'T02', dateMB: '01/05/2025', nv: 12 }),
      makeBande({ truie: 'T03', dateMB: '01/05/2025', nv: 12 }),
      makeBande({ truie: 'T04', dateMB: '01/05/2025', nv: 12 }),
      makeBande({ truie: 'T05', dateMB: '01/05/2025', nv: 12 }),
    ];

    const perf = computeVerratPerformance(verrat, bandes, saillies);

    expect(perf.nbSaillies).toBe(5);
    expect(perf.nbSailliesReussies).toBe(5);
    expect(perf.tauxReussitePct).toBe(100);
    expect(perf.porceletsVivantsMoyenne).toBe(12);
    // 100% reussite × 0.6 + (12/14) × 0.4 = 60 + 34.28… ≈ 94
    expect(perf.scoreCompetence).toBeGreaterThanOrEqual(80);
    expect(perf.tier).toBe('ELITE');
  });

  it('saillie sans dateSaillie parseable → ignorée, ne crash pas', () => {
    const verrat = makeVerrat({ id: 'V01' });
    const saillies: Saillie[] = [
      makeSaillie({ truieId: 'T01', dateSaillie: 'pas-une-date' }),
      makeSaillie({ truieId: 'T02', dateSaillie: '06/01/2025' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T02', dateMB: '01/05/2025', nv: 14 }),
    ];

    const perf = computeVerratPerformance(verrat, bandes, saillies);
    // Une seule saillie comptée (la valide), réussie
    expect(perf.nbSaillies).toBe(1);
    expect(perf.nbSailliesReussies).toBe(1);
    expect(perf.tauxReussitePct).toBe(100);
  });

  it('saillie hors fenêtre 115j ±10j → non comptée comme réussie', () => {
    const verrat = makeVerrat({ id: 'V01' });
    const saillies: Saillie[] = [
      makeSaillie({ truieId: 'T01', dateSaillie: '06/01/2025' }),
    ];
    // MB le 01/06/2025 = 146j après → hors fenêtre (115±10 = [105,125])
    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/06/2025', nv: 12 }),
    ];

    const perf = computeVerratPerformance(verrat, bandes, saillies);
    expect(perf.nbSaillies).toBe(1);
    expect(perf.nbSailliesReussies).toBe(0);
    expect(perf.tauxReussitePct).toBe(0);
  });
});

// ─── rankVerratsByPerformance ────────────────────────────────────────────────

describe('rankVerratsByPerformance', () => {
  it('top contient les verrats ELITE/BON, tri score desc', () => {
    // V01 ELITE, V02 ELITE, V03 MOYEN, V04 INSUFFISANT
    const verrats: Verrat[] = [
      makeVerrat({ id: 'V01', boucle: 'B01' }),
      makeVerrat({ id: 'V02', boucle: 'B02' }),
      makeVerrat({ id: 'V03', boucle: 'B03' }),
      makeVerrat({ id: 'V04', boucle: 'B04' }),
      makeVerrat({ id: 'V05', boucle: 'B05' }),
    ];

    const saillies: Saillie[] = [
      // V01 : 4/4 réussies + 14NV → score max
      makeSaillie({ verratId: 'V01', truieId: 'T01', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V01', truieId: 'T02', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V01', truieId: 'T03', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V01', truieId: 'T04', dateSaillie: '06/01/2025' }),
      // V02 : 3/4 réussies + 12NV
      makeSaillie({ verratId: 'V02', truieId: 'T05', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V02', truieId: 'T06', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V02', truieId: 'T07', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V02', truieId: 'T08', dateSaillie: '06/01/2025' }),
      // V03 : 2/4 réussies + 10 NV → tier MOYEN
      makeSaillie({ verratId: 'V03', truieId: 'T09', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V03', truieId: 'T10', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V03', truieId: 'T11', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V03', truieId: 'T12', dateSaillie: '06/01/2025' }),
      // V04 : 0/4 → INSUFFISANT
      makeSaillie({ verratId: 'V04', truieId: 'T13', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V04', truieId: 'T14', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V04', truieId: 'T15', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V04', truieId: 'T16', dateSaillie: '06/01/2025' }),
      // V05 : aucune saillie → INSUFFISANT (mais nbSaillies=0)
    ];

    const bandes: BandePorcelets[] = [
      makeBande({ truie: 'T01', dateMB: '01/05/2025', nv: 14 }),
      makeBande({ truie: 'T02', dateMB: '01/05/2025', nv: 14 }),
      makeBande({ truie: 'T03', dateMB: '01/05/2025', nv: 14 }),
      makeBande({ truie: 'T04', dateMB: '01/05/2025', nv: 14 }),
      makeBande({ truie: 'T05', dateMB: '01/05/2025', nv: 12 }),
      makeBande({ truie: 'T06', dateMB: '01/05/2025', nv: 12 }),
      makeBande({ truie: 'T07', dateMB: '01/05/2025', nv: 12 }),
      makeBande({ truie: 'T09', dateMB: '01/05/2025', nv: 10 }),
      makeBande({ truie: 'T10', dateMB: '01/05/2025', nv: 10 }),
    ];

    const { top, flop } = rankVerratsByPerformance(verrats, bandes, saillies);

    expect(top.length).toBeGreaterThanOrEqual(1);
    expect(top.length).toBeLessThanOrEqual(3);
    for (const r of top) {
      expect(['ELITE', 'BON']).toContain(r.performance.tier);
    }
    // tri desc
    for (let i = 1; i < top.length; i += 1) {
      expect(top[i - 1].performance.scoreCompetence).toBeGreaterThanOrEqual(
        top[i].performance.scoreCompetence,
      );
    }
    // V01 doit dominer
    expect(top[0].verrat.id).toBe('V01');

    // V04 doit apparaître dans le flop (4 saillies, 0 réussite → score 0, INSUFFISANT)
    expect(flop.some(r => r.verrat.id === 'V04')).toBe(true);
    // V05 (aucune saillie) NE doit pas apparaître dans le flop (nbSaillies < 3)
    expect(flop.some(r => r.verrat.id === 'V05')).toBe(false);
  });

  it('verrat FAIBLE avec seulement 2 saillies → exclu du flop (seuil 3)', () => {
    const verrats: Verrat[] = [
      makeVerrat({ id: 'V01', boucle: 'B01' }),
    ];
    // 2 saillies, 0 réussite → tier INSUFFISANT mais nbSaillies < 3
    const saillies: Saillie[] = [
      makeSaillie({ verratId: 'V01', truieId: 'T01', dateSaillie: '06/01/2025' }),
      makeSaillie({ verratId: 'V01', truieId: 'T02', dateSaillie: '06/01/2025' }),
    ];

    const { flop } = rankVerratsByPerformance(verrats, [], saillies);
    expect(flop.length).toBe(0);
  });
});

// ─── buildClassementRows ─────────────────────────────────────────────────────

describe('buildClassementRows', () => {
  const truies: Truie[] = [
    makeTruie({ id: 'T01', boucle: 'B01' }),
    makeTruie({ id: 'T02', boucle: 'B02' }),
  ];
  const verrats: Verrat[] = [
    makeVerrat({ id: 'V01', boucle: 'BV01' }),
    makeVerrat({ id: 'V02', boucle: 'BV02' }),
  ];
  const bandes: BandePorcelets[] = [
    makeBande({ truie: 'T01', dateMB: '01/05/2025', nv: 14, morts: 0, vivants: 14, dateSevrageReelle: '22/05/2025' }),
    makeBande({ truie: 'T01', dateMB: '01/01/2025', nv: 12, morts: 1, vivants: 11, dateSevrageReelle: '22/01/2025' }),
    makeBande({ truie: 'T02', dateMB: '01/05/2025', nv: 8, morts: 3, vivants: 5 }),
  ];
  const saillies: Saillie[] = [
    makeSaillie({ verratId: 'V01', truieId: 'T01', dateSaillie: '06/01/2025' }),
    makeSaillie({ verratId: 'V02', truieId: 'T02', dateSaillie: '06/01/2025' }),
  ];

  it("filter='TOUS' → contient truies + verrats", () => {
    const rows = buildClassementRows({
      truies,
      verrats,
      bandes,
      saillies,
      filter: 'TOUS',
      sortBy: 'score',
    });
    expect(rows).toHaveLength(4);
    expect(rows.filter(r => r.type === 'TRUIE')).toHaveLength(2);
    expect(rows.filter(r => r.type === 'VERRAT')).toHaveLength(2);
  });

  it("filter='TRUIE' → contient seulement truies", () => {
    const rows = buildClassementRows({
      truies,
      verrats,
      bandes,
      saillies,
      filter: 'TRUIE',
      sortBy: 'score',
    });
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.type === 'TRUIE')).toBe(true);
  });

  it("filter='VERRAT' → contient seulement verrats", () => {
    const rows = buildClassementRows({
      truies,
      verrats,
      bandes,
      saillies,
      filter: 'VERRAT',
      sortBy: 'score',
    });
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.type === 'VERRAT')).toBe(true);
  });

  it("sortBy='score' → tri descendant correct", () => {
    const rows = buildClassementRows({
      truies,
      verrats,
      bandes,
      saillies,
      filter: 'TOUS',
      sortBy: 'score',
    });
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score);
    }
  });

  it("sortBy='tauxReussite' → tri descendant correct", () => {
    const rows = buildClassementRows({
      truies,
      verrats,
      bandes,
      saillies,
      filter: 'TOUS',
      sortBy: 'tauxReussite',
    });
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i - 1].tauxReussite).toBeGreaterThanOrEqual(rows[i].tauxReussite);
    }
  });

  it('href des truies = /troupeau/truies/{id}, verrats = /troupeau/verrats/{id}', () => {
    const rows = buildClassementRows({
      truies,
      verrats,
      bandes,
      saillies,
      filter: 'TOUS',
      sortBy: 'score',
    });
    for (const r of rows) {
      if (r.type === 'TRUIE') {
        expect(r.href).toBe(`/troupeau/truies/${r.id}`);
      } else {
        expect(r.href).toBe(`/troupeau/verrats/${r.id}`);
      }
    }
  });

  it('truies/verrats avec statut Réformé/Mort restent inclus (historique)', () => {
    const truiesAvecReformee: Truie[] = [
      ...truies,
      makeTruie({ id: 'T99', boucle: 'B99', statut: 'Réformée' as Truie['statut'] }),
    ];
    const verratsAvecMort: Verrat[] = [
      ...verrats,
      makeVerrat({ id: 'V99', boucle: 'BV99', statut: 'Mort' }),
    ];
    const rows = buildClassementRows({
      truies: truiesAvecReformee,
      verrats: verratsAvecMort,
      bandes,
      saillies,
      filter: 'TOUS',
      sortBy: 'score',
    });
    expect(rows.some(r => r.id === 'T99')).toBe(true);
    expect(rows.some(r => r.id === 'V99')).toBe(true);
  });
});
