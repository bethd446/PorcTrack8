# PorcTrack 8 — Monorepo Agritech

> Solution de gestion technique de troupeau porcin (GTTT). Offline-first · Supabase · Android.

---

## Architecture du monorepo

```
PorcTrack8/
├── website/        → Site vitrine SaaS (Vite + CSS)
│   ├── src/        → Sources (index.html, style.css, main.js)
│   ├── dist/       → Build de production (déployé sur porctrack.tech)
│   └── scripts/    → deploy.sh (rsync → VPS)
│
├── shared/         → Types TypeScript partagés app ↔ website
│   └── types/      → Entités Supabase, GTTT, rôles
│
├── src/            → Application Ionic/React (source)
├── android/        → Projet Capacitor Android
├── releases/       → APK signés (.apk)
└── nginx.conf      → Config nginx VPS (subdomains)
```

### Subdomains en production
| Subdomain | Source | Usage |
|-----------|--------|-------|
| `porctrack.tech` | `website/dist/` | Site vitrine marketing |
| `app.porctrack.tech` | `dist/` | Application React SPA |

---

## Stack technique

| Couche | Tech |
|--------|------|
| App mobile | Ionic 8 + React 19 + TypeScript |
| Build app | Vite 6 + Tailwind CSS v4 |
| Mobile | Capacitor 6 (Android, iOS à venir) |
| Website | Vite 6 + CSS natif (zéro framework) |
| Auth | Supabase Auth (JWT, RBAC) |
| Base de données | Supabase (PostgreSQL + Realtime) |
| Déploiement | VPS Hostinger + Nginx |

---

## Développement local

### Site vitrine (`/website`)
```bash
cd website
npm install
npm run dev      # → http://localhost:5174
npm run build    # → website/dist/
```

### Application React (racine)
```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/
npx tsc --noEmit # type check
```

---

## Déploiement

### Site vitrine → porctrack.tech

**Option A — Script automatique (rsync SSH) :**
```bash
cd website
export DEPLOY_HOST=YOUR_VPS_IP
npm run deploy
```

**Option B — Manuel depuis le VPS :**
```bash
git pull origin main
cp -r website/dist/* /usr/share/nginx/html/website/
nginx -s reload
```

### Application → app.porctrack.tech
```bash
npm run build
# Sur VPS :
cp -r dist/* /usr/share/nginx/html/app/
nginx -s reload
```

---

## Configuration Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/porctrack
sudo ln -sf /etc/nginx/sites-available/porctrack /etc/nginx/sites-enabled/porctrack
sudo nginx -t && sudo systemctl reload nginx

# SSL Let's Encrypt
sudo certbot --nginx -d porctrack.tech -d www.porctrack.tech -d app.porctrack.tech
```

### DNS Hostinger requis

| Type | Nom | Valeur |
|------|-----|--------|
| A | `@` | `YOUR_VPS_IP` |
| A | `www` | `YOUR_VPS_IP` |
| A | `app` | `YOUR_VPS_IP` |

---

## Variables d'environnement

### App (`/.env.local`)
```env
VITE_GAS_URL=https://script.google.com/...
VITE_GAS_TOKEN=PORC800_...
VITE_SUPABASE_URL=https://jcritwravdwefwqwyjvk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Website (`/website/.env`)
```env
VITE_SUPABASE_URL=https://jcritwravdwefwqwyjvk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
DEPLOY_HOST=YOUR_VPS_IP
```

> ⚠️ Ces fichiers sont dans `.gitignore`. Ne jamais les committer.

---

## Build Android (APK)
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleRelease
```

---

## Types partagés (`/shared`)
```ts
import type { Truie, Bande, BiologicalAlert, GTTT_CONSTANTS } from './shared/types';
```

---

## Liens
- **Repo** : https://github.com/bethd446/PorcTrack8
- **Site** : https://porctrack.tech
- **App** : https://app.porctrack.tech
- **Support** : support@porctrack.fr
