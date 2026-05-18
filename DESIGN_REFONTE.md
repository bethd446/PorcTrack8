# PorcTrack 8 — Guide refonte design

> Bienvenue. Ce repo a été préparé pour accueillir un développeur designer
> externe. Cette doc te permet de comprendre la structure en 30 minutes et
> de commencer à appliquer ton design sans casser quoi que ce soit.

---

## ⚠️ À LIRE EN PREMIER — Points d'ancrage `var(--pt-*)` à définir

Le code JSX contient **1502 occurrences** de `var(--pt-*)` (CSS custom
properties) dans des inline styles ou classes. **Ces tokens ne sont
DÉFINIS NULLE PART.** C'est INTENTIONNEL : ils servent de POINTS
D'ANCRAGE pour que tu définisses ta propre palette en un seul endroit.

### Top 15 tokens orphelins par fréquence d'usage

| Token | Occurrences | Usage typique |
|-------|------------:|---------------|
| `--pt-muted` | 225 | Texte secondaire, placeholders |
| `--pt-font-mono` | 192 | Famille mono pour IDs/codes/dates |
| `--pt-ink` | 145 | Texte principal |
| `--pt-line` | 119 | Bordures (inputs, cards) |
| `--pt-bg` | 104 | Background principal |
| `--pt-font-display` | 99 | Famille titres |
| `--pt-primary` | 90 | Couleur primaire (CTAs, FAB) |
| `--pt-danger` | 75 | Couleur erreur |
| `--pt-subtle` | 71 | Texte très secondaire |
| `--pt-warm` | 62 | Background secondaire (cream) |
| autres | ~320 | divers (`--pt-accent`, `--pt-ease`, `--pt-font-body`, `--pt-line-strong`, `--pt-text-muted`, `--pt-bg-app`, `--pt-success`, etc.) |

### Comment les définir

**Option A** — Tu ajoutes un bloc `:root` dans `src/index.css` :

```css
:root {
  --pt-ink: /* ta couleur de texte principal */;
  --pt-muted: /* texte secondaire */;
  --pt-line: /* bordures */;
  --pt-bg: /* background */;
  --pt-primary: /* CTAs */;
  --pt-danger: /* erreurs */;
  --pt-font-display: /* ta famille titres */;
  --pt-font-body: /* ta famille body */;
  --pt-font-mono: /* ta famille mono */;
  /* etc. */
}
```

**Option B** — Tu fais un **recherche-remplacer** dans le code pour
substituer ces tokens par tes propres classes Tailwind / CSS variables :

```bash
# Exemple : remplacer var(--pt-primary) par var(--my-primary)
grep -rl "var(--pt-primary)" src/ | xargs sed -i '' 's/var(--pt-primary)/var(--my-primary)/g'
```

**Option C** — Tu rebattes complètement les cartes : remplacer les
inline styles par tes classes Tailwind / shadcn / CSS modules. Plus de
travail mais résultat plus pur.

→ **À toi de choisir. Le code est ton ardoise.**

---

## 🎯 Contexte projet

**PorcTrack 8** est une application mobile-first (PWA + Android/iOS via Capacitor) de **Gestion Technique de Troupeau Porcin (GTTT)**. Destinée à des éleveurs francophones (cible : Belgique, France, Côte d'Ivoire, Afrique de l'Ouest), elle gère :

- Suivi du cheptel (truies, verrats, cochettes, porcelets)
- Cycles de reproduction (saillies, échographies, mises-bas, sevrages)
- Bandes (cohortes), loges (bâtiments), engraissement, ventes
- Alertes biologiques (16 règles GTTT)
- KPIs (ISSE, IEM, GMQ, IC, taux MB, etc.)
- Assistant IA "Marius" (chat contextuel ferme)

État au moment de cette refonte : **app en production sur https://porctrack.tech**, ferme pilote K13 en Côte d'Ivoire (Christophe : 17 truies, 2 verrats, 117 porcelets, 5 bandes, 15 loges).

---

## 🛠 Stack technique

