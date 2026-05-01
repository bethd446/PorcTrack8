/**
 * Calculateur de rations — formules aliment validées technicien.
 * ════════════════════════════════════════════════════════════════
 *
 * Fonctions pures (pas d'I/O, pas de state). Consomme les formules
 * typées depuis `src/config/aliments.ts` et produit des quantités
 * exactes pour une masse totale donnée.
 *
 * Règles de calcul :
 *  - Ingrédient : `kg = (pourcent / 100) × masseTotaleKg`
 *  - Additif kg/T : `g = dose × masseTotaleKg` (1 kg/T × 1 T = 1 kg = 1000 g)
 *  - Additif g/T : `g = dose × (masseTotaleKg / 1000)`
 *
 * Formatage : `formatQuantite` bascule automatiquement entre grammes
 * (< 1 kg) et kilogrammes (≥ 1 kg) pour lisibilité terrain.
 */

import type { FormuleAliment, AdditifLigne } from '../config/aliments';
import {
  FEED_CONFIG,
  RATION_ECART_SEUIL_KG,
  type FeedPhaseCode,
} from '../config/feed';
import type { Truie } from '../types/farm';

export interface IngredientCalcule {
  nom: string;
  pourcent: number;
  /** Quantité exacte en kg pour la masse totale demandée. */
  kg: number;
}

export interface AdditifCalcule {
  nom: string;
  /** Dose de référence (ex. "1 kg/T", "300 g/T"). */
  doseRef: string;
  /** Quantité calculée, exprimée en grammes (unité pivot uniforme). */
  quantite: number;
  /** Même quantité déjà formatée pour affichage (kg ou g selon magnitude). */
  quantiteAffiche: string;
}

export interface CalculResult {
  /** Masse totale en entrée (kg). */
  masseTotaleKg: number;
  /** Ingrédients calculés dans l'ordre de la formule. */
  ingredients: IngredientCalcule[];
  /** Additifs calculés dans l'ordre de la formule. */
  additifs: AdditifCalcule[];
  /** Somme des pourcentages base (devrait être 100). */
  totalBasePct: number;
  /** Avertissements non bloquants (ex. somme % ≠ 100). */
  warnings: string[];
}

/** Formate une dose technicien pour affichage ("1 kg/T", "300 g/T"). */
function formatDoseRef(additif: AdditifLigne): string {
  return `${additif.dose} ${additif.unite}`;
}

/**
 * Convertit une dose additif → grammes, pour une masse totale donnée.
 *  - kg/T : 1 tonne = 1000 kg. `g = (dose × 1000) × (masse / 1000) = dose × masse`
 *  - g/T : `g = dose × (masse / 1000)`
 */
function additifEnGrammes(additif: AdditifLigne, masseTotaleKg: number): number {
  if (additif.unite === 'kg/T') {
    return additif.dose * masseTotaleKg;
  }
  // g/T
  return additif.dose * (masseTotaleKg / 1000);
}

/**
 * Formate une quantité en grammes — < 1000 g → "g", sinon "kg".
 * Retourne toujours une chaîne courte, FR-friendly (point décimal,
 * pour éviter confusion avec les séparateurs locaux sur mobile).
 */
export function formatQuantite(grammes: number): string {
  if (!isFinite(grammes)) return '—';
  if (grammes < 1000) {
    return `${grammes.toFixed(1)} g`;
  }
  return `${(grammes / 1000).toFixed(2)} kg`;
}

/** Somme des pourcentages ingrédients — attendu = 100. */
export function totalPourcentBase(formule: FormuleAliment): number {
  return formule.ingredients.reduce((sum, i) => sum + i.pourcent, 0);
}

/**
 * Calcule la composition détaillée d'une ration pour une masse donnée.
 *
 * @param formule     Formule validée (cf. FORMULES_ALIMENT).
 * @param masseTotaleKg Masse cible en kg (>= 0, utilement > 0).
 */
export function calculerRation(
  formule: FormuleAliment,
  masseTotaleKg: number,
): CalculResult {
  const warnings: string[] = [];
  const masse = Number.isFinite(masseTotaleKg) && masseTotaleKg > 0 ? masseTotaleKg : 0;

  const ingredients: IngredientCalcule[] = formule.ingredients.map((ing) => ({
    nom: ing.nom,
    pourcent: ing.pourcent,
    kg: (ing.pourcent / 100) * masse,
  }));

  const additifs: AdditifCalcule[] = formule.additifs.map((add) => {
    const quantite = additifEnGrammes(add, masse);
    return {
      nom: add.nom,
      doseRef: formatDoseRef(add),
      quantite,
      quantiteAffiche: formatQuantite(quantite),
    };
  });

  const totalBasePct = totalPourcentBase(formule);
  if (Math.abs(totalBasePct - 100) > 0.01) {
    warnings.push(
      `Somme des ingrédients = ${totalBasePct}% (attendu 100%). Vérifier la formule.`,
    );
  }
  if (masseTotaleKg <= 0) {
    warnings.push('Masse totale nulle ou négative — calcul non significatif.');
  }

  return {
    masseTotaleKg: masse,
    ingredients,
    additifs,
    totalBasePct,
    warnings,
  };
}

