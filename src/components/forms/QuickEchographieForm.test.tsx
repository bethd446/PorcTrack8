// @vitest-environment jsdom
/**
 * Tests unitaires — QuickEchographieForm (jsdom env) + logique pure.
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [logic] validateEchographie : champs requis, statuts, date ISO, longueur.
 *  [logic] sowStatusFromEcho : VIDE → 'En attente saillie', CONFIRMEE → 'Pleine'.
 *  [render] pending saillies listées (saillies ≥ 21j sans statut_echo).
 *  [submit CONFIRMEE] : updateSaillie + updateSowByCode('Pleine').
 *  [submit VIDE] : updateSaillie + updateSowByCode('En attente saillie').
 *  [validation] sans date → erreur, sans statut → erreur, sans saillie → erreur.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

import {
  validateEchographie,
  sowStatusFromEcho,
} from './quickEchographieLogic';

// ── Mocks supabaseWrites ────────────────────────────────────────────────────

vi.mock('../../services/supabaseWrites', () => ({
  listPendingEchographies: vi.fn().mockResolvedValue([
    {
      saillie_id: 'saillie-uuid-1',
      sow_id: 'sow-uuid-T07',
      sow_code_id: 'T07',
      boar_code_id: 'V01',
      date_saillie: '2026-04-01',
      days_since: 28,
    },
    {
      saillie_id: 'saillie-uuid-2',
      sow_id: 'sow-uuid-T09',
      sow_code_id: 'T09',
      boar_code_id: 'V02',
      date_saillie: '2026-04-05',
      days_since: 24,
    },
  ]),
  updateSaillie: vi.fn().mockResolvedValue({ success: true }),
  updateSowByCode: vi.fn().mockResolvedValue({ id: 'sow-uuid-T07' }),
}));

const refreshDataMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [],
    verrats: [],
    bandes: [],
    refreshData: refreshDataMock,
  }),
}));

vi.mock('@ionic/react', () => ({
  IonToast: ({ isOpen, message }: { isOpen: boolean; message: string }) =>
    isOpen ? <div role="status">{message}</div> : null,
  IonModal: ({
    isOpen,
    children,
    'aria-label': ariaLabel,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    'aria-label'?: string;
  }) => (isOpen ? <div role="dialog" aria-label={ariaLabel}>{children}</div> : null),
}));

import {
  listPendingEchographies,
  updateSaillie,
  updateSowByCode,
} from '../../services/supabaseWrites';
import QuickEchographieForm from './QuickEchographieForm';

beforeEach(() => {
  vi.clearAllMocks();
  refreshDataMock.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 3, 29, 9, 0, 0));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════
// [logic] Validation pure
// ═══════════════════════════════════════════════════════════════════════════

describe('validateEchographie', () => {
  it('rejette une saillie vide', () => {
    const r = validateEchographie({
      saillieId: '',
      statut: 'CONFIRMEE',
      dateEchoIso: '2026-04-29',
      notes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.saillieId).toBeTruthy();
  });

  it('rejette un statut absent', () => {
    const r = validateEchographie({
      saillieId: 'sid-1',
      statut: '',
      dateEchoIso: '2026-04-29',
      notes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.statut).toBeTruthy();
  });

  it('rejette un statut invalide', () => {
    const r = validateEchographie({
      saillieId: 'sid-1',
      // @ts-expect-error volontairement invalide
      statut: 'POURRI',
      dateEchoIso: '2026-04-29',
      notes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.statut).toBeTruthy();
  });

  it('rejette une date ISO invalide', () => {
    const r = validateEchographie({
      saillieId: 'sid-1',
      statut: 'VIDE',
      dateEchoIso: '2026/04/29',
      notes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.dateEchoIso).toBeTruthy();
  });

  it('rejette une date vide', () => {
    const r = validateEchographie({
      saillieId: 'sid-1',
      statut: 'VIDE',
      dateEchoIso: '',
      notes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.dateEchoIso).toBeTruthy();
  });

  it('accepte un draft complet (CONFIRMEE)', () => {
    const r = validateEchographie({
      saillieId: 'sid-1',
      statut: 'CONFIRMEE',
      dateEchoIso: '2026-04-29',
      notes: 'écho propre',
    });
    expect(r.ok).toBe(true);
    expect(r.normalized).toMatchObject({
      saillieId: 'sid-1',
      statut: 'CONFIRMEE',
      dateEchoIso: '2026-04-29',
      notes: 'écho propre',
    });
  });

  it('rejette une note > 200 chars', () => {
    const longNote = 'a'.repeat(201);
    const r = validateEchographie({
      saillieId: 'sid-1',
      statut: 'CONFIRMEE',
      dateEchoIso: '2026-04-29',
      notes: longNote,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.notes).toBeTruthy();
  });
});

describe('sowStatusFromEcho', () => {
  it('VIDE → "En attente saillie"', () => {
    expect(sowStatusFromEcho('VIDE')).toBe('En attente saillie');
  });

  it('CONFIRMEE → "Pleine"', () => {
    expect(sowStatusFromEcho('CONFIRMEE')).toBe('Pleine');
  });

  it('DOUTEUSE → null (pas de transition auto)', () => {
    expect(sowStatusFromEcho('DOUTEUSE')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [render] Composant — pending saillies listées
// ═══════════════════════════════════════════════════════════════════════════

async function flush(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('QuickEchographieForm — render', () => {
  it('[1] charge les saillies en attente d\'écho à l\'ouverture', async () => {
    render(<QuickEchographieForm isOpen onClose={() => undefined} />);
    await flush();
    expect(listPendingEchographies).toHaveBeenCalledWith({ minDaysAgo: 21 });
    // Le select natif rend ses options en DOM — on contrôle leur présence par textContent.
    const select = screen.getByLabelText(
      /Sélectionner la truie à confirmer/i,
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.innerHTML).toMatch(/T07/);
    expect(select.innerHTML).toMatch(/T09/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [submit] Cas CONFIRMEE → 'Pleine' (statut maintenu, pas de libération)
// ═══════════════════════════════════════════════════════════════════════════

describe('QuickEchographieForm — submit', () => {
  it('[2] CONFIRMEE → updateSaillie(statut_echo) + updateSowByCode(Pleine)', async () => {
    render(<QuickEchographieForm isOpen onClose={() => undefined} />);
    await flush();

    const select = screen.getByLabelText(
      /Sélectionner la truie à confirmer/i,
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'saillie-uuid-1' } });

    fireEvent.click(
      screen.getByLabelText(/Confirmée — Gestation visible/i),
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Enregistrer l'échographie/i }),
    );

    await flush();

    expect(updateSaillie).toHaveBeenCalledTimes(1);
    expect(updateSaillie).toHaveBeenCalledWith(
      'saillie-uuid-1',
      expect.objectContaining({
        statut_echo: 'CONFIRMEE',
      }),
    );
    expect(updateSowByCode).toHaveBeenCalledWith('T07', { statut: 'Pleine' });
  });

  it('[3] VIDE → updateSowByCode("En attente saillie") (truie libérée)', async () => {
    render(<QuickEchographieForm isOpen onClose={() => undefined} />);
    await flush();

    const select = screen.getByLabelText(
      /Sélectionner la truie à confirmer/i,
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'saillie-uuid-2' } });

    fireEvent.click(screen.getByLabelText(/Vide — Pas de gestation/i));

    fireEvent.click(
      screen.getByRole('button', { name: /Enregistrer l'échographie/i }),
    );

    await flush();

    expect(updateSaillie).toHaveBeenCalledWith(
      'saillie-uuid-2',
      expect.objectContaining({ statut_echo: 'VIDE' }),
    );
    expect(updateSowByCode).toHaveBeenCalledWith('T09', {
      statut: 'En attente saillie',
    });
  });

  it('[4] DOUTEUSE → updateSaillie mais PAS de updateSowByCode', async () => {
    render(<QuickEchographieForm isOpen onClose={() => undefined} />);
    await flush();

    const select = screen.getByLabelText(
      /Sélectionner la truie à confirmer/i,
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'saillie-uuid-1' } });

    fireEvent.click(screen.getByLabelText(/Douteuse — À recontrôler/i));

    fireEvent.click(
      screen.getByRole('button', { name: /Enregistrer l'échographie/i }),
    );

    await flush();

    expect(updateSaillie).toHaveBeenCalledWith(
      'saillie-uuid-1',
      expect.objectContaining({ statut_echo: 'DOUTEUSE' }),
    );
    expect(updateSowByCode).not.toHaveBeenCalled();
  });

  it('[5] sans saillie sélectionnée → submit bloqué (validation côté client)', async () => {
    render(<QuickEchographieForm isOpen onClose={() => undefined} />);
    await flush();

    fireEvent.click(screen.getByLabelText(/Confirmée — Gestation/i));

    const btn = screen.getByRole('button', {
      name: /Enregistrer l'échographie/i,
    }) as HTMLButtonElement;
    // disabled tant que saillieId vide.
    expect(btn.disabled).toBe(true);

    expect(updateSaillie).not.toHaveBeenCalled();
    expect(updateSowByCode).not.toHaveBeenCalled();
  });

  it('[6] sans date → erreur de validation, pas de write', async () => {
    render(<QuickEchographieForm isOpen onClose={() => undefined} />);
    await flush();

    const select = screen.getByLabelText(
      /Sélectionner la truie à confirmer/i,
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'saillie-uuid-1' } });

    fireEvent.click(screen.getByLabelText(/Confirmée — Gestation/i));

    // Vider la date
    const dateInput = screen.getByLabelText(
      /Date de l'échographie/i,
    ) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Enregistrer l'échographie/i }),
    );

    await flush();

    // Le submit doit avoir été refusé par validateEchographie.
    expect(updateSaillie).not.toHaveBeenCalled();
  });
});
