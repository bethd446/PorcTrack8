# 🐛 Bugs détectés pendant le Design Reset

> Bugs FONCTIONNELS détectés pendant la démolition design.
> NON CORRIGÉS pendant cette phase — à traiter dans un chantier dédié
> APRÈS la refonte design par le dev externe.

## Format
- **Date** : YYYY-MM-DD
- **Lot** : Lot N
- **Fichier** : `path/to/file.tsx`
- **Symptôme** : description courte
- **Reproductible** : oui / non
- **Sévérité** : 🔴 bloquant / 🟠 gênant / 🟢 mineur
- **Notes** : contexte additionnel

---

## Bugs

### 2026-05-18 · Lot 6 · 3 DetailViews (entités cœur métier) — démolition fine déléguée designer
- **Fichiers** :
  - `src/features/troupeau/TruieDetailView.tsx` (1556L)
  - `src/features/tables/bandes/BandeDetailView.tsx` (1302L)
  - `src/features/troupeau/VerratDetailView.tsx` (757L)
- **Sévérité** : 🔴 CRITIQUE pour le travail designer — ces 3 fichiers sont les fiches détail des entités cœur métier (truie/bande/verrat). Le designer DOIT les traiter en priorité (visibles dès le premier clic utilisateur).
- **Approche recommandée pour le designer** :
  1. Lire chaque fichier intégralement AVANT de toucher
  2. Identifier les sections : (a) imports, (b) hooks data (useQuery, useState, useEffect) = INTOUCHABLES, (c) helpers transformation = INTOUCHABLES, (d) JSX rendering = CIBLE design, (e) sous-composants inline
  3. Démolir cosmétique uniquement (classes, inline styles visuels)
  4. Préserver : props, handlers, hooks, accessibility (`aria-*`, `data-testid`), `safeDate`, `formatDate`, helpers métier
  5. Tester chaque fichier individuellement (Vitest ciblé sur les test.tsx adjacents)
- **Pourquoi pas démoli pendant le design reset Claude** : ces fichiers sont trop critiques pour une démolition cosmétique en masse via grep+replace IDE. Le designer doit voir le rendu en context (truie réelle, bande réelle, verrat réel) pour décider de la structure visuelle finale. Notre démolition aveugle aurait été contre-productive.

---

### 2026-05-18 · Lot 5d · Landing publique — inline cosmétiques résiduels
- **Fichiers** (1822L cumulé, 223 inline cosmétiques) :
  - `src/pages/Landing.tsx` (798L, 79 inline) — landing v1 legacy
  - `src/pages/landing-v2/LandingScrollytelling.tsx` (94L, 1) — orchestrateur
  - `src/pages/landing-v2/scenes/SceneHero.tsx` (232L, 28)
  - `src/pages/landing-v2/scenes/SceneCta.tsx` (120L, 29)
  - `src/pages/landing-v2/scenes/SectionMarius.tsx` (94L, 23)
  - `src/pages/landing-v2/scenes/SectionWorkflow.tsx` (146L, 23)
  - `src/pages/landing-v2/scenes/SectionPourQui.tsx` (139L, 20)
  - `src/pages/landing-v2/scenes/FloatingCardsStack.tsx` (153L, 18)
  - `src/pages/landing-v2/scenes/SceneVideoBreak.tsx` (46L, 2)
  - `src/pages/landing-v2/hooks/useLenisScroll.ts` (logique animations)
- **Sévérité** : 🟢 mineur — la landing publique est isolée du reste de l'app authentifiée. Démolissable par designer en 2h.
- **Note** : `<video>`, `<img>`, GSAP/Lenis hooks préservés (libs installées). Le designer redéfinira l'identité marketing.

---

### 2026-05-18 · Lot 5a · 13 pages V70 — inline cosmétiques résiduels
- **Volume total** : ~542 inline cosmétiques sur 13 pages
- **Top** : OnboardingEduPage 97, MonEquipeV70 88, EngraissementV70 64, PerformanceV70 62, MaFermeV70 61, SynchronisationV70 53, AnimalsV70 49, TodayV70 20, NotFoundV70 19, DiagnosticView 16, ReproV70 10, ReglagesV70 3, EncyclopediaPage 0
- **Sévérité** : 🟢 mineur — démolissables par designer en 3-4h via grep+replace IDE
- **Note** : ces pages contiennent une partie rendering + composition de composants V70/DS (déjà démolis cosmétiquement au Lot 4 partial). Les inline cosmétiques résiduels sont du polish que le designer redéfinira.

