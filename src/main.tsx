import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import { setupIonicReact } from '@ionic/react';
import { initQueue } from './services/offlineQueue';
import { initRegistry } from './features/tables/tablesRegistry';
import { logger } from './services/logger';
import { requestPermission as requestNotifPermission } from './services/notifications';
import { hydrateKvStore, migrateLegacyLocalStorage, kvGet, kvSet } from './services/kvStore';

setupIonicReact();

// ── Initialisation au démarrage ───────────────────────────────────────────────
// 1. Hydrate le KV store (Capacitor Preferences → cache mémoire sync) AVANT
//    tout appel à kvGet depuis les call sites synchrones.
// 2. Migre les clés legacy localStorage → Preferences (one-shot, idempotent).
// 3. Charge la queue offline + le registre des tables depuis Capacitor Preferences
//    avant le premier rendu, pour éviter les écrans vides.
(async () => {
  try {
    await hydrateKvStore();
    await migrateLegacyLocalStorage();
  } catch (e) {
    logger.warn('Init', 'kvStore bootstrap failed', e);
  }
  try {
    await Promise.all([initQueue(), initRegistry()]);
  } catch (e) {
    logger.warn('Init', 'startup init failed', e);
  }
})();

// ── Demande de permission notifications (1 seule fois) ───────────────────────
const NOTIF_PERMISSION_KEY = 'notif_permission_asked';
try {
  if (!kvGet(NOTIF_PERMISSION_KEY)) {
    requestNotifPermission()
      .then(granted => {
        void kvSet(NOTIF_PERMISSION_KEY, granted ? 'granted' : 'denied');
      })
      .catch(e => logger.warn('Init', 'requestNotifPermission failed', e));
  }
} catch (e) {
  logger.warn('Init', 'notif permission bootstrap failed', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