| Élément | Version |
|---------|---------|
| Framework UI | **Ionic 8.8.3** (composants natifs mobile : IonModal, IonInput, IonFab, IonToast, etc.) |
| React | **18** |
| Build | **Vite 6** + `@tailwindcss/vite` |
| Mobile | **Capacitor 6** (Android + iOS) |
| Styling | **Tailwind v4** (config minimale — pas de theme custom) |
| Primitives accessibles | **Radix UI** (Dialog, Popover, Select, Tabs, Tooltip, Label, Slot) |
| Icônes | **Lucide React** + **Ionicons** |
| Animations (optionnel) | GSAP + Lenis (installés, utilisés sur landing publique) |
| Backend | **Supabase** (auth + DB Postgres + RLS multi-tenant farm-scoped) |
| Validation forms | Zod (logique métier — INTOUCHABLE) |
| Dates | date-fns + date-fns-tz (locale fr) |
| State | React Context (granulaire : Auth, Farm, Troupeau, Pilotage, Ressources, etc.) |
| Tests | Vitest (2141 tests baseline) + Playwright (14 specs E2E) |

---

## 📁 Structure du repo

### ✅ Zones à styler (libres pour ton design)

```
src/
├── v70/
│   ├── components/
│   │   ├── ds/         9 composants atomiques nus (Button, Card, Pill,
│   │   │               Section, ListItem, PageHeader, StatsGrid, TabsMini,
│   │   │               CycleTimeline)
│   │   └── v70/       19 composants applicatifs (BottomNav, DataTable,
│   │                  Dialog, EduCard, EmptyState, Skeleton, Toast,
│   │                  Tooltip, PhotoUpload, PhotoGallery, etc.)
│   └── pages/         13 pages V70 (TodayV70, AnimalsV70, ReproV70,
│                      PerformanceV70, ReglagesV70, MaFermeV70, MonEquipeV70,
│                      EngraissementV70, SynchronisationV70, etc.)
│
├── design-system/
│   └── components/
│       └── index.tsx  32 composants atomiques additionnels (Tag, Segment,
│                      Chip, IconBox, KeyValueRow, Stat, Tabs, RadioGroup,
│                      Checkbox, FormField, Input, Select, Textarea, Search,
│                      ListItem, ActionRow, AlertGroup, AlertRow, Fab, Search,
│                      Card, InsightCard, Button, etc.)
│
├── components/
│   ├── forms/         52 formulaires métier (QuickAddTruieForm, QuickSaillieForm,
│   │                  QuickPeseeForm, QuickMortalityForm, etc.) — structure
│   │                  JSX à styler, validation Zod intouchable
│   ├── quick-actions/
│   │   └── QuickActionsHost.tsx — hôte des 13 forms via FAB Saisir
│   ├── agritech/      7 composants survivants (AnimalListItem, AppToast,
│   │                  BottomSheet, Chip, DataRow, IsoBarn, SectionDivider)
│   └── *.tsx          17 composants atomiques racine (ConfirmationModal,
│                      DeleteModal, EditableNumber, EditableText, FarmSwitcher,
│                      GlobalSearch, PhotoStrip, SaisirFAB, SyncStatusBadge,
│                      SystemManagement, etc.)
│
├── pages/
│   ├── Landing.tsx                    landing v1 legacy
│   └── landing-v2/                    landing scrollytelling
│       ├── LandingScrollytelling.tsx
│       └── scenes/                    7 scènes (Hero, CTA, Marius, Workflow,
│                                      PourQui, VideoBreak, FloatingCards)
│
└── features/                          modules métier — UNIQUEMENT la partie
                                       RENDERING peut être stylée (fetch,
                                       state, hooks = INTOUCHABLES)
```

### 🔴 Zones INTERDITES (ne JAMAIS modifier)

