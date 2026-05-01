/**
 * Pilotage delta — comparaison vs estimation précédente
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Stocke un snapshot des KPIs financiers du `/pilotage` dans kvStore et
 * permet de comparer la valeur courante à la valeur précédente capturée.
 *
 * Pourquoi : sans historique multi-périodes côté backend, on offre quand
 * même une lecture "vs avant" en stockant le dernier calcul localement.
 */

import { kvGet, kvSet } from '../services/kvStore';

export interface PilotageSnapshot {
  margeGlobaleEstimee: number;
  totalRevenuProjete: number;
  totalCoutAlimentaire: number;
  totalCoutFixe: number;
  tauxMortaliteMoyen: number;
  capturedAt: number;
}

const KEY = 'pilotage_snapshot_previous';

export function loadPreviousSnapshot(): PilotageSnapshot | null {
  const raw = kvGet(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PilotageSnapshot;
    if (
      typeof parsed.margeGlobaleEstimee === 'number' &&
      typeof parsed.capturedAt === 'number'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function captureCurrentSnapshot(
  values: Omit<PilotageSnapshot, 'capturedAt'>,
): void {
  const snapshot: PilotageSnapshot = {
    ...values,
    capturedAt: Date.now(),
  };
  void kvSet(KEY, JSON.stringify(snapshot));
}

export interface DeltaResult {
  diff: number;
  pct: number;
  direction: 'up' | 'down' | 'flat';
}

export function computeDelta(
  current: number,
  previous: number | undefined | null,
): DeltaResult | null {
  if (previous == null || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  const diff = current - previous;
  const pct = (diff / Math.abs(previous)) * 100;
  return {
    diff,
    pct,
    direction: Math.abs(pct) < 0.5 ? 'flat' : pct > 0 ? 'up' : 'down',
  };
}

export function formatDeltaPct(
  d: DeltaResult | null,
  format: 'percent' | 'currency' = 'percent',
): string | null {
  if (!d) return null;
  if (d.direction === 'flat') return 'stable';
  const sign = d.pct > 0 ? '+' : '';
  return format === 'percent'
    ? `${sign}${d.pct.toFixed(1)}%`
    : `${sign}${Math.round(d.diff).toLocaleString('fr-FR')} FCFA`;
}

export function deltaSinceLabel(
  snapshot: PilotageSnapshot | null,
): string | null {
  if (!snapshot) return null;
  const days = Math.floor((Date.now() - snapshot.capturedAt) / 86400000);
  if (days < 1) return "depuis tout à l'heure";
  if (days < 7) return `depuis ${days}j`;
  if (days < 14) return 'la semaine dernière';
  return `il y a ${Math.floor(days / 7)} sem.`;
}

/**
 * Pour un KPI où "down" est positif (mortalité, coûts), inverser la
 * direction sémantique. Retourne 'up' / 'down' / 'neutral' à passer
 * comme trendDir au KpiCardV6.
 */
export type SemanticPolarity = 'higher-better' | 'lower-better' | 'neutral';

export function semanticTrendDir(
  d: DeltaResult | null,
  polarity: SemanticPolarity,
): 'up' | 'down' | 'neutral' {
  if (!d || d.direction === 'flat') return 'neutral';
  if (polarity === 'neutral') return 'neutral';
  const isGood =
    polarity === 'higher-better'
      ? d.direction === 'up'
      : d.direction === 'down';
  return isGood ? 'up' : 'down';
}
