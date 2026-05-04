// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { V70Routes } from '../V70Routes';

// Vitest 4 + jsdom : localStorage stub absent. UIPreferencesProvider
// l'utilise → on monte un mock minimal en mémoire pour éviter le crash.
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

describe('V70Routes — Phase 2', () => {
  it('rend la page Today par défaut sur /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <V70Routes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /aujourd'hui.*v70 phase 3/i })).toBeTruthy();
  });

  it('rend BottomNav avec 5 onglets', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <V70Routes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('tab', { name: /aujourd'hui/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /élevage/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /repro/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /performance/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /réglages/i })).toBeTruthy();
  });

  it('redirige /plus vers /reglages', () => {
    render(
      <MemoryRouter initialEntries={['/plus']}>
        <V70Routes />
      </MemoryRouter>,
    );
    expect(screen.getByText(/réglages.*v70 phase 3/i)).toBeTruthy();
  });
});
