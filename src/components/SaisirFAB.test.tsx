// @vitest-environment jsdom
/**
 * Tests unitaires — SaisirFAB
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Rendu : button accessible (aria-label, aria-haspopup)
 *   2. Position fixed bottom-right + tokens design system
 *   3. Click → ouvre SaisirSheet (aria-expanded toggle)
 *   4. Hidden state via prop hidden={true} (exclusion routes /admin)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock SaisirSheet — testé séparément, on évite la dépendance contextuelle
vi.mock('./forms/SaisirSheet', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog" aria-label="saisir-sheet-mock">
        <button type="button" onClick={onClose}>
          mock-close
        </button>
      </div>
    ) : null,
}));

import SaisirFAB from './SaisirFAB';

afterEach(() => {
  cleanup();
});

describe('SaisirFAB — rendu', () => {
  it('rend un bouton avec aria-label et aria-haspopup="dialog"', () => {
    render(<SaisirFAB />);
    const btn = screen.getByRole('button', { name: 'Saisir un évènement métier' });
    expect(btn).toBeDefined();
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('est position fixed bottom-right (style inline)', () => {
    render(<SaisirFAB />);
    const btn = screen.getByRole('button', { name: 'Saisir un évènement métier' });
    expect(btn.className).toContain('fixed');
    // right inline style à 18 px (cf. SaisirFAB.tsx)
    expect(btn.style.right).toBe('18px');
  });

  it('utilise le token design system --color-accent-500 en background', () => {
    render(<SaisirFAB />);
    const btn = screen.getByRole('button', { name: 'Saisir un évènement métier' });
    expect(btn.style.background).toContain('var(--color-accent-500)');
  });
});

describe('SaisirFAB — interactions', () => {
  it('click ouvre le SaisirSheet et bascule aria-expanded à true', async () => {
    const user = userEvent.setup();
    render(<SaisirFAB />);
    const btn = screen.getByRole('button', { name: 'Saisir un évènement métier' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(btn);

    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('dialog', { name: 'saisir-sheet-mock' })).toBeDefined();
  });

  it('fermer le sheet remet aria-expanded à false', async () => {
    const user = userEvent.setup();
    render(<SaisirFAB />);
    const btn = screen.getByRole('button', { name: 'Saisir un évènement métier' });
    await user.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    await user.click(screen.getByText('mock-close'));
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('SaisirFAB — hidden state', () => {
  it('rend null quand hidden={true} (exclusion /admin)', () => {
    const { container } = render(<SaisirFAB hidden />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button', { name: 'Saisir un évènement métier' })).toBeNull();
  });

  it('rend normalement quand hidden={false}', () => {
    render(<SaisirFAB hidden={false} />);
    expect(
      screen.getByRole('button', { name: 'Saisir un évènement métier' }),
    ).toBeDefined();
  });
});
