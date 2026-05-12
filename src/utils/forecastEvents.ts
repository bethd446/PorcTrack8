/**
 * forecastEvents — Construction d'événements prévisionnels multi-horizons.
 * ────────────────────────────────────────────────────────────────────────────
 * Pure functions, zéro I/O, zéro React. Sert le calendrier 30/60/90j de
 * `/pilotage/previsions` au-delà de l'horizon 14 j fourni par
 * `services/forecastAnalyzer`.
 *
 * Différence avec `forecastAnalyzer` :
 *  - Ici on émet une liste plate d'événements typés et on les regroupe par
 *    semaine ISO. Pas de pression maternité, pas de topCritical.
 *  - Couvre 7 types : MISE_BAS, SEVRAGE, RETOUR_CHALEUR, PESEE, ECHO,
 *    SORTIE, RE_SAILLIE.
 *  - Tolérant aux dates manquantes (fallback gracieux : ne rien émettre).
 */

import {
  addDays,
  differenceInCalendarDays,
  getISOWeek,
  getISOWeekYear,
  startOfDay,
  startOfISOWeek,
} from 'date-fns';

import type {
  Truie,
  Verrat,
  BandePorcelets,
  Saillie,
} from '../types/farm';
import type { Note } from '../types';
import { extractPeseesForBande } from '../services/growthAnalyzer';
import { formatAnimalIdentity } from '../lib/formatAnimalIdentity';

// ─── Constantes métier ──────────────────────────────────────────────────────

const GESTATION_JOURS = 115;
const LACTATION_JOURS = 28;
const RETOUR_CHALEUR_MIN_J = 18;
const RETOUR_CHALEUR_MAX_J = 24;
const ECHO_MIN_J = 25;
const ECHO_MAX_J = 35;
const PESEE_INTERVALLE_J = 21;
const RE_SAILLIE_DELAI_J = 5;
const SORTIE_DUREE_J = 165;

// ─── Types publics ──────────────────────────────────────────────────────────

export type ForecastEventType =
  | 'MISE_BAS'
  | 'SEVRAGE'
  | 'RETOUR_CHALEUR'
  | 'PESEE'
  | 'ECHO'
  | 'SORTIE'
  | 'RE_SAILLIE';

export type ForecastPriority = 'CRITIQUE' | 'HAUTE' | 'NORMALE';

export interface ForecastEvent {
  id: string;
  date: Date;
  type: ForecastEventType;
  title: string;
  subtitle: string;
  targetType: 'truie' | 'bande' | 'verrat';
  targetId: string;
  priority: ForecastPriority;
}

export interface WeekGroup {
  weekStart: Date;
  weekEnd: Date;
  isoLabel: string;
  events: ForecastEvent[];
}

