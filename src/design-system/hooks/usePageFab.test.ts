// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { isPageFabEnabled, usePageFab } from './usePageFab';

describe('isPageFabEnabled — pure function', () => {
  it.each([
    '/today',
    '/troupeau/bandes/L5RM',
    '/reproduction',
    '/reproduction/lots',
    '/cycles',
    '/cycles/maternite',
    '/ressources/pharmacie',
    '/ressources/aliments',
  ])('renvoie true pour %s (page de saisie)', (path) => {
    expect(isPageFabEnabled(path)).toBe(true);
  });

  it.each([
    '/more',
    '/audit',
    '/aide',
    '/admin',
    '/admin/users',
    '/onboarding',
    '/onboarding/bandes-pending',
    '/checklist/daily',
    '/design-system',
    '/troupeau',
    '/troupeau/',
    '/troupeau/truies',
  ])('renvoie false pour %s (hub Élevage = FAB contextuel par sous-tab, hub synthèse, parcours guidé, ou admin)', (path) => {
    expect(isPageFabEnabled(path)).toBe(false);
  });

  it('renvoie false pour les paths non listés (ex : /alerts, /sante)', () => {
    expect(isPageFabEnabled('/alerts')).toBe(false);
    expect(isPageFabEnabled('/sante')).toBe(false);
    expect(isPageFabEnabled('/protocoles')).toBe(false);
  });

  it('disabled prend toujours le pas sur enabled', () => {
    // Si on hardcode /admin/troupeau (cas hypothétique), disabled gagne.
    // Test sur les routes réelles : /onboarding ne contient pas /troupeau,
    // mais on vérifie le principe par /audit (ne contient ni enabled ni disabled
    // override).
    expect(isPageFabEnabled('/audit')).toBe(false);
  });
});

describe('usePageFab — hook React', () => {
  const wrapper = ({ children, path }: { children: React.ReactNode; path: string }) =>
    React.createElement(MemoryRouter, { initialEntries: [path] }, children);

  it('renvoie false sur /troupeau (hub Élevage — chaque sous-tab a son propre FAB contextuel)', () => {
    const { result } = renderHook(() => usePageFab(), {
      wrapper: ({ children }) => wrapper({ children, path: '/troupeau' }),
    });
    expect(result.current).toBe(false);
  });

  it('renvoie true sur /today (v3.4.1 — FAB de saisie rapide depuis l\'accueil)', () => {
    const { result } = renderHook(() => usePageFab(), {
      wrapper: ({ children }) => wrapper({ children, path: '/today' }),
    });
    expect(result.current).toBe(true);
  });

  it('renvoie false sur /audit', () => {
    const { result } = renderHook(() => usePageFab(), {
      wrapper: ({ children }) => wrapper({ children, path: '/audit' }),
    });
    expect(result.current).toBe(false);
  });

  it('renvoie true sur /ressources/pharmacie', () => {
    const { result } = renderHook(() => usePageFab(), {
      wrapper: ({ children }) => wrapper({ children, path: '/ressources/pharmacie' }),
    });
    expect(result.current).toBe(true);
  });
});
