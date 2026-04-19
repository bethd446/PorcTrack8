/**
 * Tests unitaires — growthAnalyzer
 * ══════════════════════════════════
 * Couvre parsing pesées, calcul GMQ, synthèse stats croissance, projection.
 */

import { describe, expect, it } from 'vitest';
import {
  parsePeseeFromNote,
  extractPeseesForBande,
  computeGMQ,
  computeBandeGrowthStats,
  gmqCibleForPhase,
  projectPoidsFinition,
} from './growthAnalyzer';
import type { Note } from '../types';
import type { BandePorcelets } from '../types/farm';

// ─── Fixture helpers ────────────────────────────────────────────────────────

let noteCounter = 0;
function makeNote(
  animalId: string,
  date: string,
  texte: string,
  animalType: Note['animalType'] = 'BANDE',
): Note {
  noteCounter += 1;
  return {
    id: `N${noteCounter}`,
    animalId,
    animalType,
    date,
    texte,
    synced: true,
  };
}

function makeBande(id: string, overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id,
    idPortee: `P-${id}`,
    statut: 'Sous mère',
    synced: true,
    ...overrides,
  };
}

// ─── parsePeseeFromNote ─────────────────────────────────────────────────────

describe('parsePeseeFromNote', () => {
  it('parse format canonique complet (nb · poids ±ecart · J+N · obs)', () => {
    const n = makeNote('B1', '2026-04-14', 'Pesée 10 porcelets · 5.4kg moy ±0.3 · J+21 · belle portée');
    const p = parsePeseeFromNote(n);
    expect(p).not.toBeNull();
    expect(p?.nbPeses).toBe(10);
    expect(p?.poidsMoyen).toBe(5.4);
    expect(p?.ecartType).toBe(0.3);
    expect(p?.observation).toBe('belle portée');
    expect(p?.date).toBe('2026-04-14');
  });

  it('parse sans écart-type ni observation', () => {
    const n = makeNote('B1', '2026-04-07', 'Pesée 12 porcelets · 6.2kg moy · J+28');
    const p = parsePeseeFromNote(n);
    expect(p).not.toBeNull();
    expect(p?.nbPeses).toBe(12);
    expect(p?.poidsMoyen).toBe(6.2);
    expect(p?.ecartType).toBeUndefined();
    expect(p?.observation).toBeUndefined();
  });

  it('parse variante "porc" abrégé', () => {
    const n = makeNote('B1', '2026-04-01', 'Pesée 15 porc · 7.1kg · J+35');
    const p = parsePeseeFromNote(n);
    expect(p).not.toBeNull();
    expect(p?.nbPeses).toBe(15);
    expect(p?.poidsMoyen).toBe(7.1);
  });

  it('parse décimale virgule française (5,4kg)', () => {
    const n = makeNote('B1', '2026-04-14', 'Pesée 10 porcelets · 5,4kg moy · J+21');
    const p = parsePeseeFromNote(n);
    expect(p?.poidsMoyen).toBe(5.4);
  });

  it('retourne null pour une note qui n\'est pas une pesée', () => {
    const n = makeNote('B1', '2026-04-14', 'Vermifuge administré, RAS');
    expect(parsePeseeFromNote(n)).toBeNull();
  });

  it('retourne null pour un poids aberrant (>200kg)', () => {
    const n = makeNote('B1', '2026-04-14', 'Pesée 10 porcelets · 350kg moy · J+21');
    expect(parsePeseeFromNote(n)).toBeNull();
  });

  it('retourne null pour une date invalide', () => {
    const n = makeNote('B1', 'not-a-date', 'Pesée 10 porcelets · 5kg · J+21');
    expect(parsePeseeFromNote(n)).toBeNull();
  });
});

// ─── extractPeseesForBande ──────────────────────────────────────────────────

