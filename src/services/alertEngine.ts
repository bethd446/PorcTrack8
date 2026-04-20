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
import type { Truie, BandePorcelets, TraitementSante, StockAliment } from '../types/farm';

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
  | 'DISMISS';

export interface AlertAction {
  type: AlertActionType;
  label: string;
  /** Données pré-remplies à envoyer dans Sheets si l'action est confirmée.
   *  Structure dynamique (append_row vs update_row + actions secondaires) :
   *  consommée par `confirmationQueue.confirmAction` qui narrow par champs. */
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
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES DE DATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse une date sérialisée Sheets (DD/MM/YYYY, YYYY-MM-DD ou serial Excel)
 * en traitant la date comme étant saisie dans le fuseau `Europe/Paris`.
 *
 * Exemple : "27/03/2026" → l'instant correspondant à 00:00:00 à Paris
 * le 27 mars 2026, quel que soit le fuseau du runtime.
 */
function parseFrDate(dateStr?: string): Date | null {
  if (!dateStr || dateStr === '—' || dateStr === '') return null;

  const toFarmMidnight = (y: number, m: number, d: number): Date => {
    // Construit l'ISO "YYYY-MM-DDT00:00:00" et l'interprète comme Europe/Paris
    const iso = `${y.toString().padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`;
    return fromZonedTime(iso, FARM_TIMEZONE);
  };

  // DD/MM/YYYY
  const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return toFarmMidnight(+dmy[3], +dmy[2], +dmy[1]);

  // YYYY-MM-DD
  const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return toFarmMidnight(+ymd[1], +ymd[2], +ymd[3]);

  // Serial Sheets (jours depuis 1899-12-30, epoch Excel/Sheets)
  const serial = Number(dateStr);
  if (!isNaN(serial) && serial > 20000) {
    // Le serial Sheets représente une date civile, pas un instant UTC.
    // On reconstruit la date civile puis on la réinterprète en Europe/Paris.
    const utcProxy = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return toFarmMidnight(
      utcProxy.getUTCFullYear(),
      utcProxy.getUTCMonth() + 1,
      utcProxy.getUTCDate(),
    );
  }
  return null;
}

/**
 * Différence en JOURS CIVILS (calendaires) entre deux dates, en se plaçant
 * dans le fuseau Europe/Paris. Robuste aux changements d'heure (DST) et
 * aux différences de fuseau de l'utilisateur : un 27 mars et un 30 mars
 * retournent toujours 3 jours d'écart, même si la nuit du 28-29 ne fait
 * que 23h (passage heure d'été).
 *
 * Retourne un entier positif si `to` > `from`, négatif sinon.
 */
function daysDiff(from: Date, to: Date = new Date()): number {
  const fromFarm = startOfDay(toZonedTime(from, FARM_TIMEZONE));
  const toFarm = startOfDay(toZonedTime(to, FARM_TIMEZONE));
  return differenceInCalendarDays(toFarm, fromFarm);
}

/**
 * Ajoute N jours CIVILS à une date en raisonnant dans le fuseau Europe/Paris.
 * Évite les dérives DST de `setDate` sur 24h*N millisecondes.
 */
function addDays(date: Date, days: number): Date {
  const farmLocal = toZonedTime(date, FARM_TIMEZONE);
  const midnight = startOfDay(farmLocal);
  midnight.setDate(midnight.getDate() + days);
  // Ré-interprète la date civile résultante comme instant Europe/Paris
  const iso = `${midnight.getFullYear()}-${String(midnight.getMonth() + 1).padStart(2, '0')}-${String(midnight.getDate()).padStart(2, '0')}T00:00:00`;
  return fromZonedTime(iso, FARM_TIMEZONE);
}

function alertId(prefix: string, subjectId: string, suffix: string): string {
  return `${prefix}-${subjectId}-${suffix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RÈGLES D'ALERTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * R1 — Mise-Bas Imminente ou en Retard
 * Fenêtre : J-3 à J+2 par rapport à la date prévue
 */
function checkMiseBas(truie: Truie, today: Date): FarmAlert | null {
  const mbPrevue = parseFrDate(truie.dateMBPrevue);
  if (!mbPrevue) return null;

  const offset = daysDiff(mbPrevue, today); // positif = retard

  if (offset < -BIO.ALERTE_MB_AVANCE_JOURS || offset > BIO.ALERTE_MB_RETARD_JOURS + 5) return null;

  const isRetard = offset > BIO.ALERTE_MB_RETARD_JOURS;

  return {
    id: alertId('MB', truie.id, String(mbPrevue.getTime())),
    priority: isRetard ? 'CRITIQUE' : 'HAUTE',
    category: 'REPRO',
    subjectId: truie.id,
    subjectLabel: truie.displayId,
    title: isRetard
      ? `Mise-Bas en Retard — ${truie.displayId}`
      : `Mise-Bas Imminente — ${truie.displayId}`,
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
          // Noms exacts des colonnes du Sheet SUIVI_TRUIES_REPRODUCTION
          patch: { STATUT: 'En maternité', DATE_DERNIERE_MB: new Date().toLocaleDateString('fr-FR') },
        },
      },
      { type: 'DISMISS', label: 'Plus tard', variant: 'secondary' },
    ],
    createdAt: new Date(),
  };
}

/**
 * R2 — Sevrage à Confirmer
 * Déclenché à J+28 de la mise-bas réelle (sevrage ferme K13, constante BIO.LACTATION_JOURS)
 */
function checkSevrage(bande: BandePorcelets, today: Date): FarmAlert | null {
  if (bande.statut === 'Sevrés' || bande.statut === 'Sevrée' || bande.statut === 'Archivée') return null;
  const dateMB = parseFrDate(bande.dateMB);
  if (!dateMB) return null;

  const ageJours = daysDiff(dateMB, today);
  if (ageJours < BIO.LACTATION_JOURS) return null;

  const retard = ageJours - BIO.LACTATION_JOURS;
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
          // Noms exacts des colonnes du Sheet PORCELETS_BANDES_DETAIL
          patch: {
            STATUT: 'Sevrés',
            DATE_SEVRAGE_REELLE: new Date().toLocaleDateString('fr-FR'),
            SEVRES: nbVivants,
          },
          // Mise à jour truie mère si connue
          truieUpdate: bande.truie ? {
            sheet: 'SUIVI_TRUIES_REPRODUCTION',
            idHeader: 'ID',
            idValue: bande.truie,
            // STATUT → En attente saillie (sevrée), et on efface la date MB prévue
            patch: { STATUT: 'En attente saillie', DATE_MB_PREVUE: '' },
          } : null,
        },
      },
      { type: 'DISMISS', label: 'Pas encore', variant: 'secondary' },
    ],
    createdAt: new Date(),
  };
}

/**
 * R3 — Retour en Chaleur Post-Sevrage
 * Déclenché J+5 après le sevrage si la truie est encore "En attente saillie".
 *
 * Le schéma Sheets V20 n'expose plus `dateDerniereMB` sur la truie : la date
 * de sevrage est donc dérivée de la bande la plus récente liée à cette truie
 * (via `bande.truie === truie.id` ou le rapprochement par boucle mère),
 * en préférant `dateSevrageReelle` puis en retombant sur `dateMB + 21j`.
 */
function checkRetourChaleur(
  truie: Truie,
  bandes: BandePorcelets[],
  today: Date,
): FarmAlert | null {
  const statutNorm = truie.statut?.toLowerCase() ?? '';
  const stadeNorm = truie.stade?.toLowerCase() ?? '';
  const isEnAttenteSaillie =
    statutNorm === 'en attente saillie' ||
    stadeNorm === 'en attente saillie' ||
    stadeNorm === 'en attente saillie (sevrée)';
  if (!isEnAttenteSaillie) return null;

  // Bande la plus récente associée à cette truie (par id ou par boucle)
  const bandesTruie = bandes.filter(b =>
    b.truie === truie.id ||
    b.truie === truie.displayId ||
    b.boucleMere === truie.boucle,
  );
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
  if (joursSevrage < BIO.CHALEUR_POST_SEVRAGE_JOURS - 1) return null;
  if (joursSevrage > 14) return null; // trop tard, autre problème

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
          // Noms exacts des colonnes du Sheet SUIVI_TRUIES_REPRODUCTION
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

/**
 * R4 — Mortalité Anormale dans une Bande
 * Déclenché si morts > 15% des nés vivants
 *
 * Garde-fous importants (cf. bug "Mortalité 100%" x10 faux positifs) :
 *  - Ignore les lignes RECAP (agrégats non-réels issus du Sheet).
 *  - Ignore les bandes déjà Sevrés/Sevrée/Archivée (porcelets sortis de
 *    maternité — un `vivants=0` y signifie "déjà transférés", pas "morts").
 *  - Ignore les bandes sans naissances enregistrées (`nv === 0`) : diviser
 *    par zéro ou traiter `0/0` comme 100% n'a pas de sens métier.
 *  - Ignore les bandes sans mortalité enregistrée (`morts === 0`) : évite
 *    tout risque d'arrondi ou de faux positif sur données vides.
 *  - Clamp `morts` à `nv` (données incohérentes) pour ne pas afficher >100%.
 */
function checkMortalite(bande: BandePorcelets): FarmAlert | null {
  // Exclure les lignes RECAP et les bandes hors maternité (porcelets sortis)
  const statut = bande.statut;
  if (
    statut === 'RECAP' ||
    statut === 'Sevrés' ||
    statut === 'Sevrée' ||
    statut === 'Archivée'
  ) return null;

  const nv = bande.nv ?? 0;
  const morts = bande.morts ?? 0;

  // Pas de données de naissance ou de mortalité → rien à alerter
  if (nv <= 0) return null;
  if (morts <= 0) return null;

  // Clamp morts à nv pour éviter des pourcentages > 100 sur données incohérentes
  const mortsSafe = Math.min(morts, nv);
  const pct = (mortsSafe / nv) * 100;
  if (pct < BIO.MORTALITE_SEUIL_PCT) return null;

  return {
    id: alertId('MORT', bande.id, String(mortsSafe)),
    priority: pct > 30 ? 'CRITIQUE' : 'HAUTE',
    category: 'SANTE',
    subjectId: bande.id,
    subjectLabel: `Bande ${bande.id}`,
    title: `Mortalité Anormale — ${bande.id}`,
    message: `${mortsSafe} mort(s) sur ${nv} nés vivants (${Math.round(pct)}%). Seuil d'alerte : ${BIO.MORTALITE_SEUIL_PCT}%.`,
    requiresAction: true,
    actions: [
      {
        type: 'CONFIRM_SOIN',
        label: 'Signaler à la Vétérinaire',
        variant: 'danger',
        payload: {
          sheet: 'JOURNAL_SANTE',
          values: [
            new Date().toISOString(), 'BANDE', bande.id,
            'Urgent', 'Mortalité anormale', `${mortsSafe} morts / ${nv} NV (${Math.round(pct)}%)`, 'Auto'
          ],
        },
      },
      { type: 'DISMISS', label: 'Noté', variant: 'secondary' },
    ],
    createdAt: new Date(),
  };
}

