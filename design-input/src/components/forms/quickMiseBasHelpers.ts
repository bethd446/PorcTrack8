import { safeDate } from '../../lib/truieHelpers';
import type { BandePorcelets } from '../../types/farm';

export interface MiseBasDraft {
  truieId: string;
  idPortee: string;
  dateIso: string;
  heure: string;
  nesVivants: string;
  mortsNes: string;
  nesTotaux: string;
  poidsMoyen: string;
  notes: string;
  /** Sex ratio à la naissance (optionnel, V21). 0–25 chacun. */
  nbMales?: string;
  nbFemelles?: string;
}

export interface MiseBasValidationErrors {
  truieId?: string;
  idPortee?: string;
  /** Date ISO MB (RT4 — Fail-Fast date présent/passée). */
  dateIso?: string;
  nesVivants?: string;
  mortsNes?: string;
  nesTotaux?: string;
  poidsMoyen?: string;
  notes?: string;
  coherence?: string;
  nbMales?: string;
  nbFemelles?: string;
  sexRatio?: string;
}

export interface MiseBasValidation {
  ok: boolean;
  errors: MiseBasValidationErrors;
  normalized?: {
    nesVivants: number;
    mortsNes: number;
    nesTotaux: number;
    poidsMoyen?: number;
    dateMbSheets: string;
    dateSevragePrevue: string;
    nbMales?: number;
    nbFemelles?: number;
  };
}

/**
 * Valide le sex ratio mâles/femelles à la naissance (V21).
 * Retourne null si valide, sinon un message d'erreur.
 *
 * Règles :
 *  - chaque champ est optionnel (null/undefined → pas de saisie)
 *  - chaque champ doit être un entier entre 0 et 25 si renseigné
 *  - males + femelles ≤ nv (tolérance autorisée si la somme < nv : on accepte
 *    car certains cas réels saisissent partiellement)
 */
export function validateSexRatio(
  males: number | null | undefined,
  femelles: number | null | undefined,
  nv: number,
): string | null {
  const hasMales = males !== null && males !== undefined;
  const hasFemelles = femelles !== null && femelles !== undefined;

  if (hasMales) {
    if (!Number.isFinite(males as number) || (males as number) < 0 || (males as number) > MISE_BAS_BOUNDS.maxNes) {
      return `Mâles : 0 à ${MISE_BAS_BOUNDS.maxNes}`;
    }
  }
  if (hasFemelles) {
    if (!Number.isFinite(femelles as number) || (femelles as number) < 0 || (femelles as number) > MISE_BAS_BOUNDS.maxNes) {
      return `Femelles : 0 à ${MISE_BAS_BOUNDS.maxNes}`;
    }
  }

  const m = hasMales ? (males as number) : 0;
  const f = hasFemelles ? (femelles as number) : 0;

  if ((hasMales || hasFemelles) && m + f > nv) {
    return `Mâles + femelles (${m + f}) > nés vivants (${nv})`;
  }

  return null;
}

export const MISE_BAS_BOUNDS = {
  minNes: 0,
  maxNes: 25,
  maxNesTotaux: 50,
  minPoids: 0.5,
  maxPoids: 3.0,
  maxNotes: 200,
  sevrageJours: 28,
} as const;

