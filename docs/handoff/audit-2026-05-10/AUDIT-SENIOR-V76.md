# Audit senior post-v76 — 2026-05-10

> Audit statique exhaustif du codebase après 14 sprints de refonte v76.
> Méthode : lecture code + grep cross-fichiers. Build + tsc + tests unitaires lancés une fois pour mesure. Aucun fichier source modifié.

---

## Synthèse exécutive

- 1 P0 bloquant (tests fail en production)
- 9 P1 à corriger (tech debt structurelle, fiches manquantes, code mort)
- 6 P2 polish (apostrophes, fonts, micro-issues)

**Recommandation :** la « bouteille » V76 est plus solide qu'on pourrait le craindre — `tsc --noEmit` passe (0 err) et `vite build` finit en 2.88s. Les 4 fiches détail sont 100 % propres de Premium/Agritech/KpiCardV6. Mais 4 tests `usePageFab` sont rouges (régression), 12 fichiers utilisent encore `AgritechLayout`, `MariusChatFullscreen` créé Sprint 7 n'est câblé sur aucune route (code mort), et `Toast`/`Dialog` créés Sprint 8 ne sont importés nulle part. Avant la prochaine vague, traiter le P0 + le code mort (+ ~2h), puis la migration AgritechLayout (~6-8h). Le reste est cosmétique.

Effort total estimé : **~14-18h** (P0 30 min, P1 ~10h, P2 ~6h).

---

## P0 — Bloquants

### P0-1 · 4 tests fail dans `usePageFab.test.ts`
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/design-system/hooks/usePageFab.test.ts:9-22, 58-63`
- Symptôme : `Tests 4 failed | 1990 passed | 5 skipped` sur `npm run test:unit`. Tests cassés :
  - `isPageFabEnabled('/troupeau')` → attendu `true`, reçu `false`
  - `isPageFabEnabled('/troupeau/')` → attendu `true`, reçu `false`
  - `isPageFabEnabled('/troupeau/truies')` → attendu `true`, reçu `false`
  - `usePageFab() sur /troupeau` → attendu `true`, reçu `false`
- Cause : `usePageFab.ts:38` ajoute `^/troupeau/?$` dans `FAB_DISABLED_PATHS` ; le test attendait l'ancien comportement (FAB sur `/troupeau`). La modif a changé le comportement sans mettre à jour les tests.
- Fix : décider la vérité (FAB sur `/troupeau` ou pas ?) puis aligner tests OU code. Si on garde le comportement actuel (FAB désactivé sur hub `/troupeau`), modifier `usePageFab.test.ts:9-22` pour retirer `/troupeau`, `/troupeau/`, `/troupeau/truies` du `it.each` "true" et les remettre dans le `it.each` "false". Ligne 58-63 : changer `expect(...).toBe(true)` en `expect(...).toBe(false)`.

---

## P1 — À corriger

### P1-1 · Code mort Sprint 7 — `MariusChatFullscreen` non câblé
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/features/chatbot/MariusChatFullscreen.tsx` (704 lignes)
- Symptôme : composant créé Sprint 7 mais aucun import dans le reste du codebase (`grep -r MariusChatFullscreen src/` ne retourne que des self-references). La route `/marius` n'existe pas dans `V70Routes.tsx`.
- Cause : Sprint 7 a livré le composant et son client API (`mariusApi.ts`) mais a oublié l'enregistrement de la route, OU la route a été supprimée par un sprint ultérieur sans cleanup.
- Fix : 2 options. (a) Ajouter `<Route path="/marius" element={<MariusChatFullscreen />} />` dans `V70Routes.tsx` + lien depuis `ChatbotWidget` (bouton "Plein écran"). (b) Supprimer `MariusChatFullscreen.tsx` (et garder `mariusApi.ts` seulement utilisé en interne par `ChatbotWidget`). La signature `callMariusAPI` y est utilisée — vérifier avant suppression.

### P1-2 · Code mort Sprint 8 — `Toast`, `Dialog` non utilisés
- Fichiers :
  - `/Users/13mac/Desktop/PorcTrack8/src/v70/components/v70/Toast.tsx`
  - `/Users/13mac/Desktop/PorcTrack8/src/v70/components/v70/Dialog.tsx`
  - Tests : `__tests__/Toast.test.tsx`, `__tests__/Dialog.test.tsx`