/**
 * R5 — Stock Critique
 */
function checkStock(stock: StockAliment): FarmAlert | null {
  if (stock.statutStock === 'OK') return null;
  const isRupture = stock.statutStock === 'RUPTURE';

  return {
    id: alertId('STK', stock.id, stock.statutStock),
    priority: isRupture ? 'CRITIQUE' : 'HAUTE',
    category: 'STOCK',
    subjectId: stock.id,
    subjectLabel: stock.libelle,
    title: `Stock ${isRupture ? 'Épuisé' : 'Bas'} — ${stock.libelle}`,
    message: isRupture
      ? `${stock.libelle} est en rupture (${stock.stockActuel} ${stock.unite} restant).`
      : `${stock.libelle} est en dessous du seuil d'alerte (${stock.stockActuel}/${stock.seuilAlerte} ${stock.unite}).`,
    requiresAction: false,
    actions: [{ type: 'DISMISS', label: 'Compris', variant: 'secondary' }],
    createdAt: new Date(),
  };
}

/**
 * R6 — Regroupement de Bandes Suggéré
 * Si ≥2 bandes sevrées à ±3 jours → suggérer regroupement
 */
function checkRegroupementBandes(bandes: BandePorcelets[], today: Date): FarmAlert[] {
  const sevrablesSoon = bandes.filter(b => {
    if (b.statut === 'Sevrés' || b.statut === 'Sevrée' || b.statut === 'Archivée') return false;
    const dateMB = parseFrDate(b.dateMB);
    if (!dateMB) return false;
    const ageJours = daysDiff(dateMB, today);
    return ageJours >= BIO.LACTATION_JOURS - BIO.REGROUPEMENT_BANDE_FENETRE;
  });

  if (sevrablesSoon.length < 2) return [];

  const ids = sevrablesSoon.map(b => b.id).join(', ');
  const totalVivants = sevrablesSoon.reduce((s, b) => s + (b.vivants ?? 0), 0);

  return [{
    id: alertId('REG', 'multi', ids.slice(0, 20)),
    priority: 'INFO',
    category: 'BANDES',
    subjectId: 'multi',
    subjectLabel: `${sevrablesSoon.length} bandes`,
    title: `Regroupement Bande Possible`,
    message: `${sevrablesSoon.length} bandes sevrées à ±${BIO.REGROUPEMENT_BANDE_FENETRE}j (${totalVivants} porcelets). Regrouper en une même bande post-sevrage ?`,
    requiresAction: true,
    actions: [
      {
        type: 'CONFIRM_REGROUPEMENT_BANDE',
        label: `Créer Bande Post-Sevrage (${totalVivants})`,
        variant: 'primary',
        payload: { bandeIds: sevrablesSoon.map(b => b.id), totalVivants },
      },
      { type: 'DISMISS', label: 'Garder séparées', variant: 'secondary' },
    ],
    createdAt: new Date(),
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTEUR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export interface AlertEngineInput {
  truies: Truie[];
  bandes: BandePorcelets[];
  sante: TraitementSante[];
  stockAliments: StockAliment[];
}

export function runAlertEngine(input: AlertEngineInput): FarmAlert[] {
  const today = new Date();
  const alerts: FarmAlert[] = [];

  // R1 — Mise-bas
  for (const truie of input.truies) {
    const a = checkMiseBas(truie, today);
    if (a) alerts.push(a);
  }

  // R2 — Sevrage
  for (const bande of input.bandes) {
    const a = checkSevrage(bande, today);
    if (a) alerts.push(a);
  }

  // R3 — Retour chaleur
  for (const truie of input.truies) {
    const a = checkRetourChaleur(truie, input.bandes, today);
    if (a) alerts.push(a);
  }

  // R4 — Mortalité
  for (const bande of input.bandes) {
    const a = checkMortalite(bande);
    if (a) alerts.push(a);
  }

  // R5 — Stocks
  for (const stock of input.stockAliments) {
    const a = checkStock(stock);
    if (a) alerts.push(a);
  }

  // R6 — Regroupement
  alerts.push(...checkRegroupementBandes(input.bandes, today));

  // Tri : CRITIQUE > HAUTE > NORMALE > INFO, puis par daysOffset
  const PRIORITY_ORDER: Record<AlertPriority, number> = { CRITIQUE: 0, HAUTE: 1, NORMALE: 2, INFO: 3 };
  alerts.sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return (a.daysOffset ?? 0) - (b.daysOffset ?? 0);
  });

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS D'AFFICHAGE
// ─────────────────────────────────────────────────────────────────────────────

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
