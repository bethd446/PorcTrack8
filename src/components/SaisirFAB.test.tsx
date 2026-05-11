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

  it('porte la classe canonique .fab et est positionné fixed bottom-right (V78)', () => {
    render(<SaisirFAB />);
    const btn = screen.getByRole('button', { name: 'Saisir un évènement métier' });
    // V78 : alignement sur `.fab` canonique (cf. v70-global.css). Les dims
    // / radius / fond / shadow sont hérités du CSS ; l'inline style ne
    // porte plus que les overrides contextuels (position fixed, right,
    // bottom safe-area, z-index).
    expect(btn.className).toContain('fab');
    expect(btn.className).not.toContain('fab--v77');
    expect(btn.style.position).toBe('fixed');
    expect(btn.style.right).toBe('24px');
  });

  it('est wrappé dans .pt-screen pour activer les tokens V70+', () => {
    const { container } = render(<SaisirFAB />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('pt-screen');
  });

  it('porte data-pt="fab" pour neutraliser le reset Ionic', () => {
    render(<SaisirFAB />);
    const btn = screen.getByRole('button', { name: 'Saisir un évènement métier' });
    expect(btn.getAttribute('data-pt')).toBe('fab');
  });

  it('z-index 1010 (au-dessus de la nav Ionic)', () => {
    render(<SaisirFAB />);
    const btn = screen.getByRole('button', { name: 'Saisir un évènement métier' });
    expect(btn.style.zIndex).toBe('1010');
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
