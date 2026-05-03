// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Segment from './Segment';

afterEach(() => cleanup());

const OPTIONS = [
  { value: 'liste', label: 'Liste' },
  { value: 'grille', label: 'Grille' },
] as const;

describe('Segment V33', () => {
  it('renders all options as role=radio', () => {
    render(<Segment options={OPTIONS} value="liste" onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0].textContent).toContain('Liste');
    expect(radios[1].textContent).toContain('Grille');
  });

  it('marks active option with aria-checked=true', () => {
    render(<Segment options={OPTIONS} value="grille" onChange={() => {}} />);
    const grille = screen.getByRole('radio', { name: /grille/i });
    expect(grille.getAttribute('aria-checked')).toBe('true');
    const liste = screen.getByRole('radio', { name: /liste/i });
    expect(liste.getAttribute('aria-checked')).toBe('false');
  });

  it('calls onChange with value when clicking an option', () => {
    const onChange = vi.fn();
    render(<Segment options={OPTIONS} value="liste" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /grille/i }));
    expect(onChange).toHaveBeenCalledWith('grille');
  });

  it('active option uses --pt-surface background (white pill)', () => {
    render(<Segment options={OPTIONS} value="liste" onChange={() => {}} />);
    const active = screen.getByRole('radio', { name: /liste/i }) as HTMLElement;
    expect(active.style.background).toBe('var(--pt-surface)');
  });

  it('inactive option is transparent', () => {
    render(<Segment options={OPTIONS} value="liste" onChange={() => {}} />);
    const inactive = screen.getByRole('radio', { name: /grille/i }) as HTMLElement;
    expect(inactive.style.background).toBe('transparent');
  });

  it('container uses pill radius and surface-alt background', () => {
    const { container } = render(
      <Segment options={OPTIONS} value="liste" onChange={() => {}} />,
    );
    const group = container.querySelector('[role="radiogroup"]') as HTMLElement;
    expect(group.style.background).toBe('var(--pt-surface-alt)');
    expect(group.style.borderRadius).toBe('var(--pt-radius-pill)');
  });

  it('container min-height ≥ 44 (tap target)', () => {
    const { container } = render(
      <Segment options={OPTIONS} value="liste" onChange={() => {}} />,
    );
    const group = container.querySelector('[role="radiogroup"]') as HTMLElement;
    expect(parseInt(group.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
  });

  it('each option has data-pt="button" for Ionic override', () => {
    render(<Segment options={OPTIONS} value="liste" onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    radios.forEach((r) => expect(r.getAttribute('data-pt')).toBe('button'));
  });
});
