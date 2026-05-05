// @vitest-environment jsdom
/**
 * V70 — ReglagesV70 smoke tests (Phase 3E).
 *
 * Vérifie : header h1 "Réglages", profil Christophe Owner, toggle Mode avancé,
 * 4 items config, 2 items Apprendre.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReglagesV70 } from '../ReglagesV70';
import { UIPreferencesProvider } from '../../context/UIPreferencesContext';

describe('ReglagesV70 — Phase 3E', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
      const store = new Map<string, string>();
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => { store.set(k, String(v)); },
          removeItem: (k: string) => { store.delete(k); },
          clear: () => { store.clear(); },
          key: (i: number) => Array.from(store.keys())[i] ?? null,
          get length() { return store.size; },
        },
        configurable: true,
      });
    }
  });

  afterEach(() => cleanup());

  const renderPage = () =>
    render(
      <MemoryRouter>
        <UIPreferencesProvider>
          <ReglagesV70 />
        </UIPreferencesProvider>
      </MemoryRouter>,
    );

  it('rend titre Réglages', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /réglages/i })).toBeTruthy();
  });

  it('rend Profile card avec Christophe Owner', () => {
    renderPage();
    expect(screen.getByText('Christophe')).toBeTruthy();
    // "Owner" apparaît dans le hero ("Owner · Ferme audit test") et dans le
    // subtitle de l'item Mon équipe ("Owner+Porcher+Admin") → getAllByText
    expect(screen.getAllByText(/owner/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/owner · ferme audit test/i)).toBeTruthy();
  });

  it('rend toggle Mode avancé', () => {
    renderPage();
    expect(screen.getByLabelText(/mode avancé/i)).toBeTruthy();
  });

  it('rend section Configuration avec 4 items', () => {
    renderPage();
    expect(screen.getByText('Ma ferme')).toBeTruthy();
    expect(screen.getByText('Mon équipe')).toBeTruthy();
    expect(screen.getByText(/ressources & stocks/i)).toBeTruthy();
    expect(screen.getByText(/protocoles santé/i)).toBeTruthy();
  });

  it('rend section Apprendre avec encyclopédie + tutoriel', () => {
    renderPage();
    expect(screen.getByText(/encyclopédie porcine/i)).toBeTruthy();
    expect(screen.getByText(/refaire le tutoriel/i)).toBeTruthy();
  });
});
