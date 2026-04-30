/**
 * supabaseService — remplace googleSheets.ts pour toutes les lectures/écritures.
 *
 * Conventions d'imports :
 *  - Supabase client : './supabaseClient'       (même dossier services/)
 *  - Types métier    : '../types/farm'           (remonte vers src/types/)
 *  - Types généraux  : '../types'               (remonte vers src/types.ts)
 *
 * Interface publique identique à googleSheets.ts pour que farmDataLoader.ts
 * n'ait besoin que d'un swap d'import — zéro modification dans les 60+ UI.
 */

import { supabase } from './supabaseClient';
import type {
  Truie, Verrat, BandePorcelets, TraitementSante,
  StockAliment, StockVeto, Saillie, FinanceEntry, DataSource,
} from '../types/farm';
import type { Note } from '../types';

// ── Type de retour unifié (compatible avec l'ancienne interface GAS) ──────────
export interface SupabaseReadResult<T> {
  success: boolean;
  data: T[];
  header: string[];   // colonnes statiques (remplacement des headers Sheets)
  source: DataSource;
  error?: string;
}

// ── Helpers internes ──────────────────────────────────────────────────────────

function ok<T>(data: T[], header: string[]): SupabaseReadResult<T> {
  return { success: true, data, header, source: 'NETWORK' };
}

function fail<T>(error: string): SupabaseReadResult<T> {
  return { success: false, data: [], header: [], source: 'NETWORK', error };
}

// ── TRUIES (sows → Truie) ─────────────────────────────────────────────────────

const TRUIES_HEADER = ['ID', 'BOUCLE', 'NOM', 'STATUT', 'STADE', 'RATION',
  'NB_PORTEES', 'DERNIERE_NV', 'DATE_MB_PREVUE', 'RACE', 'NOTES'];

export async function getTruies(
  cb?: (data: Truie[], header: string[]) => void
): Promise<SupabaseReadResult<Truie>> {
  try {
    const { data, error } = await supabase
      .from('sows')
      .select('*')
      .order('code_id');

    if (error) return fail<Truie>(error.message);

    const mapped: Truie[] = (data ?? []).map(r => ({
      id:            r.id,
      displayId:     r.code_id,
      boucle:        r.boucle ?? '',
      nom:           r.name ?? undefined,
      statut:        r.statut ?? 'En attente saillie',
      stade:         r.statut_repro ?? undefined,
      ration:        r.ration_kg_j ?? 0,
      nbPortees:     r.nb_portees ?? 0,
      dateMBPrevue:  r.date_mb_prevue ?? undefined,
      notes:         r.notes ?? undefined,
      race:          r.breed ?? undefined,
      synced:        true,
    }));

    cb?.(mapped, TRUIES_HEADER);
    return ok(mapped, TRUIES_HEADER);
  } catch (e) {
    return fail<Truie>(String(e));
  }
}

// ── VERRATS (boars → Verrat) ──────────────────────────────────────────────────

const VERRATS_HEADER = ['ID', 'BOUCLE', 'NOM', 'STATUT', 'ORIGINE',
  'ALIMENTATION', 'RATION', 'NOTES'];

export async function getVerrats(
  cb?: (data: Verrat[], header: string[]) => void
): Promise<SupabaseReadResult<Verrat>> {
  try {
    const { data, error } = await supabase
      .from('boars')
      .select('*')
      .order('code_id');

    if (error) return fail<Verrat>(error.message);

    const mapped: Verrat[] = (data ?? []).map(r => ({
      id:           r.id,
      displayId:    r.code_id,
      boucle:       r.boucle ?? '',
      nom:          r.name ?? undefined,
      statut:       r.statut ?? 'Actif',
      origine:      r.origine ?? undefined,
      alimentation: r.alimentation ?? undefined,
      ration:       r.ration_kg_j ?? 0,
      notes:        r.notes ?? undefined,
      synced:       true,
    }));

    cb?.(mapped, VERRATS_HEADER);
    return ok(mapped, VERRATS_HEADER);
  } catch (e) {
    return fail<Verrat>(String(e));
  }
}

// ── BANDES/PORTÉES (batches → BandePorcelets) ─────────────────────────────────

const BANDES_HEADER = ['ID_PORTEE', 'TRUIE', 'BOUCLE_MERE', 'DATE_MB',
  'NV', 'MORTS', 'VIVANTS', 'DATE_SEVRAGE_PREVUE', 'DATE_SEVRAGE_REELLE',
  'STATUT', 'PHASE', 'NOTES'];

