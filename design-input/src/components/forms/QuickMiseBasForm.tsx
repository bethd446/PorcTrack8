/* eslint-disable react-refresh/only-export-components */
/**
 * QuickMiseBasForm — Saisie d'une mise-bas.
 * ════════════════════════════════════════════════════════════════════════
 * Form de référence FORM_CONTRACT Phase 1 (migré depuis le pattern Sprint 5).
 * Truie autocomplete (gestation J110+) · Date MB · NV/Morts/Mort-nés stepper ·
 * pré-rempli auto si saillie liée trouvée.
 *
 * Conforme au contrat :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, remplace useAppToast local)
 *  - validation : pipeline `validateMiseBas` → { ok, errors, normalized }
 *    + fail-fast `farmValidators`, état `errors`, rendu via `<FieldError>`
 *  - helpers date partagés `_formHelpers` (todayIso / nowHoursMinutes)
 *  - picker d'entité partagé `<EntityPicker mode="autocomplete">`
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Le barrel `export { ... } from './quickMiseBasHelpers'` ci-dessous est
 * conservé : la convention de nommage logique canonique est `quickXxxLogic.ts`
 * mais on NE RENOMME PAS les fichiers existants en Phase 1 (cf. FORM_CONTRACT).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

import {
  insertBatch,
  updateSowByCode,
  resolveSowIdByCode,
  resolveBoarIdByCode,
  findLastSaillieForTruie,
  type LastSaillieResolved,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import { normaliseStatut } from '../../lib/truieStatut';
import type { Truie } from '../../types/farm';
import { useFocusFirstInput } from './useFormA11y';
import {
  MISE_BAS_BOUNDS,
  validateMiseBas,
  suggestIdPortee,
  type MiseBasDraft,
  type MiseBasValidationErrors,
} from './quickMiseBasHelpers';
import {
  validateDatePresentOrPast,
  validateEffectif,
} from '../../lib/validation/farmValidators';
import { todayIso, nowHoursMinutes } from './_formHelpers';
import { FieldError, EntityPicker } from './_formFields';
import QuickActionSheet from './QuickActionSheet';

export {
  MISE_BAS_BOUNDS,
  extractTruieNumber,
  suggestIdPortee,
  isoToSheetsDate,
  addDaysToSheetsDate,
  validateMiseBas,
  validateSexRatio,
  buildMiseBasRow,
  submitMiseBas,
  type MiseBasDraft,
  type MiseBasValidation,
  type MiseBasValidationErrors,
  type MiseBasBatchValues,
} from './quickMiseBasHelpers';

export interface QuickMiseBasFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTruieId?: string;
  onSuccess?: () => void;
}

const QuickMiseBasForm: React.FC<QuickMiseBasFormProps> = ({
  isOpen, onClose, defaultTruieId, onSuccess,
}) => {
  const { truies, verrats, bandes, refreshData } = useFarm();
  const { showToast } = useToast();

  const truiesEligibles = useMemo<Truie[]>(() => truies.filter(t => {
    const c = normaliseStatut(t.statut);
    return c === 'MATERNITE' || c === 'PLEINE' || c === 'SURVEILLANCE';
  }), [truies]);

  const [truieId, setTruieId] = useState<string>(defaultTruieId ?? '');
  const [truieQuery, setTruieQuery] = useState<string>(defaultTruieId ?? '');
  const [dateIso, setDateIso] = useState<string>(todayIso());
  const [heure, setHeure] = useState<string>(nowHoursMinutes());
  const [nesVivants, setNesVivants] = useState<string>('');
  const [mortsNes, setMortsNes] = useState<string>('0');
  const [mortsNaissance, setMortsNaissance] = useState<string>('0');
  const [errors, setErrors] = useState<MiseBasValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [lastSaillie, setLastSaillie] = useState<LastSaillieResolved | null>(null);
  const [saillieLoading, setSaillieLoading] = useState(false);
  const [saillieResolved, setSaillieResolved] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestedIdPortee = useMemo(() => {
    if (!truieId) return '';
    return suggestIdPortee(truieId, bandes);
  }, [truieId, bandes]);

  const [idPortee, setIdPortee] = useState<string>(suggestedIdPortee);
  const [idPorteeEditedManually, setIdPorteeEditedManually] = useState(false);

  const [lastSuggestedIdPortee, setLastSuggestedIdPortee] = useState<string>(suggestedIdPortee);
  if (!idPorteeEditedManually && lastSuggestedIdPortee !== suggestedIdPortee) {
    setLastSuggestedIdPortee(suggestedIdPortee);
    setIdPortee(suggestedIdPortee);
  }

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; defaultTruieId: string | undefined }>({
    isOpen, defaultTruieId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.defaultTruieId !== defaultTruieId) {
    setLastOpenKey({ isOpen, defaultTruieId });
    if (isOpen) {
      setTruieId(defaultTruieId ?? '');
      setTruieQuery(defaultTruieId ?? '');
      setDateIso(todayIso());
      setHeure(nowHoursMinutes());
      setNesVivants(''); setMortsNes('0'); setMortsNaissance('0');
      setIdPorteeEditedManually(false);
      setErrors({}); setSaving(false);
      setLastSaillie(null); setSaillieResolved(false); setSaillieLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!truieId || !dateIso) {
      setLastSaillie(null); setSaillieResolved(false); return;
    }
    let cancelled = false;
    setSaillieLoading(true);
    setSaillieResolved(false);
    findLastSaillieForTruie(truieId, new Date(dateIso))
      .then(res => { if (!cancelled) setLastSaillie(res); })
      .catch(() => { if (!cancelled) setLastSaillie(null); })
      .finally(() => { if (!cancelled) { setSaillieLoading(false); setSaillieResolved(true); } });
    return () => { cancelled = true; };
  }, [isOpen, truieId, dateIso]);

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

  const detectedBoarLabel = useMemo<string | null>(() => {
    if (!lastSaillie) return null;
    const code = lastSaillie.boar_code_id;
    if (!code) return null;
    const v = verrats.find(x => x.displayId === code || x.id === lastSaillie.boar_id);
    return v?.nom ? `${code} (${v.nom})` : code;
  }, [lastSaillie, verrats]);

  const saillieEcartJours = useMemo<number | null>(() => {
    if (!lastSaillie?.date_saillie || !dateIso) return null;
    const ds = new Date(lastSaillie.date_saillie);
    const dm = new Date(dateIso);
    if (!Number.isFinite(ds.getTime()) || !Number.isFinite(dm.getTime())) return null;
    return Math.round((dm.getTime() - ds.getTime()) / 86400000);
  }, [lastSaillie, dateIso]);

  const isValid = !!truieId && !!nesVivants && !!dateIso;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const v = parseInt(nesVivants, 10) || 0;
    const mn = parseInt(mortsNes, 10) || 0;
    const nesTotaux = String(v + mn);
    const draft: MiseBasDraft = {
      truieId, idPortee, dateIso, heure, nesVivants, mortsNes,
      nesTotaux, poidsMoyen: '', notes: '',
      nbMales: '', nbFemelles: '',
    };
    const result = validateMiseBas(draft);
    if (!result.ok || !result.normalized) { setErrors(result.errors); return; }
    const failFast: MiseBasValidationErrors = {};
    const dr = validateDatePresentOrPast(dateIso, 'dateIso');
    if (!dr.ok) failFast.dateIso = dr.errors[0].message;
    const ef = validateEffectif(result.normalized.nesTotaux, { max: 50, field: 'nesTotaux' });
    if (!ef.ok) failFast.nesTotaux = ef.errors[0].message;
    if (Object.keys(failFast).length > 0) { setErrors(failFast); return; }
    setErrors({}); setSaving(true);
    try {
      const sowId = await resolveSowIdByCode(truieId);
      const vivants = Math.max(0, result.normalized.nesTotaux - result.normalized.mortsNes);
      let boarUuid: string | null = lastSaillie?.boar_id ?? null;
      if (!boarUuid && lastSaillie?.boar_code_id) {
        boarUuid = await resolveBoarIdByCode(lastSaillie.boar_code_id);
      }
      const mortsNaissanceN = parseInt(mortsNaissance || '0', 10) || 0;
      const noteParts: string[] = [];
      if (heure) noteParts.push(`MB ${heure}`);
      if (mortsNaissanceN > 0) noteParts.push(`Morts naissance: ${mortsNaissanceN}`);
      const finalNotes = noteParts.join(' · ');
      await insertBatch({
        code_id: idPortee,
        sow_id: sowId,
        boar_id: boarUuid,
        date_mise_bas: result.normalized.dateMbSheets.split('/').reverse().join('-'),
        date_sevrage_prevue: result.normalized.dateSevragePrevue.split('/').reverse().join('-'),
        porcelets_nes_total: result.normalized.nesTotaux,
        porcelets_nes_vivants: vivants,
        nb_mort_nes: result.normalized.mortsNes,
        poids_initial_kg: 1.4,
        statut: 'Sous mère',
        phase: 'MATERNITE',
        notes: finalNotes,
      } as Parameters<typeof insertBatch>[0]);
      await updateSowByCode(truieId, { statut: 'Maternité' });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(
        online
          ? `Mise-bas enregistrée. Portée ${idPortee} créée automatiquement.`
          : `Mise-bas en file · sync auto · ${idPortee}`,
        online ? 'success' : 'info',
        2400,
      );
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'à onClose pour empêcher le double-clic pendant
      // la fenêtre 1.5s de toast success. setSaving n'est reset qu'en cas
      // d'erreur (catch) pour permettre un retry (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement local',
        'error', 2400,
      );
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Nouvelle mise-bas"
      title="Saisir une mise-bas"
      ariaLabel="Saisir une mise-bas"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer la mise-bas"
      submitAriaLabel="Enregistrer la mise-bas"
      submitDisabled={truiesEligibles.length === 0}
    >
      <div className="field">
        <label className="label--v77" htmlFor="mb-truie">TRUIE EN GESTATION J110+ <span className="req">requis</span></label>
        <EntityPicker
          mode="autocomplete"
          entities={truiesEligibles}
          value={truieId}
          onChange={setTruieId}
          query={truieQuery}
          onQueryChange={setTruieQuery}
          entityLabel="la truie"
          groupLabel="Truie en gestation"
          emptyText="Aucune truie en gestation J110+"
          disabled={saving}
          inputId="mb-truie"
          inputRef={firstFieldRef}
          invalid={!!errors.truieId}
          placeholder="Rechercher T-…"
        />
        <FieldError message={errors.truieId} />
      </div>

      {truieId ? (
        <div role="status" aria-live="polite" data-testid="saillie-detected" style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--pt-line)', background: 'var(--pt-bg)', fontFamily: 'var(--pt-font-mono)', fontSize: 11.5, color: 'var(--pt-muted)', lineHeight: 1.5 }}>
          {saillieLoading ? (
            <span>Recherche de la saillie source…</span>
          ) : lastSaillie ? (
            <>
              <b style={{ color: 'var(--pt-ink)' }}>Saillie liée</b> · {lastSaillie.date_saillie.split('-').reverse().join('/')}
              {detectedBoarLabel ? ` · ${detectedBoarLabel}` : ''}
              {saillieEcartJours !== null ? <><br/><b style={{ color: 'var(--pt-ink)' }}>Cycle réel</b> · {saillieEcartJours} j · {saillieEcartJours >= 112 && saillieEcartJours <= 118 ? 'cohérent (115 ± 3 j)' : 'à vérifier'}</> : null}
            </>
          ) : saillieResolved ? (
            <span>Aucune saillie historique trouvée. Le verrat père sera vide.</span>
          ) : null}
        </div>
      ) : null}

      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="mb-date">DATE MB <span className="req">requis</span></label>
          <input id="mb-date" className={`field__input mono${dateIso ? ' filled' : ' field__input--ghost'}`} type="date" aria-label="Date de mise-bas" aria-required="true" aria-invalid={!!errors.dateIso} value={dateIso} onChange={e => setDateIso(e.target.value)} disabled={saving} />
          <FieldError message={errors.dateIso} />
        </div>
        <div className="field">
          <label className="label--v77" htmlFor="mb-nv">NV VIVANTS <span className="req">requis</span></label>
          <div className="stepper">
            <button type="button" onClick={() => adjustNumber(setNesVivants, nesVivants, -1)} aria-label="Diminuer NV" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
            <input id="mb-nv" type="number" inputMode="numeric" min={0} max={MISE_BAS_BOUNDS.maxNes} step={1} aria-label="Nombre de porcelets nés vivants" aria-required="true" aria-invalid={!!errors.nesVivants} placeholder="0" value={nesVivants} onChange={e => setNesVivants(e.target.value)} disabled={saving} />
            <span className="stepper-label">NV</span>
            <button type="button" onClick={() => adjustNumber(setNesVivants, nesVivants, 1)} aria-label="Augmenter NV" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
          </div>
          <FieldError message={errors.nesVivants} />
        </div>
      </div>

      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="mb-morts-naiss">MORTS NAISSANCE</label>
          <div className="stepper">
            <button type="button" onClick={() => adjustNumber(setMortsNaissance, mortsNaissance, -1)} aria-label="Diminuer morts naissance" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
            <input id="mb-morts-naiss" type="number" inputMode="numeric" min={0} max={25} step={1} aria-label="Morts à la naissance" placeholder="0" value={mortsNaissance} onChange={e => setMortsNaissance(e.target.value)} disabled={saving} />
            <span className="stepper-label">M</span>
            <button type="button" onClick={() => adjustNumber(setMortsNaissance, mortsNaissance, 1)} aria-label="Augmenter morts naissance" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="field">
          <label className="label--v77" htmlFor="mb-mn">MORT-NÉS</label>
          <div className="stepper">
            <button type="button" onClick={() => adjustNumber(setMortsNes, mortsNes, -1)} aria-label="Diminuer mort-nés" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
            <input id="mb-mn" type="number" inputMode="numeric" min={0} max={MISE_BAS_BOUNDS.maxNes} step={1} aria-label="Nombre de porcelets morts-nés" aria-invalid={!!errors.mortsNes} placeholder="0" value={mortsNes} onChange={e => setMortsNes(e.target.value)} disabled={saving} />
            <span className="stepper-label">MN</span>
            <button type="button" onClick={() => adjustNumber(setMortsNes, mortsNes, 1)} aria-label="Augmenter mort-nés" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
          </div>
          <FieldError message={errors.mortsNes} />
        </div>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="mb-id-portee">IDENTIFIANT PORTÉE <span className="hint">auto</span></label>
        <input id="mb-id-portee" className={`field__input mono${idPortee ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={20} autoCapitalize="characters" aria-label="Identifiant de la portée" aria-required="true" aria-invalid={!!errors.idPortee} placeholder="26-T7-01" value={idPortee} onChange={e => { setIdPortee(e.target.value); setIdPorteeEditedManually(true); }} disabled={saving || !truieId} autoComplete="off" />
        <FieldError message={errors.idPortee} />
      </div>
    </QuickActionSheet>
  );
};

export default QuickMiseBasForm;
