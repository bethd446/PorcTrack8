/**
 * QuickAddBandeForm — Création manuelle d'une bande.
 * ════════════════════════════════════════════════════════════════════════
 * Migré au FORM_CONTRACT (Phase 2 · Batch C) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (remplace useAppToast + <AppToast> local)
 *  - picker d'entité partagé `<EntityPicker mode="autocomplete">` (truie mère)
 *  - rendu d'erreur via `<FieldError>` (remplace `errMsg()` inline)
 *  - helpers date partagés `_formHelpers` (todayIso)
 *  - reset-on-open via `lastOpen` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Truie mère (autocomplete) · Date MB · NV/MN steppers · ID portée auto-suggéré.
 *
 * NB : 99% des bandes sont auto-créées via la mise-bas. Ce form sert à
 * importer une bande historique.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

import { useToast } from '../../context/ToastContext';
import {
  insertBatch,
  resolveSowIdByCode,
  resolveBoarIdByCode,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError, EntityPicker } from './_formFields';
import { todayIso } from './_formHelpers';
import QuickActionSheet from './QuickActionSheet';
import {
  suggestNextIdPortee,
  validateAddBande,
  type AddBandeValidation,
  type BandeStatutInitial,
} from './quickAddBandeLogic';
import {
  validatePoidsKg,
  validateDatePresentOrPast,
  validateEffectif,
} from '../../lib/validation/farmValidators';
import { formatDateFr } from '../../v70/lib/formatters';

interface QuickAddBandeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddBandeForm: React.FC<QuickAddBandeFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const { truies, verrats, bandes, refreshData } = useFarm();
  const { showToast } = useToast();

  const [idPortee, setIdPortee] = useState<string>('');
  const [truieId, setTruieId] = useState<string>('');
  const [truieQuery, setTruieQuery] = useState<string>('');
  const [verratId, setVerratId] = useState<string>('');
  const [dateMb, setDateMb] = useState<string>(todayIso);
  const [nesVivants, setNesVivants] = useState<string>('');
  const [mortsNes, setMortsNes] = useState<string>('');
  const [statut] = useState<BandeStatutInitial>('Sous mère');
  const [errors, setErrors] = useState<AddBandeValidation['errors']>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestedId = useMemo(() => {
    if (!truieId) return '';
    return suggestNextIdPortee(truieId, bandes);
  }, [truieId, bandes]);

  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setIdPortee(''); setTruieId(''); setTruieQuery(''); setVerratId('');
      setDateMb(todayIso()); setNesVivants(''); setMortsNes('');
      setErrors({}); setSaving(false);
    }
  }

  const [lastSuggested, setLastSuggested] = useState<string>('');
  if (suggestedId !== lastSuggested) {
    setLastSuggested(suggestedId);
    if (suggestedId && (idPortee === '' || idPortee === lastSuggested)) {
      setIdPortee(suggestedId);
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

  const adjustNumber = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    cur: string, delta: number, min = 0, max = 25,
  ): void => {
    const c = parseInt(cur || '0', 10) || 0;
    const next = Math.max(min, Math.min(max, c + delta));
    setter(String(next));
  };

  const idPorteeMonthlyPreview = useMemo(() => {
    if (!dateMb) return '';
    const d = new Date(dateMb);
    if (isNaN(d.getTime())) return '';
    const month = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    const seq = idPortee.match(/-(\d+)$/)?.[1] || '—';
    return `${monthCap} · M-${seq}`;
  }, [dateMb, idPortee]);

  const isValid = !!truieId.trim() && !!nesVivants.trim() && !!dateMb;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddBande({
      idPortee, truieId, verratId, dateMb, nesVivants, mortsNes,
      mortsNesMales: '', mortsNesFemelles: '', statut,
      poidsKg: '1.4', loge: '', notes: '',
    });
    if (!result.ok || !result.values) {
      setErrors(result.errors);
      return;
    }
    const failFast: AddBandeValidation['errors'] = {};
    if (result.values.date_mise_bas) {
      const dr = validateDatePresentOrPast(result.values.date_mise_bas, 'dateMb');
      if (!dr.ok) failFast.dateMb = dr.errors[0].message;
    }
    const ef = validateEffectif(result.values.porcelets_nes_vivants, { max: 25, field: 'nesVivants' });
    if (!ef.ok) failFast.nesVivants = ef.errors[0].message;
    const pr = validatePoidsKg(result.values.poids_initial_kg, { min: 0.5, max: 50, field: 'poidsKg' });
    if (!pr.ok) failFast.poidsKg = pr.errors[0].message;
    if (Object.keys(failFast).length > 0) {
      setErrors(failFast);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const sowUuid = await resolveSowIdByCode(result.values.sow_code_id);
      if (!sowUuid) throw new Error(`Truie ${result.values.sow_code_id} introuvable`);
      const boarUuid = result.values.boar_code_id ? await resolveBoarIdByCode(result.values.boar_code_id) : null;
      await insertBatch({
        code_id: result.values.code_id,
        sow_id: sowUuid,
        boar_id: boarUuid,
        date_mise_bas: result.values.date_mise_bas,
        porcelets_nes_vivants: result.values.porcelets_nes_vivants,
        porcelets_nes_total: result.values.porcelets_nes_total,
        nb_mort_nes: result.values.nb_mort_nes,
        statut: result.values.statut,
        loge: result.values.loge,
        notes: result.values.notes,
        poids_initial_kg: result.values.poids_initial_kg,
      } as Parameters<typeof insertBatch>[0]);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(online ? 'Bande créée' : 'Bande en file · sync auto', online ? 'success' : 'info', 1800);
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic dans
      // la fenêtre 1.5s entre toast success et fermeture (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement', 'error', 1800);
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Nouvelle bande"
      title="Ajouter une bande"
      ariaLabel="Création d'une bande"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Créer la bande"
      submitAriaLabel="Créer la bande"
    >
      <div className="field">
        <label className="label--v77" htmlFor="add-bande-truie">TRUIE MÈRE <span className="req">requis</span></label>
        <EntityPicker
          mode="autocomplete"
          entities={truies}
          value={truieId}
          onChange={setTruieId}
          query={truieQuery}
          onQueryChange={setTruieQuery}
          entityLabel="la truie"
          groupLabel="Truie mère (autocomplete)"
          emptyText="Aucune truie disponible"
          disabled={saving}
          inputId="add-bande-truie"
          inputRef={firstFieldRef}
          invalid={!!errors.truieId}
          placeholder="Rechercher T-…"
        />
        <FieldError message={errors.truieId} />
      </div>
      {verrats.length > 0 ? (
        <div className="field">
          <label className="label--v77" htmlFor="add-bande-verrat">VERRAT PÈRE <span className="hint">optionnel</span></label>
          <select id="add-bande-verrat" className={`field__input${verratId ? ' mono filled' : ' field__input--ghost'}`} aria-label="Verrat père" value={verratId} onChange={e => setVerratId(e.target.value)} disabled={saving}>
            <option value="">— Aucun —</option>
            {verrats.map(v => <option key={v.id} value={v.displayId || v.id}>{v.displayId || v.id}{v.nom ? ` · ${v.nom}` : ''}</option>)}
          </select>
        </div>
      ) : null}
      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="add-bande-date-mb">DATE MB <span className="req">requis</span></label>
          <input id="add-bande-date-mb" className={`field__input mono${dateMb ? ' filled' : ' field__input--ghost'}`} type="date" aria-label="Date de mise-bas" aria-required="true" aria-invalid={!!errors.dateMb} value={dateMb} onChange={e => setDateMb(e.target.value)} disabled={saving} />
          <FieldError message={errors.dateMb} />
          {/* v3.6.2 — Fallback "âge approximatif" : si naissance inconnue
              (cas import bande existante), saisir le nombre de mois pour
              pré-remplir une dateMb théorique. */}
          <details style={{ marginTop: 6 }}>
            <summary
              style={{
                fontSize: 11,
                color: 'var(--pt-muted)',
                cursor: 'pointer',
                userSelect: 'none',
                padding: '6px 0',
              }}
            >
              Date inconnue ? Estimer par l'âge →
            </summary>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <label htmlFor="add-bande-age-mois" style={{ fontSize: 12 }}>
                Âge approximatif
              </label>
              <input
                id="add-bande-age-mois"
                type="number"
                inputMode="decimal"
                min={0}
                max={12}
                step={0.5}
                aria-label="Âge approximatif en mois"
                placeholder="ex 2.5"
                style={{ width: 80, padding: '4px 8px' }}
                disabled={saving}
                onChange={(e) => {
                  const months = parseFloat(e.target.value);
                  if (!Number.isFinite(months) || months < 0 || months > 12) return;
                  const today = new Date();
                  const estimated = new Date(today.getTime() - months * 30 * 24 * 60 * 60 * 1000);
                  setDateMb(todayIso(estimated));
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--pt-muted)' }}>mois</span>
            </div>
            <p style={{ fontSize: 10, color: 'var(--pt-subtle)', marginTop: 4 }}>
              Calcule une date approximative (mois × 30 jours).
              Tu pourras la corriger en saisissant directement.
            </p>
          </details>
        </div>
        <div className="field">
          <label className="label--v77" htmlFor="add-bande-nv">NV VIVANTS <span className="req">requis</span></label>
          <div className="stepper">
            <button type="button" onClick={() => adjustNumber(setNesVivants, nesVivants, -1)} aria-label="Diminuer NV" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
            <input id="add-bande-nv" type="number" inputMode="numeric" min={0} max={25} step={1} aria-label="Nombre de porcelets nés vivants" aria-required="true" aria-invalid={!!errors.nesVivants} placeholder="0" value={nesVivants} onChange={e => setNesVivants(e.target.value)} disabled={saving} />
            <span className="stepper-label">NV</span>
            <button type="button" onClick={() => adjustNumber(setNesVivants, nesVivants, 1)} aria-label="Augmenter NV" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
          </div>
          <FieldError message={errors.nesVivants} />
        </div>
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-bande-mn">MORTS-NÉS <span className="hint">optionnel</span></label>
        <div className="stepper">
          <button type="button" onClick={() => adjustNumber(setMortsNes, mortsNes, -1)} aria-label="Diminuer mort-nés" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
          <input id="add-bande-mn" type="number" inputMode="numeric" min={0} max={25} step={1} aria-label="Mort-nés" aria-invalid={!!errors.mortsNes} placeholder="0" value={mortsNes} onChange={e => setMortsNes(e.target.value)} disabled={saving} />
          <span className="stepper-label">MN</span>
          <button type="button" onClick={() => adjustNumber(setMortsNes, mortsNes, 1)} aria-label="Augmenter mort-nés" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
        </div>
        <FieldError message={errors.mortsNes} />
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-bande-id">IDENTIFIANT PORTÉE <span className="hint">aperçu auto</span></label>
        <input id="add-bande-id" className={`field__input mono${idPortee ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={30} aria-label="Identifiant de la portée" aria-invalid={!!errors.idPortee} placeholder="Mai 2026 · M-—" value={idPorteeMonthlyPreview || idPortee} readOnly />
        {dateMb ? (
          <span style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 10.5, color: 'var(--pt-subtle)' }}>
            Code interne : {idPortee || '—'} · MB {formatDateFr(dateMb)}
          </span>
        ) : null}
        <FieldError message={errors.idPortee} />
      </div>
      {errors.coherence ? <span role="alert" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-danger)' }}>{errors.coherence}</span> : null}
    </QuickActionSheet>
  );
};

export default QuickAddBandeForm;
