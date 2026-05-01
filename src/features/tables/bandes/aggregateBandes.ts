import type { AggregatedBande, SheetRawRow } from './types';

function parseFlexibleDate(raw: string): Date {
  let d = new Date(raw);
  if (!isNaN(d.getTime())) return d;
  const parts = raw.split(/[/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    else d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return d;
}

export function aggregateBandes(
  rows: SheetRawRow[],
  header: string[],
  bandeIdIndex: number,
  searchText: string,
  statusFilter: 'ALL' | 'SOUS' | 'SEVRES',
): AggregatedBande[] {
  if (rows.length === 0 || bandeIdIndex === -1) return [];
  const groups: Record<string, SheetRawRow[]> = {};

  rows.forEach(row => {
    const id = String(row[bandeIdIndex] || '').trim();
    if (!id) return;
    if (!groups[id]) groups[id] = [];
    groups[id].push(row);
  });

  return Object.entries(groups).map(([id, groupRows]) => {
    const findVal = (names: string[]): unknown => {
      const idx = header.findIndex(h => names.some(n => h.toUpperCase().includes(n.toUpperCase())));
      return idx !== -1 ? groupRows[0][idx] : null;
    };

    const dateMB = findVal(['DATE MB', 'DATE_MB']);
    const dateSevragePrevue = findVal(['DATE SEVRAGE PRÉVUE', 'SEVRAGE_PREVUE']);
    const dateSevrageReelle = findVal(['DATE SEVRAGE RÉELLE', 'SEVRAGE_REELLE']);
    const morts = parseInt(String(findVal(['MORTS']) || '0'));

    let hasAlert = morts > 0;
    if (dateSevragePrevue && !dateSevrageReelle) {
      const dS = parseFlexibleDate(String(dateSevragePrevue));
      if (!isNaN(dS.getTime()) && dS.getTime() < new Date().getTime()) {
        hasAlert = true;
      }
    }

    let age: number | null = null;
    if (dateMB) {
      const d = parseFlexibleDate(String(dateMB));
      if (!isNaN(d.getTime())) {
        const diff = new Date().getTime() - d.getTime();
        age = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      }
    }

    return {
      id,
      count: groupRows.length,
      truie: findVal(['TRUIE']),
      boucleMere: findVal(['BOUCLE MÈRE', 'BOUCLE_MERE']),
      dateMB,
      age,
      nv: findVal(['NV']),
      morts,
      vivants: findVal(['VIVANTS']),
      status: findVal(['STATUT']),
      hasAlert,
      rows: groupRows,
    };
  }).filter(b => {
    const txt = searchText.toLowerCase();
    const matchesText =
      b.id.toLowerCase().includes(txt) ||
      (!!b.truie && String(b.truie).toLowerCase().includes(txt)) ||
      (!!b.boucleMere && String(b.boucleMere).toLowerCase().includes(txt));
    if (!matchesText) return false;
    if (statusFilter === 'ALL') return true;
    const s = String(b.status || '').toUpperCase();
    if (statusFilter === 'SEVRES') return s.includes('SEVR');
    if (statusFilter === 'SOUS') return s.includes('SOUS') || (!s.includes('SEVR') && !s.includes('RECAP'));
    return true;
  });
}
