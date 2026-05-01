// @vitest-environment jsdom
/**
 * Tests unitaires — ReproCalendarView
 * ════════════════════════════════════════════════════════════════════════
 * Smoke-test : monte la vue avec une saillie en cours (7 derniers jours).
 * Cas métier : une bande sevrée depuis 5 jours déclenche la section
 * "Retours chaleur" (fenêtre attendue J+3 à J+10 post-sevrage).
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
  Saillie,
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
  saillies: Saillie[];
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

vi.mock('../../components/forms/QuickEditSaillieForm', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresher: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresherContent: () => <div />,
  IonModal: ({ isOpen, children }: { isOpen?: boolean; children: React.ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
  IonToast: () => null,
}));

import ReproCalendarView from './ReproCalendarView';

function makeTruie(overrides: Partial<Truie> = {}): Truie {
  return {
    id: 'T01',
    displayId: 'T01',
    boucle: 'FR-0001',
    statut: 'Pleine',
    ration: 3,
    synced: true,
    ...overrides,
  };
}

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-001',
    idPortee: 'P-001',
    statut: 'Sevrés',
    poidsInitialKg: 0,
    synced: true,
    ...overrides,
  };
}

function makeSaillie(overrides: Partial<Saillie> = {}): Saillie {
  return {
    truieId: 'T01',
    truieNom: 'Marguerite',
    dateSaillie: '12/05/2026',
    verratId: 'V01',
    dateMBPrevue: '04/09/2026',
    statut: 'CONFIRMEE',
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
      <ReproCalendarView />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  // 15 mai 2026 (date pivot stable).
  vi.setSystemTime(new Date(2026, 4, 15, 9, 0, 0));
  mockFarmValue = defaultFarmValue();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ReproCalendarView — smoke', () => {
  it('affiche le titre Reproduction et le KPI Saillies 7j à 1 quand 1 saillie en cours', () => {
    mockFarmValue.truies = [makeTruie()];
    mockFarmValue.saillies = [
      makeSaillie({ dateSaillie: '12/05/2026' }), // 3j avant le 15/05
    ];

    renderView();

    // h1 = "Reproduction" (refonte v6 : "Calendrier Repro" → "Reproduction")
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toMatch(/Reproduction/i);
    expect(screen.getByLabelText(/Saillies 7j\s+1/i)).toBeTruthy();
  });
});

describe('ReproCalendarView — métier', () => {
  it('une bande sevrée 5j auparavant déclenche le KPI Retours chaleur à 1', () => {
    // Sevrage à J-5 ⇒ daysSinceSevrage=5 (entre 3 et 10) ⇒ retour chaleur
    // attendu à sevrage+5 = aujourd'hui (15/05).
    mockFarmValue.bandes = [
      makeBande({
        id: 'B-CHALEUR',
        idPortee: 'P-CHALEUR',
        statut: 'Sevrés',
        truie: 'T01',
        dateSevrageReelle: '10/05/2026',
      }),
    ];

    renderView();

    // Le KPI "Retours chaleur" passe à 1 (la liste détaillée par truie a
    // été retirée — seul le compteur global est affiché).
    expect(screen.getByLabelText(/Retours chaleur\s+1/i)).toBeTruthy();
  });
});
