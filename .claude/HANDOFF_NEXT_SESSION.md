# HANDOFF — Session suivante PorcTrack 8

> **Date** : 2026-05-01 (généré par Claude Opus 4.7 fin de session)
> **À lire en PREMIER** dans la nouvelle session — couvre où on en est et ce qu'il reste.

---

## 0. État actuel

- **Live prod** : https://porctrack.tech (v3 déployée 2026-04-30 23:35)
- **Build hash** : `index-BGP6ZIR2.js`
- **Build local** : tsc 0 erreur · 781/786 tests + 5 skipped · 2.37s · lint 15-17 warnings
- **Git** : `main` à `bc70044` (5 commits poussés, repo synchro avec prod)
- **Backup remote** : `~/backups/porctrack-tech-20260501-013556-v3pre.tar.gz`

## 1. Audit externe reçu (par Claude in Chrome) — note **5,5 / 10**

Un autre agent Claude a parcouru tous les écrans en live via l'extension Chrome et identifié **5 problèmes systémiques** :

### 🔴 Problèmes à corriger en priorité

| # | Problème | Écrans | Fix |
|---|---|---|---|
| 1 | **`Instrument Serif` italique ALL CAPS** sur tous les H1 internes | `/troupeau`, `/cycles`, `/alerts`, `/sante`, `/ressources`, `/pilotage` + `/cockpit` mobile | → `Big Shoulders Display` 700, sentence case ("Troupeau" pas "TROUPEAU") |
| 2 | **Fond `#F5F0E6` (beige chaud)** au lieu de `#f0f4f3` (ivoire vert) | Tous | Token `--bg-app` à corriger |
| 3 | **Hex hardcodés hors palette** : `#059669` (emerald), `#D4920F` (mustard), `#B45309` (amber-700), `#D9EBBF` | Plusieurs (notamment `/troupeau`, `/cockpit` mobile, Marius pilule) | Tokeniser : `var(--color-accent-500)`, `var(--amber-pork)`, `var(--color-accent-100)` |
| 4 | **Marius FAB désymbolisé** : icône **bulle de chat** au lieu d'étoile, **pas de dot vert** "en ligne", couleur mustard, **double FAB sur /cockpit** (carré + et rond Marius) | `/cockpit`, `/troupeau`, `/cycles`, `/alerts` | Refondre `MariusFAB.tsx` selon spec (étoile + dot vert), supprimer le FAB carré "+" en parallèle |
| 5 | **Layout incohérent** : `/cockpit` desktop = sidebar 220px + bottom tab bar (les 2 ensemble = bug), autres écrans (`/troupeau`, `/cycles`, etc.) = pas de sidebar du tout sur desktop | Tous protégés | `<AppShell>` unique : ≥1024px sidebar, <768px bottom tab, 768-1023px icon-rail |
| 6 | **Couleurs sémantiques manquantes** | `/alerts` (4 niveaux identiques), `/cycles` (funnel arc-en-ciel pastel) | Mapper sur palette métier (cf. Section 4 ci-dessous) |
| 7 | **Splash `/` bloqué fond `#0A0D0C` 20s+** sur erreurs GAS + lock Supabase | `/` | Fond `--bg-app`, fallback `/login` ou `/a-propos` si session invalide |
| 8 | **Bouton "Réessayer" radius 4px sur `/sante`** (sortie système) | `/sante` | Pill 9999px primary mono uppercase |

### ✅ Écrans qui sont OK (ne PAS toucher)

- `/login` (8/10 — référence locale de bonne intégration)
- `/a-propos` (cohérent éditorial)
- `/cockpit` desktop (H1 OK, juste les 2 FAB et la bottom tab à fixer)

## 2. Détails techniques pour les fixes

### Fix #1 — Typo + sentence case

