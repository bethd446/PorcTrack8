/**
 * quickAddPorceletLogic — validation pure (testable sans render).
 * Boucle : regex `^[A-Za-z0-9-]{2,15}$`, unicité côté ferme via set fourni.
 * Sexe : enum strict. Poids : optionnel, 0.5–200 kg si renseigné.
 */
import type { PorceletSexe } from '../../types/farm';

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
