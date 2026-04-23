/**
 * bandAnalysisEngine — Façade unifiée d'analyse des bandes porcelets.
 * ═══════════════════════════════════════════════════════════════════
 *
 * Ce module est un **agrégateur de ré-exports** qui expose les fonctions
 * publiques des 4 services d'analyse sous 4 namespaces thématiques :
 *
 *   • `Bandes`   — classification phase + occupation loges (bandesAggregator)
 *   • `Growth`   — suivi croissance (pesées, GMQ, projection finition)
 *   • `Forecast` — prévisions 14j événements + pression maternité
 *   • `Perf`     — KPI de performance troupeau (GTTT)
 *
 * But : fournir un **unique point d'entrée** pour les écrans (Cockpit,
 * PilotageHub, CyclesHub, ForecastWidget, ForecastView) afin d'éviter
 * la duplication d'imports et les calculs redondants côté appelant.
 *
 * Contrat :
 *   - Zéro logique dupliquée : tout est ré-exporté via `typeof`.
 *   - Zéro coût runtime : les ré-exports sont de simples références.
 *   - Les imports directs existants continuent de fonctionner (non-breaking).
 *
 * Utilisation typique :
 *   ```ts
 *   import { Bandes, Growth, Forecast, Perf } from '@/services/bandAnalysisEngine';
 *
 *   const phase     = Bandes.computePhase(bande);
 *   const stats     = Growth.growthStats(bande, notes);
 *   const forecast  = Forecast.build({ truies, bandes, saillies });
 *   const sevres    = Perf.sevresParPortee(bandes, '30J');
 *   ```
 */

import {
  filterRealPortees,
  computeBandePhase,
  countBandesByPhase,
  logesMaterniteOccupation,
  logesPostSevrageOccupation,
  logesEngraissementOccupation,
  countSousMere,
  countSevres,
  countTruiesEnMaternite,
  countEngraissementBySex,
  bandesAEligibleSeparation,
} from './bandesAggregator';

import {
  parsePeseeFromNote,
  extractPeseesForBande,
  computeGMQ,
  gmqCibleForPhase,
  projectPoidsFinition,
  computeBandeGrowthStats,
} from './growthAnalyzer';

import { buildForecast, isoWeek } from './forecastAnalyzer';

import {
  computeGlobalKpis,
  rankTruiesByPerformance,
  detectTruiesAReformer,
  computeISSEMoyen,
  computeIEMMoyen,
  computeTauxMB,
  computeTauxRenouvellement,
  computeSevresParPortee,
  computeMortalitePorcelets,
  computeIndiceConso,
  computeCyclesReussis,
  getPeriodeDays,
} from './perfKpiAnalyzer';

// ─── Bandes — classification phase + occupation loges ───────────────────────

/**
 * Namespace `Bandes` — helpers portées/loges depuis `bandesAggregator`.
 *
 * Scope : filtrage portées réelles, classification phase (SOUS_MERE /
 * POST_SEVRAGE / ENGRAISSEMENT), comptage par phase, occupation des
 * 3 types de loges physiques (maternité, post-sevrage, engraissement).
 */
export const Bandes = {
  /** Exclut les lignes `RECAP` pour ne garder que les portées biologiques. */
  filterReal: filterRealPortees,
  /** Dérive la phase d'élevage d'une bande (SOUS_MERE / POST_SEVRAGE / ENGRAISSEMENT / INCONNU). */
  computePhase: computeBandePhase,
  /** Compte les bandes ventilées par phase (hors INCONNU). */
  countByPhase: countBandesByPhase,
  /** Occupation des loges de maternité (1 truie = 1 loge, capacité 9). */
  logesMaternite: logesMaterniteOccupation,
  /** Occupation des loges post-sevrage (capacité 4). */
  logesPostSevrage: logesPostSevrageOccupation,
  /** Occupation des loges croissance-finition (1 mâles, 1 femelles — capacité 2). */
  logesEngraissement: logesEngraissementOccupation,
  /** Nombre de portées sous mère + somme des porcelets vivants associés. */
  countSm: countSousMere,
  /** Nombre de portées sevrées (post-sevrage + engraissement) + porcelets. */
  countSv: countSevres,
  /** Nombre de truies actuellement en maternité (match statut "maternité"). */
  countTruiesMat: countTruiesEnMaternite,
  /** Ventilation engraissement par sexe (mâles / femelles / non-séparés). */
  countEngBySex: countEngraissementBySex,
  /** Bandes engraissement éligibles à la saisie d'une séparation par sexe. */
  eligibleSeparation: bandesAEligibleSeparation,
} as const;

