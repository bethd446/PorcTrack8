import React, { useState } from 'react';
import { IonToast } from '@ionic/react';
import { ChevronLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getQueueStatus } from '../services/offlineQueue';
import { useNavigate, useLocation } from 'react-router-dom';

interface PremiumHeaderProps {
  title?: string;
  subtitle?: string;
  showStatus?: boolean;
  cibleId?: string;
  module?: string;
  children?: React.ReactNode;
}

const PremiumHeader: React.FC<PremiumHeaderProps> = ({
  title = "PorcTrack",
  subtitle = "Ferme A130 · Terrain",
  showStatus = true,
  children
}) => {
  const { dataSource, criticalAlertCount } = useFarm();
  const navigate = useNavigate();
  const location = useLocation();
  const userName  = localStorage.getItem('user_name') || '';
  const [toast, setToast]     = useState(false);

  const pendingCount = getQueueStatus().pending;
  const showBack = location.pathname !== '/';

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  };

  const isLive = dataSource === 'NETWORK';
  const isCache = dataSource === 'CACHE';

  return (
    <div className="premium-header safe-area-top">

      {/* ── Row 1 : Back + Title + Status badges ────────────────── */}
      <div className="flex items-center justify-between mb-3">

        {/* Left: back + title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center active:scale-[0.95] active:bg-gray-100 transition-transform duration-[160ms] flex-shrink-0 pressable"
              aria-label="Retour"
            >
              <ChevronLeft size={18} className="text-gray-700" />
            </button>
          )}

          <div className="min-w-0">
            <h1
              className="ft-heading text-gray-900 uppercase leading-none truncate"
              style={{ fontSize: 'clamp(24px, 6vw, 32px)', letterSpacing: '0.02em' }}
            >
              {title}
            </h1>
            <p className="text-[12px] text-gray-400 mt-1" style={{ fontFamily: 'InstrumentSans, sans-serif' }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: compact status */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">

          {/* Pending sync */}
          {pendingCount > 0 && (
            <button
              onClick={() => navigate('/sync')}
              className="h-8 px-2.5 rounded-lg bg-amber-100 border border-amber-200 flex items-center gap-1.5 active:scale-[0.95] transition-transform duration-[160ms] pressable"
              aria-label="État de synchronisation"
            >
              <RefreshCw size={12} className="text-amber-500 animate-spin" />
              <span className="ft-code text-[11px] text-amber-500">{pendingCount}</span>
            </button>
          )}

          {/* Critical alerts */}
          {criticalAlertCount > 0 && (
            <button
              onClick={() => navigate('/audit')}
              className="h-8 w-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center relative active:scale-[0.95] transition-transform duration-[160ms] pressable"
              aria-label="Voir l'audit"
            >
              <AlertTriangle size={14} className="text-red-500" />
              <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 flex items-center justify-center px-1">
                <span className="text-[11px] text-white font-bold leading-none">{criticalAlertCount > 9 ? '9+' : criticalAlertCount}</span>
              </div>
            </button>
          )}

          {/* Connection status pill */}
          {showStatus && (
            <div className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 border ${
              isLive
                ? 'bg-accent-50 border-accent-200'
                : isCache
                ? 'bg-amber-100 border-amber-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                isLive ? 'bg-accent-500' : isCache ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className={`ft-code text-[11px] ${
                isLive ? 'text-accent-600' : isCache ? 'text-amber-500' : 'text-red-600'
              }`}>
                {isLive ? 'Live' : isCache ? 'Cache' : 'Offline'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2 : Farm badge (compact) ────────────────────────── */}
      <div className="flex items-center gap-2 bg-accent-50 px-2.5 py-1 rounded-lg border border-accent-200 w-fit">
        <div className="w-2 h-2 rounded-full bg-accent-600 flex-shrink-0" />
        <p className="text-[11px] text-accent-500 font-medium">
          {userName || 'Secteur Nord'} · Ferme A130
        </p>
      </div>

      {/* ── Slot children (tabs, filters…) ──────────────────────── */}
      {children && (
        <div className="mt-3">
          {children}
        </div>
      )}

      <IonToast
        isOpen={toast}
        message="Action terrain enregistrée"
        duration={2000}
        onDidDismiss={() => setToast(false)}
        position="bottom"
      />
    </div>
  );
};

export default PremiumHeader;
