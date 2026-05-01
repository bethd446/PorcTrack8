/**
 * feedConsumptionAnalyzer — IC réel par bande
 * ══════════════════════════════════════════════════════════════════════════
 * V21-3 (2026-05-01) — saisie consommation aliment réelle.
 *
 * Calcule l'IC réel d'une bande à partir des saisies `feed_consumption_logs`
 * faites par l'éleveur :
 *
 *     IC réel = total_kg_livre / total_kg_porc_produit
 *     total_kg_porc_produit = (poids_moyen_actuel - POIDS_NAISSANCE_KG) × vivants
 *
 * On compare ensuite l'IC réel vs un IC théorique (constante ferme, par
 * défaut 2.85) pour produire un écart en %.
 *
 * `computeICReel` lit directement Supabase (table `feed_consumption_logs`)
 * pour additionner les kg livrés depuis la mise-bas. Les helpers purs sont
 * exportés pour permettre des tests unitaires sans réseau.
 */

import { supabase } from './supabaseClient';

/** Poids moyen estimé d'un porcelet à la naissance (kg). */
export const POIDS_NAISSANCE_KG = 1.4;

/** IC théorique de référence (kg aliment / kg gain). Cf. perfKpiAnalyzer. */
export const IC_THEORIQUE_DEFAUT = 2.85;

/**
 * Nombre minimum de saisies pour considérer le calcul "fiable".
 * En dessous, l'IC réel reste calculé mais doit être affiché en badge orange.
 */
export const MIN_SAISIES_FIABLE = 3;

export interface ICReel {
  bande_id: string;
  /** Somme des kg livrés depuis la mise-bas. */
  total_kg_livre: number;
  /** (poids_moyen_actuel - POIDS_NAISSANCE_KG) × vivants. */
  total_kg_porc_produit: number;
  /** total_kg_livre / total_kg_porc_produit. */
  ic_reel: number;
  /** Écart vs IC théorique en pourcentage (positif = pire). */
  vs_theorique_pct: number;
  /** Nombre de saisies utilisées pour le calcul. */
  nb_saisies: number;
  /** True si nb_saisies >= MIN_SAISIES_FIABLE. */
  fiable: boolean;
}

/** Entrée minimale d'une saisie de conso aliment. */
export interface FeedConsoLog {
  qty_kg: number;
  date_conso: string;
}

/** Données bande nécessaires au calcul. */
export interface BandeICInput {
  id: string;
  vivants: number;
  poids_moyen_kg: number;
}

// ─── Helpers purs (exportés pour tests) ────────────────────────────────────

/**
 * Total kg porc produit = (poids_moyen_actuel - POIDS_NAISSANCE_KG) × vivants.
 * Retourne 0 si poids inférieur ou égal à la naissance, ou aucun vivant.
 */
export function computeKgPorcProduit(
  poidsMoyenKg: number,
  vivants: number,
  poidsNaissanceKg: number = POIDS_NAISSANCE_KG,
): number {
  if (!Number.isFinite(poidsMoyenKg) || !Number.isFinite(vivants)) return 0;
  if (vivants <= 0) return 0;
  const gainParPorc = poidsMoyenKg - poidsNaissanceKg;
  if (gainParPorc <= 0) return 0;
  return Math.round(gainParPorc * vivants * 100) / 100;
}

/**
 * IC réel = total_kg_livre / total_kg_porc_produit. Retourne 0 si dénominateur nul.
 */
export function computeICRatio(totalKgLivre: number, totalKgProduit: number): number {
  if (totalKgProduit <= 0) return 0;
  return Math.round((totalKgLivre / totalKgProduit) * 100) / 100;
}

/**
 * Écart en % vs IC théorique. Positif = consomme plus que théorique (mauvais).
 * Retourne 0 si l'IC réel ou théorique est nul.
 */
