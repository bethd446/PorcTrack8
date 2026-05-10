// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Dialog } from '../Dialog';

describe('Dialog V70 — Sprint 8 patterns transverses', () => {
  afterEach(() => cleanup());

  it('ne rend rien si isOpen=false', () => {
    const { container } = render(
      <Dialog
        isOpen={false}
        onDismiss={() => {}}
        title="Se déconnecter ?"
        actionLabel="Se déconnecter"
        onAction={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('rend titre + body + 2 boutons quand isOpen=true', () => {
    render(
      <Dialog
        isOpen
        onDismiss={() => {}}
        title="Se déconnecter ?"
        body="Tu reviendras au login."
        actionLabel="Se déconnecter"
        onAction={() => {}}
      />,
    );
    expect(screen.getByText('Se déconnecter ?')).toBeTruthy();
    expect(screen.getByText('Tu reviendras au login.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeTruthy();
  });

  it('onAction appelé au clic sur action', () => {
    const onAction = vi.fn();
    render(
      <Dialog
        isOpen
        onDismiss={() => {}}
        title="Confirmer ?"
        actionLabel="OK"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('onDismiss appelé au clic sur Annuler', () => {
    const onDismiss = vi.fn();
    render(
      <Dialog
        isOpen
        onDismiss={onDismiss}
        title="Confirmer ?"
        actionLabel="OK"
        onAction={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('Escape ferme la dialog', () => {
    const onDismiss = vi.fn();
    render(
      <Dialog
        isOpen
        onDismiss={onDismiss}
        title="Confirmer ?"
        actionLabel="OK"
        onAction={() => {}}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
