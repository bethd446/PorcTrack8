// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AlertGroup from './AlertGroup';

afterEach(() => cleanup());

describe('AlertGroup V31', () => {
  it('renders title, subtitle and children', () => {
    render(
      <AlertGroup
        icon="💉"
        title="Stocks véto en rupture"
        subtitle="3 produits à recommander"
        severity="urgent"
      >
        <div>row-content</div>
      </AlertGroup>,
    );
    expect(screen.getByText('Stocks véto en rupture')).toBeDefined();
    expect(screen.getByText('3 produits à recommander')).toBeDefined();
    expect(screen.getByText('row-content')).toBeDefined();
  });

  it('applies urgent severity → red left border (--pt-danger)', () => {
    const { container } = render(
      <AlertGroup
        icon="💉"
        title="t"
        subtitle="s"
        severity="urgent"
      >
        <div>x</div>
      </AlertGroup>,
    );
    const section = container.querySelector('[data-pt="alert-group"]') as HTMLElement;
    expect(section.dataset.severity).toBe('urgent');
    // JSDOM expose la shorthand `borderLeft` telle que définie inline
    expect(section.style.borderLeft).toContain('var(--pt-danger)');
    expect(section.style.borderLeft).toContain('4px');
  });

  it('applies surveil severity → orange left border (--pt-accent)', () => {
    const { container } = render(
      <AlertGroup
        icon="📦"
        title="t"
        subtitle="s"
        severity="surveil"
      >
        <div>x</div>
      </AlertGroup>,
    );
    const section = container.querySelector('[data-pt="alert-group"]') as HTMLElement;
    expect(section.dataset.severity).toBe('surveil');
    expect(section.style.borderLeft).toContain('var(--pt-accent)');
  });

  it('renders count badge in pill when count is provided', () => {
    render(
      <AlertGroup
        icon="x"
        title="t"
        subtitle="s"
        severity="urgent"
        count={3}
      >
        <div>x</div>
      </AlertGroup>,
    );
    // pill format "3 · Urgent"
    expect(screen.getByText(/3\s+·\s+Urgent/)).toBeDefined();
  });

  it('renders action button and fires onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <AlertGroup
        icon="x"
        title="t"
        subtitle="s"
        severity="urgent"
        action={{ label: 'VOIR LE STOCK', onClick }}
      >
        <div>x</div>
      </AlertGroup>,
    );
    const btn = screen.getByRole('button', { name: /VOIR LE STOCK/i });
    expect(btn).toBeDefined();
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
