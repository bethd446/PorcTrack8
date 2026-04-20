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

## Documentation

Documents de référence (canoniques et à jour) :

- [`docs/sheets-schema.md`](./docs/sheets-schema.md) — Schéma canonique des 10 feuilles Google Sheets (colonnes, types, contraintes, conventions de nommage). Source de vérité du backend.
- [`scripts/data-broker/README.md`](./scripts/data-broker/README.md) — Outil `data-broker` : snapshot live du back Sheets vers JSON local pour debug / audit / tests.
- [`scripts/data-broker/ground-truth-2026-04-20.md`](./scripts/data-broker/ground-truth-2026-04-20.md) — État terrain figé de la ferme K13 au 2026-04-20 (référence pour les tests et la vérification des données).
- [`docs/design-mockups/README.md`](./docs/design-mockups/README.md) — Mockups Claude Design v1 / v2 (écrans cibles, explorations UI/UX).
- [`docs/DATA_FLOW.md`](./docs/DATA_FLOW.md) — Flux de données client ↔ GAS ↔ Sheets, cache offline, queue de synchro.
- [`docs/DESIGN_DIRECTION.md`](./docs/DESIGN_DIRECTION.md) — Direction design (palette, typographie, composants).
- [`CLAUDE.md`](./CLAUDE.md) — Conventions agent, design system, patterns de code, instructions de travail.

## Données ferme K13

Le cheptel de référence (utilisé par les tests, la ground truth et les mockups) :

- **17 truies actives** — IDs non séquentiels : `T01`–`T07`, `T09`–`T16`, `T18`–`T19`.
- **2 verrats** — `V01` (Bobi), `V02` (Aligator).
- **14 portées** suivies, **~150 porcelets** répartis sur 12 bandes actives.
- **Archives / réformées** : `T08`, `T17` — toujours référencées dans l'historique repro mais absentes du cheptel actif. Voir [`src/lib/truieHelpers.ts`](./src/lib/truieHelpers.ts) (`ARCHIVED_TRUIE_IDS`) et [`scripts/data-broker/ground-truth-2026-04-20.md`](./scripts/data-broker/ground-truth-2026-04-20.md) pour la source de vérité.

Ferme : **K13** · Secteur : Nord · Rôles : `PORCHER` (terrain), `ADMIN` (gestion).

## Flows utilisateur clés

Les parcours rapides accessibles depuis l'UI terrain :

| Action | Point d'entrée | Formulaire |
|--------|----------------|-----------|
| **Déclarer mortalité** (porcelets) | `/troupeau/bandes/:bandeId` → bouton « Déclarer mortalité » | [`QuickMortalityForm`](./src/components/forms/QuickMortalityForm.tsx) |
| **Éditer truie** (nom + ration) | `/troupeau/truies/:id` → bouton `Edit3` dans le hero | [`QuickEditTruieForm`](./src/components/forms/QuickEditTruieForm.tsx) |
| **Réapprovisionner stock** | `/ressources` → bouton `+` sur la ligne stock | [`QuickRefillForm`](./src/components/forms/QuickRefillForm.tsx) |
| **Saisie saillie** | Hero truie / formulaire rapide | [`QuickSaillieForm`](./src/components/forms/QuickSaillieForm.tsx) |
| **Journal santé / soin** | `/sante` · détail animal | [`QuickHealthForm`](./src/components/forms/QuickHealthForm.tsx) |
| **Note terrain** | `/more/notes` · formulaire libre | [`QuickNoteForm`](./src/components/forms/QuickNoteForm.tsx) |

**Alerte sevrage en retard** : surfacée automatiquement en haut du Cockpit (`/`) dès qu'une portée dépasse J+21 sans sevrage enregistré. Règles complètes dans `src/services/alertEngine.ts`.

## Architecture

```
src/
├── components/       Composants réutilisables (Dashboard, PremiumHeader, Navigation, UI kit)
│   └── forms/        Formulaires rapides (mortalité, édition truie, refill stock, saillie, soin, note)
├── features/         Modules métier
│   ├── hubs/         Hubs de navigation (Troupeau, Cycles, Ressources, Pilotage)
│   ├── troupeau/     Vues troupeau (truies, bandes, détail animal)
│   ├── tables/       Vues données (Cheptel, Bandes, Alertes)
│   ├── controle/     Audit quotidien et checklist
│   ├── protocoles/   Guides métier
│   └── notes/        Notes terrain
├── services/         Intégrations (googleSheets, alertEngine, offlineQueue, offlineCache)
├── lib/              Helpers purs réutilisables (truieHelpers, truieStatut, utils)
├── context/          State global (FarmContext)
├── App.tsx           Router Ionic
└── main.tsx          Entry point
```

### Helpers libs (`src/lib/`)

Modules purs, sans dépendance Ionic/React, couverts par des tests unitaires :

- [`src/lib/truieHelpers.ts`](./src/lib/truieHelpers.ts) — Identification et normalisation d'IDs truies.
  - `ARCHIVED_TRUIE_IDS` · `ACTIVE_TRUIE_IDS` — listes canoniques ferme K13.
  - `normalizeTruieId(id)` — `T7` / `t08` → `T07` / `T08`.
  - `isArchivedTruie(id)` — détecte les truies réformées (non présentes dans le cheptel actif mais encore dans l'historique repro).
- [`src/lib/truieStatut.ts`](./src/lib/truieStatut.ts) — Normalisation sémantique des statuts truies (feuille Sheet → canonique).
  - `normaliseStatut(raw)` — transforme `"Pleine"`, `"PLEINE"`, `"Gestation"`, `"Allaitante"`, `"À surveiller"`, etc. en un set fermé `TruieStatutCanonique` (`PLEINE`, `MATERNITE`, `VIDE`, `CHALEUR`, `SURVEILLANCE`, `REFORME`, `FLUSHING`, `INCONNU`).
  - `isActive(s)` · `isReproCycle(s)` — prédicats métier pour KPIs et filtres.
  - Règle : tout branchement sur un statut truie passe par `normaliseStatut()`, jamais de regex locale.
- [`src/components/PremiumUI.tsx`](./src/components/PremiumUI.tsx) exporte `getStatusConfig(statut)` — mapping statut → `{ label, tone, icon }` pour l'UI (legacy compat, n'affecte pas la sémantique métier).

## Règles métier GTTT

Constantes biologiques utilisées par le moteur d'alertes (`src/services/alertEngine.ts`) :

- **Gestation** : 115 jours (±2)
- **Lactation / sevrage** : 21 jours
- **Retour en chaleur post-sevrage** : 5 jours (fenêtre 3 à 7)
- **Seuil mortalité anormale** : > 15 % d'un lot

Six règles d'alerte surveillent mises-bas, sevrages, retours de chaleur, mortalité, ruptures de stock et regroupements de bandes.

## Agent autonome

Ce dépôt est piloté par un agent Claude Code en autonomie. Les conventions, le design system, les patterns de code et les instructions de travail sont décrits dans [`CLAUDE.md`](./CLAUDE.md).
