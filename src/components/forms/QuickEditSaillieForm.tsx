import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save, Calendar, Heart } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import type { Saillie } from '../../types/farm';
import {
  validateSaillieEdit,
  addDaysIso,
  frToIso,
  STATUT_OPTIONS,
  GESTATION_DAYS,
  type SaillieEditForm,
  type SaillieEditInitial,
  type SaillieEditValidation,
} from './quickEditSaillieValidation';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

/* ═════════════════════════════════════════════════════════════════════════
   QuickEditSaillieForm · Édition rapide d'une saillie enregistrée
   ─────────────────────────────────────────────────────────────────────────
   Sections :
     - Couple         : Truie (readonly) · Verrat (select)
     - Planning       : Date saillie · Date MB prévue (auto +115j, éditable)
     - Statut         : Active · Confirmée · Non confirmée · Avortement · Archivée
     - Notes          : textarea max 200 chars

   Submit → enqueueUpdateRow('SUIVI_REPRODUCTION_ACTUEL', 'ID TRUIE',
                              saillie.truieId, patch)
   Clés canoniques (cf. mapSaillie) : ID TRUIE · VERRAT · DATE SAILLIE
   · DATE MB PREVUE · STATUT · NOTES.

   Note : `Saillie` n'a pas d'`id` stable — on utilise `ID TRUIE` comme clé,
   le backend GAS matche la ligne la plus récente pour cette truie.

   Patch PARTIEL : seuls les champs modifiés sont envoyés.
   ═════════════════════════════════════════════════════════════════════════ */

// Re-exports
export {
  validateSaillieEdit,
  STATUT_OPTIONS,
  GESTATION_DAYS,
  addDaysIso,
  frToIso,
  isoToFr,
} from './quickEditSaillieValidation';
export type {
  SaillieEditPatch,
  SaillieEditValidation,
  SaillieEditForm,
  SaillieEditInitial,
  SaillieStatutOption,
} from './quickEditSaillieValidation';

export interface QuickEditSaillieFormProps {
  isOpen: boolean;
  onClose: () => void;
  saillie: Saillie;
  onSuccess?: () => void;
}

