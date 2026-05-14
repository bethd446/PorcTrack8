/**
 * useConfirmFlow — Shell partagé entre QuickConfirmSevrageForm/ReformeForm
 * ════════════════════════════════════════════════════════════════════════
 * Centralise le state saving/error et le call à confirmAction() du
 * confirmationQueue. Les forms gardent leur UI propre (champs, layout,
 * format de note) — seul le boilerplate transactionnel est factorisé.
 *
 * Phase 3a — toast canonique : l'émission du toast de succès passe désormais
 * par `useToast()` (context global monté dans App), conformément au
 * FORM_CONTRACT. C'est l'inverse de la situation Phase 2 où le hook gardait
 * un `IonToast` local + un state `toast`.
 *
 * Compat API : `toast` et `dismissToast` restent dans `UseConfirmFlowState`
 * mais sont désormais INERTES (`toast.show` toujours `false`). Les deux
 * consommateurs (QuickConfirmSevrageForm / QuickConfirmReformeForm) rendent
 * encore un `<IonToast>` local câblé sur ces valeurs — il ne s'affichera plus
 * (le vrai toast vient du context global), sans changement visible pour
 * l'utilisateur. Phase 3b supprimera ces `<IonToast>` morts. Garder ces deux
 * clés évite de modifier des forms hors zone.
 */
import { useState } from 'react';

import { confirmAction, type PendingConfirmation } from '../../services/confirmationQueue';
import { useToast } from '../../context/ToastContext';

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
  /**
   * @deprecated Inerte depuis Phase 3a — l'émission passe par `useToast()`.
   * `show` reste `false` ; conservé pour compat des consommateurs hors zone.
   */
  toast: { show: boolean; message: string };
  /** Appelle confirmAction(pending.id, note) puis gère toast/close/error. */
  submit: (note: string, toastMessage: string) => Promise<void>;
  /** @deprecated Inerte depuis Phase 3a (no-op). */
  dismissToast: () => void;
  resetError: () => void;
}

const INERT_TOAST = { show: false, message: '' } as const;

export function useConfirmFlow({
  pending,
  onClose,
  onSuccess,
  closeDelayMs = 800,
}: UseConfirmFlowOptions): UseConfirmFlowState {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const submit = async (note: string, toastMessage: string): Promise<void> => {
    if (!pending) return;
    setSaving(true);
    setError('');
    try {
      const result = await confirmAction(pending.id, note);
      if (result.success) {
        showToast(toastMessage, 'success');
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
    toast: INERT_TOAST,
    submit,
    dismissToast: () => { /* no-op — toast géré par useToast (Phase 3a) */ },
    resetError: () => setError(''),
  };
}
