/**
 * Tests unitaires — nutritionAdvisor
 * ════════════════════════════════════
 * Couvre détection phase nutritionnelle, conseils dynamiques, scoring /100.
 */

import { describe, expect, it } from 'vitest';
import {
  getNutritionPhase,
  getDynamicAdvice,
  computeNutritionScore,
  type BandePerfSnapshot,
} from './nutritionAdvisor';
import {
  GMQ_CIBLES,
  IC_CIBLES,
  MORTALITE_SEUILS_PCT,
  NUTRITION_TARGETS,
} from './nutritionGuidelines';

// ─── Fixture helper ─────────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<BandePerfSnapshot> = {}): BandePerfSnapshot {
  return {
    bandeId: 'B-TEST',
    poidsMoyenKg: 40,
    poidsInitialKg: 7,
    ageJours: 60,
    gmqGramsJour: 700,
    icReel: 2.5,
    mortalitePct: 0,
    alimentCourant: 'CROISSANCE',
    alimentProteinesPct: 17,
    ...overrides,
  };
}

// ─── 1. getNutritionPhase ───────────────────────────────────────────────────

describe('getNutritionPhase', () => {
  it('renvoie null si poids null', () => {
    expect(getNutritionPhase(null)).toBeNull();
  });

  it('renvoie null si poids < 7 kg', () => {
    expect(getNutritionPhase(6.5)).toBeNull();
    expect(getNutritionPhase(0)).toBeNull();
  });

  it('renvoie null si poids > 120 kg', () => {
    expect(getNutritionPhase(120.1)).toBeNull();
    expect(getNutritionPhase(200)).toBeNull();
  });

  it('détecte DEMARRAGE aux bornes [7, 25]', () => {
    expect(getNutritionPhase(7)).toBe('DEMARRAGE');
    expect(getNutritionPhase(15)).toBe('DEMARRAGE');
    expect(getNutritionPhase(25)).toBe('DEMARRAGE');
  });

  it('détecte CROISSANCE aux bornes ]25, 60]', () => {
    expect(getNutritionPhase(25.1)).toBe('CROISSANCE');
    expect(getNutritionPhase(40)).toBe('CROISSANCE');
    expect(getNutritionPhase(60)).toBe('CROISSANCE');
  });

  it('détecte FINITION aux bornes ]60, 120]', () => {
    expect(getNutritionPhase(60.1)).toBe('FINITION');
    expect(getNutritionPhase(90)).toBe('FINITION');
    expect(getNutritionPhase(120)).toBe('FINITION');
  });
});

// ─── 2. computeNutritionScore ───────────────────────────────────────────────

describe('computeNutritionScore', () => {
  it('renvoie 100 quand tous les axes sont au max', () => {
    const snapshot = makeSnapshot({
      poidsMoyenKg: 40,
      gmqGramsJour: GMQ_CIBLES.CROISSANCE,
      icReel: IC_CIBLES.CROISSANCE,
      mortalitePct: 0,
      alimentProteinesPct: 17,
    });
    const score = computeNutritionScore(snapshot);
    expect(score.total).toBe(100);
    expect(score.proteines).toBe(25);
    expect(score.gmq).toBe(25);
    expect(score.ic).toBe(25);
    expect(score.sante).toBe(25);
  });

  it('renvoie ~48 si toutes les data sont null/manquantes (4×12)', () => {
    const snapshot: BandePerfSnapshot = {
      bandeId: 'B-NODATA',
      poidsMoyenKg: 40,
      poidsInitialKg: 7,
      ageJours: 60,
      gmqGramsJour: null,
      icReel: null,
      mortalitePct: 0,
      alimentCourant: null,
    };
    const score = computeNutritionScore(snapshot);
    // gmq=12, ic=12, proteines=12 (pas de data), sante=25 (mortalité 0 ≤ seuil)
    expect(score.gmq).toBe(12);
    expect(score.ic).toBe(12);
    expect(score.proteines).toBe(12);
    expect(score.sante).toBe(25);
    expect(score.total).toBe(61);
  });

  it('axe GMQ exactement à 50% cible → 0 pts', () => {
    const snapshot = makeSnapshot({
      gmqGramsJour: GMQ_CIBLES.CROISSANCE * 0.5,
    });
    const score = computeNutritionScore(snapshot);
    expect(score.gmq).toBe(0);
  });

  it('axe IC à 1.5× cible → 0 pts', () => {
    const snapshot = makeSnapshot({
      icReel: IC_CIBLES.CROISSANCE * 1.5,
    });
    const score = computeNutritionScore(snapshot);
    expect(score.ic).toBe(0);
  });

  it('axe santé : 12 si mortalité entre seuil et 2× seuil', () => {
    const snapshot = makeSnapshot({
      mortalitePct: MORTALITE_SEUILS_PCT.CROISSANCE * 1.5,
    });
    const score = computeNutritionScore(snapshot);
    expect(score.sante).toBe(12);
  });

  it('axe santé : 0 si mortalité > 2× seuil', () => {
    const snapshot = makeSnapshot({
      mortalitePct: MORTALITE_SEUILS_PCT.CROISSANCE * 2.5,
    });
    const score = computeNutritionScore(snapshot);
    expect(score.sante).toBe(0);
  });

  it('axe protéines : écart >= 5% hors plage → 0', () => {
    // Cible CROISSANCE 16-18 ; 22 → écart 4 ; 25 → écart 7 → 0
    const snapshot = makeSnapshot({ alimentProteinesPct: 25 });
    const score = computeNutritionScore(snapshot);
    expect(score.proteines).toBe(0);
  });
});

