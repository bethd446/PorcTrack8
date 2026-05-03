// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import KeyValueRow from './KeyValueRow';

afterEach(() => cleanup());

describe('KeyValueRow V30', () => {
  it('renders label and value', () => {
    render(<KeyValueRow label="ID" value="T03" />);
    expect(screen.getByText('ID')).toBeDefined();
    expect(screen.getByText('T03')).toBeDefined();
  });

  it('label is uppercase via CSS', () => {
    render(<KeyValueRow label="boucle" value="FR-3-01" data-testid="row" />);
    const label = screen.getByText('boucle');
    expect(label.style.textTransform).toBe('uppercase');
    expect(label.style.letterSpacing).toBe('var(--pt-tracking-label)');
  });

  it('value uses Big Shoulders display font', () => {
    render(<KeyValueRow label="x" value="42" />);
    const value = screen.getByText('42');
    expect(value.style.fontFamily).toContain('var(--pt-font-display)');
    expect(value.style.fontWeight).toBe('700');
  });

  it('default tone uses --pt-text color for value', () => {
    render(<KeyValueRow label="x" value="V" />);
    const value = screen.getByText('V');
    expect(value.style.color).toBe('var(--pt-text)');
  });

  it('accent tone uses --pt-accent color for value', () => {
    render(<KeyValueRow label="x" value="V" tone="accent" />);
    const value = screen.getByText('V');
    expect(value.style.color).toBe('var(--pt-accent)');
  });

  it('muted tone uses --pt-text-muted color for value', () => {
    render(<KeyValueRow label="x" value="V" tone="muted" />);
    const value = screen.getByText('V');
    expect(value.style.color).toBe('var(--pt-text-muted)');
  });

  it('has min-height ≥ 44 (tap target)', () => {
    const { container } = render(<KeyValueRow label="x" value="V" />);
    const row = container.firstChild as HTMLElement;
    expect(parseInt(row.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
  });
});
