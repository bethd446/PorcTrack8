import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':      ['react', 'react-dom', 'react-router-dom'],
            'vendor-ionic':      ['@ionic/react', '@ionic/core'],
            'vendor-capacitor':  ['@capacitor/core', '@capacitor/preferences', '@capacitor/app', '@capacitor/camera', '@capacitor/local-notifications', '@capacitor/status-bar'],
            'vendor-dates':      ['date-fns'],
            'vendor-icons':      ['lucide-react', 'ionicons'],
            'bandes':            ['./src/features/tables/BandesView'],
            'cheptel':           ['./src/features/tables/CheptelView', './src/features/tables/AnimalDetailView'],
            'alertes':           ['./src/features/tables/AlertsView'],
            'table-view':        ['./src/features/tables/TableView', './src/features/tables/TableRowEdit'],
            'feature-controle':  [
              './src/features/controle/ControleQuotidien',
              './src/features/controle/ChecklistFlow',
              './src/features/controle/AuditView',
              './src/features/controle/SyncView',
            ],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
