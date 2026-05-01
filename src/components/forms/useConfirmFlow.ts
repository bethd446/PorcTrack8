/**
 * useConfirmFlow — Shell partagé entre QuickConfirmSevrageForm/ReformeForm
 * ════════════════════════════════════════════════════════════════════════
 * Centralise le state saving/error/toast et le call à confirmAction()
 * du confirmationQueue. Les forms gardent leur UI propre (champs, layout,
 * format de note) — seul le boilerplate transactionnel est factorisé.
 */
import { useState } from 'react';

import { confirmAction, type PendingConfirmation } from '../../services/confirmationQueue';

export interface UseConfirmFlowOptions {
  pending: PendingConfirmation | null;
  onClose: () => void;
  onSuccess?: () => void;
  /** Délai avant fermeture auto pour laisser le toast s'afficher. */
  closeDelayMs?: number;
}

export interface UseConfirmFlowState {
  saving: boolean;
  error: string;
  toast: { show: boolean; message: string };
  /** Appelle confirmAction(pending.id, note) puis gère toast/close/error. */
  submit: (note: string, toastMessage: string) => Promise<void>;
  dismissToast: () => void;
  resetError: () => void;
}

export function useConfirmFlow({
  pending,
  onClose,
  onSuccess,
  closeDelayMs = 800,
}: UseConfirmFlowOptions): UseConfirmFlowState {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });

  const submit = async (note: string, toastMessage: string): Promise<void> => {
    if (!pending) return;
    setSaving(true);
    setError('');
    try {
      const result = await confirmAction(pending.id, note);
      if (result.success) {
        setToast({ show: true, message: toastMessage });
        if (onSuccess) onSuccess();
        setTimeout(() => onClose(), closeDelayMs);
      } else {
        setError(result.error ?? 'Erreur enregistrement');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    error,
    toast,
    submit,
    dismissToast: () => setToast({ show: false, message: '' }),
    resetError: () => setError(''),
  };
}
