import { readRange, postAction } from '../../services/googleSheets';
import { DAILY_HEADERS, SHEET_DAILY, SHEET_WEEKLY, WEEKLY_HEADERS } from './constants';

const isRowEmpty = (row: any[]) => row.every(v => v === null || v === undefined || String(v).trim() === '');

async function ensureSheetHeaders(sheet: string, headers: string[]) {
  // Lire la ligne 1 sur une largeur "headers.length"
  const endCol = String.fromCharCode('A'.charCodeAt(0) + headers.length - 1);
  const range = `A1:${endCol}1`;

  const res = await readRange(sheet, range);
  const firstRow: any[] = (res.success && res.data?.[0]) ? res.data[0] : [];

  const needsWrite = !res.success || firstRow.length === 0 || isRowEmpty(firstRow) || headers.some((h, i) => String(firstRow[i] ?? '').trim() !== h);

  if (!needsWrite) return { ok: true, sheet, updated: false };

  // write_range -> setValues 2D
  const values = [headers];
  const write = await postAction({
    action: 'write_range',
    sheet,
    range,
    values,
  });

  return { ok: write.success, sheet, updated: true, error: write.success ? undefined : write.message };
}

export async function ensureNotesSheetsHeaders() {
  const daily = await ensureSheetHeaders(SHEET_DAILY, DAILY_HEADERS);
  const weekly = await ensureSheetHeaders(SHEET_WEEKLY, WEEKLY_HEADERS);
  return { daily, weekly };
}
