// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Tabs from './Tabs';

afterEach(() => cleanup());

const ITEMS = [
  { id: 'liste', label: 'Liste' },
  { id: 'grille', label: 'Grille' },
] as const;

describe('Tabs V30', () => {
  it('renders all items as role=tab', () => {
    render(<Tabs items={ITEMS} value="liste" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].textContent).toContain('Liste');
    expect(tabs[1].textContent).toContain('Grille');
  });

  it('marks active tab with aria-selected=true', () => {
    render(<Tabs items={ITEMS} value="grille" onChange={() => {}} />);
    const grille = screen.getByRole('tab', { name: /grille/i });
    expect(grille.getAttribute('aria-selected')).toBe('true');
    const liste = screen.getByRole('tab', { name: /liste/i });
    expect(liste.getAttribute('aria-selected')).toBe('false');
  });

  it('calls onChange with id when clicking a tab', () => {
    const onChange = vi.fn();
    render(<Tabs items={ITEMS} value="liste" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /grille/i }));
    expect(onChange).toHaveBeenCalledWith('grille');
  });

  it('active tab uses --pt-primary background', () => {
    render(<Tabs items={ITEMS} value="liste" onChange={() => {}} />);
    const active = screen.getByRole('tab', { name: /liste/i }) as HTMLElement;
    expect(active.style.background).toBe('var(--pt-primary)');
  });

  it('renders count suffix when provided', () => {
    render(
      <Tabs
        items={[
          { id: 'a', label: 'Pleines', count: 7 },
          { id: 'b', label: 'Vides', count: 3 },
        ]}
        value="a"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('each tab has data-pt="button" for Ionic override', () => {
    render(<Tabs items={ITEMS} value="liste" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((t) => expect(t.getAttribute('data-pt')).toBe('button'));
  });

  it('each tab has min-height ≥ 44 (tap target)', () => {
    render(<Tabs items={ITEMS} value="liste" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab') as HTMLElement[];
    tabs.forEach((t) =>
      expect(parseInt(t.style.minHeight, 10)).toBeGreaterThanOrEqual(44),
    );
  });
});
