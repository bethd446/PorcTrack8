/**
 * Tests unitaires — daysSinceSaillie (FIX #8 V4B)
 * ════════════════════════════════════════════════
 * Vérifie que le compteur jours en gestation utilise bien la dernière
 * saillie réelle (et pas dateMBPrevue qui est souvent vide).
 */

import { describe, expect, it } from 'vitest';
import { daysSinceSaillie } from './CyclesHub';
import type { Saillie, Truie } from '../../types/farm';

function makeTruie(overrides: Partial<Truie> = {}): Truie {
  return {
    id: 'uuid-T07',
    displayId: 'T07',
    boucle: 'FR-T07',
    statut: 'Pleine',
    ration: 3,
    synced: true,
    ...overrides,
  };
}

function makeSaillie(overrides: Partial<Saillie> = {}): Saillie {
  return {
    truieId: 'T07',
    truieBoucle: 'FR-T07',
    dateSaillie: '01/01/2026',
    verratId: 'V01',
    statut: 'CONFIRMEE',
    ...overrides,
  };
}

const TODAY = new Date(2026, 4, 1); // 2026-05-01

describe('daysSinceSaillie — FIX #8', () => {
  it('calcule les jours depuis la dernière saillie (match par code_id)', () => {
    const truie = makeTruie();
    const saillies = [makeSaillie({ dateSaillie: '01/01/2026' })];
    expect(daysSinceSaillie(truie, saillies, TODAY)).toBe(120);
  });

  it('retient la saillie la plus récente quand plusieurs existent', () => {
    const truie = makeTruie();
    const saillies = [
      makeSaillie({ dateSaillie: '01/01/2026' }), // J+120
      makeSaillie({ dateSaillie: '15/03/2026' }), // J+47 — plus récente
    ];
    expect(daysSinceSaillie(truie, saillies, TODAY)).toBe(47);
  });

  it('retourne 0 si aucune saillie ne match', () => {
    const truie = makeTruie();
    const saillies = [makeSaillie({ truieId: 'T99', truieBoucle: 'FR-T99' })];
    expect(daysSinceSaillie(truie, saillies, TODAY)).toBe(0);
  });
});
