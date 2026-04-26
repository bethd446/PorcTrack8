import { describe, it, expect } from 'vitest';
import type { BandePorcelets } from '../types/farm';
import { detectPendingTransitions, computePhaseTerrain } from './phaseEngine';

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B01', idPortee: 'P01', statut: 'Sous mère',
    vivants: 12, synced: true, ...overrides,
  };
}

describe('computePhaseTerrain', () => {
  it('retourne POST_SEVRAGE pour une bande à J30 post-MB (>SEVRAGE_AGE=28)', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ dateMB: '26/03/2026' }); // J30 (25/04 - 26/03)
    expect(computePhaseTerrain(b, today)).toBe('POST_SEVRAGE');
  });

  it('retourne CROISSANCE pour J70 post-MB (> 28+35=63)', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ dateMB: '15/02/2026' }); // ~J69
    expect(computePhaseTerrain(b, today)).toBe('CROISSANCE');
  });

  it('retourne ENGRAISSEMENT pour J110 post-MB (> 63+37=100)', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ dateMB: '05/01/2026' }); // J110
    expect(computePhaseTerrain(b, today)).toBe('ENGRAISSEMENT');
  });

  it('retourne FINITION pour J185 post-MB (> 152+1 pour avoir FINITION)', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ dateMB: '22/10/2025' }); // J185
    expect(computePhaseTerrain(b, today)).toBe('FINITION');
  });
});

describe('detectPendingTransitions', () => {
  it('détecte MATERNITE→POST_SEVRAGE quand statut=Sous mère et âge>=28j', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ statut: 'Sous mère', dateMB: '20/03/2026' }); // J36
    const transitions = detectPendingTransitions([b], today);
    expect(transitions).toHaveLength(1);
    expect(transitions[0].fromPhase).toBe('SOUS_MERE');
    expect(transitions[0].toPhase).toBe('POST_SEVRAGE');
  });

  it("ne détecte aucune transition si la bande est déjà au bon statut", () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({
      statut: 'Sevrés',
      dateSevrageReelle: '20/03/2026', // J36 post-sevrage = POST_SEVRAGE ✓
    });
    const transitions = detectPendingTransitions([b], today);
    expect(transitions).toHaveLength(0);
  });

  it('détecte POST_SEVRAGE→CROISSANCE quand J40 post-sevrage et statut=Sevrés', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({
      statut: 'Sevrés',
      dateSevrageReelle: '15/03/2026', // J41 post-sevrage > 35
    });
    const transitions = detectPendingTransitions([b], today);
    expect(transitions[0].fromPhase).toBe('POST_SEVRAGE');
    expect(transitions[0].toPhase).toBe('CROISSANCE');
  });

  it('ignore les bandes RECAP', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ statut: 'RECAP', dateMB: '01/01/2026' });
    expect(detectPendingTransitions([b], today)).toHaveLength(0);
  });
});
