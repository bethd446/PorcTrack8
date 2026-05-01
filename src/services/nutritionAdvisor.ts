/**
 * nutritionAdvisor — Logique pure de conseil nutritionnel par bande
 * ══════════════════════════════════════════════════════════════════
 * Consomme un snapshot de perf bande (poids moyen, GMQ réel, IC réel,
 * mortalité, aliment courant) et expose :
 *
 *   - getNutritionPhase(poids)          → DEMARRAGE | CROISSANCE | FINITION | null
 *   - getDynamicAdvice(snapshot)        → DynamicAdvice[] (alertes contextuelles)
 *   - computeNutritionScore(snapshot)   → score /100 décomposé en 4 axes 25pts
 *
 * 100% pure functions : pas de fetch, pas de React, pas de Date.now().
 * Toutes les cibles proviennent de nutritionGuidelines.ts.
 */

import {
  GMQ_CIBLES,
  IC_CIBLES,
  MORTALITE_SEUILS_PCT,
  NUTRITION_TARGETS,
  type NutritionPhase,
} from './nutritionGuidelines';

// ─── Types publics ──────────────────────────────────────────────────────────

export interface BandePerfSnapshot {
  bandeId: string;
  /** Poids moyen courant (kg). null si pas mesuré récemment. */
  poidsMoyenKg: number | null;
  /** Poids initial au sevrage (kg). Toujours présent (V23 NOT NULL). */
  poidsInitialKg: number;
  /** Âge bande (jours depuis sevrage ou démarrage). */
  ageJours: number;
  /** GMQ réel calculé (grammes/jour). null si non calculable. */
  gmqGramsJour: number | null;
  /** IC réel = kg aliment / kg gain. null si non calculable. */
  icReel: number | null;
  /** Mortalité cumul % (0-100). */
  mortalitePct: number;
  /** Libellé aliment courant (ex: 'CROISSANCE'). null si non défini. */
  alimentCourant: string | null;
  /** % protéines de l'aliment courant si connu (pour scoring vs cible). */
  alimentProteinesPct?: number;
}

export interface DynamicAdvice {
  type: 'info' | 'warning' | 'critical';
  message: string;
  source: 'GMQ' | 'IC' | 'MORTALITE' | 'PROTEINES' | 'BASE';
}

export interface NutritionScoreBreakdown {
  /** Score total /100 */
  total: number;
  /** Sous-scores 0-25 chacun */
  proteines: number;
  gmq: number;
  ic: number;
  sante: number;
}

// ─── Constantes internes (toutes dérivées de nutritionGuidelines) ───────────

/** Score neutre (data manquante) sur un axe 25pts. */
const NEUTRAL_AXIS_SCORE = 12;
const MAX_AXIS_SCORE = 25;

// ─── Helpers privés ─────────────────────────────────────────────────────────

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// ─── API publique ───────────────────────────────────────────────────────────

/**
 * Détermine la phase nutritionnelle depuis le poids.
 * Renvoie null si poids manquant ou < 7 kg ou > 120 kg.
 */
export function getNutritionPhase(poidsMoyenKg: number | null): NutritionPhase | null {
  if (poidsMoyenKg === null) return null;
  if (poidsMoyenKg < NUTRITION_TARGETS.DEMARRAGE.poidsMinKg) return null;
  if (poidsMoyenKg > NUTRITION_TARGETS.FINITION.poidsMaxKg) return null;
  if (poidsMoyenKg <= NUTRITION_TARGETS.DEMARRAGE.poidsMaxKg) return 'DEMARRAGE';
  if (poidsMoyenKg <= NUTRITION_TARGETS.CROISSANCE.poidsMaxKg) return 'CROISSANCE';
  return 'FINITION';
}

/**
 * Conseils dynamiques (en plus des conseilsBase de la phase).
 * Inclut : alertes GMQ insuffisant, IC dégradé, mortalité élevée, déséquilibre protéines.
 * Ne renvoie QUE les advice contextuels (les conseilsBase sont gérés par le composant UI).
 */
export function getDynamicAdvice(snapshot: BandePerfSnapshot): DynamicAdvice[] {
  const phase = getNutritionPhase(snapshot.poidsMoyenKg);
  if (phase === null) return [];

  const advice: DynamicAdvice[] = [];
  const gmqCible = GMQ_CIBLES[phase];
  const icCible = IC_CIBLES[phase];
  const mortaliteSeuil = MORTALITE_SEUILS_PCT[phase];
  const targets = NUTRITION_TARGETS[phase];

  // ─── GMQ ──────────────────────────────────────────────────────────────────
  if (snapshot.gmqGramsJour !== null) {
    const gmq = snapshot.gmqGramsJour;
    if (gmq < 0.6 * gmqCible) {
      advice.push({
        type: 'critical',
        source: 'GMQ',
        message: `GMQ très bas — vérifier parasitisme et qualité ration.`,
      });
    } else if (gmq < 0.85 * gmqCible) {
      advice.push({
        type: 'warning',
        source: 'GMQ',
        message: `GMQ insuffisant (${Math.round(gmq)} g/j vs cible ${gmqCible}). Augmenter protéines ou vérifier santé.`,
      });
    }
  }

  // ─── IC ───────────────────────────────────────────────────────────────────
  if (snapshot.icReel !== null && snapshot.icReel > 1.2 * icCible) {
    advice.push({
      type: 'warning',
      source: 'IC',
      message: `IC dégradé (${round1(snapshot.icReel)} vs cible ${icCible}). Vérifier qualité ration.`,
    });
  }

  // ─── Mortalité ────────────────────────────────────────────────────────────
  if (snapshot.mortalitePct > mortaliteSeuil) {
    advice.push({
      type: 'warning',
      source: 'MORTALITE',
      message: `Mortalité ${round1(snapshot.mortalitePct)}% > seuil ${mortaliteSeuil}%. Vérifier conditions sanitaires, ajouter vit E + C.`,
    });
  }

  // ─── Protéines aliment courant ────────────────────────────────────────────
  if (typeof snapshot.alimentProteinesPct === 'number') {
    const pct = snapshot.alimentProteinesPct;
    if (pct < targets.proteinesPctMin) {
      advice.push({
        type: 'info',
        source: 'PROTEINES',
        message: `Protéines ${round1(pct)}% sous cible ${targets.proteinesPctMin}-${targets.proteinesPctMax}%. Envisager aliment plus riche.`,
      });
    } else if (pct > targets.proteinesPctMax) {
      advice.push({
        type: 'info',
        source: 'PROTEINES',
        message: `Protéines ${round1(pct)}% au-dessus de la plage ${targets.proteinesPctMin}-${targets.proteinesPctMax}%. Coût optimisable.`,
      });
    }
  }

  return advice;
}

