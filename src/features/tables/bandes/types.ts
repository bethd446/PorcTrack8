export type SheetRawRow = unknown[];

export interface DebugMeta {
  sheetName?: string;
  idHeader?: string;
  headerRow?: number;
  key?: string;
}

export interface AggregatedBande {
  id: string;
  count: number;
  truie: unknown;
  boucleMere: unknown;
  dateMB: unknown;
  age: number | null;
  nv: unknown;
  morts: number;
  vivants: unknown;
  status: unknown;
  hasAlert: boolean;
  rows: SheetRawRow[];
}

export type StatusTone = 'gold' | 'accent' | 'default';

export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return 'default';
  const s = String(status).toUpperCase();
  if (s.includes('RECAP')) return 'default';
  if (s.includes('SEVR')) return 'accent';
  if (s.includes('SOUS')) return 'gold';
  return 'default';
}