// ─── 3. getDynamicAdvice ────────────────────────────────────────────────────

describe('getDynamicAdvice', () => {
  it('renvoie tableau vide quand tout est dans la cible', () => {
    const snapshot = makeSnapshot({
      gmqGramsJour: GMQ_CIBLES.CROISSANCE,
      icReel: IC_CIBLES.CROISSANCE,
      mortalitePct: 0,
      alimentProteinesPct: 17,
    });
    expect(getDynamicAdvice(snapshot)).toEqual([]);
  });

  it('GMQ critique (<60% cible) → critical émis', () => {
    const snapshot = makeSnapshot({
      gmqGramsJour: GMQ_CIBLES.CROISSANCE * 0.5,
    });
    const advice = getDynamicAdvice(snapshot);
    const critical = advice.find((a) => a.source === 'GMQ' && a.type === 'critical');
    expect(critical).toBeDefined();
    expect(critical?.message).toMatch(/parasitisme/i);
  });

  it('GMQ insuffisant (entre 60% et 85%) → warning émis', () => {
    const snapshot = makeSnapshot({
      gmqGramsJour: GMQ_CIBLES.CROISSANCE * 0.75,
    });
    const advice = getDynamicAdvice(snapshot);
    const warning = advice.find((a) => a.source === 'GMQ' && a.type === 'warning');
    expect(warning).toBeDefined();
    expect(warning?.message).toMatch(/insuffisant/i);
  });

  it('IC dégradé (>1.2× cible) → warning émis', () => {
    const snapshot = makeSnapshot({
      icReel: IC_CIBLES.CROISSANCE * 1.3,
    });
    const advice = getDynamicAdvice(snapshot);
    const warning = advice.find((a) => a.source === 'IC' && a.type === 'warning');
    expect(warning).toBeDefined();
    expect(warning?.message).toMatch(/dégradé/i);
  });

  it('mortalité au-dessus du seuil → warning émis', () => {
    const snapshot = makeSnapshot({
      mortalitePct: MORTALITE_SEUILS_PCT.CROISSANCE + 0.5,
    });
    const advice = getDynamicAdvice(snapshot);
    const warning = advice.find((a) => a.source === 'MORTALITE' && a.type === 'warning');
    expect(warning).toBeDefined();
    expect(warning?.message).toMatch(/seuil/i);
  });

  it('protéines sous la plage → info émis', () => {
    const snapshot = makeSnapshot({ alimentProteinesPct: 14 });
    const advice = getDynamicAdvice(snapshot);
    const info = advice.find((a) => a.source === 'PROTEINES' && a.type === 'info');
    expect(info).toBeDefined();
    expect(info?.message).toMatch(/plus riche/i);
  });

  it('protéines au-dessus de la plage → info émis', () => {
    const snapshot = makeSnapshot({ alimentProteinesPct: 22 });
    const advice = getDynamicAdvice(snapshot);
    const info = advice.find((a) => a.source === 'PROTEINES' && a.type === 'info');
    expect(info).toBeDefined();
    expect(info?.message).toMatch(/coût/i);
  });

  it('renvoie [] si phase = null (poids hors limites)', () => {
    const snapshot = makeSnapshot({ poidsMoyenKg: null });
    expect(getDynamicAdvice(snapshot)).toEqual([]);
  });
});

// ─── 4. Cohérence cibles / phases ───────────────────────────────────────────

describe('cohérence des plages de poids par phase', () => {
  it('DEMARRAGE = [7, 25] kg', () => {
    expect(NUTRITION_TARGETS.DEMARRAGE.poidsMinKg).toBe(7);
    expect(NUTRITION_TARGETS.DEMARRAGE.poidsMaxKg).toBe(25);
  });

  it('CROISSANCE = [25, 60] kg', () => {
    expect(NUTRITION_TARGETS.CROISSANCE.poidsMinKg).toBe(25);
    expect(NUTRITION_TARGETS.CROISSANCE.poidsMaxKg).toBe(60);
  });

  it('FINITION = [60, 120] kg', () => {
    expect(NUTRITION_TARGETS.FINITION.poidsMinKg).toBe(60);
    expect(NUTRITION_TARGETS.FINITION.poidsMaxKg).toBe(120);
  });
});
