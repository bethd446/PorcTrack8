/**
 * FEED_CONFIG — Phases d'alimentation truie reproductrice + repères croissance.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Source de vérité pour :
 *  - Ration recommandée par phase repro (kg/jour) — base technicien K13.
 *  - Référence d'aliment associé (croisement avec produits_aliments / formules).
 *  - Bornes journalières post-saillie pour calculer la phase courante d'une truie.
 *
 * Phases truie repro (modèle 28 j lactation — gestation 115 j) :
 *   - TRUIE_FLUSHING       : 5 jours avant saillie (montée plan d'alim).
 *   - TRUIE_GESTATION      : J21 → J108 post-saillie.
 *   - TRUIE_GESTATION_TARD : J109 → J114 (peri-MB, ration descendante).
 *   - TRUIE_LACTATION      : J0 → J28 post-mise-bas.
 *   - TRUIE_TARIE          : J0 → J5 post-sevrage (ration basse, redémarrage).
 *
 * Phases porcelets / engraissement reprises de aliments.ts (codes croisés).
 *
 * Helpers : voir `src/services/rationCalculator.ts`
 *   - getCurrentReproPhase(truie, today) → FeedPhaseCode | null
 *   - getRecommendedRation(truie, today) → number (kg/j)
 */

export type FeedPhaseCode =
  | 'DEMARRAGE_1'
  | 'DEMARRAGE_2'
  | 'CROISSANCE'
  | 'FINITION'
  | 'TRUIE_FLUSHING'
  | 'TRUIE_GESTATION'
  | 'TRUIE_GESTATION_TARD'
  | 'TRUIE_LACTATION'
  | 'TRUIE_TARIE';

export interface FeedPhaseConfig {
  /** Libellé court FR pour UI. */
  label: string;
  /** Description longue (ex. fenêtre temporelle). */
  description?: string;
  /** Ration journalière recommandée (kg/jour) — référence technicien. */
  ration_kg_j: number;
  /** Référence aliment (libellé attendu ou code formule). */
  aliment_ref: string;
}

/**
 * Configuration centrale par phase. La ration_kg_j est la valeur recommandée
 * pour un sujet adulte standard (truie 180-220 kg pour les phases repro).
 */
export const FEED_CONFIG: Record<FeedPhaseCode, FeedPhaseConfig> = {
  DEMARRAGE_1: {
    label: 'Démarrage 1 (post-sevrage)',
    description: 'J21 → J42 post-naissance, 7-15 kg',
    ration_kg_j: 0.5,
    aliment_ref: 'Porcelets démarrage 1',
  },
  DEMARRAGE_2: {
    label: 'Démarrage 2',
    description: '> J42, 15-25 kg',
    ration_kg_j: 1.2,
    aliment_ref: 'Porcelets démarrage 2',
  },
  CROISSANCE: {
    label: 'Croissance',
    description: '25-50 kg',
    ration_kg_j: 2.0,
    aliment_ref: 'Croissance',
  },
  FINITION: {
    label: 'Finition',
    description: '50-100 kg',
    ration_kg_j: 2.8,
    aliment_ref: 'Finition',
  },
  TRUIE_FLUSHING: {
    label: 'Flushing pré-saillie (3-5j)',
    description: 'Ration boostée pour stimuler ovulation',
    ration_kg_j: 4.0,
    aliment_ref: 'Truie standard premium',
  },
  TRUIE_GESTATION: {
    label: 'Gestation (J21-J108)',
    description: 'Phase principale de gestation, ration stable',
    ration_kg_j: 2.5,
    aliment_ref: 'Truie gestante',
  },
  TRUIE_GESTATION_TARD: {
    label: 'Gestation tardive (J109-J114)',
    description: 'Peri mise-bas, ration descendante',
    ration_kg_j: 2.0,
    aliment_ref: 'Truie gestante',
  },
  TRUIE_LACTATION: {
    label: 'Lactation (J0-J28 post-MB)',
    description: 'Maternité, ration ad libitum',
    ration_kg_j: 6.0,
    aliment_ref: 'Truie allaitante',
  },
  TRUIE_TARIE: {
    label: 'Post-sevrage (J0-J5)',
    description: 'Reprise plan d\'alim après sevrage, avant flushing',
    ration_kg_j: 2.0,
    aliment_ref: 'Truie standard',
  },
};

/** Codes phase repro uniquement — utilisés pour fiche truie. */
export const REPRO_PHASE_CODES: readonly FeedPhaseCode[] = [
  'TRUIE_FLUSHING',
  'TRUIE_GESTATION',
  'TRUIE_GESTATION_TARD',
  'TRUIE_LACTATION',
  'TRUIE_TARIE',
];

/** Seuil d'écart absolu (kg) au-delà duquel on signale un écart de ration. */
export const RATION_ECART_SEUIL_KG = 0.5;
