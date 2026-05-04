// @vitest-environment jsdom
/**
 * V70 Phase 6 — tests interaction Tooltip
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { Tooltip } from '../Tooltip';

describe('Tooltip V70 — interaction', () => {
  afterEach(() => {
    cleanup();
  });

  it('ouvre la définition au clic', () => {
    render(<Tooltip term="saillie" />);
    const btn = screen.getByLabelText(/définition saillie/i);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });

  it('ferme avec Escape', () => {
    render(<Tooltip term="isse" />);
    const btn = screen.getByLabelText(/définition isse/i);
    fireEvent.click(btn);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('ferme au clic extérieur', () => {
    render(
      <div>
        <Tooltip term="mise-bas" />
        <button type="button">Outside</button>
      </div>,
    );
    const btn = screen.getByLabelText(/définition mise-bas/i);
    fireEvent.click(btn);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    act(() => {
      fireEvent.mouseDown(screen.getByText('Outside'));
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
