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
import { FormField, Input, Button } from '@/design-system';
import type { PendingConfirmation } from '../../services/confirmationQueue';
import { setBandePoidsInitial } from '../../services/supabaseWrites';
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
  const [poidsKg, setPoidsKg] = useState<string>('');
  const [poidsError, setPoidsError] = useState<string>('');
  const { saving, error, toast, submit, dismissToast, resetError } = useConfirmFlow({
    pending,
    onClose,
    onSuccess,
  });

  useEffect(() => {
    if (isOpen) {
      setDateSevrage(todayIso());
      setNbSevres(sevresDefault);
      setPoidsKg('');
      setPoidsError('');
      resetError();
    }
    // sevresDefault est dérivé de [pending?.id, isOpen] donc retiré des deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pending?.id]);

  const handleConfirm = async (): Promise<void> => {
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
      } catch (e) {
        console.warn('[sevrage] poids initial échoué', e);
      }
    }
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
            <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>💡</span>
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
                style={{ fontSize: 10, color: 'var(--color-accent, #c2662b)', textDecoration: 'underline' }}
              >
                En savoir plus →
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
            />
          </FormField>

          <FormField
            label="Poids moyen sevrage (kg)"
            required
            hint="5-7 kg cible"
            error={poidsError}
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
            />
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

          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            disabled={saving || !poidsKg}
            aria-busy={saving}
            ariaLabel="Confirmer le sevrage"
          >
            {saving ? 'Enregistrement…' : 'Confirmer le sevrage'}
          </Button>
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
