/**
 * Recherche globale par boucle / displayId / nom / idPortee
 * ════════════════════════════════════════════════════════════
 * Service pur (pas de dépendance React) consommé par GlobalSearch.
 *
 * Stratégie de score (élevé = meilleur match) :
 *   100 — exact match (boucle/displayId/idPortee)
 *    80 — prefix match (commence par la query)
 *    60 — contains match
 *    +20 — bonus si la query est purement numérique et commence un champ numérique
 *
 * Tri : score desc, puis ordre original (stable).
 */

import type { BandePorcelets, Truie, Verrat } from '../types/farm';

export type SearchResultType = 'truie' | 'verrat' | 'bande';

export interface SearchResult {
  type: SearchResultType;
  /** ID utilisé pour la navigation. */
  id: string;
  /** Libellé principal (boucle ou idPortee). */
  primary: string;
  /** Contexte secondaire (statut, dateMB, mère, etc.). */
  secondary?: string;
  /** URL React Router (ex. `/troupeau/truies/T01`). */
  href: string;
}

export interface SearchSources {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
}

const DEFAULT_LIMIT = 20;

function norm(value: string | undefined | null): string {
  return (value ?? '').toString().trim().toLowerCase();
}

function isNumericQuery(q: string): boolean {
  return /^\d+$/.test(q);
}

/**
 * Score un champ contre la query.
 * Retourne 0 si pas de match.
 */
function scoreField(field: string, query: string, numericQuery: boolean): number {
  if (!field) return 0;
  if (field === query) return 100;
  if (field.startsWith(query)) {
    return numericQuery && /^\d/.test(field) ? 80 + 20 : 80;
  }
  if (field.includes(query)) return 60;
  return 0;
}

/** Score le meilleur match parmi plusieurs champs candidats. */
function scoreFields(fields: Array<string | undefined>, query: string, numericQuery: boolean): number {
  let best = 0;
  for (const f of fields) {
    const s = scoreField(norm(f), query, numericQuery);
    if (s > best) best = s;
  }
  return best;
}

export function searchAll(
  query: string,
  sources: SearchSources,
  limit: number = DEFAULT_LIMIT,
): SearchResult[] {
  const q = norm(query);
  if (!q) return [];

  const numericQuery = isNumericQuery(q);
  const scored: Array<{ score: number; index: number; result: SearchResult }> = [];
  let idx = 0;

  for (const t of sources.truies) {
    const score = scoreFields([t.boucle, t.displayId, t.nom], q, numericQuery);
    if (score > 0) {
      scored.push({
        score,
        index: idx++,
        result: {
          type: 'truie',
          id: t.id,
          primary: t.boucle || t.displayId || t.id,
          secondary: t.nom ? `${t.nom} · ${t.statut}` : t.statut,
          href: `/troupeau/truies/${t.id}`,
        },
      });
    }
  }

  for (const v of sources.verrats) {
    const score = scoreFields([v.boucle, v.displayId, v.nom], q, numericQuery);
    if (score > 0) {
      scored.push({
        score,
        index: idx++,
        result: {
          type: 'verrat',
          id: v.id,
          primary: v.boucle || v.displayId || v.id,
          secondary: v.nom ? `${v.nom} · ${v.statut}` : v.statut,
          href: `/troupeau/verrats/${v.id}`,
        },
      });
    }
  }

  for (const b of sources.bandes) {
    const score = scoreFields([b.idPortee, b.id, b.truie], q, numericQuery);
    if (score > 0) {
      const dateLabel = b.dateMB ? `MB ${b.dateMB}` : b.statut;
      const secondary = b.truie ? `Mère ${b.truie} · ${dateLabel}` : dateLabel;
      scored.push({
        score,
        index: idx++,
        result: {
          type: 'bande',
          id: b.id,
          primary: b.idPortee || b.id,
          secondary,
          href: `/troupeau/bandes/${b.id}`,
        },
      });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored.slice(0, limit).map((s) => s.result);
}
