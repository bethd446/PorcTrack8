/**
 * cycleTreatments — Classification visuelle urgent/normal/résolu
 * pour les cartes des sous-vues phase (Maternité, Post-sevrage,
 * Croissance, Engraissement, Finition).
 *
 * Critères :
 *   - urgent  : portée à moins de URGENT_THRESHOLD_DAYS de la prochaine
 *               transition (sevrage, transfert, sortie).
 *   - resolu  : portée déjà sortie / vendue / archivée.
 *   - normal  : autre.
 */

export type CycleTreatment = 'urgent' | 'normal' | 'resolu';

export type CyclePhaseKey =
  | 'maternite'
  | 'postsevr'
  | 'croiss'
  | 'engrais'
  | 'finition';

export const URGENT_THRESHOLD_DAYS = 14;

export const TREATMENT_RANK: Record<CycleTreatment, number> = {
  urgent: 0,
  normal: 1,
  resolu: 2,
};

export interface CycleCardClassifiable {
  /** Statut métier (bande / portée). */
  statut?: string;
  /** Jours écoulés depuis l'entrée dans la phase (ou âge total si pas d'autre repère). */
  dayInPhase: number | null;
  /** Durée totale de la phase en jours. */
  phaseDays: number;
  /** Override : nombre de jours restants avant la prochaine transition.
   *  Utile lorsque le calcul "phaseDays - dayInPhase" ne reflète pas la transition réelle
   *  (ex. Finition pilotée par poids). */
  daysToTransitionOverride?: number | null;
}

export function classifyCyclePhaseCard(
  item: CycleCardClassifiable,
  _today: Date,
  _phase: CyclePhaseKey,
): CycleTreatment {
  if (item.statut && /sortie|vendu|reform|recap|archive/i.test(item.statut)) {
    return 'resolu';
  }
  const remaining = computeRemaining(item);
  if (remaining !== null && remaining < URGENT_THRESHOLD_DAYS) return 'urgent';
  return 'normal';
}

export function computeRemaining(item: CycleCardClassifiable): number | null {
  if (item.daysToTransitionOverride !== undefined && item.daysToTransitionOverride !== null) {
    return Math.max(0, item.daysToTransitionOverride);
  }
  if (item.dayInPhase === null) return null;
  return Math.max(0, item.phaseDays - item.dayInPhase);
}

export interface TreatmentVisualStyle {
  border: string;
  background: string;
  opacity: number;
  eyebrowDot: string;
  eyebrowColor: string;
  titleSize: number;
  titleWeight: number;
  showAlertIcon: boolean;
}

export function getCycleTreatmentStyle(
  treatment: CycleTreatment,
  phaseTone: string,
): TreatmentVisualStyle {
  if (treatment === 'urgent') {
    return {
      border: '1px solid var(--color-pig-soft)',
      background: 'var(--bg-surface)',
      opacity: 1,
      eyebrowDot: 'var(--color-pig-deep, var(--color-pig))',
      eyebrowColor: 'var(--color-pig-deep, var(--color-pig))',
      titleSize: 18,
      titleWeight: 700,
      showAlertIcon: true,
    };
  }
  if (treatment === 'resolu') {
    return {
      border: '1px solid var(--line-2, var(--line))',
      background: 'var(--bg-surface-2, var(--bg-surface))',
      opacity: 0.65,
      eyebrowDot: phaseTone,
      eyebrowColor: 'var(--muted)',
      titleSize: 16,
      titleWeight: 600,
      showAlertIcon: false,
    };
  }
  return {
    border: '1px solid var(--line)',
    background: 'var(--bg-surface)',
    opacity: 1,
    eyebrowDot: phaseTone,
    eyebrowColor: 'var(--muted)',
    titleSize: 16,
    titleWeight: 600,
    showAlertIcon: false,
  };
}
