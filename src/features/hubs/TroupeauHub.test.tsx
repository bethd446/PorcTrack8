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
 *   7. Header subtitle : "17 truies" et "7 pleines" visibles
 *   8. Filtre CHALEUR : chip "Chaleur 1" visible si 1 truie statut=Chaleur
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
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  { id: 'B01', idPortee: 'P01', statut: 'Sous mère', vivants: 12, truie: 'T09', boucleMere: 'FR-9-02', dateMB: '10/04/2026', poidsInitialKg: 0, synced: true },
  { id: 'B02', idPortee: 'P02', statut: 'Sous mère', vivants: 11, truie: 'T10', boucleMere: 'FR-10-02', dateMB: '12/04/2026', poidsInitialKg: 0, synced: true },
  { id: 'B03', idPortee: 'P03', statut: 'Sous mère', vivants: 13, truie: 'T11', boucleMere: 'FR-11-02', dateMB: '14/04/2026', poidsInitialKg: 0, synced: true },
  { id: 'B04', idPortee: 'P04', statut: 'Sous mère', vivants: 10, truie: 'T12', boucleMere: 'FR-12-02', dateMB: '15/04/2026', poidsInitialKg: 0, synced: true },
  // 8 sevrés (dont 4 en engraissement théorique)
  { id: 'B05', idPortee: 'P05', statut: 'Sevrés', vivants: 22, dateSevrageReelle: '01/01/2026', poidsInitialKg: 0, synced: true },
  { id: 'B06', idPortee: 'P06', statut: 'Sevrés', vivants: 21, dateSevrageReelle: '05/01/2026', poidsInitialKg: 0, synced: true },
  { id: 'B07', idPortee: 'P07', statut: 'Sevrés', vivants: 20, dateSevrageReelle: '10/01/2026', poidsInitialKg: 0, synced: true },
  { id: 'B08', idPortee: 'P08', statut: 'Sevrés', vivants: 19, dateSevrageReelle: '15/01/2026', poidsInitialKg: 0, synced: true },
  { id: 'B09', idPortee: 'P09', statut: 'Sevrés', vivants: 18, dateSevrageReelle: '20/03/2026', poidsInitialKg: 0, synced: true },
  { id: 'B10', idPortee: 'P10', statut: 'Sevrés', vivants: 17, dateSevrageReelle: '25/03/2026', poidsInitialKg: 0, synced: true },
  { id: 'B11', idPortee: 'P11', statut: 'Sevrés', vivants: 16, dateSevrageReelle: '01/04/2026', poidsInitialKg: 0, synced: true },
  { id: 'B12', idPortee: 'P12', statut: 'Sevrés', vivants: 15, dateSevrageReelle: '05/04/2026', poidsInitialKg: 0, synced: true },
  // 2 RECAP (exclues par Bandes.filterReal)
  { id: 'B13', idPortee: 'RECAP-2026', statut: 'RECAP', vivants: 0, poidsInitialKg: 0, synced: true },
  { id: 'B14', idPortee: 'RECAP-2025', statut: 'RECAP', vivants: 0, poidsInitialKg: 0, synced: true },
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
  useMeta: () => ({
    loading: false,
    dataSource: 'NETWORK',
    refreshData: vi.fn(),
    nomFerme: 'Ferme K13',
    pays: null,
    currency: 'FCFA',
  }),
  FarmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../context/TroupeauContext', () => ({
  useTroupeau: () => ({
    truies: mockTruies,
    verrats: mockVerrats,
    bandes: mockBandes,
    transitions: [],
    truiesHeader: [],
    verratsHeader: [],
    bandesHeader: [],
  }),
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

// V6-C : TroupeauLogesListView consomme listLoges/getLogeContents
vi.mock('../../services/supabaseWrites', () => ({
  listLoges: async () => [],
  getLogeContents: async () => ({
    truies: [],
    verrats: [],
    bandes: [],
    totalAnimaux: 0,
  }),
  createLoge: vi.fn(),
}));

// kvStore : Vitest 4 ne fournit plus de localStorage fonctionnel par défaut
// (object stub sans getItem). On mocke kvGet/kvSet pour TroupeauTruiesView.
vi.mock('../../services/kvStore', () => ({
  kvGet: () => null,
  kvSet: () => Promise.resolve(),
  kvRemove: () => Promise.resolve(),
  kvClear: () => Promise.resolve(),
  hydrateKvStore: () => Promise.resolve(),
  migrateLegacyLocalStorage: () => Promise.resolve(),
  __resetKvCacheForTests: () => {},
}));

// Mock useNavigate pour vérifier la navigation vers /troupeau/classement
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

