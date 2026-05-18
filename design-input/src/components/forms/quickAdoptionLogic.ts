/**
 * Logique pure (testable) pour QuickAdoptionForm.
 * ════════════════════════════════════════════════════════════════════════
 *
 * Validation et construction du payload pour `insertAdoption()`. Aucun
 * appel réseau, pas de React.
 */

export type AdoptionMotif = 'EQUILIBRAGE' | 'TRUIE_INSUFFISANTE_LAIT' | 'AUTRE';

export const ADOPTION_MOTIFS: readonly AdoptionMotif[] = [
  'EQUILIBRAGE',
  'TRUIE_INSUFFISANTE_LAIT',
  'AUTRE',
];

export const ADOPTION_MOTIF_LABELS: Record<AdoptionMotif, string> = {
  EQUILIBRAGE: 'Équilibrage des portées',
  TRUIE_INSUFFISANTE_LAIT: 'Truie insuffisante en lait',
  AUTRE: 'Autre',
};

export interface AddAdoptionInput {
  fromBatchId: string;
  toBatchId: string;
  nbPorcelets: string | number;
  dateAdoption: string; // YYYY-MM-DD
  motif: string;
  notes: string;
  /** Vivants disponibles dans la bande source (pour validation). */
  fromBatchVivants?: number;
}

export interface AddAdoptionValidation {
  ok: boolean;
  errors: Partial<Record<keyof AddAdoptionInput, string>>;
  payload: {
    from_batch_id: string;
    to_batch_id: string;
    nb_porcelets: number;
    date_adoption: string;
    motif: AdoptionMotif | null;
    notes: string | null;
  } | null;
}

function parseInt32(s: string | number): number | null {
  if (typeof s === 'number') return Number.isFinite(s) ? Math.trunc(s) : null;
  if (typeof s !== 'string') return null;
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function isValidISODate(s: string): boolean {
  if (!s) return false;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export function validateAddAdoption(input: AddAdoptionInput): AddAdoptionValidation {
  const errors: AddAdoptionValidation['errors'] = {};

  const from = (input.fromBatchId || '').trim();
  const to = (input.toBatchId || '').trim();
  if (!from) errors.fromBatchId = 'Bande source obligatoire';
  if (!to) errors.toBatchId = 'Bande destination obligatoire';
  if (from && to && from === to) {
    errors.toBatchId = 'Bande source et destination identiques';
  }

  const nb = parseInt32(input.nbPorcelets);
  if (nb === null || nb <= 0) {
    errors.nbPorcelets = 'Nombre > 0 obligatoire';
  } else if (
    typeof input.fromBatchVivants === 'number' &&
    Number.isFinite(input.fromBatchVivants) &&
    input.fromBatchVivants >= 0 &&
    nb > input.fromBatchVivants
  ) {
    errors.nbPorcelets = `Max ${input.fromBatchVivants} (vivants source)`;
  }

  if (!isValidISODate(input.dateAdoption)) {
    errors.dateAdoption = 'Date invalide (YYYY-MM-DD)';
  }

  const motifRaw = (input.motif || '').trim().toUpperCase();
  const motif = ADOPTION_MOTIFS.includes(motifRaw as AdoptionMotif)
    ? (motifRaw as AdoptionMotif)
    : null;
  if (input.motif && !motif) errors.motif = 'Motif invalide';

  if (input.notes && input.notes.length > 500) {
    errors.notes = 'Max 500 caractères';
  }

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    payload: ok
      ? {
          from_batch_id: from,
          to_batch_id: to,
          nb_porcelets: nb as number,
          date_adoption: input.dateAdoption,
          motif,
          notes: input.notes?.trim() || null,
        }
      : null,
  };
}

/** Date du jour au format YYYY-MM-DD (locale). */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
