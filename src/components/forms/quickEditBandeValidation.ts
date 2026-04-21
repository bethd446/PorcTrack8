/**
 * QuickEditBande — Validateur pur + helpers.
 * ════════════════════════════════════════════════════════════════════════
 * Isolé dans un module .ts (sans React/Ionic) pour pouvoir être testé en
 * environnement node (`vitest` sans jsdom).
 *
 * Règles de validation :
 *  - truie, boucleMere : strings optionnelles, max 30 chars.
 *  - dateMB, dateSevragePrevue, dateSevrageReelle, dateSeparation :
 *    format ISO yyyy-MM-dd (input[type=date]) ou vide.
 *  - nv, morts, vivants : entiers 0..25. Cohérence : morts + vivants ≤ nv
 *    (quand nv est renseigné et non nul).
 *  - nbMales, nbFemelles : entiers 0..25.
 *  - dateSevragePrevue > dateMB (stricte, puisque la gestation est passée).
 *  - dateSevrageReelle >= dateSevragePrevue - 5 jours (tolérance 5j avant).
 *  - statut : obligatoire parmi BANDE_STATUTS.
 *  - notes : max 300 chars.
 *
 * Patch :
 *  - Conversion ISO yyyy-MM-dd → dd/MM/yyyy (format Sheets GAS).
 *  - Clés canoniques : DATE_MB, NV, MORTS, VIVANTS, DATE_SEVRAGE_PREVUE,
 *    DATE_SEVRAGE_REELLE, NB_MALES, NB_FEMELLES, DATE_SEPARATION,
 *    LOGE_ENGRAISSEMENT, STATUT, NOTES, TRUIE, BOUCLE_MERE.
 *  - Patch PARTIEL : seules les valeurs modifiées par rapport à l'initial
 *    sont incluses. Une chaîne vide en date ou en texte est envoyée comme
 *    "" pour permettre d'effacer un champ côté Sheets.
 */

import type { BandePorcelets } from '../../types/farm';

export type BandeEditPatch = Partial<{
  TRUIE: string;
  BOUCLE_MERE: string;
  DATE_MB: string;
  NV: number | '';
  MORTS: number | '';
  VIVANTS: number | '';
  DATE_SEVRAGE_PREVUE: string;
  DATE_SEVRAGE_REELLE: string;
  NB_MALES: number | '';
  NB_FEMELLES: number | '';
  DATE_SEPARATION: string;
  LOGE_ENGRAISSEMENT: 'M' | 'F' | '';
  STATUT: string;
  NOTES: string;
}> &
  Record<string, string | number | boolean | null>;

export interface BandeEditErrors {
  truie?: string;
  boucleMere?: string;
  dateMB?: string;
  nv?: string;
  morts?: string;
  vivants?: string;
  dateSevragePrevue?: string;
  dateSevrageReelle?: string;
  nbMales?: string;
  nbFemelles?: string;
  dateSeparation?: string;
  logeEngraissement?: string;
  statut?: string;
  notes?: string;
}

export interface BandeEditValidation {
  ok: boolean;
  patch?: BandeEditPatch;
  errors: BandeEditErrors;
}

/** Statuts autorisés pour une bande/portée — correspond aux valeurs Sheets. */
export const BANDE_STATUTS = [
  'Sous mère',
  'Sevrés',
  'En croissance',
  'En finition',
  'Vendue',
  'Archivée',
] as const;
export type BandeStatutOption = (typeof BANDE_STATUTS)[number];

