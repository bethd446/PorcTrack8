/**
 * currency.ts — Devise dérivée du pays de la ferme.
 *
 * Source de vérité unique : `troupeaux.pays` (saisi à l'onboarding).
 * Tout call site qui doit afficher un montant lit la devise via le context
 * (FarmContext → meta → currency) plutôt que de hardcoder "FCFA" ou "EUR".
 *
 * Périmètre :
 *  - `inferCurrencyFromCountry` : mapping pays libre → devise (best-effort).
 *  - `formatCurrency` : formatage homogène (séparateur insécable, FR).
 *
 * Cible métier : Afrique de l'Ouest (FCFA / XOF) → fallback par défaut. La
 * France / Belgique / Suisse / Luxembourg basculent en EUR.
 */

export type Currency = 'EUR' | 'FCFA' | 'XOF' | 'USD';

// NBSP = espace insécable (U+00A0). Séparateur de milliers FR.
const NBSP = String.fromCharCode(0x00a0);

/**
 * Renvoie la devise inférée à partir du libellé pays. Tolère les accents,
 * la casse, les variantes (`Côte d'Ivoire`, `cote d ivoire`).
 *
 * Fallback `FCFA` si vide ou inconnu — la cible métier principale est
 * l'Afrique de l'Ouest, où FCFA / XOF sont l'usage courant.
 */
export function inferCurrencyFromCountry(pays: string | null | undefined): Currency {
  if (!pays) return 'FCFA';
  // Strip combining diacritics : NFD éclate "é" → "e" + U+0301, puis on retire
  // la plage des marques combinantes (U+0300 – U+036F).
  const stripped = pays
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const p = stripped;
  if (
    p.includes('france') ||
    p.includes('belgique') ||
    p.includes('belgium') ||
    p.includes('suisse') ||
    p.includes('switzerland') ||
    p.includes('luxembourg')
  ) {
    return 'EUR';
  }
  if (
    p.includes('cameroun') ||
    p.includes('senegal') ||
    p.includes('cote') || // Côte d'Ivoire (accents stripped)
    p.includes('ivoire') ||
    p.includes('togo') ||
    p.includes('benin') ||
    p.includes('burkina') ||
    p.includes('mali') ||
    p.includes('niger') ||
    p.includes('tchad') ||
    p.includes('gabon') ||
    p.includes('congo') ||
    p.includes('centrafric')
  ) {
    return 'FCFA';
  }
  if (
    p.includes('united states') ||
    p.includes('usa') ||
    p.includes('etats-unis') ||
    p.includes('etats unis')
  ) {
    return 'USD';
  }
  return 'FCFA';
}

/**
 * Formate un montant en string lisible. Sépare les milliers par espace
 * insécable. Pas de décimales pour FCFA/XOF, 2 décimales pour EUR/USD.
 *
 * Exemples :
 *   formatCurrency(12000, 'FCFA') → "12 000 FCFA" (avec NBSP entre milliers)
 *   formatCurrency(12000.5, 'EUR') → "12 000,50 €"
 *   formatCurrency(-3000, 'FCFA') → "-3 000 FCFA"
 */
export function formatCurrency(value: number, currency: Currency): string {
  if (!Number.isFinite(value)) return `0 ${currencySuffix(currency)}`;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (currency === 'EUR' || currency === 'USD') {
    const fixed = abs.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    return `${sign}${withSep},${decPart} ${currencySuffix(currency)}`;
  }

  const rounded = Math.round(abs);
  const body = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${body} ${currencySuffix(currency)}`;
}

/** Suffixe affiché pour chaque devise. */
export function currencySuffix(currency: Currency): string {
  switch (currency) {
    case 'EUR':
      return '€';
    case 'USD':
      return '$';
    case 'XOF':
      return 'XOF';
    case 'FCFA':
    default:
      return 'FCFA';
  }
}
