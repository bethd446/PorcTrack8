// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [
      {
        id: 'T01',
        displayId: 'T01',
        boucle: '12345',
        nom: 'Rose',
        statut: 'Pleine',
        ration: 2,
        synced: true,
      },
    ],
    verrats: [
      {
        id: 'V01',
        displayId: 'V01',
        boucle: '99001',
        nom: 'Titan',
        statut: 'Actif',
        ration: 3,
        synced: true,
      },
    ],
    bandes: [],
  }),
}));

import GlobalSearch from './GlobalSearch';

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
});

function renderUI(open: boolean, onClose: () => void = vi.fn()) {
  return render(
    <MemoryRouter>
      <GlobalSearch open={open} onClose={onClose} />
    </MemoryRouter>,
  );
}

describe('GlobalSearch', () => {
  it('ne rend rien quand open=false', () => {
    renderUI(false);
    expect(screen.queryByRole('dialog', { name: /Recherche globale/i })).toBeNull();
  });

  it('rend le dialog avec input focus quand open=true', () => {
    renderUI(true);
    const dialog = screen.getByRole('dialog', { name: /Recherche globale/i });
    expect(dialog).toBeDefined();
    const input = screen.getByLabelText('Texte de recherche') as HTMLInputElement;
    expect(input).toBeDefined();
  });

  it('frappe une boucle → résultat affiché', async () => {
    const user = userEvent.setup();
    renderUI(true);
    const input = screen.getByLabelText('Texte de recherche') as HTMLInputElement;
    await user.type(input, '12345');
    expect(await screen.findByText('12345')).toBeDefined();
    expect(screen.getByText(/Rose/)).toBeDefined();
  });

  it('click sur résultat → navigate appelé puis fermeture', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderUI(true, onClose);
    const input = screen.getByLabelText('Texte de recherche') as HTMLInputElement;
    await user.type(input, '12345');
    const option = await screen.findByRole('option', { selected: true });
    fireEvent.click(option);
    expect(navigateMock).toHaveBeenCalledWith('/troupeau/truies/T01');
    expect(onClose).toHaveBeenCalled();
  });

  it('Échap → onClose', async () => {
    const onClose = vi.fn();
    renderUI(true, onClose);
    const dialog = screen.getByRole('dialog', { name: /Recherche globale/i });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
