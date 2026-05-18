/**
 * V75-o C · F-12 — Performance économique d'une truie.
 *
 * Calcul synthétique pour aider l'éleveur à décider réforme / garde :
 *  - portées historiques + dernière NV
 *  - moyenne NV par portée (depuis bandes filtrées)
 *  - aliment consommé estimé (kg + FCFA)
 *  - marge estimée (si vendue) = prix sortie - coût alim
 *
 * Hypothèses & invariants :
 *  - Date d'entrée ferme = `dateNaissance` faute de mieux (pas de champ dédié).
 *    Si absent, retourne null pour alim/marge.
 *  - Si `dateSortie` présente, on borne la durée à cette date (pas today).
 *  - Prix aliment kg : si `prixAlimKgFcfa` non fourni, fallback constante
 *    `FINANCE_CONFIG.COUT_ALIMENT_KG.TRUIE_GESTATION` (280 FCFA/kg, marché CI 2026).
 *  - Marge : uniquement calculée si `typeSortie === 'VENTE'` ET `prixSortieFcfa` présent.
 *    Mortalité / abattoir / pas encore vendue → null.
 */

import type { Truie, BandePorcelets } from '../../types/farm';
import { FARM_CONFIG } from '../../config/farm';

export type TruiePerformanceEco = {
  portees: number;
  derniereNV: number | null;
  moyNVParPortee: number | null;
  alimConsommeeKg: number | null;
  alimConsommeeFcfa: number | null;
  margeEstimeeFcfa: number | null;
  /** Discrimine pourquoi la marge est null (UX). */
  margeStatus: 'CALCULEE' | 'PAS_ENCORE_VENDUE' | 'NON_APPLICABLE' | 'DONNEES_INSUFFISANTES';
};

const DEFAULT_PRIX_ALIM_KG_FCFA: number = FARM_CONFIG.FINANCE_CONFIG.COUT_ALIMENT_KG.TRUIE_GESTATION;

function parseDateLoose(s?: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Filtre les bandes liées à cette truie (3 stratégies de match — cf. TruieDetailView).
 */
export function filterBandesForTruie(truie: Truie, bandes: BandePorcelets[]): BandePorcelets[] {
  return bandes.filter(b =>
    b.truie === truie.id ||
    (!!truie.displayId && b.truie === truie.displayId) ||
    (!!truie.boucle && b.boucleMere === truie.boucle),
  );
}

export function computeTruiePerformanceEco(
  truie: Truie,
  bandes: BandePorcelets[],
  config: { prixAlimKgFcfa?: number; today?: Date } = {},
): TruiePerformanceEco {
  const today = config.today ?? new Date();
  const prixAlimKgFcfa = config.prixAlimKgFcfa ?? DEFAULT_PRIX_ALIM_KG_FCFA;

  // Portées : on prend nbPortees si fourni, sinon comptage des bandes (fallback).
  const truieBandes = filterBandesForTruie(truie, bandes);
  const portees = truie.nbPortees ?? truieBandes.length;

  const derniereNV = truie.derniereNV ?? null;

  // Moyenne NV — uniquement sur bandes ayant une valeur nv renseignée.
  const bandesAvecNV = truieBandes.filter(b => typeof b.nv === 'number');
  const moyNVParPortee = bandesAvecNV.length > 0
    ? bandesAvecNV.reduce((acc, b) => acc + (b.nv ?? 0), 0) / bandesAvecNV.length
    : null;

  // Aliment consommée : ration (kg/j) × jours présence.
  // Date d'entrée = dateNaissance (faute de mieux). Date fin = dateSortie OU today.
  const dateEntree = parseDateLoose(truie.dateNaissance);
  const dateFin = parseDateLoose(truie.dateSortie) ?? today;
  const ration = truie.ration;

  let alimConsommeeKg: number | null = null;
  let alimConsommeeFcfa: number | null = null;

  if (dateEntree && Number.isFinite(ration) && ration > 0) {
    const jours = daysBetween(dateEntree, dateFin);
    alimConsommeeKg = ration * jours;
    alimConsommeeFcfa = alimConsommeeKg * prixAlimKgFcfa;
  }

  // Marge : uniquement si VENTE confirmée avec prix.
  let margeEstimeeFcfa: number | null = null;
  let margeStatus: TruiePerformanceEco['margeStatus'] = 'PAS_ENCORE_VENDUE';

  if (truie.typeSortie === 'VENTE' && typeof truie.prixSortieFcfa === 'number') {
    if (alimConsommeeFcfa != null) {
      margeEstimeeFcfa = truie.prixSortieFcfa - alimConsommeeFcfa;
      margeStatus = 'CALCULEE';
    } else {
      margeStatus = 'DONNEES_INSUFFISANTES';
    }
  } else if (truie.typeSortie === 'ABATTOIR' || truie.typeSortie === 'MORTALITE') {
    margeStatus = 'NON_APPLICABLE';
  } else if (!truie.dateSortie) {
    margeStatus = 'PAS_ENCORE_VENDUE';
  }

  return {
    portees,
    derniereNV,
    moyNVParPortee,
    alimConsommeeKg,
    alimConsommeeFcfa,
    margeEstimeeFcfa,
    margeStatus,
  };
}
