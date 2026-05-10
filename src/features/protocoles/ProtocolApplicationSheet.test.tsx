// @vitest-environment jsdom
import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { BandePorcelets } from '../../types/farm';
import type { ProtocolDetail } from './protocolsData';

// IonModal de Ionic n'est pas trivial à monter dans jsdom → on remplace par
// un div passthrough qui ignore `isOpen` (le composant teste sa propre logique
// indépendamment du shell modal).
vi.mock('@ionic/react', async () => {
  return {
    IonModal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

const showToast = vi.fn();
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

let mockBandes: BandePorcelets[] = [];
let mockProfile: { full_name: string | null } | null = null;

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({ bandes: mockBandes }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile: mockProfile }),
}));

import { ProtocolApplicationSheet } from './ProtocolApplicationSheet';

const PROTOCOL: ProtocolDetail = {
  id: 'p1',
  title: 'Vaccin Mycoplasma J35',
  category: 'VACCIN',
  phase: 'POST_SEVRAGE',
  shortDescription: '',
  why: '',
  when: '',
  posology: [
    { phase: 'Porcelet', dose: '2 mL', voie: 'IM' },
  ],
  materiel: [],
  controles: [],
} as unknown as ProtocolDetail;

function makeBande(id: string, vivants: number, dateMB?: string): BandePorcelets {
  return {
    id,
    idPortee: id,
    statut: 'Sevrés',
    vivants,
    dateMB,
    poidsInitialKg: 7,
    synced: true,
  } as BandePorcelets;
}

beforeEach(() => {
  showToast.mockReset();
  mockBandes = [];
  mockProfile = null;
});

afterEach(() => {
  cleanup();
});

describe('ProtocolApplicationSheet', () => {
  it('affiche un empty state quand aucune bande active n’est disponible', () => {
    mockBandes = [];
    render(
      <ProtocolApplicationSheet
        isOpen
        protocol={PROTOCOL}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText(/Aucune bande disponible/i)).toBeTruthy();
    // L'étape 1 ne doit pas être affichée en empty state.
    expect(screen.queryByText(/Étape 1/)).toBeNull();
  });

  it('exclut les bandes RECAP et celles à 0 vivants', () => {
    mockBandes = [
      makeBande('B-2026-04', 12, '2026-04-01'),
      { ...makeBande('B-RECAP', 100, '2026-03-01'), statut: 'RECAP' } as BandePorcelets,
      makeBande('B-EMPTY', 0, '2026-04-10'),
    ];
    render(
      <ProtocolApplicationSheet
        isOpen
        protocol={PROTOCOL}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText('B-2026-04')).toBeTruthy();
    expect(screen.queryByText('B-RECAP')).toBeNull();
    expect(screen.queryByText('B-EMPTY')).toBeNull();
  });

  it('calcule la posologie avec vivants réels (12 × 2 mL = 24 mL)', () => {
    mockBandes = [makeBande('B-2026-04', 12, '2026-04-01')];
    render(
      <ProtocolApplicationSheet
        isOpen
        protocol={PROTOCOL}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText('12 porcelets × 2 mL = 24 mL')).toBeTruthy();
  });

  it('recalcule la posologie quand on change de bande sélectionnée', () => {
    mockBandes = [
      makeBande('B-A', 10, '2026-04-01'),
      makeBande('B-B', 5, '2026-04-15'),
    ];
    render(
      <ProtocolApplicationSheet
        isOpen
        protocol={PROTOCOL}
        onDismiss={() => {}}
      />,
    );
    // Tri par âge croissant : B-B (plus jeune, dateMB plus récente) doit
    // apparaître en premier et être sélectionné par défaut.
    expect(screen.getByText('5 porcelets × 2 mL = 10 mL')).toBeTruthy();

    fireEvent.click(screen.getByText('B-A'));
    expect(screen.getByText('10 porcelets × 2 mL = 20 mL')).toBeTruthy();
  });

  it('affiche le nom de l’opérateur depuis useAuth().profile.full_name', () => {
    mockBandes = [makeBande('B-A', 8, '2026-04-01')];
    mockProfile = { full_name: 'Christophe Liégeois' };
    render(
      <ProtocolApplicationSheet
        isOpen
        protocol={PROTOCOL}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText('Christophe Liégeois')).toBeTruthy();
  });

  it('fallback opérateur "Opérateur" si profile null', () => {
    mockBandes = [makeBande('B-A', 8, '2026-04-01')];
    mockProfile = null;
    render(
      <ProtocolApplicationSheet
        isOpen
        protocol={PROTOCOL}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText('Opérateur')).toBeTruthy();
  });
});
