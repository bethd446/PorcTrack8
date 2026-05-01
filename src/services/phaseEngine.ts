/**
 * phaseEngine — Moteur de détection des transitions de phase biologiques et alimentaires.
 *
 * Principe :
 * computePhaseTerrain() calcule la phase biologiquement attendue par l'âge.
 * detectPendingTransitions() compare phaseTerrain vs phaseDeclaree.
 * determinerAliment() prescrit l'aliment en fonction du poids.
 */

import { FARM_CONFIG } from '../config/farm';
import { computeBandePhase, type BandePhase } from './bandesAggregator';
import type { BandePorcelets } from '../types/farm';
import { enqueueAppendRow } from './offlineQueue';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PhaseAvecSortie = BandePhase | 'SORTIE';

// Type pour les phases alimentaires définies dans FARM_CONFIG
export type FeedPhase = keyof typeof FARM_CONFIG.FEED_CONFIG;

export type TransitionReason = 'AGE_ATTEINT' | 'POIDS_ATTEINT' | 'POIDS_ET_AGE';

export interface PendingTransition {
  bandeId: string;
  label: string;
  fromPhase: BandePhase;
  toPhase: PhaseAvecSortie;
  ageJours: number | null;
  poidsEstimeKg: number | null;
  bande: BandePorcelets;
  alimentRecommande?: FeedPhase;
  // Champs de dette biologique
  joursEnRetard: number;
  isBloquant: boolean;
  urgence: 'NORMALE' | 'HAUTE' | 'CRITIQUE';
  /** Cause du déclenchement : âge biologique, poids franchi, ou les deux. */
  reason: TransitionReason;
  /** Seuil de poids effectivement franchi (kg) si reason inclut POIDS. */
  poidsSeuilKg?: number;
  /** Poids réel mesuré (kg) — non null si la bande a `poidsMoyenKg`. */
  poidsReelKg?: number;
}

// ─── Seuils de poids déclenchant une suggestion de transition (kg) ──────────
// Le poids prime sur l'âge : si poidsMoyenKg ≥ seuil, la transition est suggérée
// même si l'âge biologique ne l'a pas encore atteint.
export const POIDS_SEUILS = {
  CROISSANCE: 25,
  ENGRAISSEMENT: 50,
  FINITION: 80,
  SORTIE: 110,
} as const;

// ─── Labels FR pour chaque phase ─────────────────────────────────────────────

