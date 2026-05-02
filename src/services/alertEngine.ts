/**
 * PorcTrack — Moteur d'Alertes Automatisées
 * ═══════════════════════════════════════════
 * Basé sur les standards GTTT (Gestion Technique du Troupeau de Truies)
 * et les cycles biologiques porcins :
 *
 *   Gestation    : 115 jours (±2j)
 *   Allaitement  : 28-35 jours (ferme K13 : sevrage à J28)
 *   Retour chaleur après sevrage : 3-7 jours
 *   Intervalle mise-bas : ~155 jours
 *   Mortalité anormale  : > 15% de la portée
 *
 * Le moteur analyse les données du Sheet et génère des alertes
 * classées par priorité. Certaines alertes déclenchent un workflow
 * de confirmation (action requise du porcher).
 */

import React from 'react';
import { Heart, Stethoscope, Layers, Box, Calendar } from 'lucide-react';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { Truie, BandePorcelets, TraitementSante, StockAliment, StockVeto, Saillie } from '../types/farm';
import type { Note } from '../types';
import { normaliseStatut } from '../lib/truieStatut';
import { computeBandePhase } from './bandesAggregator';
import { detectTruiesAReformer } from './perfKpiAnalyzer';
import { extractPeseesForBande } from './growthAnalyzer';
import { detectPendingTransitions, PHASE_LABEL, type PendingTransition } from './phaseEngine';

/** Fuseau horaire de référence pour toute la logique métier GTTT.
 *  L'élevage est en Côte d'Ivoire, mais les données Sheets sont saisies
 *  depuis la France (Europe/Paris). On normalise tout sur ce fuseau pour
 *  éviter les décalages DST et les différences de fuseau utilisateur. */
const FARM_TIMEZONE = 'Europe/Paris';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AlertPriority = 'CRITIQUE' | 'HAUTE' | 'NORMALE' | 'INFO';
export type AlertCategory = 'REPRO' | 'SANTE' | 'BANDES' | 'STOCK' | 'PLANNING';

export type AlertActionType =
  | 'CONFIRM_SEVRAGE'
  | 'CONFIRM_SAILLIE'
  | 'CONFIRM_MISE_BAS'
  | 'CONFIRM_REGROUPEMENT_BANDE'
  | 'CONFIRM_REFORME'
  | 'CONFIRM_SOIN'
  | 'OPEN_PHASE_MODAL'
  | 'DISMISS';

/** Métadonnées attachées à une alerte de transition de phase par poids (R15/R16).
 *  Permet à l'UI (TodayHub) de déclencher l'action 1-tap qui ouvre PhaseTransitionModal
 *  pré-rempli avec la transition suggérée. */
export interface AlertPhasePoidsMeta {
  bandeId: string;
  fromPhase: string;
  toPhase: string;
  poidsSeuilKg: number;
  poidsReelKg: number;
  reason: 'POIDS_ATTEINT' | 'POIDS_ET_AGE';
  actionType: 'OPEN_PHASE_MODAL';
}

export interface AlertAction {
  type: AlertActionType;
  label: string;
  /** Données pré-remplies à envoyer dans Sheets si l'action est confirmée. */
  payload?: Record<string, unknown>;
  /** Variante visuelle du bouton */
  variant?: 'primary' | 'danger' | 'secondary';
}

