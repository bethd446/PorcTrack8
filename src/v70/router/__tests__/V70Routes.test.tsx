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
    // P3A : page TodayV70 réelle livrée → h1 "Aujourd'hui" simple (sans "V70 Phase 3")
    expect(screen.getByRole('heading', { level: 1, name: /aujourd'hui/i })).toBeTruthy();
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
    // P3E : ReglagesV70 réelle livrée → h1 "Réglages"
    expect(screen.getByRole('heading', { level: 1, name: /réglages/i })).toBeTruthy();
  });

  it('redirige /cycles/maternite vers /reproduction?phase=maternite', () => {
    render(
      <MemoryRouter initialEntries={['/cycles/maternite']}>
        <V70Routes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /reproduction/i })).toBeTruthy();
  });

  it('redirige /cycles (sans suffixe) vers /reproduction', () => {
    render(
      <MemoryRouter initialEntries={['/cycles']}>
        <V70Routes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /reproduction/i })).toBeTruthy();
  });

  it('redirige /pilotage/finances vers /performance', () => {
    render(
      <MemoryRouter initialEntries={['/pilotage/finances']}>
        <V70Routes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /performance/i })).toBeTruthy();
  });

  it('redirige /repro vers /reproduction', () => {
    render(
      <MemoryRouter initialEntries={['/repro']}>
        <V70Routes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /reproduction/i })).toBeTruthy();
  });

  it('redirige /aide vers /reglages/encyclopedie', () => {
    render(
      <MemoryRouter initialEntries={['/aide']}>
        <V70Routes />
      </MemoryRouter>,
    );
    // P3E : EncyclopediaPage réelle livrée → h1 "Encyclopédie porcine"
    expect(screen.getByRole('heading', { level: 1, name: /encyclopédie porcine/i })).toBeTruthy();
  });

  it('redirige /more vers /reglages', () => {
    render(
      <MemoryRouter initialEntries={['/more']}>
        <V70Routes />
      </MemoryRouter>,
    );
    // P3E : ReglagesV70 réelle livrée → h1 "Réglages"
    expect(screen.getByRole('heading', { level: 1, name: /réglages/i })).toBeTruthy();
  });
});