/** Conso journalière (kg) pour un effectif et une ration unitaire. */
export function consoJournaliereKg(
  effectif: number,
  rationKgParSujetJour: number,
): number {
  if (effectif <= 0 || rationKgParSujetJour <= 0) return 0;
  return effectif * rationKgParSujetJour;
}

/** Conso totale (kg) sur N jours. */
export function consoTotaleKg(
  effectif: number,
  rationKgParSujetJour: number,
  jours: number,
): number {
  if (jours <= 0) return 0;
  return consoJournaliereKg(effectif, rationKgParSujetJour) * jours;
}

// ─── Plan ration repro truie ────────────────────────────────────────────────

/**
 * Parse une date ISO (yyyy-MM-dd) ou FR (dd/MM/yyyy) — null si invalide.
 * Reset à 00:00 local pour éviter les off-by-one liés aux fuseaux.
 */
function parseDateLoose(s?: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const d = new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

function diffDays(from: Date, to: Date): number {
  const ms = 1000 * 60 * 60 * 24;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.floor((b - a) / ms);
}

/**
 * Détermine la phase repro courante d'une truie selon son état + dates.
 *
 * Règles (priorité descendante) :
 *  1. Si statut = 'En maternité' OU date_mise_bas connue & sevrage non passé :
 *     → TRUIE_LACTATION pendant 28 j post-MB ; sinon TRUIE_TARIE pendant 5 j ;
 *     sinon null.
 *  2. Sinon, si date_saillie présente :
 *     - 0..20  jours post-saillie : null (fenêtre incertaine, voir échographie)
 *     - 21..108 jours : TRUIE_GESTATION
 *     - 109..114 jours : TRUIE_GESTATION_TARD
 *     - >= 115 jours : null (mise-bas attendue, lactation pas encore enregistrée)
 *  3. Sinon, si statut = 'En attente saillie' : TRUIE_FLUSHING (5 j avant
 *     prochaine saillie). On ne connait pas la date — on retourne FLUSHING par
 *     défaut comme recommandation conservatrice.
 *  4. Sinon : null.
 *
 * @param truie  Truie courante
 * @param today  Date de référence (default = now)
 */
export function getCurrentReproPhase(
  truie: Truie,
  today: Date = new Date(),
): FeedPhaseCode | null {
  const ref = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // 1. Lactation / Tarissement post mise-bas
  // Source dateMB : on regarde si la truie a une portée récente via dateMBPrevue
  // ou statut. Faute d'info précise dans Truie, on s'appuie sur le statut.
  const statut = (truie.statut || '').toLowerCase();
  const isMaternite = /maternit/i.test(statut);
  if (isMaternite) {
    return 'TRUIE_LACTATION';
  }

  // 2. Gestation à partir de la date de mise-bas prévue (saillie + 115)
  const mbPrevue = parseDateLoose(truie.dateMBPrevue);
  if (mbPrevue) {
    // dayPostSaillie ≈ 115 - daysUntilMB (≥ 0 si saillie passée)
    const daysUntilMB = diffDays(ref, mbPrevue);
    const dayPostSaillie = 115 - daysUntilMB;
    if (dayPostSaillie >= 0 && dayPostSaillie <= 20) return null;
    if (dayPostSaillie >= 21 && dayPostSaillie <= 108) return 'TRUIE_GESTATION';
    if (dayPostSaillie >= 109 && dayPostSaillie <= 114) return 'TRUIE_GESTATION_TARD';
    if (dayPostSaillie >= 115) return null;
  }

  // 3. En attente saillie : flushing recommandé
  if (statut.includes('attente') && statut.includes('saillie')) {
    return 'TRUIE_FLUSHING';
  }

  // 4. Statut "Pleine" sans date_mb_prevue : on fallback gestation principale
  if (statut === 'pleine' || statut.includes('gestation')) {
    return 'TRUIE_GESTATION';
  }

  return null;
}

/**
 * Ration recommandée (kg/jour) pour une truie selon sa phase repro courante.
 * Retourne 0 si aucune phase identifiable.
 */
export function getRecommendedRation(
  truie: Truie,
  today: Date = new Date(),
): number {
  const phase = getCurrentReproPhase(truie, today);
  if (!phase) return 0;
  return FEED_CONFIG[phase].ration_kg_j;
}

/**
 * Vrai si l'écart absolu entre ration réelle et recommandée dépasse le seuil.
 * Toujours faux si ration recommandée = 0 (pas de phase identifiée).
 */
export function isRationEcartSignificatif(
  truie: Truie,
  today: Date = new Date(),
): boolean {
  const reco = getRecommendedRation(truie, today);
  if (reco <= 0) return false;
  const reelle = Number.isFinite(truie.ration) ? truie.ration : 0;
  return Math.abs(reelle - reco) > RATION_ECART_SEUIL_KG;
}
