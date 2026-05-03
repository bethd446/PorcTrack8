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
    // V24 : JOIN loges (numero). Fallback legacy si migration absente.
    let data: unknown[] | null = null;
    let error: { message: string } | null = null;
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase.from('sows') as any)
        .select('*, loges(id, numero)')
        .order('code_id');
      data = res.data as unknown[] | null;
      error = res.error;
    }
    if (error) {
      const legacy = await supabase.from('sows').select('*').order('code_id');
      if (legacy.error) return fail<Truie>(legacy.error.message);
      data = legacy.data ?? [];
    }

    const mapped: Truie[] = (data ?? []).map((raw) => {
      const r = raw as Record<string, unknown> & {
        loges?: { id?: string; numero?: string } | null;
      };
      return {
        id:            r.id as string,
        displayId:     r.code_id as string,
        boucle:        (r.boucle as string | null) ?? '',
        nom:           (r.name as string | null) ?? undefined,
        statut:        (r.statut as string | null) ?? 'Vide',
        stade:         (r.statut_repro as string | null) ?? undefined,
        ration:        (r.ration_kg_j as number | null) ?? 0,
        nbPortees:     (r.nb_portees as number | null) ?? 0,
        dateMBPrevue:  (r.date_mb_prevue as string | null) ?? undefined,
        notes:         (r.notes as string | null) ?? undefined,
        race:          (r.breed as string | null) ?? undefined,
        photoUrl:      (r.photo_url as string | null) ?? undefined,
        dateNaissance: (r.date_naissance as string | null) ?? undefined,
        origine:       (r.origine as string | null) ?? undefined,
        loge:          (r.localisation as string | null) ?? undefined,
        logeId:        (r.loge_id as string | null) ?? undefined,
        logeNumero:    r.loges?.numero ?? undefined,
        synced:        true,
      };
    });

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
    // V24 : JOIN loges (numero). Fallback legacy si migration absente.
    let data: unknown[] | null = null;
    let error: { message: string } | null = null;
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase.from('boars') as any)
        .select('*, loges(id, numero)')
        .order('code_id');
      data = res.data as unknown[] | null;
      error = res.error;
    }
    if (error) {
      const legacy = await supabase.from('boars').select('*').order('code_id');
      if (legacy.error) return fail<Verrat>(legacy.error.message);
      data = legacy.data ?? [];
    }

    const mapped: Verrat[] = (data ?? []).map((raw) => {
      const r = raw as Record<string, unknown> & {
        loges?: { id?: string; numero?: string } | null;
      };
      return {
        id:            r.id as string,
        displayId:     r.code_id as string,
        boucle:        (r.boucle as string | null) ?? '',
        nom:           (r.name as string | null) ?? undefined,
        statut:        (r.statut as string | null) ?? 'Actif',
        origine:       (r.origine as string | null) ?? undefined,
        alimentation:  (r.alimentation as string | null) ?? undefined,
        ration:        (r.ration_kg_j as number | null) ?? 0,
        notes:         (r.notes as string | null) ?? undefined,
        photoUrl:      (r.photo_url as string | null) ?? undefined,
        dateNaissance: (r.date_naissance as string | null) ?? undefined,
        loge:          (r.localisation as string | null) ?? undefined,
        logeId:        (r.loge_id as string | null) ?? undefined,
        logeNumero:    r.loges?.numero ?? undefined,
        race:          (r.breed as string | null) ?? undefined,
        lignee:        (r.lignee_parentale as string | null) ?? undefined,
        synced:        true,
      };
    });

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
    // V24 : JOIN batch_sows (multi-mères) + loges (référentiel structuré).
    // Si la migration v24 n'est pas encore appliquée, le SELECT échoue ;
    // on retombe alors sur la requête legacy (sans sources/loges).
    let data: unknown[] | null = null;
    let error: { message: string } | null = null;
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase.from('batches') as any)
        .select(
          '*, sows(code_id, boucle), boars(code_id), '
          + 'batch_sows(id, sow_id, nb_porcelets_apportes, date_ajout, notes, sows(code_id, boucle, name)), '
          + 'loges(id, numero), '
          + 'porcelets_individuels(id, batch_id, boucle, sexe, poids_courant_kg, statut, notes)',
        )
        .order('date_mise_bas', { ascending: false });
      data = res.data as unknown[] | null;
      error = res.error;
    }
    if (error) {
      // Fallback legacy (avant migration v24)
      const legacy = await supabase
        .from('batches')
        .select('*, sows(code_id, boucle), boars(code_id)')
        .order('date_mise_bas', { ascending: false });
      if (legacy.error) return fail<BandePorcelets>(legacy.error.message);
      data = legacy.data ?? [];
      error = null;
    }

    type BatchSowJoin = {
      id: string;
      sow_id: string;
      nb_porcelets_apportes: number;
      date_ajout: string;
      notes: string | null;
      sows?: { code_id?: string | null; boucle?: string | null; name?: string | null } | null;
    };

    type PorceletJoin = {
      id: string;
      batch_id: string;
      boucle: string;
      sexe: 'M' | 'F' | 'INCONNU';
      poids_courant_kg: number | null;
      statut: 'VIVANT' | 'MORT' | 'VENDU' | 'MALADE' | 'QUARANTAINE';
      notes: string | null;
    };

    const mapped: BandePorcelets[] = (data ?? []).map((raw) => {
      const r = raw as Record<string, unknown> & {
        sows?: { code_id?: string; boucle?: string } | null;
        boars?: { code_id?: string } | null;
        batch_sows?: BatchSowJoin[] | null;
        loges?: { id?: string; numero?: string } | null;
        porcelets_individuels?: PorceletJoin[] | null;
      };
      const nv = (r.porcelets_nes_vivants as number | null | undefined) ?? 0;
      const morts = (r.nb_mort_nes as number | null | undefined) ?? 0;
      return {
        id:                  r.id as string,
        idPortee:            r.code_id as string,
        truie:               r.sows?.code_id ?? undefined,
        boucleMere:          r.sows?.boucle ?? undefined,
        dateMB:              (r.date_mise_bas as string | null) ?? undefined,
        nv,
        morts,
        vivants:             nv,
        statut:              (r.statut as string | null) ?? 'Sous mère',
        dateSevragePrevue:   (r.date_sevrage_prevue as string | null) ?? undefined,
        dateSevrageReelle:   (r.date_sevrage as string | null) ?? undefined,
        notes:               (r.notes as string | null) ?? undefined,
        photoUrl:            (r.photo_url as string | null) ?? undefined,
        loge:                (r.loge as string | null) ?? undefined,
        poidsMoyenKg:        (r.poids_moyen_kg as number | null) ?? undefined,
        poidsInitialKg:      (r.poids_initial_kg as number | null) ?? 0,
        verratPere:          r.boars?.code_id ?? undefined,
        sources:             (r.batch_sows ?? []).map(bs => ({
                               id: bs.id,
                               sowId: bs.sow_id,
                               sowCode: bs.sows?.code_id ?? '',
                               sowBoucle: bs.sows?.boucle ?? undefined,
                               sowName: bs.sows?.name ?? undefined,
                               nbPorceletsApportes: bs.nb_porcelets_apportes,
                               dateAjout: bs.date_ajout,
                               notes: bs.notes ?? undefined,
                             })),
        logeId:              (r.loge_id as string | null) ?? undefined,
        logeNumero:          r.loges?.numero ?? undefined,
        porcelets:           (r.porcelets_individuels ?? []).map(p => ({
                               id: p.id,
                               batchId: p.batch_id,
                               boucle: p.boucle,
                               sexe: p.sexe,
                               poidsCourantKg: p.poids_courant_kg ?? undefined,
                               statut: p.statut,
                               notes: p.notes ?? undefined,
                             })),
        synced:              true,
      };
    });

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
      // V21-D1 : fournisseur_id (colonne ajoutée par migration, pas encore dans
      // le type Database généré). Cast ciblé pour conserver le typage du reste.
      const fournisseurId = (r as { fournisseur_id?: string | null }).fournisseur_id ?? undefined;
      // V36 : short_code (colonne post-migration, pas encore dans Database typegen)
      const shortCode = (r as { short_code?: string | null }).short_code ?? undefined;
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
        fournisseurId,
        shortCode,
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
      const fournisseurId = (r as { fournisseur_id?: string | null }).fournisseur_id ?? undefined;
      // V36 : short_code (colonne post-migration, pas encore dans Database typegen)
      const shortCode = (r as { short_code?: string | null }).short_code ?? undefined;
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
        fournisseurId,
        shortCode,
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
      auteur:     r.author_id ?? undefined,
      photoUrl:   r.photo_url ?? undefined,
      audioUrl:   r.audio_url ?? undefined,
      tags:       r.tags ?? undefined,
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

// ── ÉCRITURES ────────────────────────────────────────────────────────────────
// Les fonctions génériques d'insert/update/delete sont retirées d'ici : elles
// n'auto-injectaient pas `farm_id` et ouvraient un risque multi-tenant. Tous
// les écrivains métier passent désormais par `services/supabaseWrites.ts`
// (`insertSow`, `updateBatch`, `deleteNote`, etc.) qui résout `farm_id` via
// `auth.getSession()` et le scelle au payload.
