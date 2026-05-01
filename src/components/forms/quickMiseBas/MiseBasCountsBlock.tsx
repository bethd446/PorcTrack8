import React from 'react';
import { MISE_BAS_BOUNDS } from '../quickMiseBasHelpers';

interface MiseBasCountsBlockProps {
  nesVivants: string;
  setNesVivants: (v: string) => void;
  mortsNes: string;
  setMortsNes: (v: string) => void;
  nesTotaux: string;
  setNesTotaux: (v: string) => void;
  setNesTotauxEditedManually: (v: boolean) => void;
  saving: boolean;
  errors: {
    nesVivants?: string;
    mortsNes?: string;
    nesTotaux?: string;
    coherence?: string;
  };
}

const inputClass = (hasError: boolean): string => [
  'w-full h-14 rounded-md px-3 text-center',
  'bg-bg-0 border text-text-0',
  'font-mono text-[20px] font-bold tabular-nums',
  'outline-none transition-colors duration-[160ms]',
  'focus:border-accent focus:ring-1 focus:ring-accent',
  hasError ? 'border-red' : 'border-border',
].join(' ');

const MiseBasCountsBlock: React.FC<MiseBasCountsBlockProps> = ({
  nesVivants,
  setNesVivants,
  mortsNes,
  setMortsNes,
  nesTotaux,
  setNesTotaux,
  setNesTotauxEditedManually,
  saving,
  errors,
}) => {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <label
            htmlFor="mb-nv"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Nés vivants
          </label>
          <input
            id="mb-nv"
            type="number"
            inputMode="numeric"
            min={MISE_BAS_BOUNDS.minNes}
            max={MISE_BAS_BOUNDS.maxNes}
            step={1}
            aria-label="Nombre de porcelets nés vivants"
            aria-required="true"
            aria-invalid={!!errors.nesVivants}
            aria-describedby={errors.nesVivants ? 'mb-nv-error' : undefined}
            className={inputClass(!!errors.nesVivants)}
            placeholder="0"
            value={nesVivants}
            onChange={e => setNesVivants(e.target.value)}
            disabled={saving}
          />
          {errors.nesVivants ? (
            <p
              id="mb-nv-error"
              role="alert"
              className="font-mono text-[10px] text-red"
            >
              {errors.nesVivants}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="mb-mn"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Morts-nés
          </label>
          <input
            id="mb-mn"
            type="number"
            inputMode="numeric"
            min={MISE_BAS_BOUNDS.minNes}
            max={MISE_BAS_BOUNDS.maxNes}
            step={1}
            aria-label="Nombre de porcelets morts-nés"
            aria-invalid={!!errors.mortsNes}
            aria-describedby={errors.mortsNes ? 'mb-mn-error' : undefined}
            className={inputClass(!!errors.mortsNes)}
            placeholder="0"
            value={mortsNes}
            onChange={e => setMortsNes(e.target.value)}
            disabled={saving}
          />
          {errors.mortsNes ? (
            <p
              id="mb-mn-error"
              role="alert"
              className="font-mono text-[10px] text-red"
            >
              {errors.mortsNes}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="mb-nt"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Nés totaux
          </label>
          <input
            id="mb-nt"
            type="number"
            inputMode="numeric"
            min={0}
            max={MISE_BAS_BOUNDS.maxNesTotaux}
            step={1}
            aria-label="Nombre total de porcelets nés (vivants + morts-nés)"
            aria-invalid={!!errors.nesTotaux}
            aria-describedby={
              errors.nesTotaux ? 'mb-nt-error' : 'mb-nt-hint'
            }
            className={inputClass(!!errors.nesTotaux)}
            placeholder="0"
            value={nesTotaux}
            onChange={e => {
              setNesTotaux(e.target.value);
              setNesTotauxEditedManually(true);
            }}
            disabled={saving}
          />
          {errors.nesTotaux ? (
            <p
              id="mb-nt-error"
              role="alert"
              className="font-mono text-[10px] text-red"
            >
              {errors.nesTotaux}
            </p>
          ) : (
            <p
              id="mb-nt-hint"
              className="font-mono text-[9px] text-text-2 tabular-nums"
            >
              = vivants + morts-nés
            </p>
          )}
        </div>
      </div>

      {errors.coherence ? (
        <p role="alert" className="font-mono text-[11px] text-red">
          {errors.coherence}
        </p>
      ) : null}
    </>
  );
};

export default MiseBasCountsBlock;
