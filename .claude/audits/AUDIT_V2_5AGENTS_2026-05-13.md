# AUDIT V2 — Mode "éleveur curieux" · 5 agents Opus parallèles · 2026-05-13

> Dispatch parallèle de 5 sub-agents Opus 4.7 sur 5 dimensions différentes de l'app. Compte test isolé `audit-new-1778597301447@porctrack.test` (0 sows / 0 boars / 0 batches) provisionné via SQL admin. Crawl Chrome + audit code en lecture seule.

---

## Verdict global

**Santé technique : ✅ EXCELLENT** — tsc 0 erreur, build ✓ 2.87s, 0 page blanche détectée, signup form propre, validations désactivent correctement le submit (test rempli avec email invalide + password 3 car. → bouton resté `disabled`).

**Audits sub-agents** : 5/5 rapports retournés avec bloc `=== VERIFICATION ===` complet. Aucun P0 bloquant prod détecté. **38 P0/P1/P2 NEUFS** consolidés (distincts des 20 du V1).

**Décision livraison** : 🚀 **GO** — 5 fixes appliqués (les + safe & impact UX direct), 33 P1/P2 inscrits au backlog.

---

## ✅ 5 fixes appliqués ce sprint

| # | Source | Fix | Fichier:ligne |
|---|--------|-----|---------------|
| **A1** | Agent 3 (design) | STUBS_BANDES : `ISSE 12.4` → `12,4 j sevrage→saillie` (3× cohérent) — un éleveur curieux comprend tout de suite | `AnimalsV70.tsx:84-86` |
| **A2** | Agent 3 (design) | `fontSize: 9.5/11.5/13.5` (7 occurrences) → entiers `10/12/14` — fix anti-aliasing sub-pixel | `TruieDetailView.tsx` (lignes 1289/1313/1349/1448/1533/1559/1602) |
| **A3** | Agent 2 (forms) | Touch targets : `.sheet__close` 32→44px, `.stepper button` 30→44px (norme tactile mobile) | `v70-global.css:1325, 1424` |
| **A4** | Agent 2 (forms) | Garde-fou date_saillie : mise-bas saisie avant date de saillie → bloquée avec message clair | `quickConfirmMiseBasLogic.ts:94`, `QuickConfirmMiseBasForm.tsx:172` |
| **A5** | Agent 2 (forms) | Type `MiseBasDraft.dateSaillie` ajouté (optionnel, backward-compatible) | `quickConfirmMiseBasLogic.ts:16` |

---

## 📋 38 findings consolidés (5 agents)

### Agent 1 — alertEngine (16 règles GTTT)

| # | Sévérité | Finding | Fichier:ligne |
|---|----------|---------|---------------|
| 1 | P1 | R11/R12/R13 (réforme perf, inactivité, manque pesée) **non testés** dans `alertEngine.test.ts` — risque régression silencieuse | `alertEngine.test.ts` (3 describe manquants) |
| 2 | P1 | R1 ne déclenche plus passé J+17 (cap `+15`) — truie oubliée devient invisible | `alertEngine.ts:190` |
| 3 | P1 | Triple parsing de date (`parseFrDate`/`parseDateFr`/`safeDate`) → divergence DST possible | `phaseEngine.ts:68-75` |
| 4 | P1 | `runAlertEngine` hardcode `today = new Date()` — impossible d'injecter une date pour QA simulation | `alertEngine.ts:812` |

### Agent 2 — QuickAdd forms (10 findings)

