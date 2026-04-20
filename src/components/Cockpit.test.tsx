// @vitest-environment jsdom
/**
 * Tests unitaires — Cockpit (rendu + logique dérivée)
 * ════════════════════════════════════════════════════════════════════════
 * Ce fichier vérifie que le Cockpit (route `/`) rend correctement les
 * indicateurs clés (KPI 2×2), la section « Sevrages en retard », « Mon
 * élevage » (4 HubTiles), et les éléments d'en-tête à partir d'un mock
 * contrôlé de `useFarm`.
 *
 * Stratégie :
 *   · `vi.mock('../context/FarmContext')` — injecte `useFarm` + `FarmProvider`
 *     factices. Toutes les clés du contexte sont mockées pour que les sous-
 *     composants qui consomment aussi useFarm (ForecastWidget, QuickSaillieForm,
 *     QuickPeseeForm) reçoivent des données valides.
 *   · `vi.setSystemTime(new Date(2026, 3, 15))` — 15 avril 2026, fige le temps
 *     pour rendre déterministes les calculs `J+N` / `today`.
 *   · `MemoryRouter` — contexte de navigation pour `useNavigate`.
 *
 * L'environnement jsdom est requis (pragma en tête de fichier) car le reste
 * du repo tourne en `node` par défaut.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type {
  Truie,
  Verrat,
  BandePorcelets,
  StockAliment,
  StockVeto,
  AlerteServeur,
  DataSource,
} from '../types/farm';
import type { FarmAlert } from '../services/alertEngine';

// ─── Mock useFarm / FarmProvider ─────────────────────────────────────────────
// La valeur courante du mock est pilotée via `mockFarmValue` (mutable). Chaque
// test la ré-initialise dans `beforeEach`.

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

vi.mock('../context/FarmContext', () => ({
  useFarm: () => mockFarmValue,
  FarmProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ForecastWidget fait des calculs lourds hors sujet pour ces tests ; on le
// remplace par un placeholder minimal qui n'affecte pas les autres sections.
vi.mock('./cockpit/ForecastWidget', () => ({
  __esModule: true,
  default: () => <div data-testid="forecast-widget-mock" />,
}));

// Les quick-forms ouvrent des BottomSheets Ionic ; inutile pour ces tests.
vi.mock('./forms/QuickSaillieForm', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('./forms/QuickHealthForm', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('./forms/QuickNoteForm', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('./forms/QuickPeseeForm', () => ({
  __esModule: true,
  default: () => null,
}));

// Import APRÈS les mocks pour que Cockpit pique bien les versions mockées.
import Cockpit from './Cockpit';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTruie(overrides: Partial<Truie> = {}): Truie {
  return {
    id: 'T01',
    displayId: 'T01',
    boucle: 'FR-0001',
    statut: 'Vide',
    ration: 3,
    synced: true,
    ...overrides,
  };
}

function makeVerrat(overrides: Partial<Verrat> = {}): Verrat {
  return {
    id: 'V01',
    displayId: 'V01',
    boucle: 'FR-V01',
    statut: 'Actif',
    ration: 3,
    synced: true,
    ...overrides,
  };
}

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-001',
    idPortee: 'P-001',
    statut: 'Post-sevrage',
    synced: true,
    ...overrides,
  };
}

function makeStockAliment(overrides: Partial<StockAliment> = {}): StockAliment {
  return {
    id: 'SA-01',
    libelle: 'Aliment truie',
    stockActuel: 500,
    unite: 'kg',
    seuilAlerte: 100,
    statutStock: 'OK',
    ...overrides,
  };
}

function makeStockVeto(overrides: Partial<StockVeto> = {}): StockVeto {
  return {
    id: 'SV-01',
    produit: 'Vaccin',
    stockActuel: 10,
    unite: 'dose',
    seuilAlerte: 2,
    statutStock: 'OK',
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

function renderCockpit(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <Cockpit />
    </MemoryRouter>,
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  // 15 avril 2026 — "aujourd'hui" déterministe. Mois 3 = avril (0-indexé).
  vi.setSystemTime(new Date(2026, 3, 15, 9, 0, 0));
  mockFarmValue = defaultFarmValue();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Cockpit — rendu baseline', () => {
  it('affiche l\'en-tête "COCKPIT · K13" avec 17 truies / 2 verrats / 14 bandes', () => {
    mockFarmValue.truies = Array.from({ length: 17 }, (_, i) =>
      makeTruie({ id: `T${String(i + 1).padStart(2, '0')}`, displayId: `T${i + 1}` }),
    );
    mockFarmValue.verrats = Array.from({ length: 2 }, (_, i) => makeVerrat({ id: `V${i + 1}` }));
    mockFarmValue.bandes = Array.from({ length: 14 }, (_, i) =>
      makeBande({ id: `B-${String(i + 1).padStart(3, '0')}`, idPortee: `P-${i + 1}` }),
    );
    mockFarmValue.stockAliment = [makeStockAliment()];
    mockFarmValue.stockVeto = [makeStockVeto()];

    renderCockpit();

    // L'en-tête contient "Cockpit" + " · K13" (séparés par un <span>)
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toMatch(/Cockpit/i);
    expect(heading.textContent).toMatch(/K13/);
  });
});

describe('Cockpit — KPI cards', () => {
  it('KPI Pleines : compte les truies au statut "Pleine"', () => {
    const pleines = Array.from({ length: 7 }, (_, i) =>
      makeTruie({ id: `T-P${i}`, statut: 'Pleine' }),
    );
    const autres = Array.from({ length: 10 }, (_, i) => makeTruie({ id: `T-V${i}`, statut: 'Vide' }));
    mockFarmValue.truies = [...pleines, ...autres];

    renderCockpit();

    const pleinesCard = screen.getByRole('button', { name: /Pleines\s*7/i });
    expect(pleinesCard).toBeTruthy();
    expect(within(pleinesCard).getByText('7')).toBeTruthy();
  });

  it('KPI Maternité : compte les truies "En maternité"', () => {
    const mat = Array.from({ length: 4 }, (_, i) =>
      makeTruie({ id: `T-M${i}`, statut: 'En maternité' }),
    );
    mockFarmValue.truies = [...mat, makeTruie({ id: 'T-X', statut: 'Vide' })];

    renderCockpit();

    const materniteCard = screen.getByRole('button', { name: /Maternité\s*4/i });
    expect(materniteCard).toBeTruthy();
    expect(within(materniteCard).getByText('4')).toBeTruthy();
  });

  it('KPI Alertes : somme alerts locales + alertesServeur (3 + 2 = 5)', () => {
    const localAlerts: FarmAlert[] = [
      { id: 'A1', type: 'MISE_BAS', priority: 'HAUTE', title: 'MB T01', message: 'x' },
      { id: 'A2', type: 'SEVRAGE', priority: 'NORMALE', title: 'SEV B01', message: 'y' },
      { id: 'A3', type: 'STOCK', priority: 'NORMALE', title: 'Stock', message: 'z' },
    ] as unknown as FarmAlert[];
    const serverAlerts: AlerteServeur[] = [
      {
        priorite: 'HAUTE',
        categorie: 'BANDES',
        sujet: 'S1',
        description: 'd1',
        actionRequise: '',
        date: '15/04/2026',
      },
      {
        priorite: 'NORMALE',
        categorie: 'REPRO',
        sujet: 'S2',
        description: 'd2',
        actionRequise: '',
        date: '15/04/2026',
      },
    ];

    mockFarmValue.alerts = localAlerts;
    mockFarmValue.alertesServeur = serverAlerts;

    renderCockpit();

    const alertesCard = screen.getByRole('button', { name: /Alertes\s*5/i });
    expect(alertesCard).toBeTruthy();
    expect(within(alertesCard).getByText('5')).toBeTruthy();
  });

  it('KPI Ruptures : compte les stockAliment statutStock="RUPTURE"', () => {
    mockFarmValue.stockAliment = [
      makeStockAliment({ id: 'SA-R1', statutStock: 'RUPTURE' }),
      makeStockAliment({ id: 'SA-R2', statutStock: 'RUPTURE' }),
      makeStockAliment({ id: 'SA-OK', statutStock: 'OK' }),
    ];

    renderCockpit();

    const rupturesCard = screen.getByRole('button', { name: /Ruptures\s*2/i });
    expect(rupturesCard).toBeTruthy();
    expect(within(rupturesCard).getByText('2')).toBeTruthy();
  });
});

describe('Cockpit — Sevrages en retard', () => {
  it('affiche la section avec chip "EN RETARD" et J+5 si dateSevragePrevue = 10/04/2026 (today=15/04)', () => {
    mockFarmValue.bandes = [
      makeBande({
        id: 'B-LATE',
        idPortee: 'P-LATE',
        statut: 'Sous mère',
        vivants: 12,
        dateSevragePrevue: '10/04/2026',
      }),
    ];

    renderCockpit();

    // Titre de section (SectionDivider affiche le label)
    expect(screen.getByText(/Sevrages en retard/i)).toBeTruthy();

    // Chip "EN RETARD"
    expect(screen.getByText('EN RETARD')).toBeTruthy();

    // J+5 calculé (15 - 10 = 5)
    expect(screen.getByText(/J\+5/)).toBeTruthy();

    // L'ID de portée est visible
    expect(screen.getByText('P-LATE')).toBeTruthy();
  });

  it('ne rend PAS la section sevrage retard si aucune bande retardataire', () => {
    mockFarmValue.bandes = [
      makeBande({
        id: 'B-OK',
        idPortee: 'P-OK',
        statut: 'Sous mère',
        vivants: 12,
        // dans le futur, pas en retard
        dateSevragePrevue: '20/04/2026',
      }),
    ];

    renderCockpit();

    expect(screen.queryByText(/Sevrages en retard/i)).toBeNull();
    expect(screen.queryByText('EN RETARD')).toBeNull();
  });
});

describe('Cockpit — Mon élevage', () => {
  it('affiche 4 HubTiles : Truies, Verrats, Porcelets, Loges', () => {
    mockFarmValue.truies = [makeTruie()];
    mockFarmValue.verrats = [makeVerrat()];
    mockFarmValue.bandes = [
      makeBande({ id: 'B-1', statut: 'Sous mère', vivants: 10 }),
    ];

    renderCockpit();

    // Chacun des 4 HubTiles expose aria-label = title
    expect(screen.getByLabelText('Truies')).toBeTruthy();
    expect(screen.getByLabelText('Verrats')).toBeTruthy();
    expect(screen.getByLabelText('Porcelets')).toBeTruthy();
    expect(screen.getByLabelText('Loges')).toBeTruthy();

    // Section "Mon élevage"
    expect(screen.getByText('Mon élevage')).toBeTruthy();
  });
});
