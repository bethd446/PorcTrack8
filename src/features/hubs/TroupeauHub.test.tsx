// @vitest-environment jsdom
/**
 * Tests d'intégration — TroupeauHub
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie l'orchestrateur multi-vues du hub Troupeau :
 *   1. Rendu baseline : titre "TROUPEAU" + 17 truies mockées
 *   2. Sous-onglet par défaut = Truies (search bar visible)
 *   3. Click Verrats tab → VerratsView (chip V01/V02)
 *   4. Click Porcelets tab → sections "Sous mère" / "Post-sevrage"
 *   5. Click Loges tab → IsoBarn SVG (role=img)
 *   6. Query `?view=porcelets` → ouvre directement la sous-vue Porcelets
 *   7. Summary strip : "17 truies" et "7 pleines" visibles
 *   8. Filtre CHALEUR : chip "Chaleur 01" visible si 1 truie statut=Chaleur
 *
 * Mocks :
 *   - `useFarm` → 17 truies (dont 7 pleines, 1 chaleur) + 2 verrats + 14 bandes
 *   - `@ionic/react` → passthrough (évite web-components + refresher)
 *   - `IsoBarn` → stub SVG minimal (role="img") pour éviter le SVG complexe
 *   - `QuickSaillieForm` → stub (évite BottomSheet dans VerratsView)
 *   - MemoryRouter pour useSearchParams / useNavigate
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Truie, Verrat, BandePorcelets } from '../../types/farm';

// ─── Fixtures ───────────────────────────────────────────────────────────────

/** Génère 17 truies : 7 pleines, 4 maternité, 1 chaleur, 3 vides, 2 réforme. */
function buildTruies(): Truie[] {
  const truies: Truie[] = [];
  // 7 pleines
  for (let i = 1; i <= 7; i++) {
    truies.push({
      id: `T${String(i).padStart(2, '0')}`,
      displayId: `T${String(i).padStart(2, '0')}`,
      boucle: `FR-${i}-01`,
      nom: `Pleine${i}`,
      statut: 'Pleine',
      dateMBPrevue: '15/05/2026',
      ration: 3,
      synced: true,
    });
  }
  // 4 maternité (index 8..11 → mais on saute T08 qui est archived)
  for (let i = 9; i <= 12; i++) {
    truies.push({
      id: `T${String(i).padStart(2, '0')}`,
      displayId: `T${String(i).padStart(2, '0')}`,
      boucle: `FR-${i}-02`,
      nom: `Mat${i}`,
      statut: 'En maternité',
      ration: 6,
      synced: true,
    });
  }
  // 1 chaleur
  truies.push({
    id: 'T13',
    displayId: 'T13',
    boucle: 'FR-13-01',
    nom: 'Choco',
    statut: 'Chaleur',
    ration: 2.5,
    synced: true,
  });
  // 3 vides
  for (let i = 14; i <= 16; i++) {
    truies.push({
      id: `T${String(i).padStart(2, '0')}`,
      displayId: `T${String(i).padStart(2, '0')}`,
      boucle: `FR-${i}-03`,
      nom: `Vide${i}`,
      statut: 'Vide',
      ration: 2.5,
      synced: true,
    });
  }
  // 2 réforme (T18, T19 — on évite T17 qui est archived)
  for (let i = 18; i <= 19; i++) {
    truies.push({
      id: `T${String(i).padStart(2, '0')}`,
      displayId: `T${String(i).padStart(2, '0')}`,
      boucle: `FR-${i}-04`,
      nom: `Ref${i}`,
      statut: 'Réforme',
      ration: 2.5,
      synced: true,
    });
  }
  return truies; // 7 + 4 + 1 + 3 + 2 = 17 truies actives
}

const mockTruies: Truie[] = buildTruies();

const mockVerrats: Verrat[] = [
  {
    id: 'V01',
    displayId: 'V01',
    boucle: 'FR-V01-001',
    nom: 'Bobi',
    statut: 'Actif',
    origine: 'Thomasset',
    alimentation: 'Verrat standard',
    ration: 3,
    synced: true,
  },
  {
    id: 'V02',
    displayId: 'V02',
    boucle: 'FR-V02-002',
    nom: 'Aligator',
    statut: 'Actif',
    origine: 'Azaguie',
    alimentation: 'Verrat premium',
    ration: 2.5,
    synced: true,
  },
];

