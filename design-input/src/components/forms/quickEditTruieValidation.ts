/**
 * QuickEditTruie — Validateur pur (legacy + multi-champs).
 * ════════════════════════════════════════════════════════════════════════
 * Isolé dans un module .ts (sans React/Ionic) pour pouvoir être testé en
 * environnement node (`vitest` sans jsdom).
 *
 * ─── API historique (2 args) ─────────────────────────────────────────────
 *   validateTruieEdit(rawNom, rawRation)
 *     - nom : string trim, max 30 chars — vide autorisé.
 *     - ration : nombre fini 0..10, virgule acceptée, arrondi au 0.1 près.
 *     - Patch : { NOM, 'RATION KG/J' }.
 *
 * ─── API multi-champs (v2) ───────────────────────────────────────────────
 *   validateTruieEditFull(draft, initial?)
 *     - Tous les champs éditables (nom, boucle, race, poids, stade, statut,
 *       ration, nbPortees, derniereNV, dateMBPrevue, notes).
 *     - Boucle obligatoire, tous les autres optionnels.
 *     - Patch : UNIQUEMENT les clés modifiées vs `initial` (diff).
 *     - Date : convertit yyyy-MM-dd → dd/MM/yyyy pour GAS.
 */

export type TruieEditPatch = Record<string, string | number | boolean | null>;

export interface TruieEditValidation {
  ok: boolean;
  patch?: TruieEditPatch;
  errors: {
    codeId?: string;
    nom?: string;
    boucle?: string;
    race?: string;
    poids?: string;
    stade?: string;
    statut?: string;
    ration?: string;
    nbPortees?: string;
    derniereNV?: string;
    dateMBPrevue?: string;
    dateNaissance?: string;
    origine?: string;
    loge?: string;
    notes?: string;
  };
}

export interface TruieEditDraft {
  /** Code interne (displayId / code_id) — éditable, regex [A-Za-z0-9-]{3,15}. */
  codeId?: string;
  nom: string;
  boucle: string;
  race: string;
  /** Poids en kg (string input) — vide autorisé. */
  poids: string;
  stade: string;
  statut: string;
  ration: string;
  nbPortees: string;
  derniereNV: string;
  /** Date MB prévue au format yyyy-MM-dd (input date HTML5). */
  dateMBPrevue: string;
  /** Date de naissance au format yyyy-MM-dd (input date HTML5). */
  dateNaissance: string;
  origine: string;
  loge: string;
  notes: string;
}

/**
 * Snapshot initial (valeurs actuelles de la truie) — pour calculer le diff
 * et n'émettre dans le patch QUE les champs modifiés.
 */
export interface TruieEditInitial {
  /** code_id initial (displayId courant). */
  codeId?: string;
  nom: string;
  boucle: string;
  race: string;
  poids: string;
  stade: string;
  statut: string;
  ration: string;
  nbPortees: string;
  derniereNV: string;
  /** dateMBPrevue initiale au format yyyy-MM-dd (normalisée depuis Sheets). */
  dateMBPrevue: string;
  /** dateNaissance initiale au format yyyy-MM-dd. */
  dateNaissance: string;
  origine: string;
  loge: string;
  notes: string;
}