// ─── Growth — suivi croissance (pesées + GMQ) ───────────────────────────────

/**
 * Namespace `Growth` — analyse de croissance depuis `growthAnalyzer`.
 *
 * Scope : parsing notes terrain (pesées), calcul GMQ inter-pesées,
 * synthèse complète d'une bande (pesées + alerte SOUS_CIBLE + projection
 * poids finition pour les bandes en ENGRAISSEMENT).
 */
export const Growth = {
  /** Calcule les GMQ (g/j) entre chaque paire de pesées consécutives. */
  gmq: computeGMQ,
  /** Synthèse complète d'une bande : pesées + GMQ moyen + alerte + projection. */
  growthStats: computeBandeGrowthStats,
  /** Projette le poids finition en kg (bandes en ENGRAISSEMENT). */
  projectFinition: projectPoidsFinition,
  /** Parse une note terrain en `PeseeRecord` (retourne null si pas une pesée). */
  parsePesee: parsePeseeFromNote,
  /** Extrait toutes les pesées d'une bande (triées ASC par date). */
  peseesForBande: extractPeseesForBande,
  /** Retourne la fourchette cible (min/max g/j) pour une phase. */
  cibleForPhase: gmqCibleForPhase,
} as const;

// ─── Forecast — prévisions 14 jours ─────────────────────────────────────────

/**
 * Namespace `Forecast` — prévisions d'événements depuis `forecastAnalyzer`.
 *
 * Scope : construction du rapport 14j (événements MB / sevrages / retours
 * chaleur / finitions / saturations) + pression maternité par semaine ISO
 * sur 4 semaines.
 */
export const Forecast = {
  /** Construit le rapport de prévisions (défaut : horizon 14 jours). */
  build: buildForecast,
  /** Retourne le code ISO 8601 "YYYY-Www" pour une date donnée. */
  week: isoWeek,
} as const;

// ─── Perf — KPI performance troupeau (GTTT) ─────────────────────────────────

/**
 * Namespace `Perf` — KPI de performance depuis `perfKpiAnalyzer`.
 *
 * Scope : KPI globaux (sevrés/truie/an, NV moyen, ISSE, IEM, taux MB,
 * renouvellement), classement top/flop des truies, détection des candidates
 * à la réforme, et sparklines Pilotage (sevrés/portée, mortalité, IC,
 * cycles réussis) sur 4 périodes (7J / 30J / 90J / 1A).
 */
export const Perf = {
  /** Sparkline "sevrés par portée" sur une période donnée. */
  sevresParPortee: computeSevresParPortee,
  /** Sparkline "mortalité porcelets %" sur une période donnée. */
  mortalite: computeMortalitePorcelets,
  /** Sparkline "indice de consommation" sur une période donnée. */
  indiceConso: computeIndiceConso,
  /** Sparkline "% cycles réussis" sur une période donnée. */
  cyclesReussis: computeCyclesReussis,
  /** Agrégat des KPI globaux du troupeau (sevrés/truie/an, ISSE, IEM, taux MB…). */
  globalKpis: computeGlobalKpis,
  /** Top 3 / flop 3 des truies par score composite. */
  ranking: rankTruiesByPerformance,
  /** Détection des truies candidates à la réforme (perf / inactivité / ISSE). */
  aReformer: detectTruiesAReformer,
  /** ISSE moyen troupeau (Intervalle Sevrage-Saillie, j). */
  isseMoyen: computeISSEMoyen,
  /** IEM moyen troupeau (Intervalle Entre Mise-Bas, j). */
  iemMoyen: computeIEMMoyen,
  /** Taux MB (%) : MB effectives / saillies sur 12 mois. */
  tauxMB: computeTauxMB,
  /** Taux de renouvellement (%) : 1res portées < 12 mois / total truies. */
  tauxRenouvellement: computeTauxRenouvellement,
  /** Nombre de jours couvert par une clé de période ('7J' → 7, etc.). */
  periodeDays: getPeriodeDays,
} as const;
