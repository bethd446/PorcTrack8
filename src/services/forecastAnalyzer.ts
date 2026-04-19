/**
 * forecastAnalyzer — Prévisions 14 jours (conduite en bandes porcine).
 * ────────────────────────────────────────────────────────────────────────────────
 * Pure functions, zéro I/O, zéro dépendance React. Génère un rapport
 * d'anticipation sur l'horizon `horizonJours` (défaut 14 j) :
 *   • Événements à venir   : MB, sevrages, retours chaleur, finitions
 *   • Pression maternité   : nb MB prévues par semaine ISO sur 4 sem
 *   • Saturation loges     : flag CRITIQUE si >9 MB dans une semaine
 *
 * Les dates en entrée respectent le format dd/MM/yyyy (Sheets FR) OU le format
 * ISO yyyy-MM-dd. Les dates émises en sortie sont toutes ISO yyyy-MM-dd pour
 * l'affichage et les tris côté UI.
 */

import {
  addDays,
  differenceInCalendarDays,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfDay,
  startOfISOWeek,
} from 'date-fns';
import type { Truie, BandePorcelets, Saillie } from '../types/farm';

// ─── Constantes métier ──────────────────────────────────────────────────────

/** Capacité maternité en loges (config site A130). */
const CAPACITE_MATERNITE_LOGES = 9;

/** Seuil HIGH pour la pression maternité (sur CAPACITE_MATERNITE_LOGES). */
const SATURATION_HIGH_MIN = 7;

/** Horizon par défaut pour les événements (jours). */
const DEFAULT_HORIZON_JOURS = 14;

/** Nombre de semaines ISO couvertes par la pressure. */
const PRESSURE_HORIZON_WEEKS = 4;

/** Durée standard d'engraissement (jours depuis naissance) pour projection finition. */
const FINITION_DUREE_STD_JOURS = 180;

/** Poids cible finition (kg). */
const POIDS_CIBLE_FINITION_KG = 110;

/** Fenêtre retour chaleur post-sevrage (min/max jours). */
const RETOUR_CHALEUR_MIN_J = 3;
const RETOUR_CHALEUR_MAX_J = 10;

// ─── Types publics ──────────────────────────────────────────────────────────

export type ForecastEventType =
  | 'MB'
  | 'SEVRAGE'
  | 'RETOUR_CHALEUR'
  | 'FINITION'
  | 'SATURATION';

export type ForecastPriority = 'CRITIQUE' | 'HAUTE' | 'NORMALE' | 'INFO';

export interface ForecastEvent {
  type: ForecastEventType;
  priority: ForecastPriority;
  /** ISO YYYY-MM-DD. */
  date: string;
  /** Jours depuis today (>= 0). 0 = aujourd'hui. */
  joursDans: number;
  /** Libellé court (ex: "T07 Fleur", "Bande P-042"). */
  sujet: string;
  /** ID technique pour navigation (truie.id, bande.id). */
  sujetId: string;
  /** Type de navigation pour onClick. */
  sujetNav?: 'truie' | 'verrat' | 'bande';
  description: string;
  actionRequise?: string;
}

export interface WeeklyPressure {
  /** Format ISO 8601 "YYYY-Www". */
  semaineIso: string;
  /** ISO YYYY-MM-DD du lundi de cette semaine. */
  debutSemaine: string;
  /** ISO YYYY-MM-DD du dimanche de cette semaine. */
  finSemaine: string;
  nbMBPrevues: number;
  /** Capacité maternité du site (9 loges sur A130). */
  capaciteMaternite: number;
  saturation: 'OK' | 'HIGH' | 'FULL';
  nbSevragesPrevus: number;
  /** @deprecated Legacy alias conservé pour compatibilité — préférer `nbMBPrevues`. */
  logesMaterniteNecessaires?: number;
  /** @deprecated Legacy alias — préférer `capaciteMaternite`. */
  logesMaterniteCapacite?: number;
  /** Extra info : finitions prévues dans la semaine. */
  nbFinitionsPrevues?: number;
}

