/**
 * QuickConfirmReformeForm — Confirmation rapide d'une réforme suggérée
 * ════════════════════════════════════════════════════════════════════
 * Ouvert depuis /today (cards "Confirmations en attente · CONFIRM REFORME").
 * Délègue à `confirmAction()` du confirmationQueue ; le shell saving/error/
 * toast est factorisé via `useConfirmFlow`.
 *
 * Conforme au contrat (FORM_CONTRACT) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - helpers date partagés `_formHelpers` (todayIso)
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - toast canonique : émis par `useConfirmFlow` via `useToast()` (Phase 3a) ;
 *    plus de `<IonToast>` local (supprimé en Phase 3b — clés `toast`/
 *    `dismissToast` du hook inertes).
 */
import React, { useMemo, useState } from 'react';

import { FormField, Input, Select } from '@/design-system';
import type { PendingConfirmation } from '../../services/confirmationQueue';
import { useConfirmFlow } from './useConfirmFlow';
import { todayIso } from './_formHelpers';
import QuickActionSheet from './QuickActionSheet';

export interface QuickConfirmReformeFormProps {
  isOpen: boolean;
  onClose: () => void;
  pending: PendingConfirmation | null;
  onSuccess?: () => void;
}

const REFORME_MOTIFS = [
  { value: 'INACTIVE_LONG', label: 'Truie inactive longue durée' },
  { value: 'PERF_INSUFFISANTE', label: 'Productivité faible' },
  { value: 'BOITERIE', label: 'Boiterie' },
  { value: 'MALADIE', label: 'Maladie' },
  { value: 'AGE', label: 'Âge' },
  { value: 'AUTRE', label: 'Autre' },
] as const;

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
  const { saving, error, submit, resetError } = useConfirmFlow({
    pending,
    onClose,
    onSuccess,
  });

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; motifSuggere: string }>({
    isOpen, motifSuggere,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.motifSuggere !== motifSuggere) {
    setLastOpenKey({ isOpen, motifSuggere });
    if (isOpen) {
      setMotif(motifSuggere);
      setDateSortie(todayIso());
      setMotifAutre('');
      resetError();
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const motifLabel = motif === 'AUTRE'
      ? `Autre — ${motifAutre.trim() || 'non précisé'}`
      : (REFORME_MOTIFS.find(m => m.value === motif)?.label ?? motif);
    const note = `Réforme confirmée le ${dateSortie} · Motif : ${motifLabel}`;
    await submit(note, `Réforme confirmée pour ${truieId}`);
  };

  if (!pending) return null;

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Confirmation en attente"
      title={`Confirmer la réforme de ${truieId}`}
      ariaLabel={`Confirmer la réforme de ${truieId}`}
      saving={saving}
      isValid={true}
      onSubmit={handleSubmit}
      submitLabel="Confirmer la réforme"
      submitAriaLabel="Confirmer la réforme"
    >
      <div className="space-y-5">
        <div className="card-dense !p-4 space-y-1">
          <div className="text-mono-micro text-text-2">Truie</div>
          <div className="ft-code text-[13px] text-text-0">{truieId}</div>
          <p className="mt-2 text-[12px] text-text-1 leading-relaxed">
            {pending.alertMessage}
          </p>
        </div>

        <FormField label="Motif retenu">
          <Select
            id="reforme-motif"
            aria-label="Motif retenu"
            value={motif}
            onChange={e => setMotif(e.target.value)}
            disabled={saving}
          >
            {REFORME_MOTIFS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        </FormField>

        {motif === 'AUTRE' && (
          <FormField label="Préciser le motif">
            <Input
              id="reforme-motif-autre"
              type="text"
              aria-label="Préciser le motif"
              maxLength={120}
              value={motifAutre}
              onChange={e => setMotifAutre(e.target.value)}
              placeholder="Ex. comportement agressif"
              disabled={saving}
            />
          </FormField>
        )}

        <FormField label="Date de sortie">
          <Input
            id="reforme-date"
            type="date"
            aria-label="Date de sortie"
            value={dateSortie}
            onChange={e => setDateSortie(e.target.value)}
            max={todayIso()}
            disabled={saving}
          />
        </FormField>

        {error && (
          <p role="alert" className="text-[11px] text-red">
            {error}
          </p>
        )}
      </div>
    </QuickActionSheet>
  );
};

export default QuickConfirmReformeForm;
