// @vitest-environment jsdom
/**
 * Tests d'intégration — ReproductionLotsView
 * ════════════════════════════════════════════════════════════════════════════
 *  1. Aucun batch → empty state affiché
 *  2. 3 batches dont 1 GESTATION → liste rendue
 *  3. Filtre "Gestation" → seul batch GESTATION visible + compteur cohérent
 *  4. Click chip truie → navigate `/troupeau/truies/{id}`
 *  5. Header info présent : "{nbTruies} truies · {nbPortees} portées"
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type {
  ReproBatch,
  ReproBatchStatut,
} from '../../services/reproductionBatchAnalyzer';
import type { Truie } from '../../types/farm';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeTruie(o: Partial<Truie> & { id: string }): Truie {
  return {
    id: o.id,
    displayId: o.id,
    boucle: `FR-${o.id}`,
    statut: o.statut ?? 'Vide',
    ration: 3,
    synced: true,
    ...o,
  };
}

function makeBatch(opts: {
  id: string;
  statut: ReproBatchStatut;
  truies: Truie[];
  porceletsVivants?: number;
  nbPortees?: number;
  progression?: ReproBatch['progression'];
}): ReproBatch {
  return {
    id: opts.id,
    windowStart: '2026-04-13',
    windowEnd: '2026-04-17',
    windowMedian: '2026-04-15',
    saillies: opts.truies.map(t => ({
      truieId: t.id,
      truieBoucle: t.boucle,
      dateSaillie: '15/04/2026',
      verratId: 'V01',
    })),
    truies: opts.truies,
    progression: opts.progression ?? {
      saillies: opts.truies.length,
      echos: 0,
      miseBas: 0,
      sevrages: 0,
    },
    porceletsVivants: opts.porceletsVivants ?? 0,
    nbPortees: opts.nbPortees ?? 0,
    statut: opts.statut,
  };
}

// ─── Mocks ──────────────────────────────────────────────────────────────────

const navigateMock = vi.fn();
let mockBatches: ReproBatch[] = [];
let mockTruies: Truie[] = [];

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: mockTruies,
    saillies: [],
    bandes: [],
    verrats: [],
  }),
}));

vi.mock('../../services/reproductionBatchAnalyzer', () => ({
  buildReproBatches: () => mockBatches,
  formatBatchLabel: (batch: ReproBatch) =>
    `Vague du 15/04/2026 — ${batch.saillies.length} saillies`,
  findBandeForSaillie: () => null,
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import ReproductionLotsView from './ReproductionLotsView';

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/reproduction/lots']}>
      <ReproductionLotsView />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ReproductionLotsView', () => {
  beforeEach(() => {
    mockBatches = [];
    mockTruies = [];
  });

  it('[1] aucun batch → empty state affiché avec CTA', () => {
    mockBatches = [];
    renderView();
    expect(screen.getByText(/Aucun lot/i)).toBeTruthy();
    expect(
      screen.getByText(/Aucune saillie enregistrée/i),
    ).toBeTruthy();
    const cta = screen.getByRole('button', { name: /Aller à Reproduction/i });
    expect(cta).toBeTruthy();
    fireEvent.click(cta);
    expect(navigateMock).toHaveBeenCalledWith('/reproduction');
  });

  it('[2] 3 batches dont 1 GESTATION → liste rendue', () => {
    const t1 = makeTruie({ id: 'T01' });
    const t2 = makeTruie({ id: 'T02' });
    const t3 = makeTruie({ id: 'T03' });
    mockBatches = [
      makeBatch({ id: 'b1', statut: 'EN_SAILLIE', truies: [t1] }),
      makeBatch({ id: 'b2', statut: 'GESTATION', truies: [t2] }),
      makeBatch({ id: 'b3', statut: 'TERMINE', truies: [t3] }),
    ];
    mockTruies = [t1, t2, t3];
    renderView();
    // 3 cards titre "Vague du..."
    const titles = screen.getAllByText(/Vague du 15\/04\/2026/i);
    expect(titles.length).toBe(3);
    // Badge Gestation présent
    expect(screen.getByText(/^Gestation$/i)).toBeTruthy();
  });

  it('[3] filtre "Gestation" → 1 seul batch visible + compteur cohérent', () => {
    const t1 = makeTruie({ id: 'T01' });
    const t2 = makeTruie({ id: 'T02' });
    const t3 = makeTruie({ id: 'T03' });
    mockBatches = [
      makeBatch({ id: 'b1', statut: 'EN_SAILLIE', truies: [t1] }),
      makeBatch({ id: 'b2', statut: 'GESTATION', truies: [t2] }),
      makeBatch({ id: 'b3', statut: 'TERMINE', truies: [t3] }),
    ];
    mockTruies = [t1, t2, t3];
    renderView();

    // Compteur dans chip filtre : "Gestation (1)"
    const gestationChip = screen.getByRole('button', { name: /Gestation \(1\)/i });
    expect(gestationChip).toBeTruthy();
    // Compteur "Tous (3)"
    expect(screen.getByRole('button', { name: /Tous \(3\)/i })).toBeTruthy();

    // Activer filtre Gestation
    fireEvent.click(gestationChip);

    // Une seule carte reste visible
    const titles = screen.getAllByText(/Vague du 15\/04\/2026/i);
    expect(titles.length).toBe(1);
  });

  it('[4] click chip truie → navigate /troupeau/truies/{id}', () => {
    const t1 = makeTruie({ id: 'T42', nom: 'Rose' });
    mockBatches = [makeBatch({ id: 'b1', statut: 'GESTATION', truies: [t1] })];
    mockTruies = [t1];
    renderView();

    const chip = screen.getByRole('button', { name: /T42 \(Rose\)/i });
    fireEvent.click(chip);
    expect(navigateMock).toHaveBeenCalledWith('/troupeau/truies/T42');
  });

  it('[5] header info : "{nbTruies} truies · {nbPortees} portées · {porcelets} porcelets"', () => {
    const t1 = makeTruie({ id: 'T01' });
    const t2 = makeTruie({ id: 'T02' });
    const t3 = makeTruie({ id: 'T03' });
    mockBatches = [
      makeBatch({
        id: 'b1',
        statut: 'MATERNITE',
        truies: [t1, t2, t3],
        nbPortees: 2,
        porceletsVivants: 22,
      }),
    ];
    mockTruies = [t1, t2, t3];
    renderView();

    expect(
      screen.getByText(/3 truies · 2 portées · 22 porcelets/i),
    ).toBeTruthy();
  });
});
