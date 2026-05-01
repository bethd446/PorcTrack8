/**
 * tableLoader — pont entre les KEYs legacy (PORCELETS_BANDES_DETAIL, …) et les
 * lecteurs typés de supabaseService. Permet à TableView et autres écrans
 * génériques de charger une table par sa KEY sans connaître le mapping interne.
 *
 * Sortie unifiée : header[] + rows[][] pour rester compatible avec les
 * composants existants qui consomment encore un format tabulaire.
 */

import {
  getTruies,
  getVerrats,
  getBandes,
  getJournalSante,
  getStockAliments,
  getStockVeto,
  getNotesTerrain,
  getFinances,
  getSaillies,
} from './supabaseService';
import { getMeta, type TableMeta } from '../features/tables/tablesRegistry';
import type {
  Truie, Verrat, BandePorcelets, TraitementSante,
  StockAliment, StockVeto, FinanceEntry, Saillie,
} from '../types/farm';
import type { Note } from '../types';

export interface TableLoadResult {
  success: boolean;
  header: string[];
  rows: unknown[][];
  meta: TableMeta | null;
  message?: string;
}

function truieToRow(t: Truie, header: string[]): unknown[] {
  const map: Record<string, unknown> = {
    ID: t.displayId,
    BOUCLE: t.boucle,
    NOM: t.nom ?? '',
    STATUT: t.statut,
    STADE: t.stade ?? '',
    RATION: t.ration ?? 0,
    NB_PORTEES: t.nbPortees ?? 0,
    DERNIERE_NV: t.derniereNV ?? '',
    DATE_MB_PREVUE: t.dateMBPrevue ?? '',
    RACE: t.race ?? '',
    NOTES: t.notes ?? '',
  };
  return header.map(h => map[h] ?? '');
}

function verratToRow(v: Verrat, header: string[]): unknown[] {
  const map: Record<string, unknown> = {
    ID: v.displayId,
    BOUCLE: v.boucle,
    NOM: v.nom ?? '',
    STATUT: v.statut,
    ORIGINE: v.origine ?? '',
    ALIMENTATION: v.alimentation ?? '',
    RATION: v.ration ?? 0,
    NOTES: v.notes ?? '',
  };
  return header.map(h => map[h] ?? '');
}

function bandeToRow(b: BandePorcelets, header: string[]): unknown[] {
  const map: Record<string, unknown> = {
    'ID Portée': b.idPortee,
    ID_PORTEE: b.idPortee,
    TRUIE: b.truie ?? '',
    BOUCLE_MERE: b.boucleMere ?? '',
    'BOUCLE MÈRE': b.boucleMere ?? '',
    DATE_MB: b.dateMB ?? '',
    'DATE MB': b.dateMB ?? '',
    NV: b.nv ?? 0,
    MORTS: b.morts ?? 0,
    VIVANTS: b.vivants ?? 0,
    DATE_SEVRAGE_PREVUE: b.dateSevragePrevue ?? '',
    'DATE SEVRAGE PRÉVUE': b.dateSevragePrevue ?? '',
    DATE_SEVRAGE_REELLE: b.dateSevrageReelle ?? '',
    'DATE SEVRAGE RÉELLE': b.dateSevrageReelle ?? '',
    STATUT: b.statut,
    PHASE: '',
    NOTES: b.notes ?? '',
  };
  return header.map(h => map[h] ?? '');
}

function santeToRow(s: TraitementSante, header: string[]): unknown[] {
  const map: Record<string, unknown> = {
    ID: s.id,
    DATE: s.date,
    TYPE_ANIMAL: s.cibleType,
    CIBLE_ID: s.cibleId,
    TYPE_SOIN: s.typeSoin,
    TRAITEMENT: s.traitement,
    OBSERVATION: s.observation,
    AUTEUR: s.auteur ?? '',
  };
  return header.map(h => map[h] ?? '');
}

function alimentToRow(a: StockAliment, header: string[]): unknown[] {
  const map: Record<string, unknown> = {
    ID: a.id,
    LIBELLE: a.libelle,
    UNITE: a.unite,
    STOCK_ACTUEL: a.stockActuel,
    SEUIL_ALERTE: a.seuilAlerte,
    NOTES: a.notes ?? '',
  };
  return header.map(h => map[h] ?? '');
}

