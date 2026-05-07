/**
 * Tests unitaires — logeAssignmentRules
 * ═══════════════════════════════════════
 *
 * Couvre :
 *  - canAssignAnimal : 4 règles métier (verrat repro solo, verrats jeunes
 *    groupés, truies max 5, pas de mix verrat-repro + autres)
 *  - getLogeOccupants : filtrage correct par loge_id + détection reproducteur
 *  - isVerratReproducteur : heuristique statut "Actif"
 */

import { describe, expect, it } from 'vitest';
import {
  LOGE_RULES,
  canAssignAnimal,
  getLogeOccupants,
  isVerratReproducteur,
  type LogeOccupant,
} from './logeAssignmentRules';
import type { Loge, Truie, Verrat } from '../types/farm';

const makeTruie = (overrides: Partial<Truie>): Truie => ({
  id: overrides.id ?? 't1',
  displayId: overrides.displayId ?? 'T01',
  boucle: overrides.boucle ?? 'BCL-0001',
  statut: overrides.statut ?? 'En attente saillie',
  ration: overrides.ration ?? 0,
  synced: true,
  ...overrides,
});

const makeVerrat = (overrides: Partial<Verrat>): Verrat => ({
  id: overrides.id ?? 'v1',
  displayId: overrides.displayId ?? 'V01',
  boucle: overrides.boucle ?? 'BCL-V01',
  statut: overrides.statut ?? 'Actif',
  ration: overrides.ration ?? 0,
  synced: true,
  ...overrides,
});

const makeLoge = (overrides: Partial<Loge>): Loge => ({
  id: overrides.id ?? 'L1',
  numero: overrides.numero ?? 'L01',
  type: overrides.type ?? 'AUTRE',
  active: true,
  ...overrides,
});

describe('isVerratReproducteur', () => {
  it('retourne true pour statut "Actif"', () => {
    expect(isVerratReproducteur({ statut: 'Actif' })).toBe(true);
  });

  it('retourne false pour autres statuts', () => {
    expect(isVerratReproducteur({ statut: 'Réforme' })).toBe(false);
    expect(isVerratReproducteur({ statut: 'Jeune' })).toBe(false);
    expect(isVerratReproducteur({ statut: 'Mort' })).toBe(false);
  });
});

describe('getLogeOccupants', () => {
  it('filtre les animaux par loge_id et marque les verrats Actif comme reproducteurs', () => {
    const loge = makeLoge({ id: 'L1' });
    const truies = [
      makeTruie({ id: 't1', logeId: 'L1' }),
      makeTruie({ id: 't2', logeId: 'L2' }),
      makeTruie({ id: 't3', logeId: 'L1' }),
    ];
    const verrats = [
      makeVerrat({ id: 'v1', logeId: 'L1', statut: 'Actif' }),
      makeVerrat({ id: 'v2', logeId: 'L1', statut: 'Réforme' }),
      makeVerrat({ id: 'v3', logeId: 'L2', statut: 'Actif' }),
    ];

    const occupants = getLogeOccupants(loge, truies, verrats);

    expect(occupants).toHaveLength(4);
    expect(occupants.filter(o => o.kind === 'truie')).toHaveLength(2);
    const verratOccupants = occupants.filter(o => o.kind === 'verrat');
    expect(verratOccupants).toHaveLength(2);
    expect(verratOccupants.find(o => o.id === 'v1')?.reproducteur).toBe(true);
    expect(verratOccupants.find(o => o.id === 'v2')?.reproducteur).toBe(false);
  });

  it('retourne un tableau vide si aucun animal n\'est dans la loge', () => {
    const loge = makeLoge({ id: 'L1' });
    expect(getLogeOccupants(loge, [], [])).toEqual([]);
  });
});

describe('canAssignAnimal', () => {
  describe('Règle 1 : verrat reproducteur solo', () => {
    it('rejette un verrat reproducteur dans une loge non vide', () => {
      const occupants: LogeOccupant[] = [
        { kind: 'truie', id: 't1' },
      ];
      const result = canAssignAnimal(
        { kind: 'verrat', reproducteur: true },
        occupants,
      );
      expect(result.ok).toBe(false);
      expect(result.raison).toMatch(/seul/i);
    });

    it('accepte un verrat reproducteur dans une loge vide', () => {
      const result = canAssignAnimal(
        { kind: 'verrat', reproducteur: true },
        [],
      );
      expect(result.ok).toBe(true);
    });
  });

  describe('Règle 2 : pas d\'ajout dans une loge avec verrat repro', () => {
    it('rejette une truie dans une loge avec verrat reproducteur', () => {
      const occupants: LogeOccupant[] = [
        { kind: 'verrat', id: 'v1', reproducteur: true },
      ];
      const result = canAssignAnimal({ kind: 'truie' }, occupants);
      expect(result.ok).toBe(false);
      expect(result.raison).toMatch(/verrat reproducteur/i);
    });

    it('rejette un autre verrat (même jeune) dans une loge avec verrat repro', () => {
      const occupants: LogeOccupant[] = [
        { kind: 'verrat', id: 'v1', reproducteur: true },
      ];
      const result = canAssignAnimal(
        { kind: 'verrat', reproducteur: false },
        occupants,
      );
      expect(result.ok).toBe(false);
    });
  });

  describe('Règle 3 : verrats jeunes groupables', () => {
    it('accepte un verrat jeune dans une loge avec d\'autres verrats jeunes', () => {
      const occupants: LogeOccupant[] = [
        { kind: 'verrat', id: 'v1', reproducteur: false },
        { kind: 'verrat', id: 'v2', reproducteur: false },
      ];
      const result = canAssignAnimal(
        { kind: 'verrat', reproducteur: false },
        occupants,
      );
      expect(result.ok).toBe(true);
    });
  });

  describe('Règle 4 : truies max 5 par loge', () => {
    it('rejette une 6e truie dans une loge avec 5 truies', () => {
      const occupants: LogeOccupant[] = Array.from({ length: 5 }, (_, i) => ({
        kind: 'truie' as const,
        id: `t${i}`,
      }));
      const result = canAssignAnimal({ kind: 'truie' }, occupants);
      expect(result.ok).toBe(false);
      expect(result.raison).toMatch(/5 truies/);
    });

    it('accepte une 5e truie dans une loge avec 4 truies', () => {
      const occupants: LogeOccupant[] = Array.from({ length: 4 }, (_, i) => ({
        kind: 'truie' as const,
        id: `t${i}`,
      }));
      const result = canAssignAnimal({ kind: 'truie' }, occupants);
      expect(result.ok).toBe(true);
    });

    it('confirme la constante TRUIE_MAX_PAR_LOGE = 5', () => {
      expect(LOGE_RULES.TRUIE_MAX_PAR_LOGE).toBe(5);
    });
  });

  describe('Règle 5 : capaciteMax de la loge', () => {
    it('rejette si occupants >= capaciteMax', () => {
      const loge = makeLoge({ capaciteMax: 2 });
      const occupants: LogeOccupant[] = [
        { kind: 'truie', id: 't1' },
        { kind: 'truie', id: 't2' },
      ];
      const result = canAssignAnimal({ kind: 'truie' }, occupants, loge);
      expect(result.ok).toBe(false);
      expect(result.raison).toMatch(/capacit/i);
    });

    it('accepte si capaciteMax non définie (illimité)', () => {
      const loge = makeLoge({ capaciteMax: undefined });
      const result = canAssignAnimal({ kind: 'truie' }, [], loge);
      expect(result.ok).toBe(true);
    });
  });
});
