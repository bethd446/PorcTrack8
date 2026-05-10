// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';

const Trigger: React.FC<{ kind: 'success' | 'warning' | 'error'; message: string }> = ({
  kind,
  message,
}) => {
  const t = useToast();
  return (
    <button
      onClick={() => {
        if (kind === 'success') t.showSuccess(message);
        else if (kind === 'warning') t.showWarning(message);
        else t.showError(message);
      }}
    >
      fire
    </button>
  );
};

describe('Toast V70 — Sprint 8 patterns transverses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('showSuccess affiche un toast success', () => {
    render(
      <ToastProvider>
        <Trigger kind="success" message="Truie ajoutée" />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText('fire'));
    });
    expect(screen.getByText('Truie ajoutée')).toBeTruthy();
    const node = screen.getByText('Truie ajoutée').closest('.toast');
    expect(node).toBeTruthy();
    expect(node?.classList.contains('toast--success')).toBe(true);
  });

  it('auto-dismiss après 4s', () => {
    render(
      <ToastProvider>
        <Trigger kind="warning" message="Réseau faible" />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText('fire'));
    });
    expect(screen.queryByText('Réseau faible')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Réseau faible')).toBeNull();
  });

  it('showError applique la classe toast--error', () => {
    render(
      <ToastProvider>
        <Trigger kind="error" message="Sauvegarde KO" />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText('fire'));
    });
    const node = screen.getByText('Sauvegarde KO').closest('.toast');
    expect(node?.classList.contains('toast--error')).toBe(true);
  });

  it('clic sur close dismiss immédiatement', () => {
    render(
      <ToastProvider>
        <Trigger kind="success" message="Bye" />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText('fire'));
    });
    expect(screen.queryByText('Bye')).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByLabelText('Fermer'));
    });
    expect(screen.queryByText('Bye')).toBeNull();
  });
});
