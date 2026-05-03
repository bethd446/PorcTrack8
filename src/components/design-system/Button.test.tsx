// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Button from './Button';

afterEach(() => cleanup());

describe('Button V29', () => {
  it('renders label uppercased via CSS', () => {
    render(<Button>Démarrer</Button>);
    const btn = screen.getByRole('button', { name: /démarrer/i });
    expect(btn.style.textTransform).toBe('uppercase');
  });

  it('is a pill (radius-pill)', () => {
    render(<Button>x</Button>);
    const btn = screen.getByRole('button');
    expect(btn.style.borderRadius).toBe('var(--ds-radius-pill)');
  });

  it('primary variant uses --ds-primary background', () => {
    render(<Button variant="primary">x</Button>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('var(--ds-primary)');
    expect(btn.style.color).toBe('var(--ds-primary-text)');
  });

  it('secondary variant has transparent background and primary border', () => {
    render(<Button variant="secondary">x</Button>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('transparent');
    expect(btn.style.border).toContain('var(--ds-primary)');
  });

  it('ghost variant has transparent background and transparent border', () => {
    render(<Button variant="ghost">x</Button>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('transparent');
    expect(btn.style.border).toContain('transparent');
  });

  it('size md has min-height >= 44 (tap target persona F1)', () => {
    render(<Button size="md">x</Button>);
    const btn = screen.getByRole('button');
    expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
  });

  it('default type is button (not submit)', () => {
    render(<Button>x</Button>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.type).toBe('button');
  });

  it('forwards onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
