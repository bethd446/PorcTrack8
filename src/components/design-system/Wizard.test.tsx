// @vitest-environment jsdom
/**
 * Tests unitaires — Wizard (V32 PHASE 4)
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie : navigation 3 étapes, validation par étape, bouton complete,
 * progress bar, tap targets ≥ 44px.
 */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import Wizard, { type WizardStep } from './Wizard';

afterEach(() => cleanup());

function makeSteps(extra?: Partial<Record<number, Partial<WizardStep>>>): WizardStep[] {
  return [
    {
      label: 'Étape Un',
      render: () => <div data-testid="step-1">Contenu 1</div>,
      ...extra?.[0],
    },
    {
      label: 'Étape Deux',
      render: () => <div data-testid="step-2">Contenu 2</div>,
      ...extra?.[1],
    },
    {
      label: 'Étape Trois',
      render: () => <div data-testid="step-3">Contenu 3</div>,
      ...extra?.[2],
    },
  ];
}

describe('Wizard (DS V32)', () => {
  it('rend la première étape par défaut + indique « ÉTAPE 1 SUR 3 »', () => {
    const onCancel = vi.fn();
    const onComplete = vi.fn();
    render(
      <Wizard
        steps={makeSteps()}
        eyebrow="ÉDITER · T18"
        onCancel={onCancel}
        onComplete={onComplete}
      />,
    );
    expect(screen.getByTestId('step-1')).toBeDefined();
    expect(screen.queryByTestId('step-2')).toBeNull();
    expect(screen.getByText(/étape 1 sur 3/i)).toBeDefined();
    expect(screen.getByText(/ÉDITER · T18/i)).toBeDefined();
  });

  it('clique « Suivant » → passe à l’étape suivante', () => {
    render(
      <Wizard
        steps={makeSteps()}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('step-2')).toBeDefined();
    expect(screen.getByText(/étape 2 sur 3/i)).toBeDefined();
  });

  it('clique « Précédent » → revient à l’étape précédente', () => {
    render(
      <Wizard
        steps={makeSteps()}
        initialStep={1}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    expect(screen.getByTestId('step-2')).toBeDefined();
    fireEvent.click(screen.getByLabelText(/étape précédente/i));
    expect(screen.getByTestId('step-1')).toBeDefined();
  });

  it('dernière étape : bouton devient « Enregistrer » et appelle onComplete', async () => {
    const onComplete = vi.fn(async () => undefined);
    render(
      <Wizard
        steps={makeSteps()}
        initialStep={2}
        completeLabel="Enregistrer"
        onCancel={vi.fn()}
        onComplete={onComplete}
      />,
    );
    expect(screen.getByTestId('wizard-complete')).toBeDefined();
    fireEvent.click(screen.getByTestId('wizard-complete'));
    // Attendre la résolution de la promesse onComplete (async).
    await Promise.resolve();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('validate retourne false → reste sur l’étape, n’avance pas', async () => {
    const validate = vi.fn(() => false);
    const steps = makeSteps({ 0: { validate } });
    render(
      <Wizard
        steps={steps}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('wizard-next'));
    await Promise.resolve();
    expect(validate).toHaveBeenCalled();
    expect(screen.getByTestId('step-1')).toBeDefined();
    expect(screen.queryByTestId('step-2')).toBeNull();
  });

  it('progress bar : valeur 1 au début, 3 à la fin', () => {
    const { unmount } = render(
      <Wizard steps={makeSteps()} initialStep={0} onCancel={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
    unmount();

    render(
      <Wizard steps={makeSteps()} initialStep={2} onCancel={vi.fn()} onComplete={vi.fn()} />,
    );
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('3');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('3');
  });

  it('bouton ✕ appelle onCancel', () => {
    const onCancel = vi.fn();
    render(
      <Wizard steps={makeSteps()} onCancel={onCancel} onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText(/fermer le wizard/i));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('tap targets : tous les boutons ≥ 44px de hauteur', () => {
    render(
      <Wizard steps={makeSteps()} onCancel={vi.fn()} onComplete={vi.fn()} />,
    );
    const next = screen.getByTestId('wizard-next');
    const close = screen.getByLabelText(/fermer le wizard/i);
    const prev = screen.getByLabelText(/étape précédente/i);
    expect(parseInt(next.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    expect(parseInt(close.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    expect(parseInt(prev.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
  });
});
