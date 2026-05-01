/**
 * buildNutritionSnapshot — Assemble un BandePerfSnapshot pour nutritionAdvisor
 * ══════════════════════════════════════════════════════════════════════════
 * Sprint V23-S1.5 (Conseils Nutritionnels Intelligents).
 *
 * Pure function : composes services existants (growthAnalyzer, phaseEngine,
 * feedConsumptionAnalyzer) pour produire le snapshot consommé par
 * `getNutritionPhase` / `getDynamicAdvice` / `computeNutritionScore`.
 *
 * Stratégie de fallback :
 *   - GMQ : preférence à `computeBandeGrowthStats` si `weightLogs` (notes) fourni,
 *     sinon estimation linéaire (poidsMoyenKg - poidsInitialKg) / âge,
 *     sinon null.
 *   - IC réel : via `buildICReel` synchrone si `feedConsumptionLogs` fourni
 *     ET poidsMoyenKg + vivants connus, sinon null.
 *   - alimentCourant : via `determinerAliment(poidsMoyenKg)` si poids connu.
 *   - alimentProteinesPct : non extrait — FEED_CONFIG ne stocke pas le % brut.
 */

import { FARM_CONFIG } from '../config/farm';
import type { Note } from '../types';
import type { BandePorcelets } from '../types/farm';
import {
  buildICReel,
  type FeedConsoLog,
} from './feedConsumptionAnalyzer';
import { computeBandeGrowthStats } from './growthAnalyzer';
import type { BandePerfSnapshot } from './nutritionAdvisor';
import { determinerAliment } from './phaseEngine';

export interface BuildSnapshotContext {
  bande: BandePorcelets;
  /** Aujourd'hui (injectable pour tests). */
  today: Date;
  /** Saisies conso aliment (qty_kg + date_conso). Si fourni → calcul IC réel. */
  feedConsumptionLogs?: FeedConsoLog[];
  /**
   * Notes terrain de la bande (parsées par growthAnalyzer pour reconstituer
   * les pesées et calculer le GMQ). Si fourni et ≥ 2 pesées → GMQ pondéré.
   */
  weightLogs?: Note[];
}

/** Parse une date `dd/MM/yyyy` ou ISO `yyyy-MM-dd[...]`. */
function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Assemble un BandePerfSnapshot depuis les données existantes.
 * Pure : pas de fetch, pas de side-effect.
 */
export function buildNutritionSnapshot(
  ctx: BuildSnapshotContext,
): BandePerfSnapshot {
  const { bande, today, feedConsumptionLogs, weightLogs } = ctx;

  // ─── Champs simples ────────────────────────────────────────────────────────
  const poidsMoyenKg =
    typeof bande.poidsMoyenKg === 'number' ? bande.poidsMoyenKg : null;
  const poidsInitialKg = bande.poidsInitialKg;

  // ─── Âge bande ─────────────────────────────────────────────────────────────
  const startDate = parseDate(bande.dateMB);
  const ageJours = startDate ? Math.max(0, daysBetween(startDate, today)) : 0;

  // ─── Mortalité ─────────────────────────────────────────────────────────────
  const morts = bande.morts ?? 0;
  const vivants = bande.vivants ?? 0;
  const denom = Math.max(1, morts + vivants);
  const mortalitePct = (morts / denom) * 100;

  // ─── GMQ ───────────────────────────────────────────────────────────────────
  let gmqGramsJour: number | null = null;
  if (weightLogs && weightLogs.length > 0) {
    const stats = computeBandeGrowthStats(bande, weightLogs, today);
    if (stats.gmqMoyenGlobal > 0) gmqGramsJour = stats.gmqMoyenGlobal;
  }
  if (
    gmqGramsJour === null &&
    poidsMoyenKg !== null &&
    poidsMoyenKg > poidsInitialKg &&
    ageJours > 0
  ) {
    gmqGramsJour = Math.round(
      ((poidsMoyenKg - poidsInitialKg) * 1000) / ageJours,
    );
  }

  // ─── IC réel ───────────────────────────────────────────────────────────────
  let icReel: number | null = null;
  if (
    feedConsumptionLogs &&
    feedConsumptionLogs.length > 0 &&
    poidsMoyenKg !== null &&
    vivants > 0
  ) {
    const ic = buildICReel(
      { id: bande.id, vivants, poids_moyen_kg: poidsMoyenKg },
      feedConsumptionLogs,
    );
    if (ic.ic_reel > 0) icReel = ic.ic_reel;
  }

  // ─── Aliment courant ───────────────────────────────────────────────────────
  let alimentCourant: string | null = null;
  if (poidsMoyenKg !== null) {
    alimentCourant = determinerAliment(poidsMoyenKg);
  }

  // ─── Protéines aliment ─────────────────────────────────────────────────────
  // FARM_CONFIG.FEED_CONFIG ne stocke pas le `% protéines brutes` — on laisse
  // undefined (l'advisor traite ça comme axe neutre dans le scoring).
  // Hook futur : si jamais une formule expose `proteines_pct`, la lire ici.
  const alimentProteinesPct: number | undefined = (() => {
    if (!alimentCourant) return undefined;
    const cfg = (FARM_CONFIG.FEED_CONFIG as Record<string, unknown>)[
      alimentCourant
    ];
    if (
      cfg &&
      typeof cfg === 'object' &&
      'proteines_pct' in cfg &&
      typeof (cfg as { proteines_pct?: unknown }).proteines_pct === 'number'
    ) {
      return (cfg as { proteines_pct: number }).proteines_pct;
    }
    return undefined;
  })();

  return {
    bandeId: bande.id,
    poidsMoyenKg,
    poidsInitialKg,
    ageJours,
    gmqGramsJour,
    icReel,
    mortalitePct,
    alimentCourant,
    ...(alimentProteinesPct !== undefined ? { alimentProteinesPct } : {}),
  };
}
