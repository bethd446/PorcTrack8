/**
 * QuickEditPorceletForm — Édition + suppression d'un porcelet individuel.
 * Champs : boucle · sexe · poids courant · statut · notes.
 * Patch partiel via updatePorcelet ; bouton suppression avec confirmation.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save, Trash2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
import {
  removePorcelet,
  updatePorcelet,
} from '../../services/supabaseWrites';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import type {
  PorceletIndividuel,
  PorceletSexe,
  PorceletStatut,
} from '../../types/farm';
import { validateAddPorcelet } from './quickAddPorceletLogic';

interface QuickEditPorceletFormProps {
  isOpen: boolean;
  onClose: () => void;
  porcelet: PorceletIndividuel;
  /** Boucles déjà utilisées dans la ferme (excluant celle du porcelet courant). */
  existingBoucles: Set<string>;
  onSuccess?: () => void;
  onDeleted?: () => void;
}

const STATUTS: readonly PorceletStatut[] = [
  'VIVANT',
  'MORT',
  'VENDU',
  'MALADE',
  'QUARANTAINE',
];

const QuickEditPorceletForm: React.FC<QuickEditPorceletFormProps> = ({
  isOpen,
  onClose,
  porcelet,
  existingBoucles,
  onSuccess,
  onDeleted,
}) => {
  const [boucle, setBoucle] = useState<string>(porcelet.boucle);
  const [sexe, setSexe] = useState<PorceletSexe>(porcelet.sexe);
  const [statut, setStatut] = useState<PorceletStatut>(porcelet.statut);
  const [poidsCourantKg, setPoidsCourantKg] = useState<string>(
    porcelet.poidsCourantKg != null ? String(porcelet.poidsCourantKg) : '',
  );
  const [notes, setNotes] = useState<string>(porcelet.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setBoucle(porcelet.boucle);
      setSexe(porcelet.sexe);
      setStatut(porcelet.statut);
      setPoidsCourantKg(
        porcelet.poidsCourantKg != null ? String(porcelet.poidsCourantKg) : '',
      );
      setNotes(porcelet.notes ?? '');
      setErrors({});
      setSaving(false);
      setConfirmDelete(false);
    }
  }, [isOpen, porcelet]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  // Set unicité hors porcelet courant
  const existingUpper = useMemo(() => {
    const s = new Set<string>();
    for (const b of existingBoucles) {
      const up = b.trim().toUpperCase();
      if (up !== porcelet.boucle.trim().toUpperCase()) s.add(up);
    }
    return s;
  }, [existingBoucles, porcelet.boucle]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddPorcelet(
      { boucle, sexe, poidsCourantKg, notes },
      existingUpper,
    );
    if (!result.ok || !result.values) {
      setErrors(result.errors as Record<string, string>);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updatePorcelet(porcelet.id, {
        boucle: result.values.boucle,
        sexe: result.values.sexe,
        poidsCourantKg: result.values.poidsCourantKg,
        statut,
        notes: result.values.notes,
      });
      setToast('Porcelet mis à jour');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await removePorcelet(porcelet.id);
      setToast('Porcelet supprimé');
      if (onDeleted) onDeleted();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur suppression',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={`Porcelet ${porcelet.boucle}`}
        height="auto"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Édition d'un porcelet individuel"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-mono-label text-text-1">Modifier ce porcelet</p>
              <p className="text-mono-micro text-text-2 mt-0.5">
                Boucle, sexe, poids, statut, notes
              </p>
            </div>
          </div>

          {/* Boucle */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-porcelet-boucle"
              className="block text-mono-label text-text-2"
            >
              Boucle
            </label>
            <input
              id="edit-porcelet-boucle"
              ref={firstFieldRef}
              type="text"
              maxLength={15}
              autoCapitalize="characters"
              autoComplete="off"
              aria-invalid={!!errors.boucle}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                'font-mono text-[14px] uppercase outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.boucle ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              value={boucle}
              onChange={e => setBoucle(e.target.value)}
              disabled={saving}
            />
            {errors.boucle ? (
              <p role="alert" className="text-[12px] text-red">
                {errors.boucle}
              </p>
            ) : null}
          </div>

          {/* Sexe */}
          <div className="space-y-1.5">
            <span className="block text-mono-label text-text-2">Sexe</span>
            <div className="flex gap-2" role="radiogroup">
              {(['M', 'F', 'INCONNU'] as PorceletSexe[]).map(s => {
                const selected = sexe === s;
                const label = s === 'M' ? 'Mâle' : s === 'F' ? 'Femelle' : 'Inconnu';
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={label}
                    onClick={() => setSexe(s)}
                    disabled={saving}
                    className={[
                      'pressable inline-flex items-center justify-center',
                      'flex-1 h-11 px-3 rounded-md border',
                      'text-[12px] font-semibold uppercase tracking-wide',
                      selected
                        ? 'bg-accent text-bg-0 border-accent'
                        : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-porcelet-statut"
              className="block text-mono-label text-text-2"
            >
              Statut
            </label>
            <select
              id="edit-porcelet-statut"
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                'text-[14px] outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                'border-border hover:border-text-2',
              ].join(' ')}
              value={statut}
              onChange={e => setStatut(e.target.value as PorceletStatut)}
              disabled={saving}
            >
              {STATUTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Poids */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-porcelet-poids"
              className="block text-mono-label text-text-2"
            >
              Poids courant (kg)
            </label>
            <input
              id="edit-porcelet-poids"
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0.5}
              max={200}
              aria-invalid={!!errors.poidsCourantKg}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'text-[16px] tabular-nums text-center font-semibold outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.poidsCourantKg ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="—"
              value={poidsCourantKg}
              onChange={e => setPoidsCourantKg(e.target.value)}
              disabled={saving}
            />
            {errors.poidsCourantKg ? (
              <p role="alert" className="text-[12px] text-red">
                {errors.poidsCourantKg}
              </p>
            ) : null}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-porcelet-notes"
              className="block text-mono-label text-text-2"
            >
              Notes
            </label>
            <textarea
              id="edit-porcelet-notes"
              rows={2}
              maxLength={300}
              aria-invalid={!!errors.notes}
              className={[
                'w-full rounded-md px-3 py-2 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'text-[13px] outline-none transition-colors duration-[160ms] resize-none',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.notes ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Observation optionnelle…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
            {errors.notes ? (
              <p role="alert" className="text-[12px] text-red">
                {errors.notes}
              </p>
            ) : null}
          </div>

          {/* Suppression */}
          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              aria-label={confirmDelete ? 'Confirmer la suppression' : 'Supprimer ce porcelet'}
              className={[
                'pressable w-full h-12 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'text-[12px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-2',
                confirmDelete
                  ? 'bg-red text-bg-0 hover:brightness-110'
                  : 'bg-bg-1 border border-red/40 text-red hover:bg-red/10',
                saving ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>{confirmDelete ? 'Confirmer suppression' : 'Supprimer'}</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              aria-label="Annuler"
              className={[
                'pressable flex-1 h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-bg-1 border border-border text-text-1',
                'text-[12px] font-bold uppercase tracking-wide',
                saving ? 'opacity-40 cursor-not-allowed' : 'hover:border-text-2',
              ].join(' ')}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              aria-label="Enregistrer"
              aria-busy={saving}
              className={[
                'pressable flex-[2] h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-accent text-bg-0',
                'text-[13px] font-bold uppercase tracking-wide',
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

export default QuickEditPorceletForm;
