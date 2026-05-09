# Journal — PorcTrack 8

> Journal chronologique des sessions et vagues de développement.
> Chaque entrée résume ce qui a été livré, les commits, les tests, les écarts.
> L'agent met à jour ce fichier à la fin de chaque session.

---

## Format type

```
## YYYY-MM-DD · [Vague] Titre court · commit `xxxx`
**Livré** :
- ...
**Tests** : N pass · delta +X
**Écarts/notes** : ...
**Liens** : [[decisions]] · [[blockers]] · [[learnings]]
```

---

## 2026-05-08 · [V71-P3] Audit mobile + Wizards bloquants + Trigger DB + Toast · commits `bb0d069`→`0e79c98`

**Contexte** : Session reprise après V71-P2 (multi-user schema + landing-v2). User a demandé audit mobile complet sur fiches individuelles + correction de tous les bugs identifiés + wizard onboarding obligatoire pour nouveaux users + workflow ré-organisation porcelets pour Christophe (compte EasyFarm K13 a 13 bandes orphelines de mère après migration depuis ancienne app).

**Livré (8 commits, +1100/-30 nets)** :
- `bb0d069` Fix mobile fiches détail (FAB chevauchement, `—` orphelin nom, séparateur orphelin)
- `c1dd7c2` Fix mobile UX (tabs scroll mask gradient, saisir-sheet wrap, alerts grid responsive 4→2 cols)
- `096d354` **PorceletsReorgWizard** + migration DB `loges.repartition` (MIXTE/MALES/FEMELLES/NA) + sync data Christophe (10 bandes ont récupéré leur loge text)
- `473acf1` Trigger DB `set_sow_pleine_on_saillie` AFTER INSERT (truie auto-Pleine post-saillie) + VITALES filter cohérent
- `0731510` Toast feedback unifié (ToastProvider + useToast hook) + cleanup gitignore PorcTrack8/
- `ff060e9` **OnboardingV2Wizard 5 étapes** obligatoire (Type/Cheptel/Races/Infrastructure/Confirmation) avec génération auto DB cascade (truies T-001..., verrats V-001..., cases mat M-01..., loges PS/Eng) + farms.metadata onboarding_v2 + backfill 7/7 users existants en auto-skip-v1
- `0e79c98` Export JSON 14 portées Excel SUIVI_FERME_A130 → docs/data/

**Sub-agents Opus 4.7 dispatchés (3 en parallèle final)** :
- Vague A : Toast sur 5 forms restants (Mise-bas/Soin/Pesée/Note/Mortalité)
- Vague B : UI switcher multi-farm + invitation membre dans MonEquipe
- Vague C : Tests E2E Playwright (signup→onboarding, saillie complète, multi-user RLS)

**Tests** : 1742 passing baseline préservée (avant et après chaque fix). tsc 0 erreur. Build OK (~3 sec).

**Migrations DB appliquées (3)** :
- `v71_p3_loges_repartition` : ALTER + backfill heuristique
- `v71_p3_auto_pleine_on_saillie` : trigger + helper SECURITY DEFINER
- `v71_p3_onboarding_v2_metadata` : ALTER farms + backfill auto-skip-v1

**Why** : User commence à voir l'app comme un produit propre, doit ouvrir aux nouveaux users (onboarding obligatoire avec génération auto data) tout en réparant l'historique de Christophe (porcelets-reorg). L'objectif final : ferme K13 production-ready + nouveaux signups frictionless.

**How to apply** :
- Pour Christophe (`bc96ddbd-c34d-46b1-b624-4a3dca181a2c`) : à sa prochaine connexion sur prod, OnboardingV2Gate skip auto, PorceletsReorgGate redirige vers /porcelets-reorg, il choisit mère + loge pour les 13 bandes (référence visuelle : docs/data/SUIVI_FERME_A130_portees.json).
- Pour nouveaux users : OnboardingV2Gate redirige vers /onboarding-v2 5 étapes obligatoires.
- Aucune migration DB additionnelle requise pour utiliser ces wizards.

