/**
 * QuickAdoptionForm — Adoption / transfert de porcelets entre bandes
 * ════════════════════════════════════════════════════════════════════════
 *
 * BottomSheet : bande source · bande destination · nb porcelets · date ·
 * motif · notes. Submit → `insertAdoption(...)` qui :
 *  1. Insère une row dans `adoptions`.
 *  2. Décrémente `from_batch.porcelets_nes_vivants`.
 *  3. Incrémente `to_batch.porcelets_nes_vivants`.
 *
 * Filtres bandes : on liste les bandes en maternité (statut ∈ "Sous mère"
 * ou "En maternité") afin que l'utilisateur ne sélectionne pas une bande
 * sevrée par mégarde.
 *
 * Logique pure : `./quickAdoptionLogic.ts`
 * Tests : `./QuickAdoptionForm.test.tsx`
 */

import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Save, Repeat } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { useFarm } from '../../context/FarmContext';
import { supabase } from '../../services/supabaseClient';
import { insertAdoption } from '../../services/supabaseWrites';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  ADOPTION_MOTIFS,
  ADOPTION_MOTIF_LABELS,
  validateAddAdoption,
  todayISO,
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

  // Bandes en maternité (Sous mère / En maternité). On garde toutes les bandes
  // si la liste filtrée est vide, pour ne pas bloquer la saisie.
  const bandesMaternite = useMemo(() => {
    const filtered = bandes.filter(b => /sous m[èe]re|maternit/i.test(b.statut));
    return filtered.length > 0 ? filtered : bandes;
  }, [bandes]);

  const [fromBatchCode, setFromBatchCode] = useState<string>('');
  const [toBatchCode, setToBatchCode] = useState<string>('');
  const [nbPorcelets, setNbPorcelets] = useState<string>('1');
  const [dateAdoption, setDateAdoption] = useState<string>(todayISO());
  const [motif, setMotif] = useState<string>('EQUILIBRAGE');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<AddAdoptionValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  const fromBande = useMemo(
    () => bandesMaternite.find(b => b.id === fromBatchCode || b.idPortee === fromBatchCode),
    [bandesMaternite, fromBatchCode],
  );

  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setFromBatchCode('');
      setToBatchCode('');
      setNbPorcelets('1');
      setDateAdoption(todayISO());
      setMotif('EQUILIBRAGE');
      setNotes('');
      setErrors({});
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
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
        setToast('Bande introuvable côté serveur');
        return;
      }
      // Récupère l'utilisateur courant pour created_by
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        setToast('Session expirée — reconnecte-toi');
        return;
      }
      await insertAdoption({
        ...result.payload,
        from_batch_id: fromUuid,
        to_batch_id: toUuid,
        created_by: uid,
      });
      setToast('Adoption enregistrée');
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Adoption porcelets"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Adoption / transfert de porcelets"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Repeat size={18} aria-hidden="true" />
            </div>
            <p className="text-mono-label text-text-1">
              Transférer entre bandes en maternité
            </p>
          </div>

          {/* Bande source */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-adoption-from"
              className="block text-mono-label text-text-2"
            >
              Bande source <span className="text-red normal-case">· obligatoire</span>
            </label>
            <select
              id="add-adoption-from"
              ref={firstFieldRef}
              aria-required="true"
              aria-invalid={!!errors.fromBatchId}
              aria-describedby={errors.fromBatchId ? 'add-adoption-from-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0',
                'text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.fromBatchId ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
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
            {errors.fromBatchId ? (
              <p id="add-adoption-from-error" role="alert" className="text-[11px] text-red">
                {errors.fromBatchId}
              </p>
            ) : null}
          </div>

          {/* Bande destination */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-adoption-to"
              className="block text-mono-label text-text-2"
            >
              Bande destination <span className="text-red normal-case">· obligatoire</span>
            </label>
            <select
              id="add-adoption-to"
              aria-required="true"
              aria-invalid={!!errors.toBatchId}
              aria-describedby={errors.toBatchId ? 'add-adoption-to-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0',
                'text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.toBatchId ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
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
            {errors.toBatchId ? (
              <p id="add-adoption-to-error" role="alert" className="text-[11px] text-red">
                {errors.toBatchId}
              </p>
            ) : null}
          </div>

          {/* Nb porcelets + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="add-adoption-nb"
                className="block text-mono-label text-text-2"
              >
                Nb porcelets
              </label>
              <input
                id="add-adoption-nb"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                aria-required="true"
                aria-invalid={!!errors.nbPorcelets}
                aria-describedby={
                  errors.nbPorcelets ? 'add-adoption-nb-error' : undefined
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[16px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.nbPorcelets ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="1"
                value={nbPorcelets}
                onChange={e => setNbPorcelets(e.target.value)}
                disabled={saving}
              />
              {errors.nbPorcelets ? (
                <p id="add-adoption-nb-error" role="alert" className="text-[11px] text-red">
                  {errors.nbPorcelets}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="add-adoption-date"
                className="block text-mono-label text-text-2"
              >
                Date
              </label>
              <input
                id="add-adoption-date"
                type="date"
                aria-required="true"
                aria-invalid={!!errors.dateAdoption}
                aria-describedby={
                  errors.dateAdoption ? 'add-adoption-date-error' : undefined
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[13px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.dateAdoption ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                value={dateAdoption}
                onChange={e => setDateAdoption(e.target.value)}
                disabled={saving}
              />
              {errors.dateAdoption ? (
                <p id="add-adoption-date-error" role="alert" className="text-[11px] text-red">
                  {errors.dateAdoption}
                </p>
              ) : null}
            </div>
          </div>

          {/* Motif */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-adoption-motif"
              className="block text-mono-label text-text-2"
            >
              Motif
            </label>
            <select
              id="add-adoption-motif"
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border border-border text-text-0',
                'text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
              ].join(' ')}
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
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-adoption-notes"
              className="block text-mono-label text-text-2"
            >
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="add-adoption-notes"
              maxLength={500}
              rows={3}
              aria-invalid={!!errors.notes}
              className={[
                'w-full rounded-md px-3 py-2',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-sans text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.notes ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex : truie T03 sans lait, transfert d'urgence"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Actions */}
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
                'text-[12px] font-bold uppercase tracking-wide',
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
              aria-label="Enregistrer l'adoption"
              aria-busy={saving}
              className={[
                'pressable flex-[2] h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-accent text-bg-0',
                'text-[13px] font-bold uppercase tracking-wide',
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

export default QuickAdoptionForm;
