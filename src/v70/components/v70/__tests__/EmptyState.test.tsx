// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Sprout } from 'lucide-react';
import { EmptyState } from '../EmptyState';

describe('EmptyState V70 — Sprint 8 patterns transverses', () => {
  afterEach(() => cleanup());

  it('rend titre + description', () => {
    render(
      <EmptyState
        icon={Sprout}
        title="Aucune truie"
        description="Ajoute ta première truie pour démarrer."
      />,
    );
    expect(screen.getByText('Aucune truie')).toBeTruthy();
    expect(screen.getByText('Ajoute ta première truie pour démarrer.')).toBeTruthy();
  });

  it('CTA cliquable déclenche onClick', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={Sprout}
        title="Aucune truie"
        cta={{ label: 'Ajouter', onClick }}
      />,
    );
    fireEvent.click(screen.getByText('Ajouter'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('description optionnelle absente si non fournie', () => {
    render(<EmptyState icon={Sprout} title="Vide" />);
    expect(screen.getByText('Vide')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
