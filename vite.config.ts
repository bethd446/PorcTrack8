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
          // NOTE: `manualChunks` is a function so we can route vendor packages
          // (including transitive deps like d3-*, @stencil/core, motion-dom)
          // into dedicated chunks without having to list each one explicitly.
          // Application-code chunks are still listed in an object-like map at
          // the top for readability.
          manualChunks(id) {
            // ---- Application feature chunks ----
            if (id.includes('/src/features/tables/BandesView')) return 'bandes';
            if (
              id.includes('/src/features/tables/CheptelView') ||
              id.includes('/src/features/tables/AnimalDetailView')
            ) {
              return 'cheptel';
            }
            if (id.includes('/src/features/tables/AlertsView')) return 'alertes';
            if (
              id.includes('/src/features/tables/TableView') ||
              id.includes('/src/features/tables/TableRowEdit')
            ) {
              return 'table-view';
            }
            if (
              id.includes('/src/features/controle/ControleQuotidien') ||
              id.includes('/src/features/controle/ChecklistFlow') ||
              id.includes('/src/features/controle/AuditView') ||
              id.includes('/src/features/controle/SyncView')
            ) {
              return 'feature-controle';
            }

            // ---- Vendor chunks (node_modules only) ----
            if (!id.includes('node_modules')) return undefined;

            // React core (kept as a single chunk — small and always needed)
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react-router/') ||
              id.includes('/node_modules/react-router-dom/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }

            // Ionic — the bulk weight lives in ~265 per-component files under
            // @ionic/core/components/ion-*.js (Stencil-generated web
            // components). Keeping them in a single chunk produces >1 MB, so
            // we bucket them alphabetically into two chunks for better
            // parallel loading + smaller individual files. The runtime /
            // React bindings stay separate.
            //   vendor-ionic-components-a : ion-a* … ion-m*
            //   vendor-ionic-components-n : ion-n* … ion-z*
            //   vendor-ionic-core         : @ionic/core runtime + @stencil/core
            //   vendor-ionic-react        : @ionic/react + @ionic/react-router
            const ionicComponentMatch = id.match(
              /\/node_modules\/@ionic\/core\/components\/ion-([a-z])/,
            );
            if (ionicComponentMatch) {
              const firstLetter = ionicComponentMatch[1];
              return firstLetter < 'n'
                ? 'vendor-ionic-components-a'
                : 'vendor-ionic-components-n';
            }
            if (
              id.includes('/node_modules/@ionic/core') ||
              id.includes('/node_modules/@stencil/core')
            ) {
              return 'vendor-ionic-core';
            }
            if (
              id.includes('/node_modules/@ionic/react') ||
              id.includes('/node_modules/@ionic/react-router')
            ) {
              return 'vendor-ionic-react';
            }

            // Capacitor plugins
            if (id.includes('/node_modules/@capacitor/')) {
              return 'vendor-capacitor';
            }

            // Charts — recharts pulls in many d3-* submodules + victory-vendor.
            // Keep them together in a dedicated chunk so chart-less routes
            // don't pay for them.
            if (
              id.includes('/node_modules/recharts') ||
              id.includes('/node_modules/victory-vendor') ||
              /\/node_modules\/d3-[^/]+\//.test(id)
            ) {
              return 'vendor-recharts';
            }

            // Icons
            if (
              id.includes('/node_modules/lucide-react') ||
              id.includes('/node_modules/ionicons')
            ) {
              return 'vendor-icons';
            }

            // Animation
            if (
              id.includes('/node_modules/motion') ||
              id.includes('/node_modules/motion-dom') ||
              id.includes('/node_modules/motion-utils')
            ) {
              return 'vendor-motion';
            }

            // Small utility libs grouped together
            if (
              id.includes('/node_modules/date-fns') ||
              id.includes('/node_modules/date-fns-tz') ||
              id.includes('/node_modules/clsx') ||
              id.includes('/node_modules/tailwind-merge')
            ) {
              return 'vendor-util';
            }

            // Everything else in node_modules -> generic vendor chunk
            return 'vendor-misc';
          },
        },
      },
      // With the chunking above the largest chunk is ~450 kB (vendor-ionic-core).
      // Keeping the limit at 600 kB to catch regressions early. If a future
      // dependency pushes past this, prefer adding another manual split over
      // raising the threshold.
      chunkSizeWarningLimit: 600,
    },
  };
});
