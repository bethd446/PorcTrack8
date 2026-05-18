/**
 * QuickConfirmSortieForm — V75-l
 * ════════════════════════════════════════════════════════════════════
 * Bottom sheet pour matérialiser la sortie d'une truie déjà en réforme :
 * vente, abattoir ou mortalité. Le parent persiste les 3 colonnes
 * `date_sortie / type_sortie / prix_sortie_fcfa` côté Supabase via `onConfirm`.
 *
 * Conforme FORM_CONTRACT Phase 2 :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - validation `{ ok, errors }` locale, rendu via `<FieldError>`
 *  - helpers date partagés `_formHelpers`
 *  - reset-on-open via `lastOpenKey` render-phase
 *
 * Note : ce form n'a pas d'écriture data ni de toast propres — il délègue au
 * parent via `onConfirm`. Pas de garde `saving`/`closeTimerRef` car aucune
 * opération asynchrone n'est lancée dans le composant.
 */
import React, { useState } from 'react';

import { useFocusFirstInput } from './useFormA11y';
import { todayIso } from './_formHelpers';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import type { Truie } from '../../types/farm';

export type SortieType = 'VENTE' | 'ABATTOIR' | 'MORTALITE';

export interface QuickConfirmSortieFormData {
  dateSortie: string;
  typeSortie: SortieType;
  prixSortieFcfa?: number;
  /** V75-o-a (F-16) — note libre éleveur, concaténée à `truie.notes` côté parent. */
  notes?: string;
}

export interface QuickConfirmSortieFormProps {
  isOpen: boolean;
  truie: Pick<Truie, 'displayId'>;
  onClose: () => void;
  onConfirm: (data: QuickConfirmSortieFormData) => void;
}

const TYPES: { value: SortieType; label: string }[] = [
  { value: 'VENTE', label: 'Vente' },
  { value: 'ABATTOIR', label: 'Abattoir' },
  { value: 'MORTALITE', label: 'Mortalité' },
];

const QuickConfirmSortieForm: React.FC<QuickConfirmSortieFormProps> = ({
  isOpen,
  truie,
  onClose,
  onConfirm,
}) => {
  const [dateSortie, setDateSortie] = useState<string>(todayIso());
  const [typeSortie, setTypeSortie] = useState<SortieType>('VENTE');
  const [prixSortieRaw, setPrixSortieRaw] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setDateSortie(todayIso());
      setTypeSortie('VENTE');
      setPrixSortieRaw('');
      setNotes('');
      setErrors({});
    }
  }

  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const isValid = !!dateSortie;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!dateSortie) {
      nextErrors.dateSortie = 'La date de sortie est obligatoire.';
    }
    let prixSortieFcfa: number | undefined;
    if (typeSortie === 'VENTE' && prixSortieRaw.trim() !== '') {
      const parsed = Number(prixSortieRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        nextErrors.prixSortie = 'Le prix doit être un nombre positif.';
      } else {
        prixSortieFcfa = parsed;
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    const trimmedNotes = notes.trim();
    onConfirm({
      dateSortie,
      typeSortie,
      prixSortieFcfa,
      notes: trimmedNotes !== '' ? trimmedNotes : undefined,
    });
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Sortie cheptel"
      title={`Sortir ${truie.displayId} du cheptel`}
      ariaLabel={`Sortir ${truie.displayId} du cheptel`}
      saving={false}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Confirmer la sortie"
      submitAriaLabel={`Confirmer la sortie de ${truie.displayId}`}
    >
      <div className="field">
        <label className="label--v77" htmlFor="sortie-date">
          DATE DE SORTIE <span className="req">requis</span>
        </label>
        <input
          id="sortie-date"
          ref={firstFieldRef}
          type="date"
          className={`field__input mono${dateSortie ? ' filled' : ' field__input--ghost'}`}
          aria-label="Date de sortie"
          aria-required="true"
          aria-invalid={!!errors.dateSortie}
          value={dateSortie}
          onChange={e => setDateSortie(e.target.value)}
          max={todayIso()}
        />
        <FieldError message={errors.dateSortie} />
      </div>

      <div className="field">
        <label className="label--v77">TYPE DE SORTIE</label>
        <div
          className="radio-chips--cards"
          role="radiogroup"
          aria-label="Type de sortie"
        >
          {TYPES.map(t => {
            const active = typeSortie === t.value;
            return (
              <button
                key={t.value}
                type="button"
                className={`radio-chip--card${active ? ' is-selected' : ''}`}
                role="radio"
                aria-checked={active}
                onClick={() => setTypeSortie(t.value)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {typeSortie === 'VENTE' && (
        <div className="field">
          <label className="label--v77" htmlFor="sortie-prix">
            PRIX DE VENTE <span className="hint">FCFA · optionnel</span>
          </label>
          <input
            id="sortie-prix"
            type="number"
            min={0}
            max={999999999}
            inputMode="numeric"
            className={`field__input mono${prixSortieRaw ? ' filled' : ' field__input--ghost'}`}
            aria-label="Prix de vente en FCFA"
            aria-invalid={!!errors.prixSortie}
            value={prixSortieRaw}
            onChange={e => setPrixSortieRaw(e.target.value)}
            placeholder="Optionnel"
          />
          <FieldError message={errors.prixSortie} />
        </div>
      )}

      {/* V75-o-a (F-16) — note libre éleveur (contexte / raison). */}
      <div className="field">
        <label className="label--v77" htmlFor="sortie-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="sortie-notes"
          className="field__input"
          style={{ minHeight: 64, resize: 'vertical' }}
          aria-label="Notes ou raison de la sortie"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ex. vendu au voisin Konan, abattage forcé suite à boiterie…"
        />
      </div>
    </QuickActionSheet>
  );
};

export default QuickConfirmSortieForm;
export { QuickConfirmSortieForm };
