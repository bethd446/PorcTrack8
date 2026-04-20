// @vitest-environment jsdom
/**
 * Tests unitaires — TroupeauLogesView
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie que la vue des loges :
 *   - Affiche le summary strip (totaux + chips par phase)
 *   - Rend le SVG IsoBarn (role="img") avec aria-label descriptif
 *   - Affiche les 4 cards post-sevrage avec la répartition FARM_CONFIG
 *     (23 / 22 / 28 / 29 porcelets)
 *
 * On mocke `useFarm` pour fournir quelques truies en maternité + une bande
 * afin que le rendu ne passe pas en empty state.
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import type { Truie, BandePorcelets } from '../../types/farm';

// ── Fixtures ────────────────────────────────────────────────────────────────
const truieT01: Truie = {
  id: 'T01',
  displayId: 'T01',
  boucle: 'FR-0001-42',
  nom: 'Rose',
  statut: 'En maternité',
  ration: 6,
  derniereNV: 12,
  synced: true,
};
const truieT02: Truie = {
  id: 'T02',
  displayId: 'T02',
  boucle: 'FR-0002-42',
  nom: 'Violette',
  statut: 'Maternité',
  ration: 6,
  derniereNV: 11,
  synced: true,
};

const bandeB01: BandePorcelets = {
  id: 'B01',
  idPortee: 'P01',
  truie: 'T01',
  boucleMere: 'FR-0001-42',
  dateMB: '10/04/2026',
  nv: 12,
  morts: 0,
  vivants: 12,
  statut: 'Sous mère',
  synced: true,
};

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [truieT01, truieT02],
    verrats: [],
    bandes: [bandeB01],
    alerts: [],
    criticalAlertCount: 0,
    loading: false,
    notes: [],
    alertesServeur: [],
    saillies: [],
    finances: [],
    alimentFormules: [],
    dataSource: null,
    refreshData: vi.fn(),
    getTruieById: vi.fn(),
    getVerratById: vi.fn(),
    getBandeById: vi.fn(),
    getAnimalById: vi.fn(),
    getHealthForAnimal: vi.fn(() => []),
    getHealthForSubject: vi.fn(() => []),
    getNotesForAnimal: vi.fn(() => []),
    getNotesForSubject: vi.fn(() => []),
    pullData: vi.fn(),
    processQueue: vi.fn(),
  }),
  FarmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import TroupeauLogesView from './TroupeauLogesView';

describe('TroupeauLogesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('affiche le summary strip (totaux 15 loges + chips par phase)', () => {
    render(<TroupeauLogesView />);
    const strip = screen.getByTestId('loges-summary-strip');
    // Total loges = 9 + 4 + 2 = 15
    expect(within(strip).getByText('15')).toBeTruthy();
    // Chips par phase (2 truies en maternité dans les fixtures)
    expect(within(strip).getByText(/2 truies en mat/i)).toBeTruthy();
    expect(within(strip).getByText(/bandes post-sev/i)).toBeTruthy();
    expect(within(strip).getByText(/bandes engr/i)).toBeTruthy();
  });

  it('rend le SVG IsoBarn (role="img") avec aria-label descriptif', () => {
    render(<TroupeauLogesView />);
    const svg = screen.getByRole('img', { name: /isométrique/i });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-label')).toMatch(/maternit[eé]/i);
    expect(svg.getAttribute('aria-label')).toMatch(/post-sevrage/i);
  });

  it('affiche les 4 loges post-sevrage avec la répartition 23/22/28/29', () => {
    render(<TroupeauLogesView />);
    // Chaque loge est identifiée par data-testid="ps-loge-{n}"
    const loge1 = screen.getByTestId('ps-loge-1');
    const loge2 = screen.getByTestId('ps-loge-2');
    const loge3 = screen.getByTestId('ps-loge-3');
    const loge4 = screen.getByTestId('ps-loge-4');

    expect(within(loge1).getByText('23')).toBeTruthy();
    expect(within(loge2).getByText('22')).toBeTruthy();
    expect(within(loge3).getByText('28')).toBeTruthy();
    expect(within(loge4).getByText('29')).toBeTruthy();
  });
});
