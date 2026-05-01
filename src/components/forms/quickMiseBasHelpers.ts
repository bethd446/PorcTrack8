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
}

export interface MiseBasValidationErrors {
  truieId?: string;
  idPortee?: string;
  nesVivants?: string;
  mortsNes?: string;
  nesTotaux?: string;
  poidsMoyen?: string;
  notes?: string;
  coherence?: string;
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
  };
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
  date_mise_bas: string;
  porcelets_nes_total: number;
  nb_mort_nes: number;
  porcelets_nes_vivants: number;
  date_sevrage_prevue: string;
  statut: 'Sous mère';
  phase: 'maternite';
  notes: string;
}

export function buildMiseBasRow(params: {
  idPortee: string;
  truieId: string;
  boucleMere: string;
  dateMbSheets: string;
  nv: number;
  mortsNes: number;
  vivants: number;
  dateSevragePrevue: string;
  notes: string;
  poidsMoyen?: number;
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
    date_mise_bas: sheetsDateToIso(params.dateMbSheets),
    porcelets_nes_total: params.nv,
    nb_mort_nes: params.mortsNes,
    porcelets_nes_vivants: params.vivants,
    date_sevrage_prevue: sheetsDateToIso(params.dateSevragePrevue),
    statut: 'Sous mère',
    phase: 'maternite',
    notes,
  };
}

export async function submitMiseBas(
  validated: NonNullable<MiseBasValidation['normalized']>,
  params: {
    idPortee: string;
    truieId: string;
    boucleMere: string;
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
): Promise<{ online: boolean; idPortee: string }> {
  const vivants = Math.max(0, validated.nesTotaux - validated.mortsNes);

  const row = buildMiseBasRow({
    idPortee: params.idPortee,
    truieId: params.truieId,
    boucleMere: params.boucleMere,
    dateMbSheets: validated.dateMbSheets,
    nv: validated.nesTotaux,
    mortsNes: validated.mortsNes,
    vivants,
    dateSevragePrevue: validated.dateSevragePrevue,
    notes: params.notes,
    poidsMoyen: validated.poidsMoyen,
  });

  await deps.insertBatch(row);
  await deps.updateSowByCode(params.truieId, { statut: 'Maternité' });

  return { online: deps.isOnline(), idPortee: params.idPortee };
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
