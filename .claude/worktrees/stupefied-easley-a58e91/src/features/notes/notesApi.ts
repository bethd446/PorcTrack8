import { queuePostAction, flushQueue } from '../../services/offlineQueue';
import { SHEET_DAILY, SHEET_WEEKLY } from './constants';

export type DailyNoteInput = {
  date: string; // YYYY-MM-DD
  porcher: string;
  eauOk: 'Oui' | 'Non';
  alimentOk: 'Oui' | 'Non';
  animauxAlertes: string;
  naissances: number;
  mortalite: number;
  observations: string;
  actions: string;
};

export type WeeklyNoteInput = {
  semaine: string;
  dateDebut: string;
  dateFin: string;
  porcher: string;
  cheptelResume: string;
  evenements: string;
  observations: string;
  actionsSemaineProchaine: string;
};

export async function addDailyNote(input: DailyNoteInput) {
  queuePostAction({
    action: 'append_row',
    sheet: SHEET_DAILY,
    values: [
      input.date,
      input.porcher,
      input.eauOk,
      input.alimentOk,
      input.animauxAlertes,
      String(input.naissances),
      String(input.mortalite),
      input.observations,
      input.actions,
    ],
  });

  return flushQueue(5);
}

export async function addWeeklyPoint(input: WeeklyNoteInput) {
  queuePostAction({
    action: 'append_row',
    sheet: SHEET_WEEKLY,
    values: [
      input.semaine,
      input.dateDebut,
      input.dateFin,
      input.porcher,
      input.cheptelResume,
      input.evenements,
      input.observations,
      input.actionsSemaineProchaine,
    ],
  });

  return flushQueue(5);
}
