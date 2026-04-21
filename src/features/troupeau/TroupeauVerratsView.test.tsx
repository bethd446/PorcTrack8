// @vitest-environment jsdom
/**
 * Tests unitaires — TroupeauVerratsView
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie la vue dédiée aux verrats (`TroupeauVerratsView`) :
 *   1. Empty state : aucun verrat → icône + message + helper
 *   2. Rendering : 2 verrats fixtures (V01 Bobi, V02 Aligator) avec métadonnées
 *   3. Navigation : clic sur la card → navigate(`/troupeau/verrats/:id`)
 *   4. Summary strip : calcule correctement le total saillies + mois courant
 *
 * Mocks :
 *   - `useFarm` → verrats + saillies configurables par test
 *   - `useNavigate` (react-router-dom) → mock vi.fn()
 *   - `@ionic/react` → passthrough (évite les web-components)
 *   - `QuickSaillieForm` → stub (évite BottomSheet imbriqué)
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Verrat, Saillie } from '../../types/farm';

// ── Fixtures ────────────────────────────────────────────────────────────────
const verratBobi: Verrat = {
  id: 'V01',
  displayId: 'V01',
  boucle: 'FR-V01-001',
  nom: 'Bobi',
  statut: 'Actif',
  origine: 'Thomasset',
  alimentation: 'Verrat standard',
  ration: 3.0,
  notes: '',
  synced: true,
};

const verratAligator: Verrat = {
  id: 'V02',
  displayId: 'V02',
  boucle: 'FR-V02-002',
  nom: 'Aligator',
  statut: 'Actif',
  origine: 'Azaguie',
  alimentation: 'Verrat premium',
  ration: 2.5,
  notes: '',
  synced: true,
};

// ── State mockable par test ─────────────────────────────────────────────────
let mockVerrats: Verrat[] = [];
let mockSaillies: Saillie[] = [];
const navigateSpy = vi.fn();

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [],
    verrats: mockVerrats,
    bandes: [],
    alerts: [],
    criticalAlertCount: 0,
    loading: false,
    notes: [],
    alertesServeur: [],
    saillies: mockSaillies,
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

// Passthrough Ionic : évite l'enregistrement des web-components
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonModal: ({
    isOpen,
    children,
  }: {
    isOpen?: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div role="dialog">{children}</div> : null),
}));

// Stub QuickSaillieForm (n'intervient pas dans les tests ici)
vi.mock('../../components/forms/QuickSaillieForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="quick-saillie-form-open" /> : null,
}));

import TroupeauVerratsView from './TroupeauVerratsView';

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/troupeau/verrats-list']}>
      <TroupeauVerratsView />
    </MemoryRouter>,
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────
describe('TroupeauVerratsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateSpy.mockReset();
    mockVerrats = [];
    mockSaillies = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('affiche l\'empty state quand aucun verrat n\'est enregistré', () => {
    mockVerrats = [];
    mockSaillies = [];

    renderView();

    expect(screen.getByText(/aucun verrat enregistré/i)).toBeDefined();
    // Helper secondaire (mention de la feuille VERRATS)
    expect(document.body.textContent).toMatch(/feuille verrats/i);
    // Le SectionDivider "Verrats · N" ne doit pas apparaître quand empty
    expect(screen.queryByText(/^Verrats · \d+$/)).toBeNull();
  });

  it('rend les 2 verrats (Bobi + Aligator) avec meta complètes', () => {
    mockVerrats = [verratBobi, verratAligator];
    mockSaillies = [];

    renderView();

    // Titres (ft-heading uppercase — textContent préserve la casse source)
    expect(screen.getByText(/V01.*Bobi/)).toBeDefined();
    expect(screen.getByText(/V02.*Aligator/)).toBeDefined();

    // Meta : boucle affichée en 1er plan (format V01 · FR-V01-001, sans préfixe "Boucle:")
    expect(document.body.textContent).toContain('FR-V01-001');
    expect(document.body.textContent).toContain('Origine: Thomasset');
    expect(document.body.textContent).toContain('Ration: 3 kg/j');
    expect(document.body.textContent).toContain('Alimentation: Verrat standard');

    expect(document.body.textContent).toContain('FR-V02-002');
    expect(document.body.textContent).toContain('Origine: Azaguie');
    expect(document.body.textContent).toContain('Ration: 2.5 kg/j');
    expect(document.body.textContent).toContain('Alimentation: Verrat premium');

    // Chips statut "Actif" (2 occurrences)
    const actifChips = screen.getAllByText('Actif');
    expect(actifChips.length).toBe(2);

    // CTA par verrat
    expect(
      screen.getByLabelText('Saisir une saillie avec le verrat V01'),
    ).toBeDefined();
    expect(
      screen.getByLabelText('Saisir une saillie avec le verrat V02'),
    ).toBeDefined();
  });

  it('clic sur une card navigate vers le détail du verrat', () => {
    mockVerrats = [verratBobi, verratAligator];
    mockSaillies = [];

    renderView();

    // aria-label inclut désormais la boucle : "Voir le détail de V01 boucle FR-V01-001"
    const cardV01 = screen.getByLabelText(/Voir le détail de V01/);
    fireEvent.click(cardV01);
    expect(navigateSpy).toHaveBeenCalledWith('/troupeau/verrats/V01');

    const cardV02 = screen.getByLabelText(/Voir le détail de V02/);
    fireEvent.click(cardV02);
    expect(navigateSpy).toHaveBeenCalledWith('/troupeau/verrats/V02');

    expect(navigateSpy).toHaveBeenCalledTimes(2);
  });

  it('summary strip calcule total saillies + saillies du mois courant', () => {
    mockVerrats = [verratBobi, verratAligator];

    const now = new Date();
    const thisMonthDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // Mois précédent (sans risque de débordement sur l'année)
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const prevMonthDate = `${String(prev.getDate()).padStart(2, '0')}/${String(prev.getMonth() + 1).padStart(2, '0')}/${prev.getFullYear()}`;

    mockSaillies = [
      // 3 saillies ce mois
      { truieId: 'T01', dateSaillie: thisMonthDate, verratId: 'V01' },
      { truieId: 'T02', dateSaillie: thisMonthDate, verratId: 'V01' },
      { truieId: 'T03', dateSaillie: thisMonthDate, verratId: 'V02' },
      // 2 saillies mois précédent
      { truieId: 'T04', dateSaillie: prevMonthDate, verratId: 'V02' },
      { truieId: 'T05', dateSaillie: prevMonthDate, verratId: 'V01' },
    ];

    renderView();

    const region = screen.getByRole('region', { name: /résumé verrats/i });

    // 2 verrats
    expect(within(region).getByText('Verrats')).toBeDefined();
    expect(within(region).getByText('2')).toBeDefined();

    // 5 saillies au total
    expect(within(region).getByText('Saillies totales')).toBeDefined();
    expect(within(region).getByText('5')).toBeDefined();

    // 3 ce mois
    expect(within(region).getByText('Ce mois')).toBeDefined();
    expect(within(region).getByText('3')).toBeDefined();
  });
});
