// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AlertRow from './AlertRow';

afterEach(() => cleanup());

describe('AlertRow V31', () => {
  it('renders primary, secondary, value and unit', () => {
    render(
      <AlertRow
        primary="Ivermectine"
        secondary="Vermifuge injectable"
        value="0"
        unit="ml"
      />,
    );
    expect(screen.getByText('Ivermectine')).toBeDefined();
    expect(screen.getByText('Vermifuge injectable')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
    expect(screen.getByText('ml')).toBeDefined();
  });

  it('renders without secondary when not provided', () => {
    render(<AlertRow primary="Aliment" value="120" unit="kg" />);
    expect(screen.getByText('Aliment')).toBeDefined();
    expect(screen.getByText('120')).toBeDefined();
  });

  it('valueDanger=true → applies red color to value', () => {
    render(<AlertRow primary="x" value="0" valueDanger />);
    const valueEl = screen.getByText('0') as HTMLElement;
    expect(valueEl.style.color).toBe('var(--pt-danger)');
  });

  it('non-interactive row is rendered as div (no button role)', () => {
    render(<AlertRow primary="x" value="1" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('with onClick → renders as button with min-height ≥ 44px', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<AlertRow primary="L5RM" value="1" onClick={onClick} />);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn).toBeDefined();
    expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('with href → row clickable triggers navigation (window.location.assign)', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, assign },
      writable: true,
    });
    render(<AlertRow primary="L5RM" value="1" href="/troupeau/bandes/L5RM" />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(assign).toHaveBeenCalledWith('/troupeau/bandes/L5RM');
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });
});
