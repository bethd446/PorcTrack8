// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Chip from './Chip';

afterEach(() => cleanup());

describe('Chip V33', () => {
  it('renders label and count', () => {
    render(<Chip label="Pleines" count={6} />);
    expect(screen.getByText('Pleines')).toBeDefined();
    expect(screen.getByText('6')).toBeDefined();
  });

  it('renders without count when omitted', () => {
    const { container } = render(<Chip label="Tout" />);
    expect(screen.getByText('Tout')).toBeDefined();
    // count span absent — un seul span text + (le wrapper button/span)
    const numberSpans = container.querySelectorAll('span');
    expect(numberSpans.length).toBeLessThanOrEqual(2);
  });

  it('renders as button when onClick is provided', () => {
    render(<Chip label="Vides" count={3} onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('renders as span when no onClick (passive)', () => {
    const { container } = render(<Chip label="Total" count={17} />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('span')).not.toBeNull();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Chip label="Pleines" count={6} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('active=true sets aria-pressed and primary border', () => {
    render(<Chip label="Pleines" count={6} active onClick={() => {}} />);
    const btn = screen.getByRole('button') as HTMLElement;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.style.border).toContain('var(--pt-primary)');
    expect(btn.style.color).toBe('var(--pt-primary)');
  });

  it('inactive uses divider border and muted color', () => {
    render(<Chip label="Vides" count={3} onClick={() => {}} />);
    const btn = screen.getByRole('button') as HTMLElement;
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.style.border).toContain('var(--pt-divider)');
    expect(btn.style.color).toBe('var(--pt-text-muted)');
  });

  it('uses pill radius', () => {
    const { container } = render(<Chip label="X" count={1} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.borderRadius).toBe('var(--pt-radius-pill)');
  });
});
