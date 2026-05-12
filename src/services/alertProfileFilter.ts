/**
 * alertProfileFilter — V80 / v3.4.4
 * Mapping ruleId-prefix → FarmProfile[] applicables.
 *
 * Spec PLAN_PROFIL_MULTI.md §5.3 — les priorités /today doivent être filtrées
 * par profil ferme pour éviter qu'un engraisseur voie "Mise-Bas Imminente —
 * T-022" ou un naisseur voie "Lot prêt abattoir".
 *
 * Stratégie : on identifie chaque alerte par son préfixe d'id (cf.
 * alertEngine.alertId(prefix, …)) plutôt que d'ajouter un champ
 * `applicableProfiles` au type `FarmAlert` — moins invasif, ne casse aucun
 * test fixture, reste cohérent avec les exports actuels.
 *
 * Fallback : profil inconnu → toutes profils (sécurité, pas de friction).
 */

import type { FarmProfile } from '../lib/farmProfile';

const ALL_PROFILES: FarmProfile[] = ['naisseur', 'engraisseur', 'cycle_complet'];
const NAISSEUR_ONLY: FarmProfile[] = ['naisseur', 'cycle_complet'];
const ENGRAISSEUR_ONLY: FarmProfile[] = ['engraisseur', 'cycle_complet'];

/**
 * Retourne les profils ferme pour lesquels une alerte est pertinente.
 *
 * Préfixes id (cf. alertEngine.ts) :
 *   - MB / SEV / CHA / ECH / RSA / RSV / REF / ORPH / REG → naisseur uniquement
 *   - phase-poids- / sortie- → engraisseur uniquement (R15/R16)
 *   - MORT / STK / VET / PES / retard → transverses (tous profils)
 */
export function getAlertApplicableProfiles(alert: { id: string }): FarmProfile[] {
  const id = alert.id;

  // R15 Passage phase poids (PROD → ENGRAISSEMENT/FINITION) → engraisseur
  if (id.startsWith('phase-poids-')) return ENGRAISSEUR_ONLY;
  // R16 Sortie abattoir (poids ≥ 110 kg) → engraisseur
  if (id.startsWith('sortie-')) return ENGRAISSEUR_ONLY;
  // Items générés localement par TodayV70 (fallback bandes + reform) → naisseur
  if (id.startsWith('mb-')) return NAISSEUR_ONLY;
  if (id.startsWith('reform-suggest-')) return NAISSEUR_ONLY;
  if (id.startsWith('reform-action-')) return NAISSEUR_ONLY;

  const prefix = id.split('-')[0];
  switch (prefix) {
    // Cycle reproductif — naisseur uniquement
    case 'MB':    // R1 Mise-Bas Imminente
    case 'SEV':   // R2 Sevrage à faire
    case 'CHA':   // R3 Retour chaleur
    case 'REG':   // R6 Regroupement bandes sevrables
    case 'ECH':   // R7 Échographie
    case 'RSA':   // R8 Re-Saillie proactive
    case 'RSV':   // R9 Rappel mensuel sevrage
    case 'REF':   // R11 Réforme perf (basée sur cycles)
    case 'ORPH':  // R14 Portée orpheline
      return NAISSEUR_ONLY;

    // Transverses — toutes profils
    case 'MORT':  // R4 Mortalité (>15%)
    case 'STK':   // R5 Stock aliment
    case 'VET':   // R5b Stock véto
    case 'PES':   // R13 Manque pesée
    case 'retard': // Retard phase générique
      return ALL_PROFILES;

    // Profil inconnu → tous (sécurité)
    default:
      return ALL_PROFILES;
  }
}

/**
 * Filtre une liste d'alertes selon le profil ferme courant.
 *
 * Générique pour accepter aussi bien `FarmAlert[]` venant d'alertEngine que
 * les `AlertItem[]` locaux de TodayV70 (qui partagent juste le champ `id`).
 */
export function filterAlertsByProfile<T extends { id: string }>(
  alerts: T[],
  profile: FarmProfile,
): T[] {
  return alerts.filter(a => getAlertApplicableProfiles(a).includes(profile));
}
