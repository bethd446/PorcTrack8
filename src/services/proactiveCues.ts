/**
 * proactiveCues — signaux proactifs Marius pour TodayHub
 * ════════════════════════════════════════════════════════
 * Service métier centralisé qui dérive depuis l'état Sheets les
 * signaux dont le porcher a besoin AVANT d'être alerté formellement.
 *
 *   - Retours chaleur cette semaine : truies PLEINES en fenêtre
 *     J18-J24 post-saillie (vérifier qu'elles ne reviennent pas en
 *     chaleur). Anticipation J11-J17.
 *
 *   - Sevrages à confirmer / à venir : bandes en phase SOUS_MERE
 *     dont la date de sevrage prévue est dépassée (retard) ou
 *     atteinte dans les 3 jours (à venir).
 *
 * Les règles d'alerte plus strictes (J+28 effectif, J+5 post-sevrage)
 * restent dans alertEngine.ts. Ce service vient en amont, comme un
 * radar passif sans actions de confirmation.
 */

import { safeDate } from '../lib/truieHelpers';
import { normaliseStatut } from '../lib/truieStatut';
import { computeBandePhase } from './bandesAggregator';
import type { Saillie, Truie, BandePorcelets } from '../types/farm';

const MS_DAY = 86_400_000;
const SEVRAGE_JOURS = 28;
const RETOUR_CHALEUR_MIN = 18;
const RETOUR_CHALEUR_MAX = 24;
const ANTICIPATION_MIN = 11;
const ANTICIPATION_MAX = 17;
const SEVRAGE_AVENIR_FENETRE = 3;

export interface TruieRetourChaleur {
  truie: Truie;
  daysSinceSaillie: number;
}

export interface BandeSevrage {
  bande: BandePorcelets;
  daysOver: number;
}

export interface RetoursChaleurResult {
  aVerifier: TruieRetourChaleur[];
  aAnticiper: TruieRetourChaleur[];
}

export interface SevragesResult {
  enRetard: BandeSevrage[];
  aVenir: BandeSevrage[];
}

function daysSince(date: Date, today: Date): number {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.floor((b - a) / MS_DAY);
}

export function getRetoursChaleur(
  truies: Truie[],
  saillies: Saillie[],
  today: Date,
): RetoursChaleurResult {
  const aVerifier: TruieRetourChaleur[] = [];
  const aAnticiper: TruieRetourChaleur[] = [];
  for (const truie of truies) {
    if (normaliseStatut(truie.statut) !== 'PLEINE') continue;
    const active = saillies.find(
      s =>
        (s.truieId === truie.id || s.truieId === truie.displayId) &&
        (!s.statut || /active|confirm|en[\s_]?cours/i.test(s.statut)),
    );
    if (!active) continue;
    const dSaillie = safeDate(active.dateSaillie);
    if (!dSaillie) continue;
    const days = daysSince(dSaillie, today);
    if (days >= RETOUR_CHALEUR_MIN && days <= RETOUR_CHALEUR_MAX) {
      aVerifier.push({ truie, daysSinceSaillie: days });
    } else if (days >= ANTICIPATION_MIN && days <= ANTICIPATION_MAX) {
      aAnticiper.push({ truie, daysSinceSaillie: days });
    }
  }
  aVerifier.sort((a, b) => b.daysSinceSaillie - a.daysSinceSaillie);
  aAnticiper.sort((a, b) => b.daysSinceSaillie - a.daysSinceSaillie);
  return { aVerifier, aAnticiper };
}

export function getSevrages(
  bandes: BandePorcelets[],
  today: Date,
): SevragesResult {
  const enRetard: BandeSevrage[] = [];
  const aVenir: BandeSevrage[] = [];
  for (const bande of bandes) {
    if (computeBandePhase(bande, today) !== 'SOUS_MERE') continue;
    const dMB = safeDate(bande.dateMB);
    if (!dMB) continue;
    const dPrevue = safeDate(bande.dateSevragePrevue) ?? new Date(dMB.getTime() + SEVRAGE_JOURS * MS_DAY);
    const diff = daysSince(dPrevue, today);
    if (diff > 0) {
      enRetard.push({ bande, daysOver: diff });
    } else if (diff >= -SEVRAGE_AVENIR_FENETRE && diff <= 0) {
      aVenir.push({ bande, daysOver: diff });
    }
  }
  enRetard.sort((a, b) => b.daysOver - a.daysOver);
  aVenir.sort((a, b) => b.daysOver - a.daysOver);
  return { enRetard, aVenir };
}
