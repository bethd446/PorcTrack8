import React from 'react';

interface MiseBasIdAndDateBlockProps {
  idPortee: string;
  setIdPortee: (v: string) => void;
  setIdPorteeEditedManually: (v: boolean) => void;
  truieId: string;
  dateIso: string;
  setDateIso: (v: string) => void;
  heure: string;
  setHeure: (v: string) => void;
  saving: boolean;
  errorIdPortee?: string;
}

const MiseBasIdAndDateBlock: React.FC<MiseBasIdAndDateBlockProps> = ({
  idPortee,
  setIdPortee,
  setIdPorteeEditedManually,
  truieId,
  dateIso,
  setDateIso,
  heure,
  setHeure,
  saving,
  errorIdPortee,
}) => {
  return (
    <>
      <div className="space-y-1.5">
        <label
          htmlFor="mb-id-portee"
          className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
        >
          ID portée <span className="text-text-2 normal-case">· auto-suggéré</span>
        </label>
        <input
          id="mb-id-portee"
          type="text"
          maxLength={20}
          autoCapitalize="characters"
          aria-label="Identifiant de la portée (auto-suggéré)"
          aria-required="true"
          aria-invalid={!!errorIdPortee}
          aria-describedby={
            errorIdPortee ? 'mb-id-portee-error' : 'mb-id-portee-hint'
          }
          className={[
            'w-full h-12 rounded-md px-3',
            'bg-bg-0 border text-text-0 placeholder:text-text-2',
            'font-mono text-[14px] uppercase tabular-nums',
            'outline-none transition-colors duration-[160ms]',
            'focus:border-accent focus:ring-1 focus:ring-accent',
            errorIdPortee ? 'border-red' : 'border-border hover:border-text-2',
          ].join(' ')}
          placeholder="26-T7-01"
          value={idPortee}
          onChange={e => {
            setIdPortee(e.target.value);
            setIdPorteeEditedManually(true);
          }}
          disabled={saving || !truieId}
          autoComplete="off"
        />
        {errorIdPortee ? (
          <p
            id="mb-id-portee-error"
            role="alert"
            className="font-mono text-[11px] text-red"
          >
            {errorIdPortee}
          </p>
        ) : (
          <p
            id="mb-id-portee-hint"
            className="font-mono text-[10px] text-text-2 tabular-nums"
          >
            Format YY-T{'{N}'}-SEQ (ex: 26-T7-01)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label
            htmlFor="mb-date"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Date MB
          </label>
          <input
            id="mb-date"
            type="date"
            aria-label="Date de mise-bas"
            className="w-full h-12 rounded-md px-3 bg-bg-0 border border-border text-text-0 font-mono text-[13px] tabular-nums outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            value={dateIso}
            onChange={e => setDateIso(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="mb-heure"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Heure
          </label>
          <input
            id="mb-heure"
            type="time"
            aria-label="Heure de mise-bas"
            className="w-full h-12 rounded-md px-3 bg-bg-0 border border-border text-text-0 font-mono text-[13px] tabular-nums outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            value={heure}
            onChange={e => setHeure(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
    </>
  );
};

export default MiseBasIdAndDateBlock;
