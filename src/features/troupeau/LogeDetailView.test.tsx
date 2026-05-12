// @vitest-environment jsdom
/**
 * Tests unitaires — LogeDetailView (V6-C)
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Occupation rendue (truies, verrats, bandes affichés)
 *   2. Bouton "Désactiver" déclenche presentAlert (confirm) + deactivateLoge
 *      au handler
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Loge } from '../../types/farm';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const presentAlertMock = vi.fn();

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonToast: () => null,
  useIonAlert: () => [presentAlertMock],
}));

const fakeLoge: Loge = {
  id: 'loge-test',
  numero: 'M-01',
  type: 'MATERNITE',
  batiment: 'Bât. A',
  capaciteMax: 1,
  active: true,
};

const listLogesMock = vi.fn(async (): Promise<Loge[]> => [fakeLoge]);
const getLogeContentsMock = vi.fn(async (_id: string) => ({
  truies: [
    {
      id: 'sow-1',
      displayId: 'T05',
      boucle: 'FR-0005',
      nom: 'Bella',
      statut: 'En maternité',
      ration: 6,
      synced: true,
    },
  ],
  verrats: [],
  bandes: [],
  totalAnimaux: 1,
}));
const deactivateLogeMock = vi.fn(async (_id: string) => undefined);

vi.mock('../../services/supabaseWrites', () => ({
  listLoges: () => listLogesMock(),
  getLogeContents: (id: string) => getLogeContentsMock(id),
  deactivateLoge: (id: string) => deactivateLogeMock(id),
  // V73 — required by PhotoUpload/PhotoGallery (now used in LogeDetailView)
  getCurrentFarmIdRef: () => null,
}));

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        or: () => ({
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  },
}));

import LogeDetailView from './LogeDetailView';

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/troupeau/loges/:id" element={<LogeDetailView />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigateMock.mockReset();
  presentAlertMock.mockReset();
  deactivateLogeMock.mockClear();
});
afterEach(() => cleanup());

describe('LogeDetailView', () => {
  it('rend la loge avec son occupation (truie listée)', async () => {
    renderAt('/troupeau/loges/loge-test');
    await waitFor(() =>
      expect(screen.getByTestId('loge-detail-view')).toBeTruthy(),
    );
    // Le numéro apparaît dans le breadcrumb + le hero — on cherche le h1
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('M-01');
    expect(screen.getAllByText(/Maternité/i).length).toBeGreaterThan(0);
    // Truie occupante visible — v3.4.7+ : boucle prioritaire (FR-0005)
    // au lieu du displayId (T05). La fixture a les 2 champs renseignés.
    await waitFor(() =>
      expect(screen.getByText(/FR-0005/)).toBeTruthy(),
    );
  });

  it('le bouton Désactiver appelle presentAlert et le handler appelle deactivateLoge', async () => {
    renderAt('/troupeau/loges/loge-test');
    await waitFor(() =>
      expect(screen.getByTestId('deactivate-button')).toBeTruthy(),
    );
    fireEvent.click(screen.getByTestId('deactivate-button'));
    expect(presentAlertMock).toHaveBeenCalledTimes(1);
    // Récupère le handler "Désactiver" passé à presentAlert et invoque-le
    const args = presentAlertMock.mock.calls[0]?.[0] as {
      buttons?: Array<{ text: string; handler?: () => void }>;
    };
    const destructive = args?.buttons?.find((b) => b.text === 'Désactiver');
    expect(destructive).toBeTruthy();
    await act(async () => {
      destructive?.handler?.();
      // Laisse les promesses internes se résoudre
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(deactivateLogeMock).toHaveBeenCalledWith('loge-test');
  });
});