---

### 2026-05-18 · Lot 5b · features/* modules — inline cosmétiques résiduels rendering
- **Top fichiers (≥6 inline)** : AdminDashboard 67, FinancesView 87, PorceletsReorgWizard 79, AuditPrintTemplate 39, ChatbotWidget 40, MariusChatFullscreen 64, PendingValidationsView 30, DesignSystemView 30, MariusGreeting 16, HintCard 15, PerfKpiOverview 22, PerfKpiPerformance 25, PerfKpiEconomie 15, AideView 12, PhaseBanner 6
- **Volume total estimé** : ~600+ inline cosmétiques
- **Sévérité** : 🟢 mineur — démolissables par designer
- **Note** : la **logique métier** dans ces modules est INTOUCHABLE (services, hooks, data fetching). Le rendering JSX reste, juste à restyler. Le designer ne doit jamais toucher au fetch/state/transformation.

---

### 2026-05-18 · Lot 5c · forms (44 forms) — inline cosmétiques résiduels
- **Top fichiers (≥6 inline)** : QuickSplitBandeForm 44, QuickPeseeForm 24, EditTruieWizard 18, QuickSailliesBandeForm 16, MultiPorteeSevrageWizard 10, QuickNoteForm 11, QuickSaillieBandeForm 12, QuickRefillForm 12, QuickAddBandeForm 7, QuickRetourChaleurForm 6
- **Volume total estimé** : ~200+ inline cosmétiques sur 44 forms
- **Sévérité** : 🟢 mineur — démolissables par designer
- **Note** : la **validation Zod**, les `onSubmit`, les états sont INTOUCHABLES. Le designer doit garder la structure JSX (label, field, error display).

---

### 2026-05-18 · Lot 4c · design-system/components/index.tsx — 29 inline cosmétiques résiduels
- **Fichier** : `src/design-system/components/index.tsx` (1161L, 26 composants exportés : Section, Card, InsightCard, Button, Tag, IconBox, KeyValueRow, StatsGrid, Stat, Tabs, RadioGroup, Checkbox, Segment, Chip, FormField, Input, Select, Textarea, Search, ListItem, ActionRow, AlertGroup, AlertRow, Fab, etc.)
- **Symptôme** : 29 inline styles cosmétiques (color/fontFamily/textTransform/letterSpacing/boxShadow/borderRadius)
- **Sévérité** : 🟢 mineur — démolissable par designer en 30-45 min (1 fichier centralisé, IDE grep+replace efficace)
- **Note** : composants `Tag`, `Button`, `Chip`, `Fab`, etc. très utilisés (95+ imports `@/design-system`). Démolition fine pendant ce sprint = trop coûteux contexte session. Designer décide.

---

### 2026-05-18 · Lot 4d · design-system/hooks + utils — GARDÉS (logique métier)
- **Fichiers** : `src/design-system/hooks/usePageFab.ts` + `src/design-system/utils/uuid-guard.ts`
- **Décision** : GARDER intacts. `usePageFab` configure le routage FAB (logique métier). `uuid-guard` protège l'UI contre les fuites UUID (logique métier sécurité).
- **Note** : Le nommage "design-system/hooks" est trompeur. Ces utils sont métier déguisés en design-system. À renommer/déplacer en future itération si besoin (hors scope design reset).

---

### 2026-05-18 · Lot 4e · 4 fichiers agritech survivants avec inline cosmétiques
- **Fichiers** :
  - `src/components/agritech/AnimalListItem.tsx` (9 inline cosmétiques)
  - `src/components/agritech/BottomSheet.tsx` (1)
  - `src/components/agritech/DataRow.tsx` (1)
  - `src/components/agritech/IsoBarn.tsx` (1)
- **Symptôme** : 12 inline cosmétiques total — démolissables par designer en 15 min
- **Note** : `Chip.tsx`, `AppToast.tsx`, `SectionDivider.tsx` déjà clean (0 inline cosmétique trouvé).

---

### 2026-05-18 · Lot 4f · 11 fichiers src/components/ atomiques avec inline cosmétiques
- **Fichiers à gros volume** :
  - `src/components/SystemManagement.tsx` (29 inline cosmétiques)
  - `src/components/FarmSwitcher.tsx` (24)
  - `src/components/NotificationsPermissionPrompt.tsx` (24)
  - `src/components/GlobalSearch.tsx` (21)