function vetoToRow(v: StockVeto, header: string[]): unknown[] {
  const map: Record<string, unknown> = {
    ID: v.id,
    LIBELLE: v.produit,
    TYPE: v.type ?? '',
    USAGE: v.usage ?? '',
    UNITE: v.unite,
    STOCK_ACTUEL: v.stockActuel,
    STOCK_MIN: v.stockMin ?? 0,
    DLC: '',
    NOTES: v.notes ?? '',
  };
  return header.map(h => map[h] ?? '');
}

function noteToRow(n: Note, header: string[]): unknown[] {
  const map: Record<string, unknown> = {
    DATE: n.date,
    CATEGORIE: n.animalType,
    TYPE_ANIMAL: n.animalType,
    NOTE: n.texte,
    ID_ANIMAL: n.animalId,
    ANIMAL: n.animalId,
    AUTEUR: n.auteur ?? '',
  };
  return header.map(h => map[h] ?? '');
}

function financeToRow(f: FinanceEntry, header: string[]): unknown[] {
  const map: Record<string, unknown> = {
    POSTE: f.libelle,
    MENSUEL_FCFA: f.montant,
    ANNUEL_FCFA: f.montant * 12,
    PCT_TOTAL: '',
    TYPE: f.type,
    NOTES: f.notes ?? '',
  };
  return header.map(h => map[h] ?? '');
}

function saillieToRow(s: Saillie, header: string[]): unknown[] {
  const map: Record<string, unknown> = {
    ID_TRUIE: s.truieId,
    BOUCLE: s.truieBoucle ?? '',
    NOM: s.truieNom ?? '',
    DATE_SAILLIE: s.dateSaillie,
    VERRAT: s.verratId,
    DATE_MB_PREVUE: s.dateMBPrevue ?? '',
    STATUT: s.statut ?? '',
    NOTES: s.notes ?? '',
  };
  return header.map(h => map[h] ?? '');
}

export async function getTableByKey(key: string): Promise<TableLoadResult> {
  const meta = getMeta(key);
  try {
    switch (key) {
      case 'SUIVI_TRUIES_REPRODUCTION': {
        const r = await getTruies();
        return {
          success: r.success,
          header: r.header,
          rows: r.data.map(t => truieToRow(t, r.header)),
          meta,
          message: r.error,
        };
      }
      case 'VERRATS': {
        const r = await getVerrats();
        return {
          success: r.success,
          header: r.header,
          rows: r.data.map(v => verratToRow(v, r.header)),
          meta,
          message: r.error,
        };
      }
      case 'PORCELETS_BANDES_DETAIL':
      case 'PORCELETS_BANDES': {
        const r = await getBandes();
        return {
          success: r.success,
          header: r.header,
          rows: r.data.map(b => bandeToRow(b, r.header)),
          meta,
          message: r.error,
        };
      }
      case 'JOURNAL_SANTE': {
        const r = await getJournalSante();
        return {
          success: r.success,
          header: r.header,
          rows: r.data.map(s => santeToRow(s, r.header)),
          meta,
          message: r.error,
        };
      }
      case 'STOCK_ALIMENTS': {
        const r = await getStockAliments();
        return {
          success: r.success,
          header: r.header,
          rows: r.data.map(a => alimentToRow(a, r.header)),
          meta,
          message: r.error,
        };
      }
      case 'STOCK_VETO': {
        const r = await getStockVeto();
        return {
          success: r.success,
          header: r.header,
          rows: r.data.map(v => vetoToRow(v, r.header)),
          meta,
          message: r.error,
        };
      }
      case 'NOTES_TERRAIN': {
        const r = await getNotesTerrain();
        return {
          success: r.success,
          header: r.header,
          rows: r.data.map(n => noteToRow(n, r.header)),
          meta,
          message: r.error,
        };
      }
      case 'FINANCES': {
        const r = await getFinances();
        return {
          success: r.success,
          header: r.header,
          rows: r.data.map(f => financeToRow(f, r.header)),
          meta,
          message: r.error,
        };
      }
      case 'SUIVI_REPRODUCTION_ACTUEL': {
        const r = await getSaillies();
        return {
          success: r.success,
          header: r.header,
          rows: r.data.map(s => saillieToRow(s, r.header)),
          meta,
          message: r.error,
        };
      }
      default:
        return {
          success: false,
          header: [],
          rows: [],
          meta,
          message: `Table "${key}" inconnue`,
        };
    }
  } catch (e) {
    return {
      success: false,
      header: [],
      rows: [],
      meta,
      message: String(e),
    };
  }
}
