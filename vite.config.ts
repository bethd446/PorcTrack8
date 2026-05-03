import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'PorcTrack 8',
          short_name: 'PorcTrack',
          description:
            'Gestion Technique de Troupeau Porcin — alertes biologiques, suivi des bandes, hors-ligne',
          start_url: '/',
          display: 'standalone',
          background_color: '#f0f4f3',
          theme_color: '#064e3b',
          orientation: 'portrait',
          icons: [
            {
              src: '/images/porc-mark.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // AUDIT-V1 P0-3 : sans ces 2 flags, le nouveau SW reste "waiting"
          // jusqu'à ce que l'utilisateur ferme TOUS les onglets PorcTrack.
          // Conséquence terrain : Christophe voit l'ancien JS pendant des
          // heures après un push (régressions V23 fantômes observées).
          skipWaiting: true,
          clientsClaim: true,
          // AUDIT-V29 P0 : élimine les chunks stale d'anciennes versions
          // qui restaient en cache et causaient "Failed to fetch dynamically
          // imported module" + "expected JS but got text/html" quand l'index
          // référençait des hash de chunks supprimés au build suivant.
          cleanupOutdatedCaches: true,
          // Ne pas servir index.html quand un chunk JS/CSS est demandé →
          // permet au browser de fallback réseau au lieu de servir l'index
          // (qui causait Content-Type: text/html sur des .js inexistants).
          navigateFallbackDenylist: [/^\/assets\//, /\.(js|css|map|woff2|png|svg|ico)$/],
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/jcritwravdwefwqwyjvk\.supabase\.co\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                networkTimeoutSeconds: 10,
                expiration: {maxEntries: 100, maxAgeSeconds: 86400},
              },
            },
            {
              urlPattern: /^https:\/\/api\.porctrack\.tech\/.*/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\.(?:woff2|woff|ttf|eot)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts',
                expiration: {maxEntries: 30, maxAgeSeconds: 31536000},
              },
            },
            {
              urlPattern: /\.(?:png|svg|jpg|jpeg|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {maxEntries: 100, maxAgeSeconds: 2592000},
              },
            },
          ],
        },
      }),
    ],
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
            if (id.includes('/src/features/tables/CheptelView')) {
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
              id.includes('/node_modules/clsx') ||
              id.includes('/node_modules/tailwind-merge') ||
              id.includes('/node_modules/class-variance-authority')
            ) {
              return 'vendor-util';
            }

            if (id.includes('/node_modules/@supabase/')) {
              return 'vendor-supabase';
            }

            // Radix UI primitives (used by shadcn-style components)
            if (id.includes('/node_modules/@radix-ui/')) {
              return 'vendor-radix';
            }

            // Form stack (react-hook-form + resolvers + zod validators)
            if (
              id.includes('/node_modules/react-hook-form') ||
              id.includes('/node_modules/@hookform/') ||
              id.includes('/node_modules/zod/')
            ) {
              return 'vendor-forms';
            }

            // Date pickers + date utilities (heavy locales)
            if (
              id.includes('/node_modules/react-day-picker') ||
              id.includes('/node_modules/date-fns/') ||
              id.includes('/node_modules/date-fns-tz/')
            ) {
              return 'vendor-dates';
            }

            // Command palette
            if (id.includes('/node_modules/cmdk')) {
              return 'vendor-cmdk';
            }

            // Toast notifications
            if (id.includes('/node_modules/sonner')) {
              return 'vendor-toast';
            }

            // TanStack (react-table etc.)
            if (id.includes('/node_modules/@tanstack/')) {
              return 'vendor-tanstack';
            }

            // Everything else in node_modules -> generic vendor chunk
            return 'vendor-misc';
          },
        },
      },
      modulePreload: {
        polyfill: false,
        // Only preload the critical-path chunks the entry HTML actually needs
        // synchronously. Lazy-loaded route chunks (table-view, bandes,
        // feature-controle, cheptel, alertes…) and feature-only vendor
        // chunks (vendor-radix, vendor-forms, vendor-dates, vendor-cmdk,
        // vendor-toast, vendor-tanstack, vendor-misc) are filtered out so
        // they’re only fetched when the corresponding route is visited.
        resolveDependencies: (_filename, deps) => {
          const criticalPattern =
            /(^|\/)(index|vendor-react|vendor-ionic-(core|react|components-[an])|vendor-supabase|vendor-capacitor|vendor-icons|vendor-util)(-[^/]+)?\.(js|css)$/;
          return deps.filter((dep) => criticalPattern.test(dep));
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
