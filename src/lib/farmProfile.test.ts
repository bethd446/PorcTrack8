/**
 * V80 — Tests unitaires du helper farmProfile.
 *
 * On verrouille :
 *  - fallback `cycle_complet` sur metadata vide / inattendue
 *  - les 3 valeurs valides
 *  - rétro-compat depuis `metadata.onboarding_v2.type`
 *  - flags `hasReproduction` / `hasEngraissement`
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FARM_PROFILE,
  FARM_PROFILES,
  hasEngraissement,
  hasReproduction,
  readFarmProfile,
} from './farmProfile';

describe('readFarmProfile', () => {
  it('retourne cycle_complet par défaut sur metadata null/undefined', () => {
    expect(readFarmProfile(null)).toBe('cycle_complet');
    expect(readFarmProfile(undefined)).toBe('cycle_complet');
    expect(readFarmProfile('foo')).toBe('cycle_complet');
    expect(readFarmProfile(42)).toBe('cycle_complet');
  });

  it('retourne cycle_complet quand le champ profil est absent', () => {
    expect(readFarmProfile({})).toBe('cycle_complet');
    expect(readFarmProfile({ otherField: 'naisseur' })).toBe('cycle_complet');
  });

  it('retourne la valeur directe quand profil ∈ enum', () => {
    expect(readFarmProfile({ profil: 'naisseur' })).toBe('naisseur');
    expect(readFarmProfile({ profil: 'engraisseur' })).toBe('engraisseur');
    expect(readFarmProfile({ profil: 'cycle_complet' })).toBe('cycle_complet');
  });

  it('rejette les valeurs hors enum (fallback cycle_complet)', () => {
    expect(readFarmProfile({ profil: 'random' })).toBe('cycle_complet');
    expect(readFarmProfile({ profil: '' })).toBe('cycle_complet');
    expect(readFarmProfile({ profil: 42 })).toBe('cycle_complet');
  });

  it('rétro-compat OnboardingV2Wizard : type NAISSEUR → naisseur', () => {
    expect(readFarmProfile({ onboarding_v2: { type: 'NAISSEUR' } })).toBe(
      'naisseur',
    );
  });

  it('rétro-compat OnboardingV2Wizard : type NAISSEUR_ENGRAISSEUR → cycle_complet', () => {
    expect(
      readFarmProfile({ onboarding_v2: { type: 'NAISSEUR_ENGRAISSEUR' } }),
    ).toBe('cycle_complet');
  });

  it('profil direct prime sur rétro-compat onboarding_v2', () => {
    // L'éleveur a explicitement choisi engraisseur après coup → c'est ce
    // choix qui doit gagner, même si l'onboarding initial disait naisseur.
    expect(
      readFarmProfile({
        profil: 'engraisseur',
        onboarding_v2: { type: 'NAISSEUR' },
      }),
    ).toBe('engraisseur');
  });
});

describe('FARM_PROFILES', () => {
  it('expose les 3 profils dans le bon ordre (naisseur, engraisseur, cycle_complet)', () => {
    expect(FARM_PROFILES.map((p) => p.value)).toEqual([
      'naisseur',
      'engraisseur',
      'cycle_complet',
    ]);
  });

  it('chaque profil a un label, une description et un emoji non-vides', () => {
    for (const p of FARM_PROFILES) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(p.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe('hasReproduction / hasEngraissement', () => {
  it('naisseur → repro oui, engraissement non', () => {
    expect(hasReproduction('naisseur')).toBe(true);
    expect(hasEngraissement('naisseur')).toBe(false);
  });

  it('engraisseur → repro non, engraissement oui', () => {
    expect(hasReproduction('engraisseur')).toBe(false);
    expect(hasEngraissement('engraisseur')).toBe(true);
  });

  it('cycle_complet → les deux', () => {
    expect(hasReproduction('cycle_complet')).toBe(true);
    expect(hasEngraissement('cycle_complet')).toBe(true);
  });
});

describe('DEFAULT_FARM_PROFILE', () => {
  it('est cycle_complet (compatibilité historique)', () => {
    expect(DEFAULT_FARM_PROFILE).toBe('cycle_complet');
  });
});
