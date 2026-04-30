# Agent Quick Reference — PorcTrack 8

> Charge ce fichier au démarrage de toute session pour avoir le contexte projet condensé.
> Date : 2026-04-30 — voir `docs/SPEC_PARITY_WEB_APP.md` pour la spec complète.

## Identité

PorcTrack 8 — Application Ionic React (Capacitor) de gestion technique de troupeau porcin (GTTT). Single-page React → web (porctrack.tech) + Android (Capacitor). Backend Supabase. Single-tenant per user (`farm_id = auth.uid()`).

## Stack

- **UI** : Ionic 8 + React 19 + Vite 6 + Tailwind v4 + TypeScript strict
- **Mobile** : Capacitor 6
- **Backend** : Supabase (eu-west-3, projet `jcritwravdwefwqwyjvk`)
- **Auth** : Supabase Auth (magic link + password) + RLS isolation par `farm_id`
- **Persistance native** : kvStore (Capacitor Preferences) — JAMAIS `localStorage`
- **Tests** : Vitest (`*.test.ts(x)`) + Playwright (`tests/e2e/`)

## Conventions non-négociables

```
DESIGN
  Tokens canonique : src/index.css (--color-accent-500 = #2d5a1b Terrain Vivant)
  INTERDIT hardcoded : #10B981, #059669, #064e3b
  Typo : .ft-heading (BigShoulders), body InstrumentSans, .ft-values BricolageGrotesque, .ft-code DMMono
  Touch targets ≥ 44×44 px
  Animations Emil : cubic-bezier(0.23,1,0.32,1) + scale(0.97) 160ms · INTERDIT transition-all, ease-in
  FR text only · Lucide React icons (zéro emoji UI)

CODE
  Read avant Edit toujours
  Pas de localStorage direct (kvStore)
  Pas de style={{ color: '#...' }} inline
  Pas de -mt-N négative pour positionner sous header (slot children)
  SyncStatusBadge = default import (pas named)
  window.confirm bloqué iOS WebView → useIonAlert
  status (sans accent) ≠ statut (avec accent) selon contexte
  Tests `*.test.ts(x)` à côté des sources

WORKFLOW
  Mode autonome : ne pas demander confirmation pour sous-étapes techniques
  Boucle Read → Edit → tsc --noEmit → npm run build → fix → continue
  TodoWrite pour 3+ étapes
  Sous-agents pour exploration ou parallélisation
```

## Domaines / sub-agents

```
.claude/agents/
├── dev-troupeau          → src/features/troupeau/* + CheptelView + BandesView + TroupeauContext
├── dev-cycles            → src/features/cycles/* + alertEngine + bandesAggregator
├── dev-ressources        → src/features/ressources/* + features/pilotage/finances + RessourcesContext
├── qa-runner             → tsc + lint + tests + build + audit Emil
├── designer-pilot        → composants visuels avec tokens Terrain Vivant
├── supabase-ops          → DDL/RLS via PAT + Management API
├── excel-importer        → migration data Excel → SQL
├── chatbot-builder       → smart chatbot sans API LLM
└── deploy-pilot          → build + rsync SSH Hostinger + smoke tests
```

Plus globaux : `code-reviewer`, `security-reviewer`, `debugger`.

## Accès Supabase (via .env.local)

```
URL  : https://jcritwravdwefwqwyjvk.supabase.co
PAT  : SUPABASE_ACCESS_TOKEN (Management API DDL/RLS)
ANON : VITE_SUPABASE_ANON_KEY (client REST + auth)
SQL  : POST https://api.supabase.com/v1/projects/jcritwravdwefwqwyjvk/database/query
       Body : { "query": "SELECT ..." }
       Header : Authorization: Bearer $SUPABASE_ACCESS_TOKEN

User admin existant : bc96ddbd-c34d-46b1-b624-4a3dca181a2c
                     contact@liegeoischristophe.com — role=ADMIN
                     ferme : 'Ferme Liegois Christophe' (Principal)
```

## Schéma Supabase (15 tables, RLS partout)

Single-tenant : `profiles.id` = `auth.users.id` = `farm_id` sur les autres.

| Table | Rôle |
|---|---|
| `profiles` | Compte utilisateur (id, email, full_name, role) |
| `troupeaux` | Ferme (label visible) — user_id |
| `sows` | Truies (T01-T19) — code_id, name, boucle, statut, date_mb_prevue, ration_kg_j |
| `boars` | Verrats (V01-V02) |
| `saillies` | Accouplements (sow_id, boar_id, date_saillie, date_mb_prevue, statut) |
| `batches` | Portées (26-T7-01) — sow_id, date_mise_bas, porcelets_nes_vivants, nb_mort_nes, date_sevrage_prevue, loge, phase |
| `bandes` | Groupes legacy (troupeau_id) |
| `health_logs` | Journal soins (animal_reference, log_type, treatment, dose, result) |
| `notes` | Notes terrain (category, content, author_id) |
| `produits_aliments` | Stock aliments (libelle, stock_actuel, seuil_alerte) |
| `produits_veto` | Stock médicaments |
| `feed_inventory`, `vet_inventory` | Mouvements |
| `plan_alimentation` | Plan ration par catégorie |
| `finances` | Postes coûts (poste, mensuel_fcfa, type=Variable/Fixe/Semi-fixe) |
| `admin_logs` | Audit trail |

