import { Truie, Verrat, BandePorcelets, TraitementSante, StockAliment, StockVeto, AlerteServeur, Saillie } from '../types/farm';
import type { Note, NoteAnimalType } from '../types';
import { logger } from '../services/logger';

/**
 * Utility to find a column index in a header array, case-insensitive and variant-safe.
 * Les accents (É À È Ô) passent tels quels après `.toUpperCase()` ; pour matcher
 * une colonne accentuée, fournir la variante UPPERCASE accentuée ET une version
 * sans accent en fallback.
 */
const findIdx = (header: string[], ...variants: string[]) => {
  const upperHeader = header.map(h => String(h).toUpperCase());
  for (const variant of variants) {
    const v = variant.toUpperCase();
    const idx = upperHeader.indexOf(v);
    if (idx !== -1) return idx;
    const partialIdx = upperHeader.findIndex(h => h.includes(v));
    if (partialIdx !== -1) return partialIdx;
  }
  return -1;
};

/**
 * Parses a date from Google Sheets (can be a serial number, a string or an ISO date).
 */
export const parseSheetDate = (val: any): string => {
  if (!val || val === '—' || val === '') return '';
  const s = String(val);

  // Format ISO
  if (s.match(/^\d{4}-\d{2}-\d{2}T/)) {
    try { return new Date(s).toLocaleDateString('fr-FR'); } catch { return s; }
  }

  // Format DD/MM/YYYY or YYYY-MM-DD
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    return s;
  }

  // Serial number (Excel/Sheets)
  const n = parseFloat(s);
  if (!isNaN(n) && n > 20000 && n < 60000) {
    const date = new Date((n - 25569) * 86400 * 1000);
    return date.toLocaleDateString('fr-FR');
  }

  return s;
};

const readStr = (row: any[], idx: number): string =>
  idx !== -1 ? String(row[idx] ?? '') : '';

const readOptStr = (row: any[], idx: number): string | undefined => {
  if (idx === -1) return undefined;
  const v = row[idx];
  if (v === undefined || v === null || v === '') return undefined;
  return String(v);
};

const readNum = (row: any[], idx: number): number => {
  if (idx === -1) return 0;
  const n = parseFloat(String(row[idx] ?? '0'));
  return isNaN(n) ? 0 : n;
};

const readOptInt = (row: any[], idx: number): number | undefined => {
  if (idx === -1) return undefined;
  const v = row[idx];
  if (v === undefined || v === null || v === '') return undefined;
  const n = parseInt(String(v));
  return isNaN(n) ? undefined : n;
};

const readOptFloat = (row: any[], idx: number): number | undefined => {
  if (idx === -1) return undefined;
  const v = row[idx];
  if (v === undefined || v === null || v === '') return undefined;
  const n = parseFloat(String(v));
  return isNaN(n) ? undefined : n;
};

// ─── TRUIE ───────────────────────────────────────────────────────────────────
export const mapTruie = (header: string[], row: any[]): Truie => {
  const idIdx = findIdx(header, 'ID', 'ID_TRUIE');
  const bIdx = findIdx(header, 'BOUCLE');
  const nIdx = findIdx(header, 'NOM');
  const sIdx = findIdx(header, 'STATUT', 'ETAT');
  const stIdx = findIdx(header, 'STADE');
  const nbIdx = findIdx(header, 'NB PORTÉES', 'NB PORTEES', 'NB_PORTEES', 'PORTÉES', 'PORTEES');
  const nvIdx = findIdx(
    header,
    'DERNIÈRE PORTÉE NV',
    'DERNIERE PORTEE NV',
    'DERNIERE_NV',
    'DERNIÈRE NV',
    'DERNIERE NV',
    'MOY_NV',
    'NV_MOYEN',
  );
  const dpIdx = findIdx(
    header,
    'DATE MB PRÉVUE',
    'DATE MB PREVUE',
    'DATE_MB_PREVUE',
    'PROCHAINE MB',
    'PROCHAINE_MB',
  );
  const raIdx = findIdx(header, 'RATION KG/J', 'RATION');
  const noIdx = findIdx(header, 'NOTES');

  const rawId = readStr(row, idIdx);
  return {
    id: rawId,
    displayId: rawId.toUpperCase().startsWith('T') ? rawId : `T${rawId}`,
    boucle: readStr(row, bIdx),
    nom: readOptStr(row, nIdx),
    statut: readStr(row, sIdx) || 'En attente saillie',
    stade: readOptStr(row, stIdx),
    ration: readNum(row, raIdx),
    nbPortees: readOptInt(row, nbIdx),
    derniereNV: readOptFloat(row, nvIdx),
    dateMBPrevue: dpIdx !== -1 ? parseSheetDate(row[dpIdx]) : undefined,
    notes: readOptStr(row, noIdx),
    synced: true,
    raw: row,
  };
};

