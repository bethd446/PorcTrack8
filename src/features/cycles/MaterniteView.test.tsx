// @vitest-environment jsdom
/**
 * Tests unitaires — MaterniteView
 * ════════════════════════════════════════════════════════════════════════
 * Smoke-test du rendu et un cas métier critique : une truie sevrée ne doit
 * plus apparaître dans la liste maternité.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type {
  Truie,
  Verrat,
  BandePorcelets,
  StockAliment,
  StockVeto,
  AlerteServeur,
  DataSource,
} from '../../types/farm';
import type { FarmAlert } from '../../services/alertEngine';

interface MockFarmValue {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  stockAliment: StockAliment[];
  stockVeto: StockVeto[];
  alerts: FarmAlert[];
  alertesServeur: AlerteServeur[];
  saillies: unknown[];
  finances: unknown[];
  alimentFormules: unknown[];
  sante: unknown[];
  notes: unknown[];
  loading: boolean;
  dataSource: DataSource | null;
  criticalAlertCount: number;
  refreshData: () => Promise<void>;
  getTruieById: (id: string) => Truie | undefined;
  getVerratById: (id: string) => Verrat | undefined;
  getBandeById: (id: string) => BandePorcelets | undefined;
  getAnimalById: (id: string, type: 'TRUIE' | 'VERRAT') => undefined;
  getHealthForAnimal: () => unknown[];
  getHealthForSubject: () => unknown[];
  getNotesForAnimal: () => unknown[];
  getNotesForSubject: () => unknown[];
  pullData: () => Promise<void>;
  processQueue: () => Promise<void>;
  recomputeAlerts: () => void;
  lastUpdate: number;
  syncStatus: 'synced' | 'pending' | 'offline';
  truiesHeader: string[];
  verratsHeader: string[];
  bandesHeader: string[];
  santeHeader: string[];
  stockAlimentHeader: string[];
  stockVetoHeader: string[];
}

let mockFarmValue: MockFarmValue;

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

vi.mock('../../components/forms/QuickMiseBasForm', () => ({
  __esModule: true,
  default: () => null,
}));

import MaterniteView from './MaterniteView';

function makeTruie(overrides: Partial<Truie> = {}): Truie {
  return {
    id: 'T01',
    displayId: 'T01',
    boucle: 'FR-0001',
    statut: 'En maternité',
    ration: 6,
    synced: true,
    ...overrides,
  };
}

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-001',
    idPortee: 'P-001',
    statut: 'Sous mère',
    poidsInitialKg: 0,
    synced: true,
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
    finances: [],
    alimentFormules: [],
    sante: [],
    notes: [],
    loading: false,
    dataSource: 'NETWORK',
    criticalAlertCount: 0,
    refreshData: vi.fn().mockResolvedValue(undefined),
    getTruieById: () => undefined,
    getVerratById: () => undefined,
    getBandeById: () => undefined,
    getAnimalById: () => undefined,
    getHealthForAnimal: () => [],
    getHealthForSubject: () => [],
    getNotesForAnimal: () => [],
    getNotesForSubject: () => [],
    pullData: vi.fn().mockResolvedValue(undefined),
    processQueue: vi.fn().mockResolvedValue(undefined),
    recomputeAlerts: vi.fn(),
    lastUpdate: 0,
    syncStatus: 'synced',
    truiesHeader: [],
    verratsHeader: [],
    bandesHeader: [],
    santeHeader: [],
    stockAlimentHeader: [],
    stockVetoHeader: [],
  };
}

function renderView(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <MaterniteView />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 3, 15, 9, 0, 0));
  mockFarmValue = defaultFarmValue();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('MaterniteView — smoke', () => {
  it('affiche le KPI "Truies" avec le compte des truies en maternité', () => {
    mockFarmValue.truies = [
      makeTruie({ id: 'T01', displayId: 'T01', statut: 'En maternité' }),
    ];
    mockFarmValue.bandes = [
      makeBande({ id: 'B-T01', idPortee: 'P-T01', truie: 'T01', dateMB: '01/04/2026', vivants: 12 }),
    ];

    renderView();

    // "Maternité" apparaît plusieurs fois (crumbs, eyebrow, h1) → ciblage h1
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toMatch(/Maternité/i);
    // Le KPI "Truies" doit afficher 1
    const kpiTruies = screen.getByLabelText(/Truies\s+1/i);
    expect(kpiTruies).toBeTruthy();
  });
});

describe('MaterniteView — métier', () => {
  it('une truie sevrée (statut Vide) ne s\'affiche pas dans la liste maternité', () => {
    mockFarmValue.truies = [
      makeTruie({ id: 'T01', displayId: 'T01', statut: 'En maternité' }),
      makeTruie({ id: 'T02', displayId: 'T02', statut: 'Vide' }),
    ];
    mockFarmValue.bandes = [
      makeBande({ id: 'B-T01', idPortee: 'P-T01', truie: 'T01', dateMB: '01/04/2026', vivants: 12 }),
    ];

    renderView();

    // T01 en maternité visible
    expect(screen.getByText('T01')).toBeTruthy();
    // T02 (sevrée) ne doit pas apparaître dans la liste maternité
    expect(screen.queryByText('T02')).toBeNull();
    // KPI Truies doit valoir 1
    expect(screen.getByLabelText(/Truies\s+1/i)).toBeTruthy();
  });
});