**Liens** : [[learnings#trigger-rls-pattern]] · [[decisions#wizards-bloquants-V71P3]]

---

## 2026-05-08 · [V71-P2] Multi-user schema + landing-v2 fix + Verrat refonte + DESIGN.md · commits `43ac792`→`746623b`

**Contexte** : Reprise du brief d'hier (récap user : 5 priorités après 13 chantiers livrés en V71-P1). HEAD pré-session `f8f3481` (rollback / vers Landing classique car scrollytelling P2 buggé). Sub-agents Opus 4.7 utilisés en parallèle (3 dispatches : designer-pilot bloqué Edit, supabase-ops design, dev-troupeau frontend MVP).

**Livré (4 commits, +1551 / -53 nets)** :
- `43ac792` Fix scrollytelling /landing-v2 → bascule `/` :
  - Cause titres invisibles : `gsap.from(titleEl, {opacity:0})` + `immediateRender:true` (défaut) → fige opacity:0 si ScrollTrigger échoue à trigger (Lenis + override Ionic + sticky + refresh tardif). Fix : passage à `gsap.fromTo` + `immediateRender:false` + `toggleActions` (SceneFrame, SceneHero, SceneBandes).
  - Cause sticky cassé : `body.style.overflow = 'auto'` dans useScrollUnlock créait un scrolling container interne qui devenait le scope des `position:sticky` des Scenes → fix via `body.overflow:visible`. Aussi `overflowX:hidden` du wrapper root forçait `overflow-y:auto` (CSS spec) → fix via `overflowX:clip`.
  - Tracking git de `supabase/migrations/20260508_rls_quickwins.sql` + `supabase/functions/marius-chat/index.ts` (déjà appliqués prod) + `_DRAFT_v71_multi_user_schema.sql` (563 lignes designé par sub-agent supabase-ops Opus 4.7).
- `ff54a98` Apply migration V71-P2 multi-user via MCP (`20260508095426_v71_p2_multi_user_schema`) :
  - 2 tables (farms PK uuid, farm_members PK composite + role CHECK 'OWNER'|'ADMIN'|'PORCHER')
  - 3 helpers SECURITY DEFINER STABLE search_path locked (`user_farms(uid)`, `current_user_farms()`, `is_member_with_role(farm_id, ...roles)`)
  - 40 policies farm-scoped sur 24 tables refondues (USING `farm_id IN (SELECT current_user_farms())`)
  - handle_new_user étendu (signup crée farm + member OWNER)
  - Backfill zero-cost : farms.id = profiles.id (7 users existants → 7 farms + 7 farm_members OWNER)
  - Types Supabase régénérés (`src/types/database.types.ts` 1057→1929 lignes), 2 erreurs TS pré-existantes fixées (poids_initial_kg NOT NULL sur batches).
- `971b189` Frontend MVP multi-user + refonte Verrat :
  - FarmContext étendu : currentFarmId/availableFarms/switchFarm/currentRole, persistance kvStore `pt:current_farm_id`, useEffect dédié charge farm_members JOIN farms.
  - AuthContext.mapToLegacyRole(membershipRole, profileRole, fallback) — priorité farm_members.role > profiles.role.
  - supabaseWrites.getFarmId() : ref module-level `globalCurrentFarmIdRef` (set par FarmContext.setCurrentFarmIdRef), fallback auth.uid() si null. 103 consommateurs useFarm/useAuth/useMeta non cassés (shape additive).
  - VerratDetailView "Vue d'ensemble" → 4 cards V70 (IDENTITÉ, REPRODUCTION, JOURNAL TERRAIN, ACTIONS) alignées sur pattern TruieDetailView (`<Section label />` + div card-style inline).
- `746623b` DESIGN.md format Stitch/impeccable — formalisation V70 (248 lignes, 6 sections spec, frontmatter YAML 18 colors + 8 typo nommés + 4 components, 4 Named Rules).

**Tests** : 1739 → 1742 (+3 V71-P2 getFarmId via currentFarmIdRef). 0 régression. tsc 0 erreur. Build OK (92 entries / 3981 KiB).

**Sub-agents Opus 4.7 dispatchés (3)** :
- designer-pilot : bloqué Edit/Write par permissions sub-agent → diag fait, fix appliqué localement. Leçon : pour Edit critique, faire localement.
- supabase-ops : ✅ design draft V71-P2 (563 lignes) + audit 24 tables/40 policies/21 fichiers frontend.
- dev-troupeau : ✅ refactor frontend MVP multi-user (5 fichiers, +341/-20 lignes, 3 nouveaux tests).

**Écarts/notes** :
- Pixel-perfect V70 préservé : pas modifié les sizes typo (9/10/11/12/13/18/22/36) malgré ratios non-1.2. DESIGN.md formalise les noms (display/headline/title/body/caption/label/nav/tiny) sans toucher au code.
- Multi-user "complet" pas livré : refactor de peseePlanifieesService, mbWorkflowService, feedConsumptionAnalyzer, validationWorkflow, supabaseService, alertDismissals à faire en V71-P2 phase C (continuent via auth.uid() + RLS rétro-compat backfill pour l'instant).
- Task #7 (audit fonctionnel multi-user en condition réelle) reportée — demande 30-60 min de test 2 users browser.
- Pas push to remote (4 commits ahead `main`) — confirmation user requise.

**Liens** : [[decisions#V71-P2]] · [[learnings#scrollytelling]] · [[learnings#multi-user-rls]]

---

## 2026-05-04 · [V43.7] Cohérence DS V2 + perf CLS/LCP · commit `fcd2373`

**Contexte** : Audit prod V43.7 (chrome-devtools-mcp, 25 routes parcourues) après refactor BandeDetailView V43.6. 3 axes confirmés : vocabulaire résiduel ancienne structure, CLS élevé sur 3 pages clés, LCP bloquant `/pilotage`. Le user demande mode minutieux, zéro tolérance aux chevauchements ancienne/nouvelle structure.

**Livré** :
- **Vocabulaire DS V2** : TruieDetail breadcrumb `Troupeau`→`Élevage` + eyebrow `Fiche truie`→`Élevage · Truie` ; AlertsView eyebrow `Tables · Alertes`→`Outils · Alertes` ; SystemManagement swap eyebrow/title ; OnboardingWizard commentaires `Cheptel`→`Élevage`
- **Breadcrumb cliquable** : VerratDetailView migré du format string nu au format `[{label, href}]` cliquable, alignant TruieDetail
- **Tab nav** : `Perf` renommé `Pilotage` (alignement label/URL/h1) ; tab Élevage retire les match orphelins `/cheptel`+`/bandes` ; tab Repro ajoute `/cycles` au match (sous-vues post-sevrage/croissance/finition restent rattachées)
- **Routing** : redirects `/plus→/more`, `/troupeau/porcelets→view=porcelets` ; PendingValidationsView `navigate('/bandes')`+`'/finances'` réparés vers routes réelles
- **CLS** : TodayHub +80px reservés (confirmations + pesées async) ; CyclesHub +168px pipeline + 280px liste bandes ; TruieDetail +112px CTA mise-bas + 100px CycleTimeline
- **LCP /pilotage** : `genererRapportGlobal`+`prepareAuditSnapshot` déplacés en `useEffect`+`startTransition` + lazy init `useState` (compute synchrone au mount si data présente, async sinon — préserve les tests vitest synchrones)
- **Cleanup code mort** : suppression `CheptelView.tsx` (454L, @deprecated, 0 import) + `BandesView.tsx` (362L, @deprecated, 0 import) + commentaires App.tsx

**Tests** : 1681 pass · delta +7 vs sub-agent intermédiaire (lazy init PilotageHub a re-validé les 7 tests timeout) | 6 skipped · 136/136 Test Files

**Écarts/notes** :
- 5 "404 routes" remontés par le sub-agent d'audit étaient en partie des erreurs dans la spec d'audit que j'avais fournie (URLs `/tables`, `/perf`, `/cycles/saillie` n'ont jamais existé). J'ai documenté ce faux positif dans la réponse user.
- Le sub-agent CLS+LCP avait introduit une régression sur `PilotageHub.test.tsx` (timeout vitest worker) à cause du `startTransition` non-flushé en jsdom. Fix manuel via lazy init `useState` qui synchronise au mount quand `loading=false`.

**Files touched** : 13 src files (11M, 2D), +326/-1088 lignes (cleanup massif grâce aux 2 vues @deprecated)

**Liens** : [[decisions]] · [[learnings]] · `src/features/hubs/PilotageHub.tsx` · `src/components/AgritechNavV2.tsx`

---

## 2026-05-03 · [V38] Migration DS V2 finale · commit en cours

**Contexte** : PDF "PORCTRACK-MIGRATION-DS-V2-FINAL" reçu — plan de migration en 6 phases pour éliminer définitivement tout décalage visuel.

**Livré V38-A** (opus) :
- Fix 5 écarts test E2E DSV2 :
  - T1.1 BandeDetailView H1 sans UUID (utilise `idPortee` + `useNoUUID` guard)
  - T1.2 Tailwind `rounded-full` override `!important` 9999px (workaround bug Tailwind v4 calc(infinity))
  - T1.3 perfKpiAnalyzer matching truie ↔ saillie via UUID OU displayId OU boucle
  - T1.4 `.chip` agritech-utilities migrated `--pt-font-mono` → `--pt-font-body` (badges stade)
  - T1.5 Splitter étendu phases {SOUS_MERE, POST_SEVRAGE, CROISSANCE, ENGRAISSEMENT}
- 5 tokens `--pt-*` ajoutés (surface-warm, surface-warning, accent-deep, primary-soft, shadow-fab)
- Section/Empty/usePageFab wrappers exportés depuis design-system/index.ts
- script `scripts/migrate-ds.sh` créé (find/replace mécanique pour usage futur)
- 3 tests régression V38-A perfKpiAnalyzer

**Livré V38-B** (manuel orchestrateur) :
- `scripts/check-ds-compliance.sh` (8 checks bash)
- `.husky/pre-commit` (bloque commit si DS violé)
- `.github/workflows/ds-compliance.yml` (CI)
- `.github/pull_request_template.md` (déjà OK V33)

**À faire** :
- [ ] Appliquer SQL UPDATE truies Gestante (V38-A T1.3 data non appliqué)
- [ ] Commit + deploy
- [ ] Test E2E final post-V38

**Tests** : 1803 → 1806 (+3 V38-A)
**Liens** : [[decisions#V36]] · [[blockers#Tailwind]] · [[evals#V38]]

---

## 2026-05-03 · [V36] 5 bras armés parallèles · commit `5b37563`

**Livré** :
- V36-A : 4 bugs P0 (R12 INACTIVE_LONG, ROI 357%, 0/50 productives, porcelets 11→10) + 5 KPIs zoo (ICR / GMQ / IC / Marge / Mortalité par phase)
- V36-B : ~20 fichiers monospace cleanup
- V36-C : ESLint rule `no-uuid-jsx`
- V36-D : Migration `short_code` sur produits_veto + produits_aliments + service étendu
- V36-E : QuickSplitBandeForm Wizard 3 étapes + détection doublons boucles UI

**Tests** : 1739 → 1803 (+64)
**Liens** : [[decisions#V36-A]] · [[learnings#parallèle]]

---

## 2026-05-03 · [V35] Fix résiduels DSV2 · commit `a17d009`

**Livré** :
- T1 Plus DMMono purge (16 → 3, codes purs uniquement)
- T2 Bouton "Se déconnecter" pill destructive (variant `destructive` ajouté Button DS)
- T3 About rôles équipe RoleTag local Instrument Sans
- T4 Bottom-nav réordonné (Outils avant Perf)
- T5 /design-system 16/16 (AlertGroup + Wizard + FAB ajoutés showroom)
- T6 Ionicons `informationCircle` registered (purge 6 warnings)
- T7 BONUS 4 Quick*Form (TruieAdd/PorceletAdd/Edit/LogeAdd) -27 monospace

**Tests** : 1739 stable
**Liens** : [[decisions#V35]] · [[learnings#fonts]]

---

## 2026-05-03 · [V34] Mono cleanup massif · commit `33e66c4`

**Livré** : -39 fichiers, -105 occurrences `font-mono` (auth, design, agritech, ui, public pages)
**Tests** : 1739 stable
**Liens** : [[decisions#mono-règle-6]]

---

## 2026-05-03 · [V33] DS COMPLETION · commit `1b5ede0`

**Livré** :
- 7 nouveaux composants V33 (Segment, Chip, Search, ListItem, ActionRow, Stat, StatsGrid)
- Page `/outils` (5ème onglet bottom-nav)
- Page Plus épurée (sans outils métier)
- `.github/pull_request_template.md`
- `.claude/BRIEF_AGENTS_IA.md`

**Tests** : 1674 → 1739 (+65)
**Liens** : [[decisions#16-composants]] · [[evals#PDF-DS-v2]]

---

## 2026-05-02-03 · [V25-V32] Vagues majeures (résumé)

**V25-V27** : Pesée christophe (117 porcelets) + workflow MB + Wizard onboarding + PendingBandesView
**V28** : CTA Confirmer MB + Daily Check + cleanup legacy + audit 20pts + compte test permanent
**V29** : 5 composants V29 + cleanupOutdatedCaches PWA + htaccess strict
**V30-MASTER** : Tokens `--pt-*` + override Ionic + Phase 3 TroupeauHub
**V31-FIX-PACK-01** : Audit refait + UUIDs bannis + FAB rond contextuel
**V32** : 4 bugs P0 + fiche truie 4 onglets + Wizard 3 étapes

**Tests global** : 1450 → 1803 (+353 sur 9 jours)
**Liens** : [[decisions]] · [[learnings]] · [[blockers]]

---

## 2026-05-08 · [V72] Vagues M+N+O+P4 — push backend, queue 6 tables, Marius dynamique, wizard 2-loges · commit `93e8871`

**Livré** (4 sub-agents Opus 4.7 dispatched parallèle + 1 debugger) :
- **Vague M** — extension `offlineQueue` 6 tables (pesees/porcelets_individuels/loges/loge_movements/daily_checks_mb/feed_consumption_logs). 9 helpers thin pattern runInsert/runUpdate dans supabaseWrites. Wizard migré.
- **Vague N** — Marius suggestions dynamiques. 8 règles métier (mise-bas imminente, rupture stock, retour chaleur, écho, alertes critiques, surdensité, sevrage proche, fallback). Remplace HINTS statiques.
- **Vague O** — Push backend complet. Table `push_subscriptions` + Edge Function `send-push` (VAPID/web-push@3.6.7) + frontend `pushSubscription.ts` + SW handler `push-handler.js` + UI `PushNotifToggle` Réglages.
- **V72-P4** — refonte wizard `PorceletsReorgWizard` selon scénario éleveur Christophe. Migration `porcelets_individuels.loge_id` (1 bande peut occuper 2 loges F+M). Wizard 5 étapes : sélection → numéro libre → truie/verrat optionnel → loge1 (F/M/Mixte) → loge2 optionnelle → confirm. BandeDetailView multi-loges via `listLogesEffectivesParBande`.

**Reset DB Christophe** (`bc96ddbd-c34d-46b1-b624-4a3dca181a2c`) — 5 loges supprimées + backup `farms.metadata.v72_p4_reset_loges_bandes_backup`. État final : 0 loge / 0 batch / 117 porcelets vrac (batch_id NULL) / 117 pesées / 17 truies / 2 verrats / 10 saillies. Wizard auto-redirect au prochain login.

**Bug "Bande introuvable"** — diagnostiqué via sub-agent debugger : pas un bug code mais cache PWA stale + 0 batch DB. Les "4" affichées = 4 truies "En maternité" rendues comme portées dérivées avec liens vers fiche bande inexistante.

**Tests** : 1840 (Vague N) → 1855 (M) → 1866 (O) — +42 sur baseline pré-V72 (1824)
**TSC** : 0 erreur (3 erreurs offlineQueue.tables.test.ts fixées via type des mocks)
**Build** : OK 2.88s, PWA 95 entries

**Actions manuelles à charge user** : `node scripts/gen-vapid-keys.mjs` + configurer `VITE_VAPID_PUBLIC_KEY` (.env.local) + `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` (Dashboard Supabase Edge Functions secrets).

**Audit UI public** : login/landing-v2/a-propos/signup/privacy DNA V70 OK. 1 typo détectée à corriger ("FROISSEES" → "FROISSÉES" sur landing).

**Liens** : [[decisions#bande-2-loges]] · [[decisions#numero-bande-libre]] · src/features/onboarding/PorceletsReorgWizard.tsx · src/services/pushSubscription.ts

---

## 2026-05-08 · [V73] Vagues P+Q+R — landing 13 images + crash hardening + photos · commit `5709fbd`

**Livré** (3 sub-agents Opus 4.7 dispatched parallèle) :
- **Vague P** — Refonte landing-v2 avec 13 images premium photoréalistes (DNA "Terrain Vivant" : bois clair + inox + caillebotis béton). Compression sharp+mozjpeg ~30x (115MB → 3.7MB). Hero/repro/alertes/alimentation/Marius orb/avatars Truie+Verrat/empty states. Manifest PWA + OG meta. Fix typo "FROISSEES" → "FROISSÉES" (CSS uppercase + BigShoulders dépouillait accents → fix par écriture directe majuscules accentuées source).
- **Vague Q** — Tests crash + robustesse webapp pré-launch multi-utilisateurs. 2 bugs P1 fixés : (1) mutex `_inFlight` queue (coalesce flushs concurrents en network flapping) ; (2) cap 1000 items queue + `QueueFullError` (anti-saturation Preferences 4MB Android). Audit RLS : 0 table critique sans policy. 5 issues P2 backlog : SECURITY DEFINER REVOKE, search_path SET, leaked_password_protection toggle, vector ext move, optimistic locking truies multi-users.
- **Vague R** — Module photos webapp PWA. `browser-image-compression@2.0.2` + `heic2any` lazy. Bucket `farm-photos` étendu (1MB → 5MB + HEIC/HEIF) + 3 RLS V73 (INSERT/UPDATE/DELETE par farm_id). Service `uploadEntityPhoto/deleteEntityPhoto/listEntityPhotos`. Composants `<PhotoUpload>` (drag&drop + capture caméra) + `<PhotoGallery>` (lightbox + swipe + suppression confirmée). Intégrés Truie/Verrat/Bande/Loge DetailViews. Path : `<farm_id>/<entity_type>/<entity_id>/<uuid>.webp`.

**Tests** : 1866 → 1898 passing (+32 stress/race + photos). tsc OK 0 erreur. Build 2.95s.
**Bundle impact** : +30-50KB gzip sans HEIC, +400KB conditionnel HEIC. Acceptable.

**Compte audit identifié** : `audit-final@porctrack.test` / OWNER / "Ferme Audit Test" — à utiliser pour audit UI authentifié en suivant.

**Bugs pré-existants signalés non bloquants (à fixer en V74)** :
- `index.html` référence `/manifest.webmanifest` mais fichier réel = `/manifest.json`
- 3 images surplus 5_58PM* dans `~/Downloads/` (variantes hero/alertes/repro non utilisées)
- `EntityAvatar useV73Defaults` opt-in (false par défaut, activé Truie+Verrat xl uniquement)
- Empty states V73 branchés Animaux + Alerts (Today/Bandes/Loges en suivant)

**Liens** : [[decisions#bande-2-loges]] · src/services/photoUpload.ts · src/v70/components/v70/PhotoUpload.tsx · src/services/offlineQueue.ts:525-535

---

## 2026-05-09 · [V74-V] Vague V — loading guards listings + signaux cancelled async · commit `229b942`

**Livré** (1 session orchestrateur, suite logique de V74-U `2874558`) :

- **Pattern listings** : nouveau hook `src/hooks/useListingLoadingGuard.ts` (36L) + composant partagé `src/components/design/ListingSkeleton.tsx` (44L). Élimine la classe de bug "faux empty state" pendant le chargement initial du FarmContext (items=[] vu avant `refreshAll()`, "Aucune truie" affiché 1-2s puis 50 truies surgissent). Le hook retourne `true` tant que `loading=true` ; en `loading=false` + `count=0` on laisse l'appelant afficher son empty state légitime.

- **6 listings refactorés** : TroupeauTruiesView, TroupeauVerratsView, TroupeauPorceletsView, AnimalsV70 (onglets bandes/loges uniquement — truies/verrats restent stubs cosmétiques), PerformanceV70 (Top performances), TodayV70 (registre alertes).

- **9 useEffect async durcis** avec signal `{ cancelled: false }` (pattern uniforme cleanup) : PhotoStrip, PhotoGallery, EncyclopediaArticle, AdminDashboard (LogsPanel + main), PendingValidationsView, FournisseursView, LogeDetailView, PoidsTriView, TroupeauLogesListView. Évite warnings React "setState on unmounted" + fuites mémoire en navigation rapide.

- **Tests** : nouveau `useListingLoadingGuard.test.ts` (47L, 5 cas) + `PhotoGallery.cancelled.test.tsx` (60L, vérifie absence de warning console.error via mock photoUpload). 4 snapshots ajustés.

**Tests** : 1898 → 1910 passing (+12). 0 régression. tsc OK 0 erreur. Build 3.08s, PWA 103 entries.

**Liens** : src/hooks/useListingLoadingGuard.ts · src/components/design/ListingSkeleton.tsx · [[learnings#cancelled-signal-pattern]]

---

## 2026-05-08 · [V74] Vagues S+T — sécurité Supabase + empty states finalisés · commit `8d23a3d`

**Livré** (2 sub-agents Opus 4.7 dispatched parallèle) :
- **Vague S** — Backlog P2 sécurité Supabase. Audit advisor 11 → 6 WARN. Migrations appliquées :
  - `v74_security_search_path` : 4 fonctions (`set_updated_at`, `match_notes`, `tg_push_subs_touch_updated_at`, `get_user_role`) sécurisées avec `SET search_path = public, pg_temp`
  - `v74_security_vector_schema` : extension `vector` déplacée `public` → `extensions` schema
  - `v74_security_revoke_helpers` : ROLLBACK obligé. Le REVOKE des 5 SECURITY DEFINER helpers (`current_user_farms`, etc.) cassait RLS car les policies utilisent `farm_id IN (SELECT current_user_farms())` — la sous-requête s'exécute dans le role appelant `authenticated`, pas en SECURITY DEFINER. Test critique a déclenché rollback automatique — **bon comportement**.

- **Vague T** — Empty states V73 finalisés + fix manifest pré-existant :
  - `TodayV70.tsx` : image `aucune-alerte.webp` au-dessus du texte "Carnet vide"
  - `AnimalsV70.tsx` : empty states différenciés bandes/loges/truies (désactivation des stubs hardcodés 6 fausses bandes / 5 fausses loges)
  - `TroupeauLogesListView.tsx` : remplacement `<EmptyState>` minimal par pattern V73 immersif
  - **Fix manifest** : suppression `public/manifest.json` orphelin (jamais référencé). `index.html` pointait déjà sur `/manifest.webmanifest` généré par vite-plugin-pwa. Renforcement `vite.config.ts` avec icones PNG 192/512/maskable + `lang: 'fr'`.

**Tests** : 1898 stable (0 régression). tsc OK. Build 2.96s.

**Backlog V75** (décisions architecturales requises) :
- 5 SECURITY DEFINER helpers : trancher entre Option A (move to `private` schema, ~20 policies à réécrire), Option B (SECURITY INVOKER + SQL inline policies), Option C (accept risk — les helpers ne fuitent rien, retournent uniquement les farm_ids du caller). **Mon avis : C** sauf audit externe demandant explicitement le fix.
- Optimistic locking truies multi-users (P2 backlog UI, hors scope migration).

**Action manuelle utilisateur** :
- Dashboard Supabase → Authentication → Settings → **Enable HaveIBeenPwned check** (anti-passwords leaked)

**Liens** : [[decisions]] · vite.config.ts · src/v70/pages/TodayV70.tsx · src/v70/pages/AnimalsV70.tsx · src/features/troupeau/TroupeauLogesListView.tsx

---
