// @vitest-environment jsdom
/**
 * Vérifie que le `RessourcesProvider` expose le slice ressources
 * (sante, stocks, notes, formules aliment) et que les filtres par
 * animal (santé + notes) retournent les bons éléments.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../services/farmDataLoader', async () => {
  const actual = await vi.importActual<typeof import('../services/farmDataLoader')>(
    '../services/farmDataLoader'
  );
  return { ...actual, refreshAll: vi.fn(async () => {}) };
});

import { RessourcesProvider, useRessources } from './RessourcesContext';
import { __resetForTests, getSnapshot } from '../services/farmDataLoader';
import type { TraitementSante, StockAliment } from '../types/farm';
import type { Note } from '../types';

function Probe() {
  const { sante, stockAliment, notes, getHealthForAnimal, getNotesForAnimal } = useRessources();
  const soins = getHealthForAnimal('T01', 'TRUIE');
  const ntes = getNotesForAnimal('T01', 'TRUIE');
  return (
    <div>
      <span data-testid="count-sante">{sante.length}</span>
      <span data-testid="count-aliment">{stockAliment.length}</span>
      <span data-testid="count-notes">{notes.length}</span>
      <span data-testid="soins-t01">{soins.length}</span>
      <span data-testid="notes-t01">{ntes.length}</span>
    </div>
  );
}

describe('RessourcesProvider', () => {
  beforeEach(() => {
    __resetForTests();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fournit le slice ressources et filtre santé/notes par animal', () => {
    const sante: TraitementSante[] = [
      { id: 'S1', date: '2026-01-01', cibleType: 'TRUIE', cibleId: 'T01',
        typeSoin: 'Vaccin', traitement: '-', observation: '', synced: true },
      { id: 'S2', date: '2026-01-02', cibleType: 'VERRAT', cibleId: 'V01',
        typeSoin: 'Soin', traitement: '-', observation: '', synced: true },
    ];
    const aliment: StockAliment[] = [
      { id: 'A1', libelle: 'Démarrage', stockActuel: 500, unite: 'kg',
        seuilAlerte: 100, statutStock: 'OK' },
    ];
    const notes: Note[] = [
      { id: 'N1', animalId: 'T01', animalType: 'TRUIE',
        texte: 'ok', date: '2026-01-05', synced: true } as unknown as Note,
    ];

    const snap = getSnapshot('ressources');
    snap.sante = sante;
    snap.stockAliment = aliment;
    snap.notes = notes;

    render(
      <RessourcesProvider>
        <Probe />
      </RessourcesProvider>
    );

    expect(screen.getByTestId('count-sante').textContent).toBe('2');
    expect(screen.getByTestId('count-aliment').textContent).toBe('1');
    expect(screen.getByTestId('count-notes').textContent).toBe('1');
    // Santé T01 = 1 (l'autre est un VERRAT)
    expect(screen.getByTestId('soins-t01').textContent).toBe('1');
    // Notes T01 = 1
    expect(screen.getByTestId('notes-t01').textContent).toBe('1');
  });
});
