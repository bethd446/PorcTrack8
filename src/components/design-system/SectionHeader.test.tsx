// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SectionHeader from './SectionHeader';

afterEach(() => cleanup());

describe('SectionHeader V29', () => {
  it('renders the label', () => {
    render(<SectionHeader label="APERÇU" />);
    expect(screen.getByText('APERÇU')).toBeDefined();
  });

  it('label uses uppercase + label tracking', () => {
    render(<SectionHeader label="Aperçu" />);
    const span = screen.getByText(/aperçu/i);
    expect(span.style.textTransform).toBe('uppercase');
    expect(span.style.letterSpacing).toBe('var(--ds-tracking-label)');
  });

  it('default tone uses primary dot color', () => {
    const { container } = render(<SectionHeader label="X" />);
    const dot = container.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--ds-primary)');
  });

  it('accent tone uses accent dot color', () => {
    const { container } = render(<SectionHeader label="X" tone="accent" />);
    const dot = container.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--ds-accent)');
  });

  it('renders a divider line filling the rest', () => {
    const { container } = render(<SectionHeader label="X" />);
    const lines = container.querySelectorAll('span[aria-hidden="true"]');
    expect(lines.length).toBe(2);
    const line = lines[1] as HTMLElement;
    expect(line.style.background).toBe('var(--ds-divider)');
    expect(line.style.flex).toContain('1');
  });
});
