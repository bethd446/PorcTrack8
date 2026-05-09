import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

/**
 * V75-r — Notifie l'utilisateur quand un nouveau Service Worker est prêt.
 *
 * Pourquoi : la config Vite PWA a `skipWaiting + clientsClaim + cleanupOutdatedCaches`,
 * donc le SW se met à jour automatiquement en arrière-plan. Mais `cleanupOutdatedCaches`
 * supprime les anciens chunks JS du précache → si l'utilisateur navigue dans la SPA
 * avec un index.html en mémoire qui pointe vers d'anciens chunks, il obtient
 * `Failed to fetch dynamically imported module` (ex `QuickAddVerratForm-yHgFrKxz.js`).
 *
 * Solution : intercepter `needRefresh` et proposer le reload via toast non-bloquant.
 * L'utilisateur peut continuer sa saisie en cours, puis cliquer "Recharger" pour
 * activer la nouvelle version. Évite la perte de données vs reload silencieux auto.
 */
const TOAST_ID = 'pwa-update-prompt';

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: () => {
      // logger non importé ici pour éviter des deps cycles, console suffit
      // eslint-disable-next-line no-console
      console.info('[SW] registered (PwaUpdatePrompt)');
    },
    onRegisterError: (err) => {
      // eslint-disable-next-line no-console
      console.error('[SW] register failed', err);
    },
  });

  React.useEffect(() => {
    if (!needRefresh) return;
    toast('Mise à jour disponible', {
      id: TOAST_ID,
      description: 'Une nouvelle version est prête. Recharge pour l\'activer.',
      action: {
        label: 'Recharger',
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
      duration: Infinity,
      onDismiss: () => setNeedRefresh(false),
    });
    return () => {
      toast.dismiss(TOAST_ID);
    };
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
