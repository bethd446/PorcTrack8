// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Skeleton } from '../Skeleton';

describe('Skeleton V70 — Sprint 8 patterns transverses', () => {
  afterEach(() => cleanup());

  it('rend variant list-item avec count rows', () => {
    const { container } = render(<Skeleton variant="list-item" count={4} />);
    expect(container.querySelectorAll('.sk-list__row').length).toBe(4);
    expect(container.querySelector('.sk-list')).toBeTruthy();
  });

  it('rend variant card-link avec count cards', () => {
    const { container } = render(<Skeleton variant="card-link" count={2} />);
    expect(container.querySelectorAll('.sk-card').length).toBe(2);
  });

  it('rend variant profile (1 seul block)', () => {
    const { container } = render(<Skeleton variant="profile" />);
    expect(container.querySelectorAll('.sk-profil').length).toBe(1);
    expect(container.querySelector('.sk-av')).toBeTruthy();
  });

  it('rend variant chart avec 8 bars', () => {
    const { container } = render(<Skeleton variant="chart" />);
    expect(container.querySelector('.sk-chart')).toBeTruthy();
    expect(container.querySelectorAll('.sk-chart__bars span').length).toBe(8);
  });

  it('count par défaut est 3 pour list-item', () => {
    const { container } = render(<Skeleton variant="list-item" />);
    expect(container.querySelectorAll('.sk-list__row').length).toBe(3);
  });
});
