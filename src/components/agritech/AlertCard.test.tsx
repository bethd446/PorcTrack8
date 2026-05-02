// @vitest-environment jsdom
/**
 * AlertCard — couvre le rendu et les interactions du composant unifié
 * (Sprint E1 — bouton "OK" d'acquittement + bouton action métier optionnel).
 */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import AlertCard from './AlertCard';
import type { FarmAlert } from '../../services/alertEngine';

afterEach(() => cleanup());

function makeAlert(overrides: Partial<FarmAlert> = {}): FarmAlert {
  return {
    id: 'alert-1',
    priority: 'HAUTE',
    category: 'REPRO',
    subjectId: 'T-001',
    subjectLabel: 'Truie 001',
    title: 'Mise-bas imminente',
    message: 'Mise-bas prévue dans 1 jour',
    requiresAction: true,
    actions: [],
    createdAt: new Date('2026-05-01T08:00:00Z'),
    ...overrides,
  };
}

describe('AlertCard', () => {
  it('rendu basique : affiche le titre, le message et le bouton OK', () => {
    const alert = makeAlert();
    render(<AlertCard alert={alert} onAcknowledge={vi.fn()} />);

    expect(screen.getByText('Mise-bas imminente')).toBeTruthy();
    expect(screen.getByText('Mise-bas prévue dans 1 jour')).toBeTruthy();
    const ack = screen.getByTestId('alert-card-ack');
    expect(ack.textContent?.includes('OK')).toBe(true);
    // Pas de bouton d'action si onAction non fourni.
    expect(screen.queryByTestId('alert-card-action')).toBeNull();
  });

  it('click OK : appelle onAcknowledge avec l\'id de l\'alerte', () => {
    const onAck = vi.fn();
    const alert = makeAlert({ id: 'alert-42' });
    render(<AlertCard alert={alert} onAcknowledge={onAck} />);

    fireEvent.click(screen.getByTestId('alert-card-ack'));
    expect(onAck).toHaveBeenCalledTimes(1);
    expect(onAck).toHaveBeenCalledWith('alert-42');
  });

  it('click Action : appelle onAction et affiche le label fourni', () => {
    const onAction = vi.fn();
    const alert = makeAlert();
    render(
      <AlertCard
        alert={alert}
        onAcknowledge={vi.fn()}
        onAction={onAction}
        actionLabel="Saisir pesée"
      />,
    );

    const btn = screen.getByTestId('alert-card-action');
    expect(btn.textContent).toBe('Saisir pesée');
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('priorité CRITIQUE : applique role="alert" automatiquement', () => {
    const alert = makeAlert({ priority: 'CRITIQUE' });
    render(<AlertCard alert={alert} onAcknowledge={vi.fn()} />);
    const card = screen.getByTestId('alert-card');
    expect(card.getAttribute('role')).toBe('alert');
    expect(card.getAttribute('data-priority')).toBe('CRITIQUE');
  });
});
