// @vitest-environment jsdom
/**
 * Tests unitaires — OutilsView V33
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Header (eyebrow + h1 + sous-titre)
 *   2. Présence des 6 ActionRow attendus
 *   3. Badge alerts affiché si pendingAlertsCount > 0
 *   4. Pas de badge si 0 alerte
 *   5. Navigation déclenchée au tap
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock router navigate
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// Stub Ionic + Layout pour éviter side-effects
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/AgritechLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock context Pilotage : on contrôle le compteur d'alertes
const usePilotageMock = vi.fn();
vi.mock('../../context/PilotageContext', () => ({
  usePilotage: () => usePilotageMock(),
}));

import OutilsView from './OutilsView';

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
  usePilotageMock.mockReset();
});

const renderView = () =>
  render(
    <MemoryRouter>
      <OutilsView />
    </MemoryRouter>,
  );

describe('OutilsView V33', () => {
  it('renders header (eyebrow + h1 + subtitle)', () => {
    usePilotageMock.mockReturnValue({ alerts: [], alertesServeur: [] });
    renderView();
    expect(screen.getByText('Outils terrain')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Outils' })).toBeDefined();
    expect(screen.getByText('Tout pour ton quotidien terrain')).toBeDefined();
  });

  it('renders all 6 ActionRow entries (alertes/audit/santé/protocoles/stocks/fournisseurs)', () => {
    usePilotageMock.mockReturnValue({ alerts: [], alertesServeur: [] });
    renderView();
    expect(screen.getByText('Toutes les alertes')).toBeDefined();
    expect(screen.getByText('Audit du jour')).toBeDefined();
    expect(screen.getByText('Journal santé')).toBeDefined();
    expect(screen.getByText('Protocoles')).toBeDefined();
    expect(screen.getByText('Stocks')).toBeDefined();
    expect(screen.getByText('Fournisseurs')).toBeDefined();
  });

  it('shows alert badge when pendingAlertsCount > 0', () => {
    usePilotageMock.mockReturnValue({
      alerts: [{ priority: 'CRITIQUE' }, { priority: 'HAUTE' }],
      alertesServeur: [{ priorite: 'CRITIQUE' }],
    });
    renderView();
    // 2 (local) + 1 (serveur) = 3
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('3 en attente')).toBeDefined();
  });

  it('shows "Aucune alerte en attente" when count is 0', () => {
    usePilotageMock.mockReturnValue({ alerts: [], alertesServeur: [] });
    renderView();
    expect(screen.getByText('Aucune alerte en attente')).toBeDefined();
  });

  it('navigates to /alerts when clicking "Toutes les alertes"', () => {
    usePilotageMock.mockReturnValue({ alerts: [], alertesServeur: [] });
    renderView();
    fireEvent.click(screen.getByLabelText('Toutes les alertes'));
    expect(navigateMock).toHaveBeenCalledWith('/alerts');
  });

  it('navigates to /audit when clicking "Audit du jour"', () => {
    usePilotageMock.mockReturnValue({ alerts: [], alertesServeur: [] });
    renderView();
    fireEvent.click(screen.getByLabelText('Audit du jour'));
    expect(navigateMock).toHaveBeenCalledWith('/audit');
  });

  it('navigates to /sante when clicking "Journal santé"', () => {
    usePilotageMock.mockReturnValue({ alerts: [], alertesServeur: [] });
    renderView();
    fireEvent.click(screen.getByLabelText('Journal santé'));
    expect(navigateMock).toHaveBeenCalledWith('/sante');
  });

  it('navigates to /ressources when clicking "Stocks"', () => {
    usePilotageMock.mockReturnValue({ alerts: [], alertesServeur: [] });
    renderView();
    fireEvent.click(screen.getByLabelText('Stocks'));
    expect(navigateMock).toHaveBeenCalledWith('/ressources');
  });

  it('ignores NORMALE/INFO priorities in count', () => {
    usePilotageMock.mockReturnValue({
      alerts: [{ priority: 'NORMALE' }, { priority: 'INFO' }],
      alertesServeur: [{ priorite: 'NORMALE' }],
    });
    renderView();
    expect(screen.getByText('Aucune alerte en attente')).toBeDefined();
  });
});
