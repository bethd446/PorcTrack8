/**
 * QuickAddBandeForm — Création manuelle d'une bande (Sprint 5 v76)
 * ════════════════════════════════════════════════════════════════════════
 * Sheet bottom v76 · Truie mère (autocomplete) · Date MB · NV/MN steppers
 * · ID portée auto-suggéré (aperçu mensuel "Mai 2026 · M-04").
 *
 * NB : 99% des bandes sont auto-créées via la mise-bas. Ce form sert à
 * importer une bande historique.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Check, Minus, Plus, X } from 'lucide-react';

import { AppToast, useAppToast } from '../agritech';
import {
  insertBatch,
  resolveSowIdByCode,
  resolveBoarIdByCode,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
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
import type { Truie } from '../../types/farm';
import { formatDateFr } from '../../v70/lib/formatters';

interface QuickAddBandeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddBandeForm: React.FC<QuickAddBandeFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const { truies, verrats, bandes, refreshData } = useFarm();

  const [idPortee, setIdPortee] = useState<string>('');
  const [truieId, setTruieId] = useState<string>('');
  const [truieQuery, setTruieQuery] = useState<string>('');
  const [verratId, setVerratId] = useState<string>('');
  const [dateMb, setDateMb] = useState<string>(new Date().toISOString().slice(0, 10));
  const [nesVivants, setNesVivants] = useState<string>('');
  const [mortsNes, setMortsNes] = useState<string>('');
  const [statut] = useState<BandeStatutInitial>('Sous mère');
  const [errors, setErrors] = useState<AddBandeValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const { show: showToast, toastProps } = useAppToast();

  const suggestedId = useMemo(() => {
    if (!truieId) return '';
    return suggestNextIdPortee(truieId, bandes);
  }, [truieId, bandes]);

  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setIdPortee(''); setTruieId(''); setTruieQuery(''); setVerratId('');
      setDateMb(new Date().toISOString().slice(0, 10)); setNesVivants(''); setMortsNes('');
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

  const handleClose = useCallback(() => { if (!saving) onClose(); }, [onClose, saving]);
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const truieSuggestions = useMemo<Truie[]>(() => {
    const q = truieQuery.trim().toLowerCase();
    if (!q) return [];
    return truies
      .filter(t => {
        const code = (t.displayId || t.id || '').toLowerCase();
        const b = (t.boucle || '').toLowerCase();
        return code.includes(q) || b.includes(q);
      })
      .slice(0, 6);
  }, [truies, truieQuery]);

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

  const selectTruieMere = (t: Truie): void => {
    const code = t.displayId || t.id;
    setTruieId(code);
    setTruieQuery(code);
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent): Promise<void> => {
    if (e) e.preventDefault();
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
      showToast(online ? 'Bande créée' : 'Bande en file · sync auto', online ? 'success' : 'info', { duration: 1800 });
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement', 'error', { duration: 1800 });
    } finally {
      setSaving(false);
    }
  };

  const errMsg = (msg?: string): React.ReactNode =>
    msg ? <span role="alert" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-danger)' }}>{msg}</span> : null;

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={handleClose} breakpoints={[0, 1]} initialBreakpoint={1} className="agritech-bottom-sheet pt-sheet-modal pt-screen" aria-label="Ajouter une bande">
        <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
          <form className="sheet" onSubmit={handleSubmit} noValidate aria-label="Création d'une bande" style={{ position: 'relative', height: '100%', maxHeight: '100%' }}>
            <span className="sheet__handle" />
            <header className="sheet__head">
              <div>
                <div className="eyebrow">Nouvelle bande</div>
                <h2 className="sheet__title">Ajouter une bande</h2>
              </div>
              <button type="button" className="sheet__close" onClick={handleClose} aria-label="Fermer" disabled={saving}>
                <X size={14} aria-hidden="true" />
              </button>
            </header>
            <div className="sheet__body">
              <div className="field">
                <label className="label--v77" htmlFor="add-bande-truie">TRUIE MÈRE <span className="req">requis</span></label>
                <input id="add-bande-truie" ref={firstFieldRef} className={`field__input mono${truieId ? ' filled' : ' field__input--ghost'}`} type="text" aria-label="Truie mère (autocomplete)" aria-required="true" aria-invalid={!!errors.truieId} placeholder="Rechercher T-…" value={truieQuery} onChange={e => { setTruieQuery(e.target.value); if (e.target.value === '') setTruieId(''); }} disabled={saving} autoComplete="off" />
                {truieSuggestions.length > 0 && truieQuery !== truieId ? (
                  <div role="listbox" style={{ marginTop: 4, border: '1px solid var(--pt-line)', borderRadius: 10, background: 'var(--pt-bg)', maxHeight: 200, overflowY: 'auto' }}>
                    {truieSuggestions.map(t => (
                      <button key={t.id} type="button" role="option" aria-selected={false} onClick={() => selectTruieMere(t)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)', cursor: 'pointer', minHeight: 44 }}>
                        {t.displayId || t.id}{t.nom ? ` · ${t.nom}` : ''}{t.boucle ? ` (${t.boucle})` : ''}
                      </button>
                    ))}
                  </div>
                ) : null}
                {errMsg(errors.truieId)}
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
                  {errMsg(errors.dateMb)}
                </div>
                <div className="field">
                  <label className="label--v77" htmlFor="add-bande-nv">NV VIVANTS <span className="req">requis</span></label>
                  <div className="stepper">
                    <button type="button" onClick={() => adjustNumber(setNesVivants, nesVivants, -1)} aria-label="Diminuer NV" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
                    <input id="add-bande-nv" type="number" inputMode="numeric" min={0} max={25} step={1} aria-label="Nombre de porcelets nés vivants" aria-required="true" aria-invalid={!!errors.nesVivants} placeholder="0" value={nesVivants} onChange={e => setNesVivants(e.target.value)} disabled={saving} />
                    <span className="stepper-label">NV</span>
                    <button type="button" onClick={() => adjustNumber(setNesVivants, nesVivants, 1)} aria-label="Augmenter NV" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
                  </div>
                  {errMsg(errors.nesVivants)}
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
                {errMsg(errors.mortsNes)}
              </div>
              <div className="field">
                <label className="label--v77" htmlFor="add-bande-id">IDENTIFIANT PORTÉE <span className="hint">aperçu auto</span></label>
                <input id="add-bande-id" className={`field__input mono${idPortee ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={30} aria-label="Identifiant de la portée" aria-invalid={!!errors.idPortee} placeholder="Mai 2026 · M-—" value={idPorteeMonthlyPreview || idPortee} readOnly />
                {dateMb ? (
                  <span style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 10.5, color: 'var(--pt-subtle)' }}>
                    Code interne : {idPortee || '—'} · MB {formatDateFr(dateMb)}
                  </span>
                ) : null}
                {errMsg(errors.idPortee)}
              </div>
              {errors.coherence ? <span role="alert" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-danger)' }}>{errors.coherence}</span> : null}
            </div>
            <footer className="sheet__foot">
              <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={saving} aria-label="Annuler et fermer">Annuler</button>
              <button type="submit" className="btn-primary--lg" disabled={saving || !isValid} aria-busy={saving} aria-label="Créer la bande">
                {saving ? 'Enregistrement…' : <><Check size={14} aria-hidden="true" /> Créer la bande</>}
              </button>
            </footer>
          </form>
        </div>
      </IonModal>
      <AppToast {...toastProps} />
    </>
  );
};

export default QuickAddBandeForm;
