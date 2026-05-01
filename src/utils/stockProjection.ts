import type { StockAliment, BandePorcelets, Truie, Verrat } from '../types/farm';

interface CheptelContext {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
}

const PHASE_TOKENS = {
  truie_lactation: [/lactation/i, /allait/i, /maternit/i],
  truie_gestation: [/gestation/i, /pleine/i, /truie\s*(reproduction|repro)/i],
  porcelets_premix: [/premix/i, /1[eè]r?e?\s*age/i, /\b5\s*%/i, /d[eé]marrage\s*1/i],
  porcelets_post_sevrage: [/post[\s-]?sev/i, /sevrag/i, /2[eè]me?\s*age/i, /d[eé]marrage\s*2/i],
  croissance: [/croissance/i, /grower/i, /2[eè]me?\s*phase/i],
  engraissement: [/engrais/i, /finisher/i, /finition/i],
} as const;

type Phase = keyof typeof PHASE_TOKENS;

const CONSO_KG_PER_DAY: Record<Phase, number> = {
  truie_lactation: 6,
  truie_gestation: 3,
  porcelets_premix: 0.4,
  porcelets_post_sevrage: 0.8,
  croissance: 1.8,
  engraissement: 2.5,
};

function detectPhase(libelle: string): Phase | null {
  for (const [phase, patterns] of Object.entries(PHASE_TOKENS) as [Phase, readonly RegExp[]][]) {
    if (patterns.some(p => p.test(libelle))) return phase;
  }
  return null;
}

function countAnimalsInPhase(phase: Phase, ctx: CheptelContext): number {
  const { truies, bandes } = ctx;
  switch (phase) {
    case 'truie_lactation':
      return truies.filter(t => /materni|lactant|allait/i.test(t.statut ?? '')).length;
    case 'truie_gestation':
      return truies.filter(t => /pleine|gestat/i.test(t.statut ?? '')).length;
    case 'porcelets_premix':
    case 'porcelets_post_sevrage':
      return bandes
        .filter(b => /sous_mere|sous mère|post_sevrage|sevr/i.test(b.statut ?? ''))
        .reduce((s, b) => s + (b.vivants ?? 0), 0);
    case 'croissance':
    case 'engraissement':
      return bandes
        .filter(b => /croissance|engrais|finition/i.test(b.statut ?? ''))
        .reduce((s, b) => s + (b.vivants ?? 0), 0);
    default:
      return 0;
  }
}

export interface StockProjection {
  joursRestants: number | null;
  consoQuotidienne: number;
  phase: string | null;
}

export function projectStockDuration(
  stock: StockAliment,
  ctx: CheptelContext
): StockProjection {
  const phase = detectPhase(stock.libelle ?? '');
  if (!phase) {
    return { joursRestants: null, consoQuotidienne: 0, phase: null };
  }
  const animals = countAnimalsInPhase(phase, ctx);
  if (animals === 0) {
    return { joursRestants: null, consoQuotidienne: 0, phase };
  }
  const conso = animals * CONSO_KG_PER_DAY[phase];
  const stockKg = stock.stockActuel ?? 0;
  const joursRestants = conso > 0 ? Math.floor(stockKg / conso) : null;
  return { joursRestants, consoQuotidienne: conso, phase };
}

export function formatJoursRestants(j: number | null): string {
  if (j == null) return '';
  if (j === 0) return 'Épuisé aujourd\'hui';
  if (j < 7) return `Reste ~${j} jour${j > 1 ? 's' : ''}`;
  if (j < 30) return `Reste ~${Math.round(j / 7)} sem.`;
  return `Reste ~${Math.round(j / 30)} mois`;
}
