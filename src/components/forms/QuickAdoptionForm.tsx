/**
 * QuickAdoptionForm — Adoption / transfert de porcelets entre bandes
 * ════════════════════════════════════════════════════════════════════════
 *
 * Bande source · bande destination · nb porcelets · date · motif · notes.
 * Submit → `insertAdoption(...)` qui :
 *  1. Insère une row dans `adoptions`.
 *  2. Décrémente `from_batch.porcelets_nes_vivants`.
 *  3. Incrémente `to_batch.porcelets_nes_vivants`.
 *
 * Filtres bandes : on liste les bandes en maternité (statut ∈ "Sous mère"
 * ou "En maternité") afin que l'utilisateur ne sélectionne pas une bande
 * sevrée par mégarde.
 *
 * Conforme au contrat (FORM_CONTRACT.md) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, pas de toast local)
 *  - helpers date partagés `_formHelpers` (todayIso)
 *  - erreurs via `<FieldError>` sous chaque champ
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Les `<select>` bande source/destination restent en `<select>` natif : ce
 * sont des bandes (lots), pas des truies/verrats → `EntityPicker` non
 * applicable.
 *
 * Logique pure : `./quickAdoptionLogic.ts`
 * Tests : `./QuickAdoptionForm.test.tsx`
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabaseClient';
import { insertAdoption } from '../../services/supabaseWrites';
import { useFocusFirstInput } from './useFormA11y';
import { todayIso } from './_formHelpers';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import {
  ADOPTION_MOTIFS,
  ADOPTION_MOTIF_LABELS,
  validateAddAdoption,
  type AddAdoptionInput,
  type AddAdoptionValidation,
} from './quickAdoptionLogic';

interface QuickAdoptionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAdoptionForm: React.FC<QuickAdoptionFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { bandes, refreshData } = useFarm();
  const { showToast } = useToast();

  // Bandes en maternité (Sous mère / En maternité). On garde toutes les bandes
  // si la liste filtrée est vide, pour ne pas bloquer la saisie.
  const bandesMaternite = useMemo(() => {
    const filtered = bandes.filter(b => /sous m[èe]re|maternit/i.test(b.statut));
    return filtered.length > 0 ? filtered : bandes;
  }, [bandes]);

  const [fromBatchCode, setFromBatchCode] = useState<string>('');
  const [toBatchCode, setToBatchCode] = useState<string>('');
  const [nbPorcelets, setNbPorcelets] = useState<string>('1');
  const [dateAdoption, setDateAdoption] = useState<string>(todayIso);
  const [motif, setMotif] = useState<string>('EQUILIBRAGE');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<AddAdoptionValidation['errors']>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fromBande = useMemo(
    () => bandesMaternite.find(b => b.id === fromBatchCode || b.idPortee === fromBatchCode),
    [bandesMaternite, fromBatchCode],
  );

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setFromBatchCode('');
      setToBatchCode('');
      setNbPorcelets('1');
      setDateAdoption(todayIso());
      setMotif('EQUILIBRAGE');
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

  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(isOpen);

  /** Résout un code (B12) ou ID UUID en UUID via une requête Supabase. */
  async function resolveBatchUuid(code: string): Promise<string | null> {
    if (!code) return null;
    // Si déjà UUID-like
    if (/^[0-9a-f-]{32,36}$/i.test(code)) return code;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('batches') as any)
      .select('id')
      .eq('code_id', code)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return (data as { id: string }).id;
  }

  const isValid = !!fromBatchCode && !!toBatchCode;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const input: AddAdoptionInput = {
      fromBatchId: fromBatchCode,
      toBatchId: toBatchCode,
      nbPorcelets,
      dateAdoption,
      motif,
      notes,
      fromBatchVivants: fromBande?.vivants,
    };
    const result = validateAddAdoption(input);
    if (!result.ok || !result.payload) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      // Résolution UUIDs (les selects portent l'id de l'objet bande)
      const fromUuid = await resolveBatchUuid(result.payload.from_batch_id);
      const toUuid = await resolveBatchUuid(result.payload.to_batch_id);
      if (!fromUuid || !toUuid) {
        showToast('Bande introuvable côté serveur', 'error', 4000);
        setSaving(false);
        return;
      }
      // Récupère l'utilisateur courant pour created_by
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        showToast('Session expirée — reconnecte-toi', 'error', 4000);
        setSaving(false);
        return;
      }
      await insertAdoption({
        ...result.payload,
        from_batch_id: fromUuid,
        to_batch_id: toUuid,
        created_by: uid,
      });
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      showToast('Adoption enregistrée', 'success');
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic dans
      // la fenêtre entre toast success et fermeture (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement';
      showToast(msg, 'error', 4000);
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Adoption porcelets"
      title="Adoption porcelets"
      ariaLabel="Adoption / transfert de porcelets"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer l'adoption"
      submitAriaLabel="Enregistrer l'adoption"
    >
      <p className="text-mono-label" style={{ color: 'var(--pt-subtle)', margin: 0 }}>
        Transférer entre bandes en maternité
      </p>

      <div className="field">
        <label className="label--v77" htmlFor="add-adoption-from">
          BANDE SOURCE <span className="req">requis</span>
        </label>
        <select
          id="add-adoption-from"
          ref={firstFieldRef}
          className={`field__input mono${fromBatchCode ? ' filled' : ' field__input--ghost'}`}
          aria-label="Bande source"
          aria-required="true"
          aria-invalid={!!errors.fromBatchId}
          value={fromBatchCode}
          onChange={e => setFromBatchCode(e.target.value)}
          disabled={saving}
        >
          <option value="">— Sélectionner —</option>
          {bandesMaternite.map(b => (
            <option key={b.id} value={b.id}>
              {b.idPortee || b.id} · {b.vivants ?? 0} vivants
            </option>
          ))}
        </select>
        <FieldError message={errors.fromBatchId} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-adoption-to">
          BANDE DESTINATION <span className="req">requis</span>
        </label>
        <select
          id="add-adoption-to"
          className={`field__input mono${toBatchCode ? ' filled' : ' field__input--ghost'}`}
          aria-label="Bande destination"
          aria-required="true"
          aria-invalid={!!errors.toBatchId}
          value={toBatchCode}
          onChange={e => setToBatchCode(e.target.value)}
          disabled={saving}
        >
          <option value="">— Sélectionner —</option>
          {bandesMaternite
            .filter(b => b.id !== fromBatchCode)
            .map(b => (
              <option key={b.id} value={b.id}>
                {b.idPortee || b.id} · {b.vivants ?? 0} vivants
              </option>
            ))}
        </select>
        <FieldError message={errors.toBatchId} />
      </div>

      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="add-adoption-nb">NB PORCELETS</label>
          <input
            id="add-adoption-nb"
            className={`field__input mono${nbPorcelets ? ' filled' : ' field__input--ghost'}`}
            type="number"
            aria-label="Nombre de porcelets"
            inputMode="numeric"
            min={1}
            step={1}
            aria-required="true"
            aria-invalid={!!errors.nbPorcelets}
            placeholder="1"
            value={nbPorcelets}
            onChange={e => setNbPorcelets(e.target.value)}
            disabled={saving}
          />
          <FieldError message={errors.nbPorcelets} />
        </div>

        <div className="field">
          <label className="label--v77" htmlFor="add-adoption-date">DATE</label>
          <input
            id="add-adoption-date"
            className={`field__input mono${dateAdoption ? ' filled' : ' field__input--ghost'}`}
            type="date"
            aria-label="Date d'adoption"
            aria-required="true"
            aria-invalid={!!errors.dateAdoption}
            value={dateAdoption}
            max={todayIso()}
            onChange={e => setDateAdoption(e.target.value)}
            disabled={saving}
          />
          <FieldError message={errors.dateAdoption} />
        </div>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-adoption-motif">MOTIF</label>
        <select
          id="add-adoption-motif"
          className={`field__input mono${motif ? ' filled' : ' field__input--ghost'}`}
          aria-label="Motif"
          value={motif}
          onChange={e => setMotif(e.target.value)}
          disabled={saving}
        >
          {ADOPTION_MOTIFS.map(m => (
            <option key={m} value={m}>
              {ADOPTION_MOTIF_LABELS[m]}
            </option>
          ))}
        </select>
        <FieldError message={errors.motif} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-adoption-notes">NOTES <span className="hint">optionnel</span></label>
        <textarea
          id="add-adoption-notes"
          className="field__input"
          aria-label="Notes"
          maxLength={500}
          rows={3}
          aria-invalid={!!errors.notes}
          placeholder="Ex : truie T03 sans lait, transfert d'urgence"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.notes} />
      </div>
    </QuickActionSheet>
  );
};

export default QuickAdoptionForm;
