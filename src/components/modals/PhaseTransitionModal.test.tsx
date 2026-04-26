// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach } from 'vitest';
import PhaseTransitionModal from './PhaseTransitionModal';
import type { PendingTransition } from '../../services/phaseEngine';

afterEach(cleanup);

const mockTransition: PendingTransition = {
  bandeId: 'B07',
  label: 'P07',
  fromPhase: 'POST_SEVRAGE',
  toPhase: 'CROISSANCE',
  ageJours: 41,
  poidsEstimeKg: 18,
  joursEnRetard: 0,
  isBloquant: false,
  urgence: 'NORMALE',
  bande: { id: 'B07', idPortee: 'P07', statut: 'Sevrés', vivants: 20, synced: true },
};

vi.mock('@ionic/react', () => ({
  IonModal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
}));

function renderModal(props = {}) {
  const defaults = {
    transition: mockTransition,
    isOpen: true,
    onConfirm: vi.fn(),
    onDismiss: vi.fn(),
  };
  return render(
    <MemoryRouter>
      <PhaseTransitionModal {...defaults} {...props} />
    </MemoryRouter>,
  );
}

describe('PhaseTransitionModal', () => {
  it('affiche le label de la bande et les phases', () => {
    renderModal();
    expect(screen.getByText(/P07/)).toBeDefined();
    expect(screen.getByText(/POST-SEVRAGE/i)).toBeDefined();
    expect(screen.getByText(/CROISSANCE/i)).toBeDefined();
  });

  it('appelle onConfirm au clic Confirmer', () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm });
    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }));
    expect(onConfirm).toHaveBeenCalledWith(mockTransition, undefined);
  });

  it('appelle onDismiss au clic Plus tard', () => {
    const onDismiss = vi.fn();
    renderModal({ onDismiss });
    fireEvent.click(screen.getByRole('button', { name: /plus tard/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("affiche un champ poids pour la transition FINITION→SORTIE", () => {
    const finTransition: PendingTransition = {
      ...mockTransition,
      fromPhase: 'FINITION',
      toPhase: 'SORTIE',
    };
    renderModal({ transition: finTransition });
    expect(screen.getByLabelText(/poids.*kg/i)).toBeDefined();
  });
});
