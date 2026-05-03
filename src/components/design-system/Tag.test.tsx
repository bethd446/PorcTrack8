// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Tag from './Tag';

afterEach(() => cleanup());

describe('Tag V29', () => {
  it('renders the label', () => {
    render(<Tag>Vide</Tag>);
    expect(screen.getByText('Vide')).toBeDefined();
  });

  it('is a pill with uppercase style', () => {
    render(<Tag>x</Tag>);
    const tag = screen.getByText('x');
    expect(tag.style.borderRadius).toBe('var(--ds-radius-pill)');
    expect(tag.style.textTransform).toBe('uppercase');
  });

  it('default variant uses --ds-surface-alt background', () => {
    render(<Tag>x</Tag>);
    const tag = screen.getByText('x');
    expect(tag.style.background).toBe('var(--ds-surface-alt)');
  });

  it('accent variant uses --ds-accent-pill background', () => {
    render(<Tag variant="accent">x</Tag>);
    const tag = screen.getByText('x');
    expect(tag.style.background).toBe('var(--ds-accent-pill)');
  });

  it('primary variant uses --ds-primary background', () => {
    render(<Tag variant="primary">x</Tag>);
    const tag = screen.getByText('x');
    expect(tag.style.background).toBe('var(--ds-primary)');
  });

  it('success variant uses tinted primary background', () => {
    render(<Tag variant="success">x</Tag>);
    const tag = screen.getByText('x');
    expect(tag.style.background).toContain('rgba(45, 74, 31');
  });

  it('warning variant uses --ds-accent-soft background', () => {
    render(<Tag variant="warning">x</Tag>);
    const tag = screen.getByText('x');
    expect(tag.style.background).toBe('var(--ds-accent-soft)');
  });
});
