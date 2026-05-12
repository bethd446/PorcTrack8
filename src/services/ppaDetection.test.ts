import { describe, it, expect } from 'vitest';
import {
  detectPPAFlagsInNotes,
  detectPPAMortalityCluster,
  evaluatePPASuspect,
} from './ppaDetection';

describe('detectPPAFlagsInNotes', () => {
  it('detects "fièvre forte" keywords', () => {
    expect(detectPPAFlagsInNotes('fièvre forte ce matin')).toContain('fievre_forte');
    expect(detectPPAFlagsInNotes('Température 41.5°C')).toContain('fievre_forte');
    expect(detectPPAFlagsInNotes('hyperthermie subite')).toContain('fievre_forte');
  });

  it('detects "hémorragies"', () => {
    expect(detectPPAFlagsInNotes('hémorragies cutanées sur abdomen')).toContain('hemorragies');
    expect(detectPPAFlagsInNotes('pétéchies sur les flancs')).toContain('hemorragies');
  });

  it('detects "oreilles bleues" (cyanose)', () => {
    expect(detectPPAFlagsInNotes('oreilles bleues, animal apathique')).toContain('oreilles_bleues');
    expect(detectPPAFlagsInNotes('cyanose marquée')).toContain('oreilles_bleues');
  });

  it('returns empty array if no keyword matches', () => {
    expect(detectPPAFlagsInNotes('vaccination de routine')).toEqual([]);
    expect(detectPPAFlagsInNotes('')).toEqual([]);
  });
});

describe('detectPPAMortalityCluster', () => {
  const today = new Date('2026-05-12');
  it('triggers on 3+ unknown deaths in 7 days', () => {
    const deaths = [
      { date: new Date('2026-05-10'), cause: 'inconnue' },
      { date: new Date('2026-05-09'), cause: '' },
      { date: new Date('2026-05-08'), cause: 'subite' },
    ];
    expect(detectPPAMortalityCluster(deaths, today)).toBe(true);
  });

  it('does NOT trigger if causes identified', () => {
    const deaths = [
      { date: new Date('2026-05-10'), cause: 'écrasement' },
      { date: new Date('2026-05-09'), cause: 'pneumonie' },
      { date: new Date('2026-05-08'), cause: 'diarrhée' },
    ];
    expect(detectPPAMortalityCluster(deaths, today)).toBe(false);
  });

  it('does NOT trigger below threshold', () => {
    const deaths = [
      { date: new Date('2026-05-10'), cause: '' },
      { date: new Date('2026-05-09'), cause: '' },
    ];
    expect(detectPPAMortalityCluster(deaths, today)).toBe(false);
  });

  it('ignores deaths outside window', () => {
    const deaths = [
      { date: new Date('2026-04-01'), cause: '' },
      { date: new Date('2026-04-02'), cause: '' },
      { date: new Date('2026-04-03'), cause: '' },
    ];
    expect(detectPPAMortalityCluster(deaths, today)).toBe(false);
  });
});

describe('evaluatePPASuspect', () => {
  const baseInput = {
    animalId: 'sow-001',
    animalLabel: '4521',
    animalType: 'TRUIE' as const,
    observedAt: new Date('2026-05-12'),
  };

  it('returns CRITIQUE if fièvre + hémorragies', () => {
    const res = evaluatePPASuspect({
      ...baseInput,
      symptomesNotes: 'fièvre forte 41°C, hémorragies cutanées',
    });
    expect(res).not.toBeNull();
    expect(res?.level).toBe('CRITIQUE');
    expect(res?.flags).toContain('fievre_forte');
    expect(res?.flags).toContain('hemorragies');
    expect(res?.message).toContain('PESTE PORCINE AFRICAINE');
    expect(res?.actionsImmediate.length).toBeGreaterThan(0);
  });

  it('returns CRITIQUE if fièvre + oreilles bleues', () => {
    const res = evaluatePPASuspect({
      ...baseInput,
      symptomesNotes: 'oreilles bleues, fièvre forte',
    });
    expect(res?.level).toBe('CRITIQUE');
  });

  it('returns HAUTE for hémorragies seules', () => {
    const res = evaluatePPASuspect({
      ...baseInput,
      symptomesNotes: 'pétéchies sur les flancs',
    });
    expect(res?.level).toBe('HAUTE');
  });

  it('returns null si pas de symptômes PPA', () => {
    expect(
      evaluatePPASuspect({ ...baseInput, symptomesNotes: 'vaccination de routine' }),
    ).toBeNull();
  });

  it('returns null si fièvre seule (pas spécifique PPA)', () => {
    expect(
      evaluatePPASuspect({ ...baseInput, symptomesNotes: 'fièvre forte' }),
    ).toBeNull();
  });
});
