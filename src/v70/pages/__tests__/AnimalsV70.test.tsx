// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnimalsV70 } from '../AnimalsV70';

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    });
  }
});

afterEach(() => cleanup());

describe('AnimalsV70 — Phase 3 Hub Élevage', () => {
  it('rend H1 "Mes animaux" (décision A : nav=Élevage, h1=Mes animaux)', () => {
    render(<MemoryRouter><AnimalsV70 /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: /mes animaux/i })).toBeTruthy();
  });

  it('rend 5 tabs catégoriels', () => {
    render(<MemoryRouter><AnimalsV70 /></MemoryRouter>);
    ['Truies', 'Verrats', 'Porcelets', 'Bandes', 'Loges'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('rend search bar', () => {
    render(<MemoryRouter><AnimalsV70 /></MemoryRouter>);
    expect(screen.getByLabelText(/rechercher un animal/i)).toBeTruthy();
  });

  it('rend liste truies stubs avec EntityAvatar', () => {
    render(<MemoryRouter><AnimalsV70 /></MemoryRouter>);
    expect(screen.getByText('T-001')).toBeTruthy();
    expect(screen.getByText('T-018')).toBeTruthy();
  });

  it('rend FAB ajout', () => {
    render(<MemoryRouter><AnimalsV70 /></MemoryRouter>);
    expect(screen.getByLabelText(/ajouter une truie/i)).toBeTruthy();
  });
});
