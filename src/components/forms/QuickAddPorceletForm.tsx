/**
 * QuickAddPorceletForm — Création d'un porcelet individuel boucle-traçable.
 * Champs : boucle (regex, unicité ferme) · sexe (M/F/INCONNU) · poids (opt.) · notes.
 * Submit → addPorcelet (Supabase, farm_id auto). Toast succès / erreur.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { AlertTriangle, Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { addPorcelet } from '../../services/supabaseWrites';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  findDuplicateBoucle,
  validateAddPorcelet,
  type AddPorceletErrors,
  type DuplicateBoucleMatch,
} from './quickAddPorceletLogic';
import type { PorceletSexe, PorceletIndividuel } from '../../types/farm';

interface QuickAddPorceletFormProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  /** Boucles déjà utilisées dans la ferme (pour test unicité). Uppercase recommended.
   *  V36-E P3 : conservé pour rétrocompat mais le check d'unicité est désormais
   *  un warning non-bloquant (les doublons sont volontaires dans le carnet papier). */
  existingBoucles: Set<string>;
  /** V36-E P3 — liste enrichie des porcelets existants pour matcher boucle+sexe.
   *  Optionnel : si absent, le warning de doublon n'est pas affiché. */
  existingPorcelets?: ReadonlyArray<PorceletIndividuel>;
  /** V36-E P3 — résolveur optionnel pour afficher le code_id de la bande
   *  contenant le doublon. */
  resolveBatchCodeId?: (batchId: string) => string | undefined;
  onSuccess?: (porcelet: PorceletIndividuel) => void;
}

const QuickAddPorceletForm: React.FC<QuickAddPorceletFormProps> = ({
  isOpen,
  onClose,
  batchId,
  existingBoucles,
  existingPorcelets,
  resolveBatchCodeId,
  onSuccess,
}) => {
  // existingBoucles est conservé pour la prop interface, mais le check d'unicité
  // bloquant est désactivé (cf V36-E P3 — doublons volontaires).
  void existingBoucles;
  const [boucle, setBoucle] = useState<string>('');
  const [sexe, setSexe] = useState<PorceletSexe>('INCONNU');
  const [poidsCourantKg, setPoidsCourantKg] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<AddPorceletErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');
  // V36-E P3 — Détection doublon (boucle+sexe), warning non-bloquant, debounce 300ms
  const [duplicate, setDuplicate] = useState<DuplicateBoucleMatch | null>(null);

  // Reset à l'ouverture
  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setBoucle('');
      setSexe('INCONNU');
      setPoidsCourantKg('');
      setNotes('');
      setErrors({});
      setSaving(false);
      setDuplicate(null);
    }
  }

  // V36-E P3 — Debounce 300ms du lookup doublon boucle+sexe.
  useEffect(() => {
    if (!isOpen) return;
    if (!existingPorcelets || existingPorcelets.length === 0) {
      setDuplicate(null);
      return;
    }
    const trimmed = boucle.trim();
    if (!trimmed) {
      setDuplicate(null);
      return;
    }
    const handle = setTimeout(() => {
      const m = findDuplicateBoucle(trimmed, sexe, existingPorcelets);
      setDuplicate(m);
    }, 300);
    return () => clearTimeout(handle);
  }, [boucle, sexe, existingPorcelets, isOpen]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  // V36-E P3 — l'unicité boucle est gérée comme un warning non-bloquant
  // côté UI (cf duplicate / findDuplicateBoucle). On force un set vide pour
  // empêcher la validation de bloquer la submission.
  const noUniquenessSet = useMemo(() => new Set<string>(), []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddPorcelet(
      { boucle, sexe, poidsCourantKg, notes },
      noUniquenessSet,
    );
    if (!result.ok || !result.values) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const created = await addPorcelet({
        batchId,
        boucle: result.values.boucle,
        sexe: result.values.sexe,
        poidsCourantKg: result.values.poidsCourantKg,
        notes: result.values.notes,
      });
      setToast('Porcelet ajouté');
      if (onSuccess) onSuccess(created);
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

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Ajouter un porcelet"
        height="auto"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Ajout d'un porcelet individuel"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-mono-label text-text-1">
                Numéroter un porcelet
              </p>
              <p className="text-mono-micro text-text-2 mt-0.5">
                Boucle individuelle pour suivi sanitaire
              </p>
            </div>
          </div>

          {/* Boucle */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-porcelet-boucle"
              className="block text-mono-label text-text-2"
            >
              Boucle <span className="text-red normal-case">· obligatoire</span>
            </label>
            <input
              id="add-porcelet-boucle"
              ref={firstFieldRef}
              type="text"
              maxLength={15}
              autoCapitalize="characters"
              autoComplete="off"
              aria-required="true"
              aria-invalid={!!errors.boucle}
              aria-describedby={errors.boucle ? 'add-porcelet-boucle-error' : 'add-porcelet-boucle-hint'}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'ft-code text-[14px] uppercase outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.boucle ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="P-001"
              value={boucle}
              onChange={e => setBoucle(e.target.value)}
              disabled={saving}
            />
            {errors.boucle ? (
              <p id="add-porcelet-boucle-error" role="alert" className="text-[12px] text-red">
                {errors.boucle}
              </p>
            ) : (
              <p id="add-porcelet-boucle-hint" className="text-[12px] text-text-2">
                2–15 car. (lettres, chiffres, tirets) · doublons autorisés (signalés)
              </p>
            )}

            {/* V36-E P3 — Warning doublon non-bloquant (Tag pill amber) */}
            {duplicate ? (
              <div
                role="status"
                aria-live="polite"
                data-testid="add-porcelet-dup-warning"
                className="mt-2 inline-flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <AlertTriangle
                  size={14}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-amber-800"
                />
                <span className="text-[11px] leading-snug text-amber-800">
                  Cette boucle existe déjà : "{duplicate.boucle}" (sexe{' '}
                  {duplicate.sexe})
                  {(() => {
                    const code = resolveBatchCodeId
                      ? resolveBatchCodeId(duplicate.batchId)
                      : undefined;
                    return code ? ` dans bande ${code}` : '';
                  })()}
                  . Continue si c'est intentionnel (porcelets distincts).
                </span>
              </div>
            ) : null}
          </div>

          {/* Sexe */}
          <div className="space-y-1.5">
            <span
              id="add-porcelet-sexe-label"
              className="block text-mono-label text-text-2"
            >
              Sexe
            </span>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-labelledby="add-porcelet-sexe-label"
            >
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
                      'transition-colors duration-[160ms]',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
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

          {/* Poids courant */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-porcelet-poids"
              className="block text-mono-label text-text-2"
            >
              Poids courant (kg) <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <input
              id="add-porcelet-poids"
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0.5}
              max={200}
              aria-invalid={!!errors.poidsCourantKg}
              aria-describedby={errors.poidsCourantKg ? 'add-porcelet-poids-error' : undefined}
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
              <p id="add-porcelet-poids-error" role="alert" className="text-[12px] text-red">
                {errors.poidsCourantKg}
              </p>
            ) : null}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-porcelet-notes"
              className="block text-mono-label text-text-2"
            >
              Notes
            </label>
            <textarea
              id="add-porcelet-notes"
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
              aria-label="Ajouter le porcelet"
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
                  <span>Ajouter</span>
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

export default QuickAddPorceletForm;
