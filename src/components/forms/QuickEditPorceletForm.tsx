/**
 * QuickEditPorceletForm — Édition + suppression d'un porcelet individuel.
 * Champs : boucle · sexe · poids courant · statut · notes.
 * Patch partiel via updatePorcelet ; bouton suppression avec confirmation.
 *
 * Migration partielle FORM_CONTRACT (Phase 2 · Batch C) :
 *  - toast canonique `useToast()` (remplace IonToast local)
 *  - reset-on-open via `lastKey` render-phase (remplace useEffect[isOpen])
 *  - garde double-clic : `closeTimerRef` + cleanup `useEffect`
 *  Le shell `<QuickActionSheet>` n'est PAS applicable : ce form a un bouton
 *  « Supprimer » dédié et reste sur `<BottomSheet>` + composants DS.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, Save, Trash2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Select, Textarea, Button, RadioGroup } from '@/design-system';
import {
  removePorcelet,
  updatePorcelet,
} from '../../services/supabaseWrites';
import { useToast } from '../../context/ToastContext';
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
  const { showToast } = useToast();
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

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastKey render-phase (FORM_CONTRACT).
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; porceletId: string }>({
    isOpen, porceletId: porcelet.id,
  });
  if (lastKey.isOpen !== isOpen || lastKey.porceletId !== porcelet.id) {
    setLastKey({ isOpen, porceletId: porcelet.id });
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
      showToast('Porcelet mis à jour', 'success');
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic dans
      // la fenêtre 1.5s entre toast success et fermeture (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement',
        'error',
      );
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
      showToast('Porcelet supprimé', 'success');
      if (onDeleted) onDeleted();
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur suppression',
        'error',
      );
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

          <FormField label="Boucle" error={errors.boucle}>
            <Input
              id="edit-porcelet-boucle"
              ref={firstFieldRef}
              type="text"
              aria-label="Boucle"
              maxLength={15}
              autoCapitalize="characters"
              autoComplete="off"
              aria-invalid={!!errors.boucle}
              className="ft-code uppercase"
              value={boucle}
              onChange={e => setBoucle(e.target.value)}
              disabled={saving}
              invalid={!!errors.boucle}
            />
          </FormField>

          {/* V70.9 : Radio DS dédié — remplace le radiogroup custom */}
          <RadioGroup<PorceletSexe>
            label="Sexe"
            value={sexe}
            onChange={setSexe}
            disabled={saving}
            options={[
              { value: 'M', label: 'Mâle' },
              { value: 'F', label: 'Femelle' },
              { value: 'INCONNU', label: 'Inconnu' },
            ]}
          />

          <FormField label="Statut">
            <Select
              id="edit-porcelet-statut"
              aria-label="Statut"
              value={statut}
              onChange={e => setStatut(e.target.value as PorceletStatut)}
              disabled={saving}
            >
              {STATUTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Poids courant (kg)" error={errors.poidsCourantKg}>
            <Input
              id="edit-porcelet-poids"
              type="number"
              aria-label="Poids courant en kilogrammes"
              inputMode="decimal"
              step={0.1}
              min={0.5}
              max={200}
              aria-invalid={!!errors.poidsCourantKg}
              className="text-[16px] tabular-nums text-center font-semibold"
              placeholder="—"
              value={poidsCourantKg}
              onChange={e => setPoidsCourantKg(e.target.value)}
              disabled={saving}
              invalid={!!errors.poidsCourantKg}
            />
          </FormField>

          <FormField label="Notes" error={errors.notes}>
            <Textarea
              id="edit-porcelet-notes"
              aria-label="Notes"
              rows={2}
              maxLength={300}
              aria-invalid={!!errors.notes}
              placeholder="Observation optionnelle…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
          </FormField>

          <div className="border-t border-border pt-4">
            <Button
              variant="danger"
              fullWidth
              onClick={handleDelete}
              disabled={saving}
              ariaLabel={confirmDelete ? 'Confirmer la suppression' : 'Supprimer ce porcelet'}
            >
              <span className="inline-flex items-center gap-2">
                <Trash2 size={14} aria-hidden="true" />
                {confirmDelete ? 'Confirmer suppression' : 'Supprimer'}
              </span>
            </Button>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
              ariaLabel="Annuler"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              aria-busy={saving}
              ariaLabel="Enregistrer"
            >
              {saving ? 'Enregistrement…' : (
                <span className="inline-flex items-center gap-2">
                  Enregistrer
                  <Save size={14} aria-hidden="true" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </BottomSheet>
    </>
  );
};

export default QuickEditPorceletForm;
