import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  validatePoidsKg,
  validateDatePresentOrPast,
  validateDateFutureOrToday,
  validateEffectif,
  validateBoucle,
  type ValidationResult,
} from './farmValidators';

/**
 * Helpers pour extraire le 1er code/field de l'erreur — `errors` est toujours
 * présent (vide si `ok: true`), donc on évite tout narrowing dépendant du
 * tsconfig. Retournent `undefined` quand la validation passe.
 */
function errCode(r: ValidationResult): string | undefined {
  return r.ok ? undefined : r.errors[0]?.code;
}

function errField(r: ValidationResult): string | undefined {
  return r.ok ? undefined : r.errors[0]?.field;
}

describe('validatePoidsKg', () => {
  it('accepts a typical porcelet weight', () => {
    expect(validatePoidsKg(6.2).ok).toBe(true);
  });

  it('accepts an adult sow weight', () => {
    expect(validatePoidsKg(220).ok).toBe(true);
  });

  it('rejects NaN', () => {
    const r = validatePoidsKg(Number.NaN);
    expect(r.ok).toBe(false);
    expect(errCode(r)).toBe('poids.invalid');
  });

  it('rejects zero / negative', () => {
    expect(errCode(validatePoidsKg(0))).toBe('poids.non_positive');
    expect(validatePoidsKg(-1).ok).toBe(false);
  });

  it('rejects below min default', () => {
    expect(errCode(validatePoidsKg(0.05))).toBe('poids.too_low');
  });

  it('rejects above max default (max+1)', () => {
    expect(errCode(validatePoidsKg(501))).toBe('poids.too_high');
  });

  it('honours custom bounds', () => {
    expect(validatePoidsKg(8, { min: 5, max: 10 }).ok).toBe(true);
    expect(validatePoidsKg(11, { min: 5, max: 10 }).ok).toBe(false);
  });

  it('uses provided field name in error', () => {
    expect(errField(validatePoidsKg(Number.NaN, { field: 'poidsMoyen' }))).toBe(
      'poidsMoyen',
    );
  });
});

describe('validateDatePresentOrPast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts today', () => {
    expect(validateDatePresentOrPast('2026-05-15').ok).toBe(true);
  });

  it('accepts past date', () => {
    expect(validateDatePresentOrPast('2025-01-10').ok).toBe(true);
  });

  it('rejects future date', () => {
    expect(errCode(validateDatePresentOrPast('2026-05-16'))).toBe('date.future');
  });

  it('rejects empty string', () => {
    expect(errCode(validateDatePresentOrPast(''))).toBe('date.required');
  });

  it('rejects malformed date', () => {
    expect(errCode(validateDatePresentOrPast('15/05/2026'))).toBe('date.invalid');
  });

  it('rejects impossible calendar date (Feb 31)', () => {
    expect(errCode(validateDatePresentOrPast('2024-02-31'))).toBe('date.invalid');
  });
});

describe('validateDateFutureOrToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts today', () => {
    expect(validateDateFutureOrToday('2026-05-15').ok).toBe(true);
  });

  it('accepts future date', () => {
    expect(validateDateFutureOrToday('2026-08-01').ok).toBe(true);
  });

  it('rejects past date', () => {
    expect(errCode(validateDateFutureOrToday('2026-05-14'))).toBe('date.past');
  });

  it('rejects empty', () => {
    expect(errCode(validateDateFutureOrToday(''))).toBe('date.required');
  });
});

describe('validateEffectif', () => {
  it('accepts 0', () => {
    expect(validateEffectif(0).ok).toBe(true);
  });

  it('accepts a typical bande', () => {
    expect(validateEffectif(12).ok).toBe(true);
  });

  it('rejects negative', () => {
    expect(errCode(validateEffectif(-1))).toBe('effectif.too_low');
  });

  it('rejects non-integer', () => {
    expect(errCode(validateEffectif(3.5))).toBe('effectif.not_integer');
  });

  it('rejects above max default (max+1)', () => {
    expect(errCode(validateEffectif(301))).toBe('effectif.too_high');
  });

  it('rejects NaN', () => {
    expect(errCode(validateEffectif(Number.NaN))).toBe('effectif.invalid');
  });

  it('honours custom bounds', () => {
    expect(validateEffectif(50, { min: 1, max: 100 }).ok).toBe(true);
    expect(validateEffectif(0, { min: 1, max: 100 }).ok).toBe(false);
  });
});

describe('validateBoucle', () => {
  it('accepts a normal boucle', () => {
    expect(validateBoucle('FR12345').ok).toBe(true);
  });

  it('rejects empty', () => {
    expect(errCode(validateBoucle(''))).toBe('boucle.empty');
  });

  it('rejects whitespace-only as empty', () => {
    expect(errCode(validateBoucle('   '))).toBe('boucle.empty');
  });

  it('rejects > 40 chars', () => {
    expect(errCode(validateBoucle('a'.repeat(41)))).toBe('boucle.too_long');
  });

  it('accepts exactly 40 chars', () => {
    expect(validateBoucle('a'.repeat(40)).ok).toBe(true);
  });
});
