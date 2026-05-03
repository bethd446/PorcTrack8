import React, { useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Scale, Check, CheckCircle2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { insertWeightDistribution } from '../../services/supabaseWrites';
import { useEscapeKey } from './useFormA11y';
import {
  buildWeightDistInsert,
  isBandeEligibleWeightDist,
  sumDistribution,
  validateWeightDist,
  WEIGHT_DIST_NOTES_MAX,
  WEIGHT_DIST_TOLERANCE,
} from './quickWeightDistLogic';
import type { BandePorcelets } from '../../types/farm';

export interface QuickWeightDistFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBandeId?: string;
  onSuccess?: () => void;
}

function todayIsoLocal(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

const QuickWeightDistForm: React.FC<QuickWeightDistFormProps> = ({
  isOpen,
  onClose,
  defaultBandeId,
  onSuccess,
}) => {
  const { bandes, refreshData } = useFarm();
  const { user } = useAuth();

  const bandesEligibles = useMemo<BandePorcelets[]>(
    () => bandes.filter(isBandeEligibleWeightDist),
    [bandes],
  );

  const [bandeId, setBandeId] = useState<string>(defaultBandeId ?? '');
  const [dateIso, setDateIso] = useState<string>(todayIsoLocal());
  const [under90, setUnder90] = useState<string>('');
  const [r90To100, setR90To100] = useState<string>('');
  const [r100To110, setR100To110] = useState<string>('');
  const [above110, setAbove110] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  // Reset à chaque ouverture (pattern QuickSevrageForm)
  const [lastOpenKey, setLastOpenKey] = useState<{
    isOpen: boolean;
    defaultBandeId: string | undefined;
  }>({ isOpen, defaultBandeId });
  if (
    lastOpenKey.isOpen !== isOpen ||
    lastOpenKey.defaultBandeId !== defaultBandeId
  ) {
    setLastOpenKey({ isOpen, defaultBandeId });
    if (isOpen) {
      setBandeId(defaultBandeId ?? '');
      setDateIso(todayIsoLocal());
      setUnder90('');
      setR90To100('');
      setR100To110('');
      setAbove110('');
      setNotes('');
      setErrors({});
      setSuccess(false);
      setSaving(false);
    }
  }

  useEscapeKey(isOpen && !saving, onClose);

  const selected = useMemo(
    () => bandes.find(b => b.id === bandeId || b.idPortee === bandeId) ?? null,
    [bandes, bandeId],
  );

  const parseInt0 = (s: string): number => {
    const n = parseInt((s || '').replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const dist = {
    nbUnder90: parseInt0(under90),
    nb90To100: parseInt0(r90To100),
    nb100To110: parseInt0(r100To110),
    nbAbove110: parseInt0(above110),
  };

  const total = sumDistribution(dist);
  const vivants = selected?.vivants ?? 0;
  const diff = total - vivants;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrors({});

    const validation = validateWeightDist({
      ...dist,
      vivantsActuels: vivants,
      dateIso,
      bandeId,
    });
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    if (!selected) {
      setErrors({ bandeId: 'Bande introuvable' });
      return;
    }
    if (!user?.id) {
      setErrors({ form: 'Authentification requise' });
      return;
    }

    setSaving(true);
    try {
      const payload = buildWeightDistInsert({
        bandeUuid: selected.id,
        dateIso,
        dist,
        notes,
        createdBy: user.id,
      });
      await insertWeightDistribution(payload);

      setSuccess(true);
      setToast({
        open: true,
        message: `Tri par poids enregistré · ${total} porcs`,
      });
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors({ form: `Erreur enregistrement : ${msg}` });
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    !!bandeId &&
    !!dateIso &&
    total > 0 &&
    Math.abs(diff) <= WEIGHT_DIST_TOLERANCE;

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Tri par poids"
        height="full"
      >
        {success ? (
          <div
            className="flex flex-col items-center justify-center py-20 animate-scale-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={64}
              className="text-accent mb-4"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <p className="font-heading text-[18px] uppercase tracking-wide">
              Tri enregistré
            </p>
            {selected ? (
              <p className="mt-2 text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
                {selected.idPortee || selected.id} · {total} porcs
              </p>
            ) : null}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
            aria-label="Saisie du tri par poids"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-amber">
                <Scale size={18} aria-hidden="true" />
              </div>
              <p className="text-mono-label text-text-1">
                Distribution des poids (engraissement / finition)
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="wdist-bande"
                className="block text-mono-label text-text-2"
              >
                Bande à peser
              </label>
              <select
                id="wdist-bande"
                value={bandeId}
                onChange={e => setBandeId(e.target.value)}
                disabled={saving || !!defaultBandeId}
                aria-invalid={!!errors.bandeId}
                className={[
                  'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                  'text-[13px] outline-none focus:border-accent',
                  errors.bandeId ? 'border-red' : 'border-border',
                ].join(' ')}
              >
                <option value="">— Sélectionner une bande —</option>
                {bandesEligibles.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.idPortee || b.id}
                    {b.vivants !== undefined ? ` · ${b.vivants} vivants` : ''}
                  </option>
                ))}
              </select>
              {bandesEligibles.length === 0 && (
                <p className="text-mono-label text-text-2">
                  Aucune bande en engraissement / finition
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="wdist-date"
                className="block text-mono-label text-text-2"
              >
                Date pesée
              </label>
              <input
                id="wdist-date"
                type="date"
                value={dateIso}
                onChange={e => setDateIso(e.target.value)}
                disabled={saving}
                aria-invalid={!!errors.dateIso}
                className={[
                  'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                  'font-mono text-[13px] tabular-nums outline-none focus:border-accent',
                  errors.dateIso ? 'border-red' : 'border-border',
                ].join(' ')}
              />
            </div>

            {/* ── Distribution 4 tranches ─────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <DistField
                id="wdist-under90"
                label="< 90 kg (retardés)"
                value={under90}
                onChange={setUnder90}
                error={errors.nbUnder90}
                disabled={saving}
              />
              <DistField
                id="wdist-90to100"
                label="90 - 100 kg"
                value={r90To100}
                onChange={setR90To100}
                error={errors.nb90To100}
                disabled={saving}
              />
              <DistField
                id="wdist-100to110"
                label="100 - 110 kg"
                value={r100To110}
                onChange={setR100To110}
                error={errors.nb100To110}
                disabled={saving}
              />
              <DistField
                id="wdist-above110"
                label="≥ 110 kg (prêts vente)"
                value={above110}
                onChange={setAbove110}
                error={errors.nbAbove110}
                disabled={saving}
              />
            </div>

            {/* ── Total + diff vs vivants ─────────────────────────────── */}
            <div
              className="card-dense !p-3 flex items-center justify-between"
              aria-live="polite"
              aria-label={`Total ${total} porcs sur ${vivants} vivants`}
            >
              <span className="text-mono-label text-text-2">
                Total pesé / vivants
              </span>
              <span
                className={[
                  'text-[14px] tabular-nums font-bold',
                  Math.abs(diff) <= WEIGHT_DIST_TOLERANCE
                    ? 'text-accent'
                    : 'text-red',
                ].join(' ')}
              >
                {total} / {vivants}
                {diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff})` : ''}
              </span>
            </div>
            {errors.total ? (
              <p
                role="alert"
                className="text-[11px] text-red"
              >
                {errors.total}
              </p>
            ) : null}

            <div className="space-y-2">
              <label
                htmlFor="wdist-notes"
                className="block text-mono-label text-text-2"
              >
                Notes <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <textarea
                id="wdist-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
                maxLength={WEIGHT_DIST_NOTES_MAX}
                placeholder="Ex : pesée pré-départ, lot 1"
                className="w-full rounded-md px-3 py-3 bg-bg-0 border border-border text-text-0 placeholder:text-text-2 text-[12px] outline-none focus:border-accent min-h-[60px] resize-y"
              />
              <p className="text-[10px] text-text-2 tabular-nums">
                {notes.length}/{WEIGHT_DIST_NOTES_MAX}
              </p>
            </div>

            {errors.form ? (
              <p
                role="alert"
                className="text-mono-label text-red"
              >
                {errors.form}
              </p>
            ) : null}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="pressable flex-1 h-14 rounded-md bg-bg-1 border border-border text-text-1 text-[12px] font-bold uppercase tracking-wide"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !isValid}
                aria-busy={saving}
                className="pressable flex-[2] h-14 rounded-md bg-accent text-bg-0 text-[13px] font-bold uppercase tracking-wide inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <>
                    <Check size={16} aria-hidden="true" />
                    Enregistrer tri
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      <IonToast
        isOpen={toast.open}
        message={toast.message}
        duration={2200}
        position="bottom"
        onDidDismiss={() => setToast({ open: false, message: '' })}
      />
    </>
  );
};

interface DistFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled: boolean;
}

const DistField: React.FC<DistFieldProps> = ({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
}) => (
  <div className="space-y-1.5">
    <label
      htmlFor={id}
      className="block text-mono-label text-text-2"
    >
      {label}
    </label>
    <input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder="0"
      value={value}
      onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
      disabled={disabled}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className={[
        'w-full h-14 rounded-md px-3 bg-bg-0 border text-text-0',
        'font-mono text-[20px] tabular-nums text-center',
        'outline-none focus:border-accent focus:ring-1 focus:ring-accent',
        error ? 'border-red' : 'border-border hover:border-text-2',
      ].join(' ')}
    />
    {error ? (
      <p
        id={`${id}-error`}
        role="alert"
        className="text-[10px] text-red"
      >
        {error}
      </p>
    ) : null}
  </div>
);

export default QuickWeightDistForm;
