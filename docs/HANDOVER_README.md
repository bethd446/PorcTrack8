# HANDOVER — PorcTrack 8
## Manifeste de Déploiement · Destinataire : Hermes (Architecte DevOps)
> Généré le 2026-04-27 · Version app : 8.2.0 (versionCode 10)

---

## Table des matières
1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [État d'avancement](#3-état-davancement)
4. [Intégration Google Apps Script (backend)](#4-intégration-google-apps-script-backend)
5. [Dépendances exactes](#5-dépendances-exactes)
6. [Variables d'environnement requises](#6-variables-denvironnement-requises)
7. [Build & déploiement Android](#7-build--déploiement-android)
8. [Points d'attention pour Hermes](#8-points-dattention-pour-hermes)

---

## 1. Vue d'ensemble

**PorcTrack 8** est une application mobile de gestion technique de troupeau porcin (GTTT), destinée aux éleveurs terrain.

| Attribut | Valeur |
|---|---|
| App ID | `com.porc800.porctrack` |
| Nom affiché | PorcTrack |
| Version | 8.2.0 (build 10) |
| Plateforme cible | Android (minSdk 22 / targetSdk 34) |
| Ferme de référence | A130 — Secteur Nord |
| Rôles utilisateur | `PORCHER` (terrain), `OWNER` (gestion) |

L'application fonctionne **100 % offline-first** : toutes les lectures sont mises en cache local, toutes les écritures passent par une file d'attente persistante (`offlineQueue`) synchronisée vers Google Sheets quand le réseau revient.

---

## 2. Architecture technique

### Stack
| Couche | Technologie | Version |
|---|---|---|
| Framework UI | Ionic + React | 8.8.3 / 19.0.0 |
| Language | TypeScript | 5.8.x |
| Build | Vite | 6.2.x |
| CSS | Tailwind CSS v4 | 4.1.x |
| Mobile | Capacitor | 6.2.x |
| Backend | Google Apps Script | — |
| Dates | date-fns (locale fr) | 4.1.x |
| Icônes | Ionicons + Lucide React | 8.x / 0.546.x |
| Graphiques | Recharts | 3.8.x |
| Router | React Router | 7.14.x |

### Structure `/src`

```
src/
├── App.tsx                     # Router — 17+ routes
├── main.tsx                    # Entry point + initQueue()
├── index.css                   # Design system CSS (tokens, polices, composants)
│
├── context/
│   ├── AuthContext.tsx          # Rôle utilisateur persisté (kvStore)
│   ├── FarmContext.tsx          # Façade publique sur les 3 sous-contextes
│   ├── TroupeauContext.tsx      # Truies, verrats, santé, notes
│   ├── RessourcesContext.tsx    # Aliments, formules, pharmacie, finances
│   ├── PilotageContext.tsx      # Bandes, cycles, saillies, checklist
│   └── ThemeContext.tsx         # Thème clair/sombre (auto-detect)
│
├── services/
│   ├── googleSheets.ts          # Client HTTP GAS (POST uniquement depuis migration sécu 2026-04)
│   ├── offlineQueue.ts          # File d'attente Capacitor Preferences (MAX_TRIES=5)
│   ├── offlineCache.ts          # Cache SWR — TTL 30 s mémoire + localStorage
│   ├── kvStore.ts               # Clé/valeur persistante (Capacitor Preferences)
│   ├── alertEngine.ts           # 6 règles biologiques GTTT
│   ├── performanceAnalyzer.ts   # Score performance truie
│   ├── bandAnalysisEngine.ts    # Analyse bandes
│   ├── rationCalculator.ts      # Calcul rations alimentaires
│   ├── confirmationQueue.ts     # Confirmations MB / actions métier
│   ├── notifications.ts         # Notifications locales (Capacitor)
│   ├── photos.ts                # Capture/stockage photos (Capacitor)
│   ├── exportService.ts         # Export CSV/PDF
│   └── logger.ts                # Logger structuré
│
├── components/
│   ├── PremiumHeader.tsx        # Header gradient vert (slot children)
│   ├── AgritechNavV2.tsx        # Bottom tab bar (4 tabs + FAB)
│   ├── forms/                   # Formulaires rapides (QuickEditTruieForm, QuickPeseeForm, etc.)
│   └── ...                      # Cards, badges, modales, skeletons
│
└── features/
    ├── troupeau/                 # Truies, verrats, loges, bâtiments
    ├── cycles/                   # Bandes, post-sevrage, croissance
    ├── controle/                 # Audit quotidien, sync, checklist
    ├── ressources/               # Aliments, formules, pharmacie, finances
    ├── pilotage/                 # Tableaux de bord analytiques
    ├── notes/                    # Notes terrain
    ├── protocoles/               # SOPs / guides métier
    ├── help/                     # Aide contextuelle
    ├── hubs/                     # Hubs de navigation par domaine
    ├── onboarding/               # Écran de bienvenue / config initiale
    └── tables/                   # Vues données brutes
```

### State management
- **FarmContext** est une façade qui agrège TroupeauContext + RessourcesContext + PilotageContext
- Chaque sous-contexte charge ses données au montage via `farmDataLoader.ts` (appel GAS → cache)
- Les mutations passent **toujours** par `offlineQueue` → jamais d'appel GAS direct en écriture depuis l'UI

### Authentification
- Rôle stocké dans `kvStore` (Capacitor Preferences), lu au boot dans `AuthContext`
- Deux rôles : `PORCHER` (lecture + actions terrain), `OWNER` (toutes routes + admin)
- `ProtectedRoute` wrapper sur les routes OWNER-only

---

## 3. État d'avancement

### Fonctionnel et livré (v8.2.0)
- [x] Dashboard cockpit avec alertes biologiques temps réel
- [x] Fiche détail truie complète (identité, reproduction, santé, actions métier)
- [x] Fiche détail verrat
- [x] Liste truies / verrats avec filtres
- [x] Gestion bandes (cycles, post-sevrage, croissance, loges)
- [x] Module alimentation (formules, rations, plan)
- [x] Module pharmacie (stocks, traitements)
- [x] Module finances (entrées/sorties, analytique)
- [x] Audit quotidien (checklist) + sync manuelle
- [x] File d'attente offline robuste (MAX_TRIES=5, abandon propre)
- [x] Formulaires rapides (QuickEditTruieForm, QuickPeseeForm) intégrés
- [x] Design system « Terrain Vivant » (4 polices, palette verte/ambre)
- [x] Migration sécurité : token GAS dans body POST (plus jamais dans URL)
- [x] Navigation unifiée AgritechNavV2 (doublons supprimés sur 8 vues)
- [x] 216 fichiers TypeScript · 49 fichiers de tests unitaires

### En cours / À faire post-livraison
- [ ] Déploiement du nouveau `doPost` GAS (voir section 4 + `UPDATE_GAS.md`)
- [ ] Suppression `doGet` GAS une fois tous les appareils terrain mis à jour
- [ ] Tests E2E Playwright (infrastructure prête, scénarios à compléter)
- [ ] Notifications push (infrastructure Capacitor en place, token FCM à configurer)
- [ ] `package.json` `"name"` : encore `"react-example"` — à corriger en `"porctrack"` si publish npm

---

## 4. Intégration Google Apps Script (backend)

### Principe général
Le backend est un **Google Apps Script (GAS)** déployé comme Web App, attaché à un Google Sheet (le « classeur ferme »). Il expose un endpoint HTTPS unique.

```
Client (app) ──POST──▶ GAS Web App URL ──▶ Google Sheet
```

### Migration sécurité 2026-04 (IMPORTANT)
Avant cette version, les lectures utilisaient `doGet` avec `?token=...` dans l'URL → le token apparaissait dans les logs serveur, l'historique WebView Android, et les headers Referer.

**Depuis v8.2.0, toutes les requêtes (lectures ET écritures) passent par `doPost`, token dans le body JSON.**

Le fichier `UPDATE_GAS.md` (à la racine du projet) contient le code GAS complet à déployer et la checklist de mise en production.

### Actions supportées par `doPost`

| Action | Type | Description |
|---|---|---|
| `read_table_by_key` | Lecture | Lit une feuille indexée par clé logique |
| `read_sheet` | Lecture | Lit une feuille par nom exact |
| `get_tables_index` | Lecture | Retourne l'index de toutes les feuilles disponibles |
| `update_row_by_id` | Écriture | Met à jour une ligne identifiée par ID |
| `append_row` | Écriture | Ajoute une ligne à une feuille |
| `delete_row_by_id` | Écriture | Supprime une ligne identifiée par ID |

### Tables principales

| Clé logique | Feuille GAS | Contenu |
|---|---|---|
| `SUIVI_TRUIES_REPRODUCTION` | SUIVI_TRUIES_REPRODUCTION | État truies (statut, stade, saillies, MB) |
| `SUIVI_VERRATS` | SUIVI_VERRATS | État verrats |
| `BANDES` | BANDES | Lots / bandes de porcelets |
| `ALIMENTS` | ALIMENTS | Stocks aliments |
| `FORMULES` | FORMULES | Formules alimentaires |
| `PHARMACIE` | PHARMACIE | Stocks médicaments |
| `FINANCES` | FINANCES | Entrées/sorties financières |
| `SAILLIES` | SAILLIES | Historique saillies |
| `NOTES` | NOTES | Notes terrain |
| `ALERTES` | ALERTES | Alertes persistées |

### Authentification GAS
Le token est stocké dans les **Propriétés de script GAS** (jamais en dur dans le code) :
`Projet > Paramètres > Propriétés de script > PORCTRACK_TOKEN`

### Cache client
`googleSheets.ts` maintient un cache mémoire (TTL 30 s) sur toutes les requêtes `readCache: true`. Cela évite les appels GAS redondants lors des navigations rapides.

---

## 5. Dépendances exactes

### Production
```json
"@capacitor/android": "^6.2.1"
"@capacitor/app": "^6.0.3"
"@capacitor/camera": "^6.1.3"
"@capacitor/cli": "^6.2.1"
"@capacitor/core": "^6.2.1"
"@capacitor/filesystem": "^6.0.4"
"@capacitor/local-notifications": "^6.1.3"
"@capacitor/preferences": "^6.0.4"
"@capacitor/splash-screen": "6.0.4"
"@capacitor/status-bar": "^6.0.3"
"@ionic/core": "^8.8.3"
"@ionic/react": "^8.8.3"
"@tailwindcss/vite": "^4.1.14"
"@vitejs/plugin-react": "^5.0.4"
"clsx": "^2.1.1"
"date-fns": "^4.1.0"
"date-fns-tz": "^3.2.0"
"ionicons": "^8.0.13"
"lucide-react": "^0.546.0"
"react": "^19.0.0"
"react-dom": "^19.0.0"
"react-router-dom": "^7.14.0"
"recharts": "^3.8.1"
"tailwind-merge": "^3.5.0"
"vite": "^6.2.0"
```

### Dev (tests, linting, build)
```json
"@eslint/js": "^10.0.1"
"@playwright/test": "^1.59.1"
"@testing-library/dom": "^10.4.1"
"@testing-library/react": "^16.3.2"
"@types/node": "^22.14.0"
"@vitest/ui": "^4.1.4"
"eslint": "^10.2.0"
"eslint-plugin-react-hooks": "^7.1.1"
"jsdom": "^29.0.2"
"typescript": "~5.8.2"
"vitest": "^4.1.4"
```

### Prérequis système
| Outil | Version minimale |
|---|---|
| Node.js | 20 LTS |
| npm | 10+ |
| Java JDK | 17 (requis pour Gradle/Android) |
| Android SDK | API 34 (compileSdk) |
| Android Build Tools | 34.x |

---

## 6. Variables d'environnement requises

Créer un fichier `.env.local` à la racine du projet (non versionné) :

```bash
# PorcTrack 8 — Local/Production Environment
# NE PAS COMMITTER CE FICHIER

# URL de déploiement du script Google Apps Script
VITE_GAS_URL="YOUR_GAS_DEPLOYMENT_URL_HERE"

# Token d'authentification GAS (doit correspondre à PORCTRACK_TOKEN dans les Script Properties)
VITE_GAS_TOKEN="YOUR_GAS_TOKEN_HERE"
```

> **Important :** Le préfixe `VITE_` est obligatoire — Vite expose uniquement les variables préfixées `VITE_` au bundle client. Les vraies valeurs sont transmises séparément (canal sécurisé hors dépôt).

### Obtenir les vraies valeurs
- **`VITE_GAS_URL`** : Ouvrir Google Apps Script → Déploiements → URL du déploiement actif
- **`VITE_GAS_TOKEN`** : Ouvrir Google Apps Script → Paramètres du projet → Propriétés de script → `PORCTRACK_TOKEN`

---

## 7. Build & déploiement Android

### Commandes depuis la racine du projet

```bash
# 1. Installer les dépendances (première fois ou après npm ci)
npm install

# 2. Build web
npm run build

# 3. Synchroniser vers Android
npx cap sync android

# 4a. Ouvrir dans Android Studio (build + signature manuelle)
npx cap open android

# 4b. Ou run direct sur device connecté (USB debug activé)
npx cap run android

# 4c. Ou build APK via Gradle (sans Android Studio)
cd android && ./gradlew assembleDebug   # APK debug
cd android && ./gradlew assembleRelease # APK release (nécessite keystore)
```

> ⚠️ **Toujours lancer ces commandes depuis `/Users/desk/PorcTrack8` (racine), jamais depuis le dossier `android/`.**

### Identité Android
| Champ | Valeur |
|---|---|
| Application ID | `com.porc800.porctrack` |
| versionCode | 10 |
| versionName | 8.2.0 |
| minSdkVersion | 22 (Android 5.1+) |
| targetSdkVersion | 34 (Android 14) |
| compileSdkVersion | 34 |

### Signature release
Le keystore de production n'est pas inclus dans ce dépôt. Pour un build release signé :
1. Placer le fichier `.jks` dans `android/app/`
2. Renseigner `android/keystore.properties` (exclu du dépôt)
3. `cd android && ./gradlew bundleRelease` pour un AAB Google Play

---

## 8. Points d'attention pour Hermes

### 🔴 CRITIQUE — À faire avant première mise en production

**1. Déployer le nouveau `doPost` GAS**
Le client (v8.2.0) envoie toutes ses requêtes en POST. Si le script GAS en production n'a pas encore été mis à jour, **toutes les lectures échoueront** (l'ancienne version n'a que `doGet`). Voir `UPDATE_GAS.md` pour le code complet et la checklist de déploiement.

**2. Configurer les variables d'environnement**
Sans `.env.local` avec les vraies valeurs, l'app ne peut pas contacter le backend. Aucune donnée ne se chargera.

**3. Ne pas committer `.env.local`**
Le fichier `.gitignore` couvre déjà `*.env*`. Vérifier que le pipeline CI/CD injecte les variables via des secrets (GitHub Actions `secrets`, Bitrise env vars, etc.) et non via un fichier committé.

---

### 🟠 IMPORTANT — Architecture à connaître

**4. Flux offline-first**
L'app ne fait jamais de requêtes GAS bloquantes en écriture. Toutes les mutations passent par `offlineQueue` (Capacitor Preferences). Au démarrage de l'app, `initQueue()` est appelé dans `main.tsx` pour charger le cache mémoire. Si Capacitor Preferences est corrompu, `loadQueue()` retourne silencieusement `[]` — les items en attente sont perdus.

**5. CapacitorHttp vs fetch**
`googleSheets.ts` utilise `CapacitorHttp` sur les builds natifs (Android/iOS) et `fetch` sur le web. `CapacitorHttp` est nécessaire pour contourner les restrictions CORS d'Android WebView sur les appels cross-origin vers `script.google.com`. **Ne pas désactiver** `CapacitorHttp: { enabled: true }` dans `capacitor.config.ts`.

**6. Token GAS dans le body, jamais dans l'URL**
Suite à la migration sécurité d'avril 2026, le token est transmis dans le body JSON des requêtes POST. Toute version antérieure du client (< 8.2.0) utilise encore `doGet` avec le token en query string. Le script GAS conserve temporairement les deux handlers (`doPost` + `doGet` legacy) pour assurer la rétrocompatibilité pendant la transition terrain. Supprimer `doGet` seulement quand tous les devices terrain sont sur v8.2.0+.

**7. Permissions Android**
Les permissions déclarées dans `AndroidManifest.xml` sont :
- `INTERNET` — requêtes GAS
- `CAMERA` — photos terrain
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` — export fichiers
- `RECEIVE_BOOT_COMPLETED` — notifications locales (rappels biologiques)
- `POST_NOTIFICATIONS` — Android 13+ (runtime permission demandée à l'UX)

**8. `window.confirm` bloqué sur iOS WebView**
Les dialogs de confirmation utilisent `useIonAlert` (Ionic) plutôt que `window.confirm`. Sur iOS WebView, `window.confirm` est bloqué silencieusement. Tout nouveau dialog de confirmation doit utiliser ce pattern.

---

### 🟡 À SURVEILLER — Dette technique connue

**9. `package.json` name**
Le champ `"name"` est encore `"react-example"` (vestige du scaffolding initial). Sans impact fonctionnel, à corriger en `"porctrack"` si un publish npm est prévu.

**10. 21 `any` implicites**
Un inventaire complet des `any` implicites a été réalisé (voir session de code précédente). Ils sont localisés principalement dans les parseurs de données GAS (`farmDataLoader.ts`) et les handlers d'événements Ionic. Aucun n'est dans un chemin critique, mais ils affaiblissent la couverture TypeScript.

**11. Tests E2E Playwright**
L'infrastructure Playwright est en place (config dans `tests/playwright.config.ts`, 6 suites déclarées). Les tests unitaires Vitest (49 fichiers) passent. Les tests E2E nécessitent un serveur de dev actif (`npm run dev`) et un device ou émulateur Android pour les scénarios Capacitor.

**12. Cache SWR — TTL 30 secondes**
Le cache mémoire de `googleSheets.ts` a un TTL de 30 s. Sur un réseau lent, deux composants montés dans les mêmes 30 s partagent la même promesse (deduplication). Ce comportement est intentionnel mais peut surprendre lors du debug : forcer un rechargement avec `refreshData()` du FarmContext.

---

*Document généré automatiquement par l'agent de développement PorcTrack8 — 2026-04-27*
