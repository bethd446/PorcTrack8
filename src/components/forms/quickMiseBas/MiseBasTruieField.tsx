import React from 'react';
import { IonSelect, IonSelectOption } from '@ionic/react';
import type { Truie } from '../../../types/farm';

interface MiseBasTruieFieldProps {
  truies: Truie[];
  truieId: string;
  setTruieId: (id: string) => void;
  saving: boolean;
  error?: string;
  selectRef: React.RefObject<HTMLSelectElement>;
  displayTruie: (t: Truie) => string;
}

const MiseBasTruieField: React.FC<MiseBasTruieFieldProps> = ({
  truies,
  truieId,
  setTruieId,
  saving,
  error,
  selectRef,
  displayTruie,
}) => {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="mb-truie"
        className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
      >
        Truie mère <span className="text-red normal-case">· obligatoire</span>
      </label>
      {truies.length > 0 ? (
        <div
          className={[
            'w-full h-12 rounded-md',
            'bg-bg-0 border text-text-0',
            'font-mono text-[12px] uppercase tracking-wide tabular-nums',
            'transition-colors duration-[160ms]',
            'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent',
            error ? 'border-red' : 'border-border',
          ].join(' ')}
        >
          <IonSelect
            id="mb-truie"
            ref={selectRef}
            aria-label="Sélectionner la truie mère"
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? 'mb-truie-error' : undefined}
            className="agritech-select"
            interface="popover"
            placeholder="— Choisir une truie —"
            value={truieId || undefined}
            disabled={saving}
            onIonChange={e => {
              const v = (e.detail.value as string | null | undefined) ?? '';
              setTruieId(v);
            }}
            style={{
              width: '100%',
              minHeight: '3rem',
              paddingInlineStart: '0.75rem',
              paddingInlineEnd: '0.75rem',
              ['--padding-start' as string]: '0',
              ['--padding-end' as string]: '0',
            }}
          >
            {truies.map(t => (
              <IonSelectOption key={t.id} value={t.displayId}>
                {displayTruie(t)}
              </IonSelectOption>
            ))}
          </IonSelect>
        </div>
      ) : (
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">
          Aucune truie éligible (pleine / maternité)
        </p>
      )}
      {error ? (
        <p
          id="mb-truie-error"
          role="alert"
          className="font-mono text-[11px] text-red"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default MiseBasTruieField;
