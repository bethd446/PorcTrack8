/**
 * quickAddPorceletLogic — validation pure (testable sans render).
 * Boucle : regex `^[A-Za-z0-9-]{2,15}$`, unicité côté ferme via set fourni.
 * Sexe : enum strict. Poids : optionnel, 0.5–200 kg si renseigné.
 */
import type { PorceletIndividuel, PorceletSexe } from '../../types/farm';

export interface AddPorceletInput {
  boucle: string;
  sexe: PorceletSexe;
  poidsCourantKg: string;
  notes: string;
}

export interface AddPorceletErrors {
  boucle?: string;
  sexe?: string;
  poidsCourantKg?: string;
  notes?: string;
}

export interface AddPorceletValues {
  boucle: string;
  sexe: PorceletSexe;
  poidsCourantKg?: number;
  notes?: string;
}

export interface AddPorceletValidation {
  ok: boolean;
  errors: AddPorceletErrors;
  values?: AddPorceletValues;
}

const BOUCLE_REGEX = /^[A-Za-z0-9-]{2,15}$/;
const SEXES: readonly PorceletSexe[] = ['M', 'F', 'INCONNU'];

export function validateAddPorcelet(
  input: AddPorceletInput,
  existingBoucles: Set<string>,
): AddPorceletValidation {
  const errors: AddPorceletErrors = {};
  const boucle = input.boucle.trim();

  if (!boucle) {
    errors.boucle = 'Boucle requise';
  } else if (!BOUCLE_REGEX.test(boucle)) {
    errors.boucle = 'Format invalide (2–15 car. alphanum + tiret)';
  } else if (existingBoucles.has(boucle.toUpperCase())) {
    errors.boucle = 'Boucle déjà utilisée dans cette ferme';
  }

  if (!SEXES.includes(input.sexe)) {
    errors.sexe = 'Sexe invalide';
  }

  let poidsCourantKg: number | undefined;
  const trimmedPoids = input.poidsCourantKg.trim();
  if (trimmedPoids !== '') {
    const p = parseFloat(trimmedPoids.replace(',', '.'));
    if (!Number.isFinite(p)) {
      errors.poidsCourantKg = 'Poids invalide';
    } else if (p < 0.5 || p > 200) {
      errors.poidsCourantKg = 'Poids hors plage (0.5–200 kg)';
    } else {
      poidsCourantKg = p;
    }
  }

  const notes = input.notes.trim();
  if (notes.length > 300) {
    errors.notes = 'Notes trop longues (>300 car.)';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    errors: {},
    values: {
      boucle,
      sexe: input.sexe,
      poidsCourantKg,
      notes: notes || undefined,
    },
  };
}

// ─── V36-E P3 — Détection doublon boucle (warning UI non-bloquant) ──────────

export interface DuplicateBoucleMatch {
  /** Boucle existante (telle que stockée). */
  boucle: string;
  /** Sexe de l'enregistrement existant. */
  sexe: PorceletSexe;
  /** UUID du batch contenant le porcelet existant. */
  batchId: string;
}

/**
 * Cherche un porcelet existant avec la même boucle ET le même sexe.
 * Comparaison case-insensitive sur la boucle. Retourne le PREMIER match.
 *
 * Règle : si la boucle est saisie mais le sexe différent, ce n'est PAS un
 * doublon (porcelets distincts utilisant la même numérotation).
 */
export function findDuplicateBoucle(
  inputBoucle: string,
  inputSexe: PorceletSexe,
  existing: ReadonlyArray<PorceletIndividuel>,
): DuplicateBoucleMatch | null {
  const target = inputBoucle.trim().toUpperCase();
  if (!target) return null;
  for (const p of existing) {
    if (p.boucle.trim().toUpperCase() === target && p.sexe === inputSexe) {
      return {
        boucle: p.boucle,
        sexe: p.sexe,
        batchId: p.batchId,
      };
    }
  }
  return null;
}
