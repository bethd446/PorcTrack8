/**
 * PilotageContext — slice "pilotage / décisionnel" du FarmContext historique.
 *
 * Regroupe ce qui sert au pilotage : alertes locales (moteur GTTT), alertes
 * serveur (Sheets), saillies actives, finances brutes. C'est la vue
 * "tableau de bord" — ce qu'un chef d'exploitation consulte pour décider.
 *
 * S'abonne à `farmDataLoader` pour le slice `pilotage`. Calcule
 * `criticalAlertCount` en dérivé local.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribe, getSnapshot, type PilotageSnapshot } from '../services/farmDataLoader';

export interface PilotageContextType extends PilotageSnapshot {
  /** Nombre d'alertes nécessitant une action immédiate (CRITIQUE ou HAUTE). */
  criticalAlertCount: number;
}

const PilotageContext = createContext<PilotageContextType | undefined>(undefined);

export const PilotageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snap, setSnap] = useState<PilotageSnapshot>(() => getSnapshot('pilotage'));

  useEffect(() => {
    return subscribe('pilotage', setSnap);
  }, []);

  const criticalAlertCount = useMemo(
    () => snap.alerts.filter(
      a => a.requiresAction && (a.priority === 'CRITIQUE' || a.priority === 'HAUTE')
    ).length,
    [snap.alerts]
  );

  return (
    <PilotageContext.Provider value={{ ...snap, criticalAlertCount }}>
      {children}
    </PilotageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePilotage = (): PilotageContextType => {
  const ctx = useContext(PilotageContext);
  if (!ctx) throw new Error('usePilotage must be used within PilotageProvider');
  return ctx;
};
