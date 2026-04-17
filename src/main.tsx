import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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

setupIonicReact();

// ── Initialisation au démarrage ───────────────────────────────────────────────
// Charge la queue offline + le registre des tables depuis Capacitor Preferences
// avant le premier rendu, pour éviter les écrans vides.
Promise.all([
  initQueue(),
  initRegistry(),
]).catch(e => console.warn('[Init]', e));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
