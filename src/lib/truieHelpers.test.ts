/**
 * Tests — helpers truies archivées.
 */

import { describe, expect, it } from 'vitest';
import { isArchivedTruie, normalizeTruieId, ARCHIVED_TRUIE_IDS } from './truieHelpers';

describe('isArchivedTruie', () => {
  it('T08 est archivée (truie réformée)', () => {
    expect(isArchivedTruie('T08')).toBe(true);
  });

  it('T01 est active (non archivée)', () => {
    expect(isArchivedTruie('T01')).toBe(false);
  });

  it('chaîne vide → false', () => {
    expect(isArchivedTruie('')).toBe(false);
  });

  it('T17 est archivée (truie réformée)', () => {
    expect(isArchivedTruie('T17')).toBe(true);
  });

  it('accepte les variantes non normalisées (T8 → T08)', () => {
    expect(isArchivedTruie('T8')).toBe(true);
    expect(isArchivedTruie('t08')).toBe(true);
  });

  it('ID inconnu → false (on ne filtre que les archivées listées)', () => {
    expect(isArchivedTruie('T99')).toBe(false);
  });

  it('T17 archivée + case-insensitive + match strict (pas de suffixe)', () => {
    // Couvre les 3 cas en un test : canonique, variante casse, faux positif.
    expect(isArchivedTruie('T17')).toBe(true);
    expect(isArchivedTruie('t17')).toBe(true);
    // Strict match : "T17-01" (ex. portée) ne doit PAS matcher T17.
    expect(isArchivedTruie('T17-01')).toBe(false);
  });
});

describe('normalizeTruieId', () => {
  it('pad zéro : T7 → T07', () => {
    expect(normalizeTruieId('T7')).toBe('T07');
  });

  it('vide → vide', () => {
    expect(normalizeTruieId('')).toBe('');
  });

  it('déjà normalisé : T08 → T08', () => {
    expect(normalizeTruieId('T08')).toBe('T08');
  });
});

describe('ARCHIVED_TRUIE_IDS', () => {
  it('contient T08 et T17 par défaut', () => {
    expect(ARCHIVED_TRUIE_IDS).toContain('T08');
    expect(ARCHIVED_TRUIE_IDS).toContain('T17');
  });
});
