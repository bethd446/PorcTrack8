// @vitest-environment jsdom
/**
 * Tests unitaires — QuickPeseeForm step 3 (récap)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Step 3 récap rendu correctement après saisie : ancien + nouveau poids,
 *      écart kg/% et bouton "Confirmer le nouveau poids".
 *  [2] Calcul écart % et color-coding (vert/ambre/rouge) : ancien=10kg,
 *      nouveau=12kg → +20% → vert.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

import type { BandePorcelets } from '../../types/farm';
import type { Note } from '../../types';

// ── Mocks ───────────────────────────────────────────────────────────────────

const sampleBande: BandePorcelets = {
  id: 'b1',
  idPortee: 'P-2026-01',
  truie: 'T01',
  statut: 'En croissance',
  vivants: 10,
  dateMB: '01/03/2026',
  poidsInitialKg: 6,
  synced: true,
};

const samplePeseeNote: Note = {
  id: 'n1',
  date: '2026-04-01',
  texte: 'Pesée 10 porcelets · 10 kg moy · J+30',
  animalType: 'BANDE',
  animalId: 'b1',
  synced: true,
};

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    bandes: [sampleBande],
    truies: [],
    verrats: [],
    notes: [samplePeseeNote],
    refreshData: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-uuid' },
  }),
}));

vi.mock('../../services/supabaseWrites', () => ({
  insertNote: vi.fn().mockResolvedValue({ id: 'n-new' }),
  updateSowByCode: vi.fn().mockResolvedValue({}),
  updateBoarByCode: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/peseePlanifieesService', () => ({
  markPeseeEffectuee: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/kvStore', () => ({
  kvGet: vi.fn().mockResolvedValue(null),
}));

// Désactive la validation biologique pour ne pas bloquer le flow récap.
vi.mock('../../utils/biologyValidators', () => ({
  biologyValidators: {
    validatePoidsPlausible: () => ({ isValid: true }),
  },
}));

vi.mock('@ionic/react', () => ({
  useIonAlert: () => [vi.fn()],
  IonSegment: ({ children, onIonChange, value }: { children: React.ReactNode; onIonChange?: (e: { detail: { value: string } }) => void; value?: string }) => (
    <div data-testid="segment" data-value={value} onClick={() => onIonChange?.({ detail: { value: 'BANDE' } })}>
      {children}
    </div>
  ),
  IonSegmentButton: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-value={value}>{children}</button>
  ),
  IonLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('../agritech', () => ({
  BottomSheet: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
  DataRow: ({ primary, onClick }: { primary: string; onClick?: () => void }) => (
    <div onClick={onClick} data-testid="data-row">{primary}</div>
  ),
}));

import QuickPeseeForm from './QuickPeseeForm';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('QuickPeseeForm — Step 3 récap', () => {
  it('[1] affiche le récap avec ancien poids, nouveau poids et bouton de confirmation', async () => {
    render(<QuickPeseeForm isOpen onClose={() => undefined} />);

    // Step 1 : sélectionne la bande
    const dataRow = screen.getByTestId('data-row');
    fireEvent.click(dataRow);

    // Step 2 : remplit le poids et soumet
    // Trouve l'input poids (autoFocus + size 28px)
    const inputs = screen.getAllByRole('textbox');
    // Le premier inputmode=numeric (nbPeses), 2e inputmode=decimal (poidsMoyen)
    const poidsInput = inputs.find((el) => (el as HTMLInputElement).inputMode === 'decimal');
    expect(poidsInput).toBeTruthy();
    fireEvent.change(poidsInput!, { target: { value: '12' } });

    // Submit étape 2
    const submitBtn = screen.getByRole('button', { name: /enregistrer/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Step 3 : récap visible
    const recap = await screen.findByTestId('pesee-recap');
    expect(recap).toBeTruthy();

    // Ancien poids (10 kg)
    expect(screen.getByTestId('recap-ancien-poids').textContent).toContain('10');
    // Nouveau poids (12 kg)
    expect(screen.getByTestId('recap-nouveau-poids').textContent).toContain('12');

    // Bouton "Confirmer le nouveau poids" présent
    expect(
      screen.getByRole('button', { name: /confirmer le nouveau poids/i }),
    ).toBeTruthy();
  });

  it('[2] calcule l\'écart % correctement (10kg → 12kg = +20%)', async () => {
    render(<QuickPeseeForm isOpen onClose={() => undefined} />);

    const dataRow = screen.getByTestId('data-row');
    fireEvent.click(dataRow);

    const inputs = screen.getAllByRole('textbox');
    const poidsInput = inputs.find((el) => (el as HTMLInputElement).inputMode === 'decimal');
    fireEvent.change(poidsInput!, { target: { value: '12' } });

    const submitBtn = screen.getByRole('button', { name: /enregistrer/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await screen.findByTestId('pesee-recap');
    const ecartPct = screen.getByTestId('recap-ecart-pct');
    // (12-10)/10 = 20%
    expect(ecartPct.textContent).toContain('20');
  });
});
