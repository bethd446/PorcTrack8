/**
 * QuickConfirmReformeForm — Confirmation rapide d'une réforme suggérée
 * ════════════════════════════════════════════════════════════════════
 * Ouvert depuis /today (cards "Confirmations en attente · CONFIRM REFORME").
 * Délègue à `confirmAction()` du confirmationQueue ; le shell saving/error/
 * toast est factorisé via `useConfirmFlow`.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';

import { BottomSheet } from '../agritech';
import type { PendingConfirmation } from '../../services/confirmationQueue';
import { useConfirmFlow } from './useConfirmFlow';

export interface QuickConfirmReformeFormProps {
  isOpen: boolean;
  onClose: () => void;
  pending: PendingConfirmation | null;
  onSuccess?: () => void;
}

const REFORME_MOTIFS = [
  { value: 'INACTIVE_LONG', label: 'Inactivité prolongée' },
  { value: 'PERF_INSUFFISANTE', label: 'Mauvaise productivité' },
  { value: 'BOITERIE', label: 'Boiterie' },
  { value: 'MALADIE', label: 'Maladie' },
  { value: 'AGE', label: 'Âge' },
  { value: 'AUTRE', label: 'Autre' },
] as const;

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const QuickConfirmReformeForm: React.FC<QuickConfirmReformeFormProps> = ({
  isOpen,
  onClose,
  pending,
  onSuccess,
}) => {
  const payload = pending?.action.payload ?? {};
  const truieId = String(payload.idValue ?? '');

  const motifSuggere = useMemo(() => {
    if (!pending) return 'INACTIVE_LONG';
    const match = pending.alertMessage.match(/Motif\s*:\s*([A-Z_]+)/);
    if (match && REFORME_MOTIFS.some(m => m.value === match[1])) return match[1];
    return 'INACTIVE_LONG';
  }, [pending]);

  const [motif, setMotif] = useState<string>(motifSuggere);
  const [motifAutre, setMotifAutre] = useState<string>('');
  const [dateSortie, setDateSortie] = useState<string>(todayIso());
  const { saving, error, toast, submit, dismissToast, resetError } = useConfirmFlow({
    pending,
    onClose,
    onSuccess,
  });

  useEffect(() => {
    if (isOpen) {
      setMotif(motifSuggere);
      setDateSortie(todayIso());
      setMotifAutre('');
      resetError();
    }
    // resetError est stable (setter), pas besoin dans les deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, motifSuggere]);

  const handleConfirm = async (): Promise<void> => {
    const motifLabel = motif === 'AUTRE'
      ? `Autre — ${motifAutre.trim() || 'non précisé'}`
      : (REFORME_MOTIFS.find(m => m.value === motif)?.label ?? motif);
    const note = `Réforme confirmée le ${dateSortie} · Motif : ${motifLabel}`;
    await submit(note, `Réforme confirmée pour ${truieId}`);
  };

  if (!pending) return null;

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={`Confirmer la réforme de ${truieId}`}
        height="auto"
      >
        <div className="space-y-5">
          <div className="card-dense !p-4 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wide text-text-2">Truie</div>
            <div className="font-mono text-[13px] text-text-0">{truieId}</div>
            <p className="mt-2 font-mono text-[12px] text-text-1 leading-relaxed">
              {pending.alertMessage}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="reforme-motif" className="block font-mono text-[11px] uppercase text-text-2">
              Motif retenu
            </label>
            <select
              id="reforme-motif"
              className="w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 font-mono text-[13px]"
              value={motif}
              onChange={e => setMotif(e.target.value)}
            >
              {REFORME_MOTIFS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {motif === 'AUTRE' && (
            <div className="space-y-2">
              <label htmlFor="reforme-motif-autre" className="block font-mono text-[11px] uppercase text-text-2">
                Préciser le motif
              </label>
              <input
                id="reforme-motif-autre"
                type="text"
                maxLength={120}
                className="w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 font-mono text-[13px]"
                value={motifAutre}
                onChange={e => setMotifAutre(e.target.value)}
                placeholder="Ex. comportement agressif"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="reforme-date" className="block font-mono text-[11px] uppercase text-text-2">
              Date de sortie
            </label>
            <input
              id="reforme-date"
              type="date"
              className="w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 font-mono text-[13px]"
              value={dateSortie}
              onChange={e => setDateSortie(e.target.value)}
              max={todayIso()}
            />
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
            aria-label="Confirmer la réforme"
            className="pressable w-full h-14 rounded-md bg-accent text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide"
          >
            {saving ? 'Enregistrement…' : 'Confirmer la réforme'}
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

export default QuickConfirmReformeForm;
