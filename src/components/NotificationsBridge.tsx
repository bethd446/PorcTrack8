/**
 * V72 — Pont alertes ↔ notifications PWA Web.
 *
 * Composant invisible qui observe `FarmContext.alerts` et déclenche
 * `notifyCriticalAlerts()` à chaque mise à jour de la liste. Sur native
 * Capacitor, no-op (LocalNotifications est déjà câblé via farmDataLoader).
 *
 * Monté dans `AppShell` pour ne s'exécuter qu'une fois la session
 * authentifiée et `FarmProvider` initialisé.
 */
import React, { useEffect } from 'react';
import { useFarm } from '../context/FarmContext';
import { notifyCriticalAlerts } from '../services/notifications';
import { logger } from '../services/logger';

export const NotificationsBridge: React.FC = () => {
  const { alerts } = useFarm();

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    notifyCriticalAlerts(alerts).catch((e) =>
      logger.warn('NotificationsBridge', 'notifyCriticalAlerts failed', e),
    );
  }, [alerts]);

  return null;
};

export default NotificationsBridge;
