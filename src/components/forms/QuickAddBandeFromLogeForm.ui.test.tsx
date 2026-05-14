// @vitest-environment jsdom
/**
 * Tests UI — QuickAddBandeFromLogeForm (V26-FORM)
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre les nouvelles étapes Âge (3) et Génétique (4) introduites par V26 :
 *   [1] Step 3 : indicateur live "= XX jours" se met à jour
 *   [2] Step 3 : checkbox "Je ne sais pas" désactive l'input
 *   [3] Step 4 : bouton "Aléatoire" sélectionne une truie au hasard
 *   [4] Step 4 : bouton "Ne pas renseigner" remet la valeur à vide
 *   [5] Stepper : passe de 5 étapes au total
 *   [6] Workflow complet 1→2→3→4→5
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import type { BandePorcelets, Loge, Truie, Verrat } from '../../types/farm';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../services/supabaseWrites', () => ({
  insertBatch: vi.fn().mockResolvedValue({ id: 'new-batch-uuid' }),
  updateBatch: vi.fn().mockResolvedValue({ success: true }),
  addBatchSource: vi.fn().mockResolvedValue({ id: 'bs-1' }),
  listLoges: vi
    .fn()
    .mockResolvedValue([
      {
        id: 'L-PS1',
        numero: '01',
        type: 'POST_SEVRAGE',
        active: true,
        capaciteMax: 30,
      } as Loge,
    ]),
}));

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

interface MockFarm {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  refreshData: ReturnType<typeof vi.fn>;
}
let mockFarm: MockFarm;

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => mockFarm,
}));

// Migration FORM_CONTRACT Phase 3b : le form passe sur le shell
// `<QuickActionSheet>` (IonModal + toast canonique). On mocke `IonModal` en
// passthrough et le context `useToast()`.
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

import QuickAddBandeFromLogeForm from './QuickAddBandeFromLogeForm';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeTruie(id: string, displayId: string, nom?: string): Truie {
  return { id, displayId, nom, statut: 'Active' } as unknown as Truie;
}
function makeVerrat(id: string, displayId: string, nom?: string): Verrat {
  return { id, displayId, nom, statut: 'Actif' } as unknown as Verrat;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFarm = {
    truies: [
      makeTruie('truie-1', 'T01', 'Bella'),
      makeTruie('truie-2', 'T02', 'Cleo'),
      makeTruie('truie-3', 'T03', 'Daisy'),
    ],
    verrats: [
      makeVerrat('verrat-1', 'V01', 'Hercule'),
      makeVerrat('verrat-2', 'V02', 'Achille'),
    ],
    bandes: [],
    refreshData: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
});

// ─── Helpers nav step 1→2 ───────────────────────────────────────────────────

async function navigateToStep2(): Promise<void> {
  const logeBtn = await screen.findByTestId('loge-option-L-PS1');
  fireEvent.click(logeBtn);
}

function fillStep2(): void {
  const eff = document.getElementById('qabfl-effectif') as HTMLInputElement;
  fireEvent.change(eff, { target: { value: '24' } });
  const poids = document.getElementById('qabfl-poids') as HTMLInputElement;
  fireEvent.change(poids, { target: { value: '18.5' } });
  // Force une date passée déterministe : la valeur par défaut (todayIso) peut
  // être rejetée par validateFromLogeStep2 quand l'écart UTC/locale fait
  // apparaître la date d'aujourd'hui comme future (cas observé en tout début
  // de journée locale Europe/Paris où Date() < midnight UTC).
  const date = document.getElementById('qabfl-date') as HTMLInputElement;
  fireEvent.change(date, { target: { value: '2024-01-15' } });
}

// ═══════════════════════════════════════════════════════════════════════════

describe('QuickAddBandeFromLogeForm — UI V26', () => {
  it('[1] Step 3 (Âge) : indicateur live affiche "= 30 jours" pour "1 mois"', async () => {
    render(
      <QuickAddBandeFromLogeForm
        isOpen
        onClose={() => undefined}
      />,
    );
    await navigateToStep2();
    fillStep2();
    fireEvent.click(screen.getByTestId('step-2-next'));

    const ageInput = screen.getByTestId('age-input');
    fireEvent.change(ageInput, { target: { value: '1 mois' } });

    const indicator = screen.getByTestId('age-live-indicator');
    expect(indicator.textContent).toMatch(/= 30 jours/);
  });

  it('[2] Step 3 : checkbox "Je ne sais pas" coche → input désactivé + label "inconnu"', async () => {
    render(
      <QuickAddBandeFromLogeForm
        isOpen
        onClose={() => undefined}
      />,
    );
    await navigateToStep2();
    fillStep2();
    fireEvent.click(screen.getByTestId('step-2-next'));

    const ageInput = screen.getByTestId('age-input') as HTMLInputElement;
    const checkbox = screen.getByTestId('age-unknown-checkbox') as HTMLInputElement;
    expect(ageInput.disabled).toBe(false);

    fireEvent.click(checkbox);

    expect(ageInput.disabled).toBe(true);
    expect(screen.getByTestId('age-live-indicator').textContent).toMatch(/inconnu/i);
  });

  it('[3] Step 4 : "Aléatoire" sélectionne une truie parmi celles disponibles', async () => {
    render(
      <QuickAddBandeFromLogeForm
        isOpen
        onClose={() => undefined}
      />,
    );
    await navigateToStep2();
    fillStep2();
    fireEvent.click(screen.getByTestId('step-2-next'));
    // step 3 → step 4
    fireEvent.click(screen.getByTestId('step-3-next'));

    const select = screen.getByTestId('truie-select') as HTMLSelectElement;
    expect(select.value).toBe('');

    fireEvent.click(screen.getByTestId('truie-random'));
    expect(['truie-1', 'truie-2', 'truie-3']).toContain(select.value);
  });

  it('[4] Step 4 : "Ne pas renseigner" reset la sélection', async () => {
    render(
      <QuickAddBandeFromLogeForm
        isOpen
        onClose={() => undefined}
      />,
    );
    await navigateToStep2();
    fillStep2();
    fireEvent.click(screen.getByTestId('step-2-next'));
    fireEvent.click(screen.getByTestId('step-3-next'));

    const select = screen.getByTestId('truie-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'truie-2' } });
    expect(select.value).toBe('truie-2');

    fireEvent.click(screen.getByTestId('truie-clear'));
    expect(select.value).toBe('');
  });

  it('[5] Stepper compte 5 étapes (Loge / Eff. / Âge / Gén. / Récap)', async () => {
    render(
      <QuickAddBandeFromLogeForm
        isOpen
        onClose={() => undefined}
      />,
    );
    const stepper = await screen.findByLabelText(/Progression/i);
    const items = stepper.querySelectorAll('li');
    expect(items.length).toBe(5);
  });

  it('[6] Workflow complet 1→2→3→4→5 affiche le récap final', async () => {
    render(
      <QuickAddBandeFromLogeForm
        isOpen
        onClose={() => undefined}
      />,
    );
    await navigateToStep2();
    fillStep2();
    fireEvent.click(screen.getByTestId('step-2-next'));
    // step 3 : âge "30j"
    fireEvent.change(screen.getByTestId('age-input'), {
      target: { value: '30j' },
    });
    fireEvent.click(screen.getByTestId('step-3-next'));
    // step 4 : pas de génétique
    fireEvent.click(screen.getByTestId('step-4-next'));
    // step 5 : récap visible
    expect(await screen.findByTestId('step-5')).toBeTruthy();
    expect(screen.getByTestId('step-5-submit')).toBeTruthy();
  });
});
