import React from 'react';
import { AlertCircle, ChevronRight, CheckCheck } from 'lucide-react';
import { Chip } from '../../../components/agritech';
import { statusTone, type AggregatedBande } from './types';

interface BandeRowProps {
  bande: AggregatedBande;
  isSelected: boolean;
  selectionMode: boolean;
  onClick: () => void;
}

const BandeRow: React.FC<BandeRowProps> = ({ bande, isSelected, selectionMode, onClick }) => {
  const tone = statusTone(bande.status as string | null | undefined);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-dense pressable w-full text-left transition-colors ${
        isSelected ? 'bg-bg-2 outline outline-2 outline-accent outline-offset-[-2px]' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {selectionMode && (
          <div
            className={`mt-1 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-accent border-accent text-bg-0'
                : 'border-border bg-bg-2'
            }`}
            aria-hidden="true"
          >
            {isSelected && <CheckCheck size={12} />}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
              <span className="ft-code text-[14px] font-semibold text-text-0 tabular-nums">
                {bande.id}
              </span>
              {bande.truie ? (
                <>
                  <span className="text-text-2" aria-hidden="true">·</span>
                  <span className="text-[13px] text-text-1 truncate">
                    {String(bande.truie)}
                  </span>
                </>
              ) : null}
              {bande.boucleMere ? (
                <span className="ft-code text-[11px] text-text-2">
                  ({String(bande.boucleMere)})
                </span>
              ) : null}
            </div>
            {bande.status ? (
              <Chip
                label={String(bande.status)}
                tone={tone === 'gold' ? 'gold' : tone === 'accent' ? 'accent' : 'default'}
                size="xs"
              />
            ) : null}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-text-2 flex-wrap">
            {bande.dateMB ? (
              <span>MB&nbsp;{String(bande.dateMB)}</span>
            ) : null}
            {bande.age !== null ? (
              <span className="text-accent">
                {bande.age}j
              </span>
            ) : null}
            <span>
              NV <span className="text-text-0 tabular-nums">{String(bande.nv || 0)}</span>
            </span>
            <span>
              Viv. <span className="text-text-0 tabular-nums">{String(bande.vivants || 0)}</span>
            </span>
            {bande.morts > 0 ? (
              <span className="text-red">
                † {bande.morts}
              </span>
            ) : null}
            {bande.hasAlert && !selectionMode ? (
              <span className="inline-flex items-center gap-1 text-red">
                <AlertCircle size={11} />
                Alerte
              </span>
            ) : null}
          </div>
        </div>

        {!selectionMode && (
          <ChevronRight size={16} className="shrink-0 text-text-2 mt-1" aria-hidden="true" />
        )}
      </div>
    </button>
  );
};

export default BandeRow;
