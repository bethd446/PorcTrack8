import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, ChevronRight } from 'lucide-react';

interface CriticalAlertStripProps {
  alert: { label: string; description?: string; kind: 'LOCAL' | 'SERVER' } | null;
}

const CriticalAlertStrip: React.FC<CriticalAlertStripProps> = ({ alert }) => {
  const navigate = useNavigate();
  if (!alert) return null;
  return (
    <button
      type="button"
      onClick={() => navigate('/alerts')}
      role="alert"
      aria-label={`Alerte critique : ${alert.label}`}
      className="card-dense pressable flex w-full items-start gap-3 text-left border-l-2 border-l-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      <AlertOctagon
        size={18}
        className="mt-0.5 shrink-0 text-red"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="kpi-label text-red">Alerte critique</div>
        <div className="mt-1 text-[14px] font-semibold text-text-0 truncate">
          {alert.label}
        </div>
        {alert.description ? (
          <div className="mt-0.5 font-mono text-[11px] text-text-2 line-clamp-2">
            {alert.description}
          </div>
        ) : null}
      </div>
      <ChevronRight size={16} className="shrink-0 text-text-2 mt-1" aria-hidden="true" />
    </button>
  );
};

export default CriticalAlertStrip;
