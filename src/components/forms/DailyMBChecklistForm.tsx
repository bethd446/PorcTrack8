/**
 * DailyMBChecklistForm — Daily check 10 questions pour bandes "Sous mère".
 * ════════════════════════════════════════════════════════════════════════
 * - Précharge le check du jour s'il existe déjà → mode édition
 * - Submit fait UPSERT sur (batch_id, date_check) via mbWorkflowService
 * - Validation pure dans `dailyMBChecklistLogic`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { Button } from '@/design-system';
import {
  getDailyCheckForBatch,
  submitDailyCheck,
} from '../../services/mbWorkflowService';
import { useEscapeKey } from './useFormA11y';
import {
  emptyDraft,
  todayIso,
  validateDailyMB,
  type Comportement,
  type DailyMBDraft,
  type DailyMBValidation,
  type Diarrhee,
  type TruieAlimentation,
} from './dailyMBChecklistLogic';

export interface DailyMBChecklistFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** UUID de la bande (phase Sous mère). */
  batchId: string;
  onSuccess?: () => void;
}

const COMPORTEMENT_OPTIONS: ReadonlyArray<{ v: Comportement; l: string }> = [
  { v: 'CALME', l: 'Calme' },
  { v: 'NORMAL', l: 'Normal' },
  { v: 'AGITE', l: 'Agitée' },
];

const TRUIE_ALIM_OPTIONS: ReadonlyArray<{ v: TruieAlimentation; l: string }> = [
  { v: 'OUI', l: 'Oui' },
  { v: 'PARTIEL', l: 'Partiel' },
  { v: 'NON', l: 'Non' },
];

const DIARRHEE_OPTIONS: ReadonlyArray<{ v: Diarrhee; l: string }> = [
  { v: 'AUCUN', l: 'Aucun' },
  { v: 'QUELQUES', l: 'Quelques-uns' },
  { v: 'TOUS', l: 'Tous' },
];

