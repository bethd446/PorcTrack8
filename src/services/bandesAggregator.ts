/**
 * bandesAggregator — helpers pour distinguer "Portées" vs "Loges"
 * ═══════════════════════════════════════════════════════════════
 *
 * Contexte métier (ferme naisseur-engraisseur) :
 *  - Une **portée** est un lot de porcelets issus d'une mise-bas unique
 *    (1 portée = 1 truie mère). Colonne Sheets `PORCELETS_BANDES`.
 *  - Une **loge** est une unité physique regroupant une ou plusieurs portées.
 *    Trois types co-existent à la ferme K13 :
 *      1. maternité       (9 loges, J0→J21 avec la truie)
 *      2. post-sevrage    (4 loges, J21→~J91, porcelets groupés mixtes)
 *      3. engraissement   (2 loges, >J91, séparés par sexe M/F, jusqu'à finition)
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
 * - `POST_SEVRAGE`  : sevrés, <70 jours après la date de sevrage.
 * - `ENGRAISSEMENT` : sevrés, >=70 jours après la date de sevrage (séparation par sexe).
 * - `INCONNU`       : statut RECAP ou non classifiable.
 */
export type BandePhase = 'SOUS_MERE' | 'POST_SEVRAGE' | 'ENGRAISSEMENT' | 'INCONNU';

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
 * Règles :
 *  - Statut "Sous mère"                                    → `SOUS_MERE`
 *  - Statut "Sevrés" + date sevrage < 70 j                 → `POST_SEVRAGE`
 *  - Statut "Sevrés" + date sevrage ≥ 70 j                 → `ENGRAISSEMENT`
 *  - Statut "Sevrés" sans date (ou date invalide)          → `POST_SEVRAGE` (fallback récent)
 *  - Statut `RECAP` ou non reconnu                         → `INCONNU`
 *
 * La date de sevrage réelle (`dateSevrageReelle`) est privilégiée sur la prévue
 * (`dateSevragePrevue`) — si aucune n'est renseignée, on considère la bande
 * récemment sevrée (POST_SEVRAGE).
 *
 * @param bande la bande (portée) à classifier
 * @param today date de référence (par défaut : maintenant)
 */
export function computeBandePhase(bande: BandePorcelets, today: Date = new Date()): BandePhase {
  const statut = (bande.statut || '').toLowerCase();
  if (/sous.m/i.test(statut)) return 'SOUS_MERE';
  if (!/sevr/i.test(statut)) return 'INCONNU';

  // Parse date sevrage réelle (si absente → fallback sur prévue)
  const sevrageRaw = bande.dateSevrageReelle || bande.dateSevragePrevue;
  if (!sevrageRaw) return 'POST_SEVRAGE'; // Sevrés sans date → considéré récent

  const date = parseDateFr(sevrageRaw);
  if (!date) return 'POST_SEVRAGE';

  const diffMs = today.getTime() - date.getTime();
  const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffJours >= FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ? 'ENGRAISSEMENT' : 'POST_SEVRAGE';
}

/**
 * Compte les bandes par phase d'élevage (hors INCONNU).
 *
 * Retourne un objet `{ SOUS_MERE, POST_SEVRAGE, ENGRAISSEMENT }`.
 */
export function countBandesByPhase(
  bandes: BandePorcelets[],
  today: Date = new Date()
): Record<Exclude<BandePhase, 'INCONNU'>, number> {
  const acc: Record<Exclude<BandePhase, 'INCONNU'>, number> = {
    SOUS_MERE: 0,
    POST_SEVRAGE: 0,
    ENGRAISSEMENT: 0,
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
 * Calcule l'occupation des loges d'engraissement.
 *
 * Une bande est comptée en engraissement si son statut est "Sevrés" et que la
 * date de sevrage est >= 70 jours (voir `computeBandePhase`). Capacité définie
 * par `FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY` (K13 = 2 loges).
 */
export function logesEngraissementOccupation(
  bandes: BandePorcelets[],
  today: Date = new Date()
): LogeOccupation {
  const capacite = FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY;
  const raw = countBandesByPhase(bandes, today).ENGRAISSEMENT;
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
 * Compte les bandes en engraissement ventilées par sexe après séparation.
 *
 * Une bande est affectée à une loge sexuée (`males` ou `femelles`) si elle :
 *   - est en phase `ENGRAISSEMENT` (J+70+ post-sevrage, cf. `computeBandePhase`)
 *   - ET possède `logeEngraissement === 'M'` ou `'F'`
 *
 * Les bandes en `ENGRAISSEMENT` mais sans `logeEngraissement` sont remontées
 * dans `nonSepares` — signalant qu'une saisie de séparation est attendue.
 *
 * Le comptage des `porcelets` utilise :
 *   - `nbMales` si présent pour une bande `logeEngraissement === 'M'`
 *   - `nbFemelles` si présent pour une bande `logeEngraissement === 'F'`
 *   - sinon `vivants ?? 0`
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
    if (phase !== 'ENGRAISSEMENT') continue;

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
 *   - Phase `ENGRAISSEMENT` (J+70+ post-sevrage)
 *   - Pas encore séparée (`logeEngraissement` non défini ET
 *     `nbMales`/`nbFemelles` non renseignés)
 *
 * Les bandes déjà séparées (avec `logeEngraissement` ou les compteurs sexués
 * renseignés) sont exclues.
 */
export function bandesAEligibleSeparation(
  bandes: BandePorcelets[],
  today: Date = new Date()
): BandePorcelets[] {
  return bandes.filter(b => {
    if (computeBandePhase(b, today) !== 'ENGRAISSEMENT') return false;
    if (b.logeEngraissement === 'M' || b.logeEngraissement === 'F') return false;
    if (typeof b.nbMales === 'number' || typeof b.nbFemelles === 'number') return false;
    return true;
  });
}
