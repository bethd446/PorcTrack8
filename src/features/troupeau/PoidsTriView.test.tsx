// @vitest-environment jsdom
/**
 * Tests unitaires — PoidsTriView (panneau tri par poids sur BandeDetailView)
 * ════════════════════════════════════════════════════════════════════════════
 * 3 tests :
 *   1. Render avec une dernière distribution → affiche les 4 tranches
 *   2. Clic sur "Vendre ≥110" → callback appelé avec le bon nombre
 *   3. Empty state quand aucune distribution
 */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import PoidsTriView from './PoidsTriView';
import type { BandePorcelets } from '../../types/farm';
import type { WeightDistributionRow } from '../../services/supabaseWrites';

vi.mock('../../services/supabaseWrites', () => ({
  listWeightDistributions: vi.fn(async () => []),
}));

function makeBande(over: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'uuid-batch-1',
    idPortee: 'B-26-T9-01',
    statut: 'Engraissement',
    nv: 30,
    vivants: 30,
    morts: 0,
    poidsInitialKg: 0,
    synced: true,
    ...over,
  };
}

function makeDist(over: Partial<WeightDistributionRow> = {}): WeightDistributionRow {
  return {
    id: 'd-1',
    farm_id: 'f-1',
    batch_id: 'uuid-batch-1',
    date_pesee: '2026-04-19',
    nb_under_90kg: 6,
    nb_90_to_100kg: 12,
    nb_100_to_110kg: 8,
    nb_above_110kg: 4,
    notes: null,
    created_at: '2026-04-19T10:00:00Z',
    created_by: 'u-1',
    ...over,
  };
}

describe('PoidsTriView', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('test 1 : rend les 4 tranches de la dernière distribution', () => {
    const dist = makeDist();
    render(
      <PoidsTriView
        bande={makeBande()}
        onSaisirTri={vi.fn()}
        onVendrePrets={vi.fn()}
        initialDist={dist}
      />,
    );

    // Vérifie présence labels + counts
    expect(screen.getByText(/≥ 110 kg/i)).toBeTruthy();
    expect(screen.getByText(/Prêts vente/i)).toBeTruthy();
    expect(screen.getByText(/100 - 110 kg/i)).toBeTruthy();
    expect(screen.getByText(/Bientôt/i)).toBeTruthy();
    expect(screen.getByText(/90 - 100 kg/i)).toBeTruthy();
    expect(screen.getByText(/Retardés/i)).toBeTruthy();

    // Total = 30
    expect(screen.getByText(/Total pesé/i)).toBeTruthy();

    // Bande affichée
    expect(screen.getByText(/B-26-T9-01/)).toBeTruthy();
  });

  it('test 2 : clic sur "Vendre ≥110" appelle onVendrePrets avec le nombre prêts', () => {
    const onVendrePrets = vi.fn();
    const dist = makeDist({ nb_above_110kg: 4 });
    render(
      <PoidsTriView
        bande={makeBande()}
        onSaisirTri={vi.fn()}
        onVendrePrets={onVendrePrets}
        initialDist={dist}
      />,
    );

    const btn = screen.getByRole('button', {
      name: /Vendre les porcs prêts à la vente/i,
    });
    fireEvent.click(btn);
    expect(onVendrePrets).toHaveBeenCalledTimes(1);
    expect(onVendrePrets).toHaveBeenCalledWith(4);

    // Bouton "Saisir tri" appelle onSaisirTri
    const onSaisirTri = vi.fn();
    cleanup();
    render(
      <PoidsTriView
        bande={makeBande()}
        onSaisirTri={onSaisirTri}
        onVendrePrets={vi.fn()}
        initialDist={dist}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Saisir un nouveau tri par poids/i }),
    );
    expect(onSaisirTri).toHaveBeenCalledTimes(1);
  });

  it('test 3 : empty state quand aucune distribution + bouton vendre désactivé', () => {
    render(
      <PoidsTriView
        bande={makeBande()}
        onSaisirTri={vi.fn()}
        onVendrePrets={vi.fn()}
        initialDist={null}
      />,
    );

    expect(screen.getByText(/Aucun tri enregistré/i)).toBeTruthy();
    expect(
      screen.getByText(/Saisis ton premier tri pour visualiser la distribution/i),
    ).toBeTruthy();

    const vendreBtn = screen.getByRole('button', {
      name: /Vendre les porcs prêts à la vente/i,
    }) as HTMLButtonElement;
    expect(vendreBtn.disabled).toBe(true);
  });
});