// ─── VERRAT ──────────────────────────────────────────────────────────────────
export const mapVerrat = (header: string[], row: any[]): Verrat => {
  const idIdx = findIdx(header, 'ID', 'ID_VERRAT');
  const bIdx = findIdx(header, 'BOUCLE');
  const nIdx = findIdx(header, 'NOM');
  const sIdx = findIdx(header, 'STATUT', 'ETAT');
  const oIdx = findIdx(header, 'ORIGINE');
  const aIdx = findIdx(header, 'ALIMENTATION');
  const raIdx = findIdx(header, 'RATION KG/J', 'RATION');
  const noIdx = findIdx(header, 'NOTES');

  const rawId = readStr(row, idIdx);
  return {
    id: rawId,
    displayId: rawId.toUpperCase().startsWith('V') ? rawId : `V${rawId}`,
    boucle: readStr(row, bIdx),
    nom: readOptStr(row, nIdx),
    statut: readStr(row, sIdx) || 'Actif',
    origine: readOptStr(row, oIdx),
    alimentation: readOptStr(row, aIdx),
    ration: readNum(row, raIdx),
    notes: readOptStr(row, noIdx),
    synced: true,
    raw: row,
  };
};

// ─── BANDE PORCELETS ─────────────────────────────────────────────────────────
/**
 * Retourne `null` pour les lignes RECAP (totaux) — le dispatcher filtre les nulls.
 */
export const mapBande = (header: string[], row: any[]): BandePorcelets | null => {
  const idIdx = findIdx(header, 'ID PORTÉE', 'ID PORTEE', 'ID_PORTEE', 'ID');
  const tIdx = findIdx(header, 'TRUIE');
  const bmIdx = findIdx(header, 'BOUCLE MÈRE', 'BOUCLE MERE', 'BOUCLE_MERE');
  const dmIdx = findIdx(header, 'DATE MB', 'DATE_MB');
  const nvIdx = findIdx(header, 'NV');
  const moIdx = findIdx(header, 'MORTS');
  const viIdx = findIdx(header, 'VIVANTS');
  const stIdx = findIdx(header, 'STATUT');
  const spIdx = findIdx(header, 'SEVRAGE PRÉVU', 'SEVRAGE PREVU', 'DATE SEVRAGE PRÉVUE', 'SEVRAGE_PREVUE');
  const srIdx = findIdx(header, 'SEVRAGE RÉEL', 'SEVRAGE REEL', 'DATE SEVRAGE RÉELLE', 'SEVRAGE_REELLE');
  const noIdx = findIdx(header, 'NOTES');

  const statut = readStr(row, stIdx);
  // Filtrer les lignes RECAP (ligne de total, pas une vraie bande)
  if (statut === 'RECAP') return null;

  const id = readStr(row, idIdx);
  return {
    id,
    idPortee: id,
    truie: readOptStr(row, tIdx),
    boucleMere: readOptStr(row, bmIdx),
    dateMB: dmIdx !== -1 ? parseSheetDate(row[dmIdx]) : undefined,
    nv: readOptInt(row, nvIdx),
    morts: readOptInt(row, moIdx),
    vivants: readOptInt(row, viIdx),
    statut,
    dateSevragePrevue: spIdx !== -1 ? parseSheetDate(row[spIdx]) : undefined,
    dateSevrageReelle: srIdx !== -1 ? parseSheetDate(row[srIdx]) : undefined,
    notes: readOptStr(row, noIdx),
    synced: true,
    raw: row,
  };
};