const DailyMBChecklistForm: React.FC<DailyMBChecklistFormProps> = ({
  isOpen,
  onClose,
  batchId,
  onSuccess,
}) => {
  const [draft, setDraft] = useState<DailyMBDraft>(() => emptyDraft());
  const [errors, setErrors] = useState<DailyMBValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState('');

  // Reset à l'ouverture + tentative préchargement
  const [lastKey, setLastKey] = useState({ isOpen, batchId });
  if (lastKey.isOpen !== isOpen || lastKey.batchId !== batchId) {
    setLastKey({ isOpen, batchId });
    if (isOpen) {
      setDraft(emptyDraft());
      setErrors({});
      setSaving(false);
      setEditMode(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !batchId) return;
    let cancelled = false;
    void (async () => {
      const existing = await getDailyCheckForBatch(batchId, todayIso());
      if (cancelled || !existing) return;
      setEditMode(true);
      setDraft({
        mortsJour: String(existing.morts_jour ?? 0),
        comportement: existing.comportement ?? '',
        truieAlimentation: existing.truie_alimentation ?? '',
        mamellesUtilisees: existing.mamelles_utilisees,
        diarrhee: existing.diarrhee ?? '',
        respirationOk: existing.respiration_ok,
        lampeOk: existing.lampe_ok,
        eauOk: existing.eau_ok,
        notes: existing.notes ?? '',
        photoUrl: existing.photo_url ?? '',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, batchId]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateDailyMB(draft);
    if (!result.ok || !result.values) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await submitDailyCheck({
        batch_id: batchId,
        date_check: todayIso(),
        morts_jour: result.values.mortsJour,
        comportement: result.values.comportement,
        truie_alimentation: result.values.truieAlimentation,
        mamelles_utilisees: result.values.mamellesUtilisees,
        diarrhee: result.values.diarrhee,
        respiration_ok: result.values.respirationOk,
        lampe_ok: result.values.lampeOk,
        eau_ok: result.values.eauOk,
        notes: result.values.notes,
        photo_url: result.values.photoUrl,
      });
      setToast(editMode ? 'Daily check mis à jour' : 'Daily check enregistré');
      onSuccess?.();
      onClose();
    } catch (err) {
      setToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const inputBase = (hasError: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'text-[14px]',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      hasError ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  const labelCls = 'block text-mono-label text-text-2';

  // Patch helper
  const patch = (k: keyof DailyMBDraft, v: DailyMBDraft[keyof DailyMBDraft]): void =>
    setDraft(d => ({ ...d, [k]: v } as DailyMBDraft));

  // Ternary pill (oui / non / partiel) ou (oui / non)
  const renderTernary = <T extends string>(
    options: ReadonlyArray<{ v: T; l: string }>,
    value: T | '',
    onChange: (v: T | '') => void,
    testId?: string,
  ): React.ReactNode => (
    <div className="flex gap-2" data-testid={testId}>
      {options.map(o => (
        <Button
          key={o.v}
          type="button"
          variant={value === o.v ? 'primary' : 'secondary'}
          size="small"
          onClick={() => onChange(value === o.v ? '' : o.v)}
          className={[
            'pressable flex-1 h-10 text-[12px] uppercase tracking-wide border',
            value === o.v
              ? 'bg-accent text-bg-0 border-accent'
              : 'bg-bg-1 text-text-1 border-border hover:border-text-2',
          ].join(' ')}
          style={{ borderRadius: '0.375rem', height: '2.5rem' }}
        >
          {o.l}
        </Button>
      ))}
    </div>
  );

  const renderBoolean = (
    value: boolean | null,
    onChange: (v: boolean | null) => void,
    testId?: string,
  ): React.ReactNode => (
    <div className="flex gap-2" data-testid={testId}>
      <Button
        type="button"
        variant={value === true ? 'primary' : 'secondary'}
        size="small"
        onClick={() => onChange(value === true ? null : true)}
        className={[
          'pressable flex-1 h-10 text-[12px] uppercase tracking-wide border',
          value === true
            ? 'bg-accent text-bg-0 border-accent'
            : 'bg-bg-1 text-text-1 border-border hover:border-text-2',
        ].join(' ')}
        style={{ borderRadius: '0.375rem', height: '2.5rem' }}
      >
        Oui
      </Button>
      <Button
        type="button"
        variant={value === false ? 'danger' : 'secondary'}
        size="small"
        onClick={() => onChange(value === false ? null : false)}
        className={[
          'pressable flex-1 h-10 text-[12px] uppercase tracking-wide border',
          value === false
            ? 'bg-red text-bg-0 border-red'
            : 'bg-bg-1 text-text-1 border-border hover:border-text-2',
        ].join(' ')}
        style={{ borderRadius: '0.375rem', height: '2.5rem' }}
      >
        Non
      </Button>
    </div>
  );

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={editMode ? 'Daily check (modif.)' : 'Daily check du jour'}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
          aria-label="Daily check porcelets sous mère"
          data-testid="daily-mb-checklist-form"
        >
          {editMode ? (
            <p className="text-[11px] text-amber-500">
              Un check existe déjà aujourd'hui — modification en cours.
            </p>
          ) : null}

          {/* Q1 — Morts du jour */}
          <div className="space-y-1.5">
            <label htmlFor="dmb-morts" className={labelCls}>
              1. Morts aujourd'hui <span className="text-red normal-case">·</span>
            </label>
            <input
              id="dmb-morts"
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              step={1}
              className={inputBase(!!errors.mortsJour)}
              value={draft.mortsJour}
              onChange={e => patch('mortsJour', e.target.value)}
              data-testid="dmb-morts"
            />
            {errors.mortsJour ? (
              <p role="alert" className="text-[11px] text-red">
                {errors.mortsJour}
              </p>
            ) : null}
          </div>

          {/* Q2 — Comportement portée */}
          <div className="space-y-1.5">
            <label className={labelCls}>2. Comportement portée</label>
            {renderTernary(
              COMPORTEMENT_OPTIONS,
              draft.comportement,
              v => patch('comportement', v),
              'dmb-comportement',
            )}
          </div>

          {/* Q3 — Truie mange */}
          <div className="space-y-1.5">
            <label className={labelCls}>3. Truie mange normalement</label>
            {renderTernary(
              TRUIE_ALIM_OPTIONS,
              draft.truieAlimentation,
              v => patch('truieAlimentation', v),
              'dmb-alim',
            )}
          </div>

          {/* Q4 — Mamelles utilisées */}
          <div className="space-y-1.5">
            <label className={labelCls}>4. Toutes mamelles utilisées</label>
            {renderBoolean(
              draft.mamellesUtilisees,
              v => patch('mamellesUtilisees', v),
              'dmb-mamelles',
            )}
          </div>

          {/* Q5 — Diarrhée */}
          <div className="space-y-1.5">
            <label className={labelCls}>5. Diarrhée détectée</label>
            {renderTernary(
              DIARRHEE_OPTIONS,
              draft.diarrhee,
              v => patch('diarrhee', v),
              'dmb-diarrhee',
            )}
          </div>

          {/* Q6 — Respiration */}
          <div className="space-y-1.5">
            <label className={labelCls}>6. Respiration normale</label>
            {renderBoolean(
              draft.respirationOk,
              v => patch('respirationOk', v),
              'dmb-respiration',
            )}
          </div>

          {/* Q7 — Lampe */}
          <div className="space-y-1.5">
            <label className={labelCls}>7. Lampe chauffante OK</label>
            {renderBoolean(draft.lampeOk, v => patch('lampeOk', v), 'dmb-lampe')}
          </div>

          {/* Q8 — Eau */}
          <div className="space-y-1.5">
            <label className={labelCls}>8. Eau accessible</label>
            {renderBoolean(draft.eauOk, v => patch('eauOk', v), 'dmb-eau')}
          </div>

          {/* Q9 — Notes */}
          <div className="space-y-1.5">
            <label htmlFor="dmb-notes" className={labelCls}>
              9. Notes terrain
            </label>
            <textarea
              id="dmb-notes"
              rows={3}
              className={[inputBase(!!errors.notes), '!h-auto py-2 leading-snug'].join(' ')}
              placeholder="Observations libres…"
              value={draft.notes}
              maxLength={1000}
              onChange={e => patch('notes', e.target.value)}
              data-testid="dmb-notes"
            />
            {errors.notes ? (
              <p role="alert" className="text-[11px] text-red">
                {errors.notes}
              </p>
            ) : null}
          </div>

          {/* Q10 — Photo (optionnelle) */}
          <div className="space-y-1.5">
            <label htmlFor="dmb-photo" className={labelCls}>
              10. URL photo (optionnel)
            </label>
            <input
              id="dmb-photo"
              type="url"
              className={inputBase(false)}
              placeholder="https://…"
              value={draft.photoUrl}
              onChange={e => patch('photoUrl', e.target.value)}
              data-testid="dmb-photo"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
              className="pressable flex-1 h-14 inline-flex items-center justify-center gap-2 bg-bg-1 border border-border text-text-1 text-[12px] font-bold uppercase tracking-wide hover:border-text-2"
              style={{ borderRadius: '0.375rem', height: '3.5rem' }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              aria-busy={saving}
              className="pressable flex-[2] h-14 inline-flex items-center justify-center gap-2 bg-accent text-bg-0 text-[13px] font-bold uppercase tracking-wide hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="dmb-submit"
              style={{ borderRadius: '0.375rem', height: '3.5rem' }}
            >
              {saving ? (
                <span className="animate-pulse">Enregistrement…</span>
              ) : (
                <>
                  <Save size={14} aria-hidden="true" />
                  {editMode ? 'Mettre à jour' : 'Valider check'}
                </>
              )}
            </Button>
          </div>
        </form>
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={2200}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

export default DailyMBChecklistForm;
