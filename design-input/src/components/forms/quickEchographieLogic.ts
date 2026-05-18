/**
 * quickEchographieLogic.ts — Logique pure du QuickEchographieForm.
 *
 * Validation côté client de la saisie d'un résultat d'échographie (J28-J35
 * post-saillie). Exposé séparément du composant React pour permettre des
 * tests unitaires sans jsdom.
 */

export type EchoStatut = 'CONFIRMEE' | 'VIDE' | 'DOUTEUSE';

export const ECHO_BOUNDS = {
  maxNotes: 200,
} as const;

export interface EchographieDraft {
  saillieId: string;
  statut: EchoStatut | '';
  dateEchoIso: string;
  notes: string;
}

export interface EchographieValidationErrors {
  saillieId?: string;
  statut?: string;
  dateEchoIso?: string;
  notes?: string;
}

export interface EchographieValidation {
  ok: boolean;
  errors: EchographieValidationErrors;
  normalized?: {
    saillieId: string;
    statut: EchoStatut;
    dateEchoIso: string;
    notes: string;
  };
}

const ECHO_STATUTS_VALIDES: ReadonlySet<EchoStatut> = new Set([
  'CONFIRMEE',
  'VIDE',
  'DOUTEUSE',
]);

function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return false;
  // Garde-fou : la date ne doit pas être plus de 7 jours dans le futur
  // (saisie d'un J28 réalisé aujourd'hui, ou raté de quelques jours).
  return true;
}

export function validateEchographie(draft: EchographieDraft): EchographieValidation {
  const errors: EchographieValidationErrors = {};

  const saillieId = String(draft.saillieId ?? '').trim();
  if (!saillieId) errors.saillieId = 'Saillie requise';

  const statut = String(draft.statut ?? '').trim() as EchoStatut;
  if (!statut) {
    errors.statut = 'Résultat requis';
  } else if (!ECHO_STATUTS_VALIDES.has(statut)) {
    errors.statut = 'Résultat invalide';
  }

  const dateEchoIso = String(draft.dateEchoIso ?? '').trim();
  if (!dateEchoIso) {
    errors.dateEchoIso = 'Date écho requise';
  } else if (!isIsoDate(dateEchoIso)) {
    errors.dateEchoIso = 'Date invalide';
  }

  const notes = String(draft.notes ?? '');
  if (notes.length > ECHO_BOUNDS.maxNotes) {
    errors.notes = `Max ${ECHO_BOUNDS.maxNotes} caractères`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: {},
    normalized: {
      saillieId,
      statut: statut as EchoStatut,
      dateEchoIso,
      notes: notes.trim(),
    },
  };
}

/**
 * Mappe le résultat d'écho vers le nouveau statut de la truie côté `sows`.
 *  - VIDE      → 'En attente saillie' (truie redevient disponible).
 *  - CONFIRMEE → 'Pleine' (gestation confirmée).
 *  - DOUTEUSE  → null (pas de transition automatique, on attend J35).
 */
export function sowStatusFromEcho(statut: EchoStatut): string | null {
  switch (statut) {
    case 'VIDE':
      return 'En attente saillie';
    case 'CONFIRMEE':
      return 'Pleine';
    case 'DOUTEUSE':
      return null;
  }
}