/** Raw input du formulaire (tous en string pour coller aux inputs HTML). */
export interface BandeEditRawInput {
  truie: string;
  boucleMere: string;
  dateMB: string;                 // ISO yyyy-MM-dd ou ''
  nv: string;
  morts: string;
  vivants: string;
  dateSevragePrevue: string;      // ISO yyyy-MM-dd ou ''
  dateSevrageReelle: string;      // ISO yyyy-MM-dd ou ''
  nbMales: string;
  nbFemelles: string;
  dateSeparation: string;         // ISO yyyy-MM-dd ou ''
  logeEngraissement: '' | 'M' | 'F';
  statut: string;
  notes: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const INT_RE = /^-?\d+$/;

/**
 * Convertit ISO yyyy-MM-dd en dd/MM/yyyy (format Sheets GAS).
 * Retourne '' si input vide. Retourne l'input tel quel si format non reconnu
 * (permet à l'utilisateur de conserver une valeur Sheets legacy dd/MM/yyyy).
 */
export function isoToFrDate(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Convertit dd/MM/yyyy en ISO yyyy-MM-dd (pour pré-remplir l'input date).
 * Tolère aussi le format ISO (retourné tel quel). '' si input falsy.
 */
export function frToIsoDate(fr: string | undefined): string {
  if (!fr) return '';
  const iso = fr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = fr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  return `${m[3]}-${mm}-${dd}`;
}

/** Parse ISO yyyy-MM-dd en Date (local) ou null. */
function parseIsoDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseIntStrict(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '' || !INT_RE.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Construit l'état initial du formulaire depuis une bande. */
export function bandeToRawInput(bande: BandePorcelets): BandeEditRawInput {
  return {
    truie: bande.truie ?? '',
    boucleMere: bande.boucleMere ?? '',
    dateMB: frToIsoDate(bande.dateMB),
    nv: bande.nv !== undefined ? String(bande.nv) : '',
    morts: bande.morts !== undefined ? String(bande.morts) : '',
    vivants: bande.vivants !== undefined ? String(bande.vivants) : '',
    dateSevragePrevue: frToIsoDate(bande.dateSevragePrevue),
    dateSevrageReelle: frToIsoDate(bande.dateSevrageReelle),
    nbMales: bande.nbMales !== undefined ? String(bande.nbMales) : '',
    nbFemelles: bande.nbFemelles !== undefined ? String(bande.nbFemelles) : '',
    dateSeparation: frToIsoDate(bande.dateSeparation),
    logeEngraissement: bande.logeEngraissement ?? '',
    statut: bande.statut ?? '',
    notes: bande.notes ?? '',
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────

const MAX_NB = 25;
const MIN_NB = 0;
const MAX_TEXT = 30;
const MAX_NOTES = 300;
const TOLERANCE_SEVRAGE_JOURS = 5;

export function validateBandeEdit(
  input: BandeEditRawInput,
  initial: BandeEditRawInput,
): BandeEditValidation {
  const errors: BandeEditErrors = {};

  // ── Textes courts ────────────────────────────────────────────────────
  const truie = input.truie.trim();
  if (truie.length > MAX_TEXT) errors.truie = `Max ${MAX_TEXT} caractères`;
  const boucleMere = input.boucleMere.trim();
  if (boucleMere.length > MAX_TEXT) errors.boucleMere = `Max ${MAX_TEXT} caractères`;

  // ── Statut obligatoire ───────────────────────────────────────────────
  const statut = input.statut.trim();
  if (!statut) errors.statut = 'Statut requis';
  else if (!BANDE_STATUTS.includes(statut as BandeStatutOption)) {
    errors.statut = 'Statut invalide';
  }

  // ── Nombres 0..25 ────────────────────────────────────────────────────
  const fields: Array<[keyof BandeEditRawInput, keyof BandeEditErrors]> = [
    ['nv', 'nv'],
    ['morts', 'morts'],
    ['vivants', 'vivants'],
    ['nbMales', 'nbMales'],
    ['nbFemelles', 'nbFemelles'],
  ];
  const nums: Partial<Record<keyof BandeEditRawInput, number | null>> = {};
  for (const [raw, errKey] of fields) {
    const rawVal = input[raw];
    if (rawVal === '' || rawVal === undefined) {
      nums[raw] = null;
      continue;
    }
    const n = parseIntStrict(rawVal);
    if (n === null) {
      errors[errKey] = 'Nombre entier requis';
      continue;
    }
    if (n < MIN_NB) {
      errors[errKey] = `Minimum ${MIN_NB}`;
      continue;
    }
    if (n > MAX_NB) {
      errors[errKey] = `Maximum ${MAX_NB}`;
      continue;
    }
    nums[raw] = n;
  }

  // ── Cohérence MB : morts + vivants ≤ nv (quand les 3 sont renseignés) ─
  const nv = nums.nv;
  const morts = nums.morts;
  const vivants = nums.vivants;
  if (
    typeof nv === 'number' &&
    typeof morts === 'number' &&
    typeof vivants === 'number' &&
    morts + vivants > nv
  ) {
    errors.morts = errors.morts || `Morts+Vivants (${morts + vivants}) > NV (${nv})`;
    errors.vivants = errors.vivants || `Morts+Vivants (${morts + vivants}) > NV (${nv})`;
  }

  // ── Dates : parse + cohérence ────────────────────────────────────────
  const dMB = input.dateMB ? parseIsoDate(input.dateMB) : null;
  if (input.dateMB && !dMB) errors.dateMB = 'Date invalide';
  const dSP = input.dateSevragePrevue ? parseIsoDate(input.dateSevragePrevue) : null;
  if (input.dateSevragePrevue && !dSP) errors.dateSevragePrevue = 'Date invalide';
  const dSR = input.dateSevrageReelle ? parseIsoDate(input.dateSevrageReelle) : null;
  if (input.dateSevrageReelle && !dSR) errors.dateSevrageReelle = 'Date invalide';
  const dSep = input.dateSeparation ? parseIsoDate(input.dateSeparation) : null;
  if (input.dateSeparation && !dSep) errors.dateSeparation = 'Date invalide';

  if (dMB && dSP && dSP.getTime() <= dMB.getTime()) {
    errors.dateSevragePrevue =
      errors.dateSevragePrevue || 'Sevrage prévu doit être après la mise-bas';
  }

  if (dSP && dSR) {
    const limit = dSP.getTime() - TOLERANCE_SEVRAGE_JOURS * 86_400_000;
    if (dSR.getTime() < limit) {
      errors.dateSevrageReelle =
        errors.dateSevrageReelle ||
        `Sevrage réel doit être au maximum ${TOLERANCE_SEVRAGE_JOURS}j avant la date prévue`;
    }
  }

  // ── Notes ────────────────────────────────────────────────────────────
  if (input.notes.length > MAX_NOTES) {
    errors.notes = `Max ${MAX_NOTES} caractères`;
  }

  // ── Loge M/F/'' uniquement ───────────────────────────────────────────
  if (
    input.logeEngraissement !== '' &&
    input.logeEngraissement !== 'M' &&
    input.logeEngraissement !== 'F'
  ) {
    errors.logeEngraissement = 'Valeur invalide';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // ── Construction du patch partiel ────────────────────────────────────
  const patch: BandeEditPatch = {};

  // Texte : compare au trim près
  if (truie !== initial.truie.trim()) patch.TRUIE = truie;
  if (boucleMere !== initial.boucleMere.trim()) patch.BOUCLE_MERE = boucleMere;
  if (statut !== initial.statut.trim()) patch.STATUT = statut;
  if (input.notes !== initial.notes) patch.NOTES = input.notes;
  if (input.logeEngraissement !== initial.logeEngraissement) {
    patch.LOGE_ENGRAISSEMENT = input.logeEngraissement;
  }

  // Dates : conversion yyyy-MM-dd → dd/MM/yyyy si modifié
  if (input.dateMB !== initial.dateMB) patch.DATE_MB = isoToFrDate(input.dateMB);
  if (input.dateSevragePrevue !== initial.dateSevragePrevue) {
    patch.DATE_SEVRAGE_PREVUE = isoToFrDate(input.dateSevragePrevue);
  }
  if (input.dateSevrageReelle !== initial.dateSevrageReelle) {
    patch.DATE_SEVRAGE_REELLE = isoToFrDate(input.dateSevrageReelle);
  }
  if (input.dateSeparation !== initial.dateSeparation) {
    patch.DATE_SEPARATION = isoToFrDate(input.dateSeparation);
  }

  // Nombres : number si valeur saisie, '' pour effacer
  const numMap: Array<[keyof BandeEditRawInput, keyof BandeEditPatch]> = [
    ['nv', 'NV'],
    ['morts', 'MORTS'],
    ['vivants', 'VIVANTS'],
    ['nbMales', 'NB_MALES'],
    ['nbFemelles', 'NB_FEMELLES'],
  ];
  for (const [raw, key] of numMap) {
    if (input[raw] !== initial[raw]) {
      const n = nums[raw];
      patch[key as string] = typeof n === 'number' ? n : '';
    }
  }

  return { ok: true, errors: {}, patch };
}
