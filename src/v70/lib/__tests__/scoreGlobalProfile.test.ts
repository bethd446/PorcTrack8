/**
 * V80 — Tests profil-aware sur computeScoreGlobal.
 *
 * Verrouille :
 *  - profil engraisseur : EN_CONSTRUCTION + detail explicite (placeholder
 *    tant que A5 / module Engraissement n'a pas livré GMQ/IC).
 *  - profil naisseur / cycle_complet : comportement historique préservé
 *    (régression zéro).
 */
import { describe, it, expect } from 'vitest';
import { computeScoreGlobal } from '../scoreGlobal';
import type { GlobalKpis } from '../../../services/perfKpiAnalyzer';

const KPIS_VALID: GlobalKpis = {
  sevresParTruieAn: 12,
  tauxMBPct: 88,
  moyNV: 13,
  tauxMortaliteNaissanceSevrage: 5,
  nbPortees12m: 10,
  isseMoyJours: 5,
  iemMoyJours: 150,
  icMoyenReel: 2.6,
} as unknown as GlobalKpis;

describe('computeScoreGlobal — profil engraisseur', () => {
  it('retourne EN_CONSTRUCTION même quand les KPIs naisseur sont bons', () => {
    const score = computeScoreGlobal(KPIS_VALID, 'engraisseur');
    expect(score.level).toBe('EN_CONSTRUCTION');
    expect(score.score).toBe(0);
    expect(score.detail).toMatch(/Engraissement/i);
  });

  it('retourne EN_CONSTRUCTION quand les KPIs sont absents', () => {
    const score = computeScoreGlobal(null, 'engraisseur');
    expect(score.level).toBe('EN_CONSTRUCTION');
  });
});

describe('computeScoreGlobal — profil cycle_complet (défaut)', () => {
  it('utilise la pondération historique ISSE/MB/NV/Mortalité', () => {
    const score = computeScoreGlobal(KPIS_VALID, 'cycle_complet');
    expect(score.level).toBe('A');
    expect(score.score).toBeGreaterThanOrEqual(80);
    expect(score.detail).toMatch(/ISSE 50% · Taux MB 30%/);
  });

  it('default param (sans profil) = cycle_complet (rétro-compat appelants existants)', () => {
    const a = computeScoreGlobal(KPIS_VALID);
    const b = computeScoreGlobal(KPIS_VALID, 'cycle_complet');
    expect(a.score).toBe(b.score);
    expect(a.level).toBe(b.level);
  });
});

describe('computeScoreGlobal — profil naisseur', () => {
  it('utilise la même pondération que cycle_complet (KPIs naisseur identiques)', () => {
    const naisseur = computeScoreGlobal(KPIS_VALID, 'naisseur');
    const cycle = computeScoreGlobal(KPIS_VALID, 'cycle_complet');
    expect(naisseur.score).toBe(cycle.score);
    expect(naisseur.level).toBe(cycle.level);
  });
});
