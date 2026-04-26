import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { getQueueLength, hasFailedSync } from '../services/offlineQueue';

/**
 * Badge d'état de synchronisation (SyncStatusBadge)
 * ────────────────────────────────────────────────
 * Affiche l'état de la file d'attente offline dans le PremiumHeader.
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
        className="h-6 px-2 rounded-full bg-red-100 border border-red-200 flex items-center gap-1.5 animate-pulse cursor-pointer flex-shrink-0"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span className="ft-code text-[10px] text-red-600 uppercase font-bold">Échec</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        onClick={() => navigate('/sync')}
        className="h-6 px-2 rounded-full bg-amber-100 border border-amber-200 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
      >
        <RefreshCw size={10} className="text-amber-500 animate-spin" />
        <span className="ft-code text-[10px] text-amber-600 font-bold">{pendingCount} en attente</span>
      </div>
    );
  }

  return (
    <div className="h-6 px-2 rounded-full bg-gray-100 border border-gray-200 flex items-center gap-1.5 opacity-60 flex-shrink-0">
      <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      <span className="ft-code text-[10px] text-gray-500 uppercase">Sync</span>
    </div>
  );
};

export default SyncStatusBadge;