export interface ForecastReport {
  /** Tri ASC par joursDans, puis par priorité. */
  horizon14jEvents: ForecastEvent[];
  /** `PRESSURE_HORIZON_WEEKS` prochaines semaines ISO (y compris celle en cours). */
  pressureByWeek: WeeklyPressure[];
  countByType: Record<ForecastEventType, number>;
  /** Premier événement de priorité max (CRITIQUE en priorité, le + proche). */
  topCritical?: ForecastEvent;
}

export interface BuildForecastParams {
  truies: Truie[];
  bandes: BandePorcelets[];
  saillies: Saillie[];
}

// ─── Helpers dates ──────────────────────────────────────────────────────────

/**
 * Parse une date dd/MM/yyyy ou yyyy-MM-dd → Date locale (00:00:00 local).
 * Retourne null si invalide. Volontairement en local (pas TZ), les calculs
 * de jours civils restent stables dans notre fenêtre (14 j).
 */
function parseFlexibleDate(s?: string | null): Date | null {
  if (!s || s === '—' || s === '') return null;

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (dmy) {
    const d = new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  }

  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (ymd) {
    const d = new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  }

  return null;
}

/** Format une Date → ISO YYYY-MM-DD. */
function toIsoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/**
 * Retourne "YYYY-Www" en respectant ISO 8601.
 * Exemples : mardi W17 2026 → "2026-W17".
 */