export const PHASE_LABEL: Record<string, string> = {
  SOUS_MERE:     'Maternité',
  POST_SEVRAGE:  'Post-sevrage',
  CROISSANCE:    'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION:      'Finition',
  SORTIE:        '🚚 Sortie abattoir',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Seuils (dérivés de FARM_CONFIG) ─────────────────────────────────────────

export function getSeuilsAgeJours() {
  const PS  = FARM_CONFIG.SEVRAGE_AGE_JOURS;
  const CR  = PS + FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS;
  const ENG = CR + FARM_CONFIG.CROISSANCE_DUREE_JOURS;
  const FIN = ENG + FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS;
  return { PS, CR, ENG, FIN };
}

export function getSeuilFinPhase(p: BandePhase): number | null {
  const { PS, CR, ENG, FIN } = getSeuilsAgeJours();
  switch (p) {
    case 'SOUS_MERE':     return PS;
    case 'POST_SEVRAGE':  return CR;
    case 'CROISSANCE':    return ENG;
    case 'ENGRAISSEMENT': return FIN;
    case 'FINITION':      return 999;
    default:              return null;
  }
}

// ─── Moteur Nutritionnel ─────────────────────────────────────────────────────

/**
 * Prescrit l'aliment optimal basé sur le poids réel (ou estimé).
 */
export function determinerAliment(poidsMoyenKg: number): FeedPhase {
  const feedRules = FARM_CONFIG.FEED_CONFIG;

  if (poidsMoyenKg <= feedRules.DEMARRAGE_1.poids_max_kg) return 'DEMARRAGE_1';
  if (poidsMoyenKg <= feedRules.DEMARRAGE_2.poids_max_kg) return 'DEMARRAGE_2';
  if (poidsMoyenKg <= feedRules.CROISSANCE.poids_max_kg) return 'CROISSANCE';
  return 'FINITION';
}

/**
 * Calcule le nombre de jours passés sur l'aliment actuel.
 */
export function joursSurAlimentActuel(dateDebutAliment?: string): number | null {
  const debut = parseDateFr(dateDebutAliment);
  if (!debut) return null;
  return Math.max(0, floorDays(debut, new Date()));
}

// ─── computePhaseTerrain ─────────────────────────────────────────────────────

export function computePhaseTerrain(
  bande: BandePorcelets,
  today: Date = new Date(),
): BandePhase | null {
  const mbDate = parseDateFr(bande.dateMB);
  if (!mbDate) return null;

  const ageJours = floorDays(mbDate, today);
  const { PS, CR, ENG, FIN } = getSeuilsAgeJours();

  if (ageJours < PS)  return 'SOUS_MERE';
  if (ageJours < CR)  return 'POST_SEVRAGE';
  if (ageJours < ENG) return 'CROISSANCE';
  if (ageJours < FIN) return 'ENGRAISSEMENT';
  return 'FINITION';
}

const PHASE_ORDER: Record<BandePhase, number> = {
  SOUS_MERE:    0,
  POST_SEVRAGE: 1,
  CROISSANCE:   2,
  ENGRAISSEMENT:3,
  FINITION:     4,
  INCONNU:      -1,
};

function phaseOrder(p: BandePhase): number {
  return PHASE_ORDER[p] ?? -1;
}

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

function estimerPoids(bande: BandePorcelets, today: Date): number | null {
  const sevDate = parseDateFr(bande.dateSevrageReelle ?? bande.dateSevragePrevue);
  if (!sevDate) return null;
  const POIDS_SEVRAGE = 25;
  const GMQ_AVG = 0.65;
  const jours = Math.max(0, floorDays(sevDate, today));
  return Math.min(POIDS_SEVRAGE + jours * GMQ_AVG, 120);
}

// ─── Logique poids ───────────────────────────────────────────────────────────

/**
 * Retourne le seuil de poids associé à la phase suivante (kg), ou null si pas
 * de seuil défini pour cette transition.
 */
function getPoidsSeuilPourTransition(toPhase: PhaseAvecSortie): number | null {
  switch (toPhase) {
    case 'CROISSANCE':    return POIDS_SEUILS.CROISSANCE;
    case 'ENGRAISSEMENT': return POIDS_SEUILS.ENGRAISSEMENT;
    case 'FINITION':      return POIDS_SEUILS.FINITION;
    case 'SORTIE':        return POIDS_SEUILS.SORTIE;
    default:              return null;
  }
}

// ─── detectPendingTransitions ────────────────────────────────────────────────

export function detectPendingTransitions(
  bandes: BandePorcelets[],
  today: Date = new Date(),
): PendingTransition[] {
  const result: PendingTransition[] = [];

  for (const b of bandes) {
    if (!b || b.statut === 'RECAP') continue;

    const terrain = computePhaseTerrain(b, today);
    if (!terrain) continue;

    const declaree = computeBandePhase(b, today);
    if (declaree === 'INCONNU') continue;

    const poidsReel = typeof b.poidsMoyenKg === 'number' ? b.poidsMoyenKg : null;
    const poidsEstime = estimerPoids(b, today);
    const poidsPourAliment = poidsReel ?? poidsEstime;
    const mbDate = parseDateFr(b.dateMB);
    const ageJours = mbDate ? floorDays(mbDate, today) : null;

    const next = nextPhase(declaree);
    if (!next) continue;

    // ─── Évaluation des deux critères : âge biologique et poids réel ──────
    const triggerByAge = phaseOrder(terrain) > phaseOrder(declaree)
      || (declaree === 'FINITION'
          && poidsPourAliment !== null
          && poidsPourAliment >= FARM_CONFIG.FINITION_POIDS_MAX_KG);

    const seuilPoids = getPoidsSeuilPourTransition(next);
    const triggerByPoids = poidsReel !== null
      && seuilPoids !== null
      && poidsReel >= seuilPoids;

    if (!triggerByAge && !triggerByPoids) continue;

    // Cas FINITION → SORTIE : conserver le comportement original (poids requis).
    if (declaree === 'FINITION' && next === 'SORTIE') {
      if (poidsPourAliment === null || poidsPourAliment < FARM_CONFIG.FINITION_POIDS_MAX_KG) {
        // Pas de poids ou poids insuffisant — on ignore (même si l'âge dit FINITION).
        if (!triggerByPoids) continue;
      }
    }

    const reason: TransitionReason = triggerByAge && triggerByPoids
      ? 'POIDS_ET_AGE'
      : triggerByPoids
        ? 'POIDS_ATTEINT'
        : 'AGE_ATTEINT';

    const threshold = getSeuilFinPhase(declaree);
    const retard = (threshold && ageJours !== null) ? Math.max(0, ageJours - threshold) : 0;
    const isCritique = retard > 5;

    result.push({
      bandeId: b.id,
      label: b.idPortee ?? b.id,
      fromPhase: declaree,
      toPhase: next,
      ageJours,
      poidsEstimeKg: poidsPourAliment,
      bande: b,
      alimentRecommande: poidsPourAliment !== null ? determinerAliment(poidsPourAliment) : undefined,
      joursEnRetard: retard,
      isBloquant: isCritique,
      urgence: next === 'SORTIE'
        ? 'NORMALE'
        : isCritique ? 'CRITIQUE' : (retard > 2 ? 'HAUTE' : 'NORMALE'),
      reason,
      poidsSeuilKg: triggerByPoids && seuilPoids !== null ? seuilPoids : undefined,
      poidsReelKg: poidsReel ?? undefined,
    });
  }

  return result;
}

// ─── Enregistrement ──────────────────────────────────────────────────────────

export async function enqueueTransition(
  transition: PendingTransition,
  utilisateur: string,
  poidsKg?: number,
): Promise<void> {
  // Génération UUID pour idempotence
  const syncId = crypto.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const mbDate = parseDateFr(transition.bande.dateMB);
  const ageJours = mbDate
    ? floorDays(mbDate, new Date())
    : transition.ageJours ?? undefined;

  const today = new Date();
  const dateStr = [
    String(today.getDate()).padStart(2, '0'),
    String(today.getMonth() + 1).padStart(2, '0'),
    today.getFullYear(),
  ].join('/');

  await enqueueAppendRow('HISTORIQUE_TRANSITIONS', [
    syncId, // Colonne A : ID de synchronisation unique
    transition.bandeId,
    transition.fromPhase,
    transition.toPhase,
    dateStr,
    utilisateur,
    poidsKg ?? '',
    ageJours ?? '',
    transition.alimentRecommande ?? ''
  ]);
}