- Symptôme : aucun `import` de ces composants dans `src/`. Seul l'index barrel `src/v70/components/v70/index.ts:5` les ré-exporte. Les tests existent mais le code n'est pas consommé.
- Cause : composants livrés en avance de phase Sprint 8, aucune migration de consumers (`useIonAlert`, `useIonToast`, `IonToast`).
- Fix : (a) migrer 1-2 vues pilotes vers ces composants pour valider l'API et faire jurisprudence ; (b) sinon supprimer + tests.
- Note : `LongPressSheet` est aussi listé Sprint 8 mais grep montre qu'il n'a aucun consumer non plus (hors barrel + test). Même verdict.

### P1-3 · `AgritechLayout` legacy importé dans 12 fichiers
- Fichier source : `/Users/13mac/Desktop/PorcTrack8/src/components/AgritechLayout.tsx`
- Importé par :
  ```
  src/App.tsx
  src/components/SystemManagement.tsx
  src/features/admin/AdminDashboard.tsx
  src/features/controle/AuditView.tsx
  src/features/controle/ChecklistFlow.tsx
  src/features/controle/ControleQuotidien.tsx
  src/features/help/AideView.tsx
  src/features/outils/OutilsView.tsx
  src/features/pilotage/RapportFinancierView.tsx
  src/features/protocoles/ProtocolsView.tsx
  src/features/ressources/PlanAlimentationView.tsx
  src/features/tables/TableView.tsx
  ```
- Symptôme : la « refonte Terrain Vivant » V70 ne s'applique pas à ces vues — elles utilisent encore le wrapper legacy avec sa propre nav/header. `agritech-heading` apparaît dans 8 fichiers actifs (cf. annexe B).
- Cause : refonte v70 partielle, pas de chantier de migration unifié.
- Fix : créer un sprint dédié « migration AgritechLayout → shell V70 ». Ordre suggéré (par criticité utilisateur) : `ControleQuotidien` (audit quotidien — utilisé tous les jours), `AlertsView`, `ProtocolsView`, `AideView`, `RapportFinancierView`, `AdminDashboard`. ~6-8h estimé.

### P1-4 · `KpiCardV6` legacy dans `AdminDashboard`
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/features/admin/AdminDashboard.tsx:11, 992, 997, 1002`
- Symptôme : `import KpiCardV6 from '../../components/design/KpiCard'` + 3 usages.
- Fix : migrer vers `StatsGrid` (DS V70) ou `Section` + `Pill` (les KPIs admin sont rarement consultés). Idéalement remonter dans le sprint AgritechLayout.

### P1-5 · `PorceletDetailView` mentionnée dans le mockup mais inexistante
- Symptôme : `find src -iname "*PorceletDetail*"` retourne 0 résultat. Aucune route `/troupeau/porcelets/:id` dans `V70Routes.tsx`. Le seul `PorceletGroup.tsx` (`src/v70/components/PorceletGroup.tsx`) est un sous-composant agrégé pour les bandes.
- Cause : feature mentionnée mais jamais livrée, OU décision d'archi (porcelets toujours rattachés à une bande).
- Fix : trancher avec Christophe. Si fiche individuelle non requise, supprimer la mention dans les mockups Élevage. Si requise (ex : pour traçabilité piège abattoir), créer `PorceletDetailView.tsx` avec route `/troupeau/porcelets/:id` (lecture seule, dérivée de `BandePorcelets.porceletsIndividuels[]`).

### P1-6 · `enqueueAppendRow` no-op en production
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/services/offlineQueue.ts:296-304`
- 3 callers réels qui écrivent dans le vide :
  - `src/features/notes/notesApi.ts:34` (sheet `SHEET_DAILY`)
  - `src/features/notes/notesApi.ts:49` (sheet `SHEET_WEEKLY`)
  - `src/services/phaseEngine.ts:298` (sheet `HISTORIQUE_TRANSITIONS`)