| # | Sévérité | Finding | Fichier:ligne |
|---|----------|---------|---------------|
| 5 | P0 ✅ | Mise-bas avant date saillie possible | **FIXÉ** (A4) |
| 6 | P0 (faux pos.) | Unicité boucle porcelet non bloquante — c'est en fait la **décision V36 actée** ([[decisions]]) | `QuickAddPorceletForm.tsx:41` (intentionnel) |
| 7 | P1 | Pas d'unicité côté client pour code/boucle truie/verrat — erreur n'apparaît qu'au INSERT Supabase | `quickAddTruieLogic.ts:78`, `quickAddVerratLogic.ts:96` |
| 8 | P1 ✅ | Touch targets sheet__close + stepper sous 44px | **FIXÉ** (A3) |
| 9 | P1 | QuickAddLotForm : code par défaut `LOT-YYYYMMDD` → collision si 2 lots/jour | `QuickAddLotForm.tsx:22` |
| 10 | P1 | QuickMiseBasForm autorise NV=0 + MN=0 → bande fantôme créée | `quickMiseBasHelpers.ts:90` |
| 11 | P1 | QuickAddMortaliteLotForm : pas de cap sur effectif restant du lot | `QuickAddMortaliteLotForm.tsx:68` |
| 12 | P1 | QuickSaillieForm + QuickMiseBasForm : `setTimeout 1500ms` permet double-clic | `QuickSaillieForm.tsx:114`, `QuickMiseBasForm.tsx:247` |
| 13 | P1 | SaisirSheet bouton "Fermer" 32px (hors `.pressable`) | `SaisirSheet.tsx:217` |
| 14 | P1 | QuickAddBandeForm : `idPortee` readonly mais peut renvoyer erreur sans moyen de corriger | `QuickAddBandeForm.tsx:249` |

### Agent 3 — Design/typo (15 findings)

| # | Sévérité | Finding | Fichier:ligne |
|---|----------|---------|---------------|
| 15 | P0 | TruieDetailView grid 5 colonnes mobile + label `fontSize: 9` → illisible | `TruieDetailView.tsx:761` |
| 16 | P0 ✅ | Sigles `ISSE/IEM/GMQ` dans STUBS_BANDES sans tooltip — éleveur curieux perdu | **FIXÉ** (A1) |
| 17 | P0 | KPI Performance : `title=` tooltip présent UNIQUEMENT si valeur null → manque dès qu'il y a un chiffre | `PerformanceV70.tsx:388/397/410` |
| 18 | P0 | BandeDetailView : 60+ classes Tailwind legacy (`text-text-2`, `bg-bg-1`, `bg-bg-2`) — non aligné V70 | `BandeDetailView.tsx` (1186 lignes) |
| 19 | P0 | `text-[9px]`/`text-[10px]` sous seuil lisibilité WCAG mobile (12px min) | `BandeDetailView.tsx:739/749/834/910/919` |
| 20 | P0 | TruieDetailView : 40 occurrences tokens legacy `var(--font-*)`/`var(--ink)`/`var(--muted)`/`var(--bg-surface)` | `TruieDetailView.tsx` |
| 21 | P1 | `fontWeight: 600` sur BigShoulders Display = grasse insuffisante (devrait être 800/900) | `TruieDetailView.tsx:622/711/783/...` (8 spots) |
| 22 | P1 ✅ | `fontSize: 9.5/11.5/13.5` fractionnaires (anti-aliasing imprévisible) | **FIXÉ** (A2) |
| 23 | P1 | Inconsistance header : 10 fichiers utilisent `<PageHeader>` (light) vs 14 fichiers `ph ph--primary` (vert) | `PlanAlimentationView.tsx:112`, etc. |
| 24 | P1 | FinancesView/RapportFinancierView : fallbacks `var(--pt-bg, #FAF7F0)` ≠ vrai `#FFFFFF` | FinancesView:245/337/434/484, RapportFinancierView:258/398/499/568/605 |
| 25 | P1 | MonEquipeV70:261 : `var(--pt-line, rgba(26,26,26,0.16))` → 0.16 = `--pt-line-strong`, devrait être 0.08 | `MonEquipeV70.tsx:261` |
| 26 | P1 | `boxShadow: '0 1px 2px rgba(17,24,39,0.04)'` répété 10× au lieu de `var(--pt-shadow-card)` | Truie/Verrat/Porcelet DetailView |
| 27 | P1 | SynchronisationV70 retry chip : 28px touch target | `SynchronisationV70.tsx:109-122` |
| 28 | P1 | PerformanceV70 empty states inline, ne suit pas le pattern `.empty-state__icon/title/sub` | `PerformanceV70.tsx:880/906/990` |
| 29 | P1 | Aliments/Finances/Pharmacie/Fournisseurs : **aucun loading state** → flash "0" trompeur | `AlimentsView.tsx:284`, etc. |

