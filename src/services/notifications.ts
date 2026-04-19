/**
 * PorcTrack — Notifications Locales Capacitor
 * ═══════════════════════════════════════════
 * Synchronise les alertes GTTT (R1 Mise-bas, R3 Retour chaleur, R5 Stock)
 * vers le système de notifications locales natif (Android/iOS).
 *
 * Stratégie :
 *   - Seules les alertes R1/R3/R5 de priorité CRITIQUE ou HAUTE sont planifiées.
 *   - Programmées à 07:00 le jour "dueDate" (ou immédiat si la date est passée).
 *   - ID de notif = hash stable sur alert.id (positif, int32) — évite les doublons.
 *   - Fallback web : no-op sans plantage (loggé via `logger`).
 */

import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
  type ScheduleResult,
} from '@capacitor/local-notifications';
import type { FarmAlert } from './alertEngine';
import { logger } from './logger';

const SCOPE = 'Notifications';

/** Heure du matin (HH) à laquelle les notifs sont envoyées par défaut. */
const NOTIF_HOUR = 7;

/** Préfixes des IDs d'alerte à notifier (R1, R3, R5). */
const ALERT_PREFIXES_TO_NOTIFY = ['MB', 'CHA', 'STK'] as const;

/** Priorités qui déclenchent une notif système. */
const NOTIFIABLE_PRIORITIES = new Set(['CRITIQUE', 'HAUTE'] as const);

/**
 * Hash stable (djb2 → int32 positif) pour mapper alert.id → notification id.
 * Capacitor exige un integer positif (< 2^31) comme identifiant unique.
 */
function hashId(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

/** Détermine si l'alerte doit déclencher une notif système. */
function shouldNotify(alert: FarmAlert): boolean {
  const prefix = alert.id.split('-')[0];
  if (!ALERT_PREFIXES_TO_NOTIFY.includes(prefix as (typeof ALERT_PREFIXES_TO_NOTIFY)[number])) {
    return false;
  }
  return NOTIFIABLE_PRIORITIES.has(alert.priority as 'CRITIQUE' | 'HAUTE');
}

/**
 * Calcule la date d'envoi : 07:00 le jour de `dueDate` si futur,
 * sinon immédiat (2s dans le futur pour laisser Capacitor programmer).
 */
function scheduledAt(alert: FarmAlert): Date {
  const now = new Date();
  const base = alert.dueDate ? new Date(alert.dueDate) : new Date();
  base.setHours(NOTIF_HOUR, 0, 0, 0);

  if (base.getTime() <= now.getTime()) {
    return new Date(now.getTime() + 2000);
  }
  return base;
}

/**
 * Demande la permission pour les notifications locales.
 * Retourne `true` si accordée, `false` sinon (ou sur plateforme web).
 */
export async function requestPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    logger.info(SCOPE, 'requestPermission skipped (non-native platform)');
    return false;
  }

  try {
    const result = await LocalNotifications.requestPermissions();
    const granted = result.display === 'granted';
    logger.info(SCOPE, `permission ${granted ? 'granted' : 'denied'}`, result);
    return granted;
  } catch (err) {
    console.error(`[${SCOPE}] requestPermission failed`, err);
    return false;
  }
}

/** Annule toutes les notifs locales en attente. */
export async function cancelAll(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length === 0) return;
    await LocalNotifications.cancel({ notifications: pending.notifications });
    logger.debug(SCOPE, `cancelled ${pending.notifications.length} pending notifications`);
  } catch (err) {
    console.error(`[${SCOPE}] cancelAll failed`, err);
  }
}

/**
 * Synchronise les notifications locales avec la liste d'alertes courantes.
 * Annule d'abord toutes les notifs en attente, puis re-planifie celles
 * qui matchent les critères (R1/R3/R5, priorité CRITIQUE/HAUTE).
 */
export async function scheduleFromAlerts(alerts: FarmAlert[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    logger.debug(SCOPE, `scheduleFromAlerts skipped (non-native, ${alerts.length} alerts)`);
    return;
  }

  try {
    await cancelAll();

    const toSchedule: LocalNotificationSchema[] = alerts
      .filter(shouldNotify)
      .map((alert) => {
        const at = scheduledAt(alert);
        return {
          id: hashId(alert.id),
          title: alert.title || 'PorcTrack',
          body: alert.message,
          schedule: { at },
          extra: { alertId: alert.id, priority: alert.priority },
        };
      });

    if (toSchedule.length === 0) {
      logger.info(SCOPE, 'no notifications to schedule');
      return;
    }

    const result: ScheduleResult = await LocalNotifications.schedule({
      notifications: toSchedule,
    });
    logger.info(SCOPE, `scheduled ${result.notifications.length} notifications`);
  } catch (err) {
    console.error(`[${SCOPE}] scheduleFromAlerts failed`, err);
  }
}
