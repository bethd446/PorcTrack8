/**
 * V70 — Toast (Sprint 8 patterns transverses)
 *
 * Provider + hook + composant. 1 toast à la fois (queue LIFO interne),
 * auto-dismiss 4s, position fixed bottom au-dessus de la BottomNav.
 *
 * Pattern :
 *   <ToastProvider>
 *     <App />  // partout dedans : const { showSuccess } = useToast();
 *   </ToastProvider>
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CheckCircle, AlertTriangle, AlertOctagon, X } from 'lucide-react';

export type ToastVariant = 'success' | 'warning' | 'error';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: React.ReactNode;
}

interface ToastContextValue {
  showSuccess: (message: React.ReactNode) => void;
  showWarning: (message: React.ReactNode) => void;
  showError: (message: React.ReactNode) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

const ICONS: Record<ToastVariant, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertOctagon,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // queue LIFO interne : on stack, on n'affiche que le dernier (top de pile)
  const [stack, setStack] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = stack.length > 0 ? stack[stack.length - 1] : null;

  const dismissCurrent = useCallback(() => {
    setStack((s) => s.slice(0, -1));
  }, []);

  // auto-dismiss du toast courant après TOAST_DURATION_MS
  useEffect(() => {
    if (!current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStack((s) => (s.length > 0 ? s.slice(0, -1) : s));
    }, TOAST_DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current?.id]);

  const push = useCallback((variant: ToastVariant, message: React.ReactNode) => {
    idRef.current += 1;
    const item: ToastItem = { id: idRef.current, variant, message };
    setStack((s) => [...s, item]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess: (m) => push('success', m),
      showWarning: (m) => push('warning', m),
      showError: (m) => push('error', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pt-toast-host" aria-live="polite" aria-atomic="true">
        {current && (
          <Toast
            key={current.id}
            variant={current.variant}
            message={current.message}
            onClose={dismissCurrent}
          />
        )}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé à l\'intérieur d\'un <ToastProvider>');
  }
  return ctx;
}

export interface ToastProps {
  variant: ToastVariant;
  message: React.ReactNode;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ variant, message, onClose }) => {
  const Icon = ICONS[variant];
  return (
    <div className={`toast toast--${variant}`} role="status">
      <div className="toast__icon">
        <Icon size={13} strokeWidth={2} />
      </div>
      <div className="toast__text">{message}</div>
      <button
        type="button"
        className="toast__close"
        aria-label="Fermer"
        onClick={onClose}
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
};
