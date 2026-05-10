// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Scale, X, Pencil } from 'lucide-react';
import { LongPressSheet } from '../LongPressSheet';

describe('LongPressSheet V70 — Sprint 8 patterns transverses', () => {
  afterEach(() => cleanup());

  it('ne rend rien si isOpen=false', () => {
    const { container } = render(
      <LongPressSheet
        isOpen={false}
        onClose={() => {}}
        eyebrow="PORCELET · CR-12"
        title="CR-12"
        actions={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('rend eyebrow + title + actions', () => {
    render(
      <LongPressSheet
        isOpen
        onClose={() => {}}
        eyebrow="PORCELET · CR-12"
        title="CR-12 · 4.8 kg"
        actions={[
          { icon: Scale, label: 'Peser', onClick: () => {} },
          { icon: Pencil, label: 'Modifier', onClick: () => {} },
        ]}
      />,
    );
    expect(screen.getByText('PORCELET · CR-12')).toBeTruthy();
    expect(screen.getByText('CR-12 · 4.8 kg')).toBeTruthy();
    expect(screen.getByText('Peser')).toBeTruthy();
    expect(screen.getByText('Modifier')).toBeTruthy();
  });

  it('action onClick déclenché au clic', () => {
    const onPeser = vi.fn();
    render(
      <LongPressSheet
        isOpen
        onClose={() => {}}
        eyebrow="PORCELET · CR-12"
        title="CR-12"
        actions={[{ icon: Scale, label: 'Peser', onClick: onPeser }]}
      />,
    );
    fireEvent.click(screen.getByText('Peser'));
    expect(onPeser).toHaveBeenCalledOnce();
  });

  it('action danger applique la classe lp-action--danger', () => {
    const { container } = render(
      <LongPressSheet
        isOpen
        onClose={() => {}}
        eyebrow="PORCELET"
        title="CR-12"
        actions={[
          { icon: X, label: 'Marquer mortalité', onClick: () => {}, variant: 'danger' },
        ]}
      />,
    );
    const danger = container.querySelector('.lp-action--danger');
    expect(danger).toBeTruthy();
    expect(danger?.textContent).toContain('Marquer mortalité');
  });

  it('clic sur Annuler ferme', () => {
    const onClose = vi.fn();
    render(
      <LongPressSheet
        isOpen
        onClose={onClose}
        eyebrow="PORCELET"
        title="CR-12"
        actions={[{ icon: Scale, label: 'Peser', onClick: () => {} }]}
      />,
    );
    fireEvent.click(screen.getByText('Annuler'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