```css
/* À chasser dans le code (probablement dans un component header partagé ou page-title CSS) */
font-family: 'Instrument Serif' /* MAUVAIS */
text-transform: uppercase /* MAUVAIS si appliqué globalement aux H1/H2 */

/* Remplacer par */
font-family: var(--font-display); /* = "BigShoulders" */
font-weight: 700;
letter-spacing: -0.02em;
line-height: 1.05;
text-transform: none;
font-style: normal;
```

Copy à mettre à jour dans les hubs :
- `TROUPEAU` → `Troupeau` (`src/features/hubs/TroupeauHub.tsx`)
- `CYCLES` → `Cycles` (`src/features/hubs/CyclesHub.tsx`)
- `ALERTES` → `Alertes` (`src/features/tables/AlertsView.tsx`)
- `JOURNAL SANTÉ` → `Journal santé`
- `RESSOURCES` → `Ressources` (`src/features/hubs/RessourcesHub.tsx`)
- `PILOTAGE` → `Pilotage` (`src/features/hubs/PilotageHub.tsx`)
- Sur `/cockpit` mobile : "COCKPIT · K13" → "Bonjour, {prénom}" cohérent avec desktop

**Note importante** : l'audit identifie probablement la mauvaise police venue de `terra-v2-tokens.css` qui charge "Instrument Serif" via Google Fonts. Vérifier `src/styles/terra-v2-tokens.css` qui peut redéfinir `--font-display` ou `--font-heading` en serif.

### Fix #2 — Fond global

Chercher `#F5F0E6` partout et remplacer par `#f0f4f3` :
```bash
cd /Users/13mac/Desktop/PorcTrack8
grep -rn "#F5F0E6\|#f5f0e6" src/ --include="*.css" --include="*.tsx" --include="*.ts"
```

Le coupable est probablement `src/index.css` ligne ~98 (`--bg-app: #f5f0e6` legacy). Mettre `#f0f4f3` (token v6 officiel) — laissez-vous guider par `src/styles/terrain-vivant-v6.css` qui est canonique.

### Fix #3 — Hex hardcodés à purger

```bash
grep -rn "#059669\|#D4920F\|#B45309\|#D9EBBF" src/ --include="*.css" --include="*.tsx" --include="*.ts"
```

