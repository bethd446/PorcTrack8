/**
 * nutritionGuidelines — Tables statiques de référence nutritionnelle
 * ══════════════════════════════════════════════════════════════════
 * Référentiel par phase nutritionnelle (3 niveaux dérivés du poids,
 * indépendants des 5 phases biologiques POST_SEVRAGE/CROISSANCE/
 * ENGRAISSEMENT/FINITION/SORTIE de phaseEngine).
 *
 * Sert de source unique pour les targets utilisés par nutritionAdvisor :
 * plages protéines/lysine/calcium/phosphore, vitamines clés, GMQ/IC cibles,
 * seuil mortalité, conseils statiques de base.
 *
 * Aucune dépendance React — purement déclaratif.
 */

export type NutritionPhase = 'DEMARRAGE' | 'CROISSANCE' | 'FINITION';

export interface NutrientTargets {
  /** Plage protéines brutes % (ex: 18 à 20) */
  proteinesPctMin: number;
  proteinesPctMax: number;
  /** Plage lysine % */
  lysinePctMin: number;
  lysinePctMax: number;
  /** Calcium % (valeur cible) */
  calciumPct: number;
  /** Phosphore % (valeur cible) */
  phosphorePct: number;
  /** Vitamines clés à privilégier (codes courts ex: 'A', 'D3', 'E', 'B-complex') */
  vitaminesCles: string[];
  /** Plage poids kg de la phase nutritionnelle */
  poidsMinKg: number;
  poidsMaxKg: number;
  /** Objectif terrain (1 phrase) */
  objectif: string;
  /** Conseils statiques de base (3 par phase) — affichés en permanence */
  conseilsBase: string[];
}

export const NUTRITION_TARGETS: Record<NutritionPhase, NutrientTargets> = {
  DEMARRAGE: {
    proteinesPctMin: 18,
    proteinesPctMax: 20,
    lysinePctMin: 1.3,
    lysinePctMax: 1.5,
    calciumPct: 0.8,
    phosphorePct: 0.6,
    vitaminesCles: ['A', 'D3', 'E', 'B-complex'],
    poidsMinKg: 7,
    poidsMaxKg: 25,
    objectif: 'Développement rapide + immunité',
    conseilsBase: [
      'Augmenter les protéines si croissance lente',
      "Vérifier qualité de l'aliment (digestibilité)",
      'Attention au stress post-sevrage',
    ],
  },
  CROISSANCE: {
    proteinesPctMin: 16,
    proteinesPctMax: 18,
    lysinePctMin: 1.0,
    lysinePctMax: 1.2,
    calciumPct: 0.7,
    phosphorePct: 0.5,
    vitaminesCles: ['A', 'D3', 'E'],
    poidsMinKg: 25,
    poidsMaxKg: 60,
    objectif: 'Gain de masse musculaire',
    conseilsBase: [
      "Optimiser l'équilibre énergie/protéines",
      'Surveiller le GMQ',
      'Éviter surpopulation',
    ],
  },
  FINITION: {
    proteinesPctMin: 14,
    proteinesPctMax: 16,
    lysinePctMin: 0.7,
    lysinePctMax: 0.9,
    calciumPct: 0.6,
    phosphorePct: 0.4,
    vitaminesCles: ['E', 'A'],
    poidsMinKg: 60,
    poidsMaxKg: 120,
    objectif: 'Prise de poids rapide à coût maîtrisé',
    conseilsBase: [
      'Augmenter énergie (maïs)',
      'Réduire protéines pour optimiser coût',
      'Surveiller indice de consommation',
    ],
  },
};

/** Cible GMQ moyenne g/j par phase nutritionnelle (utilisé pour scoring). */
export const GMQ_CIBLES: Record<NutritionPhase, number> = {
  DEMARRAGE: 350,
  CROISSANCE: 700,
  FINITION: 850,
};

/** Cible IC (kg aliment / kg gain) par phase. */
export const IC_CIBLES: Record<NutritionPhase, number> = {
  DEMARRAGE: 1.6,
  CROISSANCE: 2.5,
  FINITION: 3.0,
};

/** Seuil mortalité acceptable % par phase (au-dessus = alerte). */
export const MORTALITE_SEUILS_PCT: Record<NutritionPhase, number> = {
  DEMARRAGE: 3,
  CROISSANCE: 2,
  FINITION: 1.5,
};
