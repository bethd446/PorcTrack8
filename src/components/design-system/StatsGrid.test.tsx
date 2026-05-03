// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import StatsGrid from './StatsGrid';
import Stat from './Stat';

afterEach(() => cleanup());

describe('StatsGrid V33', () => {
  it('renders Stat children', () => {
    render(
      <StatsGrid>
        <Stat value="17" label="Truies" />
        <Stat value="2" label="Verrats" />
      </StatsGrid>,
    );
    expect(screen.getByText('17')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('default uses 4 columns', () => {
    const { container } = render(
      <StatsGrid>
        <Stat value="1" label="A" />
      </StatsGrid>,
    );
    const grid = container.querySelector('[role="group"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
  });

  it('cols=2 sets 2-column grid', () => {
    const { container } = render(
      <StatsGrid cols={2}>
        <Stat value="1" label="A" />
        <Stat value="2" label="B" />
      </StatsGrid>,
    );
    const grid = container.querySelector('[role="group"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('cols=6 sets 6-column grid', () => {
    const { container } = render(
      <StatsGrid cols={6}>
        <Stat value="1" label="A" />
      </StatsGrid>,
    );
    const grid = container.querySelector('[role="group"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(6, minmax(0, 1fr))');
  });

  it('uses surface background and lg radius (Card-like wrapper)', () => {
    const { container } = render(
      <StatsGrid>
        <Stat value="1" label="A" />
      </StatsGrid>,
    );
    const grid = container.querySelector('[role="group"]') as HTMLElement;
    expect(grid.style.background).toBe('var(--pt-surface)');
    expect(grid.style.borderRadius).toBe('var(--pt-radius-lg)');
  });

  it('has role=group for accessibility', () => {
    const { container } = render(
      <StatsGrid>
        <Stat value="1" label="A" />
      </StatsGrid>,
    );
    expect(container.querySelector('[role="group"]')).not.toBeNull();
  });
});
