// @vitest-environment jsdom
/**
 * Tests unitaires — TroupeauLogesListView (V6-C)
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Liste filtrée par type (filtre Maternité)
 *   2. Empty state si 0 loges
 *   3. Click sur une loge → navigate(`/troupeau/loges/:id`)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Loge } from '../../types/farm';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const listLogesMock = vi.fn(async (): Promise<Loge[]> => []);
const getLogeContentsMock = vi.fn(async (_id: string) => ({
  truies: [],
  verrats: [],
  bandes: [],
  totalAnimaux: 0,
}));

vi.mock('../../services/supabaseWrites', () => ({
  listLoges: () => listLogesMock(),
  getLogeContents: (id: string) => getLogeContentsMock(id),
  createLoge: vi.fn(),
}));

import TroupeauLogesListView from './TroupeauLogesListView';

const renderView = () =>
  render(
    <MemoryRouter>
      <TroupeauLogesListView />
    </MemoryRouter>,
  );

beforeEach(() => {
  navigateMock.mockReset();
  listLogesMock.mockReset();
  getLogeContentsMock.mockReset();
  getLogeContentsMock.mockImplementation(async () => ({
    truies: [],
    verrats: [],
    bandes: [],
    totalAnimaux: 0,
  }));
});
afterEach(() => cleanup());

describe('TroupeauLogesListView', () => {
  it('affiche le empty state si aucune loge', async () => {
    listLogesMock.mockImplementationOnce(async () => []);
    renderView();
    await waitFor(() =>
      expect(screen.getByText(/Aucune loge configurée/i)).toBeTruthy(),
    );
  });

  it('rend les loges et navigate au click sur une row', async () => {
    const fixtures: Loge[] = [
      { id: 'loge-1', numero: 'M-01', type: 'MATERNITE', capaciteMax: 1, active: true },
      { id: 'loge-2', numero: 'V-01', type: 'GESTANTE', capaciteMax: 8, active: true },
    ];
    listLogesMock.mockImplementation(async () => fixtures);
    renderView();
    await waitFor(() => {
      expect(screen.getByText('M-01')).toBeTruthy();
      expect(screen.getByText('V-01')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('M-01'));
    expect(navigateMock).toHaveBeenCalledWith('/troupeau/loges/loge-1');
  });

  it('filtre la liste par type Maternité', async () => {
    const fixtures: Loge[] = [
      { id: 'loge-1', numero: 'M-01', type: 'MATERNITE', capaciteMax: 1, active: true },
      { id: 'loge-2', numero: 'V-01', type: 'GESTANTE', capaciteMax: 8, active: true },
      { id: 'loge-3', numero: 'M-02', type: 'MATERNITE', capaciteMax: 1, active: true },
    ];
    listLogesMock.mockImplementation(async () => fixtures);
    renderView();
    await waitFor(() => expect(screen.getByText('M-01')).toBeTruthy());
    // Click sur le filtre Maternité (trouve le tab par role+nom)
    const filterBtn = screen.getByRole('tab', { name: /^Maternité$/i });
    fireEvent.click(filterBtn);
    // M-01 et M-02 sont visibles, V-01 ne l'est plus
    expect(screen.getByText('M-01')).toBeTruthy();
    expect(screen.getByText('M-02')).toBeTruthy();
    expect(screen.queryByText('V-01')).toBeNull();
  });
});
