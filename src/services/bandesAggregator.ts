/**
 * bandesAggregator — helpers pour distinguer "Portées" vs "Loges"
 * ═══════════════════════════════════════════════════════════════
 *
 * Contexte métier (ferme naisseur-engraisseur) :
 *  - Une **portée** est un lot de porcelets issus d'une mise-bas unique
 *    (1 portée = 1 truie mère). Colonne Sheets `PORCELETS_BANDES`.
 *  - Une **loge** est une unité physique regroupant une ou plusieurs portées.
 *    Trois types co-existent à la ferme K13 :
 *      1. maternité       (9 loges, J0→J28 avec la truie)
 *      2. post-sevrage    (6 loges, J28→~J63, porcelets groupés mixtes)
 *      3. croissance      (6 loges, >J63, séparation M/F, jusqu'à finition)
 *
 * Tant que la feuille Sheets `PORCELETS_BANDES` n'a pas de colonne `Loge`
 * explicite, on dérive la phase d'une bande depuis son statut + date de
 * sevrage (`computeBandePhase`).
 *
 * TODO(sheets-schema):
 *   Ajouter une colonne `Loge` (ex: "L1", "L2", …) dans `PORCELETS_BANDES`
 *   pour permettre un `count distinct` propre. Quand cette colonne existe,
 *   remplacer l'heuristique par un `new Set(bandes.map(b => b.loge)).size`.
 */

import type { BandePorcelets, Truie } from '../types/farm';
import { FARM_CONFIG } from '../config/farm';

/**
 * Niveau d'alerte d'occupation d'une série de loges physiques.
 * - `OK`   : occupation < 80 %
 * - `HIGH` : occupation >= 80 % (proche saturation)
 * - `FULL` : occupation >= capacité (saturation atteinte)
 */
export type LogeOccupationAlerte = 'OK' | 'HIGH' | 'FULL';

/**
 * Résultat d'un calcul d'occupation de loges (maternité, post-sevrage, engraissement).
 */
export interface LogeOccupation {
  /** Nombre de loges actuellement occupées (borné à la capacité physique). */
  occupees: number;
  /** Capacité physique totale (nombre de loges installées). */
  capacite: number;
  /** Taux d'occupation en pourcentage, arrondi. */
  tauxPct: number;
  /** Niveau d'alerte dérivé du taux. */
  alerte: LogeOccupationAlerte;
}

/**
 * Phase d'élevage d'une bande porcelet.
 *
 * - `SOUS_MERE`     : avec la truie, maternité (statut "Sous mère").
 * - `POST_SEVRAGE`  : sevrés, <35 jours après la date de sevrage (jusqu'à J63 d'âge).
 * - `CROISSANCE`    : sevrés, 35-72 jours après sevrage (J63 à J100 d'âge).
 * - `ENGRAISSEMENT` : sevrés, 72-152 jours après sevrage (J100 à J180 d'âge).
 * - `FINITION`      : sevrés, >152 jours après sevrage (>J180 d'âge).
 * - `INCONNU`       : statut RECAP ou non classifiable.
 */
export type BandePhase = 'SOUS_MERE' | 'POST_SEVRAGE' | 'CROISSANCE' | 'ENGRAISSEMENT' | 'FINITION' | 'INCONNU';

function computeAlerte(occupees: number, capacite: number, tauxPct: number): LogeOccupationAlerte {
  if (occupees >= capacite) return 'FULL';
  if (tauxPct >= 80) return 'HIGH';
  return 'OK';
}

/**
 * Parse une date au format `dd/MM/yyyy` ou `YYYY-MM-DD[...]`.
 *
 * Retourne `null` si le format n'est pas reconnu. Utilisé localement pour
 * classifier la phase d'une bande (pas d'usage hors module).
 */
