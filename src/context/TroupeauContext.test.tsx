// @vitest-environment jsdom
/**
 * Vérifie que le `TroupeauProvider` expose bien les données du slice
 * troupeau et que les accesseurs (`getTruieById`, etc.) fonctionnent.
 *
 * Le singleton `farmDataLoader` est réinitialisé puis muté manuellement
 * via `refreshAll()` mocké — on court-circuite les appels Sheets pour
 * tester le pur chemin Provider → Context.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../services/farmDataLoader', async () => {
  const actual = await vi.importActual<typeof import('../services/farmDataLoader')>(
    '../services/farmDataLoader'
  );
  // On garde `subscribe` / `getSnapshot` / `__resetForTests` réels et on
  // neutralise `refreshAll` (pas d'appels Sheets pendant le test).
  return { ...actual, refreshAll: vi.fn(async () => {}) };
});

import { TroupeauProvider, useTroupeau } from './TroupeauContext';
import { __resetForTests, getSnapshot } from '../services/farmDataLoader';
import type { Truie, Verrat, BandePorcelets } from '../types/farm';

function Probe() {
  const { truies, verrats, bandes, getTruieById, getAnimalById } = useTroupeau();
  const animal = getAnimalById('T01', 'TRUIE');
  return (
    <div>
      <span data-testid="count-truies">{truies.length}</span>
      <span data-testid="count-verrats">{verrats.length}</span>
      <span data-testid="count-bandes">{bandes.length}</span>
      <span data-testid="truie-by-id">{getTruieById('T01')?.boucle ?? 'none'}</span>
      <span data-testid="animal">{animal?.type ?? 'none'}</span>
    </div>
  );
}

describe('TroupeauProvider', () => {
  beforeEach(() => {
    __resetForTests();
    // Mute warnings Ionic / React en cas de composants Ionic tiers
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fournit le slice troupeau et les accesseurs par ID', () => {
    const truie: Truie = {
      id: 'T01', displayId: 'T01', boucle: 'FR-123', statut: 'Pleine',
      ration: 3, synced: true,
    };
    const verrat: Verrat = {
      id: 'V01', displayId: 'V01', boucle: 'FR-999', statut: 'Actif',
      ration: 3, synced: true,
    };
    const bande: BandePorcelets = {
      id: 'B01', idPortee: 'B01', statut: 'Sous mère', synced: true,
    };

    // Mute le snapshot directement (le singleton est déjà reset)
    const snap = getSnapshot('troupeau');
    snap.truies = [truie];
    snap.verrats = [verrat];
    snap.bandes = [bande];

    render(
      <TroupeauProvider>
        <Probe />
      </TroupeauProvider>
    );

    expect(screen.getByTestId('count-truies').textContent).toBe('1');
    expect(screen.getByTestId('count-verrats').textContent).toBe('1');
    expect(screen.getByTestId('count-bandes').textContent).toBe('1');
    expect(screen.getByTestId('truie-by-id').textContent).toBe('FR-123');
    expect(screen.getByTestId('animal').textContent).toBe('TRUIE');
  });
});
