/**
 * Tests unitaires — healthProtocolPlanner
 * ════════════════════════════════════════
 * Couvre les recommandations de soins par phase :
 *   - SOUS_MERE     → FER_J3 à J+3 post mise-bas
 *   - POST_SEVRAGE  → VERMIFUGE à J+21 post-sevrage
 *   - CROISSANCE    → VACCIN_PESTE à J+60 post mise-bas
 *   - ENGRAISSEMENT → aucun soin programmé (surveillance)
 *   - SOUS_MERE sans dateMB → aucune reco (pas de date pivot)
 */

import { describe, expect, it } from 'vitest';
import { getRecommendedHealthLogs, HEALTH_LOG_CATEGORIES } from './healthProtocolPlanner';
import type { BandePorcelets } from '../types/farm';

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-001',
    idPortee: 'P-001',
    statut: 'Sous mère',
    synced: true,
    ...overrides,
  };
}

describe('getRecommendedHealthLogs', () => {
  it('phase SOUS_MERE → suggère FER_J3 à J+3 post mise-bas', () => {
    const bande = makeBande({
      statut: 'Sous mère',
      dateMB: '01/04/2026',
    });
    const today = new Date(2026, 3, 4); // 04/04/2026
    const recos = getRecommendedHealthLogs(bande, today);

    expect(recos).toHaveLength(1);
    expect(recos[0].type).toBe('FER_J3');
    expect(recos[0].bande_id).toBe('B-001');
    // J+3 post mise-bas (1/4 → 4/4)
    expect(recos[0].recommendedDate.getDate()).toBe(4);
    expect(recos[0].recommendedDate.getMonth()).toBe(3);
    expect(recos[0].done).toBe(false);
  });

  it('phase POST_SEVRAGE → suggère VERMIFUGE à J+21 post-sevrage', () => {
    const bande = makeBande({
      statut: 'Sevrés',
      dateSevrageReelle: '01/04/2026',
    });
    const today = new Date(2026, 3, 22); // sevré 21j → POST_SEVRAGE
    const recos = getRecommendedHealthLogs(bande, today);

    expect(recos).toHaveLength(1);
    expect(recos[0].type).toBe('VERMIFUGE');
    // J+21 post sevrage (1/4 → 22/4)
    expect(recos[0].recommendedDate.getDate()).toBe(22);
    expect(recos[0].recommendedDate.getMonth()).toBe(3);
  });

  it('phase CROISSANCE → suggère VACCIN_PESTE à J+60 post mise-bas', () => {
    // Croissance = sevré 35-72 j après date de sevrage
    const bande = makeBande({
      statut: 'En croissance',
      dateMB: '01/02/2026',
      dateSevrageReelle: '01/03/2026',
    });
    const today = new Date(2026, 3, 15); // ~45j post-sevrage
    const recos = getRecommendedHealthLogs(bande, today);

    expect(recos).toHaveLength(1);
    expect(recos[0].type).toBe('VACCIN_PESTE');
    // J+60 post MB (1/2 → ~2/4)
    expect(recos[0].recommendedDate.getMonth()).toBe(3); // avril
  });

  it('phase ENGRAISSEMENT → aucun soin programmé (surveillance uniquement)', () => {
    // Statut explicite "engraissement" → court-circuite calcul date.
    const bande = makeBande({
      statut: 'En finition',
      dateSevrageReelle: '01/01/2026',
    });
    const today = new Date(2026, 5, 1); // 5 mois post-sevrage
    const recos = getRecommendedHealthLogs(bande, today);

    expect(recos).toHaveLength(0);
  });

  it('phase SOUS_MERE sans dateMB → aucune reco (pas de pivot)', () => {
    const bande = makeBande({ statut: 'Sous mère' });
    const recos = getRecommendedHealthLogs(bande, new Date(2026, 3, 1));
    expect(recos).toHaveLength(0);
  });
});

describe('HEALTH_LOG_CATEGORIES', () => {
  it('classe les types par grande catégorie UI', () => {
    expect(HEALTH_LOG_CATEGORIES.FER_J3).toBe('SOIN');
    expect(HEALTH_LOG_CATEGORIES.VACCIN_PESTE).toBe('SOIN');
    expect(HEALTH_LOG_CATEGORIES.CASTRATION).toBe('INTERVENTION');
    expect(HEALTH_LOG_CATEGORIES.COUPE_QUEUE).toBe('INTERVENTION');
    expect(HEALTH_LOG_CATEGORIES.BOITERIE).toBe('PROBLEME');
    expect(HEALTH_LOG_CATEGORIES.DIARRHEE).toBe('PROBLEME');
    expect(HEALTH_LOG_CATEGORIES.AUTRE).toBe('AUTRE');
  });
});
