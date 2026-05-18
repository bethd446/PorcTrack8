/**
 * Logique pure du tri par poids en engraissement/finition — sans React/Ionic.
 * ══════════════════════════════════════════════════════════════════════════
 * Le porcher mesure les porcs d'une bande et répartit les poids dans 4
 * tranches : <90 kg, 90-100, 100-110, ≥110. La somme doit ≈ vivants.
 *
 * Tolérance : ±2 porcs (animal qui a bougé, doublure pesée, etc.).
 */

import type { BandePorcelets } from '../../types/farm';

export const WEIGHT_DIST_TOLERANCE = 2;
export const WEIGHT_DIST_NOTES_MAX = 200;

export interface WeightDistribution {
  nbUnder90: number;
  nb90To100: number;
  nb100To110: number;
  nbAbove110: number;
}

export interface WeightDistValidationInput extends WeightDistribution {
  vivantsActuels: number;
  dateIso: string;
  bandeId: string;
}

export interface WeightDistValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

/** Somme des 4 tranches. */
export function sumDistribution(d: WeightDistribution): number {
  return (
    (d.nbUnder90 || 0) +
    (d.nb90To100 || 0) +
    (d.nb100To110 || 0) +
    (d.nbAbove110 || 0)
  );
}

/**
 * Valide une saisie de tri par poids.
 *  - Chaque tranche ≥ 0 et entière
 *  - Au moins une tranche > 0 (pesée non vide)
 *  - Somme = vivants ± WEIGHT_DIST_TOLERANCE
 *  - dateIso et bandeId présents
 */
export function validateWeightDist(
  input: WeightDistValidationInput,
): WeightDistValidationResult {
  const errors: Record<string, string> = {};

  if (!input.bandeId) errors.bandeId = 'Bande requise';
  if (!input.dateIso) errors.dateIso = 'Date requise';

  const tranches: Array<[keyof WeightDistribution, string]> = [
    ['nbUnder90', 'nbUnder90'],
    ['nb90To100', 'nb90To100'],
    ['nb100To110', 'nb100To110'],
    ['nbAbove110', 'nbAbove110'],
  ];
  for (const [field, errKey] of tranches) {
    const v = input[field];
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      errors[errKey] = 'Entier ≥ 0 requis';
    }
  }

  const sum = sumDistribution(input);
  if (sum <= 0) {
    errors.total = 'Au moins un porc doit être pesé';
  } else if (Number.isFinite(input.vivantsActuels) && input.vivantsActuels > 0) {
    const diff = Math.abs(sum - input.vivantsActuels);
    if (diff > WEIGHT_DIST_TOLERANCE) {
      errors.total =
        `Total ${sum} ≠ vivants ${input.vivantsActuels} (tolérance ±${WEIGHT_DIST_TOLERANCE})`;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export interface WeightDistInsertPayload {
  batch_id: string;
  date_pesee: string;
  nb_under_90kg: number;
  nb_90_to_100kg: number;
  nb_100_to_110kg: number;
  nb_above_110kg: number;
  notes: string | null;
  created_by: string;
}

/** Construit le payload `weight_distributions` (sans farm_id ni id). */
export function buildWeightDistInsert(args: {
  bandeUuid: string;
  dateIso: string;
  dist: WeightDistribution;
  notes?: string;
  createdBy: string;
}): WeightDistInsertPayload {
  const { bandeUuid, dateIso, dist, notes, createdBy } = args;
  const trimmed = (notes ?? '').trim();
  return {
    batch_id: bandeUuid,
    date_pesee: dateIso,
    nb_under_90kg: dist.nbUnder90 || 0,
    nb_90_to_100kg: dist.nb90To100 || 0,
    nb_100_to_110kg: dist.nb100To110 || 0,
    nb_above_110kg: dist.nbAbove110 || 0,
    notes: trimmed.length > 0 ? trimmed.slice(0, WEIGHT_DIST_NOTES_MAX) : null,
    created_by: createdBy,
  };
}

/** Phases visées par le tri par poids (engraissement + finition uniquement). */
export const WEIGHT_DIST_PHASES = ['ENGRAISSEMENT', 'FINITION'] as const;

/** True si la bande est en engraissement ou finition. */
export function isBandeEligibleWeightDist(
  bande: Pick<BandePorcelets, 'statut'>,
): boolean {
  const s = (bande.statut || '').toLowerCase();
  return s.includes('engraissement') || s.includes('finition');
}
