// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Card from './Card';

afterEach(() => cleanup());

describe('Card V29', () => {
  it('renders children', () => {
    render(<Card>Contenu</Card>);
    expect(screen.getByText('Contenu')).toBeDefined();
  });

  it('applies default variant background and lg radius', () => {
    render(<Card data-testid="c">x</Card>);
    const el = screen.getByTestId('c') as HTMLElement;
    expect(el.style.background).toBe('var(--ds-surface)');
    expect(el.style.borderRadius).toBe('var(--ds-radius-lg)');
    expect(el.style.padding).toBe('var(--ds-space-5)');
  });

  it('applies elevated variant with stronger shadow', () => {
    render(<Card variant="elevated" data-testid="c">x</Card>);
    const el = screen.getByTestId('c') as HTMLElement;
    expect(el.style.boxShadow).toBe('var(--ds-shadow-elevated)');
  });

  it('applies alt variant with surface-alt background', () => {
    render(<Card variant="alt" data-testid="c">x</Card>);
    const el = screen.getByTestId('c') as HTMLElement;
    expect(el.style.background).toBe('var(--ds-surface-alt)');
  });

  it('has no border (border-style none)', () => {
    render(<Card data-testid="c">x</Card>);
    const el = screen.getByTestId('c') as HTMLElement;
    // JSDOM expose la shorthand `border: none` via les longhands.
    // `borderStyle` est la propriété observable de manière fiable.
    expect(el.style.borderStyle).toBe('none');
  });

  it('forwards extra props (className)', () => {
    render(<Card className="extra" data-testid="c">x</Card>);
    const el = screen.getByTestId('c') as HTMLElement;
    expect(el.className).toBe('extra');
  });
});
