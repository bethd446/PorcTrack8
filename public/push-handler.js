/**
 * V72 — Service Worker push handler.
 * Importé par workbox via `vite.config.ts` (option `importScripts`).
 *
 * Reçoit les push envoyés par l'Edge Function `send-push` (VAPID) et :
 *   1. Affiche une notification système (background-safe).
 *   2. Au click, ouvre l'URL contextuelle (ex: /alertes/MB-123) ou focus
 *      un onglet existant.
 *
 * Format du payload (cf. supabase/functions/send-push/index.ts) :
 * {
 *   title: string,
 *   body:  string,
 *   icon?: string,
 *   badge?: string,
 *   url?:  string,
 *   category?: 'mise_bas' | 'stocks' | 'cycles_repro' | 'general',
 *   data?: object,
 * }
 *
 * Les notifications sont taguées par `category` pour dédupliquer
 * (Chrome remplace une notif existante avec le même tag → pas de spam
 * si l'Edge envoie plusieurs push de la même catégorie).
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'PorcTrack', body: event.data.text() };
  }

  const title = payload.title || 'PorcTrack';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/images/porc-mark.svg',
    badge: payload.badge || '/images/porc-mark.svg',
    tag: payload.category || undefined,
    data: {
      url: payload.url || '/',
      category: payload.category,
      ...(payload.data || {}),
    },
    // Renotify pour relancer la vibration/son même si tag identique.
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Focus un onglet déjà ouvert sur la même origine si présent.
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            await client.focus();
            // Demande à l'app de naviguer (postMessage) plutôt que recharger.
            client.postMessage({ type: 'PT_NAVIGATE', url: targetUrl });
            return;
          }
        } catch {
          // ignore malformed URLs
        }
      }

      // Sinon ouvre une nouvelle fenêtre.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