export interface BuildForecastEventsCtx {
  truies: Truie[];
  verrats?: Verrat[];
  bandes: BandePorcelets[];
  saillies: Saillie[];
  notes?: Note[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse dd/MM/yyyy ou yyyy-MM-dd → Date locale (00:00). null si invalide. */
function parseDate(s?: string | null): Date | null {
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

function inHorizon(d: Date, today: Date, horizonEnd: Date): boolean {
  return d.getTime() >= today.getTime() && d.getTime() <= horizonEnd.getTime();
}

function truieLabel(t: Truie): string {
  // v3.4.5+ : boucle prioritaire (cf. src/lib/formatAnimalIdentity.ts).
  // Format : `<boucle ou displayId>[ <nom>]` — le nom reste en suffixe car
  // utile pour les éleveurs qui nomment leurs reproducteurs.
  const id = formatAnimalIdentity(t);
  if (t.nom) return `${id} ${t.nom}`;
  return id;
}

function bandeLabel(b: BandePorcelets): string {
  return b.idPortee || b.id;
}

function findTruieForBande(b: BandePorcelets, truies: Truie[]): Truie | null {
  const ref = (b.truie ?? '').trim();
  const boucle = (b.boucleMere ?? '').trim();
  if (ref) {
    for (const t of truies) {
      if (t.id === ref || t.displayId === ref || t.nom === ref) return t;
    }
  }
  if (boucle) {
    for (const t of truies) if (t.boucle === boucle) return t;
  }
  return null;
}

function priorityFromOffset(offsetDays: number): ForecastPriority {
  if (offsetDays <= 7) return 'HAUTE';
  if (offsetDays <= 30) return 'NORMALE';
  return 'NORMALE';
}

// ─── buildForecastEvents ────────────────────────────────────────────────────

/**
 * Génère la liste plate des événements prévisionnels dans la fenêtre
 * `[today, today + horizonDays]`. Triée ASC par date.
 */
export function buildForecastEvents(
  ctx: BuildForecastEventsCtx,
  today: Date,
  horizonDays: number,
): ForecastEvent[] {
  const events: ForecastEvent[] = [];
  const todayStart = startOfDay(today);
  const horizonEnd = addDays(todayStart, horizonDays);

  const { truies, bandes, saillies, notes } = ctx;

  // ── 1. Mises-bas : saillie + 115j ──────────────────────────────────────
  for (const s of saillies) {
    const dateSaillie = parseDate(s.dateSaillie);
    if (!dateSaillie) continue;
    const dateMB = addDays(dateSaillie, GESTATION_JOURS);
    if (!inHorizon(dateMB, todayStart, horizonEnd)) continue;
    const truie = truies.find(t => t.id === s.truieId);
    const offset = differenceInCalendarDays(dateMB, todayStart);
    events.push({
      id: `mb-${s.truieId}-${s.dateSaillie}`,
      date: dateMB,
      type: 'MISE_BAS',
      title: `Mise-bas ${truie ? truieLabel(truie) : s.truieId}`,
      subtitle: truie?.nom || s.truieBoucle || '',
      targetType: 'truie',
      targetId: truie?.id ?? s.truieId,
      priority: offset <= 3 ? 'CRITIQUE' : offset <= 14 ? 'HAUTE' : 'NORMALE',
    });
  }

  // ── 2. Sevrages : dateMB bande + 28j ───────────────────────────────────
  for (const b of bandes) {
    if (b.statut === 'Sevrés' || b.statut === 'Sevrée' || b.statut === 'Archivée') continue;
    const dMB = parseDate(b.dateMB);
    if (!dMB) continue;
    const dSev = addDays(dMB, LACTATION_JOURS);
    if (!inHorizon(dSev, todayStart, horizonEnd)) continue;
    const offset = differenceInCalendarDays(dSev, todayStart);
    events.push({
      id: `sev-${b.id}`,
      date: dSev,
      type: 'SEVRAGE',
      title: `Sevrage ${bandeLabel(b)}`,
      subtitle: b.vivants ? `${b.vivants} porcelets` : '',
      targetType: 'bande',
      targetId: b.id,
      priority: priorityFromOffset(offset),
    });
  }

  // ── 3. Retours chaleur : saillie + 18-24j (mi-fenêtre J21) ─────────────
  // Émis pour saillies récentes dont la fenêtre tombe dans l'horizon.
  for (const s of saillies) {
    const dateSaillie = parseDate(s.dateSaillie);
    if (!dateSaillie) continue;
    const pic = addDays(dateSaillie, Math.round((RETOUR_CHALEUR_MIN_J + RETOUR_CHALEUR_MAX_J) / 2));
    if (!inHorizon(pic, todayStart, horizonEnd)) continue;
    const truie = truies.find(t => t.id === s.truieId);
    events.push({
      id: `rc-${s.truieId}-${s.dateSaillie}`,
      date: pic,
      type: 'RETOUR_CHALEUR',
      title: `Retour chaleur ${truie ? truieLabel(truie) : s.truieId}`,
      subtitle: `Surveillance J${RETOUR_CHALEUR_MIN_J}-J${RETOUR_CHALEUR_MAX_J}`,
      targetType: 'truie',
      targetId: truie?.id ?? s.truieId,
      priority: 'NORMALE',
    });
  }

  // ── 4. Échographies : saillie + 25-35j (mi-fenêtre J30) ────────────────
  for (const s of saillies) {
    const dateSaillie = parseDate(s.dateSaillie);
    if (!dateSaillie) continue;
    const pic = addDays(dateSaillie, Math.round((ECHO_MIN_J + ECHO_MAX_J) / 2));
    if (!inHorizon(pic, todayStart, horizonEnd)) continue;
    const truie = truies.find(t => t.id === s.truieId);
    events.push({
      id: `echo-${s.truieId}-${s.dateSaillie}`,
      date: pic,
      type: 'ECHO',
      title: `Échographie ${truie ? truieLabel(truie) : s.truieId}`,
      subtitle: `Confirmation gestation J${ECHO_MIN_J}-J${ECHO_MAX_J}`,
      targetType: 'truie',
      targetId: truie?.id ?? s.truieId,
      priority: 'NORMALE',
    });
  }

  // ── 5. Pesées dues : dernière pesée + 21j (fallback gracieux si notes absent) ─
  if (notes && notes.length > 0) {
    for (const b of bandes) {
      const phaseRelevante =
        b.statut === 'En croissance' ||
        b.statut === 'En finition' ||
        b.statut === 'Sevrés' ||
        b.statut === 'Sevrée';
      if (!phaseRelevante) continue;

      const pesees = extractPeseesForBande(b.id, notes);
      const derniere = pesees.length > 0 ? pesees[pesees.length - 1] : null;

      let baseDate: Date | null = null;
      if (derniere) {
        const d = new Date(derniere.date);
        if (!Number.isNaN(d.getTime())) baseDate = startOfDay(d);
      } else {
        baseDate = parseDate(b.dateSevrageReelle ?? b.dateSevragePrevue);
      }
      if (!baseDate) continue;

      const due = addDays(baseDate, PESEE_INTERVALLE_J);
      if (!inHorizon(due, todayStart, horizonEnd)) continue;
      const offset = differenceInCalendarDays(due, todayStart);
      events.push({
        id: `pes-${b.id}`,
        date: due,
        type: 'PESEE',
        title: `Pesée due ${bandeLabel(b)}`,
        subtitle: derniere ? `Dernière il y a ${PESEE_INTERVALLE_J}j` : 'Première pesée',
        targetType: 'bande',
        targetId: b.id,
        priority: priorityFromOffset(offset),
      });
    }
  }

  // ── 6. Sorties abattoir : dateMB + 165j ────────────────────────────────
  for (const b of bandes) {
    const dMB = parseDate(b.dateMB);
    if (!dMB) continue;
    if (!b.dateSevrageReelle && !b.dateSevragePrevue) continue;
    const dSortie = addDays(dMB, SORTIE_DUREE_J);
    if (!inHorizon(dSortie, todayStart, horizonEnd)) continue;
    const nbFin = (b.nbMales ?? 0) + (b.nbFemelles ?? 0) || b.vivants || 0;
    const offset = differenceInCalendarDays(dSortie, todayStart);
    events.push({
      id: `sortie-${b.id}`,
      date: dSortie,
      type: 'SORTIE',
      title: `Sortie abattoir ${bandeLabel(b)}`,
      subtitle: nbFin > 0 ? `${nbFin} porcs` : 'Bande en finition',
      targetType: 'bande',
      targetId: b.id,
      priority: offset <= 7 ? 'HAUTE' : 'NORMALE',
    });
  }

  // ── 7. Re-saillies : sevrage réel + 5j ─────────────────────────────────
  for (const b of bandes) {
    const dSev = parseDate(b.dateSevrageReelle);
    if (!dSev) continue;
    const dRS = addDays(dSev, RE_SAILLIE_DELAI_J);
    if (!inHorizon(dRS, todayStart, horizonEnd)) continue;
    const truie = findTruieForBande(b, truies);
    if (!truie) continue;
    events.push({
      id: `rs-${b.id}`,
      date: dRS,
      type: 'RE_SAILLIE',
      title: `Re-saillie ${truieLabel(truie)}`,
      subtitle: `Post-sevrage bande ${bandeLabel(b)}`,
      targetType: 'truie',
      targetId: truie.id,
      priority: 'NORMALE',
    });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

// ─── groupEventsByWeek ──────────────────────────────────────────────────────

/**
 * Regroupe la liste d'événements par semaine ISO (lundi-dimanche).
 * Renvoie les groupes ordonnés ASC par weekStart, vides exclus.
 */
export function groupEventsByWeek(events: ForecastEvent[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();
  for (const ev of events) {
    const ws = startOfISOWeek(ev.date);
    const key = `${getISOWeekYear(ws)}-W${String(getISOWeek(ws)).padStart(2, '0')}`;
    let group = map.get(key);
    if (!group) {
      group = {
        weekStart: ws,
        weekEnd: addDays(ws, 6),
        isoLabel: key,
        events: [],
      };
      map.set(key, group);
    }
    group.events.push(ev);
  }
  return Array.from(map.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime(),
  );
}
