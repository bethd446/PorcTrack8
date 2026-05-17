# PorcTrack 8

> Application mobile web Ionic React (Capacitor) de **gestion technique de troupeau porcin (GTTT)**.
> Pensée pour les naisseurs-engraisseurs d'Afrique de l'Ouest. Offline-first, alertes biologiques temps réel.

| | |
|---|---|
| **Production** | https://porctrack.tech (landing + app SPA) |
| **Repo** | https://github.com/bethd446/PorcTrack8 |
| **Stack** | Ionic 8 · React 18 · TypeScript · Vite 6 · Tailwind v4 · Capacitor 6 · Supabase |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| **Déploiement** | GitHub Actions → FTP Hostinger (auto sur push `main`) |
| **Mobile** | Capacitor (APK Android signé dans `releases/`) |

## Démarrage rapide

```bash
git clone https://github.com/bethd446/PorcTrack8
cd PorcTrack8
npm install
cp .env.example .env.local       # remplir les clés Supabase + Marius
npm run dev                       # → http://localhost:5173
```

```bash
npx tsc --noEmit                  # type check
npm run build                     # bundle prod → dist/
npx vitest run                    # 2145 tests unitaires
npm run lint                      # tsc + eslint
```

## Où trouver quoi (entry points)

| Tu cherches | Va voir |
|---|---|
| **Design system canonique** (tokens, palette, typo) | `DESIGN.md` + `src/v70/theme/v70-tokens.css` |
| **Composants UI atomiques V70** | `src/v70/components/ds/` (PageHeader, Card, Pill, Button…) |
| **Composants applicatifs V70** | `src/v70/components/v70/` (BottomNav, DataTable, Dialog…) |
| **Pages / écrans** | `src/v70/pages/` (TodayV70, TroupeauV70, PerformanceV70…) |
| **Router principal** | `src/v70/router/V70Routes.tsx` (utilisé par `src/App.tsx`) |
| **Logique métier GTTT** | `src/services/alertEngine.ts` (16 règles biologiques) |
| **Écritures Supabase** | `src/services/supabaseWrites.ts` + `src/services/repos/*.repo.ts` |
| **State global** | `src/context/` (FarmContext, AuthContext, ToastContext…) |
| **Formulaires d'action terrain** | `src/components/forms/Quick*Form.tsx` (44 forms conformes `FORM_CONTRACT.md`) |
| **Types Supabase** | `src/types/database.types.ts` (généré, ne pas éditer) |
| **Instructions agent IA** | `CLAUDE.md` (à lire en début de toute session Claude) |
| **Mémoire projet** | `.claude/memory/` (learnings, decisions, blockers, journal) |

## Architecture

```
src/
├── v70/                    # 🟢 CANONIQUE — design system + UI V70+
│   ├── theme/              #   tokens --pt-*, palette "Terrain Vivant"
│   ├── components/ds/      #   primitives (Button, Card, Pill…)
│   ├── components/v70/     #   composants applicatifs
│   ├── pages/              #   écrans principaux (5 onglets + sous-routes)
│   └── router/V70Routes.tsx
│
├── components/             # composants partagés + 44 forms d'action
│   └── forms/              # Quick*Form.tsx + FORM_CONTRACT.md
│
├── features/               # vues legacy par domaine (en migration vers v70/)
│   ├── chatbot/            # Marius IA
│   ├── tables/             # CheptelView, BandesView, AlertsView
│   ├── pilotage/           # KPIs, finances, rapports
│   └── ressources/         # aliments, formules, pharmacie
│
├── services/               # logique métier + I/O
│   ├── alertEngine.ts      # 16 règles GTTT biologiques
│   ├── supabaseWrites.ts   # toutes les écritures DB
│   ├── repos/              # repos par domaine (sows, batches, lots…)
│   ├── offlineQueue.ts     # file d'attente PWA offline
│   └── logger.ts           # logger dev-only (strippé en prod)
│
├── context/                # React contexts (Farm, Auth, Toast…)
├── types/                  # types TypeScript (incl. database.types.ts)
├── lib/                    # utilitaires purs
└── App.tsx                 # routeur racine (V70Routes + landing/auth/legal)
```

## Logique métier GTTT — l'essentiel

- **Gestation** : 115 jours (±2) · **Lactation/sevrage** : 28 j · **Retour chaleur post-sevrage** : 3-7 j (médian 5)
- **16 règles d'alerte** dans `src/services/alertEngine.ts` (mise-bas, sevrage, retour chaleur, mortalité, stocks…)
- **Cycle de vie** : naissance → post-sevrage (J28-63) → croissance (J63-100) → engraissement (J100-180) → finition (≥100 kg, sortie ≥110 kg)
- **Ferme de référence** : K13 (Côte d'Ivoire), 17 truies + 2 verrats + 12 bandes actives
- **Devise** : FCFA · **Timezone** : Europe/Paris (compte test)

## Déploiement

Push sur `main` → **GitHub Actions** :
1. `npm ci` + `npm run build`
2. FTP-Deploy-Action push `dist/` vers Hostinger
3. Service worker `service-worker.js` fresh (CDN `no-cache` via `.htaccess`)

Le workflow est dans `.github/workflows/deploy.yml`. Une PR sur `main` déploie automatiquement.

### APK Android
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/
```
APK signés versionnés dans `releases/`.

## Documentation projet

| Fichier | Contenu |
|---|---|
| `README.md` | (ce fichier) — entry point |
| `CLAUDE.md` | Instructions pour agents IA (à lire en premier dans toute session Claude) |
| `DESIGN.md` | Design system "Terrain Vivant" — palette, typo, tokens, composants |
| `.claude/memory/` | Mémoire vivante : learnings, décisions, blockers, journal |
| `.claude/AGENT_CONTRACT.md` | Contrat strict pour sub-agents (anti-hallucination) |
| `src/components/forms/FORM_CONTRACT.md` | Contrat d'uniformité des 44 formulaires |
| `.claude/_archive/` | Documents historiques (migrations V39-V71, audits pré-V70) |

## Variables d'environnement

Toutes les clés sensibles dans `.env.local` (gitignoré). Voir `.env.example` pour la liste complète.

```env
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MARIUS_API_BASE=https://api.porctrack.tech
VITE_MARIUS_API_KEY=...
VITE_MISTRAL_API_KEY=...
```

## Branches

- `main` — production (déployé auto)
- `migration/v71-consolidation` — rollback potentiel V71 → V70

Toute autre branche est éphémère (PR, hotfix). Les branches `v43-*`, `migration/v44-v45-v70` ont été archivées (refonte complète V70+).

## Support

- **Email** : contact@porctrack.tech
- **Issues** : https://github.com/bethd446/PorcTrack8/issues