```
src/
├── services/      53 services métier — alertes GTTT, KPI analyseurs,
│                  workflow MB, supabaseWrites, alimentation, phaseEngine,
│                  perfKpiAnalyzer, reproductionDashboard, etc.
│
├── context/       9 contexts globaux — AuthContext, FarmContext, ToastContext,
│                  QuickActionsContext, PilotageContext, RessourcesContext,
│                  TroupeauContext, ThemeContext, GlobalSearchContext
│
├── hooks/         12 hooks métier — useFarmProfile, useEntityWithRetry,
│                  usePeseePending, usePhaseTransitions, useOfflineQueue, etc.
│
├── types/         types métier + types Supabase générés
│                  (database.types.ts, farm.ts, enums.ts, finance.types.ts,
│                  performance.types.ts, user.types.ts)
│
├── lib/           helpers métier — validation, formatage,
│                  truieHelpers, dateParser, currency, formatAnimalIdentity,
│                  authRedirect, imageCompress, etc.
│
├── config/
│   └── farm.ts    constantes biologiques porcines (gestation 114j,
│                  sevrage 28j, capacités loges, prix vente, etc.)
│
└── features/*/    parties NON-RENDERING (fetch via Supabase, state local,
                   transformation données, helpers métier internes)
```

⛔ **Règle absolue** : si tu hésites "fonctionnel ou design ?" → tu demandes. La règle du doute : **par défaut tu ne touches pas**.

---

## 📋 Composants atomiques fournis (NUS)

### `src/v70/components/ds/` — 9 atoms V70

| Composant | Props |
|-----------|-------|
| `Button` | `variant: 'primary' \| 'secondary' \| 'accent' \| 'ghost'`, `size: 'sm' \| 'md' \| 'full'`, `iconLeft?`, `children` |
| `Card` | `variant: 'default' \| 'hero'`, `children` |
| `CycleTimeline` | re-export depuis `@/design-system` |
| `ListItem` | `avatar?`, `title`, `subtitle?`, `trailing?`, `onClick?`, `pointerHandlers?` |
| `PageHeader` | `eyebrow`, `title`, `subtitle?`, `breadcrumbs?`, `onBack?`, `backLabel?` |
| `Pill` | `variant: 'primary' \| 'warm' \| 'accent' \| 'warning' \| 'danger' \| 'success' \| 'info' \| 'soft' \| 'ghost'`, `children` |
| `Section` | `label`, `children?` |
| `StatsGrid` / `Stat` | grilles de KPIs |
| `TabsMini` | tabs compacts |

### `src/v70/components/v70/` — 19 applicatifs

`BottomNav`, `DataTable`, `Dialog`, `EduCard`, `EmptyEdu`, `EmptyState`, `EncyclopediaArticle`, `EntityNotFoundGuard`, `ExportButton`, `LongPressSheet`, `NotifCategoriesSwitches`, `PhotoGallery`, `PhotoUpload`, `PushNotifToggle`, `Skeleton`, `Toast`, `ToggleAdvancedMode`, `Tooltip`, `DevDatePanel`

### `src/design-system/components/index.tsx` — 32 exports (1161L)

`Section`, `SectionHeader`, `Card`, `InsightCard`, `Button`, `Tag`, `IconBox`, `KeyValueRow`, `StatsGrid`, `Stat`, `Tabs`, `RadioGroup`, `Checkbox`, `Segment`, `Chip`, `FormField`, `Input`, `Select`, `Textarea`, `Search`, `ListItem`, `ActionRow`, `AlertGroup`, `AlertRow`, `Fab`, etc.

### `src/components/agritech/` — 7 survivants

`AnimalListItem`, `AppToast`, `BottomSheet`, `Chip`, `DataRow`, `IsoBarn`, `SectionDivider`

### `src/components/ui/` — 5 fichiers shadcn-style conservés (les autres ont été supprimés au design reset)

8 fichiers shadcn orphelins (calendar, combobox, data-table, popover, skeleton, table, tabs, tooltip) ont été supprimés au design reset (0 import externe). Les **5 fichiers restants sont VRAIMENT utilisés** :