describe('extractPeseesForBande', () => {
  it('filtre par bandeId + animalType=BANDE, trie ASC par date', () => {
    const notes: Note[] = [
      makeNote('B1', '2026-04-14', 'Pesée 10 porcelets · 5.4kg · J+21'),
      makeNote('B2', '2026-04-14', 'Pesée 8 porcelets · 5.0kg · J+14'), // autre bande
      makeNote('B1', '2026-03-24', 'Pesée 10 porcelets · 1.4kg · J+0'),
      makeNote('B1', '2026-04-07', 'Pesée 10 porcelets · 2.2kg · J+14'),
      makeNote('B1', '2026-04-01', 'RAS, pas de pesée'), // pas une pesée
      makeNote('B1', '2026-04-15', 'Pesée 12 · 6kg · J+22', 'TRUIE'), // mauvais type
    ];
    const pesees = extractPeseesForBande('B1', notes);
    expect(pesees).toHaveLength(3);
    expect(pesees[0].date).toBe('2026-03-24');
    expect(pesees[1].date).toBe('2026-04-07');
    expect(pesees[2].date).toBe('2026-04-14');
  });

  it('retourne tableau vide si aucune pesée', () => {
    const pesees = extractPeseesForBande('B99', []);
    expect(pesees).toEqual([]);
  });
});

// ─── computeGMQ ─────────────────────────────────────────────────────────────

describe('computeGMQ', () => {
  it('0 pesée → []', () => {
    expect(computeGMQ([])).toEqual([]);
  });

  it('1 pesée → []', () => {
    const pesees = [{ date: '2026-04-01', nbPeses: 10, poidsMoyen: 5 }];
    expect(computeGMQ(pesees)).toEqual([]);
  });

  it('2 pesées → 1 entry, GMQ correct (g/j)', () => {
    const pesees = [
      { date: '2026-03-24', nbPeses: 10, poidsMoyen: 1.4 },
      { date: '2026-04-14', nbPeses: 10, poidsMoyen: 5.4 },
    ];
    const entries = computeGMQ(pesees);
    expect(entries).toHaveLength(1);
    expect(entries[0].joursEcart).toBe(21);
    // (5.4 - 1.4) * 1000 / 21 ≈ 190 g/j
    expect(entries[0].gmqGrammesParJour).toBe(190);
    expect(entries[0].poidsDebut).toBe(1.4);
    expect(entries[0].poidsFin).toBe(5.4);
  });

  it('3 pesées → 2 entries', () => {
    const pesees = [
      { date: '2026-03-24', nbPeses: 10, poidsMoyen: 1.4 },
      { date: '2026-04-07', nbPeses: 10, poidsMoyen: 2.8 },
      { date: '2026-04-14', nbPeses: 10, poidsMoyen: 5.4 },
    ];
    const entries = computeGMQ(pesees);
    expect(entries).toHaveLength(2);
    expect(entries[0].fromDate).toBe('2026-03-24');
    expect(entries[0].toDate).toBe('2026-04-07');
    expect(entries[1].fromDate).toBe('2026-04-07');
    expect(entries[1].toDate).toBe('2026-04-14');
  });

  it('poids décroissant (suspect) → GMQ négatif sans erreur', () => {
    const pesees = [
      { date: '2026-04-01', nbPeses: 10, poidsMoyen: 6 },
      { date: '2026-04-11', nbPeses: 10, poidsMoyen: 5 },
    ];
    const entries = computeGMQ(pesees);
    expect(entries).toHaveLength(1);
    expect(entries[0].gmqGrammesParJour).toBe(-100);
  });
});

// ─── gmqCibleForPhase ───────────────────────────────────────────────────────

describe('gmqCibleForPhase', () => {
  it('retourne bons seuils par phase', () => {
    expect(gmqCibleForPhase('SOUS_MERE')).toEqual({ min: 180, max: 250 });
    expect(gmqCibleForPhase('POST_SEVRAGE')).toEqual({ min: 400, max: 500 });
    expect(gmqCibleForPhase('ENGRAISSEMENT')).toEqual({ min: 750, max: 900 });
    expect(gmqCibleForPhase('INCONNU')).toEqual({ min: 0, max: 0 });
  });
});

// ─── projectPoidsFinition ───────────────────────────────────────────────────

describe('projectPoidsFinition', () => {
  it('calcule bien (25kg + 800g/j × 100j = 105kg)', () => {
    expect(projectPoidsFinition(25, 800, 100)).toBe(105);
  });

  it('joursRestants négatif → pas de gain', () => {
    expect(projectPoidsFinition(50, 700, -10)).toBe(50);
  });
});

// ─── computeBandeGrowthStats ────────────────────────────────────────────────

