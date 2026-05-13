/**
 * bandeRationPlan — Plan d'alimentation recommandé pour une bande
 * ────────────────────────────────────────────────────────────────────────────
 * Calcule la phase alimentaire actuelle d'une bande (depuis son poids moyen),
 * la ration journalière recommandée par porcelet (kg/j) et l'estimation du
 * coût aliment journalier total pour la bande.
 *
 * Décision produit Christophe 2026-05-13 :
 *   25 kg → Croissance · 50 kg → Engraissement · 80 kg → Finition · 110 kg → Sortie
 *   Objectif : 100 kg en 5-6 mois (150-180 jours).
 *
 * Bascule depuis FARM_CONFIG.FEED_CONFIG (formules + conso moyenne + coûts).
 */

import { FARM_CONFIG } from '../config/farm';
import type { BandePorcelets } from '../types/farm';

type FeedPhase = keyof typeof FARM_CONFIG.FEED_CONFIG;

export interface BandeRationPlan {
  /** Phase identifiée par le poids moyen (DEMARRAGE_1, ..., FINITION). */
  phase: FeedPhase;
  /** Label utilisateur de la phase. */
  phaseLabel: string;
  /** Poids moyen utilisé pour le calcul (kg). */
  poidsMoyenKg: number;
  /** Ration journalière recommandée par animal (kg/j). */
  rationParAnimalKgJ: number;
  /** Effectif vivant de la bande (porcelets restants). */
  effectif: number;
  /** Conso totale journalière pour la bande entière (kg/j). */
  consoTotaleKgJ: number;
  /** Coût aliment journalier estimé en FCFA. */
  coutJournalierFCFA: number;
  /** Estimation jours restants pour atteindre 100kg (objectif vente). */
  joursRestantsVente: number | null;
}

const FALLBACK_POIDS_PAR_PHASE: Record<string, number> = {
  SOUS_MERE: 5,
  POST_SEVRAGE: 12,
  CROISSANCE: 40,
  ENGRAISSEMENT: 65,
  FINITION: 95,
};

/**
 * Identifie la phase alimentaire (clé FEED_CONFIG) selon le poids moyen.
 */
export function feedPhaseFromPoids(poidsMoyenKg: number): FeedPhase {
  const cfg = FARM_CONFIG.FEED_CONFIG;
  if (poidsMoyenKg <= cfg.DEMARRAGE_1.poids_max_kg) return 'DEMARRAGE_1';
  if (poidsMoyenKg <= cfg.DEMARRAGE_2.poids_max_kg) return 'DEMARRAGE_2';
  if (poidsMoyenKg <= cfg.CROISSANCE.poids_max_kg) return 'CROISSANCE';
  return 'FINITION';
}

/**
 * Estime le poids moyen depuis le poids enregistré OU depuis la phase.
 */
function estimerPoidsMoyen(bande: BandePorcelets): number {
  // Cast wide pour accepter les variations de schéma TS sans casser.
  const b = bande as unknown as { poidsMoyenKg?: number; poids_moyen?: number; phase?: string };
  if (typeof b.poidsMoyenKg === 'number' && b.poidsMoyenKg > 0) return b.poidsMoyenKg;
  if (typeof b.poids_moyen === 'number' && b.poids_moyen > 0) return b.poids_moyen;
  const phase = b.phase ?? '';
  return FALLBACK_POIDS_PAR_PHASE[phase] ?? 12;
}

/**
 * Effectif vivant de la bande (porcelets restants).
 */
function estimerEffectif(bande: BandePorcelets): number {
  const b = bande as unknown as {
    nbVivants?: number;
    porceletsVivants?: number;
    nesVivants?: number;
    nb_vivants?: number;
  };
  return b.nbVivants ?? b.porceletsVivants ?? b.nesVivants ?? b.nb_vivants ?? 0;
}

/**
 * Calcule le plan ration recommandé pour une bande.
 */
export function getBandeRationPlan(bande: BandePorcelets): BandeRationPlan {
  const poidsMoyenKg = estimerPoidsMoyen(bande);
  const effectif = estimerEffectif(bande);
  const phase = feedPhaseFromPoids(poidsMoyenKg);
  const phaseLabel = FARM_CONFIG.FEED_CONFIG[phase].label;
  const consoConfig = FARM_CONFIG.FINANCE_CONFIG.CONSO_MOYENNE_J;
  // CONSO_MOYENNE_J n'a pas TRUIE_*, on ne couvre que DEMARRAGE_1..FINITION.
  const rationParAnimalKgJ =
    phase === 'DEMARRAGE_1' || phase === 'DEMARRAGE_2' || phase === 'CROISSANCE' || phase === 'FINITION'
      ? consoConfig[phase]
      : 1.5;
  const consoTotaleKgJ = rationParAnimalKgJ * effectif;
  const coutAliment = FARM_CONFIG.FINANCE_CONFIG.COUT_ALIMENT_KG;
  const coutKg = (coutAliment as Record<string, number>)[phase] ?? 400;
  const coutJournalierFCFA = Math.round(consoTotaleKgJ * coutKg);

  // Estimation jours restants pour atteindre 100 kg.
  // Approximation : GMQ moyen 700 g/j en post-sevrage, 900 g/j en croissance/finition.
  const gmqEstime = poidsMoyenKg < 25 ? 0.5 : 0.85;
  const kgRestants = Math.max(0, 100 - poidsMoyenKg);
  const joursRestantsVente = poidsMoyenKg >= 100 ? 0 : Math.round(kgRestants / gmqEstime);

  return {
    phase,
    phaseLabel,
    poidsMoyenKg,
    rationParAnimalKgJ,
    effectif,
    consoTotaleKgJ,
    coutJournalierFCFA,
    joursRestantsVente,
  };
}
