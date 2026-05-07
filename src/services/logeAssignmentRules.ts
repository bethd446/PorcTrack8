/**
 * logeAssignmentRules — Règles métier d'attribution animal ↔ loge (V70)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Règles métier (validées Christophe, 2026-05-07) :
 *  1. Un verrat reproducteur (statut "Actif") doit être SEUL dans sa loge.
 *  2. Plusieurs verrats jeunes (non reproducteurs) peuvent partager une loge.
 *  3. Maximum 5 truies par loge (suivi optimal maternité/gestante).
 *  4. Si une loge contient un verrat reproducteur, on ne peut pas y ajouter
 *     d'autre animal (la solitude est garantie).
 *
 * Heuristique "reproducteur" :
 *   Aucun champ explicite côté Verrat. On utilise `statut === 'Actif'` comme
 *   proxy : un verrat "Actif" est en service reproducteur. Réforme/Mort/Jeune
 *   = non reproducteur. Cf. `VerratStatut` dans `src/types/farm.ts`.
 *
 * Le helper `canAssignAnimal` est pur (testable, sans I/O). L'appelant
 * construit `currentOccupants` via `getLogeOccupants(loge, truies, verrats)`.
 */
import type { Loge, Truie, Verrat } from '../types/farm';

export const LOGE_RULES = {
  /** Maximum truies par loge (recommandation suivi maternité/gestante). */
  TRUIE_MAX_PAR_LOGE: 5,
} as const;

export type OccupantKind = 'truie' | 'verrat';

export interface LogeOccupant {
  kind: OccupantKind;
  id: string;
  /** Verrat uniquement : true si reproducteur (statut "Actif"). */
  reproducteur?: boolean;
}

export interface AssignmentResult {
  ok: boolean;
  raison?: string;
}

/**
 * Détermine si un verrat est en service reproducteur.
 * Heuristique : statut "Actif" = en service. Tout autre statut (Réforme,
 * Mort, Jeune…) = non reproducteur.
 */
export function isVerratReproducteur(verrat: Pick<Verrat, 'statut'>): boolean {
  return verrat.statut === 'Actif';
}

/**
 * Construit la liste des occupants actuels d'une loge à partir des
 * collections truies / verrats.
 */
export function getLogeOccupants(
  loge: Pick<Loge, 'id'>,
  truies: Truie[],
  verrats: Verrat[],
): LogeOccupant[] {
  const occupants: LogeOccupant[] = [];
  for (const t of truies) {
    if (t.logeId === loge.id) {
      occupants.push({ kind: 'truie', id: t.id });
    }
  }
  for (const v of verrats) {
    if (v.logeId === loge.id) {
      occupants.push({
        kind: 'verrat',
        id: v.id,
        reproducteur: isVerratReproducteur(v),
      });
    }
  }
  return occupants;
}

/**
 * Vérifie si on peut assigner `animal` à une loge dont les occupants
 * actuels sont `currentOccupants` (l'animal lui-même n'y figure pas).
 *
 * @param animal Métadonnées minimales (kind + reproducteur si verrat)
 * @param currentOccupants Liste des animaux DÉJÀ présents (sans `animal`)
 * @param loge Loge cible (pour capaciteMax éventuelle)
 */
export function canAssignAnimal(
  animal: { kind: OccupantKind; reproducteur?: boolean },
  currentOccupants: LogeOccupant[],
  loge?: Pick<Loge, 'capaciteMax'>,
): AssignmentResult {
  // Règle 1 : si la loge contient déjà un verrat reproducteur, rien ne peut y entrer.
  const hasVerratRepro = currentOccupants.some(
    o => o.kind === 'verrat' && o.reproducteur === true,
  );
  if (hasVerratRepro) {
    return {
      ok: false,
      raison: 'Cette loge contient un verrat reproducteur (qui doit rester seul).',
    };
  }

  // Règle 2 : un verrat reproducteur ne peut entrer que dans une loge VIDE.
  if (animal.kind === 'verrat' && animal.reproducteur === true) {
    if (currentOccupants.length > 0) {
      return {
        ok: false,
        raison: 'Un verrat reproducteur doit être seul dans sa loge.',
      };
    }
  }

  // Règle 3 : truies max 5 par loge.
  if (animal.kind === 'truie') {
    const truiesActuelles = currentOccupants.filter(o => o.kind === 'truie').length;
    if (truiesActuelles >= LOGE_RULES.TRUIE_MAX_PAR_LOGE) {
      return {
        ok: false,
        raison: `Capacité atteinte : ${LOGE_RULES.TRUIE_MAX_PAR_LOGE} truies maximum par loge.`,
      };
    }
  }

  // Règle 4 (optionnelle) : capaciteMax de la loge.
  if (loge?.capaciteMax !== undefined && currentOccupants.length >= loge.capaciteMax) {
    return {
      ok: false,
      raison: `Capacité maximale de la loge atteinte (${loge.capaciteMax}).`,
    };
  }

  return { ok: true };
}
