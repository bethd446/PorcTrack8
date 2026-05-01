import React from 'react';
import { MISE_BAS_BOUNDS } from '../quickMiseBasHelpers';

interface MiseBasPoidsAndNotesBlockProps {
  poidsMoyen: string;
  setPoidsMoyen: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  saving: boolean;
  errors: {
    poidsMoyen?: string;
    notes?: string;
  };
}

const MiseBasPoidsAndNotesBlock: React.FC<MiseBasPoidsAndNotesBlockProps> = ({
  poidsMoyen,
  setPoidsMoyen,
  notes,
  setNotes,
  saving,
  errors,
}) => {
  return (
    <>
      <div className="space-y-1.5">
        <label
          htmlFor="mb-poids"
          className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
        >
          Poids moyen porcelet (kg){' '}
          <span className="text-text-2 normal-case">· optionnel</span>
        </label>
        <input
          id="mb-poids"
          type="number"
          inputMode="decimal"
          min={MISE_BAS_BOUNDS.minPoids}
          max={MISE_BAS_BOUNDS.maxPoids}
          step={0.1}
          aria-label="Poids moyen d'un porcelet en kg (optionnel)"
          aria-invalid={!!errors.poidsMoyen}
          aria-describedby={
            errors.poidsMoyen ? 'mb-poids-error' : 'mb-poids-hint'
          }
          className={[
            'w-full h-12 rounded-md px-3 text-center',
            'bg-bg-0 border text-text-0 placeholder:text-text-2',
            'font-mono text-[16px] tabular-nums',
            'outline-none transition-colors duration-[160ms]',
            'focus:border-accent focus:ring-1 focus:ring-accent',
            errors.poidsMoyen ? 'border-red' : 'border-border hover:border-text-2',
          ].join(' ')}
          placeholder="1.4"
          value={poidsMoyen}
          onChange={e => setPoidsMoyen(e.target.value)}
          disabled={saving}
        />
        {errors.poidsMoyen ? (
          <p
            id="mb-poids-error"
            role="alert"
            className="font-mono text-[11px] text-red"
          >
            {errors.poidsMoyen}
          </p>
        ) : (
          <p
            id="mb-poids-hint"
            className="font-mono text-[10px] text-text-2 tabular-nums"
          >
            {MISE_BAS_BOUNDS.minPoids} à {MISE_BAS_BOUNDS.maxPoids} kg · stocké en Notes
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="mb-notes"
          className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
        >
          Notes <span className="text-text-2 normal-case">· optionnel</span>
        </label>
        <textarea
          id="mb-notes"
          aria-label="Notes de mise-bas (optionnel)"
          aria-invalid={!!errors.notes}
          aria-describedby="mb-notes-hint"
          className={[
            'w-full rounded-md px-3 py-3',
            'bg-bg-0 border text-text-0 placeholder:text-text-2',
            'font-mono text-[12px]',
            'outline-none transition-colors duration-[160ms]',
            'focus:border-accent focus:ring-1 focus:ring-accent',
            'min-h-[88px] resize-y',
            errors.notes ? 'border-red' : 'border-border',
          ].join(' ')}
          placeholder="Ex: MB sans assistance, portée homogène"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
          maxLength={MISE_BAS_BOUNDS.maxNotes}
        />
        <p
          id="mb-notes-hint"
          className="font-mono text-[10px] text-text-2 tabular-nums"
        >
          {notes.length}/{MISE_BAS_BOUNDS.maxNotes}
        </p>
      </div>
    </>
  );
};

export default MiseBasPoidsAndNotesBlock;
