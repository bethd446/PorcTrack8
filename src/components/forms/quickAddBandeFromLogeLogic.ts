/**
 * quickAddBandeFromLogeLogic — Helpers purs pour création bande par loge.
 * ════════════════════════════════════════════════════════════════════════
 * Workflow simplifié 3 steps : sélection loge → effectif/poids → récap.
 * Toute la logique métier (auto-détection phase, génération code_id,
 * validation effectif/poids) est ici, hors React, pour tests purs.
 */

import type { Loge } from '../../types/farm';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BandePhaseAuto =
  | 'SOUS_MERE'
  | 'POST_SEVRAGE'
  | 'CROISSANCE'
  | 'ENGRAISSEMENT'
  | 'FINITION';

export interface PhaseAutoDetected {
  phase: BandePhaseAuto;
  /** Statut humain compatible avec les colonnes `batches.statut` historiques. */
  statut: 'Sous mère' | 'Sevrés' | 'Croissance' | 'Engraissement' | 'Finition';
  label: string;
}

export interface FromLogeDraft {
  effectif: string;
  poidsMoyenKg: string;
  dateEntree: string; // ISO yyyy-MM-dd
}

export interface FromLogeValidation {
  ok: boolean;
  errors: {
    effectif?: string;
    poidsMoyenKg?: string;
    dateEntree?: string;
  };
  values?: {
    effectif: number;
    poidsMoyenKg: number;
    dateEntree: string;
  };
}

// ─── Auto-détection phase selon poids ────────────────────────────────────────

/**
 * Détecte la phase biologique attendue pour des porcelets d'un poids moyen
 * donné. Ranges :
 *   - <7 kg     → Sous mère (maternité)
 *   - 7..25 kg  → Post-sevrage
 *   - 25..60 kg → Croissance
 *   - 60..90 kg → Engraissement
 *   - >=90 kg   → Finition
 */
export function detectPhaseFromPoids(poidsKg: number): PhaseAutoDetected {
  if (!Number.isFinite(poidsKg) || poidsKg < 7) {
    return { phase: 'SOUS_MERE', statut: 'Sous mère', label: 'Maternité (sous mère)' };
  }
  if (poidsKg < 25) {
    return { phase: 'POST_SEVRAGE', statut: 'Sevrés', label: 'Post-sevrage' };
  }
  if (poidsKg < 60) {
    return { phase: 'CROISSANCE', statut: 'Croissance', label: 'Croissance' };
  }
  if (poidsKg < 90) {
    return { phase: 'ENGRAISSEMENT', statut: 'Engraissement', label: 'Engraissement' };
  }
  return { phase: 'FINITION', statut: 'Finition', label: 'Finition' };
}

// ─── Génération code_id auto ─────────────────────────────────────────────────

/**
 * Génère un code_id unique de la forme `B-YYYYMMDD-{numero loge}`.
 * Espaces et `/` du numéro loge sont remplacés par `-`.
 */
export function generateBandeCodeId(
  date: string,
  logeNumero: string,
): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.exec(date);
  const ymd = iso ? iso[0].replace(/-/g, '') : date.replace(/[^0-9]/g, '');
  const safe = (logeNumero || 'X')
    .trim()
    .replace(/[\s/]+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();
  return `B-${ymd}-${safe}`;
}

// ─── Loges disponibles (filtrage) ────────────────────────────────────────────

/**
 * Filtre les loges actives ET libres (pas de logeId déjà occupée par une
 * bande active fournie en paramètre).
 *
 * @param loges Toutes les loges (actives + archivées)
 * @param occupiedLogeIds Set d'IDs de loges déjà occupées par une bande active
 */
export function selectAvailableLoges(
  loges: Loge[],
  occupiedLogeIds: ReadonlySet<string>,
): Loge[] {
  return loges
    .filter(l => l.active && !occupiedLogeIds.has(l.id))
    .sort((a, b) => a.numero.localeCompare(b.numero, 'fr', { numeric: true }));
}

// ─── Validation step 2 ───────────────────────────────────────────────────────

export function validateFromLogeStep2(
  draft: FromLogeDraft,
): FromLogeValidation {
  const errors: FromLogeValidation['errors'] = {};

  const effectifNum = Number(draft.effectif);
  if (!draft.effectif.trim()) {
    errors.effectif = 'Effectif requis';
  } else if (!Number.isFinite(effectifNum) || effectifNum < 1 || effectifNum > 200) {
    errors.effectif = 'Effectif doit être entre 1 et 200';
  } else if (!Number.isInteger(effectifNum)) {
    errors.effectif = 'Effectif doit être entier';
  }

  const poidsNum = Number(String(draft.poidsMoyenKg).replace(',', '.'));
  if (!draft.poidsMoyenKg.toString().trim()) {
    errors.poidsMoyenKg = 'Poids moyen requis';
  } else if (!Number.isFinite(poidsNum) || poidsNum < 0.5 || poidsNum > 200) {
    errors.poidsMoyenKg = 'Poids doit être entre 0.5 et 200 kg';
  }

  if (!draft.dateEntree.trim()) {
    errors.dateEntree = 'Date requise';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dateEntree)) {
    errors.dateEntree = 'Format ISO yyyy-mm-dd attendu';
  } else {
    const d = new Date(draft.dateEntree + 'T00:00:00Z');
    if (Number.isNaN(d.getTime())) {
      errors.dateEntree = 'Date invalide';
    } else {
      const todayUtc = new Date();
      todayUtc.setUTCHours(23, 59, 59, 999);
      if (d.getTime() > todayUtc.getTime()) {
        errors.dateEntree = 'Date future interdite';
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    errors: {},
    values: {
      effectif: effectifNum,
      poidsMoyenKg: poidsNum,
      dateEntree: draft.dateEntree,
    },
  };
}

// ─── Helper today ISO (utilitaire UI) ────────────────────────────────────────

export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
