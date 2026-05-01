/**
 * Tests unitaires — buildNutritionSnapshot
 * ══════════════════════════════════════════
 * Vérifie l'assemblage du snapshot champ par champ + edge cases.
 */

import { describe, expect, it } from 'vitest';

import type { Note } from '../types';
import type { BandePorcelets } from '../types/farm';
import { buildNutritionSnapshot } from './buildNutritionSnapshot';

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B07',
    idPortee: 'P-B07',
    statut: 'Sevrés',
    poidsInitialKg: 7,
    synced: true,
    ...overrides,
  };
}

let noteCounter = 0;
function makeWeightNote(bandeId: string, date: string, texte: string): Note {
  noteCounter += 1;
  return {
    id: `N${noteCounter}`,
    animalId: bandeId,
    animalType: 'BANDE',
    date,
    texte,
    synced: true,
  };
}

describe('buildNutritionSnapshot', () => {
  it("bande avec poidsMoyenKg + GMQ calculable via weightLogs → snapshot complet", () => {
    // Bande post-sevrage : MB il y a 60j, poids initial 7kg, poids moyen 25kg
    const bande = makeBande({
      id: 'B07',
      dateMB: '01/03/2026',
      poidsInitialKg: 7,
      poidsMoyenKg: 25,
      vivants: 10,
      morts: 0,
      dateSevrageReelle: '29/03/2026',
    });
    const today = new Date(2026, 4, 1); // 2026-05-01 ≈ J+61 post MB
    const weightLogs: Note[] = [
      makeWeightNote('B07', '2026-04-01', 'Pesée 10 porcelets · 12kg · J+31'),
      makeWeightNote('B07', '2026-04-30', 'Pesée 10 porcelets · 25kg · J+60'),
    ];

    const snap = buildNutritionSnapshot({ bande, today, weightLogs });

    expect(snap.bandeId).toBe('B07');
    expect(snap.poidsMoyenKg).toBe(25);
    expect(snap.poidsInitialKg).toBe(7);
    expect(snap.ageJours).toBeGreaterThan(0);
    // GMQ = (25-12)*1000/29 ≈ 448 g/j
    expect(snap.gmqGramsJour).toBeGreaterThan(400);
    expect(snap.gmqGramsJour).toBeLessThan(500);
    expect(snap.icReel).toBeNull();
    expect(snap.mortalitePct).toBe(0);
    expect(snap.alimentCourant).toBe('DEMARRAGE_2');
  });

  it('bande sans poidsMoyenKg → snapshot avec poidsMoyenKg=null + alimentCourant=null', () => {
    const bande = makeBande({
      id: 'B08',
      dateMB: '01/04/2026',
      poidsInitialKg: 7,
      vivants: 8,
      morts: 0,
    });
    const today = new Date(2026, 4, 1);

    const snap = buildNutritionSnapshot({ bande, today });

    expect(snap.poidsMoyenKg).toBeNull();
    expect(snap.gmqGramsJour).toBeNull();
    expect(snap.icReel).toBeNull();
    expect(snap.alimentCourant).toBeNull();
    expect(snap.mortalitePct).toBe(0);
  });

  it('mortalité = 0 morts → 0%', () => {
    const bande = makeBande({
      id: 'B09',
      dateMB: '01/04/2026',
      vivants: 12,
      morts: 0,
      poidsMoyenKg: 30,
    });
    const today = new Date(2026, 4, 1);

    const snap = buildNutritionSnapshot({ bande, today });

    expect(snap.mortalitePct).toBe(0);
  });

  it('mortalité 5/105 → ≈4.76%', () => {
    const bande = makeBande({
      id: 'B10',
      dateMB: '01/04/2026',
      vivants: 100,
      morts: 5,
      poidsMoyenKg: 30,
    });
    const today = new Date(2026, 4, 1);

    const snap = buildNutritionSnapshot({ bande, today });

    expect(snap.mortalitePct).toBeCloseTo(4.7619, 2);
  });

  it('estimation GMQ par défaut si pas de weightLogs (poids ≥ initial)', () => {
    const bande = makeBande({
      id: 'B11',
      dateMB: '01/04/2026',
      poidsInitialKg: 7,
      poidsMoyenKg: 17, // +10kg en 30j
      vivants: 10,
      morts: 0,
    });
    const today = new Date(2026, 4, 1); // ≈ J+30

    const snap = buildNutritionSnapshot({ bande, today });

    // gain 10kg en 30j → ≈333 g/j
    expect(snap.gmqGramsJour).not.toBeNull();
    expect(snap.gmqGramsJour as number).toBeGreaterThan(300);
    expect(snap.gmqGramsJour as number).toBeLessThan(400);
  });

  it('IC réel calculé si feedConsumptionLogs fourni + poidsMoyen + vivants', () => {
    const bande = makeBande({
      id: 'B12',
      dateMB: '01/01/2026',
      poidsInitialKg: 7,
      poidsMoyenKg: 50,
      vivants: 10,
      morts: 0,
    });
    const today = new Date(2026, 4, 1);
    const feedConsumptionLogs = [
      { qty_kg: 200, date_conso: '2026-02-01' },
      { qty_kg: 200, date_conso: '2026-03-01' },
      { qty_kg: 200, date_conso: '2026-04-01' },
    ];

    const snap = buildNutritionSnapshot({ bande, today, feedConsumptionLogs });

    // total livre = 600 kg ; produit = (50-1.4)*10 = 486 kg ; IC ≈ 1.23
    expect(snap.icReel).not.toBeNull();
    expect(snap.icReel as number).toBeGreaterThan(1.2);
    expect(snap.icReel as number).toBeLessThan(1.3);
  });
});
