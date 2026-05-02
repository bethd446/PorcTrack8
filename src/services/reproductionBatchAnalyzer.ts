/**
 * reproductionBatchAnalyzer — V23-S2
 * ══════════════════════════════════════════════════════════════════════════
 * Vue calculée "bande de reproduction" : groupe de saillies effectuées dans
 * une fenêtre temporelle (±5 jours par défaut), suivi sur le cycle complet
 * saillie → écho → mise-bas → sevrage.
 *
 * Décision business : pas de table dédiée. La cohorte est dérivée à la volée
 * depuis SUIVI_REPRODUCTION_ACTUEL + SUIVI_BANDES_PORCELETS.
 *
 * Contrat :
 *   - input : Truie[] + Saillie[] + BandePorcelets[] + today
 *   - output : ReproBatch[] (logique pure, aucun side-effect)
 */

import { safeDate, normalizeTruieId } from '../lib/truieHelpers';
import { computeBandePhase } from './bandesAggregator';
import type { Truie, Saillie, BandePorcelets } from '../types/farm';

const MS_DAY = 86_400_000;

const DEFAULT_WINDOW_DAYS = 5;
const GESTATION_DUREE_J = 115;
const MB_MATCH_TOLERANCE_J = 10;

// ─── Types publics ───────────────────────────────────────────────────────────

export type ReproBatchStatut =
  | 'EN_SAILLIE'
  | 'GESTATION'
  | 'MATERNITE'
  | 'SEVRE'
  | 'TERMINE';

export interface ReproBatch {
  id: string;
  windowStart: string;
  windowEnd: string;
  windowMedian: string;
  saillies: Saillie[];
  truies: Truie[];
  progression: {
    saillies: number;
    echos: number;
    miseBas: number;
    sevrages: number;
  };
  porceletsVivants: number;
  nbPortees: number;
  statut: ReproBatchStatut;
}

export interface BuildReproBatchesContext {
  truies: Truie[];
  saillies: Saillie[];
  bandes: BandePorcelets[];
  windowDays?: number;
  today: Date;
}

