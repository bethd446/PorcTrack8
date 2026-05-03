// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ListItem from './ListItem';

afterEach(() => cleanup());

describe('ListItem V33', () => {
  it('renders primary text', () => {
    render(<ListItem primary="T01 · Monette" />);
    expect(screen.getByText('T01 · Monette')).toBeDefined();
  });

  it('renders secondary text when provided', () => {
    render(
      <ListItem primary="T01" secondary="B.22 · Allaitante" />,
    );
    expect(screen.getByText('B.22 · Allaitante')).toBeDefined();
  });

  it('renders avatar when provided', () => {
    render(
      <ListItem
        primary="X"
        avatar={<span data-testid="avatar">A</span>}
      />,
    );
    expect(screen.getByTestId('avatar')).toBeDefined();
  });

  it('renders trailing slot when provided', () => {
    render(
      <ListItem
        primary="X"
        trailing={<span data-testid="tag">PLEINE</span>}
      />,
    );
    expect(screen.getByTestId('tag')).toBeDefined();
  });

  it('renders as button when onClick provided', () => {
    render(<ListItem primary="X" onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('renders as div when no onClick/href (passive)', () => {
    const { container } = render(<ListItem primary="X" />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('shows chevron only when interactive', () => {
    const { container, rerender } = render(<ListItem primary="X" />);
    // Pas de chevron passif
    const passiveSvgs = container.querySelectorAll('svg');
    expect(passiveSvgs.length).toBe(0);
    // Avec onClick → svg chevron
    rerender(<ListItem primary="X" onClick={() => {}} />);
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ListItem primary="X" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('min-height ≥ 56 (tap target large)', () => {
    const { container } = render(
      <ListItem primary="X" onClick={() => {}} />,
    );
    const btn = container.querySelector('button') as HTMLElement;
    expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(56);
  });

  it('applies aria-label when provided', () => {
    render(
      <ListItem primary="X" ariaLabel="Truie T01" onClick={() => {}} />,
    );
    expect(screen.getByLabelText('Truie T01')).toBeDefined();
  });
});