Mapping à appliquer :
- `#059669` → `var(--color-accent-500)` (#2D5A1B)
- `#D4920F` → `var(--amber-pork)` (#F4A261)
- `#B45309` → `var(--color-warning)` ou retirer
- `#D9EBBF` → `var(--color-accent-100)` (#E3EDD9)

Le `#D4920F` Marius vient probablement de `src/components/AgritechHeader.tsx` ou similaire — chercher `marius` dans les composants header/topbar.

### Fix #4 — Marius FAB

Cible : `src/components/design/MariusFAB.tsx`

Selon audit, le FAB actuel a une icône **bulle de chat** au lieu d'étoile. Plus le **dot vert "en ligne" manquant**.

```tsx
// MariusFAB.tsx — révision selon spec
import { Sparkles } from 'lucide-react'; // ÉTOILE pas MessageCircle

<button
  className="fab-marius"
  aria-label="Ouvrir Marius, l'assistant de l'élevage"
  style={{
    position: 'fixed',
    bottom: 18,
    right: 18,
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'var(--amber-pork)', // #F4A261
    color: 'var(--ink)',
    border: 0,
    boxShadow: '0 4px 12px rgba(244, 162, 97, 0.4)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative', // pour le dot
  }}
>
  <Sparkles size={24} strokeWidth={2} />
  <span aria-hidden="true" style={{
    position: 'absolute',
    top: 4, right: 4,
    width: 10, height: 10,
    borderRadius: '50%',
    background: 'var(--color-accent-500)',
    border: '2px solid var(--amber-pork)',
  }} />
</button>
```

Plus : sur `Cockpit.tsx` (et autres avec FAB carré "+"), supprimer le FAB carré ou le remplacer par une CTA dans la topbar ("+ Nouvelle saillie").

### Fix #5 — AppShell unifié responsive

Créer `src/components/AppShell.tsx` ou modifier `AgritechLayout.tsx` :

```tsx
// Pseudocode
const isDesktop = useMediaQuery('(min-width: 1024px)');
const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

return (
  <div className="app-shell">
    {isDesktop && <Sidebar fullWidth={220} />}
    {isTablet && <Sidebar collapsed iconRail={56} />}
    <main>{children}</main>
    {!isDesktop && !isTablet && <BottomTabBar />}
  </div>
);
```

Cohérence essentielle : toutes les routes protégées passent par AppShell unique. Plus de mix sidebar/bottomNav.

### Fix #6 — Couleurs sémantiques

`/alerts` :
| Niveau | Token |
|---|---|
| CRITIQUE | `--color-danger` (#EF4444) |
| HAUTE | `--pig` (#D4806B) |
| NORMALE | `--amber-pork` (#F4A261) |
| INFO | `--color-info` (#3B82F6) |

`/cycles` funnel :
| Phase | Token |
|---|---|
| Reproduction | `--pig` |
| Gestation | `--color-accent-100` |
| Maternité | `--color-info` |
| Post-sevrage / Croissance | `--color-accent-500` ↔ `--color-accent-400` |
| Engraissement | `--color-secondary` |
| Finition | `--color-secondary-deep` |

### Fix #7 — Splash `/`

Vérifier `index.html` ou le SuspenseFallback dans `src/App.tsx` — fond doit être `var(--bg-app)` (#f0f4f3), pas un dark hardcodé.

```tsx
const SuspenseFallback = () => (
  <div className="flex flex-col items-center justify-center h-screen"
       style={{background: 'var(--bg-app)', color: 'var(--ink)'}}>
    {/* ... */}
  </div>
);
```

Plus : si `loadChecklistDefinitions()` ou autre boot async fail (GAS error) → ne PAS bloquer le render. Laisser l'app monter, afficher l'erreur en bannière.

### Fix #8 — Bouton Réessayer

`src/features/tables/TableView.tsx` ou similaire — chercher état d'erreur et rendre le bouton conforme :
```tsx
<Button variant="primary" size="md" onClick={retry}>
  Réessayer
</Button>
// Ou directement :
className="btn primary"  // pill 9999px, mono uppercase, height 40+
```

## 3. Outillage déjà en place

### MCPs actifs
- **github** (bethd446/PorcTrack8)
- **supabase** (read-only via PAT)
- **context7** (docs Tailwind v4 / Ionic 8 fresh)
- **chrome-devtools-mcp** (Lighthouse + console + network)

### Plugins
- superpowers, impeccable, document-skills, planning-with-files, chrome-devtools-mcp

### 9 sub-agents projet (`.claude/agents/`)
- dev-troupeau, dev-cycles, dev-ressources
- qa-runner, designer-pilot
- supabase-ops, excel-importer
- chatbot-builder, deploy-pilot

### 14 composants design (`src/components/design/`)
Eyebrow, Button, Chip, PublicShell, Sidebar, KpiCard, Sparkline, TopBarSync, ReproTracker, DecisionBinaire, TimelineVerticale, MariusFAB, MariusPanel, SowHero

### Tokens
- Source de vérité : `src/styles/terrain-vivant-v6.css` (chargé en dernier)
- `src/index.css` empile encore 5 fichiers legacy (theme-tokens, agritech-tokens, agritech-utilities, theme-v2-tokens, terra-v2-tokens). **`terra-v2-tokens.css` charge probablement Instrument Serif** — c'est la source du Fix #1.

### Credentials (dans `~/Desktop/PorcTrack8/.env.local`)
```
VITE_SUPABASE_URL=https://jcritwravdwefwqwyjvk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=jcritwravdwefwqwyjvk
```

## 4. Pipeline deploy

```bash
cd ~/Desktop/PorcTrack8 && export PATH="/opt/homebrew/bin:/usr/bin:/bin:$PATH"

# Build + Backup + rsync
npm run build
ssh porctrack "tar -czf ~/backups/porctrack-tech-$(date +%Y%m%d-%H%M%S)-pre.tar.gz -C ~/domains/porctrack.tech public_html/"
rsync -az --delete -e "ssh" dist/ porctrack:~/domains/porctrack.tech/public_html/

# Smoke tests
for path in "/" "/login" "/cockpit" "/troupeau" "/cycles" "/alerts" "/ressources" "/pilotage"; do
  echo -n "  $path : "
  /usr/bin/curl -s -o /dev/null -w "%{http_code}\n" "https://porctrack.tech$path"
done
```

## 5. Données Supabase (état actuel)

```
auth.users     1   (contact@liegeoischristophe.com, id bc96ddbd-c34d-46b1-b624-4a3dca181a2c)
profiles       1   (role=ADMIN, full_name="Ferme Liegois Christophe")
troupeaux      1   ("Ferme Liegois Christophe", Principal)
sows          17   (T01-T19)
boars          2   (V01 Bobi, V02 Aligator)
saillies      10
batches       14
health_logs    4
notes         10
produits_aliments  9
produits_veto  7
feed_inventory 1
finances      13
```

Bug data fetch fixé : MetaProvider attend maintenant que la session Supabase soit posée avant de fetch (cf. commit `bc70044` parent + le fix appliqué dans cette session).

## 6. Tests

Lancer : `npm run test:unit`
- 786 tests total : 781 passants + 5 skipped justifiés
- `TruieDetailView.test.tsx` : 5 it.skip sur features retirées en refonte v6 (boutons Sevrer/Confirmer MB/Détecter chaleur intégrés à `<DecisionBinaire>`)

## 7. Plan d'action recommandé pour la prochaine session

```
[1] Fix #1 — Instrument Serif → BigShoulders (90% des écrans gain visuel immédiat)
    └── Chercher la cause root dans terra-v2-tokens.css ou un component header
[2] Fix #2 — Fond #F5F0E6 → #f0f4f3 (one-line dans tokens)
[3] Fix #3 — Purge des 4 hex hardcodés
[4] Fix #4 — Marius FAB selon spec (étoile + dot vert + couleur F4A261)
    └── Plus : supprimer le double FAB sur /cockpit
[5] Fix #5 — AppShell unifié responsive (gros chantier — peut être fait après deploy intermédiaire)
[6] Fix #6 — Couleurs sémantiques /alerts + /cycles
[7] Fix #7 — Splash /
[8] Fix #8 — Bouton Réessayer
[QA] tsc + tests + lighthouse + smoke prod
[Deploy] rsync v4
[Validation] User check sur https://porctrack.tech
```

**Estimation** : Fixes #1-4 = 1-2h cumulé en sub-agents parallèles. Fix #5 = 1-2h. Fixes #6-8 = 30 min. Total : ~3-4h pour passer de 5,5/10 à 8-9/10.

## 8. Strategie sub-agents (recommandée)

Wave 1 (parallèle, low conflit) :
- Sub-agent A : Fix #1 + #2 + #3 (typo + bg + hex purge — tout dans tokens.css + composants)
- Sub-agent B : Fix #4 (Marius FAB) + Fix #8 (bouton Réessayer)

Wave 2 (séquentiel, gros) :
- Sub-agent C : Fix #5 AppShell (touche App.tsx + AgritechLayout — gros refacto layout)
- Sub-agent D : Fix #6 + #7 (sémantique alerts/cycles + splash)

Wave 3 :
- qa-runner final pass
- deploy-pilot

---

*Document généré 2026-05-01 par Claude Opus 4.7. Prochain agent : commencer par lire ce fichier + `.claude/AGENT_QUICKREF.md` + `CLAUDE.md` projet.*
