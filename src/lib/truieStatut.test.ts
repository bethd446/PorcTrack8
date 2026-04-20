/**
 * Tests — normalisation canonique des statuts truies.
 *
 * Chaque cas couvre une variante observée dans la Sheet Google. Les regex
 * dans `normaliseStatut` doivent rester tolérantes aux accents / casse /
 * espaces sans introduire de faux positifs entre buckets.
 */

import { describe, expect, it } from 'vitest';
import {
  normaliseStatut,
  isActive,
  isReproCycle,
  type TruieStatutCanonique,
} from './truieStatut';

describe('normaliseStatut', () => {
  // ── PLEINE ──────────────────────────────────────────────────────────────
  it('"Pleine" → PLEINE', () => {
    expect(normaliseStatut('Pleine')).toBe('PLEINE');
  });

  it('"PLEINE" (upper) → PLEINE', () => {
    expect(normaliseStatut('PLEINE')).toBe('PLEINE');
  });

  it('"pleine" (lower) → PLEINE', () => {
    expect(normaliseStatut('pleine')).toBe('PLEINE');
  });

  it('"Gestation" → PLEINE', () => {
    expect(normaliseStatut('Gestation')).toBe('PLEINE');
  });

  it('"Gestante" → PLEINE', () => {
    expect(normaliseStatut('Gestante')).toBe('PLEINE');
  });

  // ── MATERNITE ───────────────────────────────────────────────────────────
  it('"En maternité" → MATERNITE', () => {
    expect(normaliseStatut('En maternité')).toBe('MATERNITE');
  });

  it('"Maternite" (sans accent) → MATERNITE', () => {
    expect(normaliseStatut('Maternite')).toBe('MATERNITE');
  });

  it('"Allaitante" → MATERNITE', () => {
    expect(normaliseStatut('Allaitante')).toBe('MATERNITE');
  });

  it('"Lactation" → MATERNITE', () => {
    expect(normaliseStatut('Lactation')).toBe('MATERNITE');
  });

  // ── VIDE ────────────────────────────────────────────────────────────────
  it('"En attente saillie" → VIDE', () => {
    expect(normaliseStatut('En attente saillie')).toBe('VIDE');
  });

  it('"Vide" → VIDE', () => {
    expect(normaliseStatut('Vide')).toBe('VIDE');
  });

  it('"Attente" → VIDE', () => {
    expect(normaliseStatut('Attente')).toBe('VIDE');
  });

  // ── CHALEUR ─────────────────────────────────────────────────────────────
  it('"Chaleur" → CHALEUR', () => {
    expect(normaliseStatut('Chaleur')).toBe('CHALEUR');
  });

  it('"Retour chaleur" → CHALEUR', () => {
    expect(normaliseStatut('Retour chaleur')).toBe('CHALEUR');
  });

  // ── SURVEILLANCE ────────────────────────────────────────────────────────
  it('"Surveillance" → SURVEILLANCE', () => {
    expect(normaliseStatut('Surveillance')).toBe('SURVEILLANCE');
  });

  it('"À surveiller" → SURVEILLANCE', () => {
    expect(normaliseStatut('À surveiller')).toBe('SURVEILLANCE');
  });

  // ── REFORME ─────────────────────────────────────────────────────────────
  it('"Réforme" → REFORME', () => {
    expect(normaliseStatut('Réforme')).toBe('REFORME');
  });

  it('"Reforme" (sans accent) → REFORME', () => {
    expect(normaliseStatut('Reforme')).toBe('REFORME');
  });

  it('"Morte" → REFORME', () => {
    expect(normaliseStatut('Morte')).toBe('REFORME');
  });

  // ── FLUSHING ────────────────────────────────────────────────────────────
  it('"Flushing" → FLUSHING (prio sur SURVEILLANCE)', () => {
    expect(normaliseStatut('Flushing')).toBe('FLUSHING');
  });

  // ── INCONNU ─────────────────────────────────────────────────────────────
  it('"" (vide) → INCONNU', () => {
    expect(normaliseStatut('')).toBe('INCONNU');
  });

  it('undefined → INCONNU', () => {
    expect(normaliseStatut(undefined)).toBe('INCONNU');
  });

  it('null → INCONNU', () => {
    expect(normaliseStatut(null)).toBe('INCONNU');
  });

  it('"???" (non reconnu) → INCONNU', () => {
    expect(normaliseStatut('???')).toBe('INCONNU');
  });

  it('whitespace → INCONNU', () => {
    expect(normaliseStatut('   ')).toBe('INCONNU');
  });
});

describe('isActive', () => {
  it('PLEINE est active', () => {
    expect(isActive('PLEINE')).toBe(true);
  });

  it('MATERNITE est active', () => {
    expect(isActive('MATERNITE')).toBe(true);
  });

  it('VIDE est active', () => {
    expect(isActive('VIDE')).toBe(true);
  });

  it('CHALEUR est active', () => {
    expect(isActive('CHALEUR')).toBe(true);
  });

  it('SURVEILLANCE est active', () => {
    expect(isActive('SURVEILLANCE')).toBe(true);
  });

  it('FLUSHING est active', () => {
    expect(isActive('FLUSHING')).toBe(true);
  });

  it('REFORME n\'est PAS active', () => {
    expect(isActive('REFORME')).toBe(false);
  });

  it('INCONNU n\'est PAS active', () => {
    expect(isActive('INCONNU')).toBe(false);
  });
});

describe('isReproCycle', () => {
  const inCycle: TruieStatutCanonique[] = ['PLEINE', 'MATERNITE', 'VIDE', 'CHALEUR'];
  const outCycle: TruieStatutCanonique[] = ['SURVEILLANCE', 'FLUSHING', 'REFORME', 'INCONNU'];

  for (const s of inCycle) {
    it(`${s} est dans le cycle repro`, () => {
      expect(isReproCycle(s)).toBe(true);
    });
  }

  for (const s of outCycle) {
    it(`${s} est HORS cycle repro`, () => {
      expect(isReproCycle(s)).toBe(false);
    });
  }
});