// ─── Helpers internes ────────────────────────────────────────────────────────

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatFR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${dd}/${m}/${y}`;
}

function findTruieFor(saillie: Saillie, truies: Truie[]): Truie | null {
  const sid = normalizeTruieId(saillie.truieId);
  return (
    truies.find(t => {
      if (normalizeTruieId(t.id) === sid) return true;
      if (normalizeTruieId(t.displayId) === sid) return true;
      if (saillie.truieBoucle && t.boucle === saillie.truieBoucle) return true;
      return false;
    }) ?? null
  );
}

function isBandeSevree(bande: BandePorcelets, today: Date): boolean {
  // Statut explicite "Sevrés" ou phase calculée post-sevrage et au-delà.
  if (/sevr/i.test(bande.statut || '')) return true;
  const phase = computeBandePhase(bande, today);
  return phase === 'POST_SEVRAGE' || phase === 'CROISSANCE' || phase === 'ENGRAISSEMENT' || phase === 'FINITION';
}

// ─── findBandeForSaillie ─────────────────────────────────────────────────────

/**
 * Trouve la bande issue d'une saillie donnée.
 * Match par truie (id/displayId/boucle) + dateMB ≈ dateSaillie + 115j (±10j).
 */
export function findBandeForSaillie(
  saillie: Saillie,
  bandes: BandePorcelets[],
): BandePorcelets | null {
  const dSaillie = safeDate(saillie.dateSaillie);
  if (!dSaillie) return null;

  const sid = normalizeTruieId(saillie.truieId);
  const expectedMB = dSaillie.getTime() + GESTATION_DUREE_J * MS_DAY;

  let best: BandePorcelets | null = null;
  let bestDelta = Infinity;

  for (const b of bandes) {
    // Match par truie : id ou boucle.
    const matchTruie =
      (b.truie && normalizeTruieId(b.truie) === sid)
      || (b.boucleMere && saillie.truieBoucle && b.boucleMere === saillie.truieBoucle);
    if (!matchTruie) continue;

    const dMB = safeDate(b.dateMB);
    if (!dMB) continue;

    const delta = Math.abs(dMB.getTime() - expectedMB);
    if (delta > MB_MATCH_TOLERANCE_J * MS_DAY) continue;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = b;
    }
  }

  return best;
}

// ─── Groupement par fenêtre ─────────────────────────────────────────────────

interface SaillieWithDate {
  saillie: Saillie;
  ts: number;
}

function groupByWindow(saillies: Saillie[], windowDays: number): Saillie[][] {
  const dated: SaillieWithDate[] = [];
  for (const s of saillies) {
    const d = safeDate(s.dateSaillie);
    if (!d) continue;
    dated.push({ saillie: s, ts: startOfDay(d) });
  }
  dated.sort((a, b) => a.ts - b.ts);

  const groups: Saillie[][] = [];
  let current: SaillieWithDate[] = [];
  let firstTs = 0;
  const windowMs = windowDays * MS_DAY;

  for (const item of dated) {
    if (current.length === 0) {
      current = [item];
      firstTs = item.ts;
      continue;
    }
    if (item.ts - firstTs <= windowMs) {
      current.push(item);
    } else {
      groups.push(current.map(c => c.saillie));
      current = [item];
      firstTs = item.ts;
    }
  }
  if (current.length > 0) groups.push(current.map(c => c.saillie));
  return groups;
}

// ─── Construction d'un batch ────────────────────────────────────────────────

function buildOneBatch(
  groupSaillies: Saillie[],
  truies: Truie[],
  bandes: BandePorcelets[],
  today: Date,
): ReproBatch {
  const dates = groupSaillies
    .map(s => safeDate(s.dateSaillie))
    .filter((d): d is Date => d !== null)
    .map(d => startOfDay(d))
    .sort((a, b) => a - b);

  const startTs = dates[0];
  const endTs = dates[dates.length - 1];
  // Médiane (élément central trié, milieu inférieur si pair).
  const medianTs = dates[Math.floor((dates.length - 1) / 2)];
  const medianDate = new Date(medianTs);

  // Truies impliquées (déduplication par ID normalisé).
  const truiesSet = new Map<string, Truie>();
  for (const s of groupSaillies) {
    const t = findTruieFor(s, truies);
    if (t) {
      const key = normalizeTruieId(t.id);
      if (!truiesSet.has(key)) truiesSet.set(key, t);
    }
  }

  // Bandes liées (1 saillie → 0 ou 1 bande).
  const linkedBandes: BandePorcelets[] = [];
  let echoCount = 0;
  let mbCount = 0;
  let sevrageCount = 0;

  for (const s of groupSaillies) {
    const truie = findTruieFor(s, truies);
    const bande = findBandeForSaillie(s, bandes);

    if (bande) {
      linkedBandes.push(bande);
      mbCount += 1;
      echoCount += 1;
      if (isBandeSevree(bande, today)) sevrageCount += 1;
    } else if (truie && /pleine/i.test(truie.statut)) {
      echoCount += 1;
    }
  }

  const total = groupSaillies.length;
  const progression = {
    saillies: 1,
    echos: total > 0 ? echoCount / total : 0,
    miseBas: total > 0 ? mbCount / total : 0,
    sevrages: linkedBandes.length > 0 ? sevrageCount / linkedBandes.length : 0,
  };

  // Statut cascade.
  let statut: ReproBatchStatut;
  if (progression.sevrages >= 1.0 && linkedBandes.length > 0) {
    statut = 'TERMINE';
  } else if (progression.sevrages >= 0.8 && linkedBandes.length > 0) {
    statut = 'SEVRE';
  } else if (progression.miseBas > 0) {
    statut = 'MATERNITE';
  } else if (progression.echos >= 0.8) {
    statut = 'GESTATION';
  } else {
    statut = 'EN_SAILLIE';
  }

  const porceletsVivants = linkedBandes.reduce((acc, b) => acc + (b.vivants || 0), 0);

  return {
    id: `${toISO(medianDate)}-batch`,
    windowStart: toISO(new Date(startTs)),
    windowEnd: toISO(new Date(endTs)),
    windowMedian: toISO(medianDate),
    saillies: groupSaillies,
    truies: Array.from(truiesSet.values()),
    progression,
    porceletsVivants,
    nbPortees: linkedBandes.length,
    statut,
  };
}

// ─── Façade publique ─────────────────────────────────────────────────────────

export function buildReproBatches(ctx: BuildReproBatchesContext): ReproBatch[] {
  const windowDays = ctx.windowDays ?? DEFAULT_WINDOW_DAYS;
  const groups = groupByWindow(ctx.saillies, windowDays);
  return groups.map(g => buildOneBatch(g, ctx.truies, ctx.bandes, ctx.today));
}

/**
 * Libellé FR : "Vague du JJ/MM/YYYY — N saillies".
 */
export function formatBatchLabel(batch: ReproBatch): string {
  const parts = batch.windowMedian.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const n = batch.saillies.length;
  return `Vague du ${formatFR(d)} — ${n} saillie${n > 1 ? 's' : ''}`;
}
