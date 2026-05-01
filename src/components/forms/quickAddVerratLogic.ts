/**
 * quickAddVerratLogic — Pure helpers & types for QuickAddVerratForm
 * ════════════════════════════════════════════════════════════════════════
 * Fichier jumeau de `QuickAddVerratForm.tsx` : contient la logique pure
 * testable (validation, suggest ID) + constantes et types.
 *
 * Patron identique à `quickAddTruieLogic.ts`.
 */

import type { Verrat } from '../../types/farm';

// ─── Types ───────────────────────────────────────────────────────────────────

export type VerratStatutChoice = 'Actif' | 'Réforme' | 'Mort';

export const VERRAT_STATUTS: ReadonlyArray<VerratStatutChoice> = [
  'Actif',
  'Réforme',
  'Mort',
];

export const VERRAT_RACE_SUGGESTIONS = [
  'Large White',
  'Landrace',
  'Duroc',
  'Pietrain',
  'Large White × Landrace',
  'Autre',
] as const;

export interface AddVerratDraft {
  id: string;
  boucle: string;
  nom: string;
  race: string;
  dateNaissance: string;
  origine: string;
  loge: string;
  statut: VerratStatutChoice;
  ration: string;
}

export interface AddVerratValidation {
  ok: boolean;
  errors: {
    id?: string;
    boucle?: string;
    nom?: string;
    race?: string;
    dateNaissance?: string;
    origine?: string;
    loge?: string;
    ration?: string;
  };
  values?: {
    code_id: string;
    boucle: string;
    name: string | null;
    breed: string | null;
    date_naissance: string | null;
    origine: string | null;
    localisation: string | null;
    statut: string;
    ration_kg_j: number;
  };
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Suggère un nouvel ID verrat sous forme `V<n>` à partir de la liste existante.
 */
export function suggestNextVerratId(
  verrats: ReadonlyArray<Pick<Verrat, 'id'>>,
): string {
  let maxN = 0;
  for (const v of verrats) {
    const m = String(v.id ?? '').match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }
  const next = maxN > 0 ? maxN + 1 : 1;
  return `V${String(next).padStart(2, '0')}`;
}

function parseRation(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function validateAddVerrat(draft: AddVerratDraft): AddVerratValidation {
  const errors: AddVerratValidation['errors'] = {};

  const id = String(draft.id ?? '').trim().toUpperCase();
  if (!id) {
    errors.id = 'ID requis';
  } else if (!/^V\d+$/.test(id)) {
    errors.id = 'Format invalide (ex: V01)';
  }

  const boucle = String(draft.boucle ?? '').trim();
  if (!boucle) errors.boucle = 'Boucle requise';
  else if (boucle.length > 30) errors.boucle = 'Boucle trop longue (max 30)';

  const nom = String(draft.nom ?? '').trim();
  if (nom.length > 30) errors.nom = 'Nom trop long (max 30)';

  const race = String(draft.race ?? '').trim();
  if (race.length > 40) errors.race = 'Race trop longue (max 40)';

  const dateNaissance = String(draft.dateNaissance ?? '').trim();
  if (dateNaissance !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(dateNaissance)) {
    errors.dateNaissance = 'Date invalide (format yyyy-MM-dd)';
  }

  const origine = String(draft.origine ?? '').trim();
  if (origine.length > 50) errors.origine = 'Origine trop longue (max 50)';

  const loge = String(draft.loge ?? '').trim();
  if (loge.length > 30) errors.loge = 'Loge trop longue (max 30)';

  const ration = parseRation(draft.ration);
  if (ration === null) {
    errors.ration = 'Ration requise';
  } else if (ration < 0 || ration > 10) {
    errors.ration = 'Ration entre 0 et 10';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const statut: VerratStatutChoice = draft.statut ?? 'Actif';

  return {
    ok: true,
    errors: {},
    values: {
      code_id: id,
      boucle,
      name: nom || null,
      breed: race || null,
      date_naissance: dateNaissance || null,
      origine: origine || null,
      localisation: loge || null,
      statut,
      ration_kg_j: ration as number,
    },
  };
}