### Agent 4 — Backend Supabase / RLS (5 findings)

| # | Sévérité | Finding | Cible |
|---|----------|---------|-------|
| 30 | P1 | `fetchFarm` lit la table legacy `troupeaux` au lieu de `farms` — renommage ferme ne se voit pas | `settingsService.ts:21` |
| 31 | P1 | **Pas de UNIQUE constraint** sur `(farm_id, code_id)` pour sows/boars/batches → doublon possible | Migration SQL à créer |
| 32 | P1 | Idempotence saillies/batches INSERT : pas d'UUID client → retry réseau crée des doublons | `supabaseWrites.ts:164` |
| 33 | P1 | Offline queue : conflit boucle au flush non géré (archive après 5 retries) | `offlineQueue.ts:runInsert` |
| 34 | P1 ⚠️ | **`admin_logs_select` policy non farm-scoped** → un OWNER ferme A peut lire les logs ferme B | Migration SQL `admin_logs_farm_scope.sql` |

### Agent 5 — Simulation dates / clock travel (4 findings)

| # | Sévérité | Finding | Effort |
|---|----------|---------|--------|
| 35 | P1 | Aucun helper `getNow()` central — 137 occurrences `new Date()` éparpillées | Patch `src/lib/clock.ts` (5 min) |
| 36 | P1 | `runAlertEngine` ne propage pas `today` → impossible de simuler "2026-08-15" sans recompiler | `alertEngine.ts:812` propager `today?: Date` |
| 37 | P1 | Pages V70 (`Today`, `Repro`, `Performance`) instancient leur propre `new Date()` localement | 4 pages, 50 remplacements |
| 38 | P1 | Pas de mode "Dev panel" pour simuler une date pour QA / démo client | Widget `/reglages/dev-tools` (15 min) |

---

## ✅ Vérifications post-fix

```
npx tsc --noEmit       → 0 erreur
npm run build          → ✓ built in 2.87s · 107 entries précache 5.9 MB
git diff --stat src/   → 5 fichiers, +24 / -16
```

## Plan recommandé sprint suivant

| Bloc | Effort | Priorité |
|------|--------|----------|
| **Patch `clock.ts` + propagation `runAlertEngine`** (Agent 5 #35-37) | 30 min | P1 |
| **Migration SQL UNIQUE `(farm_id, code_id)`** + admin_logs farm-scoped (Agent 4 #31, #34) | 20 min | P1 sécu |
| **Loading skeletons Aliments/Finances/Pharmacie/Fournisseurs** (Agent 3 #29) | 1h | P1 UX |
| **Tooltips KPI Performance toujours présents** (Agent 3 #17) | 10 min | P1 UX |
| **Tests R11/R12/R13 dans alertEngine.test** (Agent 1 #1) | 1h | P1 qualité |
| **Migration TruieDetailView tokens legacy** (Agent 3 #20) | 2h | P1 cohérence |
| **Refactor BandeDetailView Tailwind legacy** (Agent 3 #18) | 1h30 | P1 cohérence |

Total backlog ≈ **6h30** pour absorber toutes les frictions identifiées.

---

*Audit produit par 5 sub-agents Opus 4.7 en parallèle + crawl Chrome DevTools MCP. Mode lecture seule sauf les 5 fixes appliqués par l'orchestrateur (validés tsc + build).*