/** Regex officielle pour le code interne (displayId) éditable. */
export const CODE_ID_REGEX = /^[A-Za-z0-9-]{3,15}$/;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse un entier strict (rejette float, NaN). */
function parseIntStrict(raw: string): number | null {
  const s = String(raw ?? '').trim();
  if (s === '') return null;
  if (!/^-?\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse un float tolérant (virgule FR acceptée). */
function parseFloatStrict(raw: string): number | null {
  const s = String(raw ?? '').replace(',', '.').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Convertit une date `yyyy-MM-dd` (input HTML5) en `dd/MM/yyyy` (format GAS).
 * Retourne '' si entrée vide.
 */
export function isoDateToFr(iso: string): string {
  const s = String(iso ?? '').trim();
  if (s === '') return '';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Convertit une date `dd/MM/yyyy` (format Sheets FR) en `yyyy-MM-dd` pour
 * pré-remplir un input date HTML5. Retourne '' si invalide.
 */
export function frDateToIso(fr: string): string {
  const s = String(fr ?? '').trim();
  if (s === '') return '';
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// ─── API historique (legacy 2 args) ─────────────────────────────────────────

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
      'RATION KG/J': Math.round(ration * 10) / 10,
    },
  };
}

// ─── API v2 — multi-champs + diff patch ─────────────────────────────────────

/**
 * Validation complète multi-champs + construction du patch.
 *
 * Seuls les champs modifiés (diff vs `initial`) sont ajoutés au patch.
 * Si aucun changement → patch vide `{}`.
 *
 * Champs obligatoires : `boucle` (non vide).
 * Ration reste numérique obligatoire (0..10) si fournie, mais elle est
 * toujours remplie dans le composant (pré-remplie par la valeur courante).
 */
export function validateTruieEditFull(
  draft: TruieEditDraft,
  initial?: TruieEditInitial,
  /** Liste des codes existants (sauf le code initial) pour valider l'unicité. */
  existingCodes?: ReadonlySet<string>,
): TruieEditValidation {
  const errors: TruieEditValidation['errors'] = {};

  // ── Normalisation ──────────────────────────────────────────────────────
  const codeId = (draft.codeId ?? '').trim();
  const nom = (draft.nom ?? '').trim();
  const boucle = (draft.boucle ?? '').trim();
  const race = (draft.race ?? '').trim();
  const stade = (draft.stade ?? '').trim();
  const statut = (draft.statut ?? '').trim();
  const notes = (draft.notes ?? '').trim();
  const dateIso = (draft.dateMBPrevue ?? '').trim();
  const dateNaissanceIso = (draft.dateNaissance ?? '').trim();
  const origine = (draft.origine ?? '').trim();
  const loge = (draft.loge ?? '').trim();

  // ── Validation ─────────────────────────────────────────────────────────
  // Code interne — tolère absence si initial vide aussi (legacy/tests).
  const initialCodeId = (initial?.codeId ?? '').trim();
  if (codeId.length === 0 && initialCodeId.length === 0) {
    /* skip */
  } else if (codeId.length === 0) {
    errors.codeId = 'Code interne obligatoire';
  } else if (!CODE_ID_REGEX.test(codeId)) {
    errors.codeId = 'Format invalide (3-15 lettres/chiffres/tirets)';
  } else if (
    existingCodes &&
    existingCodes.has(codeId) &&
    initialCodeId !== codeId
  ) {
    errors.codeId = 'Ce code est déjà utilisé';
  }
  if (boucle.length === 0) {
    errors.boucle = 'Boucle obligatoire';
  } else if (boucle.length > 30) {
    errors.boucle = 'Boucle trop longue (max 30 caractères)';
  }
  if (nom.length > 30) errors.nom = 'Nom trop long (max 30 caractères)';
  if (race.length > 40) errors.race = 'Race trop longue (max 40 caractères)';
  if (notes.length > 200) errors.notes = 'Notes trop longues (max 200 caractères)';

  // Ration — numérique requise, 0..10
  const rationNorm = String(draft.ration ?? '').replace(',', '.').trim();
  const rationN = Number(rationNorm);
  if (rationNorm === '' || !Number.isFinite(rationN)) {
    errors.ration = 'Ration numérique requise';
  } else if (rationN < 0) {
    errors.ration = 'Ration ≥ 0 kg/j';
  } else if (rationN > 10) {
    errors.ration = 'Ration ≤ 10 kg/j';
  }

  // Poids — optionnel, 0..350
  let poidsN: number | null = null;
  if (String(draft.poids ?? '').trim() !== '') {
    poidsN = parseFloatStrict(draft.poids);
    if (poidsN === null) {
      errors.poids = 'Poids numérique invalide';
    } else if (poidsN < 0) {
      errors.poids = 'Poids ≥ 0 kg';
    } else if (poidsN > 350) {
      errors.poids = 'Poids ≤ 350 kg';
    }
  }

  // Nb portées — optionnel, entier 0..20
  let nbPorteesN: number | null = null;
  if (String(draft.nbPortees ?? '').trim() !== '') {
    nbPorteesN = parseIntStrict(draft.nbPortees);
    if (nbPorteesN === null) {
      errors.nbPortees = 'Nombre de portées entier requis';
    } else if (nbPorteesN < 0 || nbPorteesN > 20) {
      errors.nbPortees = 'Entre 0 et 20';
    }
  }

  // Dernière NV — optionnel, entier 0..25
  let derniereNVN: number | null = null;
  if (String(draft.derniereNV ?? '').trim() !== '') {
    derniereNVN = parseIntStrict(draft.derniereNV);
    if (derniereNVN === null) {
      errors.derniereNV = 'Dernière NV entier requis';
    } else if (derniereNVN < 0 || derniereNVN > 25) {
      errors.derniereNV = 'Entre 0 et 25';
    }
  }

  // Date MB prévue — format yyyy-MM-dd (input date natif), ou vide
  if (dateIso !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    errors.dateMBPrevue = 'Date invalide (format yyyy-MM-dd)';
  }

  // Date de naissance — format yyyy-MM-dd ou vide
  if (dateNaissanceIso !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(dateNaissanceIso)) {
    errors.dateNaissance = 'Date invalide (format yyyy-MM-dd)';
  }
  if (origine.length > 50) errors.origine = 'Origine trop longue (max 50)';
  if (loge.length > 30) errors.loge = 'Loge trop longue (max 30)';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // ── Construction du patch (diff vs initial) ────────────────────────────
  const patch: TruieEditPatch = {};
  const ration = Math.round(rationN * 10) / 10;

  const setIfChanged = (
    key: string,
    value: string | number,
    prev: string | number,
  ): void => {
    if (String(value) !== String(prev)) {
      patch[key] = value;
    }
  };

  if (initial) {
    // CODE_ID seulement si fourni (sinon legacy fixture sans code)
    if (codeId !== '' && codeId !== initialCodeId) {
      patch['CODE_ID'] = codeId;
    }
    setIfChanged('NOM', nom, initial.nom);
    setIfChanged('BOUCLE', boucle, initial.boucle);
    setIfChanged('RACE', race, initial.race);
    const poidsValue = poidsN === null ? '' : String(poidsN);
    if (poidsValue !== initial.poids) {
      patch['POIDS'] = poidsN === null ? '' : poidsN;
    }
    setIfChanged('STADE', stade, initial.stade);
    setIfChanged('STATUT', statut, initial.statut);
    setIfChanged('RATION KG/J', ration, initial.ration);
    const nbPorteesValue = nbPorteesN === null ? '' : String(nbPorteesN);
    if (nbPorteesValue !== initial.nbPortees) {
      patch['NB_PORTEES'] = nbPorteesN === null ? '' : nbPorteesN;
    }
    const derniereNVValue = derniereNVN === null ? '' : String(derniereNVN);
    if (derniereNVValue !== initial.derniereNV) {
      patch['DERNIERE_NV'] = derniereNVN === null ? '' : derniereNVN;
    }
    if (dateIso !== initial.dateMBPrevue) {
      patch['DATE_MB_PREVUE'] = isoDateToFr(dateIso);
    }
    if (dateNaissanceIso !== initial.dateNaissance) {
      patch['DATE_NAISSANCE'] = dateNaissanceIso;
    }
    setIfChanged('ORIGINE', origine, initial.origine);
    setIfChanged('LOGE', loge, initial.loge);
    setIfChanged('NOTES', notes, initial.notes);
  } else {
    // Pas de snapshot → on inclut tous les champs
    if (codeId !== '') patch['CODE_ID'] = codeId;
    patch['NOM'] = nom;
    patch['BOUCLE'] = boucle;
    patch['RACE'] = race;
    patch['POIDS'] = poidsN === null ? '' : poidsN;
    patch['STADE'] = stade;
    patch['STATUT'] = statut;
    patch['RATION KG/J'] = ration;
    patch['NB_PORTEES'] = nbPorteesN === null ? '' : nbPorteesN;
    patch['DERNIERE_NV'] = derniereNVN === null ? '' : derniereNVN;
    patch['DATE_MB_PREVUE'] = isoDateToFr(dateIso);
    patch['DATE_NAISSANCE'] = dateNaissanceIso;
    patch['ORIGINE'] = origine;
    patch['LOGE'] = loge;
    patch['NOTES'] = notes;
  }

  return { ok: true, errors: {}, patch };
}
