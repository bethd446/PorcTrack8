/**
 * Tests unitaires — calculs métier du module Engraissement (V80 P0 #2).
 *
 * Couvre les fonctions PURES (sans I/O Supabase) du repo :
 *   - computeGMQ (5 cas dont cap statistique)
 *   - currentAvgWeight, porcsVivants, tauxMortalite, isPretVente
 *   - coutAchatTotal
 */
import { describe, expect, it } from 'vitest';
import {
  computeGMQ,
  currentAvgWeight,
  porcsVivants,
  tauxMortalite,
  isPretVente,
  coutAchatTotal,
} from './lots.repo';

describe('computeGMQ — cap statistique', () => {
  it('retourne null si moins de 2 pesées (signal insuffisant)', () => {
    const lot = { date_arrivee: '2026-01-01', poids_moyen_arrivee: 25 };
    const pesees = [{ date: '2026-01-15', poids_moyen: 35 }];
    expect(computeGMQ(lot, pesees)).toBeNull();
  });

  it('retourne null si 0 pesée', () => {
    const lot = { date_arrivee: '2026-01-01', poids_moyen_arrivee: 25 };
    expect(computeGMQ(lot, [])).toBeNull();
  });

  it('retourne null si poids_moyen_arrivee est inconnu', () => {
    const lot = { date_arrivee: '2026-01-01', poids_moyen_arrivee: null };
    const pesees = [
      { date: '2026-01-10', poids_moyen: 30 },
      { date: '2026-01-20', poids_moyen: 40 },
    ];
    expect(computeGMQ(lot, pesees)).toBeNull();
  });

  it('cas normal — croissance 25→55 kg en 60j = 500 g/j', () => {
    const lot = { date_arrivee: '2026-01-01', poids_moyen_arrivee: 25 };
    const pesees = [
      { date: '2026-01-15', poids_moyen: 32 },
      { date: '2026-03-02', poids_moyen: 55 }, // 60 jours après arrivée
    ];
    expect(computeGMQ(lot, pesees)).toBe(500);
  });

  it('cas finition — gain plus lent 70→110 kg en 80j = 500 g/j', () => {
    const lot = { date_arrivee: '2026-01-01', poids_moyen_arrivee: 70 };
    const pesees = [
      { date: '2026-02-01', poids_moyen: 85 },
      { date: '2026-03-22', poids_moyen: 110 }, // 80 jours
    ];
    expect(computeGMQ(lot, pesees)).toBe(500);
  });

  it('cas avec mortalité importante — calcul reste basé sur poids moyen', () => {
    // Mortalité ne biaise pas le GMQ (qui mesure le poids moyen des survivants).
    const lot = { date_arrivee: '2026-01-01', poids_moyen_arrivee: 30 };
    const pesees = [
      { date: '2026-02-01', poids_moyen: 50 }, // 31j
      { date: '2026-03-01', poids_moyen: 75 }, // 59j depuis arrivée
    ];
    expect(computeGMQ(lot, pesees)).toBe(763); // (75-30)*1000/59 = 762.71
  });

  it('cas pathologique — perte de poids → GMQ négatif', () => {
    const lot = { date_arrivee: '2026-01-01', poids_moyen_arrivee: 50 };
    const pesees = [
      { date: '2026-01-15', poids_moyen: 48 },
      { date: '2026-02-01', poids_moyen: 45 }, // 31 jours
    ];
    expect(computeGMQ(lot, pesees)).toBeLessThan(0);
  });

  it('cap edge case — délai 0 jour → null', () => {
    const lot = { date_arrivee: '2026-01-01', poids_moyen_arrivee: 25 };
    const pesees = [
      { date: '2026-01-01', poids_moyen: 25 },
      { date: '2026-01-01', poids_moyen: 26 },
    ];
    expect(computeGMQ(lot, pesees)).toBeNull();
  });
});

describe('currentAvgWeight', () => {
  it('retourne la dernière pesée si disponible', () => {
    const lot = { poids_moyen_arrivee: 25 };
    const pesees = [
      { date: '2026-01-15', poids_moyen: 30 },
      { date: '2026-02-15', poids_moyen: 50 },
    ];
    expect(currentAvgWeight(lot, pesees)).toBe(50);
  });

  it('retombe sur poids_moyen_arrivee si pas de pesée', () => {
    const lot = { poids_moyen_arrivee: 25 };
    expect(currentAvgWeight(lot, [])).toBe(25);
  });

  it('null si rien de connu', () => {
    expect(currentAvgWeight({ poids_moyen_arrivee: null }, [])).toBeNull();
  });
});

describe('porcsVivants & tauxMortalite', () => {
  it('porcsVivants = initial - somme morts', () => {
    const lot = { nb_porcs_initial: 50 };
    const morts = [{ nb_morts: 3 }, { nb_morts: 1 }];
    expect(porcsVivants(lot, morts)).toBe(46);
  });

  it('porcsVivants jamais négatif', () => {
    const lot = { nb_porcs_initial: 5 };
    const morts = [{ nb_morts: 10 }];
    expect(porcsVivants(lot, morts)).toBe(0);
  });

  it('tauxMortalite arrondi 1 décimale', () => {
    const lot = { nb_porcs_initial: 50 };
    const morts = [{ nb_morts: 3 }];
    expect(tauxMortalite(lot, morts)).toBe(6);
  });

  it('tauxMortalite = 0 si pas de morts', () => {
    expect(tauxMortalite({ nb_porcs_initial: 50 }, [])).toBe(0);
  });
});

describe('isPretVente', () => {
  it('true si poids dernière pesée ≥ 110', () => {
    const lot = { poids_moyen_arrivee: 25 };
    const pesees = [
      { date: '2026-01-01', poids_moyen: 50 },
      { date: '2026-03-01', poids_moyen: 112 },
    ];
    expect(isPretVente(lot, pesees)).toBe(true);
  });

  it('false si poids < 110', () => {
    const lot = { poids_moyen_arrivee: 25 };
    const pesees = [{ date: '2026-01-01', poids_moyen: 105 }];
    expect(isPretVente(lot, pesees)).toBe(false);
  });

  it('respecte un seuil custom', () => {
    const lot = { poids_moyen_arrivee: 100 };
    expect(isPretVente(lot, [], 90)).toBe(true);
  });
});

describe('coutAchatTotal', () => {
  it('multiplie initial par prix unitaire', () => {
    expect(
      coutAchatTotal({ nb_porcs_initial: 50, prix_unitaire_achat: 35000 }),
    ).toBe(1_750_000);
  });

  it('null si prix inconnu', () => {
    expect(
      coutAchatTotal({ nb_porcs_initial: 50, prix_unitaire_achat: null }),
    ).toBeNull();
  });
});
