/**
 * lots.repo.ts — CRUD lots d'engraissement + pesées hebdo + mortalités.
 *
 * V80 — Sprint P0 #2 (module Engraissement). Crée 3 tables backend :
 *   - lots             : 1 lot = N porcs réceptionnés ensemble
 *   - lot_pesees       : pesées hebdo (poids moyen + nb porcs pesés)
 *   - lot_mortalites   : mortalité par cause (date + nb + cause)
 *
 * Les tables ne sont pas encore typées dans `database.types.ts` (pas de regen
 * depuis la migration V80), donc on cast `any` à chaque accès.
 */
import { supabase } from '../supabaseClient';
import { getFarmId } from './_shared';

// ── Row types (DB shape, en attendant regen types Supabase) ─────────────────

export interface LotRow {
  id: string;
  farm_id: string;
  code: string;
  date_arrivee: string;             // YYYY-MM-DD
  fournisseur: string | null;
  nb_porcs_initial: number;
  poids_moyen_arrivee: number | null;
  prix_unitaire_achat: number | null;
  statut: 'EN_COURS' | 'VENDU' | 'CLOTURE';
  date_quarantaine_fin: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LotInsert {
  code: string;
  date_arrivee: string;
  fournisseur?: string | null;
  nb_porcs_initial: number;
  poids_moyen_arrivee?: number | null;
  prix_unitaire_achat?: number | null;
  statut?: LotRow['statut'];
  date_quarantaine_fin?: string | null;
  notes?: string | null;
}

export interface LotPeseeRow {
  id: string;
  farm_id: string;
  lot_id: string;
  date: string;
  poids_moyen: number;
  nb_porcs_pesees: number;
  notes: string | null;
  created_at: string;
}

export interface LotPeseeInsert {
  lot_id: string;
  date: string;
  poids_moyen: number;
  nb_porcs_pesees: number;
  notes?: string | null;
}

export interface LotMortaliteRow {
  id: string;
  farm_id: string;
  lot_id: string;
  date: string;
  nb_morts: number;
  cause: string | null;
  created_at: string;
}

export interface LotMortaliteInsert {
  lot_id: string;
  date: string;
  nb_morts: number;
  cause?: string | null;
}

// ── CRUD lots ──────────────────────────────────────────────────────────────

export async function insertLot(values: LotInsert): Promise<LotRow> {
  const farm_id = await getFarmId();
  const payload = { ...values, farm_id };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('lots' as any) as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`[lots] insert failed: ${error.message}`);
  return data as LotRow;
}

export async function updateLot(
  id: string,
  patch: Partial<LotRow>,
): Promise<LotRow> {
  if (!id) throw new Error('ID manquant');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('lots' as any) as any)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`[lots] update failed: ${error.message}`);
  return data as LotRow;
}

export async function deleteLot(id: string): Promise<void> {
  if (!id) throw new Error('ID manquant');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('lots' as any) as any)
    .delete()
    .eq('id', id);
  if (error) throw new Error(`[lots] delete failed: ${error.message}`);
}

export async function listLotsByFarm(farmId?: string): Promise<LotRow[]> {
  const fid = farmId ?? (await getFarmId());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('lots' as any) as any)
    .select('*')
    .eq('farm_id', fid)
    .order('date_arrivee', { ascending: false });
  if (error) {
    console.warn('[lots] list failed:', error.message);
    return [];
  }
  return (data as LotRow[]) ?? [];
}

// ── Pesées lot ──────────────────────────────────────────────────────────────

export async function insertPeseeLot(values: LotPeseeInsert): Promise<LotPeseeRow> {
  const farm_id = await getFarmId();
  const payload = { ...values, farm_id };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('lot_pesees' as any) as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`[lot_pesees] insert failed: ${error.message}`);
  return data as LotPeseeRow;
}

export async function listPeseesByLot(lotId: string): Promise<LotPeseeRow[]> {
  if (!lotId) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('lot_pesees' as any) as any)
    .select('*')
    .eq('lot_id', lotId)
    .order('date', { ascending: true });
  if (error) {
    console.warn('[lot_pesees] list failed:', error.message);
    return [];
  }
  return (data as LotPeseeRow[]) ?? [];
}

// ── Mortalités lot ─────────────────────────────────────────────────────────

export async function insertMortaliteLot(
  values: LotMortaliteInsert,
): Promise<LotMortaliteRow> {
  const farm_id = await getFarmId();
  const payload = { ...values, farm_id };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('lot_mortalites' as any) as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`[lot_mortalites] insert failed: ${error.message}`);
  return data as LotMortaliteRow;
}

