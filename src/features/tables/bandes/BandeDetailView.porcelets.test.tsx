// @vitest-environment jsdom
/**
 * Tests unitaires — BandeDetailView · section "Porcelets de la bande" (V25)
 * ════════════════════════════════════════════════════════════════════════
 * Focus : rendu de la section et du compteur, empty state avec CTA.
 * Toutes les dépendances réseau / contextes sont mockées.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { BandePorcelets, PorceletIndividuel } from '../../../types/farm';
import type { AggregatedBande } from './types';

// ── Mocks lourds ────────────────────────────────────────────────────────────

vi.mock('@ionic/react', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    IonContent: passthrough,
    IonModal: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
      isOpen ? <div role="dialog">{children}</div> : null,
    IonSegment: passthrough,
    IonSegmentButton: passthrough,
    IonLabel: passthrough,
    IonSpinner: () => <span aria-label="loading" />,
    IonToast: ({ isOpen, message }: { isOpen: boolean; message: string }) =>
      isOpen ? <div role="status">{message}</div> : null,
  };
});

// V73 — PhotoStrip remplacé par PhotoUpload + PhotoGallery dans BandeDetailView
vi.mock('../../../v70/components/v70/PhotoUpload', () => ({
  default: () => <div data-testid="photo-upload" />,
}));
vi.mock('../../../v70/components/v70/PhotoGallery', () => ({
  default: () => <div data-testid="photo-gallery" />,
}));

vi.mock('../../../components/design/NotesTimeline', () => ({
  default: () => <div data-testid="notes-timeline" />,
}));

vi.mock('../../../components/bande/BandeCroissanceCard', () => ({
  default: () => <div data-testid="croissance-card" />,
}));

vi.mock('../../../components/forms/QuickHealthForm', () => ({
  default: () => <div data-testid="health-form" />,
}));

vi.mock('../../../components/forms/QuickNoteForm', () => ({
  default: () => <div data-testid="note-form" />,
}));

vi.mock('../../../components/forms/QuickEditBandeForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="edit-bande-form" /> : null,
}));

vi.mock('../../../components/forms/QuickMoveSubjectForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="move-subject-form" /> : null,
}));

vi.mock('../../../components/forms/QuickAddPorceletForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="add-porcelet-form" /> : null,
}));

vi.mock('../../../components/forms/QuickEditPorceletForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="edit-porcelet-form" /> : null,
}));

vi.mock('../../../components/forms/QuickSplitBandeForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="split-bande-form" /> : null,
}));

vi.mock('../../../components/forms/QuickHealthLogPorceletForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="health-log-porcelet-form" /> : null,
}));

const mockListPorcelets = vi.fn<(batchId: string) => Promise<PorceletIndividuel[]>>();
vi.mock('../../../services/supabaseWrites', () => ({
  getBatchSources: vi.fn().mockResolvedValue([]),
  getLogeContents: vi.fn().mockResolvedValue({ truies: [], verrats: [], bandes: [], totalAnimaux: 0 }),
  listLoges: vi.fn().mockResolvedValue([]),
  listPorceletsByBatch: (batchId: string) => mockListPorcelets(batchId),
}));

vi.mock('../../../services/supabaseService', () => ({
  getJournalSante: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getNotesTerrain: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

const mockGetBandeById = vi.fn<(id: string) => BandePorcelets | undefined>();
vi.mock('../../../context/FarmContext', () => ({
  useFarm: () => ({
    notes: [],
    getBandeById: mockGetBandeById,
    bandes: [],
  }),
}));

// Import APRÈS les mocks
import BandeDetailView from './BandeDetailView';

const baseAggregated: AggregatedBande = {
  id: 'b-1',
  count: 1,
  truie: 'T01',
  boucleMere: 'BCL-0001',
  dateMB: '01/04/2026',
  nv: 10,
  morts: 1,
  vivants: 9,
  age: 30,
  status: 'Sous mère',
  hasAlert: false,
  rows: [],
};

const baseBande: BandePorcelets = {
  id: 'b-1',
  idPortee: '26-T1-01',
  truie: 'T01',
  statut: 'Sous mère',
  poidsInitialKg: 1.4,
  nv: 10,
  morts: 1,
  vivants: 9,
  synced: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBandeById.mockReturnValue(baseBande);
});

afterEach(() => {
  cleanup();
});

function renderView() {
  const result = render(
    <MemoryRouter>
      <BandeDetailView
        bande={baseAggregated}
        header={[]}
        meta={null}
        onClose={() => undefined}
        onRefresh={() => undefined}
      />
    </MemoryRouter>,
  );
  // V43.6 — La section Porcelets vit désormais dans l'onglet "Détails".
  // On bascule l'onglet pour rester compatible avec les tests historiques.
  const detailsTab = screen.getByRole('tab', { name: /détails/i });
  fireEvent.click(detailsTab);
  return result;
}

describe('BandeDetailView — section Porcelets', () => {
  it('affiche l\'empty state + CTA quand aucun porcelet', async () => {
    mockListPorcelets.mockResolvedValueOnce([]);
    renderView();

    const section = await screen.findByTestId('bande-section-porcelets');
    expect(section).toBeTruthy();
    expect(section.textContent).toMatch(/Aucun porcelet numéroté/i);
    expect(section.textContent).toMatch(/suivi sanitaire détaillé/i);
    // CTA "Numéroter les porcelets"
    expect(screen.getByRole('button', { name: /numéroter les porcelets/i })).toBeTruthy();
  });

  it('affiche la liste des porcelets + le compteur', async () => {
    mockListPorcelets.mockResolvedValueOnce([
      {
        id: 'p1',
        batchId: 'b-1',
        boucle: 'P-001',
        sexe: 'M',
        statut: 'VIVANT',
        poidsCourantKg: 1.5,
      },
      {
        id: 'p2',
        batchId: 'b-1',
        boucle: 'P-002',
        sexe: 'F',
        statut: 'MALADE',
      },
    ]);
    renderView();

    await waitFor(() => {
      const section = screen.getByTestId('bande-section-porcelets');
      expect(section.textContent).toContain('P-001');
      expect(section.textContent).toContain('P-002');
    });

    const section = screen.getByTestId('bande-section-porcelets');
    // Compteur (2)
    expect(section.textContent).toMatch(/\(2\)/);
    // Statuts présents
    expect(section.textContent).toContain('VIVANT');
    expect(section.textContent).toContain('MALADE');
  });

  it('affiche le bouton "Ajouter porcelet" même quand la liste est non vide', async () => {
    mockListPorcelets.mockResolvedValueOnce([
      {
        id: 'p1',
        batchId: 'b-1',
        boucle: 'P-001',
        sexe: 'M',
        statut: 'VIVANT',
      },
    ]);
    renderView();
    await waitFor(() => {
      expect(screen.getByLabelText(/ajouter un porcelet/i)).toBeTruthy();
    });
  });
});
