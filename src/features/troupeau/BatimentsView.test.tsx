// @vitest-environment jsdom
/**
 * Tests unitaires — BatimentsView
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie que la vue isométrique des bâtiments :
 *   - Affiche le titre « Bâtiments » via AgritechHeader
 *   - Rend le SVG IsoBarn (role="img")
 *   - Affiche au moins une loge par phase (Maternité / Post-sevrage / Croissance)
 *   - Expose le bouton « Retour » (backTo=/troupeau)
 *
 * React Testing Library + jsdom (override via pragma `@vitest-environment jsdom`).
 * On mocke `useFarm` pour ne pas déclencher d'appels Google Sheets au montage.
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ───────────────────────────────────────────────────────────────────
// FarmContext est indirectement tiré par AgritechNav (import lazy). On stub
// `useFarm` pour éviter l'enchaînement de providers + les effets réseau.
vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [],
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

// Ionic composants → passthrough (évite l'import du web-component registry)
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import BatimentsView from './BatimentsView';

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/troupeau/batiments']}>
      <BatimentsView />
    </MemoryRouter>,
  );
}

describe('BatimentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Vitest n'auto-cleanup pas entre tests → sans ça, les composants
    // s'accumulent dans `document.body` et les assertions par rôle
    // matchent plusieurs instances.
    cleanup();
  });

  it('affiche le titre « Bâtiments »', () => {
    renderView();
    // AgritechHeader rend le titre tel quel ("Bâtiments") — le CSS
    // applique text-transform:uppercase pour l'affichage.
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toMatch(/B[aâ]timents/i);
  });

  it('rend le SVG IsoBarn (role="img") avec un aria-label descriptif', () => {
    renderView();
    const svg = screen.getByRole('img', { name: /isométrique/i });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-label')).toMatch(/isométrique/i);
  });

  it('affiche au moins une loge Maternité, Post-sevrage et Croissance', () => {
    renderView();
    // IsoBarn expose chaque bâtiment via role="button" + aria-label=label
    // (ex: "Maternité 1", "Post-sevrage 1 · 23 porcelets", "Croissance · Mâles").
    const maternite = screen.getAllByRole('button', { name: /Maternit[eé]/i });
    const postSevrage = screen.getAllByRole('button', { name: /Post-sevrage/i });
    const croissance = screen.getAllByRole('button', { name: /Croissance/i });

    expect(maternite.length).toBeGreaterThanOrEqual(1);
    expect(postSevrage.length).toBeGreaterThanOrEqual(1);
    expect(croissance.length).toBeGreaterThanOrEqual(1);
  });

  it('expose un bouton « Retour » (backTo=/troupeau)', () => {
    renderView();
    // AgritechHeader monte un <button aria-label="Retour"> quand `backTo`
    // est fourni.
    const back = screen.getByLabelText('Retour');
    expect(back.tagName).toBe('BUTTON');
  });
});