export function extractTruieNumber(truieId: string): number {
  const m = String(truieId ?? '').match(/(\d+)/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : 0;
}

export function suggestIdPortee(
  truieId: string,
  bandes: ReadonlyArray<Pick<BandePorcelets, 'id' | 'idPortee' | 'truie'>>,
  when: Date = new Date(),
): string {
  const n = extractTruieNumber(truieId);
  if (!n) return '';
  const yy = String(when.getFullYear()).slice(-2);
  const prefix = `${yy}-T${n}-`;
  let maxSeq = 0;
  for (const b of bandes) {
    const candidate = b.idPortee || b.id || '';
    if (!candidate.startsWith(prefix)) continue;
    const tail = candidate.slice(prefix.length);
    const m = tail.match(/^(\d+)/);
    if (!m) continue;
    const s = parseInt(m[1], 10);
    if (Number.isFinite(s) && s > maxSeq) maxSeq = s;
  }
  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(2, '0')}`;
}

export function isoToSheetsDate(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function addDaysToSheetsDate(ddmmyyyy: string, days: number): string {
  const m = ddmmyyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  const d = safeDate(`${m[3]}-${m[2]}-${m[1]}`);
  if (!d) return '';
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function parseInteger(raw: string): number | null {
  const s = String(raw ?? '').trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatFr(raw: string): number | null {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function validateMiseBas(draft: MiseBasDraft): MiseBasValidation {
  const errors: MiseBasValidationErrors = {};

  const truieId = String(draft.truieId ?? '').trim();
  if (!truieId) errors.truieId = 'Truie mère requise';

  const idPortee = String(draft.idPortee ?? '').trim();
  if (!idPortee) errors.idPortee = 'ID portée requis';

  const nv = parseInteger(draft.nesVivants);
  if (nv === null) {
    errors.nesVivants = 'Nés vivants requis';
  } else if (nv < MISE_BAS_BOUNDS.minNes || nv > MISE_BAS_BOUNDS.maxNes) {
    errors.nesVivants = `0 à ${MISE_BAS_BOUNDS.maxNes}`;
  }

  const mn = parseInteger(draft.mortsNes);
  if (mn === null) {
    errors.mortsNes = 'Morts-nés requis (0 si aucun)';
  } else if (mn < MISE_BAS_BOUNDS.minNes || mn > MISE_BAS_BOUNDS.maxNes) {
    errors.mortsNes = `0 à ${MISE_BAS_BOUNDS.maxNes}`;
  }

  const nt = parseInteger(draft.nesTotaux);
  if (nt === null) {
    errors.nesTotaux = 'Nés totaux requis';
  } else if (nt < 0 || nt > MISE_BAS_BOUNDS.maxNesTotaux) {
    errors.nesTotaux = `0 à ${MISE_BAS_BOUNDS.maxNesTotaux}`;
  }

  if (nv !== null && mn !== null && nt !== null && nv + mn !== nt) {
    errors.coherence = `Incohérence : ${nv} vivants + ${mn} morts-nés ≠ ${nt} totaux`;
  }

  // V81 Sprint 7 — Bloquer la bande fantôme : 0 vivant + 0 mort-né = bug de
  // saisie (probablement double-clic ou form vide). Un éleveur qui valide
  // sans remplir crée un batch sans porcelets → KPIs faussés + UI confuse.
  if (nv === 0 && mn === 0 && nt === 0) {
    errors.coherence = 'Aucun porcelet : renseigne au moins 1 NV ou 1 mort-né';
  }

  let poidsMoyenNum: number | undefined;
  const poidsRaw = String(draft.poidsMoyen ?? '').trim();
  if (poidsRaw !== '') {
    const p = parseFloatFr(draft.poidsMoyen);
    if (p === null) {
      errors.poidsMoyen = 'Poids invalide';
    } else if (p < MISE_BAS_BOUNDS.minPoids || p > MISE_BAS_BOUNDS.maxPoids) {
      errors.poidsMoyen = `${MISE_BAS_BOUNDS.minPoids} à ${MISE_BAS_BOUNDS.maxPoids} kg`;
    } else {
      poidsMoyenNum = p;
    }
  }

  if ((draft.notes ?? '').length > MISE_BAS_BOUNDS.maxNotes) {
    errors.notes = `Max ${MISE_BAS_BOUNDS.maxNotes} caractères`;
  }

  // Sex ratio (optionnel)
  const malesRaw = draft.nbMales !== undefined ? String(draft.nbMales).trim() : '';
  const femellesRaw = draft.nbFemelles !== undefined ? String(draft.nbFemelles).trim() : '';
  let nbMalesNum: number | undefined;
  let nbFemellesNum: number | undefined;
  if (malesRaw !== '') {
    const v = parseInteger(malesRaw);
    if (v === null) errors.nbMales = `0 à ${MISE_BAS_BOUNDS.maxNes}`;
    else nbMalesNum = v;
  }
  if (femellesRaw !== '') {
    const v = parseInteger(femellesRaw);
    if (v === null) errors.nbFemelles = `0 à ${MISE_BAS_BOUNDS.maxNes}`;
    else nbFemellesNum = v;
  }
  if (!errors.nbMales && !errors.nbFemelles && nv !== null) {
    const sexErr = validateSexRatio(
      nbMalesNum ?? null,
      nbFemellesNum ?? null,
      nv,
    );
    if (sexErr) errors.sexRatio = sexErr;
  }

  const dateMbSheets = isoToSheetsDate(draft.dateIso);
  if (!dateMbSheets) {
    errors.idPortee = errors.idPortee ?? '';
    return { ok: false, errors: { ...errors, idPortee: errors.idPortee || 'Date MB invalide' } };
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const dateSevragePrevue = addDaysToSheetsDate(dateMbSheets, MISE_BAS_BOUNDS.sevrageJours);

  return {
    ok: true,
    errors: {},
    normalized: {
      nesVivants: nv as number,
      mortsNes: mn as number,
      nesTotaux: nt as number,
      poidsMoyen: poidsMoyenNum,
      dateMbSheets,
      dateSevragePrevue,
      nbMales: nbMalesNum,
      nbFemelles: nbFemellesNum,
    },
  };
}

function sheetsDateToIso(ddmmyyyy: string): string {
  const m = ddmmyyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return ddmmyyyy;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export interface MiseBasBatchValues {
  code_id: string;
  sow_code: string;
  boucle_mere: string;
  /** Code verrat (ex: V01) — null si saillie source introuvable. */
  boar_code: string | null;
  date_mise_bas: string;
  porcelets_nes_total: number;
  nb_mort_nes: number;
  porcelets_nes_vivants: number;
  /** Répartition mâles/femelles à la naissance (V21, optionnel). */
  nb_males_naissance: number | null;
  nb_femelles_naissance: number | null;
  date_sevrage_prevue: string;
  statut: 'Sous mère';
  phase: 'MATERNITE';
  notes: string;
}

export function buildMiseBasRow(params: {
  idPortee: string;
  truieId: string;
  boucleMere: string;
  boarCode?: string | null;
  dateMbSheets: string;
  nv: number;
  mortsNes: number;
  vivants: number;
  dateSevragePrevue: string;
  notes: string;
  poidsMoyen?: number;
  nbMales?: number;
  nbFemelles?: number;
}): MiseBasBatchValues {
  const noteParts: string[] = [];
  if (params.poidsMoyen !== undefined) {
    noteParts.push(`Poids moyen ${params.poidsMoyen.toFixed(2)} kg`);
  }
  if (params.notes.trim()) noteParts.push(params.notes.trim());
  const notes = noteParts.join(' · ');

  return {
    code_id: params.idPortee,
    sow_code: params.truieId,
    boucle_mere: params.boucleMere,
    boar_code: params.boarCode ?? null,
    date_mise_bas: sheetsDateToIso(params.dateMbSheets),
    porcelets_nes_total: params.nv,
    nb_mort_nes: params.mortsNes,
    porcelets_nes_vivants: params.vivants,
    nb_males_naissance: params.nbMales ?? null,
    nb_femelles_naissance: params.nbFemelles ?? null,
    date_sevrage_prevue: sheetsDateToIso(params.dateSevragePrevue),
    statut: 'Sous mère',
    phase: 'MATERNITE',
    notes,
  };
}

export async function submitMiseBas(
  validated: NonNullable<MiseBasValidation['normalized']>,
  params: {
    idPortee: string;
    truieId: string;
    boucleMere: string;
    /** Verrat père pré-résolu (depuis findLastSaillieForTruie). */
    boarCode?: string | null;
    notes: string;
  },
  deps: {
    insertBatch: (values: MiseBasBatchValues) => Promise<unknown>;
    updateSowByCode: (
      codeId: string,
      fields: { statut: string },
    ) => Promise<unknown>;
    isOnline: () => boolean;
  },
): Promise<{
  online: boolean;
  idPortee: string;
  boarCode: string | null;
}> {
  const vivants = Math.max(0, validated.nesTotaux - validated.mortsNes);
  const boarCode = params.boarCode ?? null;

  const row = buildMiseBasRow({
    idPortee: params.idPortee,
    truieId: params.truieId,
    boucleMere: params.boucleMere,
    boarCode,
    dateMbSheets: validated.dateMbSheets,
    nv: validated.nesTotaux,
    mortsNes: validated.mortsNes,
    vivants,
    dateSevragePrevue: validated.dateSevragePrevue,
    notes: params.notes,
    poidsMoyen: validated.poidsMoyen,
    nbMales: validated.nbMales,
    nbFemelles: validated.nbFemelles,
  });

  await deps.insertBatch(row);
  await deps.updateSowByCode(params.truieId, { statut: 'Maternité' });

  return { online: deps.isOnline(), idPortee: params.idPortee, boarCode };
}

export function todayIsoLocal(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function nowHoursMinutes(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}
