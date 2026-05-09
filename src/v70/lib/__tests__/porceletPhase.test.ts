import { describe, it, expect } from 'vitest';
import { derivePorceletPhase } from '../porceletPhase';

function bandeWithMBDaysAgo(days: number): { dateMB: string } {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return { dateMB: d.toISOString().slice(0, 10) };
}

describe('derivePorceletPhase', () => {
  it('SOUS_MERE — porcelet 14 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 4 }, bandeWithMBDaysAgo(14));
    expect(phase).toBe('SOUS_MERE');
  });

  it('POST_SEVRAGE — porcelet 40 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 12 }, bandeWithMBDaysAgo(40));
    expect(phase).toBe('POST_SEVRAGE');
  });

  it('CROISSANCE — porcelet 80 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 35 }, bandeWithMBDaysAgo(80));
    expect(phase).toBe('CROISSANCE');
  });

  it('ENGRAISSEMENT — porcelet 130 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 65 }, bandeWithMBDaysAgo(130));
    expect(phase).toBe('ENGRAISSEMENT');
  });

  it('FINITION par jours — porcelet 200 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 90 }, bandeWithMBDaysAgo(200));
    expect(phase).toBe('FINITION');
  });

  it('FINITION par poids — poids ≥ 100kg force FINITION même J50', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 102 }, bandeWithMBDaysAgo(50));
    expect(phase).toBe('FINITION');
  });

  it('Pas de dateMB ni poids — retourne null', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 0 }, {});
    expect(phase).toBeNull();
  });

  // V75-n F-26 — fallback poids quand dateMB absente
  it('Fallback poids — pas de dateMB, poids 5kg → SOUS_MERE', () => {
    expect(derivePorceletPhase({ poidsCourantKg: 5 }, {})).toBe('SOUS_MERE');
  });

  it('Fallback poids — pas de dateMB, poids 15kg → POST_SEVRAGE', () => {
    expect(derivePorceletPhase({ poidsCourantKg: 15 }, {})).toBe('POST_SEVRAGE');
  });

  it('Fallback poids — pas de dateMB, poids 30kg → CROISSANCE', () => {
    expect(derivePorceletPhase({ poidsCourantKg: 30 }, {})).toBe('CROISSANCE');
  });

  it('Fallback poids — pas de dateMB, poids 80kg → ENGRAISSEMENT', () => {
    expect(derivePorceletPhase({ poidsCourantKg: 80 }, {})).toBe('ENGRAISSEMENT');
  });

  it('Fallback poids — pas de dateMB, poids ≥100kg → FINITION', () => {
    expect(derivePorceletPhase({ poidsCourantKg: 105 }, {})).toBe('FINITION');
  });
});
