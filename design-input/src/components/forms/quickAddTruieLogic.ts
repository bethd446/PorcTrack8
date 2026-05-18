/**
 * quickAddTruieLogic — Pure helpers & types for QuickAddTruieForm
 * ════════════════════════════════════════════════════════════════════════
 * Fichier jumeau de `QuickAddTruieForm.tsx` : contient la logique pure
 * testable (validation, build row, suggest ID) + constantes et types.
 *
 * Les consommateurs (tests, autres forms) doivent importer ces symboles
 * ICI — indispensable pour que Fast Refresh fonctionne sur le `.tsx` (qui
 * ne doit exporter que le composant).
 */

import type { SheetCell } from '../../services/offlineQueue';
import type { Truie } from '../../types/farm';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StadeChoice = 'Jeune' | 'Adulte' | 'Reproductrice';

export const STADES: ReadonlyArray<StadeChoice> = [
  'Jeune',
  'Adulte',
  'Reproductrice',
];

export interface AddTruieDraft {
  id: string;
  boucle: string;
  nom: string;
  stade: StadeChoice;
  ration: string;
}

export interface AddTruieValidation {
  ok: boolean;
  errors: {
    id?: string;
    boucle?: string;
    ration?: string;
  };
  row?: SheetCell[];
}

// ─── Pure helpers (testés unitairement) ──────────────────────────────────────

/**
 * Suggère un nouvel ID truie sous forme `T<n>` à partir de la liste existante.
 */
export function suggestNextTruieId(
  truies: ReadonlyArray<Pick<Truie, 'id'>>,
): string {
  let maxN = 0;
  for (const t of truies) {
    const m = String(t.id ?? '').match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }
  const next = maxN > 0 ? maxN + 1 : 20;
  return `T${String(next).padStart(2, '0')}`;
}

/** Parse une valeur ration (accepte virgule décimale FR). */
function parseRation(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validation + construction de la ligne Sheets.
 * Colonnes (ordre canonique SUIVI_TRUIES_REPRODUCTION) :
 *   [ID, NOM, BOUCLE, STATUT, STADE, NB_PORTEES, DERNIERE_PORTEE_NV,
 *    DATE_MB_PREVUE, RATION, NOTES]
 */
export interface AddTruieUniqueness {
  /** Codes truies déjà existants dans la ferme (uppercase). Si `id` y figure → erreur. */
  existingCodes?: ReadonlySet<string>;
  /** Boucles truies déjà utilisées dans la ferme (case-insensitive). Si `boucle` y figure → erreur. */
  existingBoucles?: ReadonlySet<string>;
}

export function validateAddTruie(
  draft: AddTruieDraft,
  uniqueness?: AddTruieUniqueness,
): AddTruieValidation {
  const errors: AddTruieValidation['errors'] = {};

  const id = String(draft.id ?? '').trim().toUpperCase();
  if (!id) {
    errors.id = 'ID requis';
  } else if (!/^T\d+$/.test(id)) {
    errors.id = 'Format invalide (ex: T20)';
  } else if (uniqueness?.existingCodes?.has(id)) {
    errors.id = `Le code ${id} est déjà utilisé dans la ferme`;
  }

  const boucle = String(draft.boucle ?? '').trim();
  if (!boucle) {
    errors.boucle = 'Boucle requise';
  } else if (uniqueness?.existingBoucles?.has(boucle.toUpperCase())) {
    errors.boucle = `La boucle ${boucle} est déjà utilisée dans la ferme`;
  }

  const ration = parseRation(draft.ration);
  if (ration === null) {
    errors.ration = 'Ration requise';
  } else if (ration < 0 || ration > 10) {
    errors.ration = 'Ration entre 0 et 10';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const nom = String(draft.nom ?? '').trim();
  const stade: StadeChoice = draft.stade ?? 'Adulte';

  const row: SheetCell[] = [
    id,                         // ID
    nom,                        // NOM
    boucle,                     // BOUCLE
    'En attente saillie',       // STATUT (défaut)
    stade,                      // STADE
    0,                          // NB_PORTEES
    '',                         // DERNIERE_PORTEE_NV
    '',                         // DATE_MB_PREVUE
    ration as number,           // RATION KG/J
    '',                         // NOTES
  ];

  return { ok: true, errors: {}, row };
}

/** Helper exposé pour les tests : construit la row uniquement (sans valider). */
export function buildAddTruieRow(draft: AddTruieDraft): SheetCell[] | null {
  const v = validateAddTruie(draft);
  return v.row ?? null;
}