export function isoWeek(date: Date): string {
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Jours civils entre `from` et `to` (≥ 0 si to >= from). */
function daysFromToday(from: Date, today: Date): number {
  return differenceInCalendarDays(from, today);
}

// ─── Helpers métier ─────────────────────────────────────────────────────────

/**
 * Retourne la date MB prévue la plus pertinente pour une truie :
 *   1. `truie.dateMBPrevue` si renseignée
 *   2. Sinon la saillie la plus récente (max `dateMBPrevue`) pour cette truie
 * Null si aucune info.
 */
function resolveDateMBPrevue(truie: Truie, saillies: Saillie[]): Date | null {
  const d = parseFlexibleDate(truie.dateMBPrevue);
  if (d) return d;

  let best: Date | null = null;
  for (const s of saillies) {
    if (s.truieId !== truie.id) continue;
    const ds = parseFlexibleDate(s.dateMBPrevue);
    if (ds && (!best || ds.getTime() > best.getTime())) best = ds;
  }
  return best;
}

/** Label d'une truie : nom prioritaire, puis displayId, puis boucle. */
function truieLabel(t: Truie): string {
  if (t.nom && t.displayId) return `${t.displayId} ${t.nom}`;
  return t.nom || t.displayId || t.boucle;
}

/** Label d'une bande : id porté puis nom court. */
function bandeLabel(b: BandePorcelets): string {
  return b.idPortee || b.id;
}

/**
 * Trouve la truie liée à une bande (pour relier un retour chaleur à son sujet).
 * Matching tolérant : `bande.truie` contient souvent un id (T07) ou un nom,
 * `bande.boucleMere` est la boucle d'oreille (B001). On essaye les 2.
 */
function findTruieForBande(
  bande: BandePorcelets,
  truies: Truie[],
): Truie | null {
  const ref = (bande.truie ?? '').trim();
  const boucle = (bande.boucleMere ?? '').trim();

  if (ref) {
    for (const t of truies) {
      if (t.id === ref || t.displayId === ref || t.nom === ref) return t;
    }
  }
  if (boucle) {
    for (const t of truies) {
      if (t.boucle === boucle) return t;
    }
  }
  return null;
}

/** Calcule la priorité d'un événement MB selon joursDans. */
function mbPriority(joursDans: number): ForecastPriority {
  if (joursDans <= 2) return 'CRITIQUE';
  if (joursDans <= 7) return 'HAUTE';
  return 'NORMALE';
}

/** Priorité sevrage/retour chaleur selon joursDans. */
function sevragePriority(joursDans: number): ForecastPriority {
  if (joursDans <= 3) return 'HAUTE';
  return 'NORMALE';
}

/** Rang numérique pour trier les priorités (CRITIQUE > HAUTE > NORMALE > INFO). */
function priorityRank(p: ForecastPriority): number {
  switch (p) {
    case 'CRITIQUE': return 0;
    case 'HAUTE': return 1;
    case 'NORMALE': return 2;
    case 'INFO': return 3;
  }
}

// ─── buildForecast ──────────────────────────────────────────────────────────

/**
 * Construit le rapport de prévisions sur `horizonJours` jours.
 *
 * Stratégie :
 *   1. Collecte les événements MB (via truie.dateMBPrevue ∨ saillie.dateMBPrevue)
 *   2. Collecte les sevrages à venir (bandes encore "Sous mère")
 *   3. Collecte les retours chaleur (bandes sevrées il y a [3-10j], fenêtre future)
 *   4. Collecte les finitions projetées (bandes engraissement atteignant 110 kg)
 *   5. Calcule la pression maternité par semaine ISO (PRESSURE_HORIZON_WEEKS)
 *   6. Émet des events SATURATION CRITIQUE pour chaque semaine >= capacité
 *   7. Trie les events ASC par joursDans puis par priorité
 */
export function buildForecast(
  params: BuildForecastParams,
  today: Date = new Date(),
  horizonJours: number = DEFAULT_HORIZON_JOURS,
): ForecastReport {
  const { truies, bandes, saillies } = params;
  const todayStart = startOfDay(today);

  const events: ForecastEvent[] = [];

  // ── 1. MB à venir ───────────────────────────────────────────────────────
  for (const t of truies) {
    const mbDate = resolveDateMBPrevue(t, saillies);
    if (!mbDate) continue;
    const offset = daysFromToday(mbDate, todayStart);
    if (offset < 0 || offset > horizonJours) continue;

    const prio = mbPriority(offset);
    events.push({
      type: 'MB',
      priority: prio,
      date: toIsoDate(mbDate),
      joursDans: offset,
      sujet: truieLabel(t),
      sujetId: t.id,
      sujetNav: 'truie',
      description:
        offset === 0
          ? "Mise-bas prévue aujourd'hui"
          : offset === 1
            ? 'Mise-bas prévue demain'
            : `Mise-bas prévue dans ${offset}j`,
      actionRequise:
        prio === 'CRITIQUE' ? 'Préparer loge maternité, surveiller signes' : undefined,
    });
  }

  // ── 2. Sevrages prévus ──────────────────────────────────────────────────
  for (const b of bandes) {
    if (b.statut === 'Sevrés' || b.statut === 'Sevrée' || b.statut === 'Archivée') continue;
    const dSev = parseFlexibleDate(b.dateSevragePrevue);
    if (!dSev) continue;
    const offset = daysFromToday(dSev, todayStart);
    if (offset < 0 || offset > horizonJours) continue;

    const vivants = b.vivants ?? 0;
    events.push({
      type: 'SEVRAGE',
      priority: sevragePriority(offset),
      date: toIsoDate(dSev),
      joursDans: offset,
      sujet: bandeLabel(b),
      sujetId: b.id,
      sujetNav: 'bande',
      description:
        vivants > 0
          ? `Sevrage prévu (${vivants} porcelets sous mère)`
          : 'Sevrage prévu',
      actionRequise: offset <= 3 ? 'Préparer post-sevrage' : undefined,
    });
  }

  // ── 3. Retours chaleur attendus ─────────────────────────────────────────
  for (const b of bandes) {
    const dSevReel = parseFlexibleDate(b.dateSevrageReelle);
    if (!dSevReel) continue;

    // Fenêtre attendue : [sevrage + RETOUR_CHALEUR_MIN, sevrage + RETOUR_CHALEUR_MAX]
    const minDate = addDays(dSevReel, RETOUR_CHALEUR_MIN_J);
    const maxDate = addDays(dSevReel, RETOUR_CHALEUR_MAX_J);

    // On ne publie l'event que si le pic d'attente tombe dans la fenêtre.
    // Date de l'event = milieu de fenêtre (sevrage + J+7).
    const pic = addDays(dSevReel, Math.round((RETOUR_CHALEUR_MIN_J + RETOUR_CHALEUR_MAX_J) / 2));
    const picOffset = daysFromToday(pic, todayStart);
    if (picOffset < 0 || picOffset > horizonJours) continue;

    // Si la fenêtre complète est déjà passée (max < today), skip.
    if (daysFromToday(maxDate, todayStart) < 0) continue;
    // Si la fenêtre n'a pas encore commencé (min > horizon), skip.
    if (daysFromToday(minDate, todayStart) > horizonJours) continue;

    const truie = findTruieForBande(b, truies);
    const sujet = truie ? truieLabel(truie) : bandeLabel(b);
    const sujetId = truie ? truie.id : b.id;
    const sujetNav: 'truie' | 'bande' = truie ? 'truie' : 'bande';

    events.push({
      type: 'RETOUR_CHALEUR',
      priority: sevragePriority(picOffset),
      date: toIsoDate(pic),
      joursDans: picOffset,
      sujet,
      sujetId,
      sujetNav,
      description: `Retour chaleur attendu (J+${RETOUR_CHALEUR_MIN_J}–${RETOUR_CHALEUR_MAX_J} post-sevrage)`,
      actionRequise: 'Observer truie, préparer saillie',
    });
  }

  // ── 4. Finitions projetées ──────────────────────────────────────────────
  // Pas de colonne explicite `gmqMoyen` / `poidsActuel` dans BandePorcelets ;
  // on utilise la durée standard 180j depuis la dateMB.
  for (const b of bandes) {
    // Filtre : la bande doit être sortie de la maternité (sevrée) pour prétendre à la finition.
    if (!b.dateSevrageReelle && !b.dateSevragePrevue) continue;

    const dMB = parseFlexibleDate(b.dateMB);
    if (!dMB) continue;

    const dFinition = addDays(dMB, FINITION_DUREE_STD_JOURS);
    const offset = daysFromToday(dFinition, todayStart);
    if (offset < 0 || offset > horizonJours) continue;

    // Nombre de porcs finissables (mâles + femelles OU vivants par défaut)
    const nbFin = (b.nbMales ?? 0) + (b.nbFemelles ?? 0) || b.vivants || 0;

    events.push({
      type: 'FINITION',
      priority: 'NORMALE',
      date: toIsoDate(dFinition),
      joursDans: offset,
      sujet: bandeLabel(b),
      sujetId: b.id,
      sujetNav: 'bande',
      description: `Projection ${POIDS_CIBLE_FINITION_KG} kg${nbFin > 0 ? ` · ${nbFin} porcs` : ''}`,
      actionRequise: offset <= 7 ? 'Organiser enlèvement abattoir' : undefined,
    });
  }

  // ── 5. Pression maternité par semaine ISO ───────────────────────────────
  const currentWeekStart = startOfISOWeek(todayStart);
  const pressureByWeek: WeeklyPressure[] = [];

  for (let w = 0; w < PRESSURE_HORIZON_WEEKS; w++) {
    const weekStart = addDays(currentWeekStart, w * 7);
    const weekEnd = addDays(weekStart, 7); // exclusive

    let nbMB = 0;
    let nbSev = 0;
    let nbFin = 0;

    // Count MB prévues (via toutes les truies, pas uniquement l'horizon 14j)
    for (const t of truies) {
      const d = resolveDateMBPrevue(t, saillies);
      if (!d) continue;
      if (d.getTime() >= weekStart.getTime() && d.getTime() < weekEnd.getTime()) {
        nbMB += 1;
      }
    }

    // Sevrages prévus
    for (const b of bandes) {
      if (b.statut === 'Sevrés' || b.statut === 'Sevrée' || b.statut === 'Archivée') continue;
      const d = parseFlexibleDate(b.dateSevragePrevue);
      if (!d) continue;
      if (d.getTime() >= weekStart.getTime() && d.getTime() < weekEnd.getTime()) {
        nbSev += 1;
      }
    }

    // Finitions
    for (const b of bandes) {
      const dMB = parseFlexibleDate(b.dateMB);
      if (!dMB) continue;
      if (!b.dateSevrageReelle && !b.dateSevragePrevue) continue;
      const dFin = addDays(dMB, FINITION_DUREE_STD_JOURS);
      if (dFin.getTime() >= weekStart.getTime() && dFin.getTime() < weekEnd.getTime()) {
        nbFin += 1;
      }
    }

    const saturation: WeeklyPressure['saturation'] =
      nbMB >= CAPACITE_MATERNITE_LOGES
        ? 'FULL'
        : nbMB >= SATURATION_HIGH_MIN
          ? 'HIGH'
          : 'OK';

    const weekEndInclusive = addDays(weekStart, 6); // dimanche
    pressureByWeek.push({
      semaineIso: isoWeek(weekStart),
      debutSemaine: toIsoDate(weekStart),
      finSemaine: toIsoDate(weekEndInclusive),
      nbMBPrevues: nbMB,
      capaciteMaternite: CAPACITE_MATERNITE_LOGES,
      saturation,
      nbSevragesPrevus: nbSev,
      // Legacy alias
      logesMaterniteNecessaires: nbMB,
      logesMaterniteCapacite: CAPACITE_MATERNITE_LOGES,
      nbFinitionsPrevues: nbFin,
    });
  }

  // ── 6. Events SATURATION (pour chaque semaine FULL dans l'horizon) ──────
  for (const wp of pressureByWeek) {
    if (wp.saturation !== 'FULL') continue;
    const weekStart = parseFlexibleDate(wp.debutSemaine);
    if (!weekStart) continue;
    const offset = daysFromToday(weekStart, todayStart);
    // On émet l'event même si le début semaine est passé (semaine en cours)
    if (offset > horizonJours) continue;
    const joursDans = Math.max(0, offset);

    events.push({
      type: 'SATURATION',
      priority: 'CRITIQUE',
      date: wp.debutSemaine,
      joursDans,
      sujet: `Semaine ${wp.semaineIso}`,
      sujetId: wp.semaineIso,
      description: `Saturation maternité prévue · ${wp.nbMBPrevues} MB sur ${wp.capaciteMaternite} loges`,
      actionRequise: 'Réorganiser calendrier saillies ou louer loges supplémentaires',
    });
  }

  // ── 7. Tri final ────────────────────────────────────────────────────────
  events.sort((a, b) => {
    if (a.joursDans !== b.joursDans) return a.joursDans - b.joursDans;
    return priorityRank(a.priority) - priorityRank(b.priority);
  });

  const countByType: Record<ForecastEventType, number> = {
    MB: 0,
    SEVRAGE: 0,
    RETOUR_CHALEUR: 0,
    FINITION: 0,
    SATURATION: 0,
  };
  for (const e of events) countByType[e.type] += 1;

  // ── 8. topCritical : priorité max la plus proche ────────────────────────
  // Après tri, events est ASC joursDans puis priorité. On cherche le premier
  // CRITIQUE, sinon le premier HAUTE, sinon undefined.
  let topCritical: ForecastEvent | undefined;
  for (const e of events) {
    if (e.priority === 'CRITIQUE') { topCritical = e; break; }
  }
  if (!topCritical) {
    for (const e of events) {
      if (e.priority === 'HAUTE') { topCritical = e; break; }
    }
  }

  return {
    horizon14jEvents: events,
    pressureByWeek,
    countByType,
    topCritical,
  };
}