- Symptôme : la fonction logge un warning et drop silencieusement les valeurs (`void values;` ligne 303). Les notes quotidiennes/hebdomadaires et l'historique transitions de phase ne sont **plus persistés** depuis la migration Supabase.
- Cause : migration Sheets-Out V70 a laissé des callers en orphelins.
- Fix : remplacer par `enqueueInsert(table, values)` côté Supabase. Tables cibles probables : `daily_notes` (à créer), `weekly_notes` (à créer), `phase_transitions` (à vérifier dans `database.types.ts:Tables` — pas trouvé). Ou simplement supprimer ces 3 appels si la feature notes/historique n'est plus exposée à l'utilisateur.

### P1-7 · Hardcoded hex colors en inline styles (24 occurrences)
- Top fichiers :
  - `src/v70/pages/SynchronisationV70.tsx` : 7 occ (`#9f1239`, `#ecfdf5`, `#065f46`, `#92400e`)
  - `src/v70/pages/MonEquipeV70.tsx` : 8 occ (rôles `OWNER`/`ADMIN`/`PORCHER` map)
  - `src/features/ressources/AlimentsView.tsx:402-403` : `#f0c4be`, `#6b1d18`
  - `src/features/ressources/PharmacieView.tsx:354-355` : idem
  - `src/features/troupeau/TroupeauLogesListView.tsx:178, 212`
- Symptôme : DNA Terrain Vivant V76 impose `--pt-*` tokens. Ces hex dur cassent le theming et empêcheraient un éventuel dark mode.
- Fix : créer 4-5 nouveaux tokens dans `src/v70/theme/v70-global.css` :
  ```css
  --pt-rose-bg: #f0c4be;     --pt-rose-ink: #6b1d18;
  --pt-amber-ink: #92400e;
  --pt-emerald-ink: #065f46; --pt-emerald-bg: #ecfdf5;
  --pt-crimson-ink: #9f1239;
  ```
  puis `replace-all` côté inline styles. ~30 min.

### P1-8 · 7 emojis résiduels (anti-AI feel)
- `src/v70/components/v70/ExportButton.tsx:56` : `📥 {label}` dans bouton export
- `src/v70/pages/EncyclopediaPage.tsx:147` : placeholder search `🔍 Rechercher un article...`
- `src/v70/pages/AnimalsV70.tsx:356` : placeholder search `🔍  Rechercher ${...}`
- `src/features/tables/bandes/BandeDetailView.tsx:866` : `{p.sexe === 'M' ? '♂' : '♀' : '?'}` (Unicode genre — cas spécial)
- `src/features/troupeau/SaillieSuiviPanel.tsx:348, 368` : `'⚠ Saillie marquée Non confirmée…'` (toast warning)
- `src/v70/components/v70/EduCard.tsx:4` : commentaire « remplace l'emoji 💡 par Lightbulb » (ironique — emoji dans le commentaire)
- Fix : remplacer par Lucide icons (`Download`, `Search`, `AlertTriangle`). Pour `♂/♀` : valider avec Christophe — Unicode acceptable pour le sexe biologique en GTTT, ou `<MaleIcon />` Lucide.

