// @vitest-environment jsdom
/**
 * AppToast — couvre l'API publique du wrapper et du hook.
 * On stub `IonToast` pour éviter de monter le shadow DOM Ionic dans
 * jsdom — seules les props passées au wrapper nous intéressent ici.
 */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

vi.mock('@ionic/react', () => {
  const IonToast: React.FC<{
    isOpen: boolean;
    message: string;
    duration?: number;
    color?: string;
    icon?: string;
    buttons?: Array<{ text: string; handler?: () => void }>;
    onDidDismiss?: () => void;
  }> = ({ isOpen, message, duration, color, icon, buttons, onDidDismiss }) => {
    if (!isOpen) return null;
    return (
      <div
        data-testid="ion-toast"
        data-color={color}
        data-icon={icon}
        data-duration={duration}
      >
        <span data-testid="toast-message">{message}</span>
        {buttons?.map((b) => (
          <button
            key={b.text}
            data-testid="toast-button"
            type="button"
            onClick={() => {
              b.handler?.();
            }}
          >
            {b.text}
          </button>
        ))}
        <button
          data-testid="toast-dismiss"
          type="button"
          onClick={() => onDidDismiss?.()}
        >
          dismiss
        </button>
      </div>
    );
  };
  return { IonToast };
});

import AppToast, { useAppToast } from './AppToast';

afterEach(() => cleanup());

describe('AppToast', () => {
  it('show success: applique color=success et durée 3000ms par défaut', () => {
    const Probe: React.FC = () => {
      const { show, toastProps } = useAppToast();
      React.useEffect(() => {
        show('Truie ajoutée', 'success');
      }, [show]);
      return <AppToast {...toastProps} />;
    };
    render(<Probe />);
    const toast = screen.getByTestId('ion-toast');
    expect(toast.getAttribute('data-color')).toBe('success');
    expect(toast.getAttribute('data-duration')).toBe('3000');
    expect(screen.getByTestId('toast-message').textContent).toBe('Truie ajoutée');
  });

  it('show warning: applique color=warning et durée 5000ms par défaut', () => {
    const Probe: React.FC = () => {
      const { show, toastProps } = useAppToast();
      React.useEffect(() => {
        show('Stock bas', 'warning');
      }, [show]);
      return <AppToast {...toastProps} />;
    };
    render(<Probe />);
    const toast = screen.getByTestId('ion-toast');
    expect(toast.getAttribute('data-color')).toBe('warning');
    expect(toast.getAttribute('data-duration')).toBe('5000');
  });

  it('dismiss: après onDidDismiss le toast disparaît', () => {
    const Probe: React.FC = () => {
      const { show, toastProps } = useAppToast();
      React.useEffect(() => {
        show('Hello', 'info');
      }, [show]);
      return <AppToast {...toastProps} />;
    };
    render(<Probe />);
    expect(screen.getByTestId('ion-toast')).toBeTruthy();
    act(() => {
      screen.getByTestId('toast-dismiss').click();
    });
    expect(screen.queryByTestId('ion-toast')).toBeNull();
  });

  it('action button: rend le bouton et appelle onClick', () => {
    const onClick = vi.fn();
    const Probe: React.FC = () => {
      const { show, toastProps } = useAppToast();
      React.useEffect(() => {
        show('Sync échouée', 'error', {
          action: { label: 'Réessayer', onClick },
        });
      }, [show]);
      return <AppToast {...toastProps} />;
    };
    render(<Probe />);
    const button = screen.getByTestId('toast-button');
    expect(button.textContent).toBe('Réessayer');
    act(() => {
      button.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('queue: deux toasts consécutifs s\'enchaînent (FIFO)', () => {
    const Probe: React.FC = () => {
      const { show, toastProps } = useAppToast();
      const firedRef = React.useRef(false);
      React.useEffect(() => {
        if (firedRef.current) return;
        firedRef.current = true;
        show('Premier', 'success');
        show('Second', 'info');
      }, [show]);
      return <AppToast {...toastProps} />;
    };
    render(<Probe />);
    expect(screen.getByTestId('toast-message').textContent).toBe('Premier');
    act(() => {
      screen.getByTestId('toast-dismiss').click();
    });
    expect(screen.getByTestId('toast-message').textContent).toBe('Second');
  });
});
