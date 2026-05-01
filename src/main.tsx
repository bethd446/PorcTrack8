import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
}

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
// Migration Sheets → Supabase complète : toutes les lectures et écritures
// passent par Supabase (`supabaseClient.ts` / `supabaseWrites.ts`).
import { FARM_CONFIG } from './config/farm';
import { getSupportWhatsapp, setSupportWhatsapp } from './services/supportContact';

setupIonicReact();

// ── Force le thème jour AVANT le premier rendu (Terrain Vivant v6, light-first).
// L'app n'expose plus de surface dark — quel que soit le mode OS, on reste
// en clair. Voir src/services/themeAuto.ts (mode 'night' désormais no-op).
if (typeof document !== 'undefined') {
  const html = document.documentElement;
  html.classList.add('theme-day');
  html.classList.remove('theme-night');
  html.style.colorScheme = 'light';
}

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

    // Seed du numéro WhatsApp support si non configuré → l'écran Aide est
    // utilisable dès le premier lancement. L'admin peut surcharger dans Réglages.
    if (!getSupportWhatsapp() && FARM_CONFIG.SUPPORT_WHATSAPP_DEFAULT) {
      setSupportWhatsapp(FARM_CONFIG.SUPPORT_WHATSAPP_DEFAULT);
    }
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

// Cache le splash screen une fois l'app rendue
void SplashScreen.hide();