/** 14 bandes : mix de Sous mère / Sevrés / RECAP pour nourrir toutes les vues. */
const mockBandes: BandePorcelets[] = [
  // 4 sous mère
  { id: 'B01', idPortee: 'P01', statut: 'Sous mère', vivants: 12, truie: 'T09', boucleMere: 'FR-9-02', dateMB: '10/04/2026', synced: true },
  { id: 'B02', idPortee: 'P02', statut: 'Sous mère', vivants: 11, truie: 'T10', boucleMere: 'FR-10-02', dateMB: '12/04/2026', synced: true },
  { id: 'B03', idPortee: 'P03', statut: 'Sous mère', vivants: 13, truie: 'T11', boucleMere: 'FR-11-02', dateMB: '14/04/2026', synced: true },
  { id: 'B04', idPortee: 'P04', statut: 'Sous mère', vivants: 10, truie: 'T12', boucleMere: 'FR-12-02', dateMB: '15/04/2026', synced: true },
  // 8 sevrés (dont 4 en engraissement théorique)
  { id: 'B05', idPortee: 'P05', statut: 'Sevrés', vivants: 22, dateSevrageReelle: '01/01/2026', synced: true },
  { id: 'B06', idPortee: 'P06', statut: 'Sevrés', vivants: 21, dateSevrageReelle: '05/01/2026', synced: true },
  { id: 'B07', idPortee: 'P07', statut: 'Sevrés', vivants: 20, dateSevrageReelle: '10/01/2026', synced: true },
  { id: 'B08', idPortee: 'P08', statut: 'Sevrés', vivants: 19, dateSevrageReelle: '15/01/2026', synced: true },
  { id: 'B09', idPortee: 'P09', statut: 'Sevrés', vivants: 18, dateSevrageReelle: '20/03/2026', synced: true },
  { id: 'B10', idPortee: 'P10', statut: 'Sevrés', vivants: 17, dateSevrageReelle: '25/03/2026', synced: true },
  { id: 'B11', idPortee: 'P11', statut: 'Sevrés', vivants: 16, dateSevrageReelle: '01/04/2026', synced: true },
  { id: 'B12', idPortee: 'P12', statut: 'Sevrés', vivants: 15, dateSevrageReelle: '05/04/2026', synced: true },
  // 2 RECAP (exclues par Bandes.filterReal)
  { id: 'B13', idPortee: 'RECAP-2026', statut: 'RECAP', vivants: 0, synced: true },
  { id: 'B14', idPortee: 'RECAP-2025', statut: 'RECAP', vivants: 0, synced: true },
];

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: mockTruies,
    verrats: mockVerrats,
    bandes: mockBandes,
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

// Passthrough Ionic (y compris Refresher utilisé par TroupeauPorceletsView)
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
  IonRefresher: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresherContent: () => <div />,
  // P4 — swipe-actions (stubs passthrough pour JSDOM)
  IonItemSliding: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  IonItemOptions: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  IonItemOption: ({
    children,
    onClick,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
  }) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  IonToast: () => null,
}));

// IsoBarn : stub SVG minimal pour éviter le SVG isométrique complexe
vi.mock('../../components/agritech/IsoBarn', () => ({
  default: ({ ariaLabel }: { ariaLabel?: string }) => (
    <svg
      role="img"
      aria-label={
        ariaLabel
        ?? 'Plan isométrique des loges : maternité, post-sevrage, croissance-finition'
      }
      data-testid="iso-barn-stub"
    />
  ),
  // Exports annexes conservés (types + helpers non utilisés en runtime ici)
  iso: () => ({ x: 0, y: 0 }),
  pathFrom: () => '',
  U: 1,
  COS: 1,
  SIN: 1,
}));

// Stub QuickSaillieForm — VerratsView l'importe mais n'interfère pas ici
vi.mock('../../components/forms/QuickSaillieForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="quick-saillie-form-open" /> : null,
}));

// Import APRÈS les vi.mock (hoistés par Vitest mais ordre explicite plus clair)
import TroupeauHub from './TroupeauHub';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderHub(initialPath = '/troupeau') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TroupeauHub />
    </MemoryRouter>,
  );
}

