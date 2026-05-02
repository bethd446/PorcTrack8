// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PhaseSuggestionCard from './PhaseSuggestionCard';
import type { PendingTransition } from '../../services/phaseEngine';

afterEach(cleanup);

const baseTransition: PendingTransition = {
  bandeId: 'B07',
  label: 'P07',
  fromPhase: 'POST_SEVRAGE',
  toPhase: 'CROISSANCE',
  ageJours: 41,
  poidsEstimeKg: 26,
  joursEnRetard: 0,
  isBloquant: false,
  urgence: 'NORMALE',
  reason: 'POIDS_ATTEINT',
  poidsSeuilKg: 25,
  poidsReelKg: 26,
  bande: { id: 'B07', idPortee: 'P07', statut: 'Sevrés', vivants: 20, synced: true, poidsInitialKg: 7 },
};

const sortieTransition: PendingTransition = {
  ...baseTransition,
  fromPhase: 'FINITION',
  toPhase: 'SORTIE',
  poidsSeuilKg: 110,
  poidsReelKg: 112,
};

describe('PhaseSuggestionCard', () => {
  it('rend le titre "Passage en Croissance" et le bandeDisplayId', () => {
    render(
      <PhaseSuggestionCard
        transition={baseTransition}
        bandeDisplayId="B-2026-04-01"
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(/Passage en Croissance/i)).toBeDefined();
    expect(screen.getByText(/B-2026-04-01/)).toBeDefined();
  });

  it('toPhase=SORTIE → chip "Sortie" + bouton Confirmer', () => {
    render(
      <PhaseSuggestionCard
        transition={sortieTransition}
        bandeDisplayId="B-2026-01-15"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/^Sortie$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /confirmer/i })).toBeDefined();
    expect(screen.getByText(/Passage en Sortie abattoir/i)).toBeDefined();
  });

  it('clic Confirmer → onConfirm appelé', () => {
    const onConfirm = vi.fn();
    render(
      <PhaseSuggestionCard
        transition={baseTransition}
        bandeDisplayId="B-2026-04-01"
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('clic Plus tard → onDismiss appelé', () => {
    const onDismiss = vi.fn();
    render(
      <PhaseSuggestionCard
        transition={baseTransition}
        bandeDisplayId="B-2026-04-01"
        onConfirm={vi.fn()}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /plus tard/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('onDismiss undefined → bouton "Plus tard" non rendu', () => {
    render(
      <PhaseSuggestionCard
        transition={baseTransition}
        bandeDisplayId="B-2026-04-01"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /plus tard/i })).toBeNull();
    expect(screen.getByRole('button', { name: /confirmer/i })).toBeDefined();
  });
});
