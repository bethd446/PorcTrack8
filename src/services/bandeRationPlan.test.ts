import { describe, it, expect } from 'vitest';
import { feedPhaseFromPoids, getBandeRationPlan } from './bandeRationPlan';
import type { BandePorcelets } from '../types/farm';

describe('feedPhaseFromPoids', () => {
  it('catégorise correctement par seuils', () => {
    expect(feedPhaseFromPoids(5)).toBe('DEMARRAGE_1'); // ≤15
    expect(feedPhaseFromPoids(20)).toBe('DEMARRAGE_2'); // 15-25
    expect(feedPhaseFromPoids(40)).toBe('CROISSANCE'); // 25-70
    expect(feedPhaseFromPoids(85)).toBe('FINITION'); // >70
  });

  it('respecte seuils exacts FARM_CONFIG (Christophe 25/50/100)', () => {
    expect(feedPhaseFromPoids(15)).toBe('DEMARRAGE_1');
    expect(feedPhaseFromPoids(15.1)).toBe('DEMARRAGE_2');
    expect(feedPhaseFromPoids(25)).toBe('DEMARRAGE_2');
    expect(feedPhaseFromPoids(25.1)).toBe('CROISSANCE');
  });
});

describe('getBandeRationPlan', () => {
  it('renvoie plan complet pour bande croissance 40kg × 23 porcelets', () => {
    const bande = {
      id: 'b-1',
      idPortee: 'B-001',
      poidsMoyenKg: 40,
      nbVivants: 23,
    } as unknown as BandePorcelets;
    const plan = getBandeRationPlan(bande);
    expect(plan.phase).toBe('CROISSANCE');
    expect(plan.phaseLabel).toBe('Croissance');
    expect(plan.poidsMoyenKg).toBe(40);
    expect(plan.effectif).toBe(23);
    // Conso CROISSANCE = 1.8 kg/j/animal × 23 = 41.4 kg
    expect(plan.consoTotaleKgJ).toBeCloseTo(41.4, 1);
    // Coût CROISSANCE = 350 FCFA/kg × 41.4 = 14490 FCFA
    expect(plan.coutJournalierFCFA).toBeGreaterThan(14000);
    expect(plan.coutJournalierFCFA).toBeLessThan(15000);
  });

  it('jours restants vente : 100 - poidsMoyen / GMQ', () => {
    // 30 kg : (100 - 30) / 0.85 = ~82 jours
    const bande30 = { id: 'b-30', poidsMoyenKg: 30, nbVivants: 10 } as unknown as BandePorcelets;
    expect(getBandeRationPlan(bande30).joursRestantsVente).toBeGreaterThan(70);
    expect(getBandeRationPlan(bande30).joursRestantsVente).toBeLessThan(95);

    // 100 kg = 0 jour
    const bande100 = { id: 'b-100', poidsMoyenKg: 100, nbVivants: 10 } as unknown as BandePorcelets;
    expect(getBandeRationPlan(bande100).joursRestantsVente).toBe(0);
  });

  it('utilise fallback poids selon phase si poidsMoyenKg absent', () => {
    const bande = {
      id: 'b-fb',
      idPortee: 'B-fb',
      phase: 'POST_SEVRAGE',
      nbVivants: 10,
    } as unknown as BandePorcelets;
    const plan = getBandeRationPlan(bande);
    expect(plan.poidsMoyenKg).toBe(12); // FALLBACK
    expect(plan.phase).toBe('DEMARRAGE_1');
  });
});
