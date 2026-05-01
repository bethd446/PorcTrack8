import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { updateBatchByCode } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import type { BandePorcelets } from '../../types/farm';
import {
  validateBandeEdit,
  bandeToRawInput,
  BANDE_STATUTS,
  type BandeEditErrors,
  type BandeEditRawInput,
} from './quickEditBandeValidation';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import PhotoUploader from './PhotoUploader';

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

interface QuickEditBandeFormProps {
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
  const { refreshData, saillies, verrats } = useFarm();
  const { user } = useAuth();
  const farmId = user?.id ?? '';

  const initial = useMemo<BandeEditRawInput>(() => bandeToRawInput(bande), [bande]);

  const [form, setForm] = useState<BandeEditRawInput>(initial);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(bande.photoUrl);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [loge, setLoge] = useState<string>(bande.loge ?? '');
  const [logeDirty, setLogeDirty] = useState(false);
  const [errors, setErrors] = useState<BandeEditErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Origine = parents truie + verrat (readonly, déduit via dernière saillie liée)
  const origineDeduite = useMemo(() => {
    const truie = bande.truie ?? '';
    const lastSaillie = [...saillies]
      .filter(s => truie && (s.truieId === truie || s.truieNom === truie))
      .sort((a, b) => (b.dateSaillie ?? '').localeCompare(a.dateSaillie ?? ''))[0];
    const verratId = lastSaillie?.verratId ?? '';
    const verrat = verrats.find(v => v.id === verratId || v.displayId === verratId);
    const verratLabel = verrat ? (verrat.nom || verrat.displayId) : verratId;
    if (!truie && !verratLabel) return '';
    return [truie, verratLabel].filter(Boolean).join(' × ');
  }, [bande.truie, saillies, verrats]);

