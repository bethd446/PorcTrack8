import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import type { BandePorcelets } from '../../types/farm';
import {
  validateBandeEdit,
  bandeToRawInput,
  BANDE_STATUTS,
  type BandeEditErrors,
  type BandeEditRawInput,
} from './quickEditBandeValidation';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

/* ═════════════════════════════════════════════════════════════════════════
   QuickEditBandeForm · Édition rapide d'une bande/portée
   ─────────────────────────────────────────────────────────────────────────
   Sections :
     - Identité (ID Portée readonly, truie, boucle mère)
     - Mise-bas (date MB, NV, morts, vivants)
     - Sevrage (date prévue, date réelle)
     - Séparation sexe (nbMales, nbFemelles, date séparation, loge)
     - Statut (select)
     - Notes (textarea 300 chars)

   Submit → enqueueUpdateRow('PORCELETS_BANDES_DETAIL', 'ID', bande.id, patch)
   Clés canoniques envoyées : DATE_MB, NV, MORTS, VIVANTS, DATE_SEVRAGE_PREVUE,
   DATE_SEVRAGE_REELLE, NB_MALES, NB_FEMELLES, DATE_SEPARATION,
   LOGE_ENGRAISSEMENT, STATUT, NOTES, TRUIE, BOUCLE_MERE.

   Dates converties ISO yyyy-MM-dd → dd/MM/yyyy (format Sheets).
   Patch partiel : seules les valeurs modifiées sont envoyées.
   ═════════════════════════════════════════════════════════════════════════ */

// Re-exports pour compat / consommateurs externes
export {
  validateBandeEdit,
  bandeToRawInput,
  BANDE_STATUTS,
} from './quickEditBandeValidation';
export type {
  BandeEditPatch,
  BandeEditErrors,
  BandeEditValidation,
  BandeEditRawInput,
  BandeStatutOption,
} from './quickEditBandeValidation';

export interface QuickEditBandeFormProps {
  isOpen: boolean;
  onClose: () => void;
  bande: BandePorcelets;
  onSuccess?: () => void;
}

