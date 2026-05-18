import React, { useCallback, useMemo, useRef, useState } from 'react';
import { IonToast } from '@ionic/react';

export type ToastTone = 'success' | 'warning' | 'error' | 'info';

export interface AppToastAction {
  label: string;
  onClick: () => void;
}

export interface AppToastProps {
  message: string;
  open: boolean;
  onDismiss: () => void;
  tone?: ToastTone;
  duration?: number;
  icon?: React.ReactNode;
  action?: AppToastAction;
  position?: 'top' | 'middle' | 'bottom';
}

const TONE_COLOR: Record<ToastTone, string> = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'medium',
};

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 5000,
};

const TONE_ICON_NAME: Record<ToastTone, string> = {
  success: 'checkmark-circle',
  warning: 'alert-circle',
  error: 'close-circle',
  info: 'information-circle',
};

/**
 * AppToast — wrapper standardisé sur IonToast.
 * - tone (success/warning/error/info) gouverne couleur + icône + durée par défaut
 * - duration optionnelle (défaut 3000ms info/success, 5000ms warning/error)
 * - icon override possible (string Ionicon name OU autre — actuellement
 *   passé tel quel à IonToast.icon ; pour les ReactNode utiliser AppToast
 *   "manuellement" et insérer l'icône dans le message)
 * - action optionnelle ({ label, onClick }) → bouton à droite du toast
 *
 * Pour la majorité des cas, préférer le hook `useAppToast()` qui gère la
 * file d'attente.
 */
const AppToast: React.FC<AppToastProps> = ({
  message,
  open,
  onDismiss,
  tone = 'info',
  duration,
  icon,
  action,
  position = 'bottom',
}) => {
  const buttons = action
    ? [
        {
          text: action.label,
          role: 'action',
          handler: () => {
            action.onClick();
          },
        },
      ]
    : undefined;

  // IonToast accepte string pour `icon` (nom Ionicon). Si l'utilisateur
  // passe un ReactNode custom, on ne le forwarde pas (limitation IonToast).
  const ionIconName = typeof icon === 'string' ? icon : TONE_ICON_NAME[tone];

  return (
    <IonToast
      isOpen={open}
      message={message}
      duration={duration ?? DEFAULT_DURATION[tone]}
      color={TONE_COLOR[tone]}
      position={position}
      icon={ionIconName}
      buttons={buttons}
      onDidDismiss={onDismiss}
    />
  );
};

export default AppToast;

/* ─────────────────────────────────────────────────────────────────────────
 * useAppToast — hook avec file d'attente.
 * ───────────────────────────────────────────────────────────────────────── */

interface QueuedToast {
  id: number;
  message: string;
  tone: ToastTone;
  duration?: number;
  icon?: React.ReactNode;
  action?: AppToastAction;
  position?: 'top' | 'middle' | 'bottom';
}

export interface UseAppToastReturn {
  show: (
    message: string,
    tone?: ToastTone,
    options?: Partial<Omit<AppToastProps, 'message' | 'open' | 'onDismiss' | 'tone'>>,
  ) => void;
  toastProps: AppToastProps;
}

export function useAppToast(): UseAppToastReturn {
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const idRef = useRef(0);

  const show: UseAppToastReturn['show'] = useCallback(
    (message: string, tone: ToastTone = 'info', options) => {
      idRef.current += 1;
      const next: QueuedToast = {
        id: idRef.current,
        message,
        tone,
        duration: options?.duration,
        icon: options?.icon,
        action: options?.action,
        position: options?.position,
      };
      setQueue((q) => [...q, next]);
    },
    [],
  );

  const onDismiss = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  const head = queue[0];
  const toastProps = useMemo<AppToastProps>(() => ({
    message: head?.message ?? '',
    open: head !== undefined,
    onDismiss,
    tone: head?.tone ?? 'info',
    duration: head?.duration,
    icon: head?.icon,
    action: head?.action,
    position: head?.position,
  }), [head, onDismiss]);

  return { show, toastProps };
}