export async function listMortalitesByLot(
  lotId: string,
): Promise<LotMortaliteRow[]> {
  if (!lotId) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('lot_mortalites' as any) as any)
    .select('*')
    .eq('lot_id', lotId)
    .order('date', { ascending: false });
  if (error) {
    console.warn('[lot_mortalites] list failed:', error.message);
    return [];
  }
  return (data as LotMortaliteRow[]) ?? [];
}

// ── Calculs métier (purs, testables) ───────────────────────────────────────

/**
 * Nombre de jours entre 2 dates (YYYY-MM-DD). Ignore HH:MM.
 * Retourne 0 si dates invalides ou identiques.
 */
function diffDays(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso + 'T00:00:00Z');
  const b = Date.parse(toIso + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const ms = b - a;
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * GMQ (g/j) = (poids_moyen_recent - poids_moyen_arrivee) / jours.
 *
 * Cap statistique : ≥ 2 pesées requises pour avoir un signal (la première
 * pesée seule pourrait être l'arrivée même, ce qui rendrait le GMQ instable).
 * Si moins de 2 pesées OU poids initial inconnu OU délai = 0 → null.
 *
 * @returns g/j ou null si signal insuffisant
 */
export function computeGMQ(
  lot: Pick<LotRow, 'date_arrivee' | 'poids_moyen_arrivee'>,
  pesees: Array<Pick<LotPeseeRow, 'date' | 'poids_moyen'>>,
): number | null {
  if (lot.poids_moyen_arrivee == null) return null;
  if (!pesees || pesees.length < 2) return null;

  // Dernière pesée (date la plus récente)
  const sorted = [...pesees].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];

  const jours = diffDays(lot.date_arrivee, last.date);
  if (jours <= 0) return null;

  const deltaKg = last.poids_moyen - Number(lot.poids_moyen_arrivee);
  // GMQ négatif possible si le lot perd du poids — on retourne quand même
  // pour transparence métier.
  const gmqGramsPerDay = (deltaKg * 1000) / jours;
  return Math.round(gmqGramsPerDay);
}

/**
 * Poids moyen estimé courant du lot. Si pesées existent → dernière pesée,
 * sinon retombe sur poids_moyen_arrivee.
 */
export function currentAvgWeight(
  lot: Pick<LotRow, 'poids_moyen_arrivee'>,
  pesees: Array<Pick<LotPeseeRow, 'date' | 'poids_moyen'>>,
): number | null {
  if (pesees && pesees.length > 0) {
    const sorted = [...pesees].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1].poids_moyen;
  }
  return lot.poids_moyen_arrivee ?? null;
}

/**
 * Nb porcs vivants courant = initial - somme mortalités.
 */
export function porcsVivants(
  lot: Pick<LotRow, 'nb_porcs_initial'>,
  morts: Array<Pick<LotMortaliteRow, 'nb_morts'>>,
): number {
  const sumMorts = (morts ?? []).reduce((acc, m) => acc + (m.nb_morts ?? 0), 0);
  return Math.max(0, lot.nb_porcs_initial - sumMorts);
}

/**
 * Taux de mortalité (%) = morts / initial * 100.
 */
export function tauxMortalite(
  lot: Pick<LotRow, 'nb_porcs_initial'>,
  morts: Array<Pick<LotMortaliteRow, 'nb_morts'>>,
): number {
  if (!lot.nb_porcs_initial || lot.nb_porcs_initial <= 0) return 0;
  const sumMorts = (morts ?? []).reduce((acc, m) => acc + (m.nb_morts ?? 0), 0);
  return Math.round((sumMorts / lot.nb_porcs_initial) * 1000) / 10;
}

/**
 * `true` si le poids moyen courant ≥ seuil (110kg par défaut) — alerte vente.
 */
export function isPretVente(
  lot: Pick<LotRow, 'poids_moyen_arrivee'>,
  pesees: Array<Pick<LotPeseeRow, 'date' | 'poids_moyen'>>,
  seuilKg = 110,
): boolean {
  const avg = currentAvgWeight(lot, pesees);
  return avg != null && avg >= seuilKg;
}

/**
 * Coût total partiel = achat (initial × prix_unitaire). Aliment-conso (P1)
 * sera ajouté plus tard (module à venir). Retourne null si données manquantes.
 */
export function coutAchatTotal(
  lot: Pick<LotRow, 'nb_porcs_initial' | 'prix_unitaire_achat'>,
): number | null {
  if (lot.prix_unitaire_achat == null) return null;
  return Math.round(lot.nb_porcs_initial * Number(lot.prix_unitaire_achat));
}
