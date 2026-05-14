// @vitest-environment jsdom
/**
 * Tests unitaires — QuickSaillieBandeForm (V6-B)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Step 1 : ne peut pas avancer avec 0 ou 1 truie sélectionnée (min 2)
 *  [2] Workflow complet : sélection multi → verrat → date → INSERT N saillies
 *  [3] Step 2 : Suivant désactivé tant qu'aucun verrat sélectionné
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';

import type { Truie, Verrat } from '../../types/farm';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/supabaseWrites', () => ({
  insertSaillie: vi.fn().mockResolvedValue({ id: 'saillie-1' }),
  resolveSowIdByCode: vi.fn().mockResolvedValue('uuid-sow-1'),
  resolveBoarIdByCode: vi.fn().mockResolvedValue('uuid-boar-1'),
}));

interface MockFarm {
  truies: Truie[];
  verrats: Verrat[];
  refreshData: ReturnType<typeof vi.fn>;
}
let mockFarm: MockFarm;

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => mockFarm,
}));

// Migration FORM_CONTRACT Phase 3b : le form émet via `useToast()` (context
// global) au lieu d'un `IonToast` local — on mocke le context.
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('@ionic/react', () => ({
  IonToast: ({ isOpen, message }: { isOpen: boolean; message: string }) =>
    isOpen ? <div role="status" data-testid="toast">{message}</div> : null,
  IonModal: ({
    isOpen,
    children,
    'aria-label': ariaLabel,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    'aria-label'?: string;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={ariaLabel}>
        {children}
      </div>
    ) : null,
}));

import { insertSaillie } from '../../services/supabaseWrites';
import QuickSaillieBandeForm from './QuickSaillieBandeForm';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeTruie(id: string, statut = 'Vide'): Truie {
  return {
    id: `truie-${id}`,
    displayId: id,
    boucle: `BCL-${id}`,
    statut: statut as Truie['statut'],
    ration: 0,
    synced: true,
  };
}
function makeVerrat(id: string): Verrat {
  return {
    id: `verrat-${id}`,
    displayId: id,
    boucle: `BCL-${id}`,
    statut: 'Actif',
    ration: 0,
    synced: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFarm = {
    truies: [
      makeTruie('T01', 'Vide'),
      makeTruie('T02', 'En attente saillie'),
      makeTruie('T03', 'Vide'),
      makeTruie('T04', 'Pleine'), // ne doit pas apparaitre
    ],
    verrats: [makeVerrat('V01'), makeVerrat('V02')],
    refreshData: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('QuickSaillieBandeForm', () => {
  it("[1] Step 1 : ne peut pas avancer avec moins de 2 truies", () => {
    render(
      <QuickSaillieBandeForm isOpen onClose={() => undefined} />,
    );
    const next = screen.getByRole('button', { name: /Suivant/i });
    // Aucune sélection
    expect((next as HTMLButtonElement).disabled).toBe(true);

    // Sélectionne 1 seule truie : toujours bloqué
    fireEvent.click(screen.getByLabelText(/Sélectionner T01/i));
    expect((next as HTMLButtonElement).disabled).toBe(true);
  });

  it("[2] Sélection 2+ truies → verrat → date → INSERT N saillies", async () => {
    render(
      <QuickSaillieBandeForm isOpen onClose={() => undefined} />,
    );

    // Step 1 — 3 truies
    fireEvent.click(screen.getByLabelText(/Sélectionner T01/i));
    fireEvent.click(screen.getByLabelText(/Sélectionner T02/i));
    fireEvent.click(screen.getByLabelText(/Sélectionner T03/i));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));

    expect(screen.getByText(/Étape 2 \/ 3/i)).toBeTruthy();

    // Step 2 — verrat V01
    fireEvent.click(screen.getByLabelText(/Sélectionner verrat V01/i));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));

    expect(screen.getByText(/Étape 3 \/ 3/i)).toBeTruthy();

    // Step 3 — submit
    fireEvent.click(
      screen.getByRole('button', { name: /Enregistrer 3 saillies/i }),
    );

    await waitFor(() => {
      expect(insertSaillie).toHaveBeenCalledTimes(3);
    });
    const calls = (insertSaillie as ReturnType<typeof vi.fn>).mock.calls;
    const codes = calls.map(([args]) => args.sow_code_id).sort();
    expect(codes).toEqual(['T01', 'T02', 'T03']);
    // Tous avec le même verrat & date
    for (const [args] of calls) {
      expect(args.boar_code_id).toBe('V01');
      expect(args.statut).toBe('SAILLIE');
      expect(typeof args.date_saillie).toBe('string');
    }
  });

  it("[3] Step 2 : Suivant désactivé tant qu'aucun verrat n'est choisi", () => {
    render(
      <QuickSaillieBandeForm isOpen onClose={() => undefined} />,
    );
    fireEvent.click(screen.getByLabelText(/Sélectionner T01/i));
    fireEvent.click(screen.getByLabelText(/Sélectionner T02/i));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2 active, Suivant disabled tant que verrat = ''
    const next = screen.getByRole('button', { name: /Suivant/i });
    expect((next as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/Sélectionner verrat V02/i));
    expect((next as HTMLButtonElement).disabled).toBe(false);
  });
});
