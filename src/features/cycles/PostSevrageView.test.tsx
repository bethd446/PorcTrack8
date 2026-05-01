// @vitest-environment jsdom
/**
 * Tests unitaires — PostSevrageView
 * ════════════════════════════════════════════════════════════════════════
 * Smoke-test du rendu et un cas métier critique : une bande sevrée depuis
 * 28+ jours (donc terrainPhase=CROISSANCE) doit afficher le CTA "Préparer
 * loge croissance" pour signaler le transfert.
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

vi.mock('../../components/forms/QuickPeseeForm', () => ({
  __esModule: true,
  default: () => null,
}));

import PostSevrageView from './PostSevrageView';

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
      <PostSevrageView />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  // 15 mai 2026 : repère stable pour calculs J+N.
  vi.setSystemTime(new Date(2026, 4, 15, 9, 0, 0));
  mockFarmValue = defaultFarmValue();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('PostSevrageView — smoke', () => {
  it('affiche un KPI Portées avec 1 et le titre POST-SEVRAGE', () => {
    // dateMB 30 jours avant aujourd'hui (15/05) → 15/04. Sevrage 28j après MB → 13/05
    // Statut "Sevrés" + dateSevrageReelle proche → bande POST_SEVRAGE déclarée + terrain
    mockFarmValue.bandes = [
      makeBande({
        id: 'B-PS',
        idPortee: 'P-PS',
        truie: 'T01',
        statut: 'Sevrés',
        dateMB: '15/04/2026',
        dateSevrageReelle: '13/05/2026',
        vivants: 12,
      }),
    ];

    renderView();

    // h1 du header
    expect(screen.getByRole('heading', { level: 1, name: /POST.SEVRAGE/i })).toBeTruthy();
    expect(screen.getByLabelText(/Portées\s+1/i)).toBeTruthy();
    expect(screen.getByText('P-PS')).toBeTruthy();
  });
});

describe('PostSevrageView — métier', () => {
  it('une bande avec dateMB ancienne (terrainPhase=CROISSANCE) affiche le CTA "Préparer la loge croissance"', () => {
    // dateMB 70 jours avant aujourd'hui (15/05) → 06/03/2026
    // age=70j > CR=63 ⇒ terrainPhase=CROISSANCE
    // statut "Sevrés" + sevrage récent (5j) ⇒ phase déclarée=POST_SEVRAGE
    // ⇒ isTransitionRequired = true
    mockFarmValue.bandes = [
      makeBande({
        id: 'B-LATE',
        idPortee: 'P-LATE',
        truie: 'T02',
        statut: 'Sevrés',
        dateMB: '06/03/2026',
        dateSevrageReelle: '10/05/2026',
        vivants: 11,
      }),
    ];

    renderView();

    // La bande est listée (vu en post-sevrage déclaré) ET la transition vers
    // croissance est signalée par le CTA.
    expect(screen.getByText('P-LATE')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: /Préparer la loge croissance|Transférer maintenant/i,
      }),
    ).toBeTruthy();
  });
});
