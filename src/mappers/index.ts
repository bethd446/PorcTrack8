import { Truie, Verrat, BandePorcelets, TraitementSante, StockAliment, StockVeto } from '../types/farm';

/**
 * Utility to find a column index in a header array, case-insensitive and variant-safe.
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

export const mapTruie = (header: string[], row: any[]): Truie => {
  const idIdx = findIdx(header, 'ID', 'ID_TRUIE');
  const bIdx = findIdx(header, 'BOUCLE');
  const nIdx = findIdx(header, 'NOM');
  const rIdx = findIdx(header, 'RACE');
  const sIdx = findIdx(header, 'STATUT', 'ETAT');
  const raIdx = findIdx(header, 'RATION');
  const poIdx = findIdx(header, 'POIDS');
  const eIdx = findIdx(header, 'LOGE', 'EMPLACEMENT', 'ZONE');
  const stIdx = findIdx(header, 'STADE');
  const nbIdx = findIdx(header, 'NB_PORTEES', 'PORTÉES');
  const dmIdx = findIdx(header, 'DATE_DERNIERE_MB', 'DERNIERE_MB');
  const dpIdx = findIdx(header, 'DATE_MB_PREVUE', 'PROCHAINE_MB');
  const nvIdx = findIdx(header, 'NV_MOYEN', 'MOY_NV');

  const rawId = String(row[idIdx] || '');
  return {
    id: rawId,
    displayId: rawId.toUpperCase().startsWith('T') ? rawId : `T${rawId}`,
    boucle: String(row[bIdx] || ''),
    nom: nIdx !== -1 ? String(row[nIdx] || '') : undefined,
    race: rIdx !== -1 ? String(row[rIdx] || '') : undefined,
    statut: String(row[sIdx] || 'Actif'),
    ration: parseFloat(String(row[raIdx] || '0')) || 0,
    poids: poIdx !== -1 ? parseFloat(String(row[poIdx] || '0')) : undefined,
    emplacement: eIdx !== -1 ? String(row[eIdx] || '') : undefined,
    stade: stIdx !== -1 ? String(row[stIdx] || '') : undefined,
    nbPortees: nbIdx !== -1 ? parseInt(String(row[nbIdx] || '0')) : undefined,
    dateDerniereMB: dmIdx !== -1 ? parseSheetDate(row[dmIdx]) : undefined,
    dateMBPrevue: dpIdx !== -1 ? parseSheetDate(row[dpIdx]) : undefined,
    nvMoyen: nvIdx !== -1 ? parseFloat(String(row[nvIdx] || '0')) : undefined,
    synced: true,
    raw: row
  };
};

export const mapVerrat = (header: string[], row: any[]): Verrat => {
  const idIdx = findIdx(header, 'ID', 'ID_VERRAT');
  const bIdx = findIdx(header, 'BOUCLE');
  const nIdx = findIdx(header, 'NOM');
  const rIdx = findIdx(header, 'RACE');
  const sIdx = findIdx(header, 'STATUT', 'ETAT');
  const raIdx = findIdx(header, 'RATION');
  const poIdx = findIdx(header, 'POIDS');
  const dIdx = findIdx(header, 'DATE_NAISSANCE', 'NAISSANCE');

  const rawId = String(row[idIdx] || '');
  return {
    id: rawId,
    displayId: rawId.toUpperCase().startsWith('V') ? rawId : `V${rawId}`,
    boucle: String(row[bIdx] || ''),
    nom: nIdx !== -1 ? String(row[nIdx] || '') : undefined,
    race: rIdx !== -1 ? String(row[rIdx] || '') : undefined,
    statut: String(row[sIdx] || 'Actif'),
    ration: parseFloat(String(row[raIdx] || '0')) || 0,
    poids: poIdx !== -1 ? parseFloat(String(row[poIdx] || '0')) : undefined,
    dateNaissance: dIdx !== -1 ? parseSheetDate(row[dIdx]) : undefined,
    synced: true,
    raw: row
  };
};

export const mapBande = (header: string[], row: any[]): BandePorcelets => {
  const idIdx = findIdx(header, 'ID Portée', 'ID_PORTEE', 'ID');
  const tIdx = findIdx(header, 'TRUIE');
  const bmIdx = findIdx(header, 'BOUCLE MÈRE', 'BOUCLE_MERE');
  const dmIdx = findIdx(header, 'DATE MB', 'DATE_MB');
  const nvIdx = findIdx(header, 'NV');
  const moIdx = findIdx(header, 'MORTS');
  const viIdx = findIdx(header, 'VIVANTS');
  const stIdx = findIdx(header, 'STATUT');
  const spIdx = findIdx(header, 'DATE SEVRAGE PRÉVUE', 'SEVRAGE_PREVUE');
  const srIdx = findIdx(header, 'DATE SEVRAGE RÉELLE', 'SEVRAGE_REELLE');

  return {
    id: String(row[idIdx] || ''),
    idPortee: String(row[idIdx] || ''),
    truie: tIdx !== -1 ? String(row[tIdx] || '') : undefined,
    boucleMere: bmIdx !== -1 ? String(row[bmIdx] || '') : undefined,
    dateMB: dmIdx !== -1 ? parseSheetDate(row[dmIdx]) : undefined,
    nv: nvIdx !== -1 ? parseInt(String(row[nvIdx] || '0')) : undefined,
    morts: moIdx !== -1 ? parseInt(String(row[moIdx] || '0')) : undefined,
    vivants: viIdx !== -1 ? parseInt(String(row[viIdx] || '0')) : undefined,
    statut: String(row[stIdx] || ''),
    dateSevragePrevue: spIdx !== -1 ? parseSheetDate(row[spIdx]) : undefined,
    dateSevrageReelle: srIdx !== -1 ? parseSheetDate(row[srIdx]) : undefined,
    synced: true,
    raw: row
  };
};

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
    cibleType: String(row[tIdx] || '').toUpperCase() as any,
    cibleId: String(row[iIdx] || ''),
    typeSoin: String(row[tsIdx] || ''),
    traitement: String(row[trIdx] || ''),
    observation: String(row[oIdx] || ''),
    auteur: aIdx !== -1 ? String(row[aIdx] || '') : undefined,
    synced: true
  };
};

export const mapStockAliment = (header: string[], row: any[]): StockAliment => {
  const idIdx = findIdx(header, 'ID');
  const nIdx = findIdx(header, 'NOM', 'ALIMENT');
  const tIdx = findIdx(header, 'TYPE');
  const qIdx = findIdx(header, 'QUANTITE');
  const uIdx = findIdx(header, 'UNITE');
  const aIdx = findIdx(header, 'ALERTE');

  const qte = parseFloat(String(row[qIdx] || '0')) || 0;
  const alerte = parseFloat(String(row[aIdx] || '0')) || 0;

  return {
    id: String(row[idIdx] || ''),
    nom: String(row[nIdx] || ''),
    type: String(row[tIdx] || ''),
    quantite: qte,
    unite: String(row[uIdx] || 'kg'),
    alerte: alerte,
    statut: qte <= 0 ? 'RUPTURE' : qte < alerte ? 'BAS' : 'OK'
  };
};

export const mapStockVeto = (header: string[], row: any[]): StockVeto => {
  const idIdx = findIdx(header, 'ID');
  const nIdx = findIdx(header, 'NOM', 'PRODUIT');
  const qIdx = findIdx(header, 'QUANTITE');
  const uIdx = findIdx(header, 'UNITE');
  const dIdx = findIdx(header, 'DLC', 'PEREMPTION');
  const aIdx = findIdx(header, 'ALERTE');

  return {
    id: String(row[idIdx] || ''),
    nom: String(row[nIdx] || ''),
    quantite: parseFloat(String(row[qIdx] || '0')) || 0,
    unite: String(row[uIdx] || 'ml'),
    dlc: dIdx !== -1 ? parseSheetDate(row[dIdx]) : undefined,
    alerte: parseFloat(String(row[aIdx] || '0')) || 0
  };
};

/**
 * Global dispatcher for mapping.
 */
export const mapTable = (key: string, header: string[], rows: any[][]): any[] => {
  switch (key.toUpperCase()) {
    case 'SUIVI_TRUIES_REPRODUCTION': return rows.map(r => mapTruie(header, r));
    case 'VERRATS': return rows.map(r => mapVerrat(header, r));
    case 'PORCELETS_BANDES_DETAIL': return rows.map(r => mapBande(header, r));
    case 'JOURNAL_SANTE': return rows.map(r => mapSante(header, r));
    case 'STOCK_ALIMENTS': return rows.map(r => mapStockAliment(header, r));
    case 'STOCK_VETO': return rows.map(r => mapStockVeto(header, r));
    default: return rows;
  }
};
