import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Anti-stale-chunk : après un deploy, l'index.html en mémoire d'un onglet
// ouvert référence des chunks lazy renommés/supprimés côté serveur (ex.
// `QuickAddTruieForm-CVPZLqLG.js` → 404). Vite émet `vite:preloadError`,
// on force un reload du document pour récupérer le nouvel index.html.
// sessionStorage flag = anti-boucle si le bundle distant est vraiment cassé.
if (typeof window !== 'undefined') {
  const RELOAD_KEY = 'pt:chunk-error-reloaded';
  window.addEventListener('vite:preloadError', (event) => {
    if (sessionStorage.getItem(RELOAD_KEY)) {
      // eslint-disable-next-line no-console
      console.error('[PWA] Chunk preload error after reload', event);
      return;
    }
    sessionStorage.setItem(RELOAD_KEY, '1');
    event.preventDefault();
    window.location.reload();
  });
  // Reset après 30s : si l'app a démarré sans crash, l'incident est clos.
  window.setTimeout(() => {
    sessionStorage.removeItem(RELOAD_KEY);
  }, 30000);
}
import { addIcons } from 'ionicons';
import {
  informationCircle,
  checkmarkCircle,
  alertCircle,
  closeCircle,
} from 'ionicons/icons';
import './design-system/tokens/tokens.css';
import './design-system/components/components.css';
import App from './App.tsx';
import './index.css';

addIcons({ informationCircle, checkmarkCircle, alertCircle, closeCircle });
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from './components/ui/sonner';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';

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
import { initQueue, tryFlushIfOnline } from './services/offlineQueue';
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
    // V72 — drainage automatique : si l'app est online au boot et qu'il
    // reste des actions en queue d'une session précédente, on flush. Pas
    // de blocage du rendu (fire-and-forget). Erreurs silencieuses (les
    // listeners online ré-essaieront).
    void tryFlushIfOnline();
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

// V75-r : SW registration + needRefresh toast déplacés dans <PwaUpdatePrompt />
// (component React monté plus bas, qui utilise useRegisterSW de
// virtual:pwa-register/react). Le hook est idempotent — pas de double register
// même si le component remount.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <Toaster richColors position="top-right" />
      <PwaUpdatePrompt />
    </ThemeProvider>
  </StrictMode>,
);

// Cache le splash screen une fois l'app rendue
void SplashScreen.hide();