describe('computeBandeGrowthStats', () => {
  it('0 pesée → alerte=NOUS_PEU_DE_DATA, pesees=[]', () => {
    const bande = makeBande('B1');
    const stats = computeBandeGrowthStats(bande, []);
    expect(stats.pesees).toEqual([]);
    expect(stats.alerte).toBe('NOUS_PEU_DE_DATA');
    expect(stats.gmqMoyenGlobal).toBe(0);
    expect(stats.dernierPoids).toBeUndefined();
  });

  it('1 pesée → alerte=NOUS_PEU_DE_DATA, dernierPoids présent, pas de GMQ', () => {
    const bande = makeBande('B1');
    const notes = [makeNote('B1', '2026-04-14', 'Pesée 10 porcelets · 5.4kg · J+21')];
    const stats = computeBandeGrowthStats(bande, notes, new Date('2026-04-17'));
    expect(stats.pesees).toHaveLength(1);
    expect(stats.dernierPoids).toBe(5.4);
    expect(stats.dernierGMQ).toBeUndefined();
    expect(stats.alerte).toBe('NOUS_PEU_DE_DATA');
    expect(stats.joursDepuisDerniere).toBe(3);
  });

  it('POST_SEVRAGE avec GMQ sous cible → alerte=SOUS_CIBLE', () => {
    // Phase POST_SEVRAGE cible min = 400 g/j → seuil alerte = 320 g/j
    // On simule GMQ = 100 g/j → SOUS_CIBLE
    const bande = makeBande('B1', {
      statut: 'Sevrés',
      dateSevrageReelle: '01/04/2026',
    });
    const notes = [
      makeNote('B1', '2026-04-05', 'Pesée 10 porcelets · 8.0kg · J+35'),
      makeNote('B1', '2026-04-15', 'Pesée 10 porcelets · 9.0kg · J+45'),
    ];
    const stats = computeBandeGrowthStats(bande, notes, new Date('2026-04-17'));
    expect(stats.phaseCourante).toBe('POST_SEVRAGE');
    // (9-8) * 1000 / 10 = 100 g/j, < 320 → SOUS_CIBLE
    expect(stats.gmqMoyenGlobal).toBe(100);
    expect(stats.alerte).toBe('SOUS_CIBLE');
  });

  it('SOUS_MERE avec GMQ dans cible → alerte=OK', () => {
    const bande = makeBande('B1', { statut: 'Sous mère' });
    // 1.4kg → 5.6kg en 21j = 200 g/j (dans 180-250)
    const notes = [
      makeNote('B1', '2026-03-24', 'Pesée 10 porcelets · 1.4kg · J+0'),
      makeNote('B1', '2026-04-14', 'Pesée 10 porcelets · 5.6kg · J+21'),
    ];
    const stats = computeBandeGrowthStats(bande, notes, new Date('2026-04-15'));
    expect(stats.phaseCourante).toBe('SOUS_MERE');
    expect(stats.gmqMoyenGlobal).toBe(200);
    expect(stats.alerte).toBe('OK');
  });

  it('ENGRAISSEMENT avec GMQ positif → poidsProjeteFin défini', () => {
    const bande = makeBande('B1', {
      statut: 'Sevrés',
      dateSevrageReelle: '01/01/2026', // > 60j passé au 17/04
    });
    const notes = [
      makeNote('B1', '2026-03-01', 'Pesée 10 porcelets · 30kg · J+60'),
      makeNote('B1', '2026-04-10', 'Pesée 10 porcelets · 62kg · J+100'),
    ];
    const stats = computeBandeGrowthStats(bande, notes, new Date('2026-04-17'));
    expect(stats.phaseCourante).toBe('ENGRAISSEMENT');
    // (62-30)*1000/40 = 800 g/j
    expect(stats.gmqMoyenGlobal).toBe(800);
    expect(stats.poidsProjeteFin).toBeDefined();
    // Projette vers 115kg cible → proche de 115kg
    expect(stats.poidsProjeteFin).toBeGreaterThan(110);
  });

  it('dernierGMQ correspond à la dernière paire', () => {
    const bande = makeBande('B1');
    const notes = [
      makeNote('B1', '2026-03-24', 'Pesée 10 porcelets · 1.4kg · J+0'),
      makeNote('B1', '2026-04-07', 'Pesée 10 porcelets · 3.0kg · J+14'),
      makeNote('B1', '2026-04-14', 'Pesée 10 porcelets · 5.4kg · J+21'),
    ];
    const stats = computeBandeGrowthStats(bande, notes, new Date('2026-04-17'));
    expect(stats.dernierGMQ?.fromDate).toBe('2026-04-07');
    expect(stats.dernierGMQ?.toDate).toBe('2026-04-14');
    expect(stats.dernierPoids).toBe(5.4);
  });
});
