import { describe, expect, it } from 'vitest';
import { formatAnimalIdentity, formatAnimalSubId } from './formatAnimalIdentity';

describe('formatAnimalIdentity', () => {
  describe('variant primary (default)', () => {
    it('boucle + displayId → boucle prioritaire', () => {
      expect(formatAnimalIdentity({ id: 'uuid-1', displayId: 'T-022', boucle: '1234' })).toBe('1234');
    });

    it('boucle seule → boucle', () => {
      expect(formatAnimalIdentity({ id: 'uuid-2', boucle: '5678' })).toBe('5678');
    });

    it('displayId seul (boucle null) → displayId', () => {
      expect(formatAnimalIdentity({ id: 'uuid-3', displayId: 'T-001', boucle: null })).toBe('T-001');
    });

    it('displayId seul (boucle undefined) → displayId', () => {
      expect(formatAnimalIdentity({ id: 'uuid-4', displayId: 'V-001' })).toBe('V-001');
    });

    it('id UUID seul → 8 premiers caractères', () => {
      expect(formatAnimalIdentity({ id: '4f7cc435-7907-420c-830e-89086d5cbf9a' })).toBe('4f7cc435');
    });

    it('null → tiret', () => {
      expect(formatAnimalIdentity(null)).toBe('—');
    });

    it('undefined → tiret', () => {
      expect(formatAnimalIdentity(undefined)).toBe('—');
    });

    it('trim espaces boucle', () => {
      expect(formatAnimalIdentity({ id: 'x', boucle: '  B-42  ' })).toBe('B-42');
    });
  });

  describe('variant with-tech', () => {
    it('boucle + displayId → "boucle · displayId"', () => {
      expect(formatAnimalIdentity({ id: 'x', displayId: 'T-022', boucle: '1234' }, 'with-tech')).toBe('1234 · T-022');
    });

    it('boucle seule + with-tech → boucle (fallback primary)', () => {
      expect(formatAnimalIdentity({ id: 'x', boucle: '5678' }, 'with-tech')).toBe('5678');
    });
  });
});

describe('formatAnimalSubId', () => {
  it('boucle + displayId → displayId en sub', () => {
    expect(formatAnimalSubId({ id: 'x', displayId: 'T-022', boucle: '1234' })).toBe('T-022');
  });

  it('boucle seule → null (pas de sub, le primary affiche déjà)', () => {
    expect(formatAnimalSubId({ id: 'x', boucle: '5678' })).toBeNull();
  });

  it('displayId seul → null', () => {
    expect(formatAnimalSubId({ id: 'x', displayId: 'T-001' })).toBeNull();
  });

  it('null → null', () => {
    expect(formatAnimalSubId(null)).toBeNull();
  });
});
