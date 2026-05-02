/**
 * Tests unitaires — quickAddPorceletLogic (validation pure).
 * Couvre : regex boucle, unicité ferme, sexe, poids optionnel borné, notes.
 */
import { describe, it, expect } from 'vitest';
import { validateAddPorcelet } from './quickAddPorceletLogic';

describe('validateAddPorcelet — boucle', () => {
  const empty = new Set<string>();

  it('accepte une boucle alphanum 2-15 caractères', () => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'M', poidsCourantKg: '', notes: '' },
      empty,
    );
    expect(r.ok).toBe(true);
    expect(r.values?.boucle).toBe('P-001');
  });

  it('rejette boucle vide', () => {
    const r = validateAddPorcelet(
      { boucle: '', sexe: 'M', poidsCourantKg: '', notes: '' },
      empty,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.boucle).toMatch(/requise/i);
  });

  it('rejette boucle trop courte (1 char)', () => {
    const r = validateAddPorcelet(
      { boucle: 'X', sexe: 'M', poidsCourantKg: '', notes: '' },
      empty,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.boucle).toMatch(/format/i);
  });

  it('rejette boucle trop longue (>15 char)', () => {
    const r = validateAddPorcelet(
      { boucle: 'A'.repeat(16), sexe: 'M', poidsCourantKg: '', notes: '' },
      empty,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.boucle).toMatch(/format/i);
  });

  it('rejette caractères spéciaux (espaces, accents)', () => {
    const r = validateAddPorcelet(
      { boucle: 'P 001', sexe: 'M', poidsCourantKg: '', notes: '' },
      empty,
    );
    expect(r.ok).toBe(false);
  });

  it('rejette boucle déjà utilisée (case-insensitive)', () => {
    const used = new Set<string>(['P-001', 'P-002']);
    const r = validateAddPorcelet(
      { boucle: 'p-001', sexe: 'M', poidsCourantKg: '', notes: '' },
      used,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.boucle).toMatch(/déjà utilisée/i);
  });

  it('accepte une boucle si la set d\'unicité contient autre chose', () => {
    const used = new Set<string>(['P-002']);
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'F', poidsCourantKg: '', notes: '' },
      used,
    );
    expect(r.ok).toBe(true);
  });

  it('trim les espaces avant validation', () => {
    const r = validateAddPorcelet(
      { boucle: '  P-001  ', sexe: 'M', poidsCourantKg: '', notes: '' },
      new Set(),
    );
    expect(r.ok).toBe(true);
    expect(r.values?.boucle).toBe('P-001');
  });
});

describe('validateAddPorcelet — poids', () => {
  const empty = new Set<string>();

  it('accepte poids vide (optionnel)', () => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'M', poidsCourantKg: '', notes: '' },
      empty,
    );
    expect(r.ok).toBe(true);
    expect(r.values?.poidsCourantKg).toBeUndefined();
  });

  it('accepte poids dans la plage 0.5 — 200 kg', () => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'M', poidsCourantKg: '12.3', notes: '' },
      empty,
    );
    expect(r.ok).toBe(true);
    expect(r.values?.poidsCourantKg).toBe(12.3);
  });

  it('accepte poids avec virgule décimale (FR)', () => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'M', poidsCourantKg: '1,5', notes: '' },
      empty,
    );
    expect(r.ok).toBe(true);
    expect(r.values?.poidsCourantKg).toBe(1.5);
  });

  it('rejette poids < 0.5 kg', () => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'M', poidsCourantKg: '0.4', notes: '' },
      empty,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.poidsCourantKg).toMatch(/plage/i);
  });

  it('rejette poids > 200 kg', () => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'M', poidsCourantKg: '201', notes: '' },
      empty,
    );
    expect(r.ok).toBe(false);
  });

  it('rejette poids non numérique', () => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'M', poidsCourantKg: 'abc', notes: '' },
      empty,
    );
    expect(r.ok).toBe(false);
  });
});

describe('validateAddPorcelet — sexe & notes', () => {
  const empty = new Set<string>();

  it.each(['M', 'F', 'INCONNU'] as const)('accepte le sexe %s', sexe => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe, poidsCourantKg: '', notes: '' },
      empty,
    );
    expect(r.ok).toBe(true);
    expect(r.values?.sexe).toBe(sexe);
  });

  it('rejette notes > 300 char', () => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'M', poidsCourantKg: '', notes: 'a'.repeat(301) },
      empty,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.notes).toMatch(/trop longues/i);
  });

  it('notes vides retournent undefined dans values', () => {
    const r = validateAddPorcelet(
      { boucle: 'P-001', sexe: 'M', poidsCourantKg: '', notes: '   ' },
      empty,
    );
    expect(r.ok).toBe(true);
    expect(r.values?.notes).toBeUndefined();
  });
});
