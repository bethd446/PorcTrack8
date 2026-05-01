import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, ChevronRight } from 'lucide-react';
import { SectionDivider, Chip } from '../agritech';

export interface SevrageRetard {
  id: string;
  idPortee: string;
  daysLate: number;
}

interface SevragesRetardSectionProps {
  items: SevrageRetard[];
}

const SevragesRetardSection: React.FC<SevragesRetardSectionProps> = ({ items }) => {
  const navigate = useNavigate();
  if (items.length === 0) return null;
  return (
    <section
      aria-label="Sevrages en retard"
      role="alert"
      aria-live="polite"
    >
      <SectionDivider
        label={`⚠ Sevrages en retard · ${items.length}`}
      />
      <ul
        className="card-dense !p-0 overflow-hidden border-l-2 border-l-red"
        aria-label="Liste des sevrages en retard"
      >
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() =>
                navigate(`/troupeau/bandes/${encodeURIComponent(item.id)}`)
              }
              className="pressable flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              aria-label={`Sevrage en retard portée ${item.idPortee}, J+${item.daysLate}`}
            >
              <AlertOctagon
                size={16}
                className="shrink-0"
                aria-hidden="true"
                style={{ color: 'var(--red)' }}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="text-[13px] font-semibold truncate"
                  style={{ color: 'var(--text-0)' }}
                >
                  Sevrage retard ·{' '}
                  <span className="font-mono">{item.idPortee}</span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-text-2">
                  J+{item.daysLate}
                </div>
              </div>
              <Chip label="EN RETARD" tone="red" size="xs" />
              <ChevronRight
                size={14}
                className="shrink-0 text-text-2"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SevragesRetardSection;
