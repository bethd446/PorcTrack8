/**
 * QuickAddTruieForm — Création rapide d'une truie (Sprint 5 v76)
 * ════════════════════════════════════════════════════════════════════════
 * Sheet bottom v76 · Code mono auto-gen · Boucle · Statut radio-chips ·
 * Date naissance · Loge select · Truie mère autocomplete · Verrat origine.
 *
 * Conforme au contrat (FORM_CONTRACT) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, remplace useAppToast local)
 *  - rendu d'erreur via `<FieldError>` (remplace `errMsg()` inline)
 *  - picker truie mère partagé `<EntityPicker mode="autocomplete">`
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *  - reset-on-open via `lastKey` render-phase
 *
 * Compagnon tests : QuickAddTruieForm.test.tsx (logique pure node env).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '../../context/ToastContext';
import { insertSow, listLoges } from '../../services/supabaseWrites';
import { enqueueInsert, isOnline } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError, EntityPicker } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import {
  suggestNextTruieId,
  validateAddTruie,
  type AddTruieValidation,
} from './quickAddTruieLogic';
import type { Loge } from '../../types/farm';

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
  const { showToast } = useToast();
  const suggestedId = useMemo(() => suggestNextTruieId(truies), [truies]);
  // V81 Sprint 2 — unicité côté client (code + boucle) avant INSERT
  const uniqueness = useMemo(
    () => ({
      existingCodes: new Set(truies.map((t) => (t.displayId || t.id || '').toUpperCase()).filter(Boolean)),
      existingBoucles: new Set(truies.map((t) => (t.boucle || '').toUpperCase()).filter(Boolean)),
    }),
    [truies],
  );
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
  const [loges, setLoges] = useState<Loge[]>([]);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listLoges()
      .then(rows => { if (!cancelled) setLoges(rows.filter(l => l.active)); })
      .catch(() => { if (!cancelled) setLoges([]); });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  const [lastKey, setLastKey] = useState<{ isOpen: boolean; suggestedId: string }>({ isOpen, suggestedId });
  if (lastKey.isOpen !== isOpen || lastKey.suggestedId !== suggestedId) {
    setLastKey({ isOpen, suggestedId });
    if (isOpen) {
      setCode(suggestedId); setBoucle(''); setStatut('Vide'); setDateNaissance('');
      setLogeId(''); setTruieMereQuery(''); setTruieMereId(''); setVerratOrigineId('');
      setErrors({}); setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    onClose();
  }, [onClose, saving]);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const isValid = !!code.trim() && !!boucle.trim();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddTruie({ id: code, boucle, nom: '', stade: 'Adulte', ration: '3.0' }, uniqueness);
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
      showToast(online ? 'Truie ajoutée' : 'Truie en file · sync auto', online ? 'success' : 'info', 1800);
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // (FORM_CONTRACT). setSaving n'est reset qu'en cas d'erreur (catch).
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
      eyebrow="Nouvelle truie"
      title="Ajouter une truie"
      ariaLabel="Ajouter une truie"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer la truie"
      submitAriaLabel="Ajouter la truie au troupeau"
    >
      <div className="field">
        <label className="label--v77" htmlFor="add-truie-code">CODE <span className="hint">auto-généré</span></label>
        <input id="add-truie-code" ref={firstFieldRef} className={`field__input mono${code ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={10} autoCapitalize="characters" aria-label="Code de la truie" aria-required="true" aria-invalid={!!errors.id} aria-describedby={errors.id ? 'err-code' : undefined} placeholder="T-051" value={code} onChange={e => setCode(e.target.value)} disabled={saving} autoComplete="off" />
        <FieldError message={errors.id} />
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-truie-boucle">BOUCLE OFFICIELLE <span className="req">requis</span></label>
        <input id="add-truie-boucle" className={`field__input mono${boucle ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={20} aria-label="Numéro de boucle" aria-required="true" aria-invalid={!!errors.boucle} aria-describedby={errors.boucle ? 'err-boucle' : undefined} placeholder="CI-051-26" value={boucle} onChange={e => setBoucle(e.target.value)} disabled={saving} autoComplete="off" />
        <FieldError message={errors.boucle} />
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
        <EntityPicker
          mode="autocomplete"
          entities={truies}
          value={truieMereId}
          onChange={setTruieMereId}
          query={truieMereQuery}
          onQueryChange={setTruieMereQuery}
          entityLabel="la truie mère"
          groupLabel="Truie mère"
          emptyText="Aucune truie disponible"
          disabled={saving}
          inputId="add-truie-mere"
          placeholder="Rechercher T-…"
        />
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
    </QuickActionSheet>
  );
};

export default QuickAddTruieForm;
