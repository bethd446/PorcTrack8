// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Stat from './Stat';

afterEach(() => cleanup());

describe('Stat V33', () => {
  it('renders value and label', () => {
    render(<Stat value="29" label="Pleines" />);
    expect(screen.getByText('29')).toBeDefined();
    expect(screen.getByText('Pleines')).toBeDefined();
  });

  it('uses default tone (text color)', () => {
    const { container } = render(<Stat value="29" label="X" />);
    const valueEl = container.querySelector('div > span:nth-child(2)') as HTMLElement;
    expect(valueEl.style.color).toBe('var(--pt-text)');
  });

  it('uses accent tone color when tone="accent"', () => {
    const { container } = render(<Stat value="29" label="X" tone="accent" />);
    const valueEl = container.querySelector('div > span:nth-child(2)') as HTMLElement;
    expect(valueEl.style.color).toBe('var(--pt-accent)');
  });

  it('uses danger tone color when tone="danger"', () => {
    const { container } = render(<Stat value="3" label="X" tone="danger" />);
    const valueEl = container.querySelector('div > span:nth-child(2)') as HTMLElement;
    expect(valueEl.style.color).toBe('var(--pt-danger)');
  });

  it('label uses uppercase + tracking-label', () => {
    const { container } = render(<Stat value="1" label="ALERTES" />);
    const labelEl = container.querySelector('div > span:first-child') as HTMLElement;
    expect(labelEl.style.textTransform).toBe('uppercase');
    expect(labelEl.style.letterSpacing).toBe('var(--pt-tracking-label)');
  });

  it('value uses Big Shoulders display font', () => {
    const { container } = render(<Stat value="42" label="X" />);
    const valueEl = container.querySelector('div > span:nth-child(2)') as HTMLElement;
    expect(valueEl.style.fontFamily).toBe('var(--pt-font-display)');
  });
});