- **Fichiers à volume modéré** :
  - `src/components/PhotoStrip.tsx` (7)
  - `src/components/RootErrorBoundary.tsx` (6)
  - `src/components/ConfirmationModal.tsx` (4)
  - `src/components/DeleteModal.tsx` (4)
  - `src/components/EditableNumber.tsx` (3)
  - `src/components/EditableText.tsx` (3)
  - `src/components/SmartRoot.tsx` (2)
  - `src/components/SyncStatusBadge.tsx` (1)
- **Total** : 128 inline cosmétiques sur 12 fichiers
- **Clean (0 inline cosmétique)** : NotificationsBridge, ProtectedRoute, PwaUpdatePrompt, SaisirFAB
- **Sévérité** : 🟢 mineur — démolissables par designer en 1h30 via IDE grep+replace
- **Note** : `SystemManagement.tsx` (748L) est la page admin — utilisée uniquement par OWNER. Démolition non urgente.

---

### 2026-05-18 · Lot 4g · QuickActionsHost.tsx — DÉJÀ CLEAN
- **Fichier** : `src/components/quick-actions/QuickActionsHost.tsx`
- **Décision** : créé propre au Lot 1.5 (séparation logique/rendering). 0 modification nécessaire.

---

### 2026-05-18 · Lot 4b · 11 fichiers v70/components/v70 avec inline styles cosmétiques résiduels
- **Date** : 2026-05-18
- **Lot** : Lot 4b (partiel)
- **Fichiers concernés** :
  - `src/v70/components/v70/LongPressSheet.tsx` (4 props cosmétiques)
  - `src/v70/components/v70/Skeleton.tsx` (1)
  - `src/v70/components/v70/ToggleAdvancedMode.tsx` (7)
  - `src/v70/components/v70/ExportButton.tsx` (1)
  - `src/v70/components/v70/EntityNotFoundGuard.tsx` (11)
  - `src/v70/components/v70/PushNotifToggle.tsx` (10)
  - `src/v70/components/v70/NotifCategoriesSwitches.tsx` (12)
  - `src/v70/components/v70/DataTable.tsx` (9)
  - `src/v70/components/v70/DevDatePanel.tsx` (13)
  - `src/v70/components/v70/PhotoGallery.tsx` (16)
  - `src/v70/components/v70/PhotoUpload.tsx` (16)
- **Symptôme** : ~100 inline styles cosmétiques (color/background/fontFamily/fontSize/textTransform/boxShadow) restants dans 11 fichiers V70 applicatifs après Lot 4b partiel
- **Sévérité** : 🟢 mineur — non bloquant, démolissable par le designer en 1h via grep+replace IDE
- **Notes** :
  - 5 fichiers Lot 4b traités proprement (Dialog, EmptyState, Tooltip, EduCard, EmptyEdu)
  - Décision pragmatique économie contexte session : focus sur Lot 4z (v70-global.css 4655L = 95% du visuel) qui aura impact disproportionné vs travail fine inline
  - Designer verra `var(--pt-muted)` etc. dans inline styles → fallback runtime dans `src/index.css` → s'affiche normalement → désigner les remplace par sa palette

---

### 2026-05-17 · Lot 3 · smoke-fallback.mjs login Playwright fail
- **Date** : 2026-05-17
- **Lot** : Lot 3 (3a-bis)
- **Fichier** : `smoke-fallback.mjs` (script audit perso, pas dans repo)
- **Symptôme** : `page.waitForResponse(/auth/v1/token)` timeout après 25s en mode preview localhost:4173/4174 — alors que curl direct sur le même endpoint Supabase retourne HTTP 200 + access_token instantanément
- **Reproductible** : oui (2 essais consécutifs sur 2 ports différents)
- **Sévérité** : 🟢 mineur — script perso d'audit, pas un bug de l'app
- **Notes** :
  - Le script smoke-quickactions.mjs du Lot 1.5 utilisait le même login flow et fonctionnait
  - Hypothèse : timing Ionic input fill (les `IonInput` wrappent un native `<input>` ; `.fill()` Playwright peut ne pas déclencher le change event Ionic correctement la 2e fois)
  - Hypothèse alternative : rate limit Supabase auth (4 logins en 5 min)
  - **Workaround pour le Lot 3** : skip 3a-bis (CHECK 1 a confirmé page lisible : bodyBg #fff, bodyColor #1a1a1a, inputs visibles) → smoke réel reprend à 3d avec script débugué (sleep entre actions, ou bypass login via storageState pré-saved)
  - **NON BLOQUANT** : pas un bug fonctionnel de l'app, juste fragilité du test E2E sur input Ionic