export async function getBandes(
  cb?: (data: BandePorcelets[], header: string[]) => void
): Promise<SupabaseReadResult<BandePorcelets>> {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select('*, sows(code_id, boucle)')
      .order('date_mise_bas', { ascending: false });

    if (error) return fail<BandePorcelets>(error.message);

    const mapped: BandePorcelets[] = (data ?? []).map(r => ({
      id:                  r.id,
      idPortee:            r.code_id,
      truie:               (r.sows as { code_id: string } | null)?.code_id ?? undefined,
      boucleMere:          (r.sows as { boucle: string } | null)?.boucle ?? undefined,
      dateMB:              r.date_mise_bas ?? undefined,
      nv:                  r.porcelets_nes_vivants ?? 0,
      morts:               r.nb_mort_nes ?? 0,
      vivants:             r.porcelets_nes_vivants != null && r.nb_mort_nes != null
                             ? r.porcelets_nes_vivants - r.nb_mort_nes
                             : r.porcelets_nes_vivants ?? 0,
      statut:              r.statut ?? 'Sous mère',
      dateSevragePrevue:   r.date_sevrage_prevue ?? undefined,
      dateSevrageReelle:   r.date_sevrage ?? undefined,
      notes:               r.notes ?? undefined,
      synced:              true,
    }));

    cb?.(mapped, BANDES_HEADER);
    return ok(mapped, BANDES_HEADER);
  } catch (e) {
    return fail<BandePorcelets>(String(e));
  }
}

// ── SAILLIES (saillies → Saillie) ─────────────────────────────────────────────

export async function getSaillies(
  cb?: (data: Saillie[], header: string[]) => void
): Promise<SupabaseReadResult<Saillie>> {
  try {
    const { data, error } = await supabase
      .from('saillies')
      .select('*, sows(code_id, boucle, name), boars(code_id)')
      .order('date_saillie', { ascending: false });

    if (error) return fail<Saillie>(error.message);

    const header = ['ID_TRUIE', 'BOUCLE', 'NOM', 'DATE_SAILLIE', 'VERRAT',
      'DATE_MB_PREVUE', 'STATUT', 'NOTES'];

    const mapped: Saillie[] = (data ?? []).map(r => ({
      truieId:      r.sows?.code_id ?? r.sow_id ?? '',
      truieBoucle:  r.sows?.boucle ?? undefined,
      truieNom:     r.sows?.name ?? undefined,
      dateSaillie:  r.date_saillie ?? '',
      verratId:     r.boars?.code_id ?? r.boar_id ?? '',
      dateMBPrevue: r.date_mb_prevue ?? undefined,
      statut:       r.statut ?? undefined,
      notes:        r.notes ?? undefined,
    }));

    cb?.(mapped, header);
    return ok(mapped, header);
  } catch (e) {
    return fail<Saillie>(String(e));
  }
}

// ── JOURNAL SANTÉ (health_logs → TraitementSante) ────────────────────────────

const SANTE_HEADER = ['ID', 'DATE', 'TYPE_ANIMAL', 'CIBLE_ID', 'TYPE_SOIN',
  'TRAITEMENT', 'OBSERVATION', 'AUTEUR'];

export async function getJournalSante(
  cb?: (data: TraitementSante[], header: string[]) => void
): Promise<SupabaseReadResult<TraitementSante>> {
  try {
    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .order('log_date', { ascending: false });

    if (error) return fail<TraitementSante>(error.message);

    const mapped: TraitementSante[] = (data ?? []).map(r => ({
      id:         r.id,
      date:       r.log_date,
      cibleType:  (r.animal_type as TraitementSante['cibleType']) ?? 'GENERAL',
      cibleId:    r.animal_code ?? r.sow_id ?? '',
      typeSoin:   r.log_type,
      traitement: r.treatment_name ?? r.treatment ?? '',
      observation: r.notes ?? r.symptom ?? '',
      auteur:     r.operator ?? undefined,
      synced:     true,
    }));

    cb?.(mapped, SANTE_HEADER);
    return ok(mapped, SANTE_HEADER);
  } catch (e) {
    return fail<TraitementSante>(String(e));
  }
}

// ── STOCK ALIMENTS (produits_aliments → StockAliment) ────────────────────────

const STOCK_ALIMENTS_HEADER = ['ID', 'LIBELLE', 'UNITE', 'STOCK_ACTUEL',
  'SEUIL_ALERTE', 'NOTES'];

export async function getStockAliments(
  cb?: (data: StockAliment[], header: string[]) => void
): Promise<SupabaseReadResult<StockAliment>> {
  try {
    const { data, error } = await supabase
      .from('produits_aliments')
      .select('*')
      .order('libelle');

    if (error) return fail<StockAliment>(error.message);

    const mapped: StockAliment[] = (data ?? []).map(r => {
      const stockActuel = r.stock_actuel ?? 0;
      const seuil       = r.seuil_alerte ?? 0;
      return {
        id:           r.id,
        libelle:      r.libelle,
        stockActuel,
        unite:        r.unite ?? 'kg',
        seuilAlerte:  seuil,
        statutStock:  stockActuel <= 0 ? 'RUPTURE'
                    : stockActuel <= seuil ? 'BAS'
                    : 'OK',
        notes:        r.notes ?? undefined,
      };
    });

    cb?.(mapped, STOCK_ALIMENTS_HEADER);
    return ok(mapped, STOCK_ALIMENTS_HEADER);
  } catch (e) {
    return fail<StockAliment>(String(e));
  }
}

