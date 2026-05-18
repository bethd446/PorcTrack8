/**
 * Logique pure de la pesée hebdo d'un lot d'engraissement — sans React/Ionic.
 * ══════════════════════════════════════════════════════════════════════════
 * Validation au contrat FORM_CONTRACT : `{ ok, errors, normalized }`.
 */

export interface AddPeseeLotDraft {
  date: string;
  poidsMoy: string;
  nbPesees: string;
}

export interface AddPeseeLotNormalized {
  date: string;
  poidsMoy: number;
  nbPesees: number;
}

export interface AddPeseeLotValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  normalized?: AddPeseeLotNormalized;
}

export function validateAddPeseeLot(draft: AddPeseeLotDraft): AddPeseeLotValidationResult {
  const errors: Record<string, string> = {};
  if (!draft.date) errors.date = 'Date requise';

  const p = parseFloat(draft.poidsMoy);
  if (!Number.isFinite(p) || p <= 0 || p > 200) errors.poidsMoy = 'Poids 0-200 kg';

  const n = parseInt(draft.nbPesees, 10);
  if (!Number.isFinite(n) || n <= 0) errors.nbPesees = 'Nb porcs > 0';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: {},
    normalized: { date: draft.date, poidsMoy: p, nbPesees: n },
  };
}
