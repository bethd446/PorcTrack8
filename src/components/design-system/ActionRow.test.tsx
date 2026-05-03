// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ActionRow from './ActionRow';

afterEach(() => cleanup());

describe('ActionRow V33', () => {
  it('renders title and icon', () => {
    render(
      <ActionRow
        icon={<span data-testid="ic">i</span>}
        title="Toutes les alertes"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Toutes les alertes')).toBeDefined();
    expect(screen.getByTestId('ic')).toBeDefined();
  });

  it('renders description when provided', () => {
    render(
      <ActionRow
        icon="🔔"
        title="Notifs"
        description="Email & push"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Email & push')).toBeDefined();
  });

  it('renders badge when provided', () => {
    render(
      <ActionRow icon="🔔" title="Alerts" badge={5} onClick={() => {}} />,
    );
    expect(screen.getByText('5')).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <ActionRow icon="📋" title="Audit" onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('destructive variant uses danger color for title', () => {
    const { container } = render(
      <ActionRow
        icon="↩"
        title="Se déconnecter"
        destructive
        onClick={() => {}}
      />,
    );
    const titleEl = container.querySelector('button > div:nth-child(2) > div') as HTMLElement;
    expect(titleEl.style.color).toBe('var(--pt-danger)');
  });

  it('non-destructive title uses --pt-text', () => {
    const { container } = render(
      <ActionRow icon="🔧" title="Settings" onClick={() => {}} />,
    );
    const titleEl = container.querySelector('button > div:nth-child(2) > div') as HTMLElement;
    expect(titleEl.style.color).toBe('var(--pt-text)');
  });

  it('renders as button when onClick provided, plain div otherwise', () => {
    const { container, rerender } = render(
      <ActionRow icon="X" title="X" />,
    );
    expect(container.querySelector('button')).toBeNull();
    rerender(<ActionRow icon="X" title="X" onClick={() => {}} />);
    expect(container.querySelector('button')).not.toBeNull();
  });

  it('uses title as default aria-label', () => {
    render(
      <ActionRow icon="i" title="Mon Profil" onClick={() => {}} />,
    );
    expect(screen.getByLabelText('Mon Profil')).toBeDefined();
  });

  it('min-height ≥ 56 (tap target)', () => {
    const { container } = render(
      <ActionRow icon="i" title="X" onClick={() => {}} />,
    );
    const btn = container.querySelector('button') as HTMLElement;
    expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(56);
  });
});
