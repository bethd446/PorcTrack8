import { enqueueAppendRow, processQueue } from '../../services/offlineQueue';
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
  truies: string;
  verrats: string;
  porceletsSevrage: string;
  porcsEngraissement: string;
  miseBasSemaine: string;
  sevrageSemaine: string;
  sailliesSemaine: string;
  entreesMaternite: string;
  observations: string;
  actionsSemaineProchaine: string;
};

export async function addDailyNote(input: DailyNoteInput) {
  enqueueAppendRow(SHEET_DAILY, [
    input.date,
    input.porcher,
    input.eauOk,
    input.alimentOk,
    input.animauxAlertes,
    String(input.naissances),
    String(input.mortalite),
    input.observations,
    input.actions,
  ]);
  return processQueue();
}

export async function addWeeklyPoint(input: WeeklyNoteInput) {
  enqueueAppendRow(SHEET_WEEKLY, [
    input.semaine,
    input.dateDebut,
    input.dateFin,
    input.porcher,
    input.truies,
    input.verrats,
    input.porceletsSevrage,
    input.porcsEngraissement,
    input.miseBasSemaine,
    input.sevrageSemaine,
    input.sailliesSemaine,
    input.entreesMaternite,
    input.observations,
    input.actionsSemaineProchaine,
  ]);
  return processQueue();
}