**Trigger `handle_new_user`** : sur `auth.users` INSERT → crée `profiles` (role='OWNER') + `troupeaux` vide.

## Constantes biologiques GTTT

```
Gestation        115 jours (±2)
Lactation        28 jours
Retour chaleur   3-7 jours post-sevrage
Post-sevrage     70 jours
Engraissement    90 jours
Vente            90 kg vif
Mortalité seuil  >15% du lot → R4 CRITIQUE
Prix             2000-2200 FCFA/kg vif · porcelet sevré 25k FCFA
```

## 14 règles d'alerte (alertEngine)

R1 Mise-Bas · R2 Sevrage · R3 Retour Chaleur · R4 Mortalité · R5 Stock · R6 Regroupement · R7 Échographie · R8 Re-Saillie · R9 Retard Phase · R10 Surdensité · R11 Réforme Perf · R12 Réforme Inact · R13 Manque Pesée · R14 Portée Orpheline

## Constantes ferme K13

```
Maternité loges   9
Post-sevrage      4
Engraissement     2
Truies cible      17 · Verrats 2 · Bandes ~12
```

## Routes (toutes en français)

```
PUBLIC :    /  /a-propos  /privacy  /cgu  /login  /signup  /auth/callback
ONBOARDING: /onboarding (post-signup)
APP :       /cockpit (defaut)
            /troupeau /troupeau/{truies,verrats,bandes,batiments}/{:id}
            /cycles /cycles/{repro,maternite,post-sevrage,croissance,engraissement,finition,sortie}
            /ressources /ressources/{aliments,aliments/plan,aliments/formules,pharmacie,veto}
            /pilotage (OWNER) /pilotage/{perf,finances,finances/rapport,previsions}
            /sante /alerts /protocoles /audit /sync /more /aide /admin
```

## Composants & infra réutilisables

```
src/components/
├── EditableNumber.tsx       → inline edit number (optimistic UI + rollback toast)
├── EditableText.tsx         → idem string (multiline support)
├── PremiumHeader.tsx        → header avec slot children pour tabs/filtres
├── AgritechLayout.tsx       → wrapper safe-area + nav reserve
├── AgritechNavV2.tsx        → bottom nav 4-5 onglets + FAB
├── SyncStatusBadge.tsx      → DEFAULT export
└── DataAgeIndicator.tsx     → "Maj il y a 5 min"

src/services/
├── supabaseClient.ts        → client typé (anon key)
├── supabaseService.ts       → reads typés (getSows/getBatches/getSaillies/...)
├── supabaseWrites.ts        → updateSow/updateBoar/updateBatch/updateProduit*/updateNote
├── kvStore.ts               → Capacitor Preferences wrapper
├── offlineQueue.ts          → file d'attente écritures (legacy GAS — migration en cours)
├── alertEngine.ts           → 14 règles GTTT
└── farmDataLoader.ts        → orchestration fetch ferme

src/hooks/
├── useAutoRefresh.ts        → debounce 30s + visibilitychange listener
└── useFarm() (FarmContext)  → snapshot ferme global
```

## Migration Excel (one-shot done 2026-04-30)

132 lignes importées depuis `~/Downloads/PROJET_PORC800 .xlsx` :
- 17 truies, 2 verrats, 10 saillies, 14 portées
- 4 health_logs, 10 notes, 7 produits_veto, 9 produits_aliments
- 1 feed_inventory, 13 finances

SQL : `migrations/2026_04_30_excel_import.sql` (idempotent + rollback + verify).

## Ce qui reste (priorité décroissante)

```
🔴 Queue migration GAS→Supabase (PR1-5, ~1500 lignes) — bottleneck pour les écritures
🟠 Étendre inline edit aux écrans non encore couverts (Notes, FinancesView, PlanAlimentation)
🟠 Refonte UI publique (Login, Signup, Landing, About, Privacy, CGU) — user lead design
🟡 Tests services restants (financialAnalyzer, perfKpiAnalyzer, supabaseService)
🟡 9 lint warnings résiduels (split context files pour react-refresh)
🟢 Bundle analyzer + perf optimisations
🟢 SEO landing (meta OG, sitemap.xml)
🟢 Deploy porctrack.tech via deploy-pilot
```

## Fast lookup commands

```bash
# Build + tsc
cd ~/Desktop/PorcTrack8 && export PATH="/opt/homebrew/bin:$PATH"
npx tsc --noEmit && npm run build

# Lint
npm run lint 2>&1 | grep -c warning

# Tests unitaires
npm run test:unit

# Tests E2E
npm run test

# Dev server
npm run dev   # http://localhost:5173

# Supabase SQL
source <(grep -E '^(SUPABASE_|VITE_SUPABASE)' .env.local | sed 's/^/export /')
curl -s "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"query\": \"SELECT ...\"}"

# Deploy (via deploy-pilot agent — validation requise)
ssh porctrack 'tar -czf ~/backup-$(date +%Y%m%d-%H%M%S).tar.gz -C ~/domains/porctrack.tech public_html/'
rsync -az --delete dist/ porctrack:~/domains/porctrack.tech/public_html/
```
