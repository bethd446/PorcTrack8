// @vitest-environment jsdom
/**
 * Tests unitaires — TruieDetailView
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie la page détail d'une truie (`/troupeau/truies/:id`) :
 *   - Titre « TRUIE » + sous-titre displayId
 *   - Hero affiche TruieIcon + displayId + chip statut (tone gold pour
 *     « Maternité »)
 *   - Section « Identité » rend la boucle
 *   - Section « Reproduction » rend dateMBPrevue (format FR)
 *   - Cas d'erreur : truie inexistante → « TRUIE INTROUVABLE »
 *   - Bouton Edit3 (aria-label « Éditer la truie T14 »)
 *
 * Mocks :
 *   - `useFarm` → renvoie 2 truies fixtures + getHealthForAnimal vide
 *   - `useParams` (react-router-dom) → id sélectionné via MemoryRouter
 *   - `@ionic/react` → passthrough (évite les web-components)
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Truie } from '../../types/farm';

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

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [truieT14, truieT07],
    verrats: [],
    bandes: [],
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
  // BottomSheet utilise IonModal : en fermé (isOpen=false) on ne rend rien.
  IonModal: ({
    isOpen,
    children,
  }: {
    isOpen?: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div role="dialog">{children}</div> : null),
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

  it('affiche le titre « TRUIE » et le sous-titre T14', () => {
    renderAt('/troupeau/truies/T14');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('TRUIE');
    // Le displayId apparaît dans le sous-titre du header.
    expect(document.body.textContent).toContain('T14');
  });

  it('rend le hero avec TruieIcon et le displayId', () => {
    renderAt('/troupeau/truies/T14');
    // Hero card affiche displayId (plusieurs fois possible : subtitle header +
    // aria-label edit). Au moins une présence.
    const t14 = screen.getAllByText('T14');
    expect(t14.length).toBeGreaterThanOrEqual(1);
    // TruieIcon est rendu en SVG (aria-hidden), on vérifie qu'au moins un
    // svg existe dans le hero card.
    expect(document.querySelector('svg')).not.toBeNull();
  });

  it('affiche la chip de statut « Maternité » avec le ton gold', () => {
    renderAt('/troupeau/truies/T14');
    // Chip rend <span class="chip chip--gold ...">Maternité</span>
    const chip = screen.getByText('Maternité');
    expect(chip.tagName.toLowerCase()).toBe('span');
    expect(chip.className).toContain('chip--gold');
  });

  it('section « Identité » affiche la boucle FR-0014-42', () => {
    renderAt('/troupeau/truies/T14');
    const identite = screen.getByRole('region', { name: /identité/i });
    expect(within(identite).getByText('FR-0014-42')).toBeDefined();
    expect(within(identite).getByText('Boucle')).toBeDefined();
  });

  it('section « Reproduction » affiche la date de mise-bas prévue au format FR', () => {
    renderAt('/troupeau/truies/T14');
    const repro = screen.getByRole('region', { name: /reproduction/i });
    // formatDate("2026-05-10") → "10/05/2026"
    expect(within(repro).getByText('10/05/2026')).toBeDefined();
    expect(within(repro).getByText('Mise-bas prévue')).toBeDefined();
  });

  it('truie introuvable : affiche « TRUIE INTROUVABLE » + message', () => {
    renderAt('/troupeau/truies/T99');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('TRUIE INTROUVABLE');
    expect(document.body.textContent).toMatch(
      /cette truie n'existe pas/i,
    );
  });

  it('expose un bouton Edit3 avec aria-label « Éditer la truie T14 »', () => {
    renderAt('/troupeau/truies/T14');
    const editBtn = screen.getByLabelText('Éditer la truie T14');
    expect(editBtn.tagName).toBe('BUTTON');
    // Le bouton doit contenir l'icône Edit3 (svg lucide)
    expect(editBtn.querySelector('svg')).not.toBeNull();
  });

  it('affiche les 4 actions rapides (Soin · Pesée · Saillie · Note)', () => {
    renderAt('/troupeau/truies/T14');
    expect(screen.getByRole('button', { name: 'Soin' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pesée' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Saillie' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Note' })).toBeDefined();
  });
});
