import { describe, it, expect } from 'vitest';
import { inferCurrencyFromCountry, formatCurrency } from './currency';

// Espace insécable (U+00A0) — séparateur de milliers FR.
const NBSP = String.fromCharCode(0x00a0);

describe('inferCurrencyFromCountry', () => {
  it('maps France → EUR', () => {
    expect(inferCurrencyFromCountry('France')).toBe('EUR');
    expect(inferCurrencyFromCountry('france')).toBe('EUR');
  });

  it('maps Belgique / Suisse / Luxembourg → EUR', () => {
    expect(inferCurrencyFromCountry('Belgique')).toBe('EUR');
    expect(inferCurrencyFromCountry('Suisse')).toBe('EUR');
    expect(inferCurrencyFromCountry('Luxembourg')).toBe('EUR');
  });

  it('maps Côte d\'Ivoire (avec accent) → FCFA', () => {
    expect(inferCurrencyFromCountry("Côte d'Ivoire")).toBe('FCFA');
    expect(inferCurrencyFromCountry('Cote d Ivoire')).toBe('FCFA');
  });

  it('maps autres pays Afrique de l\'Ouest → FCFA', () => {
    expect(inferCurrencyFromCountry('Cameroun')).toBe('FCFA');
    expect(inferCurrencyFromCountry('Sénégal')).toBe('FCFA');
    expect(inferCurrencyFromCountry('Bénin')).toBe('FCFA');
    expect(inferCurrencyFromCountry('Togo')).toBe('FCFA');
  });

  it('défaut FCFA si vide ou inconnu', () => {
    expect(inferCurrencyFromCountry(null)).toBe('FCFA');
    expect(inferCurrencyFromCountry(undefined)).toBe('FCFA');
    expect(inferCurrencyFromCountry('')).toBe('FCFA');
    expect(inferCurrencyFromCountry('PaysQuiNExistePas')).toBe('FCFA');
  });
});

describe('formatCurrency', () => {
  it('formate FCFA sans décimales avec NBSP', () => {
    expect(formatCurrency(12000, 'FCFA')).toBe('12' + NBSP + '000 FCFA');
  });

  it('formate EUR avec 2 décimales et symbole €', () => {
    expect(formatCurrency(12000.5, 'EUR')).toBe('12' + NBSP + '000,50 €');
  });

  it('préserve le signe négatif', () => {
    expect(formatCurrency(-3000, 'FCFA')).toBe('-3' + NBSP + '000 FCFA');
    expect(formatCurrency(-1.25, 'EUR')).toBe('-1,25 €');
  });

  it('renvoie une valeur fallback pour NaN/Infinity', () => {
    expect(formatCurrency(NaN, 'FCFA')).toBe('0 FCFA');
    expect(formatCurrency(Infinity, 'EUR')).toBe('0 €');
  });
});
