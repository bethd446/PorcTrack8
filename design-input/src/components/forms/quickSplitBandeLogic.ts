/**
 * quickSplitBandeLogic — Logique pure du splitter de bande (V36-E P3).
 * ════════════════════════════════════════════════════════════════════════
 * Splitter une bande "ADDM" sans loge en plusieurs sous-bandes :
 *   1. Sélection des porcelets à déplacer
 *   2. Choix loge destination (avec contrôle capacité)
 *   3. Récap → INSERT batch + UPDATE porcelets.batch_id
 *
 * Toute la logique métier (validation, code_id, phase auto via poids moyen)
 * est ici, hors React, pour tests purs.
 */

import type {
  Loge,
  PorceletIndividuel,
} from '../../types/farm';
import {
  detectPhaseFromPoids,
  generateBandeCodeId,
  type PhaseAutoDetected,
} from './quickAddBandeFromLogeLogic';

// ─── Step 1 — Sélection ──────────────────────────────────────────────────────

export interface Step1Validation {
  ok: boolean;
  error?: string;
}

/**
 * Step 1 : au moins un porcelet sélectionné, et au moins un porcelet doit
 * rester dans la bande source (sinon on perd le code_id source pour rien).
 */
export function validateSplitStep1(
  selectedIds: ReadonlyArray<string>,
  totalPorcelets: number,
): Step1Validation {
  if (selectedIds.length === 0) {
    return { ok: false, error: 'Sélectionne au moins un porcelet' };
  }
  if (selectedIds.length > totalPorcelets) {
    return { ok: false, error: 'Sélection invalide' };
  }
  return { ok: true };
}

// ─── Step 2 — Loge destination ───────────────────────────────────────────────

export interface Step2Validation {
  ok: boolean;
  error?: string;
}

/**
 * Step 2 : loge sélectionnée + capacité non dépassée.
 *
 * @param loge Loge cible (déjà filtrée par active=true en amont)
 * @param currentOccupation Nombre actuel d'animaux dans la loge
 * @param toAdd Nombre de porcelets à transférer
 */
export function validateSplitStep2(
  loge: Loge | null,
  currentOccupation: number,
  toAdd: number,
): Step2Validation {
  if (!loge) {
    return { ok: false, error: 'Choisis une loge destination' };
  }
  if (loge.capaciteMax != null) {
    const after = currentOccupation + toAdd;
    if (after > loge.capaciteMax) {
      return {
        ok: false,
        error: `Capacité dépassée (${after}/${loge.capaciteMax})`,
      };
    }
  }
  return { ok: true };
}

// ─── Phase auto via poids moyen des porcelets sélectionnés ───────────────────

/**
 * Calcule le poids moyen des porcelets sélectionnés (en kg). Ignore les
 * porcelets sans poids saisi. Retourne `null` si aucun porcelet n'a de poids.
 */
export function computePoidsMoyen(
  porcelets: ReadonlyArray<PorceletIndividuel>,
): number | null {
  const withWeight = porcelets.filter(p => typeof p.poidsCourantKg === 'number');
  if (withWeight.length === 0) return null;
  const sum = withWeight.reduce((acc, p) => acc + (p.poidsCourantKg ?? 0), 0);
  return sum / withWeight.length;
}

/**
 * Auto-détecte la phase d'une bande issue d'un split, via le poids moyen
 * des porcelets sélectionnés. Si aucun poids → fallback POST_SEVRAGE
 * (cas le plus probable pour une bande ADDM partiellement sevrée).
 */
export function autoDetectSplitPhase(
  porcelets: ReadonlyArray<PorceletIndividuel>,
): PhaseAutoDetected {
  const moyen = computePoidsMoyen(porcelets);
  if (moyen == null) {
    return {
      phase: 'POST_SEVRAGE',
      statut: 'Sevrés',
      label: 'Post-sevrage',
    };
  }
  return detectPhaseFromPoids(moyen);
}

// ─── Génération code_id ──────────────────────────────────────────────────────

/**
 * Génère un code_id pour la bande issue du split.
 * Format identique à V25-WORKFLOW : `B-YYYYMMDD-{logeNumero}`.
 */
export function generateSplitCodeId(
  date: string,
  logeNumero: string,
): string {
  return generateBandeCodeId(date, logeNumero);
}

// ─── Build draft payload (pour insertBatch) ──────────────────────────────────

export interface SplitBatchDraft {
  code_id: string;
  loge_id: string;
  porcelets_nes_vivants: number;
  porcelets_nes_total: number;
  poids_initial_kg: number;
  poids_moyen_kg: number;
  statut: string;
  phase: string;
  validation_status: 'VALIDATED';
  sow_id: null;
  date_mise_bas: string;
  notes: string;
}

/**
 * Construit le payload d'INSERT pour la nouvelle bande issue du split.
 * sow_id = null (multi-mères potentiel, pas de truie unique de référence).
 * date_mise_bas = aujourd'hui (jour du split — c'est une nouvelle entité).
 */
export function buildSplitBatchDraft(args: {
  todayIso: string;
  loge: Loge;
  selectedPorcelets: ReadonlyArray<PorceletIndividuel>;
  sourceCodeId: string;
}): SplitBatchDraft {
  const phase = autoDetectSplitPhase(args.selectedPorcelets);
  const moyen = computePoidsMoyen(args.selectedPorcelets) ?? 0;
  const code_id = generateSplitCodeId(args.todayIso, args.loge.numero);
  const count = args.selectedPorcelets.length;
  return {
    code_id,
    loge_id: args.loge.id,
    porcelets_nes_vivants: count,
    porcelets_nes_total: count,
    poids_initial_kg: moyen > 0 ? Number(moyen.toFixed(2)) : 0,
    poids_moyen_kg: moyen > 0 ? Number(moyen.toFixed(2)) : 0,
    statut: phase.statut,
    phase: phase.phase,
    validation_status: 'VALIDATED',
    sow_id: null,
    date_mise_bas: args.todayIso,
    notes: `Split de ${args.sourceCodeId} (${count} porcelets)`,
  };
}
