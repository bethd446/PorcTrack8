# PorcTrack 8 — Blueprint projet (squelette complet)

**Date** : 2026-05-12
**Version courante** : v3.3.3 (3 commits récents v3.3.0/1/2/3)
**Branche** : main (à jour sur origin)
**Audit en cours** : roadmap multi-profil P0-P3 (cf. §10)

> Document méta-projet. Sert de squelette pour arbitrer "où on va".
> Tout ce qui a été décidé, livré, et reste à faire — depuis V13 jusqu'à v3.3.3.

---

## 1. Vision & promesse

**PorcTrack 8** = app mobile PWA (Ionic React + Capacitor + Supabase) de **Gestion Technique de Troupeau Porcin (GTTT)** pour éleveurs **naisseurs-engraisseurs d'Afrique de l'Ouest** (cible primaire Côte d'Ivoire, secondaire Belgique).

**Promesse** : remplacer le carnet papier par un outil terrain rapide qui automatise les KPIs métier, anticipe les événements biologiques (mises-bas, sevrages, retours en chaleur), et marche en zone 4G capricieuse.

**Différenciation** :
- Pensée pour le **terrain en bottes** (mains sales, soleil direct, mode offline)
- DNA visuel **"Terrain Vivant"** artisanal anti-AI feel (pas de SaaS générique)
- **Marius** = assistant IA contextualisé sur les données de la ferme
- 16 règles d'alerte GTTT biologiques (R1-R16) calées sur la réalité métier

---

## 2. Personae cibles

### 2.1 Christophe (founder + persona primaire, doc `.claude/audits/PERSONA_ELEVEUR.md`)
- Ferme K13 (Belgique → migration Côte d'Ivoire)
- 17 truies + 2 verrats actuels, cible 50 truies 2026
- Conditions : bottes, gants mouillés, téléphone en pochette plastique, soleil/ombre, 4G capricieuse, bruit, mains sales → tap rapide + dictée préférée
- Profil : **cycle complet** (naisseur-engraisseur)

### 2.2 Audit V13 (1er mai 2026) — 15 frustrations terrain catalogues (F1-F15)
- F1 Tap impossible, F2 Submit silencieux, F3 Texte illisible, F4 Saisie laborieuse
- F5 Données perdues offline, F6 Search global manquant, F7 Vocabulaire pro confus
- F8 Action en double, F9 Calculs absents, F10 Décision pas suggérée
- F11 Photo galère, F12 Données fausses publiées, F13 Identité ferme floue
- F14 Devise étrangère, F15 Refonte menu disruptive

### 2.3 Marché 10 clients pilotes (Côte d'Ivoire) — en attente livraison v3.3
- 3 profils détectés (audit 2026-05-12 user) : **Naisseur ~85% utilité**, **Engraisseur ~40% utilité** (❌), **Cycle complet ~95% utilité**
- → Trou structurel actuel : pas d'adaptation par profil (cf. §10 P0 #1)

---

## 3. Stack technique

| Couche | Tech | Notes |
|---|---|---|
| Framework | **Ionic 8 + React 18 + TypeScript** | UI Ionic + composants V70+ custom |
| Build | **Vite** | bundler + HMR + PWA plugin (Workbox) |
| Style | **Tailwind v4 + V70+ tokens CSS** (`--pt-*`) | DNA strict, pas de hex hardcodé |
| Backend | **Supabase Postgres + RLS + Edge Functions** | tables `farms/sows/boars/saillies/batches/porcelets_individuels/loges/...` |
| State | React Context (granulaire) | `TroupeauContext`, `RessourcesContext`, `PilotageContext`, `FarmContext` |
| Persistance offline | **Capacitor Preferences** via `kvStore` + queue offline | mutex `_inFlight` + cap 1000 items |
| Dates | `date-fns` (locale fr) + helpers `safeDate` | tolère ISO + FR `dd/MM/yyyy` |
| Icons | Ionicons + **Lucide React** | Lucide privilégié V70+ |
| Auth | Supabase Auth | RLS par `farm_id IN (SELECT current_user_farms())` |
| Photos | `browser-image-compression` + bucket `farm-photos` (5MB+HEIC) | WebP compression auto |
| Push | **Web Push VAPID** + Edge Function `send-push` (`web-push@3.6.7`) | iOS 16.4+ PWA installed |
| Chatbot Marius | **Mistral-7B Q4 sur VPS `api.porctrack.tech`** | endpoint `/chat` SSE format OpenAI |
| Voice | Web Speech API (`webkitSpeechRecognition`) | hook `useVoiceDictation` + mapping erreurs FR (v3.3.2) |
| Charts | Pas de lib lourde (CSS pure pour bars/jauges) | Récharts banni (poids+AI-feel) |
| Tests | **Vitest** + Testing Library + Playwright E2E | 2014 unit / >40 specs E2E |
| Déploiement | Capacitor (Android/iOS) + PWA web (`app.porctrack.tech`) | hosting Vercel-like |

---

## 4. Design system "Terrain Vivant" V70+

### 4.1 Palette canonique
| Token | Hex | Usage |
|---|---|---|
| `--pt-primary` | #2D4A1F | Vert forêt header `.ph--primary` |
| `--pt-warm` | #F5E9D8 | Crème header pills + cards |
| `--pt-accent` | #B8703D | Ambre signature CTA/eyebrow |
| `--pt-accent-deep` | #c2662b | Ambre foncé |
| `--pt-bg` | #FAF7F0 | Ivoire fond global |
| `--pt-ink` | #1a1a1a | Texte principal |
| `--pt-muted` | #6b6357 | Texte secondaire |
| `--pt-subtle` | #a39888 | Texte tertiaire (placeholder, hint) |

### 4.2 Typographie (2 fonts strict — DNA V71+ révisé)

**Décision V71 typo-lock** : InstrumentSans + `tabular-nums` (variant numérique) remplace JetBrains Mono partout. Confirmé dans `src/v70/theme/v70-global.css` et `src/design-system/tokens/tokens.css` (`--pt-font-mono: 'InstrumentSans', ...`).

| Police | Usage | Token V70+ |
|---|---|---|
| **Big Shoulders Display** Bold/900 | Titres H1/H2/labels nav | `--pt-font-display` |
| **Instrument Sans** | Corps de texte + IDs/chiffres (via `tabular-nums`) | `--pt-font-body` / `--pt-font-mono` (alias) |

**Fonts retirées du DNA** :
- ❌ JetBrains Mono (abandonnée V71, le `var(--ff-mono, 'JetBrains Mono', monospace)` legacy fallback est nettoyé en V80 — 72 occurrences migrées)
- ⚠️ DMMono : preload encore présent dans `index.html` mais **utilisée nulle part en CSS direct** (3 mentions dans commentaires de doc seulement : `TopBarSync`, `Sidebar`, `LineageBreadcrumb`). À **statuer** : conserver pour usage V77.1 sub-text ponctuel ou retirer le preload mort.

**Anti-pattern à éviter** : `font-family` inline JSX `style={{ fontFamily: 'JetBrains Mono' }}` — utiliser `var(--pt-font-mono)` ou `var(--pt-font-display)`.

### 4.3 Composants V70+ canoniques (cf. `src/v70/components/`)
- `Card`, `Pill`, `Button`, `ListItem`, `Section`, `Tooltip`, `EduCard`, `DataTable`, `ExportButton`
- `EntityAvatar` (avatars truie/verrat/porcelet/bande/loge avec couleurs DNA)
- `.kpis-strip` (4 KPI horizontaux), `.score-billboard` (lettre A/B/C/D)
- `.priority-line` (alertes Today)
- `.fab` canonique (rond, `data-pt="fab"`, position fixed) — pas de wrapper en flow normal

### 4.4 Animations & feel
- Pas de glassmorphism, pas de néon/chrome, pas de gradient flashy
- Easings personnalisés (Emil Kowalski philosophy via `.agents/skills/emil-design-eng`)
- Active states tactiles (scale 0.97 + opacité)
- GSAP ScrollTrigger + Lenis sur landing-v2

### 4.5 Tokens layout
- `--pt-header-h: 188px`, `--pt-page-px: 24px`, `--pt-card-radius: 16px`
- `--pt-fab-size: 56px`, `--pt-tap-min: 44px` (WCAG AA)
- Safe area iOS via `env(safe-area-inset-*)`

---

## 5. Timeline (V13 → v3.3.3)

### V13-V32 (1er-3 mai 2026) — Fondations & audit comportemental
- **V13** audit comportemental initial → 15 frustrations F1-F15 cataloguées
- **V25-V27** pesée Christophe (117 porcelets) + workflow MB + Wizard onboarding
- **V28** CTA Confirmer MB + Daily Check + audit 20pts
- **V29-V30** 5 composants V29 + cleanupOutdatedCaches PWA + tokens `--pt-*` initial
- **V31-V32** UUIDs bannis + FAB rond contextuel + fiche truie 4 onglets
- Tests global : 1450 → 1803 (+353 sur 9 jours)

### V33-V41 (3-6 mai 2026) — Composants V33 + Outils
- 7 nouveaux composants (Segment, Chip, Search, ListItem, ActionRow, Stat, StatsGrid)
- Page `/outils` (5e onglet bottom-nav)
- 65 tests ajoutés

### V44-V45 → V70 (7-8 mai 2026) — Refonte architecture 5 onglets
- Migration de 54 routes vers **5 onglets V70** (AUJOURD'HUI / ÉLEVAGE / REPRO / PERFORMANCE / RÉGLAGES)
- Suppression `LegacyAppShell` V44/V45 (cleanup V70 — 2026-05-07)
- Header `.ph--primary` standardisé
- AlertEngine 16 règles GTTT (R1-R16) consolidée

### V70-V74 (7-8 mai 2026) — DNA "Terrain Vivant" + backend push
- **V72** : extension offlineQueue 6 tables, Marius suggestions dynamiques (8 règles), push backend (VAPID + Edge Function)
- **V73** : refonte landing-v2 (13 images premium), module photos PWA (HEIC + lazy + lightbox)
- **V74-V** : `useListingLoadingGuard` (anti faux empty state), signaux `cancelled` async (9 useEffect durcis)
- **V74 S+T** : sécurité Supabase advisor 11→6 WARN, empty states V73 finalisés

### V75 (8-9 mai 2026) — Landing scrollytelling + Listing porcelets
- **V75 d/e/f** : refonte landing-v2 complète (vidéo Creatify autoplay + 6 sections), tokens `--pt-*` strict appliqué partout, suppression `#0a0a0a` hardcodé
- **V75-h** : listing porcelets dépliable par bande (helper `derivePorceletPhase` 5 phases)

### V76-V78 (9-11 mai 2026) — Vagues mockups Claude Design
- 9 vagues de **rendus Claude Design** (cf. §6) intégrés progressivement
- Total : 15 sprints "agents Opus" parallèles (#65-69 dans tasks)
- Tag **v3.0.0** (livraison à 10 clients pilotes)

### v3.2-v3.3 (10-12 mai 2026) — Hotfixes post-livraison
- **v3.2.1** ProtocolsView ids alignés
- **v3.2.2** Anti-chunks stale (PWA Failed to fetch dynamic module)
- **v3.2.3** ChatbotWidget tests CI + V70ErrorBoundary chunk reload
- **v3.3.0** Audit visuel localhost — 7 fixes P0/P1 (today blanche, perfKpi cap, ISSE GTTT, score billboard, placeholder bandes, URL tabs, IonToast vérif)
- **v3.3.1** 6 frictions polish (Marius compressé, MATERNITÉ, doublon today, FAB clearance, transition, placeholder contraste)
- **v3.3.2** A12 voice-to-text resilience + A16 anti-doublon statut truie
- **v3.3.3** Tooltips KPI null, gradient +visible, MATERNITÉ font

### V80 / v3.4.x (12 mai 2026) — Sprint multi-profil + engraissement
- **v3.4.0** (commit `269fe84`) Sprint V80 — 5 agents convergés en parallèle :
  - A1 theme-unification (0 hex hardcodé, 0 `.premium-*` legacy, 7 nouveaux tokens)
  - A2 typo-canon (DNA réel = 2 fonts canon Big Shoulders + InstrumentSans tabular-nums, JetBrains banni) + patch orchestrateur 72 résiduels `var(--ff-*)` orphelins migrés
  - A3 component-dedup (3 doublons supprimés : `design/Chip`, `design/EmptyState`, `design/KpiCard`)
  - **A4 onboarding-profil P0 #1** : `farmProfile.ts` + `useFarmProfile` + step onboarding 3 cards + nav `BottomNav` LOTS adaptatif + `SaisirSheet` actions filtrées + `PerformanceV70` KPI/score profil-aware
  - **A5 engraissement-module P0 #2** : 3 tables Supabase (`lots`/`lot_pesees`/`lot_mortalites`) + repo + page `/engraissement` + 3 QuickForms + 20 tests verts
- **v3.4.1** (commits `e9a0312`+`b49f822`+`2f4954d`) 4 bugs résiduels post-V80 :
  - bug #1 FAB réintégré sur `/today` (cohérence)
  - bug #3 autologin guard contre placeholder password
  - bug #5 URLs truies en boucle (régression V31-V32 réparée)
  - bug #2 partial : `PorceletsReorgGate` centralisé dans `FarmContext` (24 req → 14)
- **v3.4.2** (commit `1160637`) bug #2 résiduel : `useRef` guard `lastFetchedFarmIdRef` dans `FarmContext` pour neutraliser StrictMode double-fire + transitions bootstrap currentFarmId. 14 → 1-2 req/session.

**État actuel** : tsc=0, 2056/2056 tests, branche `main` à jour, tag `v3.4.2` pushé.

---

## 6. Rendus Claude Design intégrés (8+ vagues)

> Claude Design = mockups HTML/CSS reçus en input pour piloter le DNA visuel. Chaque rendu = 1 page ou famille d'écrans, intégré par phases d'agents Opus.

| # | Rendu | Vague | Tasks | Apports clés |
|---|---|---|---|---|
| 1 | **Mockup Élevage** | Phase 1a | #27, #28 | priority-line, card-link, score-billboard, ReglagesV70 cards-link, TodayV70 priority-line |
| 2 | **Mockup 3a** Ressources + Reproduction | Phase 2 | #33 | Hub /ressources cards-link, ReproV70 timeline saillie/écho/MB |
| 3 | **Mockup 3b** Onboarding + Modals | Phase 3 | #34 | OnboardingV2Wizard 5 étapes, modales quick-add design unifié |
| 4 | **Mockup 3c** Marius + Patterns + Bonus | Phase 4 | #35 | MariusGreeting (orb émeraude), patterns transverses, MariusChatFullscreen |
| 5 | **Mockup 4** Auth + Photo + Gestures + OS | Phase 5 | #36 | Login/Signup/Reset DNA V70, PhotoUpload, gestures swipe, OS-aware (iOS safe-area) |
| 6 | **Mockup V76** | Vague 1-2 | #38-46 | Performance score billboard, ReproV70 polish, fiches détail `--pt-primary`, modals quick-add (6 sheets), Marius greeting + chat fullscreen, AlertsView + FinancesView refonte |
| 7 | **Mockup V76 vague 3** | Vague 3 | #48-51 | 5 modals quick-add retake, Repro fonctionnel (retour chaleur + saillies bande), 5 Ressources V43→V70, RapportFinancier + ControleQuotidien |
| 8 | **Mockup Protocoles + Encyclopédie** | V77 | #62 | Hub protocoles santé/biosécurité (16 fiches), Encyclopédie articles markdown + fulltext search |
| 9 | **Mockup V78** refonte pages | V78 | #67-69 | Loges, Finances, Ressources, modales, Marius — polish final boutons + icônes V76 canoniques (15 agents Opus) |

**Méthode d'intégration** : dispatch d'agents Opus en parallèle avec AGENT_CONTRACT (rapport `=== VERIFICATION ===` obligatoire). 15-40 agents simultanés par vague selon scope.

---

## 7. Architecture pages (5 onglets V70)

```
/today              AUJOURD'HUI    TodayV70.tsx        — priorités du jour
/troupeau           ÉLEVAGE        AnimalsV70.tsx      — 5 tabs TRUIES/VERRATS/PORCELETS/BANDES/LOGES
  /truies                          (tab interne)
  /verrats                         (tab interne)
  /porcelets                       (tab interne — listing dépliable par bande)
  /bandes                          (tab interne — accordion bandes actives)
  /loges                           (tab interne — pills phases + jauges occupation)
/troupeau/.../{id}                 TruieDetailView, VerratDetailView, BandeDetailView, LogeDetailView, PorceletDetailView
/reproduction       REPRO          ReproV70.tsx        — agenda/en cours/à venir/historique (naisseur/cycle uniquement)
/engraissement      LOTS           EngraissementV70.tsx — lots + pesées + GMQ/IC (engraisseur/cycle, alias `/lots`)
/performance        PERFORMANCE    PerformanceV70.tsx  — vue/kpis/finances/prévisions (KPIs profil-aware)
/reglages           RÉGLAGES       ReglagesV70.tsx     — profil, ferme, équipe, ressources, notifs

/ressources         (hub)          RessourcesHub.tsx   — aliments/véto/formules/protocoles/encyclopédie
/marius             (fullscreen)   MariusChatFullscreen.tsx
/landing-v2         (public)       LandingScrollytelling.tsx — vidéo + 6 sections
/signup /login /reset              auth flow V70
/admin /admin/dashboard            SystemManagement (OWNER seulement)
```

**Composant nav réel** : `src/v70/components/v70/BottomNav.tsx` (V70 canon). `src/components/AgritechNavV2.tsx` et `src/components/Navigation.tsx` = legacy synchronisés pour compat (V80 A4).

---

## 8. 5 piliers métier (couverture actuelle)

### 8.1 ✅ Repro (truies + verrats + saillies + écho + MB) — bien couvert
- Carte "PROCHAINE MISE-BAS" timeline saillie→écho→MB
- Agenda / En cours / À venir / Historique (4 tabs)
- 16 règles alertes biologiques (R1-R16 cf. alertEngine.ts)
- **Manques (audit user 2026-05-12)** : perfs verrats (taux fécondité), retours en chaleur auto, pédigrée minimal

### 8.2 🟡 Suivi porcelets individuels — couverture partielle
- Listing dépliable par bande (V75-h) avec 5 phases
- `porcelets_individuels` table avec boucle/sexe/poids/statut
- **Manques** : mortalité J0-J7 jour par jour, adoption croisée, castration/coupe queue/boucles registre

### 8.3 ✅ Engraissement — module livré V80 A5 (v3.4.0)
- Page `/engraissement` (alias `/lots`) avec header `.ph--primary` + 4 KPI strip + liste lots actifs
- 3 tables Supabase (`lots`, `lot_pesees`, `lot_mortalites`) avec RLS
- Repository `src/services/repos/lots.repo.ts` (296L) + 20 tests verts
- 3 modales QuickAddLot/QuickAddPeseeLot/QuickAddMortaliteLot
- Calculs auto : GMQ (cap ≥2 pesées requises), mortalité, coût achat partiel
- Alerte "Prêt vente" si `poids_moyen_recent ≥ 110 kg`
- **Manques (P1)** : IC (indice consommation) = placeholder "Module Aliment-Conso à venir" en attendant intégration conso aliment par lot

### 8.4 🟡 Stock pharmacie — squelette présent
- Hub `/ressources` avec compteurs Total/OK/Bas/Rupture
- **Manques** : DLC + alerte 30j, décrément auto sur traitement, coût/mois/lot/truie

### 8.5 🟡 Alimentation / formules / rations — base présente
- 5 formules placeholder, `rationCalculator.ts` existant
- **Manques** : calcul ration par phase + poids vif + nb porcelets allaités, coût/kg auto, alerte changement phase

---

## 9. Décisions actées (registre `.claude/memory/decisions.md`)

| Date | Décision | Raison |
|---|---|---|
| 2026-05-02 | Pays par défaut Belgique pour Christophe / EUR auto | éviter friction setup |
| 2026-05-02 | 1 sexe = 1 bande dans 1 loge, UNIQUE(farm, boucle, sexe) | convention métier Christophe |
| 2026-05-03 | Truies "en cycle" plutôt que "productives" (élargir à saillie active) | éviter "0/50 productives" trompeur en démarrage |
| 2026-05-03 | Splitter une bande au lieu de tout re-saisir (`QuickSplitBandeForm`) | workflow pro, conserve historique |
| 2026-05-03 | Doublons boucles autorisés mais signalés (warning amber) | réalité terrain (réutilisation physique) |
| 2026-05-08 | Bande peut occuper 2 loges (F+M) via `porcelets_individuels.loge_id` | sexage à 2 mois |
| 2026-05-08 | Numéro de bande saisi librement par l'éleveur | respect conventions registre papier |
| 2026-05-08 | Push notifications = Web Push VAPID (pas FCM) | 0 dépendance externe |
| 2026-05-11 | KPI Performance cap statistique (5 saillies min, 3 paires ISSE min, cap 120%) | honnêteté métier > faux chiffres |
| 2026-05-11 | ISSE sémantique GTTT = jours intervalle sevrage→saillie (pas sevrés/an) | standard métier |
| 2026-05-12 | Adaptation par profil ferme (Naisseur/Engraisseur/Cycle complet) | déverrouille +60% TAM (cf. §10 P0 #1 + PLAN_PROFIL_MULTI.md) |
| 2026-05-12 | DNA fonts V71+ canon = 2 polices (Big Shoulders + InstrumentSans tabular-nums) | abandon JetBrains Mono confirmé V71 typo-lock |
| 2026-05-12 | `BottomNav.tsx` (V70) = composant nav réel ; `AgritechNavV2`/`Navigation` legacy synchronisés | V80 A4 découverte |
| 2026-05-12 | `useRef` guard sur useEffect `currentFarmId` dans FarmContext | neutralise StrictMode double-fire + transitions bootstrap (v3.4.2 fix) |

---

## 10. Audit roadmap multi-profil (2026-05-12)

Source : audit user "trou structurel #1" — l'app actuelle parle naisseur, ne sert pas l'engraisseur pur (~40% utilité). Plan complet dans `.claude/PLAN_PROFIL_MULTI.md`.

### 🔴 P0 — Bloquants adoption multi-profil
1. ✅ **Onboarding profil** (3 boutons Naisseur / Engraisseur / Cycle complet) + adaptation bottom-nav + KPIs + FAB par profil — **LIVRÉ v3.4.0 (V80 A4)**
2. ✅ **Page Engraissement** (lots, pesées, GMQ auto, alerte poids vente, mortalité) — **LIVRÉ v3.4.0 (V80 A5)**. IC reste placeholder en attendant module aliment-conso (P1).
3. **Calendrier vaccinal auto** + rappels J-1 + décrément stock (~4-6h) — **ouvert**

### 🟡 P1 — Suivi pointu réel
4. Retours en chaleur détectés auto (alerte J19-J23 post-saillie)
5. Suivi performance verrats (taux fécondité, nb saillies)
6. Ration calculée auto par phase + poids vif + nb porcelets allaités
7. DLC pharmacie + alerte 30j
8. Pédigrée minimal (parents) pour anti-consanguinité

### 🟢 P2 — Polish UX terrain
9. ✅ Voice-to-text résilient (fait v3.3.2 — A12)
10. Photo systématique sur saisies majeures (déjà partiellement)
11. Infobulles jargon (MB, ISSE, etc.) + glossaire Marius
12. Marius compétent métier (pas juste conversationnel)

### 🔵 P3 — Différenciation
13. Coûts unitaires consolidés (coût/porcelet sevré, coût/kg viande, marge brute)
14. Suggestions Marius proactives ("Ta bande mange 20% en dessous de la prévision")
15. Export PDF rapport mensuel pour banquier / coopérative / ANADER

---

## 11. Anti-patterns + apprentissages

### À éviter (cf. `.claude/memory/learnings.md`)
- ❌ Hardcoded `#0a0a0a` / `#10b981` / autres hex hors palette `--pt-*`
- ❌ Negative margins (`-mt-10`) pour positionner sous header → utiliser slot `children`
- ❌ Wrapper `<div className="pt-screen">` autour d'un élément `position: fixed` (cf. fix `/today` blanche v3.3.0)
- ❌ Tests qui passent avec 1-2 paires de data quand seuils statistiques exigent 3-5 (cf. fix v3.3.0 perfKpiAnalyzer)
- ❌ Mockup intégré sans valider qu'on garde le DNA (anti-AI feel)
- ❌ Refacto + bug fix dans le même commit (debugging des reverts plus dur)
- ❌ Background agents long-running sur tsc en attente passive (cf. A12 zombie 7h)

### À répéter (patterns validés)
- ✅ Cap statistique sur KPIs (afficher `—` + tooltip si signal insuffisant)
- ✅ Décomposition Repository (`src/services/repos/*.repo.ts`) depuis monolithe `supabaseWrites.ts`
- ✅ Hooks de garde (`useListingLoadingGuard`) pour éviter faux empty states
- ✅ Signal `cancelled` dans useEffect async
- ✅ AGENT_CONTRACT + `=== VERIFICATION ===` bloc obligatoire pour sub-agents
- ✅ Spot-check `wc -l` / `grep` quand un agent rapporte "déjà fait"
- ✅ Commits petits + tsc systématique entre phases (anti pattern revert)
- ✅ Profile-aware metadata via jsonb (pas d'`ALTER TABLE` risqué)

---

## 12. Métriques projet (snapshot 2026-05-12)

| Métrique | Valeur |
|---|---|
| Lignes TypeScript src/ | ~50k (estimation) |
| Tests unitaires | 2014 / 2014 ✅ |
| Tests E2E Playwright | ~40 specs |
| tsc errors | 0 |
| Bundle vendor-misc | 1.5 MB (>600KB warning, optim P2) |
| PWA cache entries | 103+ |
| Tables Supabase | 25+ (farms, sows, boars, saillies, batches, porcelets_individuels, loges, batch_sows, notes, pesees, pesees_batch, health_logs, finances, stocks, push_subscriptions, ...) |
| Pages routes | 5 onglets + sous-routes + 12 sous-pages métier |
| Composants V70+ | ~50 dans `src/v70/components/` |
| Formulaires quick-add | 47 forms inventoriés |
| Rendus Claude Design intégrés | 8+ vagues |
| Versions taggées | v3.0.0 (livraison), v3.2.x (3 hotfixes), v3.3.x (3 commits récents) |

---

## 13. Décision pivot maintenant

L'audit roadmap multi-profil (§10) est validé. La question opérationnelle :

**Option A — Sprint P0 #1 immédiat** (Phase 1a 2-3h en direct)
Livrable : profil persisté, helper, onboarding step. Base pour 1b/1c parallèles.

**Option B — Sprint P0 #1 complet d'un bloc** (1a+1b+1c, ~7-10h)
Risque revert ↑ (cf. pattern session). Commit énorme.

**Option C — Geler maintenant, attaquer plus tard**
Profiter de l'état stable v3.3.3 pour faire un audit terrain réel chez Christophe avant de pousser P0.

**Recommandation projet** (DNA + memory) : **Option A** — fondation testable en 2-3h, valide approche sans engager 30h. P0 #2 (Engraissement) et P0 #3 (calendrier vaccinal) attendent.

---

## 14. Fichiers de référence (`.claude/`)

| Fichier | Rôle |
|---|---|
| `AGENT_CONTRACT.md` | Garde-fou anti-hallucination obligatoire sub-agents |
| `BRIEF_AGENTS_IA.md` | Modèle d'orchestration multi-agents Opus/Sonnet/Haiku |
| `HANDOFF_NEXT_SESSION.md` | Snapshot post-Sheets-Out V70/V71 consolidation |
| `PLAN_PROFIL_MULTI.md` | **Spec détaillée P0 #1** (créée 2026-05-12) |
| `PROJECT_BLUEPRINT.md` | **Ce document** (squelette projet) |
| `memory/learnings.md` | 474 lignes — patterns réutilisables |
| `memory/decisions.md` | 127 lignes — choix actés (registre chronologique) |
| `memory/journal.md` | 464 lignes — historique chrono sessions/vagues |
| `memory/blockers.md` | Blocages actifs (statut 🔴/🟡/✅/⏸) |
| `memory/evals.md` | Évaluations qualitatives |
| `audits/PERSONA_ELEVEUR.md` | Persona Christophe + grille frustrations F1-F15 |
| `audits/AUDIT_PERSONA_2026-05-07.md` | Dernier audit persona complet |
| `audits/COMPTE_TEST_PERMANENT.md` | Compte audit Supabase + seed |
| `audits/seed_audit_50_3.sql` | Seed 50 truies 3 verrats |
| `audits/VAGUE_2_PLAN.md` + `VAGUE_3_PLAN.md` | Plans vagues historiques |
| `skills/ui-ux-pro-max-skill/` | Skill UI/UX Pro Max (161 palettes, 99 guidelines) |
| `agents/` | 10 agents personnalisés |

---

**FIN — squelette projet à jour 2026-05-12.**
Pour mettre à jour : éditer `## 5. Timeline` (ajouter version), `## 9. Décisions actées` (nouvelles entrées), `## 12. Métriques` (snapshot).