const QuickEditSaillieForm: React.FC<QuickEditSaillieFormProps> = ({
  isOpen,
  onClose,
  saillie,
  onSuccess,
}) => {
  const { truies, verrats, refreshData } = useFarm();

  // ── Initial (conversion dd/MM/yyyy → ISO pour <input type="date"/>) ──
  const initial: SaillieEditInitial = useMemo(
    () => ({
      truieId: saillie.truieId ?? '',
      verratId: saillie.verratId ?? '',
      dateSaillie: frToIso(saillie.dateSaillie ?? ''),
      dateMBPrevue: frToIso(saillie.dateMBPrevue ?? ''),
      statut: saillie.statut ?? '',
      notes: saillie.notes ?? '',
    }),
    [saillie],
  );

  const [verratId, setVerratId] = useState<string>(initial.verratId);
  const [dateSaillie, setDateSaillie] = useState<string>(initial.dateSaillie);
  const [dateMBPrevue, setDateMBPrevue] = useState<string>(initial.dateMBPrevue);
  /** Tag : l'utilisateur a-t-il édité manuellement la date MB ? Si non,
   *  on auto-recalcule quand dateSaillie change. */
  const [mbManuallyEdited, setMbManuallyEdited] = useState<boolean>(false);
  const [statut, setStatut] = useState<string>(initial.statut);
  const [notes, setNotes] = useState<string>(initial.notes);
  const [errors, setErrors] = useState<SaillieEditValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset à chaque (ré)ouverture
  useEffect(() => {
    if (!isOpen) return;
    setVerratId(initial.verratId);
    setDateSaillie(initial.dateSaillie);
    setDateMBPrevue(initial.dateMBPrevue);
    setMbManuallyEdited(false);
    setStatut(initial.statut);
    setNotes(initial.notes);
    setErrors({});
    setSaving(false);
  }, [isOpen, initial]);

  // ── Auto-calc dateMBPrevue quand dateSaillie change (sauf si édité) ──
  useEffect(() => {
    if (mbManuallyEdited) return;
    if (!dateSaillie) return;
    const computed = addDaysIso(dateSaillie, GESTATION_DAYS);
    if (computed && computed !== dateMBPrevue) {
      setDateMBPrevue(computed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateSaillie, mbManuallyEdited]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc + focus auto sur 1er input modifiable (verrat select)
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(isOpen);

  // ── Verrats actifs (filtre statut) ────────────────────────────────────
  const verratsActifs = useMemo(() => {
    return verrats.filter(
      v => /actif/i.test(v.statut || '') || v.id === initial.verratId,
    );
  }, [verrats, initial.verratId]);

  // ── Truie snapshot (readonly display) ─────────────────────────────────
  const truie = useMemo(
    () => truies.find(t => t.id === saillie.truieId || t.displayId === saillie.truieId),
    [truies, saillie.truieId],
  );
  const truieLabel = truie
    ? `${truie.displayId}${truie.nom ? ' · ' + truie.nom : ''}`
    : saillie.truieNom
      ? `${saillie.truieId} · ${saillie.truieNom}`
      : saillie.truieId || '—';

  // ── Auto-calc hint ────────────────────────────────────────────────────
  const autoMbIso = useMemo(
    () => (dateSaillie ? addDaysIso(dateSaillie, GESTATION_DAYS) : ''),
    [dateSaillie],
  );
  const mbHasAutoDrift =
    !!autoMbIso && !!dateMBPrevue && autoMbIso !== dateMBPrevue;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateSaillieEdit(
      {
        truieId: saillie.truieId,
        verratId,
        dateSaillie,
        dateMBPrevue,
        statut,
        notes,
      },
      initial,
    );
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (Object.keys(result.patch).length === 0) {
      setToast('Aucune modification');
      onClose();
      return;
    }
    setSaving(true);
    try {
      await enqueueUpdateRow(
        'SUIVI_REPRODUCTION_ACTUEL',
        'ID TRUIE',
        saillie.truieId,
        result.patch,
      );
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(
        online
          ? 'Modifications enregistrées'
          : 'Modifications en file · sync auto',
      );
      try {
        await refreshData();
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement local',
      );
    } finally {
      setSaving(false);
    }
  };

  // Classe réutilisable
  const inputBaseClass = (invalid: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'font-mono text-[14px]',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      invalid ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={`Éditer saillie · ${truie?.displayId || saillie.truieId}`}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
          aria-label="Édition saillie"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Corriger une saillie
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 tabular-nums mt-0.5">
                {truieLabel}
                {saillie.dateSaillie ? ` · ${saillie.dateSaillie}` : ''}
              </p>
            </div>
          </div>

          {/* ═══ Section Couple ══════════════════════════════════════ */}
          <section aria-label="Couple" className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              Couple
            </h3>

            {/* Truie (readonly) */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-saillie-truie"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Truie <span className="text-text-2 normal-case">· verrouillée</span>
              </label>
              <input
                id="edit-saillie-truie"
                type="text"
                readOnly
                aria-readonly="true"
                aria-label={`Truie de la saillie ${truieLabel}`}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-2 border border-border text-text-1',
                  'font-mono text-[14px]',
                  'cursor-not-allowed',
                ].join(' ')}
                value={truieLabel}
              />
            </div>

            {/* Verrat (select) */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-saillie-verrat"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Verrat <span className="text-red normal-case">· requis</span>
              </label>
              <select
                id="edit-saillie-verrat"
                ref={firstFieldRef}
                aria-label="Choix du verrat"
                aria-required="true"
                aria-invalid={!!errors.verratId}
                aria-describedby={
                  errors.verratId ? 'edit-saillie-verrat-error' : undefined
                }
                className={inputBaseClass(!!errors.verratId)}
                value={verratId}
                onChange={e => setVerratId(e.target.value)}
                disabled={saving}
              >
                <option value="">— Sélectionner —</option>
                {verratsActifs.map(v => (
                  <option key={v.id} value={v.displayId}>
                    {v.displayId}
                    {v.nom ? ` · ${v.nom}` : ''}
                  </option>
                ))}
                {/* Si verratId initial n'est dans aucune liste, on l'inclut */}
                {initial.verratId &&
                !verratsActifs.some(v => v.displayId === initial.verratId) ? (
                  <option value={initial.verratId}>{initial.verratId}</option>
                ) : null}
              </select>
              {errors.verratId ? (
                <p
                  id="edit-saillie-verrat-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.verratId}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Section Planning ════════════════════════════════════ */}
          <section aria-label="Planning" className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              Planning
            </h3>

            {/* Date saillie */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-saillie-date"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Date saillie <span className="text-red normal-case">· requis</span>
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="edit-saillie-date"
                  type="date"
                  aria-label="Date de la saillie"
                  aria-required="true"
                  aria-invalid={!!errors.dateSaillie}
                  aria-describedby={
                    errors.dateSaillie
                      ? 'edit-saillie-date-error'
                      : 'edit-saillie-date-hint'
                  }
                  className={[
                    inputBaseClass(!!errors.dateSaillie),
                    'pl-9',
                  ].join(' ')}
                  value={dateSaillie}
                  onChange={e => setDateSaillie(e.target.value)}
                  disabled={saving}
                />
              </div>
              <p
                id="edit-saillie-date-hint"
                className="font-mono text-[10px] text-text-2"
              >
                Détermine la date MB prévue ({GESTATION_DAYS}j gestation)
              </p>
              {errors.dateSaillie ? (
                <p
                  id="edit-saillie-date-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.dateSaillie}
                </p>
              ) : null}
            </div>

            {/* Date MB prévue */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-saillie-mb"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Date MB prévue{' '}
                <span className="text-text-2 normal-case">
                  {mbManuallyEdited ? '· édité manuellement' : `· auto +${GESTATION_DAYS}j`}
                </span>
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="edit-saillie-mb"
                  type="date"
                  aria-label="Date de mise-bas prévue"
                  aria-invalid={!!errors.dateMBPrevue}
                  aria-describedby={
                    errors.dateMBPrevue
                      ? 'edit-saillie-mb-error'
                      : 'edit-saillie-mb-hint'
                  }
                  className={[
                    inputBaseClass(!!errors.dateMBPrevue),
                    'pl-9',
                  ].join(' ')}
                  value={dateMBPrevue}
                  onChange={e => {
                    setDateMBPrevue(e.target.value);
                    setMbManuallyEdited(true);
                  }}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p
                  id="edit-saillie-mb-hint"
                  className="font-mono text-[10px] text-text-2"
                >
                  {mbHasAutoDrift
                    ? `Auto suggéré : ${autoMbIso}`
                    : 'Ajuster si saillie échouée ou re-saillie'}
                </p>
                {mbManuallyEdited && dateSaillie ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMbManuallyEdited(false);
                      setDateMBPrevue(addDaysIso(dateSaillie, GESTATION_DAYS));
                    }}
                    disabled={saving}
                    className="font-mono text-[10px] uppercase tracking-wide text-accent hover:underline"
                    aria-label="Recalculer la date MB prévue automatiquement"
                  >
                    Reset auto
                  </button>
                ) : null}
              </div>
              {errors.dateMBPrevue ? (
                <p
                  id="edit-saillie-mb-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.dateMBPrevue}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Section Statut ══════════════════════════════════════ */}
          <section aria-label="Statut" className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              Statut
            </h3>
            <div className="space-y-1.5">
              <label
                htmlFor="edit-saillie-statut"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Statut de la saillie
              </label>
              <select
                id="edit-saillie-statut"
                aria-label="Statut de la saillie"
                aria-invalid={!!errors.statut}
                aria-describedby={
                  errors.statut ? 'edit-saillie-statut-error' : undefined
                }
                className={inputBaseClass(!!errors.statut)}
                value={statut}
                onChange={e => setStatut(e.target.value)}
                disabled={saving}
              >
                <option value="">— Non renseigné —</option>
                {STATUT_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {/* Tolérance : si statut initial hors liste, on l'affiche */}
                {initial.statut &&
                !(STATUT_OPTIONS as readonly string[]).includes(initial.statut) ? (
                  <option value={initial.statut}>{initial.statut} (legacy)</option>
                ) : null}
              </select>
              {errors.statut ? (
                <p
                  id="edit-saillie-statut-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.statut}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Section Notes ═══════════════════════════════════════ */}
          <section aria-label="Notes" className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              Notes
            </h3>
            <div className="space-y-1.5">
              <label
                htmlFor="edit-saillie-notes"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Notes <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <textarea
                id="edit-saillie-notes"
                maxLength={200}
                rows={3}
                aria-label="Notes sur la saillie"
                aria-invalid={!!errors.notes}
                aria-describedby={
                  errors.notes
                    ? 'edit-saillie-notes-error'
                    : 'edit-saillie-notes-hint'
                }
                className={[
                  'w-full rounded-md px-3 py-2',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  'resize-none',
                  errors.notes ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="Observations, conditions, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
              />
              <p
                id="edit-saillie-notes-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {notes.trim().length}/200
              </p>
              {errors.notes ? (
                <p
                  id="edit-saillie-notes-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.notes}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Actions ═════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              aria-label="Annuler et fermer"
              className={[
                'pressable flex-1 h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-bg-1 border border-border text-text-1',
                'font-mono text-[12px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms] hover:border-text-2',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                saving ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              aria-label="Enregistrer les modifications de la saillie"
              aria-busy={saving}
              className={[
                'pressable flex-[2] h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-accent text-bg-0',
                'font-mono text-[13px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                saving ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
              ].join(' ')}
            >
              {saving ? (
                <span className="animate-pulse">Enregistrement…</span>
              ) : (
                <>
                  <Heart size={14} aria-hidden="true" />
                  <span>Enregistrer</span>
                  <Save size={14} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={1800}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

export default QuickEditSaillieForm;
