// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Input from './Input';

afterEach(() => cleanup());

describe('Input V30', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Nom" />);
    const input = screen.getByPlaceholderText('Nom');
    expect((input as HTMLInputElement).tagName).toBe('INPUT');
  });

  it('carries data-pt="input" attribute (bypass Ionic reset)', () => {
    render(<Input data-testid="i" />);
    const input = screen.getByTestId('i');
    expect(input.getAttribute('data-pt')).toBe('input');
  });

  it('is a pill (radius-pill)', () => {
    render(<Input data-testid="i" />);
    const input = screen.getByTestId('i') as HTMLInputElement;
    expect(input.style.borderRadius).toBe('var(--pt-radius-pill)');
  });

  it('uses --pt-surface background', () => {
    render(<Input data-testid="i" />);
    const input = screen.getByTestId('i') as HTMLInputElement;
    expect(input.style.background).toBe('var(--pt-surface)');
  });

  it('min-height ≥ 44 (tap target)', () => {
    render(<Input data-testid="i" />);
    const input = screen.getByTestId('i') as HTMLInputElement;
    expect(parseInt(input.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
  });

  it('border becomes primary on focus', () => {
    render(<Input data-testid="i" />);
    const input = screen.getByTestId('i') as HTMLInputElement;
    fireEvent.focus(input);
    expect(input.style.border).toContain('var(--pt-primary)');
  });

  it('border becomes danger when invalid prop is set', () => {
    render(<Input data-testid="i" invalid />);
    const input = screen.getByTestId('i') as HTMLInputElement;
    expect(input.style.border).toContain('var(--pt-danger)');
  });

  it('forwards onChange', () => {
    const onChange = vi.fn();
    render(<Input data-testid="i" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('i'), { target: { value: 'x' } });
    expect(onChange).toHaveBeenCalledOnce();
  });
});
