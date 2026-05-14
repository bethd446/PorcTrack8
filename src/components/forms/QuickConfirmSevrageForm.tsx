/**
 * QuickConfirmSevrageForm — Confirmation rapide d'un sevrage en attente
 * ════════════════════════════════════════════════════════════════════
 * Ouvert depuis /today (cards "Confirmations en attente · CONFIRM SEVRAGE").
 * Délègue à `confirmAction()` du confirmationQueue ; le shell saving/error/
 * toast est factorisé via `useConfirmFlow`.
 *
 * Conforme au contrat (FORM_CONTRACT) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - rendu d'erreur via `<FieldError>` (poids invalide)
 *  - helpers date partagés `_formHelpers` (todayIso)
 *  - reset-on-open via `lastOpenKey` render-phase
 *
 * Note SPEC : le toast transactionnel reste géré par `useConfirmFlow`
 * (hook partagé, hors zone) via son `IonToast` local — la bascule vers
 * `useToast()` exigerait de modifier `useConfirmFlow.ts`.
 */
import React, { useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Lightbulb } from 'lucide-react';

import { FormField, Input } from '@/design-system';
import type { PendingConfirmation } from '../../services/confirmationQueue';
import { setBandePoidsInitial } from '../../services/supabaseWrites';
import { useConfirmFlow } from './useConfirmFlow';
import { FieldError } from './_formFields';
import { todayIso } from './_formHelpers';
import QuickActionSheet from './QuickActionSheet';

export interface QuickConfirmSevrageFormProps {
  isOpen: boolean;
  onClose: () => void;
  pending: PendingConfirmation | null;
  onSuccess?: () => void;
}

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
  const [poidsKg, setPoidsKg] = useState<string>('');
  const [poidsError, setPoidsError] = useState<string>('');
  const { saving, error, toast, submit, dismissToast, resetError } = useConfirmFlow({
    pending,
    onClose,
    onSuccess,
  });

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; pendingId: string | undefined }>({
    isOpen, pendingId: pending?.id,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.pendingId !== pending?.id) {
    setLastOpenKey({ isOpen, pendingId: pending?.id });
    if (isOpen) {
      setDateSevrage(todayIso());
      setNbSevres(sevresDefault);
      setPoidsKg('');
      setPoidsError('');
      resetError();
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const poids = parseFloat(poidsKg.replace(',', '.'));
    if (!Number.isFinite(poids) || poids < 0.5 || poids > 50) {
      setPoidsError('Poids invalide');
      return;
    }
    setPoidsError('');
    const note = `Sevrage confirmé le ${dateSevrage} · ${nbSevres} porcelet(s) sevré(s) · poids moyen ${poids} kg`;
    await submit(note, `Sevrage confirmé pour ${bandeId}`);
    if (bandeId) {
      try {
        await setBandePoidsInitial(bandeId, poids);
      } catch (err) {
        console.warn('[sevrage] poids initial échoué', err);
      }
    }
  };

  if (!pending) return null;

  return (
    <>
      <QuickActionSheet
        isOpen={isOpen}
        onClose={onClose}
        eyebrow="Confirmation en attente"
        title={`Confirmer le sevrage de ${bandeId}`}
        ariaLabel={`Confirmer le sevrage de ${bandeId}`}
        saving={saving}
        isValid={!!poidsKg}
        onSubmit={handleSubmit}
        submitLabel="Confirmer le sevrage"
        submitAriaLabel="Confirmer le sevrage"
      >
        <div className="space-y-5">
          <div className="card-dense !p-4 space-y-1">
            <div className="text-mono-micro text-text-2">Bande</div>
            <div className="ft-code text-[13px] text-text-0">{bandeId}</div>
            <p className="mt-2 text-[12px] text-text-1 leading-relaxed">
              {pending.alertMessage}
            </p>
          </div>

          <aside
            role="note"
            style={{
              background: 'rgba(244, 162, 97, 0.10)',
              border: '1px solid rgba(244, 162, 97, 0.35)',
              borderRadius: 14,
              padding: '10px 12px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <Lightbulb size={16} aria-hidden />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Le saviez-vous ?
              </strong>
              <p style={{ fontSize: 11, margin: '3px 0 0', lineHeight: 1.4 }}>
                Le poids moyen au sevrage est <strong>obligatoire</strong> : il fixe la
                base de calcul du gain de poids et de l'IC pour cette bande.
              </p>
              <a
                href="/reglages/encyclopedie?slug=05-sevrage-timing-conditions"
                style={{ fontSize: 10, color: 'var(--pt-accent)', textDecoration: 'underline' }}
              >
                En savoir plus ›
              </a>
            </div>
          </aside>

          <FormField label="Date de sevrage réelle">
            <Input
              id="sevrage-date"
              type="date"
              aria-label="Date de sevrage réelle"
              className="font-mono tabular-nums"
              value={dateSevrage}
              onChange={e => setDateSevrage(e.target.value)}
              max={todayIso()}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Nombre de porcelets sevrés"
            hint={`Suggéré : ${sevresDefault} porcelet(s) sous mère`}
          >
            <Input
              id="sevrage-nb"
              type="number"
              aria-label="Nombre de porcelets sevrés"
              min={0}
              value={nbSevres}
              onChange={e => setNbSevres(Math.max(0, Number(e.target.value) || 0))}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Poids moyen sevrage (kg)"
            required
            hint="5-7 kg cible"
          >
            <Input
              id="sevrage-poids"
              type="number"
              inputMode="decimal"
              aria-label="Poids moyen sevrage"
              step={0.1}
              min={0.5}
              max={50}
              aria-required="true"
              className="tabular-nums"
              value={poidsKg}
              onChange={e => setPoidsKg(e.target.value)}
              placeholder="6.0"
              disabled={saving}
            />
            <FieldError message={poidsError} />
            {(() => {
              const p = parseFloat(poidsKg.replace(',', '.'));
              if (!Number.isFinite(p) || poidsKg.trim() === '') return null;
              if (p < 4 || p > 10) {
                return (
                  <span
                    role="status"
                    className="mt-2 inline-flex items-center px-2 h-6 rounded-full bg-amber-100 border border-amber-300 text-mono-micro text-amber-900"
                  >
                    Hors plage cible 5-7 kg
                  </span>
                );
              }
              return null;
            })()}
          </FormField>

          {error && (
            <p role="alert" className="text-[11px] text-red">
              {error}
            </p>
          )}
        </div>
      </QuickActionSheet>

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
