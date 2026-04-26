/**
 * phaseEngine — Moteur de détection des transitions de phase biologiques.
 *
 * Principe :
 *   computePhaseTerrain() calcule la phase biologiquement attendue
 *   uniquement par l'âge depuis la mise-bas (jamais le statut GAS).
 *
 *   detectPendingTransitions() compare phaseTerrain vs phaseDeclaree
 *   (computeBandePhase, qui respecte le statut explicite).
 *   Si terrain > declaree → transition en attente.
 */

import { FARM_CONFIG } from '../config/farm';
import { computeBandePhase, type BandePhase } from './bandesAggregator';
import type { BandePorcelets } from '../types/farm';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PhaseAvecSortie = BandePhase | 'SORTIE';

export interface PendingTransition {
  /** ID de la bande concernée. */
  bandeId: string;
  /** Label court pour l'UI (idPortee ou id). */
  label: string;
  /** Phase actuelle déclarée. */
  fromPhase: BandePhase;
  /** Phase cible suggérée. */
  toPhase: PhaseAvecSortie;
  /** Âge de la bande en jours (depuis dateMB), ou null si dateMB absente. */
  ageJours: number | null;
  /** Poids estimé en kg, null si non applicable. */
  poidsEstimeKg: number | null;
  /** Référence vers la bande pour faciliter la confirmation. */
  bande: BandePorcelets;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse "DD/MM/YYYY" ou "YYYY-MM-DD" → Date | null. */
function parseDateFr(s: string | undefined): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(+fr[3], +fr[2] - 1, +fr[1]);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return null;
}

function floorDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

// ─── Seuils (dérivés de FARM_CONFIG, aucune valeur hardcodée) ─────────────

function seuils() {
  const PS  = FARM_CONFIG.SEVRAGE_AGE_JOURS;                          // 28
  const CR  = PS + FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS;             // 63
  const ENG = CR + FARM_CONFIG.CROISSANCE_DUREE_JOURS;               // 100
  const FIN = ENG + FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS;           // 180
  return { PS, CR, ENG, FIN };
}

// ─── computePhaseTerrain ─────────────────────────────────────────────────────

/**
 * Calcule la phase biologique attendue uniquement par l'âge depuis la MB.
 * N'utilise PAS le statut GAS — c'est ce que la biologie "dit".
 * Retourne null si dateMB absente (impossible de calculer).
 */
export function computePhaseTerrain(
  bande: BandePorcelets,
  today: Date = new Date(),
): BandePhase | null {
  const mbDate = parseDateFr(bande.dateMB);
  if (!mbDate) return null;

  const ageJours = floorDays(mbDate, today);
  const { PS, CR, ENG, FIN } = seuils();

  if (ageJours < PS)  return 'SOUS_MERE';
  if (ageJours < CR)  return 'POST_SEVRAGE';
  if (ageJours < ENG) return 'CROISSANCE';
  if (ageJours < FIN) return 'ENGRAISSEMENT';
  return 'FINITION';
}

// ─── ORDRE des phases (pour comparer terrain > déclarée) ─────────────────────

const PHASE_ORDER: Record<BandePhase, number> = {
  SOUS_MERE:    0,
  POST_SEVRAGE: 1,
  CROISSANCE:   2,
  ENGRAISSEMENT: 3,
  FINITION:     4,
  INCONNU:      -1,
};

function phaseOrder(p: BandePhase): number {
  return PHASE_ORDER[p] ?? -1;
}

// ─── nextPhase ────────────────────────────────────────────────────────────────

function nextPhase(current: BandePhase): PhaseAvecSortie | null {
  switch (current) {
    case 'SOUS_MERE':     return 'POST_SEVRAGE';
    case 'POST_SEVRAGE':  return 'CROISSANCE';
    case 'CROISSANCE':    return 'ENGRAISSEMENT';
    case 'ENGRAISSEMENT': return 'FINITION';
    case 'FINITION':      return 'SORTIE';
    default:              return null;
  }
}

// ─── Estimation poids ────────────────────────────────────────────────────────

/** Estimation linéaire simple du poids courant (kg) depuis sevrage. */
function estimerPoids(bande: BandePorcelets, today: Date): number | null {
  const sevDate = parseDateFr(bande.dateSevrageReelle ?? bande.dateSevragePrevue);
  if (!sevDate) return null;
  const POIDS_SEVRAGE = 25; // kg à J28 (norme K13 corrigée dans FinitionView)
  const GMQ_AVG = 0.65;    // kg/j moyen post-sevrage
  const jours = Math.max(0, floorDays(sevDate, today));
  return Math.min(POIDS_SEVRAGE + jours * GMQ_AVG, 120);
}

// ─── detectPendingTransitions ────────────────────────────────────────────────

/**
 * Détecte toutes les bandes dont la biologie (âge/poids) indique
 * qu'elles devraient passer à la phase suivante, mais dont le statut GAS
 * ne l'a pas encore enregistré.
 *
 * Ignore les bandes RECAP et celles sans dateMB.
 */
export function detectPendingTransitions(
  bandes: BandePorcelets[],
  today: Date = new Date(),
): PendingTransition[] {
  const result: PendingTransition[] = [];

  for (const b of bandes) {
    if (!b || b.statut === 'RECAP') continue;

    const terrain = computePhaseTerrain(b, today);
    if (!terrain) continue; // pas de dateMB → impossible de calculer

    const declaree = computeBandePhase(b, today);
    if (declaree === 'INCONNU') continue;

    // Cas FINITION → SORTIE (basé sur poids)
    if (declaree === 'FINITION') {
      const poids = estimerPoids(b, today);
      if (poids !== null && poids >= FARM_CONFIG.FINITION_POIDS_MAX_KG) {
        result.push({
          bandeId: b.id,
          label: b.idPortee ?? b.id,
          fromPhase: 'FINITION',
          toPhase: 'SORTIE',
          ageJours: parseDateFr(b.dateMB)
            ? floorDays(parseDateFr(b.dateMB)!, today)
            : null,
          poidsEstimeKg: poids,
          bande: b,
        });
      }
      continue;
    }

    // Cas standard : terrain > déclarée → proposer nextPhase
    if (phaseOrder(terrain) > phaseOrder(declaree)) {
      const next = nextPhase(declaree);
      if (!next) continue;

      const mbDate = parseDateFr(b.dateMB);
      result.push({
        bandeId: b.id,
        label: b.idPortee ?? b.id,
        fromPhase: declaree,
        toPhase: next,
        ageJours: mbDate ? floorDays(mbDate, today) : null,
        poidsEstimeKg: estimerPoids(b, today),
        bande: b,
      });
    }
  }

  return result;
}
