import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Settings } from 'lucide-react';
import { FARM_CONFIG } from '../../config/farm';

interface CockpitHeaderProps {
  userFirstName: string;
  headerDate: string;
  headerTime: string;
}

const CockpitHeader: React.FC<CockpitHeaderProps> = ({ userFirstName, headerDate, headerTime }) => {
  const navigate = useNavigate();
  return (
    <header
      className="px-4 pt-4 pb-3 bg-bg-0 border-b border-border"
      role="banner"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="ft-heading truncate"
            style={{
              fontFamily: 'BigShoulders, system-ui, sans-serif',
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Bonjour, {userFirstName}
          </h1>
          <p
            className="mt-1 leading-none"
            style={{
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              letterSpacing: '0.06em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
            }}
          >
            {headerDate} · {headerTime} · {FARM_CONFIG.FARM_NAME}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/aide')}
            aria-label="Aide"
            className="pressable inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-1 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <HelpCircle size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/more')}
            aria-label="Ouvrir les réglages"
            className="pressable inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-2 hover:text-text-0 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default CockpitHeader;
