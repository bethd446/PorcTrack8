import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { getQueueLength, hasFailedSync } from '../services/offlineQueue';

/**
 * Badge d'état de synchronisation (SyncStatusBadge)
 * ────────────────────────────────────────────────
 * Affiche l'état de la file d'attente offline dans le header.
 * - Gris : Tout est synchronisé (ou offline propre)
 * - Orange : Synchronisation en cours ou éléments en attente
 * - Rouge : Échec de synchronisation (nécessite action utilisateur)
 */
const SyncStatusBadge: React.FC = () => {
  const navigate = useNavigate();
  const pendingCount = getQueueLength();
  const hasError = hasFailedSync();

  if (hasError) {
    return (
      <div
        onClick={() => navigate('/sync')}
        className="h-6 px-2 rounded-full border flex items-center gap-1.5 animate-pulse cursor-pointer flex-shrink-0"
        style={{ background: 'color-mix(in srgb, var(--color-danger, #EF4444) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--color-danger, #EF4444) 24%, transparent)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-danger, #EF4444)' }} />
        <span className="ft-code text-[10px] uppercase font-bold" style={{ color: 'var(--color-danger, #EF4444)' }}>Échec</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        onClick={() => navigate('/sync')}
        className="h-6 px-2 rounded-full border flex items-center gap-1.5 cursor-pointer flex-shrink-0"
        style={{ background: 'var(--amber-pork-soft)', borderColor: 'color-mix(in srgb, var(--amber-pork) 30%, transparent)' }}
      >
        <RefreshCw size={10} className="animate-spin" style={{ color: 'var(--amber-pork)' }} />
        <span className="ft-code text-[10px] font-bold" style={{ color: 'var(--amber-pork-deep)' }}>{pendingCount} en attente</span>
      </div>
    );
  }

  return (
    <div className="h-6 px-2 rounded-full border flex items-center gap-1.5 opacity-60 flex-shrink-0" style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--line)' }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--muted)' }} />
      <span className="ft-code text-[10px] uppercase" style={{ color: 'var(--ink-soft)' }}>Sync</span>
    </div>
  );
};

export default SyncStatusBadge;
