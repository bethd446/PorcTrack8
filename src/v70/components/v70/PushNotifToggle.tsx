/**
 * V72 — Toggle "Notifications app fermée" (Web Push VAPID).
 *
 * Au-dessus des switches catégories (qui ne s'appliquent que si l'app
 * est ouverte), ce toggle active/désactive la souscription PushManager
 * persistée en DB. Une fois actif, l'Edge Function `send-push` peut
 * envoyer des notifs même quand le navigateur est fermé (Android Chrome
 * PWA, desktop Chrome avec sync cloud Push).
 *
 * États :
 *   - unsupported : iOS Safari hors PWA, browser ancien → masqué
 *   - denied      : permission refusée → texte d'aide vers réglages
 *   - default     : toggle off, click → demande permission + souscrit
 *   - granted     : reflète isPushSubscribed() ; toggle bascule sub/unsub
 *
 * Strict DNA V70 : tokens --pt-*, fonts variables CSS, pas de Tailwind.
 */
import React, { useEffect, useState } from 'react';
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  PushSubscriptionError,
} from '../../../services/pushSubscription';
import { logger } from '../../../services/logger';

const SCOPE = 'PushNotifToggle';

export const PushNotifToggle: React.FC = () => {
  const supported = isPushSupported();
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Lit l'état initial au mount.
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void (async () => {
      const sub = await isPushSubscribed();
      if (!cancelled) setSubscribed(sub);
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  if (!supported) {
    // L'autre composant NotifCategoriesSwitches affiche déjà le message
    // "browser non supporté", on ne duplique pas.
    return null;
  }

  const handleToggle = async (next: boolean) => {
    setLoading(true);
    setError(null);
    try {
      if (next) {
        await subscribeToPush();
        setSubscribed(true);
      } else {
        await unsubscribeFromPush();
        setSubscribed(false);
      }
    } catch (e) {
      const msg =
        e instanceof PushSubscriptionError
          ? mapErrorMessage(e.code)
          : e instanceof Error
            ? e.message
            : 'Erreur inconnue';
      logger.warn(SCOPE, 'toggle failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          minHeight: 60,
          padding: '14px 4px',
          borderBottom: '1px solid var(--pt-line)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily:
                'var(--pt-font-display, "BigShouldersDisplay", system-ui, sans-serif)',
              fontWeight: 700,
              fontSize: 16,
              lineHeight: 1.2,
              color: 'var(--pt-ink)',
            }}
          >
            Notifications app fermée
          </div>
          <div
            style={{
              fontFamily:
                'var(--pt-font-body, "InstrumentSans", system-ui, sans-serif)',
              fontSize: 12,
              lineHeight: 1.35,
              color: 'var(--pt-muted)',
              marginTop: 2,
            }}
          >
            {subscribed
              ? 'Activé · ce device recevra les alertes critiques même app fermée.'
              : 'Recevoir les alertes critiques même quand l\'app est fermée (PWA / Android Chrome).'}
          </div>
        </div>
        <input
          type="checkbox"
          role="switch"
          aria-label="Notifications app fermée"
          aria-checked={subscribed}
          checked={subscribed}
          disabled={loading}
          onChange={(e) => void handleToggle(e.target.checked)}
          style={{
            transform: 'scale(1.4)',
            cursor: loading ? 'wait' : 'pointer',
          }}
        />
      </div>
      {error && (
        <div
          style={{
            padding: '8px 12px',
            marginTop: 8,
            background: 'rgba(164,69,61,0.06)',
            border: '1px solid rgba(164,69,61,0.2)',
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--pt-danger)',
            fontFamily:
              'var(--pt-font-body, "InstrumentSans", system-ui, sans-serif)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

function mapErrorMessage(code: PushSubscriptionError['code']): string {
  switch (code) {
    case 'no_vapid_key':
      return 'Clé VAPID non configurée — contactez le support.';
    case 'unsupported':
      return 'Ce navigateur ne supporte pas les notifications push.';
    case 'denied':
      return 'Notifications refusées. Ouvre les réglages du navigateur pour autoriser.';
    case 'no_user':
      return 'Tu dois être connecté pour activer les push.';
    case 'subscribe_failed':
      return 'Échec de l\'abonnement push. Réessaie ou recharge la page.';
    case 'persist_failed':
      return 'Souscription créée mais non sauvegardée. Vérifie ta connexion.';
    default:
      return 'Erreur inconnue.';
  }
}

export default PushNotifToggle;
