/**
 * healthProtocolPlanner — Suggestions de soins programmés par phase de bande.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Donne, pour une bande à un instant T, la liste des soins recommandés selon
 * sa phase biologique (SOUS_MERE, POST_SEVRAGE, CROISSANCE, ENGRAISSEMENT) et
 * la date de mise-bas.
 *
 * Règles GTTT terrain :
 *  - SOUS_MERE       : Fer J3 (injectable, 1 ml IM)
 *  - POST_SEVRAGE    : Vermifuge J21 post-sevrage (Ivermectine 0.3 ml/kg)
 *  - CROISSANCE      : Vaccin peste à J60 d'âge
 *  - ENGRAISSEMENT   : pas de soin programmé (surveillance toux/boiterie)
 *
 * Le helper retourne un statut `done` non calculé ici (à croiser côté UI avec
 * la liste des `health_logs` existants) — on renvoie `false` par défaut.
 */

import type { BandePorcelets } from '../types/farm';
import { computeBandePhase, type BandePhase } from './bandesAggregator';

/**
 * Type strict du log santé — miroir de l'enum Postgres `health_log_type`
 * (cf. migrations/2026_05_01_v21_health_log_types.sql).
 */
export type HealthLogType =
  | 'FER_J3'
  | 'VERMIFUGE'
  | 'VACCIN_PESTE'
  | 'VACCIN_MYCOPLASME'
  | 'VACCIN_AUTRE'
  | 'CASTRATION'
  | 'COUPE_QUEUE'
  | 'BOITERIE'
  | 'TOUX'
  | 'DIARRHEE'
  | 'FIEVRE'
  | 'ECRASEMENT'
  | 'PARASITOSE'
  | 'AUTRE';

export interface RecommendedHealthLog {
  type: HealthLogType;
  recommendedDate: Date;
  done: boolean;
  bande_id: string;
}

/** Catégories UI (regroupement par intention pour le picker). */
export type HealthLogCategory = 'SOIN' | 'INTERVENTION' | 'PROBLEME' | 'AUTRE';

export const HEALTH_LOG_CATEGORIES: Record<HealthLogType, HealthLogCategory> = {
  FER_J3: 'SOIN',
  VERMIFUGE: 'SOIN',
  VACCIN_PESTE: 'SOIN',
  VACCIN_MYCOPLASME: 'SOIN',
  VACCIN_AUTRE: 'SOIN',
  CASTRATION: 'INTERVENTION',
  COUPE_QUEUE: 'INTERVENTION',
  BOITERIE: 'PROBLEME',
  TOUX: 'PROBLEME',
  DIARRHEE: 'PROBLEME',
  FIEVRE: 'PROBLEME',
  ECRASEMENT: 'PROBLEME',
  PARASITOSE: 'PROBLEME',
  AUTRE: 'AUTRE',
};

/** Métadonnées de saisie suggérées par type — dose, mots-clés produit véto. */
export interface HealthLogTemplate {
  label: string;
  defaultDose?: string;
  produitKeywords?: string[];
}

export const HEALTH_LOG_TEMPLATES: Record<HealthLogType, HealthLogTemplate> = {
  FER_J3:           { label: 'Fer J3 (porcelet)',   defaultDose: '1 ml',     produitKeywords: ['fer', 'injectable'] },
  VERMIFUGE:        { label: 'Vermifuge',           defaultDose: '0.3 ml/kg', produitKeywords: ['ivermectine', 'vermifuge'] },
  VACCIN_PESTE:     { label: 'Vaccin peste',        defaultDose: '2 ml',     produitKeywords: ['peste'] },
  VACCIN_MYCOPLASME:{ label: 'Vaccin mycoplasme',   defaultDose: '2 ml',     produitKeywords: ['mycoplasme'] },
  VACCIN_AUTRE:     { label: 'Vaccin autre',        produitKeywords: ['vaccin'] },
  CASTRATION:       { label: 'Castration' },
  COUPE_QUEUE:      { label: 'Coupe de queue' },
  BOITERIE:         { label: 'Boiterie' },
  TOUX:             { label: 'Toux' },
  DIARRHEE:         { label: 'Diarrhée' },
  FIEVRE:           { label: 'Fièvre' },
  ECRASEMENT:       { label: 'Écrasement' },
  PARASITOSE:       { label: 'Parasitose' },
  AUTRE:            { label: 'Autre' },
};

/** Parse une date `dd/MM/yyyy` ou `YYYY-MM-DD`. */
function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Renvoie les soins recommandés pour une bande à la date `today`.
 *
 * `done` est toujours `false` ici — l'appelant peut le marquer `true` après
 * avoir matché un health_log existant (par `log_type` + même bande_id).
 */
export function getRecommendedHealthLogs(
  bande: BandePorcelets,
  today: Date = new Date(),
): RecommendedHealthLog[] {
  const phase: BandePhase = computeBandePhase(bande, today);
  const recos: RecommendedHealthLog[] = [];
  const dateMB = parseDate(bande.dateMB);
  const dateSevrage = parseDate(bande.dateSevrageReelle || bande.dateSevragePrevue);

  switch (phase) {
    case 'SOUS_MERE': {
      // Fer J3 post mise-bas
      if (dateMB) {
        recos.push({
          type: 'FER_J3',
          recommendedDate: addDays(dateMB, 3),
          done: false,
          bande_id: bande.id,
        });
      }
      break;
    }
    case 'POST_SEVRAGE': {
      // Vermifuge ~ J21 post-sevrage
      if (dateSevrage) {
        recos.push({
          type: 'VERMIFUGE',
          recommendedDate: addDays(dateSevrage, 21),
          done: false,
          bande_id: bande.id,
        });
      }
      break;
    }
    case 'CROISSANCE': {
      // Vaccin peste à J60 d'âge (post mise-bas)
      if (dateMB) {
        recos.push({
          type: 'VACCIN_PESTE',
          recommendedDate: addDays(dateMB, 60),
          done: false,
          bande_id: bande.id,
        });
      }
      break;
    }
    case 'ENGRAISSEMENT':
    case 'FINITION':
    case 'INCONNU':
    default:
      // Pas de soin programmé (surveillance uniquement).
      break;
  }

  return recos;
}
