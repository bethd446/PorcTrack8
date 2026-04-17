import { readTableByKey, fetchData } from './googleSheets';

export interface ChecklistQuestion {
  id: string;
  frequence?: string;
  module?: string;
  texte: string;
  typeReponse: 'bool' | 'enum' | 'number' | 'text' | 'date';
  cibleTable?: string;
  cibleCol?: string;
  options?: string[];
  champ?: string;
}

export interface ChecklistItem {
  checklist: string;
  nr: number;
  idQuestion: string;
  texteAffiche: string;
  typeRep: string;
  options: string;
  cibleTable: string;
  champ: string;
}

const CACHE_KEY_QUESTIONS = 'porctrack_questions_cache';
const CACHE_KEY_CHECKLISTS = 'porctrack_checklists_cache';

export async function loadChecklistDefinitions() {
  try {
    const [questionsRes, checklistsRes] = await Promise.all([
      fetchData('QUESTIONS_CONTROLE'),
      fetchData('CHECKLISTS')
    ]);

    if (questionsRes.success) {
      localStorage.setItem(CACHE_KEY_QUESTIONS, JSON.stringify({
        data: questionsRes.data,
        timestamp: Date.now()
      }));
    }

    if (checklistsRes.success) {
      localStorage.setItem(CACHE_KEY_CHECKLISTS, JSON.stringify({
        data: checklistsRes.data,
        timestamp: Date.now()
      }));
    }

    return { success: true };
  } catch (e) {
    console.error('Failed to load checklists', e);
    return { success: false };
  }
}

export function getChecklistItems(name: string): ChecklistItem[] {
  const cached = localStorage.getItem(CACHE_KEY_CHECKLISTS);
  if (!cached) return [];
  try {
    const { data } = JSON.parse(cached);
    if (!data || data.length < 2) return [];

    const [headers, ...rows] = data;
    const items: ChecklistItem[] = rows
      .map((row: any[]) => {
          const item: any = {};
          headers.forEach((h: string, i: number) => {
              item[h.trim()] = row[i];
          });
          return item as ChecklistItem;
      })
      .filter((item: any) => item.CHECKLIST === name)
      .sort((a: any, b: any) => parseInt(a.NR) - parseInt(b.NR));

    return items;
  } catch (e) {
    return [];
  }
}

export function isChecklistDoneToday(name: string, notesData: any[][]): boolean {
  const today = new Date().toISOString().split('T')[0];
  // Format in NOTES_TERRAIN: DATE, TYPE, SUBJECT_ID, VALUE, DETAILS
  // Or check based on the structure defined in App.tsx/BandesView
  // User says: TYPE=CHECKLIST_DONE, CHECKLIST=DAILY/VENDREDI, DATE=YYYY-MM-DD
  return notesData.some(row =>
    String(row[1]).toUpperCase() === 'CHECKLIST_DONE' &&
    String(row[2]).toUpperCase() === name.toUpperCase() &&
    String(row[0]).startsWith(today)
  );
}
