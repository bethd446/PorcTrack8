/**
 * QuickAddTruieForm — Création rapide d'une truie (Sprint 5 v76)
 * ════════════════════════════════════════════════════════════════════════
 * Sheet bottom v76 · Code mono auto-gen · Boucle · Statut radio-chips ·
 * Date naissance · Loge select · Truie mère autocomplete · Verrat origine.
 *
 * Compagnon tests : QuickAddTruieForm.test.tsx (logique pure node env).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Check, X } from 'lucide-react';

import { AppToast, useAppToast } from '../agritech';
import { insertSow, listLoges } from '../../services/supabaseWrites';
import { enqueueInsert, isOnline } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  suggestNextTruieId,
  validateAddTruie,
  type AddTruieValidation,
} from './quickAddTruieLogic';
import type { Truie, Loge } from '../../types/farm';

type StatutChoice = 'Vide' | 'Pleine' | 'Maternité';
const STATUT_CHOICES: ReadonlyArray<{ key: StatutChoice; label: string; storeAs: string }> = [
  { key: 'Vide', label: 'Vide', storeAs: 'En attente saillie' },
  { key: 'Pleine', label: 'Pleine', storeAs: 'Pleine' },
  { key: 'Maternité', label: 'Materni.', storeAs: 'En maternité' },
];

interface QuickAddTruieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddTruieForm: React.FC<QuickAddTruieFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const { truies, verrats, refreshData } = useFarm();
  const suggestedId = useMemo(() => suggestNextTruieId(truies), [truies]);
  const [code, setCode] = useState<string>(suggestedId);
  const [boucle, setBoucle] = useState<string>('');
  const [statut, setStatut] = useState<StatutChoice>('Vide');
  const [dateNaissance, setDateNaissance] = useState<string>('');
  const [logeId, setLogeId] = useState<string>('');
  const [truieMereQuery, setTruieMereQuery] = useState<string>('');
  const [truieMereId, setTruieMereId] = useState<string>('');
  const [verratOrigineId, setVerratOrigineId] = useState<string>('');
  const [errors, setErrors] = useState<AddTruieValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const { show: showToast, toastProps } = useAppToast();
  const [loges, setLoges] = useState<Loge[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listLoges()
      .then(rows => { if (!cancelled) setLoges(rows.filter(l => l.active)); })
      .catch(() => { if (!cancelled) setLoges([]); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const [lastKey, setLastKey] = useState<{ isOpen: boolean; suggestedId: string }>({ isOpen, suggestedId });
  if (lastKey.isOpen !== isOpen || lastKey.suggestedId !== suggestedId) {
    setLastKey({ isOpen, suggestedId });
    if (isOpen) {
      setCode(suggestedId); setBoucle(''); setStatut('Vide'); setDateNaissance('');
      setLogeId(''); setTruieMereQuery(''); setTruieMereId(''); setVerratOrigineId('');
      setErrors({}); setSaving(false);
    }
  }

  const handleClose = useCallback(() => { if (!saving) onClose(); }, [onClose, saving]);
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const truieMereSuggestions = useMemo<Truie[]>(() => {
    const q = truieMereQuery.trim().toLowerCase();
    if (!q) return [];
    return truies.filter(t => {
      const id = (t.displayId || t.id || '').toLowerCase();
      const b = (t.boucle || '').toLowerCase();
      return id.includes(q) || b.includes(q);
    }).slice(0, 6);
  }, [truies, truieMereQuery]);

  const selectMere = (t: Truie): void => {
    const c = t.displayId || t.id;
    setTruieMereId(c);
    setTruieMereQuery(c);
  };

  const isValid = !!code.trim() && !!boucle.trim();

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent): Promise<void> => {
    if (e) e.preventDefault();
    const result = validateAddTruie({ id: code, boucle, nom: '', stade: 'Adulte', ration: '3.0' });
    if (!result.ok || !result.row) { setErrors(result.errors); return; }
    setErrors({}); setSaving(true);
    try {
      const row = result.row;
      const sowValues: Record<string, unknown> = {
        code_id: row[0] as string,
        name: (row[1] as string) || null,
        boucle: (row[2] as string) || null,
        statut: STATUT_CHOICES.find(s => s.key === statut)?.storeAs ?? row[3],
        nb_portees: row[5] as number,
        ration_kg_j: row[8] as number,
      };
      if (dateNaissance) sowValues.date_naissance = dateNaissance;
      if (logeId) sowValues.loge_id = logeId;
      if (truieMereId) sowValues.mere_code_id = truieMereId;
      if (verratOrigineId) sowValues.pere_code_id = verratOrigineId;
      const online = isOnline();
      if (online) await insertSow(sowValues as Parameters<typeof insertSow>[0]);
      else await enqueueInsert('sows', sowValues);
      showToast(online ? 'Truie ajoutée' : 'Truie en file · sync auto', online ? 'success' : 'info', { duration: 1800 });
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement', 'error', { duration: 1800 });
    } finally { setSaving(false); }
  };

  const errMsg = (msg?: string): React.ReactNode =>
    msg ? <span role="alert" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-danger)' }}>{msg}</span> : null;

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={handleClose} breakpoints={[0, 1]} initialBreakpoint={1} className="agritech-bottom-sheet pt-sheet-modal pt-screen" aria-label="Ajouter une truie">
        <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
          <form className="sheet" onSubmit={handleSubmit} noValidate aria-label="Création d'une truie" style={{ position: 'relative', height: '100%', maxHeight: '100%' }}>
            <span className="sheet__handle" />
            <header className="sheet__head">
              <div>
                <div className="eyebrow">Nouvelle truie</div>
                <h2 className="sheet__title">Ajouter une truie</h2>
              </div>
              <button type="button" className="sheet__close" onClick={handleClose} aria-label="Fermer" disabled={saving}>
                <X size={14} aria-hidden="true" />
              </button>
            </header>
            <div className="sheet__body">
              <div className="field">
                <label className="label--v77" htmlFor="add-truie-code">CODE <span className="hint">auto-généré</span></label>
                <input id="add-truie-code" ref={firstFieldRef} className={`field__input mono${code ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={10} autoCapitalize="characters" aria-label="Code de la truie" aria-required="true" aria-invalid={!!errors.id} placeholder="T-051" value={code} onChange={e => setCode(e.target.value)} disabled={saving} autoComplete="off" />
                {errMsg(errors.id)}
              </div>
              <div className="field">
                <label className="label--v77" htmlFor="add-truie-boucle">BOUCLE OFFICIELLE <span className="req">requis</span></label>
                <input id="add-truie-boucle" className={`field__input mono${boucle ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={20} aria-label="Numéro de boucle" aria-required="true" aria-invalid={!!errors.boucle} placeholder="CI-051-26" value={boucle} onChange={e => setBoucle(e.target.value)} disabled={saving} autoComplete="off" />
                {errMsg(errors.boucle)}
              </div>
              <div className="field">
                <label className="label--v77">STATUT</label>
                <div className="radio-chips--cards" role="radiogroup" aria-label="Statut">
                  {STATUT_CHOICES.map(s => (
                    <button key={s.key} type="button" className={`radio-chip--card${statut === s.key ? ' is-selected' : ''}`} role="radio" aria-checked={statut === s.key} onClick={() => setStatut(s.key)} disabled={saving}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="label--v77" htmlFor="add-truie-naissance">DATE NAISSANCE</label>
                <input id="add-truie-naissance" className={`field__input mono${dateNaissance ? ' filled' : ' field__input--ghost'}`} type="date" aria-label="Date de naissance" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} disabled={saving} />
              </div>
              {loges.length > 0 ? (
                <div className="field">
                  <label className="label--v77" htmlFor="add-truie-loge">LOGE ACTUELLE</label>
                  <select id="add-truie-loge" className={`field__input${logeId ? ' mono filled' : ' field__input--ghost'}`} aria-label="Loge actuelle" value={logeId} onChange={e => setLogeId(e.target.value)} disabled={saving}>
                    <option value="">— Sélectionner —</option>
                    {loges.map(l => <option key={l.id} value={l.id}>{l.numero}{l.type ? ` · ${l.type}` : ''}</option>)}
                  </select>
                </div>
              ) : null}
              <div className="field">
                <label className="label--v77" htmlFor="add-truie-mere">TRUIE MÈRE <span className="hint">optionnel</span></label>
                <input id="add-truie-mere" className={`field__input mono${truieMereId ? ' filled' : ' field__input--ghost'}`} type="text" aria-label="Truie mère" placeholder="Rechercher T-…" value={truieMereQuery} onChange={e => { setTruieMereQuery(e.target.value); if (e.target.value === '') setTruieMereId(''); }} disabled={saving} autoComplete="off" />
                {truieMereSuggestions.length > 0 && truieMereQuery !== truieMereId ? (
                  <div role="listbox" style={{ marginTop: 4, border: '1px solid var(--pt-line)', borderRadius: 10, background: 'var(--pt-bg)', maxHeight: 200, overflowY: 'auto' }}>
                    {truieMereSuggestions.map(t => (
                      <button key={t.id} type="button" role="option" aria-selected={false} onClick={() => selectMere(t)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)', cursor: 'pointer', minHeight: 44 }}>
                        {t.displayId || t.id}{t.nom ? ` · ${t.nom}` : ''}{t.boucle ? ` (${t.boucle})` : ''}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {verrats.length > 0 ? (
                <div className="field">
                  <label className="label--v77" htmlFor="add-truie-verrat">VERRAT ORIGINE <span className="hint">optionnel</span></label>
                  <select id="add-truie-verrat" className={`field__input${verratOrigineId ? ' mono filled' : ' field__input--ghost'}`} aria-label="Verrat origine" value={verratOrigineId} onChange={e => setVerratOrigineId(e.target.value)} disabled={saving}>
                    <option value="">— Aucun —</option>
                    {verrats.map(v => <option key={v.id} value={v.displayId || v.id}>{v.displayId || v.id}{v.nom ? ` · ${v.nom}` : ''}</option>)}
                  </select>
                </div>
              ) : null}
            </div>
            <footer className="sheet__foot">
              <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={saving} aria-label="Annuler et fermer">Annuler</button>
              <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={saving || !isValid} aria-busy={saving} aria-label="Ajouter la truie au troupeau">
                {saving ? 'Enregistrement…' : <><Check size={14} aria-hidden="true" /> Enregistrer la truie</>}
              </button>
            </footer>
          </form>
        </div>
      </IonModal>
      <AppToast {...toastProps} />
    </>
  );
};

export default QuickAddTruieForm;
