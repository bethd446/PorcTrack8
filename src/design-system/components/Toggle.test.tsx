// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Toggle } from './index';

afterEach(() => cleanup());

describe('Toggle', () => {
  it('rend le label fourni', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Notifications" />);
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('rend la description en complément du label', () => {
    render(
      <Toggle
        checked={false}
        onChange={() => {}}
        label="Confirmation des saisies"
        description="Email après chaque saisie validée"
      />,
    );
    expect(screen.getByText('Confirmation des saisies')).toBeTruthy();
    expect(screen.getByText('Email après chaque saisie validée')).toBeTruthy();
  });

  it('appelle onChange avec la valeur inversée au clic', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} ariaLabel="t" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reflète aria-checked', () => {
    const { rerender } = render(<Toggle checked={false} onChange={() => {}} ariaLabel="t" />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    rerender(<Toggle checked={true} onChange={() => {}} ariaLabel="t" />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('respecte disabled', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} disabled ariaLabel="t" />);
    const btn = screen.getByRole('switch') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onChange).not.toHaveBeenCalled();
  });
});