// ─── JOURNAL SANTÉ ───────────────────────────────────────────────────────────
export const mapSante = (header: string[], row: any[]): TraitementSante => {
  const dIdx = findIdx(header, 'DATE');
  const tIdx = findIdx(header, 'CIBLE_TYPE', 'SUJET_TYPE', 'TYPE');
  const iIdx = findIdx(header, 'CIBLE_ID', 'SUJET_ID', 'ID', 'BOUCLE');
  const tsIdx = findIdx(header, 'TYPE_SOIN', 'TYPE');
  const trIdx = findIdx(header, 'TRAITEMENT', 'SOIN', 'PRODUIT');
  const oIdx = findIdx(header, 'OBSERVATION', 'NOTE', 'NOTES');
  const aIdx = findIdx(header, 'AUTEUR', 'USER');

  return {
    id: `health-${parseSheetDate(row[dIdx])}-${row[iIdx]}-${Math.random().toString(36).substr(2, 4)}`,
    date: parseSheetDate(row[dIdx]),
    cibleType: String(row[tIdx] || '').toUpperCase() as TraitementSante['cibleType'],
    cibleId: readStr(row, iIdx),
    typeSoin: readStr(row, tsIdx),
    traitement: readStr(row, trIdx),
    observation: readStr(row, oIdx),
    auteur: readOptStr(row, aIdx),
    synced: true,
  };
};

// ─── STOCK ALIMENTS ──────────────────────────────────────────────────────────
export const mapStockAliment = (header: string[], row: any[]): StockAliment => {
  const idIdx = findIdx(header, 'ID');
  const lIdx = findIdx(header, 'LIBELLÉ', 'LIBELLE', 'NOM', 'ALIMENT');
  const qIdx = findIdx(header, 'STOCK ACTUEL', 'STOCK_ACTUEL', 'QUANTITE');
  const uIdx = findIdx(header, 'UNITÉ', 'UNITE');
  const aIdx = findIdx(header, 'SEUIL ALERTE', 'SEUIL_ALERTE', 'ALERTE');
  const sIdx = findIdx(header, 'STATUT');
  const noIdx = findIdx(header, 'NOTES');

  const rawStatut = readStr(row, sIdx).trim();
  return {
    id: readStr(row, idIdx),
    libelle: readStr(row, lIdx),
    stockActuel: readNum(row, qIdx),
    unite: readStr(row, uIdx) || 'kg',
    seuilAlerte: readNum(row, aIdx),
    statutStock: rawStatut || 'OK',
    notes: readOptStr(row, noIdx),
  };
};

// ─── STOCK VETO ──────────────────────────────────────────────────────────────
export const mapStockVeto = (header: string[], row: any[]): StockVeto => {
  const idIdx = findIdx(header, 'ID');
  const pIdx = findIdx(header, 'PRODUIT', 'NOM');
  const tIdx = findIdx(header, 'TYPE');
  const usIdx = findIdx(header, 'USAGE');
  const qIdx = findIdx(header, 'STOCK ACTUEL', 'STOCK');
  const uIdx = findIdx(header, 'UNITÉ', 'UNITE');
  const smIdx = findIdx(header, 'STOCK MIN', 'STOCK_MIN');
  const aIdx = findIdx(header, 'SEUIL ALERTE', 'SEUIL_ALERTE', 'ALERTE');
  const sIdx = findIdx(header, 'STATUT');
  const noIdx = findIdx(header, 'NOTES');

  const rawStatut = readStr(row, sIdx).trim();
  return {
    id: readStr(row, idIdx),
    produit: readStr(row, pIdx),
    type: readOptStr(row, tIdx),
    usage: readOptStr(row, usIdx),
    stockActuel: readNum(row, qIdx),
    unite: readStr(row, uIdx) || 'ml',
    stockMin: readOptFloat(row, smIdx),
    seuilAlerte: readNum(row, aIdx),
    statutStock: rawStatut || 'OK',
    notes: readOptStr(row, noIdx),
  };
};

// ─── SAILLIES (feuille SUIVI_REPRODUCTION_ACTUEL) ────────────────────────────
/**
 * Mappe une ligne de la feuille `SUIVI_REPRODUCTION_ACTUEL` vers `Saillie`.
 *
 * Colonnes attendues :
 *   ID Truie | Boucle | Nom | Date saillie | Verrat | Date MB prevue | Statut | Notes
 */