function parseDateFr(s: string): Date | null {
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

/**
 * Filtre les portées "réelles" (exclut les lignes RECAP qui ne sont pas
 * des portées biologiques mais des agrégats).
 */
export function filterRealPortees(bandes: BandePorcelets[]): BandePorcelets[] {
  return bandes.filter(b => b.statut !== 'RECAP');
}

/**
 * Compte les portées "sous mère" (pré-sevrage) et la somme des porcelets vivants.
 */
export function countSousMere(bandes: BandePorcelets[]): { portees: number; porcelets: number } {
  const sm = bandes.filter(b => /sous.m/i.test(b.statut || ''));
  return {
    portees: sm.length,
    porcelets: sm.reduce((acc, b) => acc + (b.vivants || 0), 0),
  };
}

/**
 * Compte les portées sevrées (post-sevrage + engraissement confondus) et la
 * somme des porcelets vivants. Pour distinguer post-sevrage vs engraissement,
 * voir `countBandesByPhase`.
 */
export function countSevres(bandes: BandePorcelets[]): { portees: number; porcelets: number } {
  const sv = bandes.filter(b => /sevr/i.test(b.statut || ''));
  return {
    portees: sv.length,
    porcelets: sv.reduce((acc, b) => acc + (b.vivants || 0), 0),
  };
}

/**
 * Dérive la phase d'élevage d'une bande selon son statut + date de sevrage.
 *
 * Priorité aux statuts explicites, puis à l'âge biologique.
 */
export function computeBandePhase(bande: BandePorcelets, today: Date = new Date()): BandePhase {
  const statut = (bande.statut || '').toLowerCase();
  if (statut === 'recap') return 'INCONNU';
  if (/sous.m/i.test(statut)) return 'SOUS_MERE';
  if (statut.includes('croissance')) return 'CROISSANCE';
  if (statut.includes('finition')) return 'FINITION';
  if (statut.includes('engraissement')) return 'ENGRAISSEMENT';

  if (!/sevr/i.test(statut)) return 'INCONNU';

  // Parse date sevrage réelle (si absente → fallback sur prévue)
  const sevrageRaw = bande.dateSevrageReelle || bande.dateSevragePrevue;
  if (!sevrageRaw) return 'POST_SEVRAGE';

  const date = parseDateFr(sevrageRaw);
  if (!date) return 'POST_SEVRAGE';

  const diffMs = today.getTime() - date.getTime();
  const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffJours < FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS) return 'POST_SEVRAGE';
  if (diffJours < (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS + FARM_CONFIG.CROISSANCE_DUREE_JOURS)) return 'CROISSANCE';
  if (diffJours < (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS + FARM_CONFIG.CROISSANCE_DUREE_JOURS + FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS)) return 'ENGRAISSEMENT';
  return 'FINITION';
}

/**
 * Compte les bandes par phase d'élevage (hors INCONNU).
 */
export function countBandesByPhase(
  bandes: BandePorcelets[],
  today: Date = new Date()
): Record<Exclude<BandePhase, 'INCONNU'>, number> {
  const acc: Record<Exclude<BandePhase, 'INCONNU'>, number> = {
    SOUS_MERE: 0,
    POST_SEVRAGE: 0,
    CROISSANCE: 0,
    ENGRAISSEMENT: 0,
    FINITION: 0,
  };
  for (const b of bandes) {
    const phase = computeBandePhase(b, today);
    if (phase !== 'INCONNU') acc[phase] += 1;
  }
  return acc;
}

/**
 * Estime le nombre de loges physiques post-sevrage.
 *
 * @deprecated préférer `logesPostSevrageOccupation(bandes)` qui retourne aussi
 *             capacité, taux et niveau d'alerte.
 */
export function countLoges(bandes: BandePorcelets[], fallbackCount = 4): number {
  const sev = countSevres(bandes);
  if (sev.portees === 0) return 0;
  return Math.min(sev.portees, fallbackCount);
}

/**
 * Compte les truies actuellement en maternité.
 *
 * Source : `truie.statut` matchant "maternité" (case-insensitive, également
 * robuste aux variantes sans accent type "maternite").
 *
 * Une truie en maternité occupe exactement une loge de maternité à la ferme K13.
 */
export function countTruiesEnMaternite(truies: Truie[]): number {
  return truies.filter(t => /maternit/i.test(t.statut ?? '')).length;
}

/**
 * Calcule l'occupation des loges de maternité (chauffage porcelet).
 *
 * 1 truie en maternité = 1 loge occupée. La capacité physique est définie par
 * `FARM_CONFIG.MATERNITE_LOGES_CAPACITY` (K13 = 9 loges).
 *
 * `occupees` est borné à la capacité pour l'affichage : si la feuille Sheets
 * remonte plus de truies en maternité que de loges physiques, on reste à 100 %
 * et on déclenche l'alerte `FULL` (situation anormale à corriger côté terrain).
 */
export function logesMaterniteOccupation(truies: Truie[]): LogeOccupation {
  const capacite = FARM_CONFIG.MATERNITE_LOGES_CAPACITY;
  const raw = countTruiesEnMaternite(truies);
  const occupees = Math.min(raw, capacite);
  const tauxPct = capacite > 0 ? Math.round((raw / capacite) * 100) : 0;
  const alerte = computeAlerte(raw, capacite, tauxPct);
  return { occupees, capacite, tauxPct, alerte };
}

