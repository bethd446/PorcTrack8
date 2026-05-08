/**
 * mbWorkflowService — V27 Workflow Mise Bas + Daily Checks
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   - listSailliesProchesMB(farmId) : saillies J-3 → J+2 prêtes à confirmer
 *   - confirmMiseBas(payload)       : INSERT batch + lien saillie
 *   - listDailyChecksPending(farmId): bandes "Sous mère" sans daily check du jour
 *   - submitDailyCheck(payload)     : upsert daily_checks_mb
 *
 * Tous les helpers de validation/dérivation sont dans
 * `quickConfirmMiseBasLogic` et `dailyMBChecklistLogic` (testés en pur).
 */

import { supabase } from './supabaseClient';
import { insertBatch, getCurrentFarmIdRef } from './supabaseWrites';
import {
  selectSailliesProchesMB,
  type SaillieProcheMB,
} from '../components/forms/quickConfirmMiseBasLogic';
import { todayIso } from '../components/forms/dailyMBChecklistLogic';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConfirmMiseBasPayload {
  saillie_id: string;
  sow_id: string | null;
  boar_id: string | null;
  date_saillie: string | null;
  date_mise_bas: string;
  porcelets_nes_total: number;
  porcelets_nes_vivants: number;
  nb_mort_nes: number;
  poids_portee_naissance_kg: number | null;
  nb_males_naissance: number | null;
  nb_femelles_naissance: number | null;
  loge_id: string;
  /** code_id généré (ex: B-20260502-MB-T07). */
  code_id: string;
}

export interface DailyCheckUpsertPayload {
  batch_id: string;
  date_check?: string; // default today
  morts_jour: number;
  comportement: 'CALME' | 'NORMAL' | 'AGITE' | null;
  truie_alimentation: 'OUI' | 'NON' | 'PARTIEL' | null;
  mamelles_utilisees: boolean | null;
  diarrhee: 'AUCUN' | 'QUELQUES' | 'TOUS' | null;
  respiration_ok: boolean | null;
  lampe_ok: boolean | null;
  eau_ok: boolean | null;
  notes: string | null;
  photo_url: string | null;
}

export interface DailyCheckRow {
  id: string;
  farm_id: string;
  batch_id: string;
  date_check: string;
  morts_jour: number;
  comportement: 'CALME' | 'NORMAL' | 'AGITE' | null;
  truie_alimentation: 'OUI' | 'NON' | 'PARTIEL' | null;
  mamelles_utilisees: boolean | null;
  diarrhee: 'AUCUN' | 'QUELQUES' | 'TOUS' | null;
  respiration_ok: boolean | null;
  lampe_ok: boolean | null;
  eau_ok: boolean | null;
  notes: string | null;
  photo_url: string | null;
}

export interface BandeSousMere {
  batch_id: string;
  code_id: string;
  date_mise_bas: string | null;
  loge_id: string | null;
  porcelets_nes_vivants: number | null;
  has_check_today: boolean;
}

// ─── Helpers internes ────────────────────────────────────────────────────────

/**
 * V71-P2 phase C — Résolution `farm_id` :
 *  1. Priorité : `currentFarmId` exposé par FarmContext (multi-user).
 *  2. Fallback : `auth.uid()` (rétro-compat pré-multi-user).
 */