/** Clique sur le sous-onglet demandé (role=tab dans le tablist principal). */
function clickSubTab(label: RegExp): void {
  // Plusieurs role=tablist peuvent coexister (le panneau Truies a un
  // tablist de filtres). On cible les tabs avec `id="troupeau-tab-*"`.
  const tab = screen
    .getAllByRole('tab')
    .find(
      (t) =>
        t.id.startsWith('troupeau-tab-')
        && label.test(t.textContent ?? ''),
    );
  if (!tab) throw new Error(`Sous-onglet introuvable : ${label}`);
  fireEvent.click(tab);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TroupeauHub — intégration multi-vues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. render baseline avec titre "TROUPEAU" et truies mockées', () => {
    renderHub();

    // AgritechHeader rend le titre tel quel ; CSS applique l'uppercase
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toMatch(/TROUPEAU/i);

    // Subtitle : "Ferme K13 · 19 animaux" (17 truies actives + 2 verrats)
    expect(document.body.textContent).toMatch(/Ferme K13/);
    expect(document.body.textContent).toMatch(/19 animaux/);
  });

  it('2. sous-onglet par défaut = Truies (search bar visible)', () => {
    renderHub();

    const searchInput = screen.getByLabelText(
      /rechercher une truie par ID, nom, boucle ou stade/i,
    );
    expect(searchInput).toBeDefined();
    expect((searchInput as HTMLInputElement).type).toBe('search');

    // L'onglet Truies est sélectionné (aria-selected=true)
    const truiesTab = document.getElementById('troupeau-tab-truies');
    expect(truiesTab).not.toBeNull();
    expect(truiesTab?.getAttribute('aria-selected')).toBe('true');
  });

  it('3. click Verrats → VerratsView affichée (V01 / V02 présents)', async () => {
    renderHub();

    clickSubTab(/verrats/i);

    // React.lazy → Suspense → placeholder "Chargement…" puis le module résout
    // findByText attend l'apparition du contenu réel.
    await screen.findByText(/V01.*Bobi/);
    expect(document.body.textContent).toMatch(/V02.*Aligator/);

    // Les chips statut des verrats sont visibles (2 × "Actif")
    const actifChips = screen.getAllByText('Actif');
    expect(actifChips.length).toBeGreaterThanOrEqual(2);
  });

  it('4. click Porcelets → sections "Sous mère" et "Post-sevrage" visibles', async () => {
    renderHub();

    clickSubTab(/porcelets/i);

    // Section "Sous mère · 4"
    const sousMereHeader = await screen.findByText(/Sous mère · 4/i);
    expect(sousMereHeader).toBeDefined();

    // Section "Post-sevrage · 102 porcelets"
    expect(document.body.textContent).toMatch(/Post-sevrage · 102 porcelets/i);
  });

  it('5. click Loges → IsoBarn SVG (role=img) visible', async () => {
    renderHub();

    clickSubTab(/loges/i);

    // On attend l'apparition du SVG stubé (role=img + aria-label isométrique)
    const svg = await screen.findByRole('img', { name: /isométrique/i });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-label')).toMatch(/isométrique/i);
  });

  it('6. query `?view=porcelets` → ouvre directement la sous-vue Porcelets', async () => {
    renderHub('/troupeau?view=porcelets');

    // Le sous-onglet Porcelets est sélectionné d'entrée
    const porceletsTab = document.getElementById('troupeau-tab-porcelets');
    expect(porceletsTab).not.toBeNull();
    expect(porceletsTab?.getAttribute('aria-selected')).toBe('true');

    // Contenu Porcelets chargé (section "Sous mère")
    const sousMereHeader = await screen.findByText(/Sous mère · 4/i);
    expect(sousMereHeader).toBeDefined();

    // La search bar "Truies" n'est PAS affichée (panneau Truies inactif)
    expect(
      screen.queryByLabelText(
        /rechercher une truie par ID, nom, boucle ou stade/i,
      ),
    ).toBeNull();
  });

  it('7. summary strip : "17 truies" et "7 pleines" visibles', () => {
    renderHub();

    const strip = screen.getByRole('group', {
      name: /synthèse troupeau/i,
    });

    // "17 truies" (total)
    expect(within(strip).getByText(/17 truies/i)).toBeDefined();

    // "7 pleines"
    expect(within(strip).getByText(/7 pleines/i)).toBeDefined();
  });

  it('8. filtre CHALEUR : chip "Chaleur 01" visible (1 truie statut=Chaleur)', () => {
    renderHub();

    // Le panneau Truies contient un tablist "Filtrer par statut". Le filtre
    // "Chaleur" n'est visible que si counts[chaleur] > 0 (P2 du hub).
    const chaleurTab = screen
      .getAllByRole('tab')
      .find((t) => /chaleur/i.test(t.textContent ?? ''));

    expect(chaleurTab).toBeDefined();
    // Le compteur est formaté "01" (padStart 2)
    expect(chaleurTab?.textContent).toMatch(/chaleur/i);
    expect(chaleurTab?.textContent).toMatch(/01/);
  });
});
