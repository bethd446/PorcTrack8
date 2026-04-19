/**
 * Tests unitaires — `isChecklistDoneToday` + mapper NOTES_TERRAIN
 * ═══════════════════════════════════════════════════════════════
 *
 * Couvre :
 *  - Schéma canonique 5-cols (TRUIE · VERRAT · BANDE · CONTROLE · CHECKLIST · GENERAL)
 *  - Rows legacy 11-cols : ignorées gracieusement (best-effort map)
 *  - Dates ISO vs dd/MM/yyyy vs ISO long
 *  - Detection CHECKLIST_DONE (legacy + moderne)
 *
 * Dates figées à 2026-04-17 pour déterminisme.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isChecklistDoneToday } from './checklistService';
import { mapRowToNote } from '../mappers';

const TODAY_ISO = '2026-04-17';
const TODAY_FR = '17/04/2026';
const YESTERDAY_ISO = '2026-04-16';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY_ISO}T09:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Mapper — schéma canonique 5 cols ────────────────────────────────────────

describe('mapRowToNote — schéma canonique', () => {
  it('mappe correctement une row TRUIE (legacy historique 5-cols)', () => {
    const row = [TODAY_ISO, 'TRUIE', 'T42', 'Boiterie observée', 'Jean'];
    const note = mapRowToNote(row, 0);
    expect(note).not.toBeNull();
    expect(note?.animalType).toBe('TRUIE');
    expect(note?.animalId).toBe('T42');
    expect(note?.texte).toBe('Boiterie observée');
    expect(note?.auteur).toBe('Jean');
    expect(note?.date).toBe(TODAY_ISO);
  });

  it('mappe correctement une row CONTROLE (nouveau type)', () => {
    const row = [
      TODAY_ISO,
      'CONTROLE',
      'Q2',
      'Question: Mortalité ?\nRéponse: Non',
      'Porcher A130',
    ];
    const note = mapRowToNote(row, 5);
    expect(note?.animalType).toBe('CONTROLE');
    expect(note?.animalId).toBe('Q2');
    expect(note?.texte).toContain('Réponse: Non');
  });

  it('mappe correctement une row CHECKLIST (nouveau type)', () => {
    const row = [
      TODAY_ISO,
      'CHECKLIST',
      'DAILY',
      'CHECKLIST_DONE: Checklist DAILY terminée',
      'Marc',
    ];
    const note = mapRowToNote(row, 10);
    expect(note?.animalType).toBe('CHECKLIST');
    expect(note?.animalId).toBe('DAILY');
    expect(note?.texte).toContain('CHECKLIST_DONE');
  });

  it('mappe CHECKLIST_DONE legacy vers GENERAL avec warning', () => {
    const row = [TODAY_ISO, 'CHECKLIST_DONE', 'DAILY', 'OK', 'Jean'];
    const note = mapRowToNote(row, 0);
    expect(note?.animalType).toBe('GENERAL');
    expect(note?.animalId).toBe('DAILY');
  });

  it('ignore gracieusement une row vide → null', () => {
    expect(mapRowToNote([], 0)).toBeNull();
  });

  it('ignore les types inconnus en les remappant sur GENERAL', () => {
    const row = [TODAY_ISO, 'UNKNOWN_TYPE', 'X', 'note', 'Bob'];
    const note = mapRowToNote(row, 0);
    expect(note?.animalType).toBe('GENERAL');
  });

  it('reconstruit une row legacy 11-cols en best-effort', () => {
    const legacy = [
      'NOTE-20260417-090000-AB12',
      `${TODAY_ISO}T09:00:00.000Z`,
      TODAY_FR,
      '09:00:00',
      'Porcher A130',
      'CONTROLE_QUOTIDIEN',
      'Q1',
      'Oui',
      'détails annexes',
      'APP',
      'DEV-XYZ',
    ];
    const note = mapRowToNote(legacy, 0);
    expect(note).not.toBeNull();
    expect(note?.animalType).toBe('CONTROLE'); // CONTROLE_QUOTIDIEN → CONTROLE
    expect(note?.animalId).toBe('Q1');
    expect(note?.auteur).toBe('Porcher A130');
    expect(note?.texte).toContain('Oui');
    expect(note?.texte).toContain('détails annexes');
  });
});

// ─── isChecklistDoneToday — détection du marker ─────────────────────────────

describe('isChecklistDoneToday', () => {
  it('retourne true quand une row CHECKLIST today existe (nouveau schéma)', () => {
    const rows: unknown[][] = [
      [TODAY_ISO, 'CHECKLIST', 'DAILY', 'CHECKLIST_DONE: Checklist DAILY terminée', 'Marc'],
    ];
    expect(isChecklistDoneToday('DAILY', rows)).toBe(true);
  });

  it('retourne true pour une row legacy CHECKLIST_DONE today', () => {
    const rows: unknown[][] = [
      [TODAY_ISO, 'CHECKLIST_DONE', 'DAILY', 'OK', 'Jean'],
    ];
    expect(isChecklistDoneToday('DAILY', rows)).toBe(true);
  });

  it("retourne false quand la row CHECKLIST date d'hier", () => {
    const rows: unknown[][] = [
      [YESTERDAY_ISO, 'CHECKLIST', 'DAILY', 'CHECKLIST_DONE', 'Marc'],
    ];
    expect(isChecklistDoneToday('DAILY', rows)).toBe(false);
  });

  it('tolère le format de date dd/MM/yyyy', () => {
    const rows: unknown[][] = [
      [TODAY_FR, 'CHECKLIST', 'DAILY', 'CHECKLIST_DONE: Ok', 'Marc'],
    ];
    expect(isChecklistDoneToday('DAILY', rows)).toBe(true);
  });

  it('tolère le format ISO long (avec heure)', () => {
    const rows: unknown[][] = [
      [`${TODAY_ISO}T09:12:34.000Z`, 'CHECKLIST', 'DAILY', 'CHECKLIST_DONE', 'Marc'],
    ];
    expect(isChecklistDoneToday('DAILY', rows)).toBe(true);
  });

  it('insensible à la casse sur le nom de la checklist', () => {
    const rows: unknown[][] = [
      [TODAY_ISO, 'CHECKLIST', 'daily', 'CHECKLIST_DONE', 'Marc'],
    ];
    expect(isChecklistDoneToday('DAILY', rows)).toBe(true);
    expect(isChecklistDoneToday('daily', rows)).toBe(true);
  });

  it('retourne false pour une row CHECKLIST sans marker CHECKLIST_DONE', () => {
    // Row de réponse à une question intermédiaire : présence mais pas terminée
    const rows: unknown[][] = [
      [TODAY_ISO, 'CHECKLIST', 'DAILY', 'Question: Blah\nRéponse: Oui', 'Marc'],
    ];
    expect(isChecklistDoneToday('DAILY', rows)).toBe(false);
  });

  it('retourne false quand aucune row ne matche', () => {
    expect(isChecklistDoneToday('DAILY', [])).toBe(false);
    expect(isChecklistDoneToday('DAILY', [[TODAY_ISO, 'TRUIE', 'T01', 'note', 'Jean']])).toBe(false);
  });
});