/** Variante async : Radix Tabs réagit à pointerdown → utiliser userEvent. */
async function clickSubTabUser(label: RegExp): Promise<void> {
  const user = userEvent.setup();
  const tab = screen
    .getAllByRole('tab')
    .find(
      (t) =>
        t.id.startsWith('troupeau-tab-')
        && label.test(t.textContent ?? ''),
    );
  if (!tab) throw new Error(`Sous-onglet introuvable : ${label}`);
  await user.click(tab);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TroupeauHub — intégration multi-vues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. render baseline avec titre "Élevage" et truies mockées', () => {
    renderHub();

    // AUDIT-5 : titre canonique "Élevage" (vs ancien "Troupeau")
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toMatch(/élevage/i);

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

    await clickSubTabUser(/verrats/i);

    // React.lazy → Suspense → placeholder "Chargement…" puis le module résout
    // findByText attend l'apparition du contenu réel.
    await screen.findByText(/V01.*Bobi/);
    expect(document.body.textContent).toMatch(/V02.*Aligator/);

    // Les chips statut des verrats sont visibles (2 × "Actif")
    const actifChips = screen.getAllByText('Actif');
    expect(actifChips.length).toBeGreaterThanOrEqual(2);
  });

  it('4. click Porcelets → vue par loge (V25) : section "Loges occupées" + summary strip', async () => {
    // V25 — La vue Porcelets a été refondue : groupe par LOGE au lieu de
    // sections par phase. Avec listLoges() mocké à [], il y a 0 loge active
    // donc 0 occupée et 0 vide → on vérifie le rendu de la structure.
    renderHub();

    await clickSubTabUser(/porcelets/i);

    // Summary strip présent
    const summary = await screen.findByLabelText(/résumé porcelets/i);
    expect(summary).toBeDefined();

    // Section "Loges occupées"
    const occupiedHeader = await screen.findByText(/Loges occupées · \d+/i);
    expect(occupiedHeader).toBeDefined();
  });

  it('5. click Loges → liste plate des loges visible (V6-C)', async () => {
    renderHub();

    await clickSubTabUser(/loges/i);

    // V6-C : tab Loges affiche maintenant TroupeauLogesListView (référentiel
    // V24) au lieu de l'IsoBarn 3D legacy. Empty state quand 0 loge en base.
    const region = await screen.findByRole('region', {
      name: /liste des loges/i,
    });
    expect(region).toBeTruthy();
  });

  it('6. query `?view=porcelets` → ouvre directement la sous-vue Porcelets', async () => {
    renderHub('/troupeau?view=porcelets');

    // Le sous-onglet Porcelets est sélectionné d'entrée
    const porceletsTab = document.getElementById('troupeau-tab-porcelets');
    expect(porceletsTab).not.toBeNull();
    expect(porceletsTab?.getAttribute('aria-selected')).toBe('true');

    // V25 — Contenu Porcelets chargé : section "Loges occupées" présente.
    const occupiedHeader = await screen.findByText(/Loges occupées · \d+/i);
    expect(occupiedHeader).toBeDefined();

    // La search bar "Truies" n'est PAS affichée (panneau Truies inactif)
    expect(
      screen.queryByLabelText(
        /rechercher une truie par ID, nom, boucle ou stade/i,
      ),
    ).toBeNull();
  });

  it('7. header subtitle : "17 truies" et "7 pleines" visibles', () => {
    renderHub();

    // Le subtitle du header expose "17 truies · 2 verrats … — 7 pleines · 4 maternité · …"
    expect(screen.getAllByText(/17 truies/i).length).toBeGreaterThan(0);
    // "7 pleines" dans le header subtitle (peut aussi apparaître dans un filter chip)
    expect(screen.getAllByText(/7 pleines/i).length).toBeGreaterThan(0);
  });

  it('9. lien "Classement" visible et navigue vers /troupeau/classement', async () => {
    renderHub();

    const classementBtn = screen.getByRole('button', {
      name: /classement des reproducteurs/i,
    });
    expect(classementBtn).toBeDefined();
    expect(classementBtn.textContent).toMatch(/Classement/i);

    const user = userEvent.setup();
    await user.click(classementBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/troupeau/classement');
  });

  it('8. filtre CHALEUR : chip "Chaleur 1" visible (1 truie statut=Chaleur)', () => {
    renderHub();

    // Le panneau Truies contient un tablist "Filtrer par statut". Le filtre
    // "Chaleur" n'est visible que si counts[chaleur] > 0 (P2 du hub).
    const chaleurTab = screen
      .getAllByRole('tab')
      .find((t) => /chaleur/i.test(t.textContent ?? ''));

    expect(chaleurTab).toBeDefined();
    expect(chaleurTab?.textContent).toMatch(/chaleur/i);
    // Compteur sans padStart : "1" et non "01"
    expect(chaleurTab?.textContent).toMatch(/1$/);
    expect(chaleurTab?.textContent).not.toMatch(/01/);
  });

  // ── Tests régression V29 (refonte DNA "Aujourd'hui") ─────────────────
  it('V29-1. Section "Aperçu" rendue avec SectionHeader + Card', () => {
    renderHub();

    // Le label SMALL CAPS "APERÇU" doit être visible (SectionHeader V29)
    expect(screen.getAllByText(/APERÇU/i).length).toBeGreaterThan(0);
    // L'aria-label de la section reflète son intention
    expect(screen.getByLabelText(/aperçu des loges/i)).toBeDefined();
  });

  it('V29-2. Bouton "Classement" est un pill V29 (border-radius pill)', () => {
    renderHub();
    const classementBtn = screen.getByRole('button', {
      name: /classement des reproducteurs/i,
    });
    // V29 Button utilise --ds-radius-pill comme border-radius
    expect(classementBtn.style.borderRadius).toBe('var(--ds-radius-pill)');
    // Et UPPERCASE via CSS
    expect(classementBtn.style.textTransform).toBe('uppercase');
  });

  it('V29-3. Bouton "Ajouter une bande" pill V29 dans onglet Bandes', async () => {
    renderHub();
    await clickSubTabUser(/bandes/i);
    const addBtn = await screen.findByRole('button', {
      name: /ajouter une bande historique/i,
    });
    expect(addBtn.style.borderRadius).toBe('var(--ds-radius-pill)');
    expect(addBtn.style.textTransform).toBe('uppercase');
  });
});
