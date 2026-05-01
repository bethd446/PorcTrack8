/**
 * QuickConfirmSevrageForm — Confirmation rapide d'un sevrage en attente
 * ════════════════════════════════════════════════════════════════════
 * Ouvert depuis /today (cards "Confirmations en attente · CONFIRM SEVRAGE").
 * Délègue à `confirmAction()` du confirmationQueue ; le shell saving/error/
 * toast est factorisé via `useConfirmFlow`.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';

import { BottomSheet } from '../agritech';
import type { PendingConfirmation } from '../../services/confirmationQueue';
import { useConfirmFlow } from './useConfirmFlow';

export interface QuickConfirmSevrageFormProps {
  isOpen: boolean;
  onClose: () => void;
  pending: PendingConfirmation | null;
  onSuccess?: () => void;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const QuickConfirmSevrageForm: React.FC<QuickConfirmSevrageFormProps> = ({
  isOpen,
  onClose,
  pending,
  onSuccess,
}) => {
  const payload = pending?.action.payload ?? {};
  const bandeId = String(payload.idValue ?? '');
  // Stabilise la valeur entre re-renders du parent : ne change que si on
  // bascule sur une autre confirmation (autre id) ou si on (ré)ouvre le sheet.
  const sevresDefault = useMemo(() => {
    const patch = payload.patch as Record<string, unknown> | undefined;
    const v = patch?.SEVRES;
    return typeof v === 'number' ? v : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id, isOpen]);

  const [dateSevrage, setDateSevrage] = useState<string>(todayIso());
  const [nbSevres, setNbSevres] = useState<number>(sevresDefault);
  const { saving, error, toast, submit, dismissToast, resetError } = useConfirmFlow({
    pending,
    onClose,
    onSuccess,
  });

  useEffect(() => {
    if (isOpen) {
      setDateSevrage(todayIso());
      setNbSevres(sevresDefault);
      resetError();
    }
    // sevresDefault est dérivé de [pending?.id, isOpen] donc retiré des deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pending?.id]);

  const handleConfirm = async (): Promise<void> => {
    const note = `Sevrage confirmé le ${dateSevrage} · ${nbSevres} porcelet(s) sevré(s)`;
    await submit(note, `Sevrage confirmé pour ${bandeId}`);
  };

  if (!pending) return null;

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={`Confirmer le sevrage de ${bandeId}`}
        height="auto"
      >
        <div className="space-y-5">
          <div className="card-dense !p-4 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wide text-text-2">Bande</div>
            <div className="font-mono text-[13px] text-text-0">{bandeId}</div>
            <p className="mt-2 font-mono text-[12px] text-text-1 leading-relaxed">
              {pending.alertMessage}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="sevrage-date" className="block font-mono text-[11px] uppercase text-text-2">
              Date de sevrage réelle
            </label>
            <input
              id="sevrage-date"
              type="date"
              className="w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 font-mono text-[13px]"
              value={dateSevrage}
              onChange={e => setDateSevrage(e.target.value)}
              max={todayIso()}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="sevrage-nb" className="block font-mono text-[11px] uppercase text-text-2">
              Nombre de porcelets sevrés
            </label>
            <input
              id="sevrage-nb"
              type="number"
              min={0}
              className="w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 font-mono text-[13px]"
              value={nbSevres}
              onChange={e => setNbSevres(Math.max(0, Number(e.target.value) || 0))}
            />
            <span className="block font-mono text-[11px] text-text-2">
              Suggéré : {sevresDefault} porcelet(s) sous mère
            </span>
          </div>

          {error && (
            <p role="alert" className="font-mono text-[11px] text-red">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            aria-busy={saving}
            aria-label="Confirmer le sevrage"
            className="pressable w-full h-14 rounded-md bg-accent text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide"
          >
            {saving ? 'Enregistrement…' : 'Confirmer le sevrage'}
          </button>
        </div>
      </BottomSheet>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={2200}
        position="bottom"
        onDidDismiss={dismissToast}
      />
    </>
  );
};

export default QuickConfirmSevrageForm;
