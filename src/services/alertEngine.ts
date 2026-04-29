/**
 * PorcTrack — Moteur d'Alertes Automatisées
 */
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const FARM_TIMEZONE = 'Europe/Paris';

export type AlertPriority = 'CRITIQUE' | 'HAUTE' | 'NORMALE' | 'INFO';
export type AlertCategory = 'SANTE' | 'ALIMENTATION' | 'ZOOTECHNIE' | 'GENERAL';
export type AlertAction = {
  type: string;
  payload?: Record<string, unknown>;
};

export interface FarmAlert {
  id: string;
  type: string;
  titre: string;
  priorite: AlertPriority;
  category: AlertCategory;
  date: string;
  cible: string;
  note?: string;
  priority?: AlertPriority;
  title?: string;
  message?: string;
  dueDate?: string;
  requiresAction?: boolean;
  daysOffset?: number;
  subjectLabel?: string;
  actions?: string[];
}

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
    return toFarmMidnight(utcProxy.getUTCFullYear(), utcProxy.getUTCMonth() + 1, utcProxy.getUTCDate());
  }
  return null;
}

export const runAlertEngine = (input: any): FarmAlert[] => {
  return [];
};

export const alertEngine = {
  checkMortalite(morts: number, effectif: number): number {
    if (effectif === 0) return 0;
    return (morts / effectif) * 100;
  },

  checkTraitementExpiration(logs: any[]): any[] {
    const today = new Date();
    return logs.filter(log => {
      if (log.log_type === 'TRAITEMENT' && log.log_date && log.duration) {
        const startDate = parseFrDate(log.log_date);
        if (!startDate) return false;
        const durationDays = parseInt(log.duration.split(' ')[0]) || 0;
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + durationDays);
        return endDate < today;
      }
      return false;
    });
  },
};