export function computeVsTheoriquePct(
  icReel: number,
  icTheorique: number = IC_THEORIQUE_DEFAUT,
): number {
  if (icTheorique <= 0 || icReel <= 0) return 0;
  const pct = ((icReel - icTheorique) / icTheorique) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * Construit l'objet ICReel à partir des données brutes (logs + bande).
 * Pur et testable.
 */
export function buildICReel(
  bande: BandeICInput,
  logs: FeedConsoLog[],
  icTheorique: number = IC_THEORIQUE_DEFAUT,
): ICReel {
  const total_kg_livre = logs.reduce(
    (acc, l) => acc + (Number.isFinite(l.qty_kg) ? l.qty_kg : 0),
    0,
  );
  const total_kg_porc_produit = computeKgPorcProduit(bande.poids_moyen_kg, bande.vivants);
  const ic_reel = computeICRatio(total_kg_livre, total_kg_porc_produit);
  const vs_theorique_pct = computeVsTheoriquePct(ic_reel, icTheorique);

  return {
    bande_id: bande.id,
    total_kg_livre: Math.round(total_kg_livre * 100) / 100,
    total_kg_porc_produit,
    ic_reel,
    vs_theorique_pct,
    nb_saisies: logs.length,
    fiable: logs.length >= MIN_SAISIES_FIABLE,
  };
}

// ─── Lecture Supabase ──────────────────────────────────────────────────────

/**
 * Calcule l'IC réel pour une bande donnée.
 * Retourne `null` si la bande n'existe pas ou n'a pas de poids moyen saisi.
 *
 * Note : aucune saisie de conso ⇒ retourne un ICReel avec `nb_saisies = 0`
 * et `ic_reel = 0`. L'UI doit afficher un empty state dans ce cas.
 */
export async function computeICReel(
  bandeId: string,
  _today: Date = new Date(),
): Promise<ICReel | null> {
  // 1. Lire la bande pour récupérer poids_moyen_kg + vivants + date_mise_bas
  const { data: batch, error: batchErr } = await supabase
    .from('batches')
    .select('id, vivants, poids_moyen_kg, date_mise_bas')
    .eq('id', bandeId)
    .maybeSingle();

  if (batchErr || !batch) return null;

  const poidsMoyen = (batch as { poids_moyen_kg?: number | null }).poids_moyen_kg;
  if (poidsMoyen == null || !Number.isFinite(poidsMoyen)) {
    // Pas de poids saisi → on ne peut pas calculer le dénominateur
    return null;
  }

  // 2. Lire toutes les saisies depuis la mise-bas
  // `feed_consumption_logs` n'est pas (encore) dans Database types — cast any.
  const dateMb = (batch as { date_mise_bas?: string | null }).date_mise_bas;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (supabase.from('feed_consumption_logs' as never) as any)
    .select('qty_kg, date_conso')
    .eq('batch_id', bandeId);

  if (dateMb) {
    query = query.gte('date_conso', dateMb);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs, error: logsErr } = (await query) as any;
  if (logsErr) return null;

  const safeLogs: FeedConsoLog[] = Array.isArray(logs)
    ? logs.map((l: { qty_kg: number; date_conso: string }) => ({
        qty_kg: Number(l.qty_kg) || 0,
        date_conso: String(l.date_conso),
      }))
    : [];

  return buildICReel(
    {
      id: bandeId,
      vivants: (batch as { vivants?: number | null }).vivants ?? 0,
      poids_moyen_kg: poidsMoyen,
    },
    safeLogs,
  );
}

/**
 * Insert d'une saisie conso aliment.
 * `created_by` est auto-injecté via `auth.uid()` côté write.
 */
export interface FeedConsoInsertInput {
  batch_id: string | null;
  sow_id: string | null;
  produit_aliment_id: string | null;
  date_conso: string; // YYYY-MM-DD
  qty_kg: number;
  notes: string | null;
}

export async function insertFeedConsumption(
  values: FeedConsoInsertInput,
): Promise<{ id: string }> {
  const { data: session, error: sessErr } = await supabase.auth.getSession();
  if (sessErr || !session.session?.user.id) {
    throw new Error('Aucune session authentifiée — connexion requise');
  }
  const uid = session.session.user.id;
  const payload = {
    ...values,
    farm_id: uid,
    created_by: uid,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('feed_consumption_logs' as any) as any)
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}