// ── STOCK VÉTO (produits_veto → StockVeto) ───────────────────────────────────

const STOCK_VETO_HEADER = ['ID', 'LIBELLE', 'TYPE', 'USAGE', 'UNITE',
  'STOCK_ACTUEL', 'STOCK_MIN', 'DLC', 'NOTES'];

export async function getStockVeto(
  cb?: (data: StockVeto[], header: string[]) => void
): Promise<SupabaseReadResult<StockVeto>> {
  try {
    const { data, error } = await supabase
      .from('produits_veto')
      .select('*')
      .order('libelle');

    if (error) return fail<StockVeto>(error.message);

    const mapped: StockVeto[] = (data ?? []).map(r => {
      const stockActuel = r.stock_actuel ?? 0;
      const stockMin    = r.stock_min ?? 0;
      return {
        id:           r.id,
        produit:      r.libelle,
        type:         r.type ?? undefined,
        usage:        r.usage ?? undefined,
        stockActuel,
        unite:        r.unite ?? 'doses',
        stockMin,
        seuilAlerte:  stockMin,
        statutStock:  stockActuel <= 0 ? 'RUPTURE'
                    : stockActuel <= stockMin ? 'BAS'
                    : 'OK',
        notes:        r.notes ?? undefined,
      };
    });

    cb?.(mapped, STOCK_VETO_HEADER);
    return ok(mapped, STOCK_VETO_HEADER);
  } catch (e) {
    return fail<StockVeto>(String(e));
  }
}

// ── NOTES TERRAIN (notes → Note) ─────────────────────────────────────────────

export async function getNotesTerrain(
  cb?: (data: Note[], header: string[]) => void
): Promise<SupabaseReadResult<Note>> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return fail<Note>(error.message);

    const header = ['DATE', 'CATEGORIE', 'NOTE', 'ANIMAL', 'AUTEUR'];

    const mapped: Note[] = (data ?? []).map(r => ({
      id:         r.id,
      date:       r.created_at?.split('T')[0] ?? '',
      animalType: (r.category as Note['animalType']) ?? 'GENERAL',
      animalId:   '',
      texte:      r.content ?? '',
      auteur:     undefined,
      synced:     true,
    }));

    cb?.(mapped, header);
    return ok(mapped, header);
  } catch (e) {
    return fail<Note>(String(e));
  }
}

// ── FINANCES (finances → FinanceEntry) ───────────────────────────────────────

export async function getFinances(
  cb?: (data: FinanceEntry[], header: string[]) => void
): Promise<SupabaseReadResult<FinanceEntry>> {
  try {
    const { data, error } = await supabase
      .from('finances')
      .select('*')
      .order('created_at');

    if (error) return fail<FinanceEntry>(error.message);

    const header = ['POSTE', 'MENSUEL_FCFA', 'ANNUEL_FCFA', 'PCT_TOTAL',
      'TYPE', 'NOTES'];

    const toFinanceType = (v: string | null): FinanceEntry['type'] =>
      v === 'REVENU' ? 'REVENU' : 'DEPENSE';

    const mapped: FinanceEntry[] = (data ?? []).map(r => ({
      date:      r.created_at?.split('T')[0] ?? '',
      categorie: r.type ?? '',
      libelle:   r.poste ?? '',
      montant:   r.mensuel_fcfa ?? 0,
      type:      toFinanceType(r.type),
      notes:     r.notes ?? undefined,
    }));

    cb?.(mapped, header);
    return ok(mapped, header);
  } catch (e) {
    return fail<FinanceEntry>(String(e));
  }
}

// ── ÉCRITURES (insert / update / delete) ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Insère une ligne dans n'importe quelle table métier. */
export async function insertRow(
  table: string,
  values: Record<string, unknown>
): Promise<{ success: boolean; message?: string }> {
  const { error } = await db.from(table).insert(values);
  if (error) return { success: false, message: error.message };
  return { success: true };
}

/** Met à jour une ligne par son UUID. */
export async function updateRowById(
  table: string,
  id: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; message?: string }> {
  const { error } = await db.from(table).update(fields).eq('id', id);
  if (error) return { success: false, message: error.message };
  return { success: true };
}

/** Supprime une ligne par son UUID. */
export async function deleteRowById(
  table: string,
  id: string
): Promise<{ success: boolean; message?: string }> {
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) return { success: false, message: error.message };
  return { success: true };
}