- `sonner.tsx` (21L) — Toaster global monté dans `src/main.tsx` (utilisé par `<Toaster richColors position="top-right" />`). **Neutre** (juste config sonner avec tokens CSS).
- `command.tsx` (124L) — `CommandPalette` Cmd+K desktop (`src/components/design/CommandPalette.tsx`). Stylé shadcn (Tailwind classes).
- `dialog.tsx` (71L) — Utilisé par `command.tsx`. Stylé shadcn.
- `form.tsx` (150L) — Wrapper `react-hook-form` (`FormField`, `FormItem`, etc.) utilisé par `QuickPeseeForm.tsx`. Stylé shadcn.
- `label.tsx` (23L) — Utilisé par `form.tsx`. Stylé shadcn.

⚠️ **Ces 5 fichiers shadcn-style** sont actifs en runtime. **À toi de décider** :
1. **Conserver shadcn comme base** (ces 5 fichiers + tu peux ajouter d'autres composants shadcn). Cohérent si tu travailles déjà avec shadcn.
2. **Démolir cosmétique** comme on a fait pour V70 + migrer vers ton design system propre. Plus de travail mais résultat plus pur.

⚠️ **Triple dossier DS** : il existe historiquement TROIS dossiers de composants atomiques :
- `/v70/components/ds/` (9 atoms — pixel-perfect d'un mockup historique)
- `/design-system/components/` (32 composants — atomic + composé)
- `/components/ui/` (5 fichiers shadcn-style survivants)

À toi de décider de la consolidation (les 95+ imports `@/design-system` + les imports `../ui/` sont coûteux à migrer).

---

## 🗺 Pages et routes (100+)

Routing défini dans `src/v70/router/V70Routes.tsx`. Pages principales :

| Route | Page | Rôle métier |
|-------|------|-------------|
| `/today` | TodayV70 | Inbox alertes biologiques + audit jour + dashboard |
| `/troupeau` | AnimalsV70 | Hub Élevage (tabs : Truies / Verrats / Bandes / Loges / Porcelets) |
| `/troupeau/truies/:id` | TruieDetailView | Fiche truie complète (1556L — entité cœur) |
| `/troupeau/bandes/:id` | BandeDetailView | Fiche bande complète (1302L) |
| `/troupeau/verrats/:id` | VerratDetailView | Fiche verrat (757L) |
| `/troupeau/loges/:id` | LogeDetailView | Fiche loge |
| `/troupeau/porcelets/:id` | PorceletDetailView | Fiche porcelet |
| `/reproduction` | ReproV70 | Cycles repro + saillies + écho + MB |
| `/performance` | PerformanceV70 | KPIs GTTT (ISSE/IEM/GMQ/IC/etc.) |
| `/engraissement` | EngraissementV70 | Lots (profil engraisseur) |
| `/ressources/aliments` | AlimentsView | Stock aliments + formules |
| `/ressources/pharmacie` | PharmacieView | Stock véto |
| `/pilotage/finances` | FinancesView | Suivi financier |
| `/reglages` | ReglagesV70 | Préférences + thème + multi-farm |
| `/reglages/ma-ferme` | MaFermeV70 | Identité ferme + profil |
| `/reglages/mon-equipe` | MonEquipeV70 | Membres + rôles farm |
| `/more` | (lié à Réglages) | Profil + Aide + Marius + Admin (gated) |
| `/landing-v2` | LandingScrollytelling | Landing publique scrollytelling |
| `/login` / `/signup` | Auth | Auth Supabase |

Sub-tabs `/troupeau` : `truies`, `verrats`, `bandes`, `loges`, `porcelets` (gérés via state local AnimalsV70).

---

## 🐖 Vocabulaire métier porcin (à respecter dans tous les labels UI)

| Terme | Définition |
|-------|-----------|
| **Truie** | Femelle reproductrice |
| **Verrat** | Mâle reproducteur |
| **Cochette** | Truie nullipare (avant 1ère portée) |
| **Porcelet** | Jeune avant sevrage / engraissement |
| **Bande** | Cohorte de porcelets issue d'une même mise-bas |
| **Saillie** | Insémination/accouplement |
| **Échographie** | Confirmation gestation (J25-J35) |
| **Mise-bas (MB)** | Accouchement |
| **Sevrage** | Séparation porcelets/mère (J28 standard) |
| **Réforme** | Sortie reproducteur du cheptel |
| **Loge** | Bâtiment de logement (maternité, post-sevrage, engraissement) |
| **GTTT** | Gestion Technique des Troupeaux de Truies |
| **GTE** | Gestion Technico-Économique |
| **ISSE** | Intervalle Sevrage-Saillie Efficace (KPI repro) |
| **IEM** | Intervalle Entre Mises-bas (KPI repro) |
| **GMQ** | Gain Moyen Quotidien (KPI croissance) |
| **IC** | Indice de Consommation (KPI alimentation) |
| **NV** | Nés Vivants (à la mise-bas) |
| **MN** | Morts-Nés |

### Constantes biologiques

| Constante | Valeur |
|-----------|--------|
| Durée gestation | **114 jours** (3 mois + 3 semaines + 3 jours) |
| Cycle œstral truie | **21 jours** |
| Durée lactation/sevrage | **28 jours** |
| Retour chaleur post-sevrage | **3-7 jours** (médian J+5) |
| Seuil mortalité anormale | **>15% du lot** |

---

## 🎨 Contraintes design fortes

### Accessibilité (NON NÉGOCIABLE)

- **Touch targets** ≥ **44×44 px** (iOS HIG + Material Design)
- **Contraste** WCAG AA min : **4.5:1 texte normal**, **3:1 texte large**, **7:1 en plein soleil** recommandé (élevage = usage extérieur en bâtiments d'élevage)
- **Préserver `aria-*`** attributs existants
- **Préserver `data-testid`** attributs (utilisés par 14 specs Playwright)
- **Pas de hover-only states** (mobile-first)
- **Focus visible** clavier (préserver `:focus-visible` outlines)

### Contexte d'usage

- App utilisée par **éleveurs en bottes**, parfois avec gants, en bâtiment d'élevage (béton, bruit, mains sales)
- **Lisibilité plein soleil** (porcherie ouverte) → contraste élevé essentiel
- **Saisie rapide** : forms doivent être pré-remplis si possible, validation immédiate
- **Mobile-first** : viewport prioritaire ~720px max ; desktop secondaire

### Capacitor compatibilité

- Tous les styles doivent fonctionner en **WebView mobile Android/iOS**
- Pas de features CSS récentes (`@container queries`, etc.) sans fallback
- `safe-area-inset-bottom` / `safe-area-inset-top` pour les bords écran iOS

### Bottom navigation

5 onglets fixes :
- 🌞 **Aujourd'hui** (`/today`) — Sun icon
- 🏠 **Élevage** (`/troupeau`) — Warehouse icon
- 🔁 **Repro** (`/reproduction`) — Repeat icon
- 📊 **Performance** (`/performance`) — LineChart icon
- ⚙️ **Réglages** (`/reglages`) — Settings2 icon

(Variante "Lots" Layers icon visible pour le profil engraisseur)

FAB "Saisir" central (au-dessus du BottomNav) qui ouvre un menu de 13 actions rapides (Saillie, Échographie, Mise-bas, Pesée, etc.).

---

## 📐 Stratégie thème suggérée (à toi de définir)

- **Light + dark recommandé** : `ThemeContext` existe déjà (logique persistance kvStore via Capacitor Preferences). Mode `'auto' | 'day' | 'night'` avec basculement horaire 6h/19h en mode auto. À toi d'ajouter les valeurs visuelles correspondantes.
- **Tokens centralisés** : tu choisis (CSS variables custom, Tailwind theme extend, CSS-in-JS, etc.)
- **Composants atomiques en premier**, puis pages
- **DNA suggéré** (historique projet, à ignorer si tu préfères) : palette terre (vert forêt + cream + accent terre) — "Terrain Vivant"

---

## 🏗 Workflow recommandé

1. **`git clone` + `npm install`**
2. **`npm run dev`** → vérifier que l'app démarre (sera très moche, c'est normal)
3. **`npx vitest run`** → confirmer baseline tests verte (**2141 tests passing**)
4. **`npx playwright test`** → 14 specs E2E (vérifier baseline)
5. **Établir le design system EN PREMIER** :
   - Palette (couleurs sémantiques pour 16 tokens `--pt-*` qui restent dans le code)
   - Typographie (familles, échelles, poids)
   - Spacing scale
   - Composants atomiques : Button, Input, Card, Modal d'abord
6. **Appliquer progressivement par section fonctionnelle** :
   - Bottom navigation + headers
   - Pages atomiques (TodayV70, ReglagesV70 — petites surfaces pour itérer)
   - Listes (truies / verrats / bandes / loges / porcelets)
   - Forms (44 forms, suivre le même pattern une fois validé sur 2-3)
   - Pages détail (les plus complexes : TruieDetailView, BandeDetailView)
7. **Tester sur device mobile réel** + Capacitor (`npx cap run android` / `npx cap run ios`)
8. **Respecter les ZONES INTERDITES** à chaque étape

### Tokens `--pt-*` attendus

L'app utilise ~2300 occurrences de `var(--pt-*)` (CSS custom properties). À toi de définir leurs valeurs dans ton design system. Top 15 par fréquence :

| Token | Usages | Suggestion sémantique |
|-------|-------:|-----------------------|
| `--pt-muted` | 284 | Texte secondaire / placeholder |
| `--pt-font-mono` | 255 | Famille mono pour IDs/codes/dates |
| `--pt-ink` | 225 | Texte principal |
| `--pt-line` | 184 | Bordures (inputs, cards) |
| `--pt-primary` | 169 | Couleur primaire (CTAs, header, FAB) |
| `--pt-bg` | 144 | Background principal |
| `--pt-font-display` | 143 | Famille titres |
| `--pt-warm` | 109 | Background secondaire (cream, tabs) |
| `--pt-font-body` | 109 | Famille body |
| `--pt-danger` | 103 | Couleur erreur |
| `--pt-subtle` | 96 | Texte très secondaire |
| `--pt-accent` | 71 | Couleur accent (signatures) |
| `--pt-ease` | 59 | CSS animation timing function |
| `--pt-line-strong` | 55 | Bordures renforcées |
| `--pt-text-muted` | 44 | Variante de `--pt-muted` |

Autres tokens utilisés (volume mineur) : `--pt-bg-app`, `--pt-success`, `--pt-warm-deep`, `--pt-primary-deep`, `--pt-primary-light`, `--pt-accent-light`, `--pt-role-*-bg`, `--pt-role-*-fg`, `--pt-rose-*`, `--pt-amber-*`, `--pt-info-*`, etc.

### Classes CSS sémantiques restantes

Le fichier `v70-global.css` (618 classes) a été supprimé au design reset. Mais les classes sémantiques restent dans le JSX, témoins de l'intention design :

- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-accent`, `.btn-ghost`, `.btn-full`, `.btn-sm`, `.btn--block`, `.btn--lg`, `.btn--danger`
- `.card`, `.card-hero`, `.card-dense`, `.card-link`, `.card-link__title`, `.card-link__sub`, `.card-link__main`
- `.pill`, `.pill-primary`, `.pill-warm`, `.pill-accent`, `.pill-warning`, `.pill-danger`, `.pill-success`, `.pill-info`, `.pill-soft`, `.pill-ghost`
- `.field`, `.field__input`, `.field--inline`
- `.empty`, `.empty-state`, `.empty-state__title`, `.empty-state__sub`, `.empty-state__icon`
- `.section`, `.section-label`, `.section__label`
- `.kpi`, `.kpi__label`, `.kpi__val`, `.kpi-label`
- `.stat`, `.stat-value`, `.stat-label`, `.stats-grid`
- `.fab`, `.bottom-nav`, `.bn-item`, `.bn-icon`, `.bn-label`
- `.toast`, `.toast--success`, `.toast--warning`, `.toast--error`, `.toast__icon`, `.toast__text`, `.toast__close`
- `.dialog__card`, `.dialog__title`, `.dialog__body`, `.pt-backdrop`, `.pt-backdrop--center`
- `.page-header`, `.page-eyebrow`, `.page-title`, `.page-subtitle`, `.page-header-back`
- `.list-item`, `.list-info`, `.list-title`, `.list-sub`, `.list-action`
- `.breadcrumb`, `.breadcrumb-sep`
- `.tabs-mini`, `.tab`
- `.hero-row`, `.hero-icon`, `.hero-info`, `.hero-title-text`, `.hero-sub`
- `.term-tip`, `.term-tip-icon`, `.term-tip-popover`
- `.edu-card`, `.edu-card-label`, `.edu-card-text`, `.empty-edu`, `.empty-edu-icon`, `.empty-edu-title`, `.empty-edu-desc`
- `.alert-row`, `.alert-dot`, `.alert-info`, `.notification-*`
- `.stepper`
- `.profile`, `.chat`, `.typing`, `.chart-*`
- `.pt-screen`, `.pt-tabs`, `.pt-segment`

→ Tu redéfinis ces classes (CSS custom, Tailwind components layer, CSS modules, etc.). Ou tu peux choisir de les ignorer et restyler via `className` Tailwind directement (mais ça touche ~1500+ emplacements JSX).

---

## 🚀 Commandes utiles

```bash
# Dev
npm run dev              # Vite dev server (port 5173)

# Tests
npx vitest run           # Tests unitaires (baseline 2141 passing)
npx playwright test      # Tests E2E (14 specs)
npx tsc --noEmit         # Type-check

# Build
npm run build            # Build production (PWA 109 entries / ~5800 KiB)
npm run preview          # Servir le dist localement

# Capacitor
npx cap sync             # Sync build → mobile
npx cap run android      # Build + run Android
npx cap run ios          # Build + run iOS
npx cap open android     # Ouvrir Android Studio
```

---

## 📊 Baseline tests (référence pour ton repo "Day 0")

- **Vitest** : 177 fichiers / **2141 tests passing**
- **Playwright** : 14 specs E2E
- **tsc** : 0 erreur
- **Bundle** : 109 PWA precache entries / ~5800 KiB
- **Build time** : ~3s

→ Si après ton design tu vois ces chiffres diverger fortement, c'est suspect. Quelques tests adaptés cosmétiquement (assertions sur classes CSS supprimées) sont acceptables — typiquement 0-50 tests à adapter.

---

## 🐛 Dette designer triée (cf. `BUGS_DETECTES.md`)

Pendant le design reset, ~2300 inline `var(--pt-*)` ont été préservés dans le JSX (le designer les redéfinit via tokens). En complément, ~1300+ inline styles cosmétiques résiduels sur ~40 fichiers identifiés :

- **Pages V70** (13) : ~542 inline cosmétiques
- **Features modules** (15) : ~600+
- **Forms** (44) : ~200+
- **Landing** (9) : ~223
- **Composants UI** : ~265

→ Démolissables via grep+replace IDE en ~7-8h cumulés. Pattern le plus fréquent : `style={{ color: 'var(--pt-muted)', fontFamily: 'var(--pt-font-mono)' }}` → à remplacer par classe ou tokens redéfinis.

---

## ✨ Conseils pratiques

- **`.empty-state__title` / `.empty-state__sub`** : tu trouveras ces classes dans `EmptyState.tsx` (V70 applicatif). Sans CSS associé pour le moment, juste des hooks sémantiques pour ton design.
- **Forms** : 44 forms avec un wrapper commun `QuickActionSheet`. Si tu styles ce wrapper, tu impactes 80% des forms d'un coup.
- **Modals** : préfère Ionic `IonModal` (déjà utilisé) plutôt que Radix Dialog pour cohérence mobile.
- **Toasts** : 2 systèmes coexistent (custom Toast V70 + IonToast Ionic). Choisis et migrer si besoin.
- **Loading skeletons** : `Skeleton` (V70) et listing guards déjà en place — juste à styler.

---

## 🤝 Contact / Questions

Si tu hésites entre "fonctionnel" et "design" sur un fichier, ou si tu veux comprendre pourquoi un Provider/Context existe : demande avant de toucher.

> **Principe directeur** : préserver 100% de la logique métier, repenser 100% du visuel.

Bonne refonte 🎨
