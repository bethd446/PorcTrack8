// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Search from './Search';

afterEach(() => cleanup());

describe('Search V33', () => {
  it('renders an input with type=search', () => {
    const { container } = render(<Search placeholder="Chercher…" />);
    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.getAttribute('type')).toBe('search');
  });

  it('renders the search icon (svg present)', () => {
    const { container } = render(<Search placeholder="Chercher…" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('does not render clear button when value empty', () => {
    render(<Search placeholder="…" value="" onClear={() => {}} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /effacer/i })).toBeNull();
  });

  it('renders clear button when value non-empty AND onClear provided', () => {
    render(
      <Search placeholder="…" value="abc" onClear={() => {}} onChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /effacer/i })).toBeDefined();
  });

  it('does not render clear button when onClear missing (even with value)', () => {
    render(<Search placeholder="…" value="abc" onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /effacer/i })).toBeNull();
  });

  it('calls onClear when clicking the clear button', () => {
    const onClear = vi.fn();
    render(
      <Search placeholder="…" value="abc" onClear={onClear} onChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /effacer/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<Search placeholder="…" value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText('…') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('input has data-pt="input" and pill radius (Ionic override)', () => {
    const { container } = render(<Search placeholder="…" />);
    const input = container.querySelector('input') as HTMLElement;
    expect(input.getAttribute('data-pt')).toBe('input');
    expect(input.style.borderRadius).toBe('var(--pt-radius-pill)');
  });

  it('input min-height ≥ 44 (tap target)', () => {
    const { container } = render(<Search placeholder="…" />);
    const input = container.querySelector('input') as HTMLElement;
    expect(parseInt(input.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
  });
});
