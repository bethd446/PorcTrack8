/**
 * QuickAddPorceletForm — Création d'un porcelet individuel boucle-traçable.
 * Champs : boucle (regex, unicité ferme) · sexe (M/F/INCONNU) · poids (opt.) · notes.
 * Submit → addPorcelet (Supabase, farm_id auto). Toast succès / erreur.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { AlertTriangle, Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Textarea, Button, RadioGroup } from '@/design-system';
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

          <FormField
            label="Boucle"
            required
            hint={errors.boucle ? undefined : '2–15 car. (lettres, chiffres, tirets) · doublons autorisés (signalés)'}
            error={errors.boucle}
          >
            <Input
              id="add-porcelet-boucle"
              ref={firstFieldRef}
              type="text"
              aria-label="Boucle"
              maxLength={15}
              autoCapitalize="characters"
              autoComplete="off"
              aria-required="true"
              aria-invalid={!!errors.boucle}
              aria-describedby={errors.boucle ? 'add-porcelet-boucle-error' : 'add-porcelet-boucle-hint'}
              className="ft-code uppercase"
              placeholder="P-001"
              value={boucle}
              onChange={e => setBoucle(e.target.value)}
              disabled={saving}
              invalid={!!errors.boucle}
            />

            {/* V36-E P3 — Warning doublon non-bloquant */}
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

          <FormField label="Poids courant (kg)" hint="optionnel" error={errors.poidsCourantKg}>
            <Input
              id="add-porcelet-poids"
              type="number"
              aria-label="Poids courant en kilogrammes"
              inputMode="decimal"
              step={0.1}
              min={0.5}
              max={200}
              aria-invalid={!!errors.poidsCourantKg}
              aria-describedby={errors.poidsCourantKg ? 'add-porcelet-poids-error' : undefined}
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
              id="add-porcelet-notes"
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
              ariaLabel="Ajouter le porcelet"
            >
              {saving ? 'Enregistrement…' : (
                <span className="inline-flex items-center gap-2">
                  Ajouter
                  <Save size={14} aria-hidden="true" />
                </span>
              )}
            </Button>
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
