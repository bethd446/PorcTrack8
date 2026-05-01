/**
 * Tests unitaires — QuickWeightDistForm (logique pure du tri par poids)
 * ════════════════════════════════════════════════════════════════════════════
 * 4 tests :
 *   1. Validation OK + sumDistribution = vivants ± tolérance
 *   2. Validation rejette tranche négative / non entière
 *   3. Validation rejette somme hors tolérance
 *   4. buildWeightDistInsert produit un payload snake_case prêt insert
 */

import { describe, expect, it } from 'vitest';
import {
  buildWeightDistInsert,
  isBandeEligibleWeightDist,
  sumDistribution,
  validateWeightDist,
  WEIGHT_DIST_TOLERANCE,
} from './quickWeightDistLogic';

describe('QuickWeightDistForm · validateWeightDist', () => {
  it('test 1 : valide un tri cohérent avec les vivants ± tolérance', () => {
    const res = validateWeightDist({
      bandeId: 'B-100',
      dateIso: '2026-04-19',
      vivantsActuels: 30,
      nbUnder90: 6,
      nb90To100: 12,
      nb100To110: 8,
      nbAbove110: 4,
    });
    expect(res.ok).toBe(true);
    expect(sumDistribution({ nbUnder90: 6, nb90To100: 12, nb100To110: 8, nbAbove110: 4 })).toBe(30);

    // Limite tolérance haute (sum = vivants + tol) → ok
    const okHi = validateWeightDist({
      bandeId: 'B-100',
      dateIso: '2026-04-19',
      vivantsActuels: 30,
      nbUnder90: 6,
      nb90To100: 12,
      nb100To110: 8,
      nbAbove110: 4 + WEIGHT_DIST_TOLERANCE, // sum = 32
    });
    expect(okHi.ok).toBe(true);

    // Limite tolérance basse → ok
    const okLo = validateWeightDist({
      bandeId: 'B-100',
      dateIso: '2026-04-19',
      vivantsActuels: 30,
      nbUnder90: 6,
      nb90To100: 12,
      nb100To110: 8,
      nbAbove110: 4 - WEIGHT_DIST_TOLERANCE, // sum = 28
    });
    expect(okLo.ok).toBe(true);
  });

  it('test 2 : rejette tranche négative ou non entière', () => {
    const neg = validateWeightDist({
      bandeId: 'B-100',
      dateIso: '2026-04-19',
      vivantsActuels: 30,
      nbUnder90: -1,
      nb90To100: 12,
      nb100To110: 8,
      nbAbove110: 4,
    });
    expect(neg.ok).toBe(false);
    expect(neg.errors.nbUnder90).toBeDefined();

    const decimal = validateWeightDist({
      bandeId: 'B-100',
      dateIso: '2026-04-19',
      vivantsActuels: 30,
      nbUnder90: 6,
      nb90To100: 12.5,
      nb100To110: 8,
      nbAbove110: 4,
    });
    expect(decimal.ok).toBe(false);
    expect(decimal.errors.nb90To100).toBeDefined();

    // Tout zéro → erreur "au moins un porc"
    const empty = validateWeightDist({
      bandeId: 'B-100',
      dateIso: '2026-04-19',
      vivantsActuels: 30,
      nbUnder90: 0,
      nb90To100: 0,
      nb100To110: 0,
      nbAbove110: 0,
    });
    expect(empty.ok).toBe(false);
    expect(empty.errors.total).toBeDefined();
  });

  it('test 3 : rejette une somme hors tolérance ± 2', () => {
    const tooHigh = validateWeightDist({
      bandeId: 'B-100',
      dateIso: '2026-04-19',
      vivantsActuels: 30,
      nbUnder90: 10,
      nb90To100: 12,
      nb100To110: 8,
      nbAbove110: 5, // total = 35 (diff +5 > tolérance)
    });
    expect(tooHigh.ok).toBe(false);
    expect(tooHigh.errors.total).toBeDefined();
    expect(tooHigh.errors.total).toContain('35');

    const tooLow = validateWeightDist({
      bandeId: 'B-100',
      dateIso: '2026-04-19',
      vivantsActuels: 30,
      nbUnder90: 5,
      nb90To100: 5,
      nb100To110: 5,
      nbAbove110: 5, // total = 20 (diff -10)
    });
    expect(tooLow.ok).toBe(false);
    expect(tooLow.errors.total).toBeDefined();

    // bandeId + dateIso manquants
    const missingMeta = validateWeightDist({
      bandeId: '',
      dateIso: '',
      vivantsActuels: 30,
      nbUnder90: 6,
      nb90To100: 12,
      nb100To110: 8,
      nbAbove110: 4,
    });
    expect(missingMeta.ok).toBe(false);
    expect(missingMeta.errors.bandeId).toBeDefined();
    expect(missingMeta.errors.dateIso).toBeDefined();
  });

  it('test 4 : buildWeightDistInsert produit un payload snake_case typé pour insert', () => {
    const payload = buildWeightDistInsert({
      bandeUuid: 'uuid-batch-42',
      dateIso: '2026-04-19',
      dist: { nbUnder90: 6, nb90To100: 12, nb100To110: 8, nbAbove110: 4 },
      notes: '  pesée pré-départ  ',
      createdBy: 'uuid-user-1',
    });

    expect(payload.batch_id).toBe('uuid-batch-42');
    expect(payload.date_pesee).toBe('2026-04-19');
    expect(payload.nb_under_90kg).toBe(6);
    expect(payload.nb_90_to_100kg).toBe(12);
    expect(payload.nb_100_to_110kg).toBe(8);
    expect(payload.nb_above_110kg).toBe(4);
    expect(payload.notes).toBe('pesée pré-départ');
    expect(payload.created_by).toBe('uuid-user-1');

    // notes vides → null
    const noNotes = buildWeightDistInsert({
      bandeUuid: 'u',
      dateIso: '2026-04-19',
      dist: { nbUnder90: 0, nb90To100: 0, nb100To110: 0, nbAbove110: 1 },
      notes: '   ',
      createdBy: 'u',
    });
    expect(noNotes.notes).toBeNull();
  });
});

describe('QuickWeightDistForm · isBandeEligibleWeightDist', () => {
  it('reconnaît les phases engraissement / finition', () => {
    expect(isBandeEligibleWeightDist({ statut: 'Engraissement' })).toBe(true);
    expect(isBandeEligibleWeightDist({ statut: 'engraissement Finition' })).toBe(true);
    expect(isBandeEligibleWeightDist({ statut: 'finition' })).toBe(true);
    // Hors-phase → false
    expect(isBandeEligibleWeightDist({ statut: 'Sevrés' })).toBe(false);
    expect(isBandeEligibleWeightDist({ statut: 'Sous mère' })).toBe(false);
    expect(isBandeEligibleWeightDist({ statut: '' })).toBe(false);
  });
});
