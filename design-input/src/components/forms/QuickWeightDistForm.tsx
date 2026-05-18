/**
 * QuickWeightDistForm — Tri par poids d'une bande engraissement/finition.
 * ════════════════════════════════════════════════════════════════════════════
 * Conforme FORM_CONTRACT Phase 2 :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (remplace `IonToast` + état `success` local)
 *  - validation `validateWeightDist` → { ok, errors } + rendu via `<FieldError>`
 *  - helpers date partagés `_formHelpers` (todayIso, heure locale)
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * La sélection de bande reste un `<Select>` natif : une bande n'est pas une
 * `PickableEntity` (truie/verrat) et le contrat `EntityPicker` ne s'applique
 * qu'aux pickers d'entité animale.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Scale } from 'lucide-react';

import { Input, Select, Textarea } from '@/design-system';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { insertWeightDistribution } from '../../services/supabaseWrites';
import { useFocusFirstInput } from './useFormA11y';
import { todayIso } from './_formHelpers';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
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

const QuickWeightDistForm: React.FC<QuickWeightDistFormProps> = ({
  isOpen,
  onClose,
  defaultBandeId,
  onSuccess,
}) => {
  const { bandes, refreshData } = useFarm();
  const { user } = useAuth();
  const { showToast } = useToast();

  const bandesEligibles = useMemo<BandePorcelets[]>(
    () => bandes.filter(isBandeEligibleWeightDist),
    [bandes],
  );

  const [bandeId, setBandeId] = useState<string>(defaultBandeId ?? '');
  const [dateIso, setDateIso] = useState<string>(todayIso());
  const [under90, setUnder90] = useState<string>('');
  const [r90To100, setR90To100] = useState<string>('');
  const [r100To110, setR100To110] = useState<string>('');
  const [above110, setAbove110] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
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
      setDateIso(todayIso());
      setUnder90('');
      setR90To100('');
      setR100To110('');
      setAbove110('');
      setNotes('');
      setErrors({});
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    onClose();
  }, [onClose, saving]);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

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

  const isValid =
    !!bandeId &&
    !!dateIso &&
    total > 0 &&
    Math.abs(diff) <= WEIGHT_DIST_TOLERANCE;

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

      showToast(`Tri par poids enregistré · ${total} porcs`, 'success', 2200);
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // dans la fenêtre 1.5s avant fermeture (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors({ form: `Erreur enregistrement : ${msg}` });
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Engraissement / finition"
      title="Tri par poids"
      ariaLabel="Saisie du tri par poids"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer tri"
      submitAriaLabel="Enregistrer le tri par poids"
    >
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-amber">
          <Scale size={18} aria-hidden="true" />
        </div>
        <p className="text-mono-label text-text-1">
          Distribution des poids (engraissement / finition)
        </p>
      </div>

      <div className="field">
        <label htmlFor="wdist-bande" className="label--v77">
          BANDE À PESER <span className="req">requis</span>
        </label>
        <Select
          id="wdist-bande"
          value={bandeId}
          onChange={e => setBandeId(e.target.value)}
          disabled={saving || !!defaultBandeId}
          aria-invalid={!!errors.bandeId}
        >
          <option value="">— Sélectionner une bande —</option>
          {bandesEligibles.map(b => (
            <option key={b.id} value={b.id}>
              {b.idPortee || b.id}
              {b.vivants !== undefined ? ` · ${b.vivants} vivants` : ''}
            </option>
          ))}
        </Select>
        {bandesEligibles.length === 0 && (
          <p className="text-mono-label text-text-2">
            Aucune bande en engraissement / finition
          </p>
        )}
        <FieldError message={errors.bandeId} />
      </div>

      <div className="field">
        <label htmlFor="wdist-date" className="label--v77">
          DATE PESÉE <span className="req">requis</span>
        </label>
        <Input
          id="wdist-date"
          ref={firstFieldRef}
          type="date"
          value={dateIso}
          onChange={e => setDateIso(e.target.value)}
          disabled={saving}
          aria-invalid={!!errors.dateIso}
          invalid={!!errors.dateIso}
        />
        <FieldError message={errors.dateIso} />
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
      <FieldError message={errors.total} />

      <div className="field">
        <label htmlFor="wdist-notes" className="label--v77">
          NOTES <span className="hint">optionnel</span>
        </label>
        <Textarea
          id="wdist-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
          maxLength={WEIGHT_DIST_NOTES_MAX}
          placeholder="Ex : pesée pré-départ, lot 1"
        />
        <p className="text-[10px] text-text-2 tabular-nums">
          {notes.length}/{WEIGHT_DIST_NOTES_MAX}
        </p>
      </div>

      <FieldError message={errors.form} />
    </QuickActionSheet>
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
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder="0"
      value={value}
      onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
      disabled={disabled}
      aria-invalid={!!error}
      invalid={!!error}
    />
    <FieldError message={error} />
  </div>
);

export default QuickWeightDistForm;