export const mapSaillie = (header: string[], row: any[]): Saillie => {
  const tIdx = findIdx(header, 'ID TRUIE', 'ID_TRUIE', 'TRUIE');
  const bIdx = findIdx(header, 'BOUCLE');
  const nIdx = findIdx(header, 'NOM');
  const dsIdx = findIdx(header, 'DATE SAILLIE', 'DATE_SAILLIE');
  const vIdx = findIdx(header, 'VERRAT');
  const dmIdx = findIdx(header, 'DATE MB PRÉVUE', 'DATE MB PREVUE', 'DATE_MB_PREVUE');
  const sIdx = findIdx(header, 'STATUT');
  const noIdx = findIdx(header, 'NOTES');

  return {
    truieId: readStr(row, tIdx),
    truieBoucle: readOptStr(row, bIdx),
    truieNom: readOptStr(row, nIdx),
    dateSaillie: dsIdx !== -1 ? parseSheetDate(row[dsIdx]) : '',
    verratId: readStr(row, vIdx),
    dateMBPrevue: dmIdx !== -1 ? parseSheetDate(row[dmIdx]) : undefined,
    statut: readOptStr(row, sIdx),
    notes: readOptStr(row, noIdx),
    raw: row,
  };
};

// ─── ALERTES SERVEUR (feuille ALERTES_ACTIVES) ───────────────────────────────
/**
 * Mappe une ligne de la feuille `ALERTES_ACTIVES` (backend Sheets) vers
 * `AlerteServeur`. Distinct du moteur d'alertes local (`alertEngine`).
 *
 * Schéma : Priorité · Catégorie · Sujet · Alerte · Action requise · Date.
 */
export const mapAlerteServeur = (header: string[], row: any[]): AlerteServeur => {
  const prIdx = findIdx(header, 'PRIORITÉ', 'PRIORITE', 'PRIO');
  const caIdx = findIdx(header, 'CATÉGORIE', 'CATEGORIE', 'CAT');
  const suIdx = findIdx(header, 'SUJET');
  const deIdx = findIdx(header, 'ALERTE', 'DESCRIPTION');
  const acIdx = findIdx(header, 'ACTION REQUISE', 'ACTION_REQUISE', 'ACTION');
  const daIdx = findIdx(header, 'DATE');

  const rawPri = readStr(row, prIdx).toUpperCase().trim();
  const priorite: AlerteServeur['priorite'] =
    rawPri === 'CRITIQUE' || rawPri === 'HAUTE' || rawPri === 'NORMALE' || rawPri === 'INFO'
      ? rawPri
      : 'NORMALE';

  return {
    priorite,
    categorie: readStr(row, caIdx).toUpperCase().trim() || 'BANDES',
    sujet: readStr(row, suIdx),
    description: readStr(row, deIdx),
    actionRequise: readStr(row, acIdx),
    date: daIdx !== -1 ? parseSheetDate(row[daIdx]) : '',
  };
};

// ─── NOTES TERRAIN ───────────────────────────────────────────────────────────
/**
 * Schéma canonique NOTES_TERRAIN (5 colonnes) :
 *   [0]=DATE · [1]=TYPE_ANIMAL · [2]=ID_ANIMAL · [3]=NOTE · [4]=AUTEUR
 *
 * Types acceptés : TRUIE · VERRAT · BANDE · CONTROLE · CHECKLIST · GENERAL.
 *
 * Tolérance legacy :
 *  - row.length > 5   → rangs au-delà de 5 ignorés (ancien format 11-cols avec
 *    NOTE_ID/TIMESTAMP/PORCHER/…). Best-effort : extraire DATE/TYPE/ID/NOTE/AUTEUR
 *    des positions canoniques 0..4 si elles semblent valides.
 *  - type inconnu     → `GENERAL` + log warn.
 *  - row vide / sans DATE ni TYPE → retourne `null` (ligne illisible).
 */
const VALID_NOTE_TYPES = new Set<NoteAnimalType>([
  'TRUIE', 'VERRAT', 'BANDE', 'CONTROLE', 'CHECKLIST', 'GENERAL',
]);

