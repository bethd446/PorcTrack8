/**
 * QuickEditTruie — Validateur pur.
 * ════════════════════════════════════════════════════════════════════════
 * Isolé dans un module .ts (sans React/Ionic) pour pouvoir être testé en
 * environnement node (`vitest` sans jsdom).
 *
 * Règles :
 *  - nom : string trim, max 30 chars — vide autorisé (on peut retirer un nom).
 *  - ration : nombre fini, 0..10 (bornes incluses), virgule acceptée,
 *             arrondi au 0.1 près.
 *
 * Patch retourné utilise les noms de colonnes GAS canoniques :
 *   NOM          (header tel qu'indexé par `mapTruie`)
 *   RATION KG/J  (header principal ; fallback `RATION` dans le mapper)
 */

export type TruieEditPatch = {
  NOM: string;
  'RATION KG/J': number;
} & Record<string, string | number | boolean | null>;

export interface TruieEditValidation {
  ok: boolean;
  patch?: TruieEditPatch;
  errors: { nom?: string; ration?: string };
}

export function validateTruieEdit(
  rawNom: string,
  rawRation: string,
): TruieEditValidation {
  const errors: TruieEditValidation['errors'] = {};

  const nom = (rawNom ?? '').trim();
  if (nom.length > 30) errors.nom = 'Nom trop long (max 30 caractères)';

  const normalized = String(rawRation ?? '').replace(',', '.').trim();
  const ration = Number(normalized);
  if (normalized === '' || !Number.isFinite(ration)) {
    errors.ration = 'Ration numérique requise';
  } else if (ration < 0) {
    errors.ration = 'Ration ≥ 0 kg/j';
  } else if (ration > 10) {
    errors.ration = 'Ration ≤ 10 kg/j';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: {},
    patch: {
      NOM: nom,
      'RATION KG/J': Math.round(ration * 10) / 10, // normalise au 0.1
    },
  };
}
