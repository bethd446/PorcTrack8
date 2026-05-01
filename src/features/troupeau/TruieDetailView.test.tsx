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
const enqueueUpdateRowMock = vi.fn();
vi.mock('../../services/offlineQueue', () => ({
  enqueueUpdateRow: (...args: unknown[]) => enqueueUpdateRowMock(...args),
}));

// Mock supabaseWrites — non utilisé directement par les tests mais importé
// par le composant.
vi.mock('../../services/supabaseWrites', () => ({
  updateSow: vi.fn(async () => ({ success: true })),
  updateBatch: vi.fn(async () => ({ success: true })),
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

  it('affiche le nom de la truie comme h1 et son displayId dans le breadcrumb', () => {
    renderAt('/troupeau/truies/T14');
    const heading = screen.getByRole('heading', { level: 1 });
    // En v6, h1 = nom de la truie (Marguerite) et non plus "TRUIE T14".
    expect(heading.textContent).toContain('Marguerite');
    // Le displayId apparaît dans le breadcrumb / vitales.
    expect(document.body.textContent).toContain('T14');
  });

  it('rend le hero avec le displayId et au moins un svg', () => {
    renderAt('/troupeau/truies/T14');
    // displayId apparaît plusieurs fois (breadcrumb, eyebrow, photoStamp).
    const t14 = screen.getAllByText(/T14/);
    expect(t14.length).toBeGreaterThanOrEqual(1);
    // Le hero contient au minimum un SVG (icônes lucide : Plus, Printer, Sparkles).
    expect(document.querySelector('svg')).not.toBeNull();
  });

  it('affiche la chip de statut « Maternité » avec le ton green', () => {
    renderAt('/troupeau/truies/T14');
    // "Maternité" apparaît à 2 endroits : chip du SowHero + valeur Statut
    // dans Vitales. La chip est un <span> avec le style tone green
    // (chip--gold n'existe plus en v6).
    const matches = screen.getAllByText('Maternité');
    const chip = matches.find(el => {
      const style = el.getAttribute('style') ?? '';
      return el.tagName.toLowerCase() === 'span' && /color-accent/.test(style);
    });
    expect(chip).toBeDefined();
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

  it('expose un bouton « Modifier toutes les infos de la truie T14 »', () => {
    renderAt('/troupeau/truies/T14');
    // En v6, le bouton edit pastille a été remplacé par le CTA texte
    // "Modifier toutes les infos" (aria-label inchangé en concept).
    const editBtn = screen.getByLabelText(/modifier toutes les infos de la truie t14/i);
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

  it('SURVEILLANCE : bouton « Passer en réforme » avec confirm dialog', () => {
    // Simule l'appui sur « Confirmer » en appelant le handler du bouton destructif.
    presentAlertMock.mockImplementationOnce((opts: {
      buttons: { role?: string; handler?: () => void }[];
    }) => {
      const destructive = opts.buttons.find(b => b.role === 'destructive');
      destructive?.handler?.();
    });
    enqueueUpdateRowMock.mockClear();

    renderAt('/troupeau/truies/T22');
    const region = screen.getByRole('region', { name: /actions métier/i });
    const btn = within(region).getByRole('button', { name: /passer en réforme/i });
    expect(btn).toBeDefined();

    fireEvent.click(btn);

    expect(presentAlertMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'SUIVI_TRUIES_REPRODUCTION',
      'ID',
      'T22',
      { STATUT: 'Réforme' },
    );

    presentAlertMock.mockReset();
  });

  it("SURVEILLANCE : confirm annulé → pas d'update", () => {
    // Simule l'appui sur « Annuler » — on ne déclenche aucun handler.
    presentAlertMock.mockImplementationOnce(() => { /* annulé — rien */ });
    enqueueUpdateRowMock.mockClear();

    renderAt('/troupeau/truies/T22');
    const region = screen.getByRole('region', { name: /actions métier/i });
    fireEvent.click(within(region).getByRole('button', { name: /passer en réforme/i }));

    expect(presentAlertMock).toHaveBeenCalledTimes(1);
    expect(enqueueUpdateRowMock).not.toHaveBeenCalled();

    presentAlertMock.mockReset();
  });

  it.skip(
    'VIDE : affiche le bouton « Détecter chaleur » qui met à jour le statut',
    // SKIP: feature retirée v6 — "Détecter chaleur" n'existe plus dans Actions
    // métier. La détection se fait via "Nouvel évènement" sur le SowHero.
    () => {},
  );

  // ── CTA « Modifier toutes les infos » + highlight ────────────────────────

  it('CTA « Modifier toutes les infos » présent et cliquable', () => {
    renderAt('/troupeau/truies/T14');
    const btn = screen.getByRole('button', {
      name: /modifier toutes les infos de la truie t14/i,
    });
    expect(btn).toBeDefined();
    expect(btn.tagName).toBe('BUTTON');
    // En v6, le label texte est uniquement "Modifier toutes les infos"
    // (le sous-titre listant les champs a été retiré).
    expect(btn.textContent).toMatch(/modifier toutes les infos/i);
  });

  it('CTA « Modifier toutes les infos » : click ouvre le sheet edit (dialog)', () => {
    renderAt('/troupeau/truies/T14');
    // Avant click : pas de dialog visible (IonModal mocké rend rien si !isOpen).
    expect(screen.queryByRole('dialog')).toBeNull();

    const btn = screen.getByRole('button', {
      name: /modifier toutes les infos de la truie t14/i,
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
});
