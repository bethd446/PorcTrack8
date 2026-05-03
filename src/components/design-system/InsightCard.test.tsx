// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import InsightCard from './InsightCard';

afterEach(() => cleanup());

describe('InsightCard V30', () => {
  it('renders title and children', () => {
    render(
      <InsightCard title="Analyse Marius">Penser à sevrer demain.</InsightCard>,
    );
    expect(screen.getByText('Analyse Marius')).toBeDefined();
    expect(screen.getByText('Penser à sevrer demain.')).toBeDefined();
  });

  it('title header is uppercase tracked accent-colored', () => {
    render(<InsightCard title="hello">x</InsightCard>);
    const title = screen.getByText('hello');
    // Le span "hello" hérite ses styles du wrapper flex parent
    const header = title.parentElement as HTMLElement;
    expect(header.style.textTransform).toBe('uppercase');
    expect(header.style.letterSpacing).toBe('var(--pt-tracking-label)');
    expect(header.style.color).toBe('var(--pt-accent)');
  });

  it('container has accent left border 3px', () => {
    const { container } = render(<InsightCard title="t">x</InsightCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.style.borderLeft).toContain('3px');
    expect(card.style.borderLeft).toContain('var(--pt-accent)');
  });

  it('container uses warm cream insight surface', () => {
    const { container } = render(<InsightCard title="t">x</InsightCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.style.background).toBe('var(--pt-surface-insight)');
  });

  it('decorative sparkle is aria-hidden', () => {
    render(<InsightCard title="t">x</InsightCard>);
    const sparkle = screen.getByText('✨');
    expect(sparkle.getAttribute('aria-hidden')).toBe('true');
  });
});
