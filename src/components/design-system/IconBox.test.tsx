// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import IconBox from './IconBox';

afterEach(() => cleanup());

describe('IconBox V29', () => {
  it('renders children', () => {
    render(<IconBox data-testid="ib"><svg data-testid="icon" /></IconBox>);
    expect(screen.getByTestId('icon')).toBeDefined();
  });

  it('default size is 44 (tap target)', () => {
    render(<IconBox data-testid="ib">x</IconBox>);
    const box = screen.getByTestId('ib') as HTMLElement;
    expect(box.style.width).toBe('44px');
    expect(box.style.height).toBe('44px');
  });

  it('uses radius 12px', () => {
    render(<IconBox data-testid="ib">x</IconBox>);
    const box = screen.getByTestId('ib') as HTMLElement;
    expect(box.style.borderRadius).toBe('12px');
  });

  it('default tone=accent uses --ds-accent-soft background', () => {
    render(<IconBox data-testid="ib">x</IconBox>);
    const box = screen.getByTestId('ib') as HTMLElement;
    expect(box.style.background).toBe('var(--ds-accent-soft)');
  });

  it('primary tone uses tinted primary background', () => {
    render(<IconBox data-testid="ib" tone="primary">x</IconBox>);
    const box = screen.getByTestId('ib') as HTMLElement;
    expect(box.style.background).toContain('rgba(45, 74, 31');
  });

  it('respects custom size', () => {
    render(<IconBox data-testid="ib" size={56}>x</IconBox>);
    const box = screen.getByTestId('ib') as HTMLElement;
    expect(box.style.width).toBe('56px');
    expect(box.style.height).toBe('56px');
  });
});
