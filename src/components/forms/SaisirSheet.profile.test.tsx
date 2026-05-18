// @vitest-environment jsdom
/**
 * V80 P0 #1 — SaisirSheet filter actions par profil ferme.
 *
 * Vérifie que :
 *  - naisseur     : voit Saillie, Écho, Mise-bas, Sevrage, Adoption, Pesée — pas Tri poids
 *  - engraisseur  : voit Pesée, Tri poids, Mortalité — pas Saillie/Écho/Mise-bas/Sevrage
 *  - cycle_complet: voit toutes les actions (superset)
 *
 * On mocke `useFarmProfile` directement (pas le context) pour piloter le
 * profil dans chaque test. Le mock du QuickActionsProvider reste minimal
 * (openAction = noop) — on ne teste que le filtrage visuel ici.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import SaisirSheet from './SaisirSheet';

vi.mock('../../hooks/useFarmProfile');
import { useFarmProfile } from '../../hooks/useFarmProfile';

vi.mock('../legacy/QuickActionsProvider', () => ({
  useQuickActions: () => ({ openAction: vi.fn() }),
}));

describe('SaisirSheet — filtrage par profil ferme (V80 P0 #1)', () => {
  afterEach(() => cleanup());

  function renderSheet(): void {
    render(<SaisirSheet isOpen={true} onClose={() => {}} />);
  }

  it('naisseur : voit Saillie / Écho / Mise-bas / Sevrage / Adoption mais PAS Tri poids', () => {
    vi.mocked(useFarmProfile).mockReturnValue('naisseur');
    renderSheet();
    expect(screen.getByText('Saillie')).toBeTruthy();
    expect(screen.getByText('Écho')).toBeTruthy();
    expect(screen.getByText('Mise-bas')).toBeTruthy();
    expect(screen.getByText('Sevrage')).toBeTruthy();
    expect(screen.getByText('Adoption')).toBeTruthy();
    expect(screen.getByText('Pesée')).toBeTruthy();
    expect(screen.queryByText('Tri poids')).toBeNull();
  });

  it('engraisseur : voit Pesée / Tri poids / Conso / Mortalité mais PAS Saillie/Écho/MB/Sevrage/Adoption', () => {
    vi.mocked(useFarmProfile).mockReturnValue('engraisseur');
    renderSheet();
    expect(screen.getByText('Pesée')).toBeTruthy();
    expect(screen.getByText('Tri poids')).toBeTruthy();
    expect(screen.getByText('Conso')).toBeTruthy();
    expect(screen.getByText('Mortalité')).toBeTruthy();
    expect(screen.queryByText('Saillie')).toBeNull();
    expect(screen.queryByText('Écho')).toBeNull();
    expect(screen.queryByText('Mise-bas')).toBeNull();
    expect(screen.queryByText('Sevrage')).toBeNull();
    expect(screen.queryByText('Adoption')).toBeNull();
  });

  it('cycle_complet : superset — toutes les actions visibles', () => {
    vi.mocked(useFarmProfile).mockReturnValue('cycle_complet');
    renderSheet();
    // Repro
    expect(screen.getByText('Saillie')).toBeTruthy();
    expect(screen.getByText('Écho')).toBeTruthy();
    expect(screen.getByText('Mise-bas')).toBeTruthy();
    expect(screen.getByText('Sevrage')).toBeTruthy();
    expect(screen.getByText('Adoption')).toBeTruthy();
    // Engraissement
    expect(screen.getByText('Tri poids')).toBeTruthy();
    // Transverses
    expect(screen.getByText('Pesée')).toBeTruthy();
    expect(screen.getByText('Conso')).toBeTruthy();
    expect(screen.getByText('Mortalité')).toBeTruthy();
    expect(screen.getByText('Soin')).toBeTruthy();
    expect(screen.getByText('Note')).toBeTruthy();
  });

  it('data-pt-profil reflète le profil courant (utile audit)', () => {
    vi.mocked(useFarmProfile).mockReturnValue('engraisseur');
    renderSheet();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-pt-profil')).toBe('engraisseur');
    expect(dialog.getAttribute('data-pt-repro')).toBe('off');
    expect(dialog.getAttribute('data-pt-eng')).toBe('on');
  });
});
