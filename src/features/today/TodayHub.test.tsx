// @vitest-environment jsdom
/**
 * Tests unitaires — TodayHub
 * ════════════════════════════════════════════════════════════════════════
 * Vérifie le rendu de la section "Transitions de phase" (R15/R16) :
 * une alerte OPEN_PHASE_MODAL doit produire une PhaseSuggestionCard, et
 * cliquer "Confirmer" ouvre le PhaseTransitionModal pré-rempli.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type {
  Truie, Verrat, BandePorcelets, StockAliment, StockVeto,
  AlerteServeur, DataSource,
} from '../../types/farm';
import type { FarmAlert } from '../../services/alertEngine';
import type { PendingTransition } from '../../services/phaseEngine';

interface MockFarmValue {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  stockAliment: StockAliment[];
  stockVeto: StockVeto[];
  alerts: FarmAlert[];
  alertesServeur: AlerteServeur[];
  saillies: unknown[];
  notes: unknown[];
  loading: boolean;
  dataSource: DataSource | null;
  recomputeAlerts: () => Promise<void> | void;
}

let mockFarmValue: MockFarmValue;
let mockPending: PendingTransition[];

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => mockFarmValue,
  useMeta: () => mockFarmValue,
  FarmProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../context/TroupeauContext', () => ({
  useTroupeau: () => mockFarmValue,
}));
vi.mock('../../context/PilotageContext', () => ({
  usePilotage: () => mockFarmValue,
}));
vi.mock('../../context/RessourcesContext', () => ({
  useRessources: () => mockFarmValue,
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ userName: 'Porcher', user: { id: 'user-1' } }),
}));

const confirmTransitionMock = vi.fn().mockResolvedValue(undefined);
const dismissTransitionMock = vi.fn();
vi.mock('../../hooks/usePhaseTransitions', () => ({
  usePhaseTransitions: () => ({
    pending: mockPending,
    confirm: confirmTransitionMock,
    dismiss: dismissTransitionMock,
  }),
}));

vi.mock('../../services/confirmationQueue', () => ({
  getPendingConfirmations: () => Promise.resolve([]),
}));
vi.mock('../../services/alertDismissals', () => ({
  dismissAlert: vi.fn().mockResolvedValue(undefined),
}));

// On stubbe les forms et le modal pour éviter d'importer Ionic complet.
vi.mock('../../components/forms/QuickConfirmSevrageForm', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../../components/forms/QuickConfirmReformeForm', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../../components/modals/PhaseTransitionModal', () => ({
  __esModule: true,
  default: ({ isOpen, transition }: { isOpen: boolean; transition: PendingTransition | null }) =>
    isOpen && transition
      ? <div data-testid="phase-modal">Modal {transition.bandeId} → {transition.toPhase}</div>
      : null,
}));

import TodayHub from './TodayHub';

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-001',
    idPortee: 'P-001',
    statut: 'Croissance',
    poidsInitialKg: 8,
    synced: true,
    ...overrides,
  };
}

function makeTransition(overrides: Partial<PendingTransition> = {}): PendingTransition {
  const bande = overrides.bande ?? makeBande();
  return {
    bandeId: bande.id,
    label: bande.idPortee || bande.id,
    fromPhase: 'CROISSANCE',
    toPhase: 'ENGRAISSEMENT',
    ageJours: 90,
    poidsEstimeKg: 52,
    bande,
    joursEnRetard: 0,
    isBloquant: false,
    urgence: 'NORMALE',
    reason: 'POIDS_ATTEINT',
    poidsSeuilKg: 50,
    poidsReelKg: 52,
    ...overrides,
  };
}

function makePhasePoidsAlert(overrides: Partial<FarmAlert> = {}): FarmAlert {
  return {
    id: 'phase-poids-B-001-ENGRAISSEMENT',
    priority: 'NORMALE',
    category: 'BANDES',
    subjectId: 'B-001',
    subjectLabel: 'P-001',
    title: 'Passage en Engraissement',
    message: 'Bande B-001 : poids 52 kg ≥ seuil 50 kg.',
    requiresAction: true,
    actions: [],
    createdAt: new Date(),
    meta: {
      bandeId: 'B-001',
      fromPhase: 'CROISSANCE',
      toPhase: 'ENGRAISSEMENT',
      poidsSeuilKg: 50,
      poidsReelKg: 52,
      reason: 'POIDS_ATTEINT',
      actionType: 'OPEN_PHASE_MODAL',
    },
    ...overrides,
  };
}

function defaultFarmValue(): MockFarmValue {
  return {
    truies: [],
    verrats: [],
    bandes: [],
    stockAliment: [],
    stockVeto: [],
    alerts: [],
    alertesServeur: [],
    saillies: [],
    notes: [],
    loading: false,
    dataSource: 'NETWORK',
    recomputeAlerts: vi.fn().mockResolvedValue(undefined),
  };
}

function renderHub(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <TodayHub />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockFarmValue = defaultFarmValue();
  mockPending = [];
  confirmTransitionMock.mockClear();
  dismissTransitionMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('TodayHub — Transitions de phase (R15/R16)', () => {
  it('rend une PhaseSuggestionCard pour chaque alerte OPEN_PHASE_MODAL liée à une bande connue', () => {
    const bande = makeBande();
    mockFarmValue.bandes = [bande];
    mockFarmValue.alerts = [makePhasePoidsAlert()];
    mockPending = [makeTransition({ bande })];

    renderHub();

    expect(screen.getByLabelText(/Transitions de phase/i)).toBeTruthy();
    expect(screen.getByText(/Passage en Engraissement/i)).toBeTruthy();
    expect(screen.getByText(/P-001 · poids 52 kg ≥ 50 kg/i)).toBeTruthy();
  });

  it('cliquer "Confirmer" ouvre le PhaseTransitionModal pré-rempli', () => {
    const bande = makeBande();
    mockFarmValue.bandes = [bande];
    mockFarmValue.alerts = [makePhasePoidsAlert()];
    mockPending = [makeTransition({ bande })];

    renderHub();

    expect(screen.queryByTestId('phase-modal')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Confirmer/i }));
    const modal = screen.getByTestId('phase-modal');
    expect(modal.textContent).toContain('B-001');
    expect(modal.textContent).toContain('ENGRAISSEMENT');
  });

  it('masque la suggestion si la bande référencée n\'existe plus', () => {
    mockFarmValue.bandes = []; // bande absente
    mockFarmValue.alerts = [makePhasePoidsAlert()];
    mockPending = [makeTransition()];

    renderHub();

    expect(screen.queryByLabelText(/Transitions de phase/i)).toBeNull();
  });
});