async function getFarmId(): Promise<string> {
  const ref = getCurrentFarmIdRef();
  if (ref) return ref;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Auth session error: ${error.message}`);
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Aucune session authentifiée');
  return uid;
}

// ─── 1) Saillies proches mise-bas ────────────────────────────────────────────

/**
 * Liste les saillies dont la mise-bas prévue tombe dans la fenêtre
 * J-3 → J+2 (configurable). Filtre via `selectSailliesProchesMB` (testé pur).
 *
 * NOTE: la sélection finale (filtrage des saillies déjà confirmées en bande)
 * est faite côté UI avec la liste de bandes existantes — éviter requête N+1.
 */
export async function listSailliesProchesMB(
  options: { dateRef?: Date; daysBefore?: number; daysAfter?: number } = {},
): Promise<SaillieProcheMB[]> {
  const dateRef = options.dateRef ?? new Date();
  // Borne large pour récupération : 130j de saillie ago au plus.
  const lower = new Date(dateRef.getTime() - 130 * 86400000)
    .toISOString()
    .slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('saillies') as any)
    .select('id, sow_id, boar_id, date_saillie, date_mb_prevue, statut')
    .gte('date_saillie', lower)
    .order('date_saillie', { ascending: false });

  if (error || !data) return [];

  return selectSailliesProchesMB(
    data as Array<{
      id: string;
      sow_id: string | null;
      boar_id: string | null;
      date_saillie: string | null;
      date_mb_prevue: string | null;
      statut: string | null;
    }>,
    dateRef,
    options.daysBefore ?? 3,
    options.daysAfter ?? 2,
  );
}

// ─── 2) Confirmer mise-bas ───────────────────────────────────────────────────

/**
 * Crée une bande `phase='SOUS_MERE'`, `validation_status='VALIDATED'`,
 * référant la saillie d'origine via les colonnes `sow_id`, `boar_id`,
 * `date_saillie` et `date_mise_bas`.
 *
 * Retourne l'UUID de la bande créée.
 */
export async function confirmMiseBas(
  payload: ConfirmMiseBasPayload,
): Promise<{ id: string; code_id: string }> {
  if (!payload.saillie_id) throw new Error('saillie_id manquant');
  if (!payload.loge_id) throw new Error('loge_id manquant');
  if (!Number.isInteger(payload.porcelets_nes_total) || payload.porcelets_nes_total < 1) {
    throw new Error('porcelets_nes_total invalide');
  }
  if (
    !Number.isInteger(payload.porcelets_nes_vivants) ||
    payload.porcelets_nes_vivants < 0 ||
    payload.porcelets_nes_vivants > payload.porcelets_nes_total
  ) {
    throw new Error('porcelets_nes_vivants invalide');
  }

  const insertPayload: Record<string, unknown> = {
    code_id: payload.code_id,
    sow_id: payload.sow_id,
    boar_id: payload.boar_id,
    loge_id: payload.loge_id,
    date_saillie: payload.date_saillie,
    date_mise_bas: payload.date_mise_bas,
    porcelets_nes_total: payload.porcelets_nes_total,
    porcelets_nes_vivants: payload.porcelets_nes_vivants,
    nb_mort_nes: payload.nb_mort_nes,
    poids_portee_naissance_kg: payload.poids_portee_naissance_kg,
    poids_moyen_kg:
      payload.poids_portee_naissance_kg != null && payload.porcelets_nes_vivants > 0
        ? payload.poids_portee_naissance_kg / payload.porcelets_nes_vivants
        : null,
    statut: 'Sous mère',
    phase: 'SOUS_MERE',
    validation_status: 'VALIDATED',
    notes: notesFromMbExtras(payload),
  };

  // Type ad-hoc : insertBatch attend un BatchInsert ; les colonnes V24+
  // (loge_id, validation_status, nb_males/femelles…) sont absentes du
  // Database type généré ; cast nécessaire.
  const created = await insertBatch(
    insertPayload as Parameters<typeof insertBatch>[0],
  );
  if (!created?.id) throw new Error('insertBatch n\'a pas retourné d\'ID');
  return { id: created.id, code_id: payload.code_id };
}

/**
 * Concatène les compteurs M/F (s'ils sont fournis) dans `notes` car les
 * colonnes `nb_males_naissance` / `nb_femelles_naissance` n'existent pas en
 * DB selon le schéma BatchInsert actuel. Format simple, parsable plus tard.
 */
function notesFromMbExtras(payload: ConfirmMiseBasPayload): string | null {
  const parts: string[] = [];
  if (payload.nb_males_naissance != null) parts.push(`M=${payload.nb_males_naissance}`);
  if (payload.nb_femelles_naissance != null) parts.push(`F=${payload.nb_femelles_naissance}`);
  if (parts.length === 0) return null;
  return `[MB ${parts.join(' ')} via saillie ${payload.saillie_id.slice(0, 8)}]`;
}

// ─── 3) Daily checks pending (bandes Sous mère sans check du jour) ──────────

/**
 * Liste les bandes `phase='SOUS_MERE'` (ou `statut='Sous mère'`) qui n'ont
 * PAS encore de daily check pour aujourd'hui. RLS filtre par farm_id.
 */
export async function listDailyChecksPending(
  options: { dateRef?: string } = {},
): Promise<BandeSousMere[]> {
  const today = options.dateRef ?? todayIso();

  // 1) bandes phase Sous mère
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bandes, error: bandeErr } = await (supabase.from('batches') as any)
    .select('id, code_id, date_mise_bas, loge_id, porcelets_nes_vivants, phase, statut')
    .or('phase.eq.SOUS_MERE,statut.eq.Sous mère');

  if (bandeErr || !bandes) {
    console.warn('[mbWorkflow] listDailyChecksPending — bandes failed:', bandeErr?.message);
    return [];
  }

  const batchIds = (bandes as Array<{ id: string }>).map(b => b.id);
  if (batchIds.length === 0) return [];

  // 2) checks existants pour aujourd'hui
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: checks } = await (supabase.from('daily_checks_mb' as any) as any)
    .select('batch_id')
    .in('batch_id', batchIds)
    .eq('date_check', today);

  const checkedToday = new Set<string>(
    ((checks as Array<{ batch_id: string }>) ?? []).map(c => c.batch_id),
  );

  return (bandes as Array<{
    id: string;
    code_id: string;
    date_mise_bas: string | null;
    loge_id: string | null;
    porcelets_nes_vivants: number | null;
  }>).map(b => ({
    batch_id: b.id,
    code_id: b.code_id,
    date_mise_bas: b.date_mise_bas,
    loge_id: b.loge_id,
    porcelets_nes_vivants: b.porcelets_nes_vivants,
    has_check_today: checkedToday.has(b.id),
  }));
}

// ─── 4) Submit daily check (upsert) ──────────────────────────────────────────

/**
 * Insère ou met à jour le daily check pour la bande × jour. Conflit géré
 * via UNIQUE(batch_id, date_check) côté DB.
 *
 * Note : Postgres `ON CONFLICT` n'est pas exposé directement par
 * `supabase-js@2.x` ; on utilise `.upsert(... { onConflict: 'batch_id,date_check' })`.
 */
export async function submitDailyCheck(
  payload: DailyCheckUpsertPayload,
): Promise<{ id: string }> {
  if (!payload.batch_id) throw new Error('batch_id manquant');
  if (!Number.isInteger(payload.morts_jour) || payload.morts_jour < 0) {
    throw new Error('morts_jour invalide');
  }

  const farm_id = await getFarmId();
  const date_check = payload.date_check ?? todayIso();

  const row = {
    farm_id,
    batch_id: payload.batch_id,
    date_check,
    morts_jour: payload.morts_jour,
    comportement: payload.comportement,
    truie_alimentation: payload.truie_alimentation,
    mamelles_utilisees: payload.mamelles_utilisees,
    diarrhee: payload.diarrhee,
    respiration_ok: payload.respiration_ok,
    lampe_ok: payload.lampe_ok,
    eau_ok: payload.eau_ok,
    notes: payload.notes,
    photo_url: payload.photo_url,
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('daily_checks_mb' as any) as any)
    .upsert(row, { onConflict: 'batch_id,date_check' })
    .select('id')
    .single();

  if (error) throw new Error(`[daily_checks_mb] upsert failed: ${error.message}`);
  return { id: (data as { id: string }).id };
}

// ─── 5) Lecture du check du jour pour précharge form ─────────────────────────

/** Récupère le check existant pour `batch_id` + jour donné (null si absent). */
export async function getDailyCheckForBatch(
  batchId: string,
  dateCheck: string = todayIso(),
): Promise<DailyCheckRow | null> {
  if (!batchId) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('daily_checks_mb' as any) as any)
    .select('*')
    .eq('batch_id', batchId)
    .eq('date_check', dateCheck)
    .maybeSingle();
  if (error || !data) return null;
  return data as DailyCheckRow;
}
