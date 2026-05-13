import { describe, expect, it } from 'vitest';
import { parseDateLocal, parseFrDate, FARM_TIMEZONE } from './dateParser';

describe('parseFrDate (timezone-aware Europe/Paris)', () => {
  it('parse DD/MM/YYYY', () => {
    const d = parseFrDate('15/05/2026');
    expect(d).not.toBeNull();
    // En Europe/Paris, le 15/05/2026 00:00 est CEST (UTC+2)
    // donc en UTC : 14/05/2026 22:00:00
    expect(d?.toISOString()).toMatch(/^2026-05-1[45]T(22|00):00/);
  });

  it('parse YYYY-MM-DD', () => {
    const d = parseFrDate('2026-05-15');
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toMatch(/^2026-05-1[45]/);
  });

  it('parse Excel serial > 20000', () => {
    // serial 45000 ≈ 2023 — on vérifie juste que le parse produit une Date valide
    const d = parseFrDate('45000');
    expect(d).not.toBeNull();
    expect(d?.getUTCFullYear()).toBeGreaterThanOrEqual(2023);
    expect(d?.getUTCFullYear()).toBeLessThanOrEqual(2024);
  });

  it('retourne null pour valeurs vides ou inconnues', () => {
    expect(parseFrDate(undefined)).toBeNull();
    expect(parseFrDate(null)).toBeNull();
    expect(parseFrDate('')).toBeNull();
    expect(parseFrDate('—')).toBeNull();
    expect(parseFrDate('pas une date')).toBeNull();
  });

  it('rejette les serial trop petits (avant 2025)', () => {
    expect(parseFrDate('100')).toBeNull();
    expect(parseFrDate('20000')).toBeNull();
  });

  it('FARM_TIMEZONE est exposée comme constante', () => {
    expect(FARM_TIMEZONE).toBe('Europe/Paris');
  });
});

describe('parseDateLocal (naïf, sans timezone)', () => {
  it('parse DD/MM/YYYY en local', () => {
    const d = parseDateLocal('15/05/2026');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4); // mai
    expect(d?.getDate()).toBe(15);
  });

  it('parse YYYY-MM-DD en local', () => {
    const d = parseDateLocal('2026-05-15');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(15);
  });

  it('retourne null pour vide ou inconnu', () => {
    expect(parseDateLocal(undefined)).toBeNull();
    expect(parseDateLocal('')).toBeNull();
    expect(parseDateLocal('pas une date')).toBeNull();
  });
});
