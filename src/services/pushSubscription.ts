/**
 * V72 — Web Push subscription (frontend).
 * ──────────────────────────────────────────
 * S'abonne au PushManager du Service Worker, persiste la souscription
 * dans `public.push_subscriptions` (Supabase) et permet de désactiver.
 *
 * Complément du module `notifications.ts` (notifs locales). Les deux
 * coexistent : `notifications.ts` gère l'affichage immédiat dans l'app,
 * `pushSubscription.ts` gère le canal serveur → Service Worker pour
 * recevoir des push quand l'app est fermée.
 *
 * Pré-requis :
 *   - PWA installée OU onglet ouvert (chrome desktop accepte les deux)
 *   - HTTPS (sauf localhost)
 *   - VAPID public key configurée dans `.env.local` :
 *       VITE_VAPID_PUBLIC_KEY=<base64url>
 *   - Service Worker avec handler `push` (cf. `public/push-handler.js`,
 *     importé via `workbox.importScripts` dans `vite.config.ts`).
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';
import { logger } from './logger';
import { kvGet } from './kvStore';

const SCOPE = 'PushSubscription';
const KV_CURRENT_FARM_ID = 'pt:current_farm_id';

/** Erreurs typées exposées aux composants. */
export class PushSubscriptionError extends Error {
  constructor(
    message: string,
    public code: 'no_vapid_key' | 'unsupported' | 'denied' | 'no_user' | 'subscribe_failed' | 'persist_failed',
  ) {
    super(message);
    this.name = 'PushSubscriptionError';
  }
}

/** Convertit base64url → Uint8Array (format attendu par `applicationServerKey`). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Convertit ArrayBuffer → base64url (sans padding) pour stockage DB. */
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Vrai si l'environnement supporte Web Push (PushManager + SW). */
export function isPushSupported(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/** État courant : true si une `PushSubscription` active existe. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/**
 * S'abonne au PushManager et persiste en DB. Idempotent : si une
 * souscription existe déjà, ne re-souscrit pas mais s'assure qu'elle
 * est bien upsertée en DB (utile après changement de device/cookie).
 *
 * Throws `PushSubscriptionError` si :
 *  - pas de VAPID key configurée
 *  - browser ne supporte pas
 *  - permission refusée
 *  - utilisateur non connecté
 */
export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new PushSubscriptionError(
      'Web Push not supported on this platform',
      'unsupported',
    );
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) {
    throw new PushSubscriptionError(
      'VITE_VAPID_PUBLIC_KEY not configured in .env.local',
      'no_vapid_key',
    );
  }

  if (Notification.permission === 'denied') {
    throw new PushSubscriptionError('Notifications denied', 'denied');
  }

  // Demande la permission si pas encore accordée
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      throw new PushSubscriptionError(
        `Permission ${result}`,
        result === 'denied' ? 'denied' : 'unsupported',
      );
    }
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    } catch (e) {
      logger.warn(SCOPE, 'pushManager.subscribe failed', e);
      throw new PushSubscriptionError(
        e instanceof Error ? e.message : 'subscribe failed',
        'subscribe_failed',
      );
    }
  }

  // Récupère user + farm courants
  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userResp?.user) {
    throw new PushSubscriptionError('User not authenticated', 'no_user');
  }
  const userId = userResp.user.id;
  const farmId = kvGet(KV_CURRENT_FARM_ID) || null;

  const p256dh = sub.getKey('p256dh');
  const auth = sub.getKey('auth');
  if (!p256dh || !auth) {
    throw new PushSubscriptionError(
      'Subscription keys missing (p256dh/auth)',
      'subscribe_failed',
    );
  }

  const { error: upsertErr } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        farm_id: farmId,
        endpoint: sub.endpoint,
        p256dh: arrayBufferToBase64Url(p256dh),
        auth: arrayBufferToBase64Url(auth),
        user_agent:
          typeof navigator !== 'undefined' ? navigator.userAgent : null,
        enabled: true,
      },
      { onConflict: 'endpoint' },
    );

  if (upsertErr) {
    logger.warn(SCOPE, 'upsert push_subscriptions failed', upsertErr);
    throw new PushSubscriptionError(upsertErr.message, 'persist_failed');
  }

  logger.info(SCOPE, 'subscribed to push', { endpoint: sub.endpoint });
  return sub;
}

/**
 * Désabonne du PushManager + marque la ligne DB comme `enabled=false`.
 * Idempotent : si pas de souscription, no-op.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  // Marque enabled=false en DB AVANT le désabonnement (le row est filtré
  // par endpoint qui sera invalidé après unsubscribe).
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ enabled: false })
      .eq('endpoint', sub.endpoint);
    if (error) logger.warn(SCOPE, 'mark disabled failed', error);
  } catch (e) {
    logger.warn(SCOPE, 'update disabled failed', e);
  }

  try {
    await sub.unsubscribe();
    logger.info(SCOPE, 'unsubscribed from push');
  } catch (e) {
    logger.warn(SCOPE, 'unsubscribe failed', e);
  }
}
