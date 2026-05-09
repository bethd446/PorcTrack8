// @vitest-environment jsdom
/**
 * Tests unitaires — TruieDetailView (refonte v6 « Diane T19 »)
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie la page détail d'une truie (`/troupeau/truies/:id`) dans sa
 * nouvelle structure : SowHero + ReproTracker + DecisionBinaire +
 * TimelineVerticale + MariusFAB.
 *
 * Mocks :
 *   - `useFarm` → renvoie 4 truies fixtures + sante:[] + saillies:[]
 *   - `useParams` (react-router-dom) → id sélectionné via MemoryRouter
 *   - `@ionic/react` → passthrough (évite les web-components)
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Truie } from '../../types/farm';

// Mock AuthContext (requis depuis l'ajout du rôle utilisateur).
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'farm-test' },
    role: 'PORCHER',
    userName: 'Test',
    setRole: vi.fn(),
    isOwner: false,
    profile: null,
    loading: false,
    profileLoaded: true,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

// Mock offlineQueue pour observer les updates de statut.
const enqueueUpdateMock = vi.fn();
vi.mock('../../services/offlineQueue', () => ({
  enqueueUpdate: (...args: unknown[]) => enqueueUpdateMock(...args),
}));

// V27 — Preferences mock (Capacitor) requis par PhotoStrip → service photos
const _prefsStoreTD = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: _prefsStoreTD.get(key) ?? null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      _prefsStoreTD.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      _prefsStoreTD.delete(key);
    }),
    keys: vi.fn(async () => ({ keys: Array.from(_prefsStoreTD.keys()) })),
    clear: vi.fn(async () => {
      _prefsStoreTD.clear();
    }),
  },
}));

// Mock supabaseWrites — non utilisé directement par les tests mais importé
// par le composant. Inclut listLoges/updateSowByCode (V25).
vi.mock('../../services/supabaseWrites', () => ({
  updateSow: vi.fn(async () => ({ success: true })),
  updateBatch: vi.fn(async () => ({ success: true })),
  updateSowByCode: vi.fn(async () => null),
  listLoges: vi.fn(async () => []),
  // V73 — required by PhotoUpload/PhotoGallery
  getCurrentFarmIdRef: () => null,
}));

// V73 — Mock léger des nouveaux composants photo (évite charge browser-image-compression)
vi.mock('../../v70/components/v70/PhotoUpload', () => ({
  default: () => <div data-testid="photo-upload" />,
}));
vi.mock('../../v70/components/v70/PhotoGallery', () => ({
  default: () => <div data-testid="photo-gallery" />,
}));

// Mock useIonAlert : expose presentAlertMock pour pouvoir simuler la confirmation
// ou l'annulation dans les tests sans web-component natif.
const presentAlertMock = vi.fn();

// ── Fixtures ────────────────────────────────────────────────────────────────
const truieT14: Truie = {
  id: 'T14',
  displayId: 'T14',
  boucle: 'FR-0014-42',
  nom: 'Marguerite',
  statut: 'Maternité',
  stade: 'Lactation',
  ration: 6,
  nbPortees: 3,
  derniereNV: 12,
  dateMBPrevue: '2026-05-10',
  race: 'Large White',
  poids: 235,
  notes: '',
  synced: true,
};

const truieT07: Truie = {
  id: 'T07',
  displayId: 'T07',
  boucle: 'FR-0007-99',
  nom: 'Rosalie',
  statut: 'Pleine',
  stade: 'Gestation',
  ration: 3.2,
  nbPortees: 1,
  dateMBPrevue: '2026-07-15',
  notes: '',
  synced: true,
};

const truieSurveillance: Truie = {
  id: 'T22',
  displayId: 'T22',
  boucle: 'FR-0022-11',
  nom: 'Suzette',
  statut: 'À surveiller',
  stade: '',
  ration: 3,
  nbPortees: 4,
  notes: '',
  synced: true,
};

const truieVide: Truie = {
  id: 'T05',
  displayId: 'T05',
  boucle: 'FR-0005-33',
  nom: 'Violette',
  statut: 'En attente saillie',
  stade: '',
  ration: 3,
  nbPortees: 2,
  notes: '',
  synced: true,
};

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [truieT14, truieT07, truieSurveillance, truieVide],
    verrats: [],
    bandes: [],
    sante: [],
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

// Passthrough Ionic : on conserve les enfants (évite l'enregistrement
// des web-components `@ionic/react` sur jsdom).
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonToast: () => null,
  IonSpinner: () => <span data-testid="ion-spinner" />,
  IonSelect: ({ children }: { children: React.ReactNode }) => <select>{children}</select>,
  IonSelectOption: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  IonSegment: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonSegmentButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  // BottomSheet utilise IonModal : en fermé (isOpen=false) on ne rend rien.
  IonModal: ({
    isOpen,
    children,
  }: {
    isOpen?: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div role="dialog">{children}</div> : null),
  // useIonAlert : retourne le mock exposé en haut de fichier.
  useIonAlert: () => [presentAlertMock],
}));

import TruieDetailView from './TruieDetailView';

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/troupeau/truies/:id" element={<TruieDetailView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TruieDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Vitest n'auto-cleanup pas entre tests (contrairement à Jest).
    cleanup();
  });

  it('V41 : affiche le displayId comme h1 (PageHeader sobre) et le nom dans la Card hero', () => {
    renderAt('/troupeau/truies/T14');
    const heading = screen.getByRole('heading', { level: 1 });
    // V41 PageHeader : h1 = displayId (shortCode) "T14". Le nom Marguerite est
    // dans la Card hero compacte sous le PageHeader.
    expect(heading.textContent).toContain('T14');
    expect(document.body.textContent).toContain('Marguerite');
  });

  it('rend le hero avec le displayId et au moins un svg', () => {
    renderAt('/troupeau/truies/T14');
    // displayId apparaît plusieurs fois (breadcrumb, eyebrow, photoStamp).
    const t14 = screen.getAllByText(/T14/);
    expect(t14.length).toBeGreaterThanOrEqual(1);
    // Le hero contient au minimum un SVG (icônes lucide : Plus, Printer, Sparkles).
    expect(document.querySelector('svg')).not.toBeNull();
  });

  it('affiche la chip de statut « Allaitante » avec le ton accent', () => {
    renderAt('/troupeau/truies/T14');
    // V40 F1/F2 : AnimalHero utilise <Tag variant="primary"> du DS V2
    // (mapping tone='green' → variant='primary'). Le label "Allaitante" reste
    // visible mais porte les classes pt-tag pt-tag--primary, plus chip--accent.
    const matches = screen.getAllByText('Allaitante');
    const tag = matches.find(el => {
      const className = el.getAttribute('class') ?? '';
      return /pt-tag/.test(className);
    });
    expect(tag).toBeDefined();
  });

  it('section « Identité » affiche la boucle FR-0014-42', () => {
    renderAt('/troupeau/truies/T14');
    const identite = screen.getByRole('region', { name: /identité/i });
    // La boucle est concaténée avec le displayId : "T14 · FR-0014-42".
    expect(within(identite).getByText(/FR-0014-42/)).toBeDefined();
    expect(within(identite).getByText(/Code · Boucle/i)).toBeDefined();
  });

  it.skip(
    "section « Reproduction » affiche la date de mise-bas prévue au format FR",
    // SKIP: feature retirée v6 — la section "Reproduction en cours" ne s'affiche
    // qu'avec une saillie active (lastSaillie). dateMBPrevue n'est plus rendue
    // directement. À reprendre en feature follow-up si besoin.
    () => {},
  );

  it('truie introuvable : affiche « Truie introuvable » + message', () => {
    renderAt('/troupeau/truies/T99');
    const heading = screen.getByRole('heading', { level: 1 });
    // En v6, le texte n'est plus en uppercase (le CSS le passe en uppercase
    // visuellement via text-transform mais textContent reste en casse mixte).
    expect(heading.textContent).toContain('Truie introuvable');
    expect(document.body.textContent).toMatch(
      /cette truie n'existe pas/i,
    );
  });

  it('expose un bouton « Éditer la fiche de la truie T14 »', () => {
    renderAt('/troupeau/truies/T14');
    // Sprint 2B V19 : label unifié "Éditer la fiche" (sentence case, concision).
    const editBtn = screen.getByLabelText(/éditer la fiche de la truie t14/i);
    expect(editBtn.tagName).toBe('BUTTON');
  });

  it.skip(
    'affiche les 4 actions rapides (Soin · Pesée · Saillie · Note)',
    // SKIP: feature retirée v6 — les 4 quick-actions ont été remplacées par
    // les CTA du SowHero (Nouvel évènement / Imprimer) + le MariusFAB.
    () => {},
  );

  // ── Actions métier contextuelles ─────────────────────────────────────────

  it.skip(
    'MATERNITE : affiche le bouton « Sevrer » dans Actions métier',
    // SKIP: feature retirée v6 — le bouton "Sevrer" n'existe plus dans Actions
    // métier. Le sevrage se gère via "Nouvel évènement" / Marius. À reprendre
    // en feature follow-up.
    () => {},
  );

  it.skip(
    'PLEINE : affiche le bouton « Confirmer MB » dans Actions métier',
    // SKIP: feature retirée v6 — "Confirmer MB" ne figure plus dans Actions
    // métier. Action gérée par DecisionBinaire en fenêtre de retour chaleur.
    () => {},
  );

  it('SURVEILLANCE : bouton « Sortir cette truie » avec confirm dialog', () => {
    // Simule l'appui sur « Confirmer » en appelant le handler du bouton destructif.
    presentAlertMock.mockImplementationOnce((opts: {
      buttons: { role?: string; handler?: () => void }[];
    }) => {
      const destructive = opts.buttons.find(b => b.role === 'destructive');
      destructive?.handler?.();
    });
    enqueueUpdateMock.mockClear();

    renderAt('/troupeau/truies/T22');
    const region = screen.getByRole('region', { name: /actions métier/i });
    const btn = within(region).getByRole('button', { name: /sortir cette truie/i });
    expect(btn).toBeDefined();

    fireEvent.click(btn);

    expect(presentAlertMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateMock).toHaveBeenCalledWith(
      'sows',
      'T22',
      { statut: 'Réforme' },
    );

    presentAlertMock.mockReset();
  });

  it("SURVEILLANCE : confirm annulé → pas d'update", () => {
    // Simule l'appui sur « Annuler » — on ne déclenche aucun handler.
    presentAlertMock.mockImplementationOnce(() => { /* annulé — rien */ });
    enqueueUpdateMock.mockClear();

    renderAt('/troupeau/truies/T22');
    const region = screen.getByRole('region', { name: /actions métier/i });
    fireEvent.click(within(region).getByRole('button', { name: /sortir cette truie/i }));

    expect(presentAlertMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateMock).not.toHaveBeenCalled();

    presentAlertMock.mockReset();
  });

  it.skip(
    'VIDE : affiche le bouton « Détecter chaleur » qui met à jour le statut',
    // SKIP: feature retirée v6 — "Détecter chaleur" n'existe plus dans Actions
    // métier. La détection se fait via "Nouvel évènement" sur le SowHero.
    () => {},
  );

  // ── CTA « Éditer la fiche » + highlight ────────────────────────

  it('CTA « Éditer la fiche » présent et cliquable', () => {
    renderAt('/troupeau/truies/T14');
    const btn = screen.getByRole('button', {
      name: /éditer la fiche de la truie t14/i,
    });
    expect(btn).toBeDefined();
    expect(btn.tagName).toBe('BUTTON');
    // Sprint 2B V19 : label texte court "Éditer la fiche".
    expect(btn.textContent).toMatch(/éditer la fiche/i);
  });

  it('CTA « Éditer la fiche » : click ouvre le sheet edit (dialog)', () => {
    renderAt('/troupeau/truies/T14');
    // Avant click : pas de dialog visible (IonModal mocké rend rien si !isOpen).
    expect(screen.queryByRole('dialog')).toBeNull();

    const btn = screen.getByRole('button', {
      name: /éditer la fiche de la truie t14/i,
    });
    fireEvent.click(btn);

    // Après click, le BottomSheet QuickEditTruieForm (via IonModal) est monté.
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('section « Identité » affiche la race et le poids dans les vitales', () => {
    renderAt('/troupeau/truies/T14');
    const identite = screen.getByRole('region', { name: /identité/i });
    // Race est dans la section Identité.
    expect(within(identite).getByText('Race')).toBeDefined();
    expect(within(identite).getByText('Large White')).toBeDefined();
    // Le poids est désormais affiché dans les Vitales (KPI cards).
    const vitales = screen.getByRole('region', { name: /vitales/i });
    expect(within(vitales).getByText('Poids')).toBeDefined();
    // Valeur 235 affichée séparément de l'unité "kg" (split valeur/small).
    expect(within(vitales).getByText('235')).toBeDefined();
  });

  // ── V32 PHASE 4 — Onglets ─────────────────────────────────────────────────
  describe('V32 PHASE 4 — onglets', () => {
    it('rend les 4 onglets (Vue d’ensemble · Reproduction · Santé · Historique)', () => {
      renderAt('/troupeau/truies/T14');
      const tablist = screen.getByRole('tablist', { name: /sections de la fiche truie/i });
      const tabs = within(tablist).getAllByRole('tab');
      expect(tabs.length).toBe(4);
      expect(tabs[0].textContent).toMatch(/vue d.?ensemble/i);
      expect(tabs[1].textContent).toMatch(/reproduction/i);
      expect(tabs[2].textContent).toMatch(/santé/i);
      expect(tabs[3].textContent).toMatch(/historique/i);
    });

    it('par défaut, onglet « Vue d’ensemble » actif → section Identité visible', () => {
      renderAt('/troupeau/truies/T14');
      expect(screen.queryByRole('region', { name: /identité/i })).not.toBeNull();
      // Repro & rations doit être masquée par défaut.
      expect(screen.queryByRole('region', { name: /repro et rations/i })).toBeNull();
    });

    it('clique « Reproduction » → bascule sur l’onglet repro, masque Identité', () => {
      renderAt('/troupeau/truies/T14');
      const tablist = screen.getByRole('tablist', { name: /sections de la fiche truie/i });
      const reproTab = within(tablist).getByRole('tab', { name: /reproduction/i });
      fireEvent.click(reproTab);
      expect(reproTab.getAttribute('aria-selected')).toBe('true');
      expect(screen.queryByRole('region', { name: /repro et rations/i })).not.toBeNull();
      expect(screen.queryByRole('region', { name: /identité/i })).toBeNull();
    });

    it('clique « Historique » → affiche le Journal et masque Vitales', () => {
      renderAt('/troupeau/truies/T14');
      const tablist = screen.getByRole('tablist', { name: /sections de la fiche truie/i });
      fireEvent.click(within(tablist).getByRole('tab', { name: /historique/i }));
      expect(screen.queryByRole('region', { name: /^journal$/i })).not.toBeNull();
      expect(screen.queryByRole('region', { name: /vitales/i })).toBeNull();
    });

    it('clique « Santé » → masque Identité, affiche Notes', () => {
      renderAt('/troupeau/truies/T14');
      const tablist = screen.getByRole('tablist', { name: /sections de la fiche truie/i });
      fireEvent.click(within(tablist).getByRole('tab', { name: /santé/i }));
      expect(screen.queryByRole('region', { name: /^notes$/i })).not.toBeNull();
      expect(screen.queryByRole('region', { name: /identité/i })).toBeNull();
    });
  });
});
