/**
 * currency.ts — Devise unique plateforme : FCFA.
 *
 * V43.3 : la plateforme PorcTrack utilise UNIQUEMENT FCFA, peu importe
 * le pays de la ferme. Le helper `inferCurrencyFromCountry` retourne
 * toujours `'FCFA'` (signature préservée pour compat call sites).
 *
 * Périmètre :
 *  - `formatCurrency` : formatage homogène (séparateur insécable, FR).
 *  - Pas de décimales (cible métier Afrique de l'Ouest, FCFA).
 */

export type Currency = 'FCFA';

// NBSP = espace insécable (U+00A0). Séparateur de milliers FR.
const NBSP = String.fromCharCode(0x00a0);

/**
 * Plateforme PorcTrack = FCFA only, peu importe le pays. Signature
 * conservée pour compat (anciens call sites lisent toujours `pays`).
 */
export function inferCurrencyFromCountry(_pays?: string | null | undefined): Currency {
  return 'FCFA';
}

/**
 * Formate un montant en string lisible. Sépare les milliers par espace
 * insécable. Pas de décimales (FCFA).
 *
 * Exemples :
 *   formatCurrency(12000, 'FCFA') → "12 000 FCFA"
 *   formatCurrency(-3000, 'FCFA') → "-3 000 FCFA"
 */
export function formatCurrency(value: number, currency: Currency = 'FCFA'): string {
  if (!Number.isFinite(value)) return `0 ${currencySuffix(currency)}`;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const rounded = Math.round(abs);
  const body = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${body} ${currencySuffix(currency)}`;
}

/** Suffixe affiché : toujours "FCFA". */
export function currencySuffix(_currency: Currency = 'FCFA'): string {
  return 'FCFA';
}