  // Render-time sync: reset on (re)open or bande change (avoids setState-in-effect).
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; bandeId: string }>({
    isOpen,
    bandeId: bande.id,
  });
  if (lastKey.isOpen !== isOpen || lastKey.bandeId !== bande.id) {
    setLastKey({ isOpen, bandeId: bande.id });
    if (isOpen) {
      setForm(bandeToRawInput(bande));
      setPhotoUrl(bande.photoUrl);
      setPhotoDirty(false);
      setLoge(bande.loge ?? '');
      setLogeDirty(false);
      setErrors({});
      setSaving(false);
    }
  }

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
    setForm(f => {
      const next = { ...f, [key]: value };
      // Auto-calc date sevrage prévue = dateMB + 28j si vide
      if (key === 'dateMB' && typeof value === 'string' && value && !f.dateSevragePrevue) {
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
          const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
          d.setUTCDate(d.getUTCDate() + 28);
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(d.getUTCDate()).padStart(2, '0');
          next.dateSevragePrevue = `${yyyy}-${mm}-${dd}`;
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateBandeEdit(form, initial);
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    // Patch vide et pas de modif photo/loge → pas d'appel réseau, on ferme.
    if (Object.keys(result.patch).length === 0 && !photoDirty && !logeDirty) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const supabasePatch: Record<string, unknown> = {};
      const p = result.patch as Record<string, unknown>;
      const frToIso = (fr: unknown): string | null => {
        if (typeof fr !== 'string' || !fr) return null;
        const m = fr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return null;
        return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      };
      if ('STATUT' in p) supabasePatch.statut = p.STATUT;
      if ('NOTES' in p) supabasePatch.notes = p.NOTES;
      if ('LOGE_ENGRAISSEMENT' in p) supabasePatch.loge = p.LOGE_ENGRAISSEMENT;
      if ('DATE_MB' in p) supabasePatch.date_mise_bas = frToIso(p.DATE_MB);
      if ('DATE_SEVRAGE_PREVUE' in p)
        supabasePatch.date_sevrage_prevue = frToIso(p.DATE_SEVRAGE_PREVUE);
      if ('DATE_SEVRAGE_REELLE' in p)
        supabasePatch.date_sevrage = frToIso(p.DATE_SEVRAGE_REELLE);
      if ('NV' in p) supabasePatch.porcelets_nes_total = p.NV;
      if ('MORTS' in p) supabasePatch.nb_mort_nes = p.MORTS;
      if ('VIVANTS' in p) supabasePatch.porcelets_nes_vivants = p.VIVANTS;
      if ('POIDS_MOYEN_KG' in p) {
        supabasePatch.poids_moyen_kg = p.POIDS_MOYEN_KG === '' ? null : p.POIDS_MOYEN_KG;
      }
      if ('VERRAT_PERE' in p) {
        const code = String(p.VERRAT_PERE ?? '').trim();
        if (!code) {
          supabasePatch.boar_id = null;
        } else {
          const verrat = verrats.find(v => v.id === code || v.displayId === code);
          supabasePatch.boar_id = verrat?.id ?? null;
        }
      }
      if (photoDirty) supabasePatch.photo_url = photoUrl ?? null;
      if (logeDirty) supabasePatch.loge = loge.trim() || null;
      // Champs sans équivalent Supabase : TRUIE (snapshot), BOUCLE_MERE,
      // NB_MALES, NB_FEMELLES, DATE_SEPARATION → ignorés silencieusement.
      await updateBatchByCode(bande.id, supabasePatch);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(
        online
          ? 'Modifications enregistrées'
          : 'Modifications en file · sync auto',
      );
      try {
        await refreshData(true);
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

          {/* ── Photo ───────────────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Photo</legend>
            <PhotoUploader
              photoUrl={photoUrl}
              farmId={farmId}
              animalId={bande.id}
              onUploaded={url => {
                setPhotoUrl(url);
                setPhotoDirty(true);
              }}
              onDeleted={() => {
                setPhotoUrl(undefined);
                setPhotoDirty(true);
              }}
              disabled={saving}
            />
          </fieldset>

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

            {/* Origine (parents truie × verrat) — readonly */}
            <div className="space-y-1.5">
              <label htmlFor="edit-bande-origine" className={labelCls}>
                Origine (parents)
              </label>
              <input
                id="edit-bande-origine"
                type="text"
                readOnly
                aria-readonly="true"
                value={origineDeduite || '—'}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-2 border border-border text-text-1',
                  'font-mono text-[13px]',
                  'cursor-not-allowed',
                ].join(' ')}
              />
            </div>

            {/* Verrat père (combobox) */}
            <div className="space-y-1.5">
              <label htmlFor="edit-bande-verrat" className={labelCls}>
                Verrat père{' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <select
                id="edit-bande-verrat"
                aria-invalid={!!errors.verratPere}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[14px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.verratPere
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                value={form.verratPere}
                onChange={e => update('verratPere', e.target.value)}
              >
                <option value="">— Aucun —</option>
                {verrats.map(v => (
                  <option key={v.id} value={v.displayId}>
                    {v.displayId}{v.nom ? ` · ${v.nom}` : ''}
                  </option>
                ))}
              </select>
              {errors.verratPere ? (
                <p
                  id="edit-bande-verrat-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.verratPere}
                </p>
              ) : null}
            </div>

            {/* Loge (emplacement) */}
            <div className="space-y-1.5">
              <label htmlFor="edit-bande-loge-emplacement" className={labelCls}>
                Emplacement loge{' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-bande-loge-emplacement"
                type="text"
                maxLength={30}
                className={inputBase(false)}
                placeholder="Ex: Engraissement L7"
                value={loge}
                onChange={e => {
                  setLoge(e.target.value);
                  setLogeDirty(true);
                }}
                autoComplete="off"
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

            {/* Poids moyen courant (kg) */}
            <div className="space-y-1.5">
              <label htmlFor="edit-bande-pmoy" className={labelCls}>
                Poids moyen (kg){' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-bande-pmoy"
                type="number"
                inputMode="decimal"
                min={0}
                max={400}
                step={0.1}
                aria-invalid={!!errors.poidsMoyenKg}
                aria-describedby={
                  errors.poidsMoyenKg ? 'edit-bande-pmoy-error' : undefined
                }
                className={inputBase(!!errors.poidsMoyenKg)}
                placeholder="0.0"
                value={form.poidsMoyenKg}
                onChange={e => update('poidsMoyenKg', e.target.value)}
              />
              {errors.poidsMoyenKg ? (
                <p
                  id="edit-bande-pmoy-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.poidsMoyenKg}
                </p>
              ) : null}
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
