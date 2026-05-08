/**
 * ToastContext — V71-P3 unified toast feedback
 *
 * Centralise les notifications de retour d'action via IonToast (Ionic React).
 * Pattern : useToast().showToast(message, type, duration) depuis n'importe
 * quel composant fils du <ToastProvider>.
 *
 * Type 'success' (vert) | 'error' (rouge) | 'info' (gris).
 *
 * À utiliser sur toute soumission de form qui modifie la DB :
 *  - Saillie / Mise-bas / Sevrage / Soin / Pesée / Note / Mortalité
 *  - Update fiche truie / verrat / loge
 *  - etc.
 *
 * Avant V71-P3 : toasts in-line dans chaque form via useState local. Cassé
 * dès qu'on quitte la modale qui rend le toast (race condition + DOM perdu).
 * Maintenant : toasts mountés au top niveau (App.tsx), survivent aux navs.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';
import { IonToast } from '@ionic/react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {
    /* no-op fallback */
  },
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 2800) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((t) => (
        <IonToast
          key={t.id}
          isOpen={true}
          message={t.message}
          duration={t.duration}
          color={t.type === 'success' ? 'success' : t.type === 'error' ? 'danger' : 'medium'}
          position="bottom"
          onDidDismiss={() => dismiss(t.id)}
        />
      ))}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
