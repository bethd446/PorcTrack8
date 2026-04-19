import { fetchData } from './googleSheets';
import { kvGet, kvSet } from './kvStore';
import { logger } from './logger';

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
      await kvSet(CACHE_KEY_QUESTIONS, JSON.stringify({
        data: questionsRes.data,
        timestamp: Date.now()
      }));
    }

    if (checklistsRes.success) {
      await kvSet(CACHE_KEY_CHECKLISTS, JSON.stringify({
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
  const cached = kvGet(CACHE_KEY_CHECKLISTS);
  if (!cached) return [];
  try {
    const { data } = JSON.parse(cached);
    if (!data || data.length < 2) return [];

    const [headers, ...rows] = data as [string[], ...unknown[][]];
    type RawRow = Record<string, unknown> & { CHECKLIST?: string; NR?: string | number };
    const items: ChecklistItem[] = (rows as unknown[][])
      .map((row) => {
          const item: RawRow = {};
          headers.forEach((h: string, i: number) => {
              item[h.trim()] = row[i];
          });
          return item;
      })
      .filter((item) => item.CHECKLIST === name)
      .sort((a, b) => parseInt(String(a.NR ?? '0'), 10) - parseInt(String(b.NR ?? '0'), 10))
      .map((item) => item as unknown as ChecklistItem);

    return items;
  } catch {
    return [];
  }
}

/**
 * Normalise une date de NOTES_TERRAIN vers `YYYY-MM-DD`.
 * Tolère :
 *  - ISO complet (`2026-04-17T09:12:…`) → `2026-04-17`
 *  - ISO court   (`2026-04-17`)          → `2026-04-17`
 *  - FR          (`17/04/2026`)          → `2026-04-17`
 * Retourne `null` si la forme est inconnue.
 */
function normalizeDateToISO(raw: string): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  // ISO long / court : on coupe au 'T' ou prend tel quel si YYYY-MM-DD
  const isoShort = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoShort) return isoShort[1];

  // FR DD/MM/YYYY
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const [, d, m, y] = fr;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Détecte si la checklist `name` a déjà été complétée aujourd'hui dans
 * NOTES_TERRAIN (schéma canonique 5-cols : DATE|TYPE_ANIMAL|ID_ANIMAL|NOTE|AUTEUR).
 *
 * Critères :
 *  - row[1] = 'CHECKLIST' (nouveau schéma) OU 'CHECKLIST_DONE' (legacy)
 *  - row[2] = nom de la checklist (insensible à la casse)
 *  - row[3] contient le marker 'CHECKLIST_DONE' (pour les rows CHECKLIST modernes
 *    émises par ChecklistFlow en fin de parcours) OU type legacy = 'CHECKLIST_DONE'
 *  - row[0] = date du jour (tolère ISO et dd/MM/yyyy)
 */
export function isChecklistDoneToday(name: string, notesData: unknown[][]): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const targetName = name.toUpperCase();

  return notesData.some((row) => {
    if (!Array.isArray(row) || row.length < 4) return false;

    const type = String(row[1] ?? '').toUpperCase().trim();
    const subject = String(row[2] ?? '').toUpperCase().trim();
    const note = String(row[3] ?? '');
    const rawDate = String(row[0] ?? '');

    if (subject !== targetName) return false;

    const isLegacyDoneRow = type === 'CHECKLIST_DONE';
    const isModernDoneRow = type === 'CHECKLIST' && /CHECKLIST_DONE/i.test(note);
    if (!isLegacyDoneRow && !isModernDoneRow) return false;

    const iso = normalizeDateToISO(rawDate);
    if (!iso) {
      logger.warn('CHECKLIST', 'date row illisible, ignorée', { rawDate, name: targetName });
      return false;
    }
    return iso === today;
  });
}