/**
 * Score nutritionnel /100 = somme de 4 axes 25pts.
 *
 * - proteines (25) : 25 si alimentProteinesPct dans plage cible, dégradé linéaire ±2%, 0 si écart >5%. Si pas de data → 12 (neutre).
 * - gmq (25) : 25 si gmqGramsJour ≥ cible, dégradé linéaire jusqu'à 50% cible (0). Si null → 12.
 * - ic (25) : 25 si icReel ≤ cible, dégradé linéaire jusqu'à 1.5× cible (0). Si null → 12.
 * - sante (25) : 25 si mortalitePct ≤ seuil, 12 si entre seuil et 2× seuil, 0 sinon.
 *
 * total = arrondi à l'entier.
 */
export function computeNutritionScore(snapshot: BandePerfSnapshot): NutritionScoreBreakdown {
  const phase = getNutritionPhase(snapshot.poidsMoyenKg);

  // Si pas de phase déterminable → tous les axes sensibles à la phase sont neutres.
  if (phase === null) {
    const proteines = NEUTRAL_AXIS_SCORE;
    const gmq = NEUTRAL_AXIS_SCORE;
    const ic = NEUTRAL_AXIS_SCORE;
    const sante = NEUTRAL_AXIS_SCORE;
    return {
      total: Math.round(proteines + gmq + ic + sante),
      proteines,
      gmq,
      ic,
      sante,
    };
  }

  const targets = NUTRITION_TARGETS[phase];
  const gmqCible = GMQ_CIBLES[phase];
  const icCible = IC_CIBLES[phase];
  const mortaliteSeuil = MORTALITE_SEUILS_PCT[phase];

  // ─── Axe protéines ────────────────────────────────────────────────────────
  let proteines: number;
  if (typeof snapshot.alimentProteinesPct !== 'number') {
    proteines = NEUTRAL_AXIS_SCORE;
  } else {
    const pct = snapshot.alimentProteinesPct;
    let ecart: number;
    if (pct < targets.proteinesPctMin) ecart = targets.proteinesPctMin - pct;
    else if (pct > targets.proteinesPctMax) ecart = pct - targets.proteinesPctMax;
    else ecart = 0;
    if (ecart === 0) proteines = MAX_AXIS_SCORE;
    else if (ecart >= 5) proteines = 0;
    else {
      // Dégradé linéaire : 25 à ecart=0, 0 à ecart=5. ±2% = ~15.
      proteines = MAX_AXIS_SCORE * (1 - ecart / 5);
    }
  }

  // ─── Axe GMQ ──────────────────────────────────────────────────────────────
  let gmq: number;
  if (snapshot.gmqGramsJour === null) {
    gmq = NEUTRAL_AXIS_SCORE;
  } else if (snapshot.gmqGramsJour >= gmqCible) {
    gmq = MAX_AXIS_SCORE;
  } else {
    // Dégradé linéaire : 25 à 100%, 0 à 50% de la cible.
    const ratio = snapshot.gmqGramsJour / gmqCible; // 1.0 → 0.5
    const factor = clamp01((ratio - 0.5) / 0.5); // 1 si ratio>=1, 0 si ratio<=0.5
    gmq = MAX_AXIS_SCORE * factor;
  }

  // ─── Axe IC ───────────────────────────────────────────────────────────────
  let ic: number;
  if (snapshot.icReel === null) {
    ic = NEUTRAL_AXIS_SCORE;
  } else if (snapshot.icReel <= icCible) {
    ic = MAX_AXIS_SCORE;
  } else {
    // Dégradé linéaire : 25 à 1.0×, 0 à 1.5× cible.
    const ratio = snapshot.icReel / icCible; // 1.0 → 1.5
    const factor = clamp01(1 - (ratio - 1) / 0.5);
    ic = MAX_AXIS_SCORE * factor;
  }

  // ─── Axe santé (mortalité) ────────────────────────────────────────────────
  let sante: number;
  if (snapshot.mortalitePct <= mortaliteSeuil) {
    sante = MAX_AXIS_SCORE;
  } else if (snapshot.mortalitePct <= 2 * mortaliteSeuil) {
    sante = NEUTRAL_AXIS_SCORE;
  } else {
    sante = 0;
  }

  return {
    total: Math.round(proteines + gmq + ic + sante),
    proteines,
    gmq,
    ic,
    sante,
  };
}
