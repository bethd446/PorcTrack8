// @vitest-environment jsdom
/**
 * Tests d'intégration — PilotageHub (V8 refonte)
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie le nouveau layout :
 *   1. Hero compact rendu (Pilotage + sous-titre N bandes / M truies)
 *   2. Les 4 tuiles "Modules de gestion" en navigation primaire :
 *      - Performance technique → /pilotage/perf
 *      - Finances              → /pilotage/finances
 *      - Prévisions            → /pilotage/previsions
 *      - Classement reproducteurs → /troupeau/classement (NOUVEAU)
 *   3. Click tuile Classement → navigate('/troupeau/classement')
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Truie, Verrat, BandePorcelets } from '../../types/farm';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const mockTruies: Truie[] = [
  { id: 'T01', displayId: 'T01', boucle: 'FR-1', statut: 'Pleine', ration: 3, synced: true },
  { id: 'T02', displayId: 'T02', boucle: 'FR-2', statut: 'Pleine', ration: 3, synced: true },
  { id: 'T03', displayId: 'T03', boucle: 'FR-3', statut: 'Vide', ration: 2, synced: true },
];

const mockVerrats: Verrat[] = [
  { id: 'V01', displayId: 'V01', boucle: 'FR-V1', statut: 'Actif', ration: 3, synced: true },
];

const mockBandes: BandePorcelets[] = [
  {
    id: 'B01',
    idPortee: 'P01',
    statut: 'Sous mère',
    vivants: 12,
    truie: 'T01',
    boucleMere: 'FR-1',
    dateMB: '10/04/2026',
    poidsInitialKg: 0,
    nv: 14,
    synced: true,
  },
  {
    id: 'B02',
    idPortee: 'P02',
    statut: 'Sevrés',
    vivants: 22,
    dateSevrageReelle: '01/01/2026',
    poidsInitialKg: 0,
    synced: true,
  },
];

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: mockTruies,
    verrats: mockVerrats,
    bandes: mockBandes,
    transitions: [],
    saillies: [],
    alerts: [],
    finances: [],
    alimentFormules: [],
    notes: [],
    alertesServeur: [],
    criticalAlertCount: 0,
    loading: false,
    nomFerme: 'Ferme Test',
    currency: 'EUR',
    pays: null,
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
}));

// Passthrough Ionic
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresher: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresherContent: () => <div />,
}));

// AgritechLayout passthrough
vi.mock('../../components/AgritechLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// TopBarSync passthrough
vi.mock('../../components/design/TopBarSync', () => ({
  default: () => <div data-testid="topbar-sync" />,
}));

// AuditPrintTemplate passthrough
vi.mock('../pilotage/AuditPrintTemplate', () => ({
  default: () => null,
}));

// useAutoRefresh
vi.mock('../../hooks/useAutoRefresh', () => ({
  useAutoRefresh: () => ({ handleRefresh: vi.fn() }),
}));

// pilotageDelta : on ne veut pas que les snapshots interfèrent
vi.mock('../../utils/pilotageDelta', () => ({
  loadPreviousSnapshot: () => null,
  captureCurrentSnapshot: vi.fn(),
  computeDelta: () => null,
  formatDeltaPct: () => '',
  deltaSinceLabel: () => '',
  semanticTrendDir: () => 'flat',
}));

// useNavigate mock pour vérifier les redirections tuiles
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import PilotageHub from './PilotageHub';

function renderHub() {
  return render(
    <MemoryRouter initialEntries={['/pilotage']}>
      <PilotageHub />
    </MemoryRouter>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PilotageHub V8 — refonte navigation primaire', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    cleanup();
  });

  it('V42-bugfix B7 : PageHeader sobre (eyebrow PILOTAGE + titre + subtitle non-numérique)', () => {
    renderHub();
    // H1 "Pilotage" via <PageHeader>
    const h1 = screen.getByRole('heading', { level: 1, name: /pilotage/i });
    expect(h1).toBeTruthy();
    // V42-B7 : sous-titre métriques chiffrées remplacé par "Vue globale de ta ferme"
    // (LA 11e RÈGLE D'OR V41 — pas de métriques chiffrées dans subtitle).
    const subtitle = document.querySelector('.pt-page-header__subtitle');
    expect(subtitle?.textContent).toBe('Vue globale de ta ferme');
    expect(screen.queryByText(/2 bandes actives · 3 truies/i)).toBeNull();
  });

  it('affiche les 4 tuiles Modules de gestion en navigation primaire', () => {
    renderHub();
    // Toutes les tuiles sont des boutons avec aria-label = title
    expect(screen.getByRole('button', { name: /performance technique/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /finances/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /prévisions/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /classement reproducteurs/i })).toBeTruthy();
  });

  it('click tuile Performance technique → navigate /pilotage/perf', () => {
    renderHub();
    fireEvent.click(screen.getByRole('button', { name: /performance technique/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/pilotage/perf');
  });

  it('click tuile Finances → navigate /pilotage/finances', () => {
    renderHub();
    fireEvent.click(screen.getByRole('button', { name: /^finances$/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/pilotage/finances');
  });

  it('click tuile Prévisions → navigate /pilotage/previsions', () => {
    renderHub();
    fireEvent.click(screen.getByRole('button', { name: /prévisions/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/pilotage/previsions');
  });

  it('click tuile Classement reproducteurs → navigate /troupeau/classement', () => {
    renderHub();
    fireEvent.click(screen.getByRole('button', { name: /classement reproducteurs/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/troupeau/classement');
  });

  it('affiche les mini-stats des tuiles (ISSE/IEM/Taux MB, Marge, MB 30j, Top)', () => {
    renderHub();
    expect(screen.getByText(/ISSE\/IEM\/Taux MB/i)).toBeTruthy();
    expect(screen.getByText(/^Marge:/i)).toBeTruthy();
    expect(screen.getByText(/MB 30j:/i)).toBeTruthy();
    expect(screen.getByText(/^Top:/i)).toBeTruthy();
  });
});
