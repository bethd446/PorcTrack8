/**
 * Logique pure de la réception d'un lot d'engraissement — sans React/Ionic.
 * ══════════════════════════════════════════════════════════════════════════
 * Validation au contrat FORM_CONTRACT : `{ ok, errors, normalized }`.
 */

export interface AddLotDraft {
  code: string;
  dateArrivee: string;
  nbPorcs: string;
  poidsMoy: string;
  prixUnit: string;
}

export interface AddLotNormalized {
  code: string;
  dateArrivee: string;
  nbPorcs: number;
  poidsMoy: number | null;
  prixUnit: number | null;
}

export interface AddLotValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  normalized?: AddLotNormalized;
}

export function validateAddLot(draft: AddLotDraft): AddLotValidationResult {
  const errors: Record<string, string> = {};
  const code = draft.code.trim();
  if (!code) errors.code = 'Code requis';
  if (!draft.dateArrivee) errors.dateArrivee = 'Date requise';

  const nbPorcs = parseInt(draft.nbPorcs, 10);
  if (!Number.isFinite(nbPorcs) || nbPorcs <= 0) {
    errors.nbPorcs = 'Nb porcs invalide (> 0)';
  }

  let poidsMoy: number | null = null;
  if (draft.poidsMoy) {
    const p = parseFloat(draft.poidsMoy);
    if (!Number.isFinite(p) || p <= 0 || p > 200) errors.poidsMoy = 'Poids 0-200 kg';
    else poidsMoy = p;
  }

  let prixUnit: number | null = null;
  if (draft.prixUnit) {
    const px = parseFloat(draft.prixUnit);
    if (!Number.isFinite(px) || px < 0) errors.prixUnit = 'Prix invalide';
    else prixUnit = px;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: {},
    normalized: {
      code,
      dateArrivee: draft.dateArrivee,
      nbPorcs,
      poidsMoy,
      prixUnit,
    },
  };
}
