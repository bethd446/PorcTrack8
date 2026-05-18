// @vitest-environment jsdom
/**
 * Tests unitaires — SaisirSheet
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Rendu conditionnel (null si fermé, dialog si ouvert)
 *   2. Heading "Que veux-tu saisir ?" + 5 actions visibles
 *   3. Bug C8 V16 (race condition) : openAction AVANT onClose
 *   4. Esc → onClose, click backdrop → onClose
 *   5. Focus trap + restore focus à l'élément précédemment focused
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mock useQuickActions (QuickActionsContext) ────────────────────────────
const openActionMock = vi.fn();
vi.mock('../../context/QuickActionsContext', () => ({
  useQuickActions: () => ({ openAction: openActionMock }),
}));

import SaisirSheet from './SaisirSheet';

beforeEach(() => {
  openActionMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('SaisirSheet — rendu conditionnel', () => {
  it('rend null si isOpen=false (pas dans le DOM)', () => {
    const { container } = render(<SaisirSheet isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('rend un dialog avec heading "Que veux-tu saisir ?" si isOpen=true', () => {
    render(<SaisirSheet isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(
      screen.getByRole('heading', { name: 'Que veux-tu saisir ?' }),
    ).toBeDefined();
  });

  it('rend les 5 actions : Saillie, Mise-bas, Sevrage, Mortalité, Pesée', () => {
    render(<SaisirSheet isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Saillie')).toBeDefined();
    expect(screen.getByText('Mise-bas')).toBeDefined();
    expect(screen.getByText('Sevrage')).toBeDefined();
    expect(screen.getByText('Mortalité')).toBeDefined();
    expect(screen.getByText('Pesée')).toBeDefined();
  });
});

describe('SaisirSheet — bug C8 V16 (race condition)', () => {
  it('openAction est appelée AVANT onClose au click sur Saillie', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SaisirSheet isOpen={true} onClose={onClose} />);

    const saillieBtn = screen.getByText('Saillie').closest('button');
    expect(saillieBtn).not.toBeNull();
    await user.click(saillieBtn!);

    expect(openActionMock).toHaveBeenCalledWith('saillie');
    expect(onClose).toHaveBeenCalledTimes(1);
    // Vérification ordre via invocationCallOrder (timestamps internes Vitest)
    expect(openActionMock.mock.invocationCallOrder[0]).toBeLessThan(
      onClose.mock.invocationCallOrder[0],
    );
  });

  it('même race-check pour Mise-bas, Mortalité, Pesée', async () => {
    const user = userEvent.setup();
    for (const { label, kind } of [
      { label: 'Mise-bas', kind: 'misebas' },
      { label: 'Mortalité', kind: 'mortalite' },
      { label: 'Pesée', kind: 'pesee' },
    ]) {
      openActionMock.mockClear();
      const onClose = vi.fn();
      const { unmount } = render(<SaisirSheet isOpen={true} onClose={onClose} />);
      const btn = screen.getByText(label).closest('button');
      await user.click(btn!);

      expect(openActionMock).toHaveBeenCalledWith(kind);
      expect(openActionMock.mock.invocationCallOrder[0]).toBeLessThan(
        onClose.mock.invocationCallOrder[0],
      );
      unmount();
    }
  });
});

describe('SaisirSheet — accessibilité (Esc, backdrop, focus)', () => {
  it('Escape → onClose', () => {
    const onClose = vi.fn();
    render(<SaisirSheet isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('click sur backdrop (overlay aria-hidden) → onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<SaisirSheet isOpen={true} onClose={onClose} />);
    // V43.4 — backdrop = div aria-hidden (pas un button) ; on le retrouve
    // via la classe distinctive `bg-black/40`.
    const backdrop = container.querySelector('div.bg-black\\/40') as HTMLElement;
    expect(backdrop).toBeTruthy();
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('le bouton Fermer (X) déclenche onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SaisirSheet isOpen={true} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: 'Fermer' });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('attributs ARIA dialog/modal/labelledby présents', () => {
    render(<SaisirSheet isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('saisir-sheet-title');
    const heading = document.getElementById('saisir-sheet-title');
    expect(heading?.textContent).toContain('Que veux-tu saisir');
  });

  it('focus trap : Tab cycle premier↔dernier élément focusable du sheet', () => {
    // Le hook calcule first/last via sheetRef (le panneau), qui exclut le
    // backdrop button. On reproduit la même requête pour faire matcher.
    render(<SaisirSheet isOpen={true} onClose={() => {}} />);
    // Le sheetRef = panneau interne. Le heading est dans <div class="flex …">
    // qui est enfant direct du panneau. Donc panel = heading.parent.parent.
    const titleEl = document.getElementById('saisir-sheet-title')!;
    const panel = titleEl.parentElement!.parentElement!;
    expect(panel).not.toBeNull();
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    expect(focusables.length).toBeGreaterThan(1);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // Tab depuis le dernier → cycle vers le premier (closeBtn X)
    last.focus();
    expect(document.activeElement === last).toBe(true);
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement === first).toBe(true);

    // Shift+Tab depuis le premier → cycle vers le dernier
    first.focus();
    expect(document.activeElement === first).toBe(true);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement === last).toBe(true);
  });

  it('restore focus à l\'élément précédemment focused au close (unmount)', () => {
    // Setup : un trigger button externe focused avant ouverture du sheet
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(<SaisirSheet isOpen={true} onClose={() => {}} />);
    // Le useEffect setTimeout focus le closeBtn — on attend le cleanup unmount
    unmount();

    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });
});
