/**
 * financesAnalyzer — calculs purs d'agrégation financière.
 * ────────────────────────────────────────────────────────
 * Pas de dépendance React, pas d'I/O. 100 % stateless, 100 % testable.
 *
 * Responsabilités :
 *   • Synthèse par période (mois, ou "all") : dépenses · revenus · marge
 *   • Liste des périodes disponibles (YYYY-MM, tri décroissant)
 *   • Parsing / formatage de montants avec séparateurs (FCFA par défaut, EUR
 *     détecté si le libellé contient le symbole €)
 *   • Mapping catégorie → tone (`ChipTone` pour l'UI)
 */

import type { FinanceEntry, FinanceSummary } from '../types/farm';

// ─── Date helpers ────────────────────────────────────────────────────────────

/**
 * Convertit une date `FinanceEntry.date` (format dd/MM/yyyy FR) en clé de
 * période `YYYY-MM`. Retourne la chaîne vide si la date est invalide.
 */
export function dateToPeriode(date: string): string {
  if (!date) return '';
  const parts = date.split('/');
  if (parts.length !== 3) return '';
  const [dd, mm, yyyy] = parts;
  const m = mm?.padStart(2, '0') ?? '';
  if (!yyyy || !m || !dd) return '';
  return `${yyyy}-${m}`;
}

// ─── Agrégations ─────────────────────────────────────────────────────────────

/**
 * Agrège une liste d'entrées sur une période donnée (clé YYYY-MM).
 * Si `periode === 'all'`, agrège toutes les entrées.
 */
export function summarizeByPeriode(
  entries: FinanceEntry[],
  periode: string,
): FinanceSummary {
  const filtered = periode === 'all'
    ? entries
    : entries.filter((e) => dateToPeriode(e.date) === periode);

  const parCategorie: Record<string, { depenses: number; revenus: number }> = {};
  let totalDepenses = 0;
  let totalRevenus = 0;

  for (const entry of filtered) {
    const cat = entry.categorie || 'DIVERS';
    if (!parCategorie[cat]) {
      parCategorie[cat] = { depenses: 0, revenus: 0 };
    }
    if (entry.type === 'REVENU') {
      parCategorie[cat].revenus += entry.montant;
      totalRevenus += entry.montant;
    } else {
      parCategorie[cat].depenses += entry.montant;
      totalDepenses += entry.montant;
    }
  }

  return {
    periode,
    totalDepenses,
    totalRevenus,
    margeNette: totalRevenus - totalDepenses,
    parCategorie,
  };
}

/** Raccourci `summarizeByPeriode(entries, 'all')`. */
export function summarizeAll(entries: FinanceEntry[]): FinanceSummary {
  return summarizeByPeriode(entries, 'all');
}

/**
 * Retourne la liste distincte des périodes (YYYY-MM) présentes dans les
 * entrées, triée par ordre décroissant (plus récent d'abord).
 * Les dates invalides sont ignorées.
 */
export function getPeriodes(entries: FinanceEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    const p = dateToPeriode(e.date);
    if (p) set.add(p);
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

// ─── Montants : parse / format ───────────────────────────────────────────────

/**
 * Parse une valeur "montant" depuis Sheets. Tolère :
 *   • `number` natif
 *   • Chaîne "12 000 FCFA", "12.000,50 €", "-3 500"
 *   • Espaces insécables (NBSP) utilisés comme séparateurs de milliers
 *
 * Retourne 0 si non parsable. Préserve le signe.
 */
export function parseMontant(s: unknown): number {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  if (s === null || s === undefined) return 0;
  const raw = String(s).trim();
  if (!raw) return 0;

  // Retire tout ce qui n'est pas chiffre, point, virgule, ou signe.
  // L'espace insécable (\u00A0) et l'espace simple sont séparateurs de milliers.
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;

  // Heuristique : si la chaîne contient "," ET ".", on suppose format FR/EU
  // → la virgule est décimale, le point est séparateur de milliers (rare côté
  // GAS, mais prudent). Si seulement ",", on la traite comme décimal.
  let normalized: string;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  } else {
    normalized = cleaned;
  }

  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formate un montant avec séparateurs de milliers (espace insécable) et la
 * devise en suffixe. Exemple : `formatMontant(12000)` → `"12 000 FCFA"`.
 *
 * Arrondi à l'entier pour FCFA (pas de centimes), à 2 décimales pour EUR.
 */
export function formatMontant(n: number, currency: 'FCFA' | 'EUR' = 'FCFA'): string {
  if (!Number.isFinite(n)) return `0 ${currency}`;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  let body: string;
  if (currency === 'EUR') {
    // Format FR : 12 000,50 €
    const fixed = abs.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    body = `${withSep},${decPart}`;
    return `${sign}${body} €`;
  }

  // FCFA : pas de décimales, espace insécable comme séparateur.
  const rounded = Math.round(abs);
  body = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return `${sign}${body} FCFA`;
}

/**
 * Détecte la devise à partir d'une entrée. Par défaut FCFA (ferme K13 en
 * Côte d'Ivoire). Si le libellé ou les notes mentionnent `€` ou `EUR`,
 * renvoie `EUR`.
 */
export function detectCurrency(entry: Pick<FinanceEntry, 'libelle' | 'notes'>): 'FCFA' | 'EUR' {
  const hay = `${entry.libelle ?? ''} ${entry.notes ?? ''}`;
  if (/€|\bEUR\b/i.test(hay)) return 'EUR';
  return 'FCFA';
}

// ─── Catégorie → ChipTone ────────────────────────────────────────────────────

export type FinanceCategorieTone = 'accent' | 'amber' | 'red' | 'blue' | 'default';

/**
 * Mapping catégorie (libre côté Sheets) → tone UI. Tolère les accents et la
 * casse. Basé sur les mots-clés les plus fréquents du domaine porcin.
 *
 *   • Revenus / ventes   → accent (vert)
 *   • Aliment / nutrition → amber (orange — signature alimentation)
 *   • Santé / vétérinaire → red (rouge — soin)
 *   • Énergie / eau / carburant → blue
 *   • Tout le reste      → default
 */
export function categorieToTone(cat: string): FinanceCategorieTone {
  const norm = (cat ?? '').toUpperCase().trim();
  if (!norm) return 'default';

  if (/REV|VENTE|INCOME|RECETTE/.test(norm)) return 'accent';
  if (/ALIM|NUTRI|FEED|GRAIN|PROVENDE/.test(norm)) return 'amber';
  if (/SANT[EÉ]?|VETO|V[EÉ]T[EÉ]R|MEDIC|SOIN/.test(norm)) return 'red';
  if (/[EÉ]NERG|EAU|[EÉ]LECTR|CARBUR|GAZ|ESSENCE/.test(norm)) return 'blue';
  return 'default';
}
