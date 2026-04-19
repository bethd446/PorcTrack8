# PorcTrack 8

Application mobile de Gestion Technique de Troupeau porcin (GTTT).
Pensée pour le travail terrain : audit quotidien, suivi du cheptel, gestion des bandes, alertes biologiques, saisie hors ligne.

## Stack

- Ionic 8 + React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Capacitor (Android / iOS)
- Backend Google Sheets (via Google Apps Script)
- React Context pour le state global
- Recharts, Lucide, Ionicons, date-fns

## Prérequis

- Node.js 20+
- npm 10+
- Android Studio (pour le build natif Android)
- Xcode (pour le build natif iOS, macOS uniquement)
- Un endpoint Google Apps Script déployé (URL + token)

## Setup

```bash
npm install
cp .env.example .env.local
# Éditer .env.local et renseigner :
#   VITE_GAS_URL=https://script.google.com/macros/s/.../exec
#   VITE_GAS_TOKEN=...
npm run dev
```

L'application démarre sur `http://localhost:5173`.

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur Vite en mode développement |
| `npm run build` | Build production (dossier `dist/`) |
| `npm run preview` | Sert le build production localement |
| `npm run lint` | ESLint sur `src/` |
| `npm run test:unit` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests end-to-end |

## Build Capacitor (Android)

```bash
npm run build
npx cap sync android
npx cap run android
```

Pour ouvrir le projet dans Android Studio :

```bash
npx cap open android
```

## Architecture

```
src/
├── components/       Composants réutilisables (Dashboard, PremiumHeader, Navigation, UI kit)
│   └── forms/        Formulaires rapides (saillie, soin, note)
├── features/         Modules métier
│   ├── tables/       Vues données (Cheptel, Bandes, Alertes)
│   ├── controle/     Audit quotidien et checklist
│   ├── protocoles/   Guides métier
│   └── notes/        Notes terrain
├── services/         Intégrations (googleSheets, alertEngine, offlineQueue, offlineCache)
├── context/          State global (FarmContext)
├── App.tsx           Router Ionic
└── main.tsx          Entry point
```

## Règles métier GTTT

Constantes biologiques utilisées par le moteur d'alertes (`src/services/alertEngine.ts`) :

- **Gestation** : 115 jours (±2)
- **Lactation / sevrage** : 21 jours
- **Retour en chaleur post-sevrage** : 5 jours (fenêtre 3 à 7)
- **Seuil mortalité anormale** : > 15 % d'un lot

Six règles d'alerte surveillent mises-bas, sevrages, retours de chaleur, mortalité, ruptures de stock et regroupements de bandes.

## Agent autonome

Ce dépôt est piloté par un agent Claude Code en autonomie. Les conventions, le design system, les patterns de code et les instructions de travail sont décrits dans [`CLAUDE.md`](./CLAUDE.md).
