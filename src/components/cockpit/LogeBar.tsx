import React from 'react';

interface LogeBarProps {
  label: string;
  occupees: number;
  capacite: number;
  alerte: 'OK' | 'HIGH' | 'FULL';
}

const LogeBar: React.FC<LogeBarProps> = ({ label, occupees, capacite, alerte }) => {
  const pct = capacite > 0 ? Math.min(100, Math.round((occupees / capacite) * 100)) : 0;
  const fillClass =
    alerte === 'FULL' ? 'bg-red' : alerte === 'HIGH' ? 'bg-amber' : 'bg-accent';
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="kpi-label">{label}</span>
        <span className="font-mono text-[11px] text-text-1 tabular-nums">
          {String(occupees).padStart(2, '0')} / {String(capacite).padStart(2, '0')}
        </span>
      </div>
      <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden">
        <div
          className={`h-full w-full ${fillClass} rounded-full transition-transform`}
          style={{ transform: `scaleX(${pct / 100})`, transformOrigin: 'left' }}
        />
      </div>
    </div>
  );
};

export default LogeBar;
