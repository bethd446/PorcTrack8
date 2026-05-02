// @vitest-environment jsdom
/**
 * Tests unitaires — PerfBandeCard (PilotageHub)
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie que la carte top/flop bande est cliquable et navigue vers la fiche
 * de la bande correspondante.
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateSpy = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

import { PerfBandeCard } from './PilotageHub';

function renderCard(props: Partial<React.ComponentProps<typeof PerfBandeCard>> = {}) {
  const defaults: React.ComponentProps<typeof PerfBandeCard> = {
    tone: 'accent',
    label: 'Bande la mieux notée',
    bandeId: 'BANDE-2026-04',
    metric: 'ROI : +42%',
  };
  return render(
    <MemoryRouter>
      <PerfBandeCard {...defaults} {...props} />
    </MemoryRouter>,
  );
}

describe('PerfBandeCard', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('rend un bouton cliquable avec aria-label correct', () => {
    renderCard({ bandeId: 'BANDE-2026-04' });

    const btn = screen.getByRole('button', { name: /ouvrir fiche bande bande-2026-04/i });
    expect(btn).toBeDefined();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('click → navigate(/troupeau/bandes/<id>)', () => {
    renderCard({ bandeId: 'BANDE-2026-04' });

    const btn = screen.getByRole('button', { name: /ouvrir fiche bande/i });
    fireEvent.click(btn);

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith('/troupeau/bandes/BANDE-2026-04');
  });

  it('respecte min-height >=44px (tap target)', () => {
    renderCard();
    const btn = screen.getByRole('button', { name: /ouvrir fiche bande/i });
    const minHeight = (btn as HTMLButtonElement).style.minHeight;
    expect(minHeight).toBe('44px');
  });

  it('affiche le label, le bandeId et la metric', () => {
    renderCard({
      tone: 'pig',
      label: 'Attention requise',
      bandeId: 'BANDE-X',
      metric: 'Marge : -1.200 €',
    });
    expect(screen.getByText('Attention requise')).toBeDefined();
    expect(screen.getByText('BANDE-X')).toBeDefined();
    expect(screen.getByText('Marge : -1.200 €')).toBeDefined();
  });
});
