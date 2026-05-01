import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SectionDivider, DataRow } from '../agritech';
import type { AgendaItem } from './PanelCalendrier';

interface AgendaListProps {
  agenda: AgendaItem[];
  agendaVisible: AgendaItem[];
}

const AgendaList: React.FC<AgendaListProps> = ({ agenda, agendaVisible }) => {
  const navigate = useNavigate();
  return (
    <section aria-label="Agenda 7 jours" role="region">
      <SectionDivider
        label="Agenda 7 jours"
        action={
          agenda.length > agendaVisible.length ? (
            <button
              type="button"
              onClick={() => navigate('/alerts')}
              className="font-mono text-[11px] uppercase tracking-wide text-accent pressable focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded"
            >
              Voir tout
            </button>
          ) : undefined
        }
      />
      {agendaVisible.length === 0 ? (
        <div className="card-dense">
          <p className="font-mono text-[12px] text-text-2">
            Aucune échéance dans les 7 prochains jours.
          </p>
        </div>
      ) : (
        <ul className="card-dense !p-0 overflow-hidden" aria-label="Échéances">
          {agendaVisible.map(item => (
            <li key={item.id}>
              <DataRow
                primary={item.label}
                secondary={
                  item.daysFromNow === 0
                    ? "Aujourd'hui"
                    : item.daysFromNow === 1
                      ? 'Demain'
                      : `Dans ${item.daysFromNow}j`
                }
                meta={`J+${item.daysFromNow}`}
                accessory={
                  <ChevronRight size={14} className="text-text-2" aria-hidden="true" />
                }
                onClick={() => navigate('/alerts')}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AgendaList;