export const mapRowToNote = (row: unknown[], idx: number): Note | null => {
  if (!Array.isArray(row) || row.length === 0) {
    logger.warn('NOTES', 'row vide ignorée', { idx });
    return null;
  }

  // Legacy 11-cols : [NOTE_ID, ISO, DATE_FR, TIME, PORCHER, TYPE, QUESTION, ANSWER, DETAILS, SOURCE, DEVICE]
  // On détecte grossièrement : row[0] commence par 'NOTE-' + row.length >= 11
  const looksLegacy11 =
    row.length >= 11 &&
    typeof row[0] === 'string' &&
    /^NOTE-/i.test(String(row[0]));

  if (looksLegacy11) {
    logger.warn('NOTES', 'legacy 11-col row détectée — reconstruction best-effort', { idx });
    const date = String(row[1] ?? row[2] ?? '');
    const rawType = String(row[5] ?? 'GENERAL').toUpperCase();
    const normalizedType: NoteAnimalType =
      rawType === 'CONTROLE_QUOTIDIEN' ? 'CONTROLE'
      : (VALID_NOTE_TYPES.has(rawType as NoteAnimalType) ? (rawType as NoteAnimalType) : 'GENERAL');
    const animalId = String(row[6] ?? '');
    const answer = String(row[7] ?? '');
    const details = String(row[8] ?? '');
    const auteur = String(row[4] ?? '') || undefined;
    return {
      id: `note-legacy-${String(row[0]) || idx}`,
      animalId,
      animalType: normalizedType,
      date,
      texte: details ? `Réponse: ${answer}\nDétails: ${details}` : answer,
      auteur,
      synced: true,
    };
  }

  const date = String(row[0] ?? '').trim();
  const rawType = String(row[1] ?? '').toUpperCase().trim();

  if (!date && !rawType) {
    logger.warn('NOTES', 'row sans DATE ni TYPE ignorée', { idx });
    return null;
  }

  let animalType: NoteAnimalType;
  if (VALID_NOTE_TYPES.has(rawType as NoteAnimalType)) {
    animalType = rawType as NoteAnimalType;
  } else if (rawType === 'CHECKLIST_DONE' || rawType === 'POINT_HEBDO_AUTO' || rawType === 'CONTROLE_QUOTIDIEN') {
    // Legacy markers : on les mappe sur GENERAL / CONTROLE pour compat
    animalType = rawType === 'CONTROLE_QUOTIDIEN' ? 'CONTROLE' : 'GENERAL';
    logger.warn('NOTES', 'type legacy remappé', { idx, rawType, animalType });
  } else {
    animalType = 'GENERAL';
    if (rawType) logger.warn('NOTES', 'type inconnu → GENERAL', { idx, rawType });
  }

  const animalId = String(row[2] ?? '');
  const texte = String(row[3] ?? '');
  const auteurRaw = row[4];
  const auteur =
    auteurRaw !== undefined && auteurRaw !== null && String(auteurRaw) !== ''
      ? String(auteurRaw)
      : undefined;

  return {
    id: `note-${date || idx}-${animalId || '?'}-${idx}`,
    animalId,
    animalType,
    date,
    texte,
    auteur,
    synced: true,
  };
};

/** Alias historique — certains appelants utilisent `mapNote`. */
export const mapNote = mapRowToNote;

/**
 * Global dispatcher for mapping.
 */
export const mapTable = (key: string, header: string[], rows: any[][]): any[] => {
  switch (key.toUpperCase()) {
    case 'SUIVI_TRUIES_REPRODUCTION': return rows.map(r => mapTruie(header, r));
    case 'VERRATS': return rows.map(r => mapVerrat(header, r));
    case 'PORCELETS_BANDES_DETAIL': return rows
      .map(r => mapBande(header, r))
      .filter((b): b is BandePorcelets => b !== null);
    case 'JOURNAL_SANTE': return rows.map(r => mapSante(header, r));
    case 'STOCK_ALIMENTS': return rows.map(r => mapStockAliment(header, r));
    case 'STOCK_VETO': return rows.map(r => mapStockVeto(header, r));
    case 'ALERTES_ACTIVES': return rows.map(r => mapAlerteServeur(header, r));
    case 'SUIVI_REPRODUCTION_ACTUEL': return rows.map(r => mapSaillie(header, r));
    case 'NOTES_TERRAIN': return rows
      .map((r, idx) => mapRowToNote(r, idx))
      .filter((n): n is Note => n !== null);
    default: return rows;
  }
};