### P1-9 · Apostrophes ASCII dans copy française (221 occ, 64 fichiers)
- Top : `OnboardingWizard.tsx` (22 occ), `TruieDetailView.tsx` (13), `ChecklistFlow.tsx` (9), `ChatbotWidget.tsx` (9), `SaillieSuiviPanel.tsx` (9), `AuditView.tsx` (8), `VerratDetailView.tsx` (8).
- Symptôme : `l'éleveur`, `d'aliment`, `n'a`, `j'ai` au lieu de `l'éleveur`, `d'aliment`, etc. Trahit le « AI 2026 feel » (les humains tapent ASCII en saisie rapide, mais la finition designer impose l'apostrophe typographique).
- Fix : script `gsed -i "s/\(l\|d\|n\|j\|qu\|s\|m\|t\|c\)'/\1’/gI"` ciblé sur copy uniquement (pas le code TS — risque de casser `import 'foo'`). Plus prudent : passe ESLint custom rule (existant : `eslint-rules/`).

---

## P2 — Polish

### P2-1 · `TopBarSync` `crumbs={[]}` orphelins (4 fiches détail)
- Fichiers :
  - `src/features/troupeau/TruieDetailView.tsx:512-513`
  - `src/features/troupeau/VerratDetailView.tsx:196-197` (et `:138-139` un cas avec crumbs)
  - `src/features/troupeau/LogeDetailView.tsx:207-208`
  - `src/features/tables/bandes/BandeDetailView.tsx:355-356`
- Symptôme : Sprint 4 a déplacé le breadcrumb dans `<header className="ph">`. `TopBarSync crumbs={[]}` devient un wrapper vide qui ne rend que le badge ferme + sync indicator.
- Note : `TopBarSync` est `@deprecated` (cf. ligne 33 du fichier).
- Fix : extraire `<FarmBadge />` + `<SyncIndicator />` en composants autonomes, supprimer `TopBarSync` du codebase. ~2h. Faible priorité (visuellement OK aujourd'hui).

### P2-2 · Mix `--font-*` vs `--pt-font-*` dans inline styles
- Fichiers concernés :
  - `src/v70/components/PorceletGroup.tsx:91, 103, 158` : `var(--font-heading)`, `var(--font-mono, monospace)`
  - `src/v70/pages/MonEquipeV70.tsx:169, 221, 268, 411, 452, 556, 633` : `var(--font-heading)`, `var(--font-body)`
  - `src/v70/pages/ReglagesV70.tsx:237` : `var(--font-body)`
  - `src/v70/pages/EncyclopediaPage.tsx:156` + `AnimalsV70.tsx:363, 423, 449` : `var(--font-body, inherit)` ou `inherit`
- Symptôme : convention V76 = `--pt-font-display`, `--pt-font-body`, `--pt-font-mono`. Les tokens `--font-*` sont des alias hérités V44. Fonctionne en runtime (CSS fallback dans `:root`) mais incohérent.
- Fix : `gsed -i 's/--font-heading/--pt-font-display/g; s/--font-body/--pt-font-body/g; s/--font-mono/--pt-font-mono/g'` sur ces fichiers. ~15 min.

### P2-3 · Hardcoded font-family dans `PhotoGallery` & `PhotoUpload`
- `src/v70/components/v70/PhotoGallery.tsx:294, 313, 350` : `fontFamily: "'BigShoulders', system-ui, sans-serif"` (et `'DMMono', monospace`)
- `src/v70/components/v70/PhotoUpload.tsx:182` : idem
- Symptôme : noms de polices en dur — duplique la définition de `--pt-font-display`.
- Fix : remplacer par `var(--pt-font-display)` / `var(--pt-font-mono)`. ~5 min.

### P2-4 · Pharmacie tabs : aria-label individuel sans count
- Fichier : `src/features/ressources/PharmacieView.tsx:441-460`
- Symptôme : `<nav role="tablist" aria-label="Catégorie pharmacie">` est OK, mais les `<button role="tab">` enfants n'exposent pas le count par catégorie en a11y (le DS Tabs `src/design-system/components/index.tsx:286` le fait avec `aria-label={...· count}`).
- Fix : ajouter `aria-label={`${t.label} · ${tabs.find(...).count}`}` ou migrer vers `<Tabs>` du DS.

### P2-5 · `it.skip` dans `TruieDetailView.test.tsx` (5 tests)
- Fichier : `src/features/troupeau/TruieDetailView.test.tsx:262, 288, 297, 305, 354`
- Symptôme : 5 tests skippés tous documentés `// SKIP: feature retirée v6 …`. Pas un bug, mais accumule du cruft.
- Fix : `it.skip` → suppression des tests + ajouter une note dans `decisions.md` historique. ~10 min.

### P2-6 · `is_retour_chaleur` mentionné dans le brief mais n'existe nulle part
- Vérifié : `grep -r is_retour_chaleur src/ migrations/ supabase/` retourne 0 résultat.
- Note : la logique métier (`alertEngine.checkRetourChaleur`, `handleRetourChaleur`, `showRetourChaleur`) existe dans `TruieDetailView.tsx`. Mais aucune **colonne SQL** `is_retour_chaleur`. Probablement une fausse piste de l'orchestrateur ou colonne supprimée.
- Action : RAS, à confirmer avec brief précédent.

---

## Annexes

### A. Hooks order (4 fiches détail vérifiées)

| Fichier | Pattern | État |
|---------|---------|------|
| `TruieDetailView.tsx` | hooks 131-292 → early returns 294, 304, 316 | OK (perfEco useMemo:284 avant returns — fix orchestrateur tenu) |
| `VerratDetailView.tsx` | hooks 106-122 → early returns 124, 134, 165 | OK |
| `LogeDetailView.tsx` | hooks 71-155 → early returns 157, 174 | OK |
| `BandeDetailView.tsx` | hooks 64-339 → return JSX 353 (pas de early return — guard externe dans `BandeDetailRouteV70`) | OK |
| Pages V70 (Today/Animals/Repro/Performance/MaFerme/MonEquipe/Reglages/Synchronisation) | tous hooks groupés en haut | OK — RAS |

### B. Imports legacy résiduels (`AgritechLayout` / `KpiCardV6` / `agritech-heading`)

| Fichier | AgritechLayout | KpiCardV6 | agritech-heading |
|---------|---------------|-----------|------------------|
| `src/App.tsx` | x | | |
| `src/components/SystemManagement.tsx` | x | | |
| `src/features/admin/AdminDashboard.tsx` | x | x | |
| `src/features/controle/AuditView.tsx` | x | | x |
| `src/features/controle/ChecklistFlow.tsx` | x | | x |
| `src/features/controle/ControleQuotidien.tsx` | x | | x |
| `src/features/help/AideView.tsx` | x | | |
| `src/features/outils/OutilsView.tsx` | x | | |
| `src/features/pilotage/FinancesView.tsx` | (cmt) | | |
| `src/features/pilotage/RapportFinancierView.tsx` | x | | |
| `src/features/protocoles/ProtocolsView.tsx` | x | | x (3) |
| `src/features/ressources/PlanAlimentationView.tsx` | x | | |
| `src/features/tables/TableView.tsx` | x | | |
| `src/features/tables/AlertsView.tsx` | (cmt) | (cmt) | |
| `src/features/tables/bandes/BatchWeaningModal.tsx` | | | x |

`(cmt)` = simple commentaire JSDoc « plus d'AgritechLayout » sans import effectif. Total **12 imports actifs**.

### C. Emojis résiduels (7 occurrences)

| Fichier | Ligne | Emoji | Contexte |
|---------|-------|-------|----------|
| `src/v70/components/v70/ExportButton.tsx` | 56 | 📥 | label bouton |
| `src/v70/components/v70/EduCard.tsx` | 4 | 💡 | commentaire JSDoc (faux positif) |
| `src/v70/pages/EncyclopediaPage.tsx` | 147 | 🔍 | placeholder input |
| `src/v70/pages/AnimalsV70.tsx` | 356 | 🔍 | placeholder input |
| `src/features/tables/bandes/BandeDetailView.tsx` | 866 | ♂/♀ | sexe porcelets (Unicode acceptable) |
| `src/features/troupeau/SaillieSuiviPanel.tsx` | 348 | ⚠ | toast warning |
| `src/features/troupeau/SaillieSuiviPanel.tsx` | 368 | ⚠ | toast warning (filtre ack) |

### D. Couleurs hardcoded (24 occurrences)

| Fichier | Lignes | Couleurs |
|---------|--------|----------|
| `src/v70/pages/MonEquipeV70.tsx` | 31-40, 503 | `#2d4a1f`, `#cce0bf`, `#6b4910`, `#f4dcb6`, `#92400e`, `rgba(244,162,97,0.18)`, `#1f2937`, `rgba(31,41,55,0.08)`, `#a4453d` |
| `src/v70/pages/SynchronisationV70.tsx` | 91-97, 259-261, 326, 391, 413, 476 | `#92400e`, `#ecfdf5`, `#065f46`, `#9f1239` |
| `src/features/ressources/AlimentsView.tsx` | 402-403 | `#f0c4be`, `#6b1d18` |
| `src/features/ressources/PharmacieView.tsx` | 354-355 | `#f0c4be`, `#6b1d18` |
| `src/features/cycles/PhaseBanner.tsx` | 51 | `#fff` |
| `src/features/troupeau/TroupeauLogesListView.tsx` | 178, 212 | `#f5efe2`, `#fff` |
| `src/features/pilotage/AuditPrintTemplate.tsx` | 62 | `#ffffff` (template print — OK) |

### E. Apostrophes ASCII (221 occ — top 25 fichiers)

| Fichier | Occurrences |
|---------|------------:|
| `src/features/onboarding/OnboardingWizard.tsx` | 22 |
| `src/features/troupeau/TruieDetailView.tsx` | 13 |
| `src/features/controle/ChecklistFlow.tsx` | 9 |
| `src/features/chatbot/ChatbotWidget.tsx` | 9 |
| `src/features/troupeau/SaillieSuiviPanel.tsx` | 9 |
| `src/features/controle/AuditView.tsx` | 8 |
| `src/features/troupeau/VerratDetailView.tsx` | 8 |
| `src/v70/pages/PerformanceV70.tsx` | 7 |
| `src/v70/pages/SynchronisationV70.tsx` | 7 |
| `src/features/onboarding/PorceletsReorgWizard.tsx` | 7 |
| `src/v70/pages/MonEquipeV70.tsx` | 6 |
| `src/v70/pages/AnimalsV70.tsx` | 6 |
| `src/v70/pages/TodayV70.tsx` | 6 |
| `src/features/tables/bandes/BandeDetailView.tsx` | 6 |
| `src/v70/components/v70/PushNotifToggle.tsx` | 5 |
| `src/v70/pages/ReproV70.tsx` | 5 |
| `src/features/onboarding/OnboardingV2Wizard.tsx` | 5 |
| `src/v70/components/v70/EntityNotFoundGuard.tsx` | 4 |
| `src/v70/pages/ReglagesV70.tsx` | 4 |
| `src/features/admin/AdminDashboard.tsx` | 4 |
| `src/features/help/AideView.tsx` | 4 |
| 43 autres fichiers | 1-3 chacun |

### F. Code mort (composants Sprint 8 non utilisés)

| Composant | Fichier | Tests | Importé par |
|-----------|---------|-------|-------------|
| `Toast` | `src/v70/components/v70/Toast.tsx` | oui | personne (sauf barrel) |
| `Dialog` | `src/v70/components/v70/Dialog.tsx` | oui | personne (sauf barrel) |
| `LongPressSheet` | `src/v70/components/v70/LongPressSheet.tsx` | oui | personne (sauf barrel) |
| `MariusChatFullscreen` | `src/features/chatbot/MariusChatFullscreen.tsx` (704 L) | non | personne |

### G. Routes V70 — vérification câblage

Tous les imports lazy de `V70Routes.tsx` ciblent un fichier source existant. Aucun `MISS`. Routes principales :
- `/today`, `/troupeau/*`, `/reproduction/*`, `/performance/*`, `/reglages*` : OK
- `/troupeau/truies/:id`, `/verrats/:id`, `/bandes/:bandeId`, `/loges/:id` : OK
- `/troupeau/porcelets/:id` : **n'existe pas** (cf. P1-5)
- `/marius` : **n'existe pas** (cf. P1-1)
- `/alerts` : OK (page détail) — `/alertes` redirige vers `/today` (intentionnel)
- 9 redirects legacy V44/V45 → V70 actifs (cycles, pilotage, repro, more, admin, aide, notes, plus, outils)

### H. Backend / Supabase

#### Migrations
- `supabase/migrations/` : 3 fichiers récents (2026_05_08).
- `migrations/` (legacy, racine) : ~30+ fichiers historiques.
- `nom_ferme` : déclaré dans `migrations/2026_05_02_v23_onboarding.sql:24`. OK.
- `is_retour_chaleur` : **introuvable** partout (cf. P2-6).

#### `database.types.ts`
- Fichier : `src/types/database.types.ts` (2004 L) — présent et substantiel.
- Tables typées : `admin_logs`, `adoptions`, `alert_dismissals`, `batch_sows`, `batches`, `boars`, `daily_checks_mb`, `farm_members`, `farms`, `feed_consumption_logs`, `feed_inventory`, `finances`, `fournisseurs`, `health_logs`, `loge_movements`, `loges`, `notes`, `pesee_planifiees`, `pesees`, `plan_alimentation`, `porcelets_individuels`, `produits_aliments`, `produits_veto`, `profiles`, `push_subscriptions`, `saillies`, `sessions_pesee`, `sows`, `troupeaux`, `vet_inventory`, `weight_distributions`. (~31 tables)
- Vues / RPC : `is_member_with_role`, `match_notes`.
- Pas de `phase_transitions` typé — confirme P1-6.

#### `enqueueAppendRow` callers (3, no-op)
- `src/features/notes/notesApi.ts:34` — sheet `SHEET_DAILY` (drop)
- `src/features/notes/notesApi.ts:49` — sheet `SHEET_WEEKLY` (drop)
- `src/services/phaseEngine.ts:298` — sheet `HISTORIQUE_TRANSITIONS` (drop)

### I. Tests skippés (5)

Tous dans `src/features/troupeau/TruieDetailView.test.tsx` (lignes 262, 288, 297, 305, 354). Tous documentés `// SKIP: feature retirée v6` (Reproduction MB prévue, 4 quick-actions, Sevrer button, Confirmer MB button, Détecter chaleur button). Cohérent avec la refonte v6 du SowHero. Cleanup recommandé en P2.

### J. Tests rouges (4 — P0)

`src/design-system/hooks/usePageFab.test.ts` :
- Ligne 9-22 : `it.each(['/troupeau', '/troupeau/', '/troupeau/truies', ...])` — 3 paths attendent `true` mais reçoivent `false`.
- Ligne 58-63 : `usePageFab() sur /troupeau` — attend `true`, reçoit `false`.

Cause : `usePageFab.ts:38` ajoute `^/troupeau/?$` dans `FAB_DISABLED_PATHS`. Le code a évolué, les tests pas.

---

## Métriques globales

| Indicateur | Valeur |
|------------|-------:|
| Total .tsx (hors tests) | 254 |
| Features files | 54 |
| V70 files | 42 |
| LoC fiches détail (4) | 3 918 |
| Bugs P0 | 1 |
| Points P1 | 9 |
| Polish P2 | 6 |
| Effort estimé total | ~14-18h |

---

## Verdict

V76 est **structurellement saine** : tsc passe, build passe en 2.88s, hooks-order OK sur les 4 fiches critiques, DNA Terrain Vivant solide sur les fiches détail et les pages V70. Les vraies dettes sont (1) la migration `AgritechLayout` qui isole 12 vues secondaires hors de la refonte, (2) le code mort Sprint 7-8 qui doit être câblé OU supprimé, (3) le P0 tests qui doit être réglé en 30 min avant de pouvoir prétendre à la « ceinture verte ». Une fois ces 3 points traités, la prochaine vague (audit visuel anti-AI itératif, cf. mémoire `feedback_anti_ai_aesthetic.md`) peut démarrer.

---

=== VERIFICATION ===

[1] Rapport créé
$ wc -l docs/handoff/audit-2026-05-10/AUDIT-SENIOR-V76.md
(à exécuter après écriture)

[2] Sections couvertes (cocher)
- [x] Hooks order
- [x] Imports legacy
- [x] Anti-AI feel (emojis/colors/fonts/apostrophes)
- [x] Backend/Supabase
- [x] Tests skippés
- [x] Routes
- [x] Code mort

[3] Métriques
- Total bugs P0 trouvés : 1
- Total points P1 : 9
- Total polish P2 : 6
- Effort estimé refonte cumulé : ~14-18 heures

[4] Type-check
$ npx tsc --noEmit
EXIT=0 (vide, aucune erreur)

[5] Tests
$ npm run test:unit 2>&1 | grep -E "Test Files|Tests "
 Test Files  1 failed | 164 passed (165)
      Tests  4 failed | 1990 passed | 5 skipped (1999)

[6] Build
$ npm run build 2>&1 | tail -1
✓ built in 2.88s