/**
 * Calcule l'occupation des loges post-sevrage.
 *
 * Utilise `computeBandePhase` pour distinguer les bandes en phase POST_SEVRAGE
 * (sevrées depuis moins de 70 jours) de celles en ENGRAISSEMENT (>=70 j).
 * Capacité définie par `FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY` (K13 = 4 loges).
 *
 * TODO(sheets-schema) : ajouter une colonne `Loge` dans `PORCELETS_BANDES`
 * pour permettre un comptage distinct réel (plusieurs portées peuvent partager
 * une loge, et inversement).
 */
export function logesPostSevrageOccupation(
  bandes: BandePorcelets[],
  today: Date = new Date()
): LogeOccupation {
  const capacite = FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY;
  const raw = countBandesByPhase(bandes, today).POST_SEVRAGE;
  const occupees = Math.min(raw, capacite);
  const tauxPct = capacite > 0 ? Math.round((raw / capacite) * 100) : 0;
  const alerte = computeAlerte(raw, capacite, tauxPct);
  return { occupees, capacite, tauxPct, alerte };
}

/**
 * Calcule l'occupation des loges croissance-engraissement-finition.
 *
 * Ces trois phases partagent les mêmes 6 loges physiques après la sortie
 * du post-sevrage (J63+).
 */
export function logesEngraissementOccupation(
  bandes: BandePorcelets[],
  today: Date = new Date()
): LogeOccupation {
  const capacite = FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY;
  const counts = countBandesByPhase(bandes, today);
  const raw = counts.CROISSANCE + counts.ENGRAISSEMENT + counts.FINITION;
  const occupees = Math.min(raw, capacite);
  const tauxPct = capacite > 0 ? Math.round((raw / capacite) * 100) : 0;
  const alerte = computeAlerte(raw, capacite, tauxPct);
  return { occupees, capacite, tauxPct, alerte };
}

/**
 * Agrégat d'une loge d'engraissement par sexe.
 */
export interface SexEngraissementTotal {
  portees: number;
  porcelets: number;
}

/**
 * Compte les bandes en phase post-post-sevrage ventilées par sexe après séparation.
 *
 * Inclut les phases CROISSANCE, ENGRAISSEMENT et FINITION car elles partagent
 * les mêmes loges sexuées.
 */
export function countEngraissementBySex(
  bandes: BandePorcelets[],
  today: Date = new Date()
): {
  males: SexEngraissementTotal;
  femelles: SexEngraissementTotal;
  nonSepares: SexEngraissementTotal;
} {
  const males: SexEngraissementTotal = { portees: 0, porcelets: 0 };
  const femelles: SexEngraissementTotal = { portees: 0, porcelets: 0 };
  const nonSepares: SexEngraissementTotal = { portees: 0, porcelets: 0 };

  for (const b of bandes) {
    const phase = computeBandePhase(b, today);
    if (phase !== 'CROISSANCE' && phase !== 'ENGRAISSEMENT' && phase !== 'FINITION') continue;

    if (b.logeEngraissement === 'M') {
      males.portees += 1;
      males.porcelets += b.nbMales ?? b.vivants ?? 0;
    } else if (b.logeEngraissement === 'F') {
      femelles.portees += 1;
      femelles.porcelets += b.nbFemelles ?? b.vivants ?? 0;
    } else {
      nonSepares.portees += 1;
      nonSepares.porcelets += b.vivants ?? 0;
    }
  }

  return { males, femelles, nonSepares };
}

/**
 * Détecte les bandes éligibles à la saisie d'une séparation par sexe.
 *
 * Critères :
 *   - Phase CROISSANCE, ENGRAISSEMENT ou FINITION (J+35+ post-sevrage)
 *   - Pas encore séparée (logeEngraissement non défini)
 */
export function bandesAEligibleSeparation(
  bandes: BandePorcelets[],
  today: Date = new Date()
): BandePorcelets[] {
  return bandes.filter(b => {
    const phase = computeBandePhase(b, today);
    if (phase !== 'CROISSANCE' && phase !== 'ENGRAISSEMENT' && phase !== 'FINITION') return false;
    if (b.logeEngraissement === 'M' || b.logeEngraissement === 'F') return false;
    if (typeof b.nbMales === 'number' || typeof b.nbFemelles === 'number') return false;
    return true;
  });
}
