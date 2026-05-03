import React from 'react';
import { TrendingUp, CheckCheck } from 'lucide-react';

const PHASES = [
  { id: 'maternite', label: 'Maternité', min: 0, max: 21 },
  { id: 'sevrage', label: 'Sevrage', min: 21, max: 28 },
  { id: 'post-sevrage', label: 'Post-Sevrage', min: 28, max: 70 },
  { id: 'engraissement', label: 'Engraissement', min: 70, max: 180 },
];

const CycleTimeline: React.FC<{ age: number | null; status: string }> = ({ age, status }) => {
  const currentPhaseIndex = status.toUpperCase().includes('SEVRÉ')
    ? 2
    : PHASES.findIndex(p => age !== null && age >= p.min && age < p.max);
  const activeIndex = currentPhaseIndex === -1 ? (age && age > 180 ? 3 : 0) : currentPhaseIndex;

  return (
    <div className="card-dense">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={14} className="text-accent" />
        <h4 className="kpi-label">Timeline du cycle</h4>
      </div>
      <div className="relative flex justify-between px-1">
        <div className="absolute top-3 left-3 right-3 h-px bg-border" />
        {PHASES.map((phase, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          return (
            <div key={phase.id} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-[160ms] ${
                isCurrent
                  ? 'bg-accent text-bg-0 ring-2 ring-accent/30'
                  : isCompleted
                    ? 'bg-accent-dim text-accent'
                    : 'bg-bg-2 text-text-2 border border-border'
              }`}>
                {isCompleted || isCurrent ? <CheckCheck size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-text-2" />}
              </div>
              <span className={`text-[9px] uppercase tracking-wide text-center w-14 ${
                isCurrent ? 'text-text-0' : 'text-text-2'
              }`}>
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CycleTimeline;
