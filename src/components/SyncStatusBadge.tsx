import React, { useEffect, useState } from 'react';
// import { db } from '../services/db/dexieDB';
export function SyncStatusBadge() {
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Mock db call
    setOfflineCount(0);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    }
  }, []);

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest ${
      isOnline ? (offlineCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700') : 'bg-red-100 text-red-700'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-current animate-pulse' : 'bg-red-500'}`} />
      {isOnline ? (offlineCount > 0 ? `Sync: ${offlineCount} pend.` : 'En ligne') : 'Hors-ligne'}
    </div>
  );
}