export interface FarmAlert {
  id: string;
  priority: AlertPriority;
  category: AlertCategory;
  /** Identifiant de l'animal ou de l'entité concernée */
  subjectId: string;
  subjectLabel: string;
  title: string;
  message: string;
  /** Si true, l'alerte demande une action explicite au porcher */
  requiresAction: boolean;
  actions: AlertAction[];
  createdAt: Date;
  /** Calculé à partir des données Sheets */
  dueDate?: Date;
  /** Nombre de jours en retard (>0) ou en avance (<0) */
  daysOffset?: number;
  /** Métadonnées structurées pour les actions 1-tap (R15/R16). */
  meta?: AlertPhasePoidsMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES BIOLOGIQUES
// ─────────────────────────────────────────────────────────────────────────────

const BIO = {
  GESTATION_JOURS: 115,
  LACTATION_JOURS: 28,        // sevrage à J28 (ferme K13, validé porcher 19/04/2026)
  LACTATION_MAX_JOURS: 35,
  CHALEUR_POST_SEVRAGE_JOURS: 5,  // milieu de la fenêtre 3-7j
  MORTALITE_SEUIL_PCT: 15,    // % mortalité déclenchant une alerte
  ALERTE_MB_AVANCE_JOURS: 3,  // alerter J-3 avant la MB prévue
  ALERTE_MB_RETARD_JOURS: 2,  // alerter J+2 si pas encore de MB
  REGROUPEMENT_BANDE_FENETRE: 3, // porcelets sevrés à ±3 jours → même bande possible
  RE_SAILLIE_MOYENNE_JOURS: 2,
  RE_SAILLIE_URGENTE_JOURS: 10,
  RE_SAILLIE_LIMITE_JOURS: 20,
  ECHO_DEBUT_JOURS: 25,
  ECHO_FIN_JOURS: 35,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES DE DATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse une date sérialisée Sheets (DD/MM/YYYY, YYYY-MM-DD ou serial Excel)
 * en traitant la date comme étant saisie dans le fuseau `Europe/Paris`.
 */
function parseFrDate(dateStr?: string): Date | null {
  if (!dateStr || dateStr === '—' || dateStr === '') return null;

  const toFarmMidnight = (y: number, m: number, d: number): Date => {
    const iso = `${y.toString().padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`;
    return fromZonedTime(iso, FARM_TIMEZONE);
  };

  const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return toFarmMidnight(+dmy[3], +dmy[2], +dmy[1]);

  const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return toFarmMidnight(+ymd[1], +ymd[2], +ymd[3]);

  const serial = Number(dateStr);
  if (!isNaN(serial) && serial > 20000) {
    const utcProxy = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return toFarmMidnight(
      utcProxy.getUTCFullYear(),
      utcProxy.getUTCMonth() + 1,
      utcProxy.getUTCDate(),
    );
  }
  return null;
}

function daysDiff(from: Date, to: Date = new Date()): number {
  const fromFarm = startOfDay(toZonedTime(from, FARM_TIMEZONE));
  const toFarm = startOfDay(toZonedTime(to, FARM_TIMEZONE));
  return differenceInCalendarDays(toFarm, fromFarm);
}

function addDays(date: Date, days: number): Date {
  const farmLocal = toZonedTime(date, FARM_TIMEZONE);
  const midnight = startOfDay(farmLocal);
  midnight.setDate(midnight.getDate() + days);
  const iso = `${midnight.getFullYear()}-${String(midnight.getMonth() + 1).padStart(2, '0')}-${String(midnight.getDate()).padStart(2, '0')}T00:00:00`;
  return fromZonedTime(iso, FARM_TIMEZONE);
}

function alertId(prefix: string, subjectId: string, suffix: string): string {
  return `${prefix}-${subjectId}-${suffix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RÈGLES D'ALERTE
// ─────────────────────────────────────────────────────────────────────────────

function checkMiseBas(truie: Truie, today: Date): FarmAlert | null {
  if (truie.statut === 'Morte' || truie.statut === 'Réforme') return null;
  const mbPrevue = parseFrDate(truie.dateMBPrevue);
  if (!mbPrevue) return null;

  const offset = daysDiff(mbPrevue, today);
  if (offset < -BIO.ALERTE_MB_AVANCE_JOURS || offset > BIO.ALERTE_MB_RETARD_JOURS + 15) return null;

  const isRetard = offset > BIO.ALERTE_MB_RETARD_JOURS;

  return {
    id: alertId('MB', truie.id, String(mbPrevue.getTime())),
    priority: isRetard ? 'CRITIQUE' : 'HAUTE',
    category: 'REPRO',
    subjectId: truie.id,
    subjectLabel: truie.displayId,
    title: isRetard ? `Mise-Bas en Retard — ${truie.displayId}` : `Mise-Bas Imminente — ${truie.displayId}`,
    message: isRetard
      ? `La mise-bas était prévue il y a ${offset} jour(s). Vérifier l'animal immédiatement.`
      : `Mise-bas prévue dans ${Math.abs(offset)} jour(s) (${truie.dateMBPrevue}).`,
    requiresAction: isRetard,
    dueDate: mbPrevue,
    daysOffset: offset,
    actions: [
      {
        type: 'CONFIRM_MISE_BAS',
        label: 'Enregistrer Mise-Bas',
        variant: 'primary',
        payload: {
          sheet: 'SUIVI_TRUIES_REPRODUCTION',
          idHeader: 'ID',
          idValue: truie.id,
          patch: { STATUT: 'En maternité', DATE_DERNIERE_MB: new Date().toLocaleDateString('fr-FR') },
        },
      },
      { type: 'DISMISS', label: 'Plus tard', variant: 'secondary' },
    ],
    createdAt: new Date(),
  };
}

function checkSevrage(bande: BandePorcelets, today: Date): FarmAlert | null {
  if (bande.dateSevrageReelle) return null;
  const statut = (bande.statut || '').toLowerCase();
  if (statut.includes('sevr') || statut.includes('croissance') || statut.includes('finition') || statut.includes('engraiss') || statut.includes('archiv')) return null;

  const dateMB = parseFrDate(bande.dateMB);
  if (!dateMB) return null;

  const ageJours = daysDiff(dateMB, today);
  if (ageJours < BIO.LACTATION_JOURS) return null;

  const retard = ageJours - BIO.LACTATION_JOURS;
  if (retard > 30) return null;

  const nbVivants = bande.vivants ?? 0;

  return {
    id: alertId('SEV', bande.id, String(dateMB.getTime())),
    priority: retard > 7 ? 'HAUTE' : 'NORMALE',
    category: 'BANDES',
    subjectId: bande.id,
    subjectLabel: `Bande ${bande.id}`,
    title: `Sevrage à Confirmer — ${bande.id}`,
    message: retard === 0
      ? `La bande ${bande.id} atteint J+${BIO.LACTATION_JOURS} aujourd'hui (${nbVivants} vivants).`
      : `Sevrage prévu depuis ${retard} jour(s) — ${nbVivants} porcelet(s) sous mère.`,
    requiresAction: true,
    dueDate: addDays(dateMB, BIO.LACTATION_JOURS),
    daysOffset: retard,
    actions: [
      {
        type: 'CONFIRM_SEVRAGE',
        label: `Confirmer Sevrage (${nbVivants})`,
        variant: 'primary',
        payload: {
          sheet: 'PORCELETS_BANDES_DETAIL',
          idHeader: 'ID',
          idValue: bande.id,
          patch: {
            STATUT: 'Sevrés',
            DATE_SEVRAGE_REELLE: new Date().toLocaleDateString('fr-FR'),
            SEVRES: nbVivants,
          },
          truieUpdate: bande.truie ? {
            sheet: 'SUIVI_TRUIES_REPRODUCTION',
            idHeader: 'ID',
            idValue: bande.truie,
            patch: { STATUT: 'En attente saillie', DATE_MB_PREVUE: '' },
          } : null,
        },
      },
      { type: 'DISMISS', label: 'Pas encore', variant: 'secondary' },
    ],
    createdAt: new Date(),
  };
}

function checkRetourChaleur(truie: Truie, bandes: BandePorcelets[], today: Date): FarmAlert | null {
  if (truie.statut === 'Morte' || truie.statut === 'Réforme') return null;
  const isEnAttenteSaillie = normaliseStatut(truie.statut) === 'VIDE';
  if (!isEnAttenteSaillie) return null;

  const bandesTruie = bandes.filter(b => b.truie === truie.id || b.truie === truie.displayId || b.boucleMere === truie.boucle);
  if (bandesTruie.length === 0) return null;

  let dateSevrage: Date | null = null;
  for (const b of bandesTruie) {
    const dSevrage = parseFrDate(b.dateSevrageReelle);
    if (dSevrage) {
      if (!dateSevrage || dSevrage.getTime() > dateSevrage.getTime()) dateSevrage = dSevrage;
      continue;
    }
    const dMB = parseFrDate(b.dateMB);
    if (dMB) {
      const dEstim = addDays(dMB, BIO.LACTATION_JOURS);
      if (!dateSevrage || dEstim.getTime() > dateSevrage.getTime()) dateSevrage = dEstim;
    }
  }
  if (!dateSevrage) return null;

  const joursSevrage = daysDiff(dateSevrage, today);
  if (joursSevrage < BIO.CHALEUR_POST_SEVRAGE_JOURS - 1 || joursSevrage > 14) return null;

  return {
    id: alertId('CHA', truie.id, String(dateSevrage.getTime())),
    priority: joursSevrage > 10 ? 'HAUTE' : 'NORMALE',
    category: 'REPRO',
    subjectId: truie.id,
    subjectLabel: truie.displayId,
    title: `Chaleur attendue — ${truie.displayId}`,
    message: `${truie.displayId} est en attente saillie depuis J+${joursSevrage} post-sevrage. Surveiller les chaleurs (fenêtre J+3 à J+7).`,
    requiresAction: true,
    daysOffset: joursSevrage,
    actions: [
      {
        type: 'CONFIRM_SAILLIE',
        label: 'Enregistrer Saillie',
        variant: 'primary',
        payload: {
          sheet: 'SUIVI_TRUIES_REPRODUCTION',
          idHeader: 'ID',
          idValue: truie.id,
          patch: {
            STATUT: 'Pleine',
            DATE_SAILLIE: new Date().toLocaleDateString('fr-FR'),
            DATE_MB_PREVUE: addDays(new Date(), BIO.GESTATION_JOURS).toLocaleDateString('fr-FR'),
          },
        },
      },
      { type: 'DISMISS', label: 'Pas encore', variant: 'secondary' },
    ],
    createdAt: new Date(),
  };
}

function checkMortalite(bande: BandePorcelets): FarmAlert | null {
  if (bande.statut === 'RECAP') return null;
  const isSevree = !!bande.dateSevrageReelle || /sevr/i.test(bande.statut || '') || /archiv/i.test(bande.statut || '') || !!bande.dateSeparation;
  if (isSevree) return null;

  const nv = bande.nv ?? 0;
  const morts = bande.morts ?? 0;
  if (nv <= 0 || morts <= 0) return null;

  const mortsSafe = Math.min(morts, nv);
  const pct = (mortsSafe / nv) * 100;
  if (pct < BIO.MORTALITE_SEUIL_PCT) return null;

  let priority: AlertPriority = 'HAUTE';
  if (pct >= 30) priority = 'CRITIQUE';

  return {
    id: alertId('MORT', bande.id, String(mortsSafe)),
    priority,
    category: 'SANTE',
    subjectId: bande.id,
    subjectLabel: `Bande ${bande.id}`,
    title: `Mortalité Portée ${Math.round(pct)}%`,
    message: `${mortsSafe} mort(s) sur ${nv} nés vivants (${Math.round(pct)}%). Seuil d'alerte dépassé.`,
    requiresAction: true,
    actions: [{ type: 'DISMISS', label: 'Noté', variant: 'secondary' }],
    createdAt: new Date(),
  };
}

function checkStock(stock: StockAliment): FarmAlert | null {
  if (stock.statutStock === 'RUPTURE') {
    return {
      id: alertId('STK', stock.id, 'RUPTURE'),
      priority: 'CRITIQUE',
      category: 'STOCK',
      subjectId: stock.id,
      subjectLabel: stock.libelle,
      title: `Stock Épuisé — ${stock.libelle}`,
      message: `Rupture de stock détectée. Commander immédiatement.`,
      requiresAction: true,
      actions: [{ type: 'DISMISS', label: 'C\'est fait' }],
      createdAt: new Date(),
    };
  }
  if (stock.statutStock === 'BAS') {
    return {
      id: alertId('STK', stock.id, 'BAS'),
      priority: 'HAUTE',
      category: 'STOCK',
      subjectId: stock.id,
      subjectLabel: stock.libelle,
      title: `Stock Bas — ${stock.libelle}`,
      message: `Niveau de stock sous le seuil d'alerte (${stock.stockActuel}${stock.unite}).`,
      requiresAction: true,
      actions: [{ type: 'DISMISS', label: 'Noté' }],
      createdAt: new Date(),
    };
  }
  return null;
}

/**
 * R5b — Stock vétérinaire (vaccins, antibiotiques, etc.).
 * Logique identique à `checkStock` (aliments) mais avec un calcul du
 * statut local : `StockVeto.statutStock` est optionnel et rarement
 * renseigné côté Sheets/Supabase, donc on dérive du couple
 * (stockActuel, seuilAlerte ?? stockMin).
 */
function checkStockVeto(stock: StockVeto): FarmAlert | null {
  const stockActuel = stock.stockActuel ?? 0;
  const seuil = stock.seuilAlerte > 0 ? stock.seuilAlerte : (stock.stockMin ?? 0);
  const statut: 'RUPTURE' | 'BAS' | 'OK' =
    stock.statutStock === 'RUPTURE' || stockActuel <= 0
      ? 'RUPTURE'
      : stock.statutStock === 'BAS' || (seuil > 0 && stockActuel <= seuil)
        ? 'BAS'
        : 'OK';

  if (statut === 'RUPTURE') {
    return {
      id: alertId('VET', stock.id, 'RUPTURE'),
      priority: 'CRITIQUE',
      category: 'STOCK',
      subjectId: stock.id,
      subjectLabel: stock.produit,
      title: `Véto Épuisé — ${stock.produit}`,
      message: `Rupture de stock vétérinaire détectée. Commander immédiatement.`,
      requiresAction: true,
      actions: [{ type: 'DISMISS', label: 'C\'est fait' }],
      createdAt: new Date(),
    };
  }
  if (statut === 'BAS') {
    return {
      id: alertId('VET', stock.id, 'BAS'),
      priority: 'HAUTE',
      category: 'STOCK',
      subjectId: stock.id,
      subjectLabel: stock.produit,
      title: `Véto Bas — ${stock.produit}`,
      message: `Niveau de stock vétérinaire sous le seuil d'alerte (${stockActuel}${stock.unite}).`,
      requiresAction: true,
      actions: [{ type: 'DISMISS', label: 'Noté' }],
      createdAt: new Date(),
    };
  }
  return null;
}

function checkRegroupementBandes(bandes: BandePorcelets[], today: Date): FarmAlert[] {
  const sevrables = bandes.filter(b => {
    if (b.dateSevrageReelle || (b.statut || '').toLowerCase().includes('sevr')) return false;
    const dMB = parseFrDate(b.dateMB);
    if (!dMB) return false;
    const age = daysDiff(dMB, today);
    return age >= BIO.LACTATION_JOURS - BIO.REGROUPEMENT_BANDE_FENETRE && age <= BIO.LACTATION_JOURS + BIO.REGROUPEMENT_BANDE_FENETRE;
  });

  if (sevrables.length < 2) return [];

  const totalVivants = sevrables.reduce((acc, b) => acc + (b.vivants || 0), 0);
  return [{
    id: alertId('REG', 'GLOBAL', String(today.getTime())),
    priority: 'INFO',
    category: 'BANDES',
    subjectId: 'GROUP',
    subjectLabel: `${sevrables.length} bandes sevrables`,
    title: 'Suggestion Regroupement',
    message: `Opportunité de regrouper ${sevrables.length} portées sevrables à ±${BIO.REGROUPEMENT_BANDE_FENETRE}j (total ${totalVivants} porcelets).`,
    requiresAction: false,
    actions: [{ type: 'DISMISS', label: 'Noté' }],
    createdAt: new Date(),
  }];
}

function checkFenetreEcho(truie: Truie, saillies: Saillie[], today: Date): FarmAlert | null {
  if (normaliseStatut(truie.statut) !== 'PLEINE') return null;
  const active = saillies.find(s => (s.truieId === truie.id || s.truieId === truie.displayId) && s.statut === 'Active');
  if (!active) return null;
  const dSaillie = parseFrDate(active.dateSaillie);
  if (!dSaillie) return null;
  const jours = daysDiff(dSaillie, today);

  if (jours >= BIO.ECHO_DEBUT_JOURS && jours <= BIO.ECHO_FIN_JOURS) {
    return {
      id: alertId('ECH', truie.id, String(dSaillie.getTime())),
      priority: 'INFO',
      category: 'REPRO',
      subjectId: truie.id,
      subjectLabel: truie.displayId,
      title: 'Fenêtre Échographie',
      message: `${truie.displayId} est à J+${jours} post-saillie. Période idéale pour l'écho (J25-J35).`,
      requiresAction: false,
      actions: [{ type: 'DISMISS', label: 'Fait' }],
      createdAt: new Date(),
      daysOffset: jours
    };
  }
  return null;
}

function checkReSaillieProactive(truie: Truie, today: Date): FarmAlert | null {
  if (normaliseStatut(truie.statut) !== 'VIDE') return null;
  if (!truie.notes) return null;
  const match = truie.notes.match(/Retour chaleur (\d{2}\/\d{2}\/\d{4})/g);
  if (!match) return null;
  const lastDateStr = match[match.length - 1].replace('Retour chaleur ', '');
  const dRetour = parseFrDate(lastDateStr);
  if (!dRetour) return null;
  const jours = daysDiff(dRetour, today);

  if (jours >= 0 && jours <= BIO.RE_SAILLIE_LIMITE_JOURS) {
    let priority: AlertPriority = 'NORMALE';
    if (jours >= BIO.RE_SAILLIE_URGENTE_JOURS) priority = 'CRITIQUE';
    else if (jours >= BIO.RE_SAILLIE_MOYENNE_JOURS) priority = 'HAUTE';

    return {
      id: alertId('RSA', truie.id, String(dRetour.getTime())),
      priority,
      category: 'REPRO',
      subjectId: truie.id,
      subjectLabel: truie.displayId,
      title: 'Re-Saillie Proactive',
      message: `${truie.displayId} a eu un retour en chaleur il y a ${jours} jour(s).`,
      requiresAction: true,
      actions: [
        { type: 'CONFIRM_SAILLIE', label: 'Re-Saillir', payload: { truieId: truie.id } },
        { type: 'DISMISS', label: 'Plus tard' }
      ],
      createdAt: new Date(),
      daysOffset: jours
    };
  }
  return null;
}

function checkRetardPhase(bande: BandePorcelets, today: Date): FarmAlert | null {
  if (bande.dateSevrageReelle || (bande.statut || '').toLowerCase().includes('sevr')) return null;
  const dMB = parseFrDate(bande.dateMB);
  if (!dMB) return null;
  const age = daysDiff(dMB, today);

  if (age > BIO.LACTATION_JOURS + 3) {
    return {
      id: alertId('retard', bande.id, 'phase'),
      priority: 'NORMALE',
      category: 'BANDES',
      subjectId: bande.id,
      subjectLabel: bande.idPortee || bande.id,
      title: 'Retard de Sevrage',
      message: `Bande en maternité depuis ${age} jours (sevrage théorique J28).`,
      requiresAction: true,
      actions: [{ type: 'DISMISS', label: 'Noté' }],
      createdAt: new Date(),
      daysOffset: age - BIO.LACTATION_JOURS
    };
  }
  return null;
}

function checkSurdensiteLoges(bandes: BandePorcelets[], _today: Date): FarmAlert | null {
  const engraissement = bandes.filter(b => {
     const s = (b.statut || '').toLowerCase();
     return s.includes('croissance') || s.includes('finition') || s.includes('engraiss');
  });
  const CAPACITY = 6;

  if (engraissement.length > CAPACITY) {
    return {
      id: 'surdensite-engraissement',
      priority: 'HAUTE',
      category: 'BANDES',
      subjectId: 'GLOBAL',
      subjectLabel: 'Engraissement',
      title: 'Surdensité Loges',
      message: `${engraissement.length} bandes en engraissement pour ${CAPACITY} loges dispos. Risque de mélange ou stress.`,
      requiresAction: true,
      actions: [{ type: 'DISMISS', label: 'OK' }],
      createdAt: new Date(),
    };
  }
  return null;
}

function checkTruiesAReformer(truies: Truie[], bandes: BandePorcelets[], saillies: Saillie[], today: Date): FarmAlert[] {
  try {
    const candidates = detectTruiesAReformer(truies, bandes, saillies, today);
    return candidates.map(c => ({
      id: alertId('REF', c.truie.id, c.motif),
      priority: c.motif === 'PERF_INSUFFISANTE' ? 'HAUTE' : 'NORMALE',
      category: 'REPRO',
      subjectId: c.truie.id,
      subjectLabel: c.truie.displayId,
      title: `Réforme Suggérée — ${c.truie.displayId}`,
      message: `Motif : ${c.motif}. Détail : ${c.detail}. La productivité de cette truie est sous les standards.`,
      requiresAction: true,
      actions: [
        {
          type: 'CONFIRM_REFORME',
          label: 'Passer en Réforme',
          variant: 'danger',
          payload: { sheet: 'SUIVI_TRUIES_REPRODUCTION', idHeader: 'ID', idValue: c.truie.id, patch: { STATUT: 'Réforme' } }
        },
        { type: 'DISMISS', label: 'Garder', variant: 'secondary' }
      ],
      createdAt: new Date()
    }));
  } catch (e) {
    console.error('[AlertEngine] R12 error:', e);
    return [];
  }
}

function checkManquePesee(bande: BandePorcelets, notes: Note[], today: Date): FarmAlert | null {
  const phase = computeBandePhase(bande, today);
  if (phase !== 'POST_SEVRAGE' && phase !== 'ENGRAISSEMENT' && phase !== 'CROISSANCE' && phase !== 'FINITION') return null;

  const pesees = extractPeseesForBande(bande.id, notes || []);
  const derniere = pesees.length > 0 ? pesees[pesees.length - 1] : null;

  let joursSansPesee: number;
  if (!derniere) {
    const dateRef = parseFrDate(bande.dateSevrageReelle || bande.dateSevragePrevue);
    if (!dateRef) return null;
    joursSansPesee = daysDiff(dateRef, today);
  } else {
    joursSansPesee = daysDiff(new Date(derniere.date), today);
  }

  const SEUIL_VIGILANCE = 21;
  if (joursSansPesee <= SEUIL_VIGILANCE) return null;

  return {
    id: alertId('PES', bande.id, 'LATE'),
    priority: joursSansPesee > 35 ? 'HAUTE' : 'NORMALE',
    category: 'BANDES',
    subjectId: bande.id,
    subjectLabel: bande.idPortee || bande.id,
    title: 'Manque de Pesée',
    message: `Aucune pesée enregistrée depuis ${joursSansPesee} jours pour ce lot.`,
    requiresAction: true,
    actions: [{ type: 'DISMISS', label: 'Ignorer' }],
    createdAt: new Date(),
    daysOffset: joursSansPesee
  };
}

function checkPorteesOrphelines(truies: Truie[], bandes: BandePorcelets[]): FarmAlert[] {
  const mortes = truies.filter(t => t.statut === 'Morte');
  if (mortes.length === 0) return [];

  const alerts: FarmAlert[] = [];
  for (const t of mortes) {
    const orpheline = bandes.find(b => (b.truie === t.id || b.boucleMere === t.boucle) && (b.statut || '').toLowerCase().includes('sous'));
    if (orpheline) {
      alerts.push({
        id: alertId('ORPH', orpheline.id, t.id),
        priority: 'CRITIQUE',
        category: 'BANDES',
        subjectId: orpheline.id,
        subjectLabel: orpheline.idPortee || orpheline.id,
        title: 'Portée Orpheline',
        message: `La truie ${t.displayId} est morte. ${orpheline.vivants || 0} porcelets sont sans mère. Action requise : adoption ou sevrage précoce.`,
        requiresAction: true,
        actions: [
          { type: 'CONFIRM_SEVRAGE', label: 'Sevrage Précoce', variant: 'primary' },
          { type: 'DISMISS', label: 'Noté', variant: 'secondary' }
        ],
        createdAt: new Date()
      });
    }
  }
  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// R15 / R16 — Transitions de phase par poids (s'appuie sur phaseEngine)
// ─────────────────────────────────────────────────────────────────────────────

/** R15 — Passage de phase suggéré par poids (CROISSANCE / ENGRAISSEMENT / FINITION).
 *  Filtre les transitions retournées par phaseEngine pour ne garder que celles
 *  déclenchées par le poids (pas l'âge seul) et qui ne mènent pas à SORTIE
 *  (R16 traite ce cas séparément avec une priorité plus élevée). */
function evaluerR15PassagePhasePoids(transition: PendingTransition): FarmAlert | null {
  if (transition.toPhase === 'SORTIE') return null;
  if (transition.reason !== 'POIDS_ATTEINT' && transition.reason !== 'POIDS_ET_AGE') return null;
  if (transition.poidsSeuilKg === undefined || transition.poidsReelKg === undefined) return null;

  const labelPhase = PHASE_LABEL[transition.toPhase] ?? transition.toPhase;

  return {
    id: `phase-poids-${transition.bandeId}-${transition.toPhase}`,
    priority: 'NORMALE',
    category: 'BANDES',
    subjectId: transition.bandeId,
    subjectLabel: transition.label,
    title: `Passage en ${labelPhase}`,
    message: `Bande ${transition.bandeId} : poids ${transition.poidsReelKg} kg ≥ seuil ${transition.poidsSeuilKg} kg.`,
    requiresAction: true,
    actions: [
      { type: 'OPEN_PHASE_MODAL', label: `Passer en ${labelPhase}`, variant: 'primary' },
      { type: 'DISMISS', label: 'Plus tard', variant: 'secondary' },
    ],
    createdAt: new Date(),
    meta: {
      bandeId: transition.bandeId,
      fromPhase: transition.fromPhase,
      toPhase: transition.toPhase,
      poidsSeuilKg: transition.poidsSeuilKg,
      poidsReelKg: transition.poidsReelKg,
      reason: transition.reason,
      actionType: 'OPEN_PHASE_MODAL',
    },
  };
}

/** R16 — Sortie abattoir imminente (poids ≥ 110 kg).
 *  Priorité HAUTE : la bande est commercialisable, programmer enlèvement. */
function evaluerR16SortieImminente(transition: PendingTransition): FarmAlert | null {
  if (transition.toPhase !== 'SORTIE') return null;
  if (transition.reason !== 'POIDS_ATTEINT' && transition.reason !== 'POIDS_ET_AGE') return null;
  if (transition.poidsSeuilKg === undefined || transition.poidsReelKg === undefined) return null;

  return {
    id: `sortie-${transition.bandeId}`,
    priority: 'HAUTE',
    category: 'BANDES',
    subjectId: transition.bandeId,
    subjectLabel: transition.label,
    title: 'Bande prête abattoir',
    message: `Bande ${transition.bandeId} : poids ${transition.poidsReelKg} kg ≥ ${transition.poidsSeuilKg} kg. Programmer enlèvement.`,
    requiresAction: true,
    actions: [
      { type: 'OPEN_PHASE_MODAL', label: 'Programmer sortie', variant: 'primary' },
      { type: 'DISMISS', label: 'Plus tard', variant: 'secondary' },
    ],
    createdAt: new Date(),
    meta: {
      bandeId: transition.bandeId,
      fromPhase: transition.fromPhase,
      toPhase: transition.toPhase,
      poidsSeuilKg: transition.poidsSeuilKg,
      poidsReelKg: transition.poidsReelKg,
      reason: transition.reason,
      actionType: 'OPEN_PHASE_MODAL',
    },
  };
}

export interface AlertEngineInput {
  truies: Truie[];
  bandes: BandePorcelets[];
  sante: TraitementSante[];
  stockAliments: StockAliment[];
  /**
   * Stock vétérinaire (vaccins, antibiotiques, désinfectants…).
   * Optionnel pour rétrocompat avec les call sites qui ne le passent pas
   * encore — sera traité comme `[]` si absent.
   */
  stockVetos?: StockVeto[];
  saillies: Saillie[];
  notes: Note[];
}

export function runAlertEngine(input: AlertEngineInput): FarmAlert[] {
  const today = new Date();
  const alerts: FarmAlert[] = [];

  for (const truie of input.truies) {
    const a = checkMiseBas(truie, today);
    if (a) alerts.push(a);
  }
  for (const bande of input.bandes) {
    const a = checkSevrage(bande, today);
    if (a) alerts.push(a);
  }
  for (const truie of input.truies) {
    const a = checkRetourChaleur(truie, input.bandes, today);
    if (a) alerts.push(a);
  }
  for (const bande of input.bandes) {
    const a = checkMortalite(bande);
    if (a) alerts.push(a);
  }
  for (const stock of input.stockAliments) {
    const a = checkStock(stock);
    if (a) alerts.push(a);
  }
  for (const v of input.stockVetos ?? []) {
    const a = checkStockVeto(v);
    if (a) alerts.push(a);
  }
  const regroupementAlerts = checkRegroupementBandes(input.bandes, today);
  for (const a of regroupementAlerts) alerts.push(a);

  for (const truie of input.truies) {
    const a = checkFenetreEcho(truie, input.saillies, today);
    if (a) alerts.push(a);
  }
  for (const truie of input.truies) {
    const a = checkReSaillieProactive(truie, today);
    if (a) alerts.push(a);
  }
  for (const bande of input.bandes) {
    const a = checkRetardPhase(bande, today);
    if (a) alerts.push(a);
  }
  const surdensite = checkSurdensiteLoges(input.bandes, today);
  if (surdensite) alerts.push(surdensite);

  const reformeAlerts = checkTruiesAReformer(input.truies, input.bandes, input.saillies, today);
  for (const a of reformeAlerts) alerts.push(a);

  for (const bande of input.bandes) {
    const a = checkManquePesee(bande, input.notes, today);
    if (a) alerts.push(a);
  }
  const orphelines = checkPorteesOrphelines(input.truies, input.bandes);
  for (const a of orphelines) alerts.push(a);

  // R15 / R16 — Transitions de phase suggérées par poids (s'appuient sur phaseEngine)
  try {
    const transitions = detectPendingTransitions(input.bandes, today);
    for (const t of transitions) {
      const r16 = evaluerR16SortieImminente(t);
      if (r16) { alerts.push(r16); continue; }
      const r15 = evaluerR15PassagePhasePoids(t);
      if (r15) alerts.push(r15);
    }
  } catch (e) {
    console.error('[AlertEngine] R15/R16 error:', e);
  }

  const PRIORITY_ORDER: Record<AlertPriority, number> = { CRITIQUE: 0, HAUTE: 1, NORMALE: 2, INFO: 3 };
  alerts.sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return (a.daysOffset ?? 0) - (b.daysOffset ?? 0);
  });

  return alerts;
}

export function alertPriorityColor(priority: AlertPriority): string {
  return { CRITIQUE: 'rose', HAUTE: 'amber', NORMALE: 'blue', INFO: 'slate' }[priority];
}

export function alertCategoryIcon(category: AlertCategory): React.ReactNode {
  const iconMap: Record<AlertCategory, React.ComponentType<{ size?: number; className?: string }>> = {
    REPRO:    Heart,
    SANTE:    Stethoscope,
    BANDES:   Layers,
    STOCK:    Box,
    PLANNING: Calendar,
  };
  const Icon = iconMap[category];
  return Icon ? React.createElement(Icon, { size: 18 }) : null;
}