const QuickEditBandeForm: React.FC<QuickEditBandeFormProps> = ({
  isOpen,
  onClose,
  bande,
  onSuccess,
}) => {
  const { refreshData } = useFarm();

  const initial = useMemo<BandeEditRawInput>(() => bandeToRawInput(bande), [bande]);

  const [form, setForm] = useState<BandeEditRawInput>(initial);
  const [errors, setErrors] = useState<BandeEditErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset quand la sheet (re)s'ouvre ou que la bande change
  useEffect(() => {
    if (!isOpen) return;
    setForm(bandeToRawInput(bande));
    setErrors({});
    setSaving(false);
  }, [isOpen, bande]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const update = <K extends keyof BandeEditRawInput>(
    key: K,
    value: BandeEditRawInput[K],
  ): void => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateBandeEdit(form, initial);
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    // Patch vide → pas d'appel réseau, on ferme simplement.
    if (Object.keys(result.patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await enqueueUpdateRow(
        'PORCELETS_BANDES_DETAIL',
        'ID',
        bande.id,
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

  const displayId = bande.idPortee || bande.id;

  // Classes inputs réutilisables
  const inputBase = (hasError: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'font-mono text-[14px] tabular-nums',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      hasError ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  const numInputCls = (hasError: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'font-mono text-[18px] tabular-nums text-center',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      hasError ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  const labelCls =
    'block font-mono text-[11px] uppercase tracking-wide text-text-2';

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={`Éditer · ${displayId}`}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
          aria-label="Édition bande"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Modifier la portée
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 tabular-nums mt-0.5">
                {displayId}
              </p>
            </div>
          </div>

          {/* ── Identité ────────────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Identité</legend>

            <div className="space-y-1.5">
              <label htmlFor="edit-bande-id" className={labelCls}>
                ID Portée
              </label>
              <input
                id="edit-bande-id"
                type="text"
                readOnly
                aria-readonly="true"
                aria-label={`Identifiant portée ${displayId}`}
                value={displayId}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-2 border border-border text-text-1',
                  'font-mono text-[14px] tabular-nums',
                  'cursor-not-allowed',
                ].join(' ')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-truie" className={labelCls}>
                  Truie (ID mère)
                </label>
                <input
                  id="edit-bande-truie"
                  ref={firstFieldRef}
                  type="text"
                  maxLength={30}
                  aria-invalid={!!errors.truie}
                  aria-describedby={errors.truie ? 'edit-bande-truie-error' : undefined}
                  className={inputBase(!!errors.truie)}
                  placeholder="Ex: T05"
                  value={form.truie}
                  onChange={e => update('truie', e.target.value)}
                  autoComplete="off"
                />
                {errors.truie ? (
                  <p
                    id="edit-bande-truie-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.truie}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-boucle" className={labelCls}>
                  Boucle mère
                </label>
                <input
                  id="edit-bande-boucle"
                  type="text"
                  maxLength={30}
                  aria-invalid={!!errors.boucleMere}
                  aria-describedby={
                    errors.boucleMere ? 'edit-bande-boucle-error' : undefined
                  }
                  className={inputBase(!!errors.boucleMere)}
                  placeholder="Ex: FR12345"
                  value={form.boucleMere}
                  onChange={e => update('boucleMere', e.target.value)}
                  autoComplete="off"
                />
                {errors.boucleMere ? (
                  <p
                    id="edit-bande-boucle-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.boucleMere}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          {/* ── Mise-bas ────────────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Mise-bas</legend>

            <div className="space-y-1.5">
              <label htmlFor="edit-bande-dmb" className={labelCls}>
                Date mise-bas
              </label>
              <input
                id="edit-bande-dmb"
                type="date"
                aria-invalid={!!errors.dateMB}
                aria-describedby={errors.dateMB ? 'edit-bande-dmb-error' : undefined}
                className={inputBase(!!errors.dateMB)}
                value={form.dateMB}
                onChange={e => update('dateMB', e.target.value)}
              />
              {errors.dateMB ? (
                <p
                  id="edit-bande-dmb-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.dateMB}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-nv" className={labelCls}>
                  NV
                </label>
                <input
                  id="edit-bande-nv"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.nv}
                  aria-describedby={errors.nv ? 'edit-bande-nv-error' : undefined}
                  className={numInputCls(!!errors.nv)}
                  placeholder="0"
                  value={form.nv}
                  onChange={e => update('nv', e.target.value)}
                />
                {errors.nv ? (
                  <p
                    id="edit-bande-nv-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.nv}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-morts" className={labelCls}>
                  Morts
                </label>
                <input
                  id="edit-bande-morts"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.morts}
                  aria-describedby={
                    errors.morts ? 'edit-bande-morts-error' : undefined
                  }
                  className={numInputCls(!!errors.morts)}
                  placeholder="0"
                  value={form.morts}
                  onChange={e => update('morts', e.target.value)}
                />
                {errors.morts ? (
                  <p
                    id="edit-bande-morts-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.morts}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-viv" className={labelCls}>
                  Vivants
                </label>
                <input
                  id="edit-bande-viv"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.vivants}
                  aria-describedby={
                    errors.vivants ? 'edit-bande-viv-error' : undefined
                  }
                  className={numInputCls(!!errors.vivants)}
                  placeholder="0"
                  value={form.vivants}
                  onChange={e => update('vivants', e.target.value)}
                />
                {errors.vivants ? (
                  <p
                    id="edit-bande-viv-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.vivants}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          {/* ── Sevrage ─────────────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Sevrage</legend>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-sprev" className={labelCls}>
                  Prévue
                </label>
                <input
                  id="edit-bande-sprev"
                  type="date"
                  aria-invalid={!!errors.dateSevragePrevue}
                  aria-describedby={
                    errors.dateSevragePrevue ? 'edit-bande-sprev-error' : undefined
                  }
                  className={inputBase(!!errors.dateSevragePrevue)}
                  value={form.dateSevragePrevue}
                  onChange={e => update('dateSevragePrevue', e.target.value)}
                />
                {errors.dateSevragePrevue ? (
                  <p
                    id="edit-bande-sprev-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.dateSevragePrevue}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-sreel" className={labelCls}>
                  Réelle <span className="text-text-2 normal-case">· opt.</span>
                </label>
                <input
                  id="edit-bande-sreel"
                  type="date"
                  aria-invalid={!!errors.dateSevrageReelle}
                  aria-describedby={
                    errors.dateSevrageReelle ? 'edit-bande-sreel-error' : undefined
                  }
                  className={inputBase(!!errors.dateSevrageReelle)}
                  value={form.dateSevrageReelle}
                  onChange={e => update('dateSevrageReelle', e.target.value)}
                />
                {errors.dateSevrageReelle ? (
                  <p
                    id="edit-bande-sreel-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.dateSevrageReelle}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          {/* ── Séparation sexe ─────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Séparation sexe</legend>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-males" className={labelCls}>
                  Nb mâles
                </label>
                <input
                  id="edit-bande-males"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.nbMales}
                  aria-describedby={
                    errors.nbMales ? 'edit-bande-males-error' : undefined
                  }
                  className={numInputCls(!!errors.nbMales)}
                  placeholder="0"
                  value={form.nbMales}
                  onChange={e => update('nbMales', e.target.value)}
                />
                {errors.nbMales ? (
                  <p
                    id="edit-bande-males-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.nbMales}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-fem" className={labelCls}>
                  Nb femelles
                </label>
                <input
                  id="edit-bande-fem"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.nbFemelles}
                  aria-describedby={
                    errors.nbFemelles ? 'edit-bande-fem-error' : undefined
                  }
                  className={numInputCls(!!errors.nbFemelles)}
                  placeholder="0"
                  value={form.nbFemelles}
                  onChange={e => update('nbFemelles', e.target.value)}
                />
                {errors.nbFemelles ? (
                  <p
                    id="edit-bande-fem-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.nbFemelles}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-dsep" className={labelCls}>
                  Date séparation
                </label>
                <input
                  id="edit-bande-dsep"
                  type="date"
                  aria-invalid={!!errors.dateSeparation}
                  aria-describedby={
                    errors.dateSeparation ? 'edit-bande-dsep-error' : undefined
                  }
                  className={inputBase(!!errors.dateSeparation)}
                  value={form.dateSeparation}
                  onChange={e => update('dateSeparation', e.target.value)}
                />
                {errors.dateSeparation ? (
                  <p
                    id="edit-bande-dsep-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.dateSeparation}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-loge" className={labelCls}>
                  Loge engraissement
                </label>
                <select
                  id="edit-bande-loge"
                  aria-invalid={!!errors.logeEngraissement}
                  className={[
                    'w-full h-12 rounded-md px-3',
                    'bg-bg-0 border text-text-0',
                    'font-mono text-[14px]',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.logeEngraissement
                      ? 'border-red'
                      : 'border-border hover:border-text-2',
                  ].join(' ')}
                  value={form.logeEngraissement}
                  onChange={e =>
                    update(
                      'logeEngraissement',
                      e.target.value as '' | 'M' | 'F',
                    )
                  }
                >
                  <option value="">—</option>
                  <option value="M">Mâles (M)</option>
                  <option value="F">Femelles (F)</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── Statut ──────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label htmlFor="edit-bande-statut" className={labelCls}>
              Statut <span className="text-red">*</span>
            </label>
            <select
              id="edit-bande-statut"
              aria-required="true"
              aria-invalid={!!errors.statut}
              aria-describedby={errors.statut ? 'edit-bande-statut-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0',
                'font-mono text-[14px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.statut ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              value={form.statut}
              onChange={e => update('statut', e.target.value)}
              disabled={saving}
            >
              <option value="">— Choisir —</option>
              {BANDE_STATUTS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.statut ? (
              <p
                id="edit-bande-statut-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.statut}
              </p>
            ) : null}
          </div>

          {/* ── Notes ───────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label htmlFor="edit-bande-notes" className={labelCls}>
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="edit-bande-notes"
              maxLength={300}
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? 'edit-bande-notes-error' : 'edit-bande-notes-hint'
              }
              className={[
                'w-full rounded-md px-3 py-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                'min-h-[88px] resize-y',
                errors.notes ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Observations libres…"
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              disabled={saving}
            />
            <p
              id="edit-bande-notes-hint"
              className="font-mono text-[10px] text-text-2 tabular-nums"
            >
              {form.notes.length}/300
            </p>
            {errors.notes ? (
              <p
                id="edit-bande-notes-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.notes}
              </p>
            ) : null}
          </div>

          {/* ── Actions ─────────────────────────────────────────────── */}
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
              aria-label="Enregistrer les modifications de la bande"
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

export default QuickEditBandeForm;
