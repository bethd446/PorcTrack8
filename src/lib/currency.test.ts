import { describe, it, expect } from 'vitest';
import { inferCurrencyFromCountry, formatCurrency } from './currency';

// Espace insécable (U+00A0) — séparateur de milliers FR.
const NBSP = String.fromCharCode(0x00a0);

describe('inferCurrencyFromCountry (V43.3 — FCFA only)', () => {
  it('retourne toujours FCFA, peu importe le pays', () => {
    expect(inferCurrencyFromCountry('France')).toBe('FCFA');
    expect(inferCurrencyFromCountry('Belgique')).toBe('FCFA');
    expect(inferCurrencyFromCountry("Côte d'Ivoire")).toBe('FCFA');
    expect(inferCurrencyFromCountry('Cameroun')).toBe('FCFA');
    expect(inferCurrencyFromCountry('Sénégal')).toBe('FCFA');
    expect(inferCurrencyFromCountry('USA')).toBe('FCFA');
    expect(inferCurrencyFromCountry(null)).toBe('FCFA');
    expect(inferCurrencyFromCountry(undefined)).toBe('FCFA');
    expect(inferCurrencyFromCountry('')).toBe('FCFA');
    expect(inferCurrencyFromCountry('PaysQuiNExistePas')).toBe('FCFA');
  });
});

describe('formatCurrency (FCFA only)', () => {
  it('formate FCFA sans décimales avec NBSP', () => {
    expect(formatCurrency(12000, 'FCFA')).toBe('12' + NBSP + '000 FCFA');
  });

  it('arrondit les décimales (FCFA = entiers)', () => {
    expect(formatCurrency(12000.5, 'FCFA')).toBe('12' + NBSP + '001 FCFA');
  });

  it('préserve le signe négatif', () => {
    expect(formatCurrency(-3000, 'FCFA')).toBe('-3' + NBSP + '000 FCFA');
  });

  it('renvoie une valeur fallback pour NaN/Infinity', () => {
    expect(formatCurrency(NaN, 'FCFA')).toBe('0 FCFA');
    expect(formatCurrency(Infinity, 'FCFA')).toBe('0 FCFA');
  });
});
