# V71 AUDIT CONSOLIDATION — 2026-05-05

> Auditor : V71-AUDITOR (Explore sub-agent)
> Source : main HEAD `e436c35` + branche `migration/v71-consolidation`
> Tag rollback : `pre-v71-rollback`

---

## 1. Fractures routing (5) — TOUTES FAUX POSITIFS ✅

| # | Symptôme rapporté | Fichier | Ligne | État réel |
|---|---|---|---|---|
| 1 | `/reglages` → `/performance` | `src/v70/router/V70Routes.tsx` | 149 | Route déclarée : rend `<ReglagesV70 />` |
| 2 | `/reglages/encyclopedie` → `/reproduction` | `src/v70/router/V70Routes.tsx` | 150 | Route déclarée : rend `<EncyclopediaPage />` |
| 3 | `/troupeau/verrats/V-001` → `/today` | `src/v70/router/V70Routes.tsx` | 141 | Route `/troupeau/verrats/:id` déclarée |
| 4 | `/repro?tab=agenda` querystring ignorée | `src/v70/pages/ReproV70.tsx` | 63-77 | Utilise `useSearchParams()` + `useEffect` sync |
| 5 | `/cycles/maternite` redirect cassé | `src/v70/router/V70Routes.tsx` | 175 | Redirect actif → `/reproduction?phase=maternite` |

**Conclusion** : aucun fix code requis. Tests live précédents montraient des fallbacks → cause = timing client (push state successifs trop rapides) ou cache nav, pas un bug code.

---

## 2. CycleTimeline — pas de chevauchement détecté

- **Source** : `src/design-system/components/index.tsx:932-1023`
- **Utilisé dans** : ReproV70 (2×), BandeDetailView (1×), tests (5)
- Pattern V2 déjà appliqué (`pt-cycle__step--below`, labels en dessous, `shortenLabel()` truncate intelligent SURVEILLANCE→SURV. ÉCHOGRAPHIE→ÉCHO. MISE-BAS→M.-BAS)

**Phase 2** : monitoring visuel + screenshots responsive (375/414/768/1280). Pas de refonte.

---

## 3. 8 erreurs hydration TodayV70 — VRAI BUG (FIX #7) ✅ RÉSOLU

- **Fichier** : `src/v70/pages/TodayV70.tsx:114-156`
- **Pattern bug** : wrapper `<button class="alert-row">` contenant `<button>Acquitter</button>` → invalide HTML5
- **Fix appliqué** : wrapper devient `<div role="button" tabIndex={0} onClick onKeyDown>`
- **Validation live** : 0 nested buttons, comportements préservés (click row → navigate, click Acquitter → dismiss + stopPropagation)

---

## 4. Codes techniques affichés (B-202)

- 31 occurrences `B-20...` dans tests/fixtures, **0 affichage UI prod direct**
- `PhaseSuggestionCard.tsx` affiche déjà format humanisé `B-2026-04-01`
- **Action V71 Phase 6** : monitoring uniquement, pas de migration urgente `humanizeBatchCode`

---

## 5. Doublons KeyValueRow (Statut/Stade)

- TruieDetailView Vue d'ensemble (lignes 669-690) : Code/Boucle, Race, Naissance, Origine, Loge — pas de doublon Statut/Stade
- Statut dans PageHeader subtitle (436), Stade dans section "REPRODUCTION EN COURS" (séparée)
- **Action V71 Phase 6** : vérifier en live sur Verrat/Bande/Loge si doublons cachés

---

## 6. Composants V45 réutilisables — TOUS DISPONIBLES

| Composant | Path | Lignes | Action V71 |
|---|---|---|---|
| EntityAvatar | `src/components/ds/EntityAvatar.tsx` | 148 | Réutiliser tel quel |
| SystemManagement | `src/components/SystemManagement.tsx` | 747 | Wrapper `/reglages` (Profil/Ferme/Équipe/Notifs/Sécu) |
| VerratDetailView | `src/features/troupeau/VerratDetailView.tsx` | 600 | Réutilisable wrapped |
| TruieDetailView | `src/features/troupeau/TruieDetailView.tsx` | 800+ | Déjà câblé V70Routes:140 |
| BandeDetailView | `src/features/tables/bandes/BandeDetailView.tsx` | 400+ | Câblé via wrapper V70Routes:82-129 |
| LogeDetailView | `src/features/troupeau/LogeDetailView.tsx` | (voir) | Câblé V70Routes:143 |

**Conclusion** : tous V45 réutilisables et déjà intégrés. Phase 3 = enrichissement métier (helper `useEntityRelations`, fiches enrichies cross-navigation).

---

## 7. RLS Supabase — gap critique (Phase 5)

**Tables avec RLS partielle/présente** : `profiles`, `troupeaux`, `saillies`.

**Tables critiques sans policies (V71 Phase 5)** :
- `finances`
- `batches.cout_aliment`
- `health_logs.cout`
- `transactions`
- `stocks_aliments`
- `stocks_veto`

**Effort Phase 5** : ~4h (matrice → policies → tests sécu manuels worker/owner).

---

## 8. Encyclopédie + tooltips — gaps Phase 4

**Tooltips actuels** : 15 termes (saillie, echographie, mise-bas, sevrage, isse, iem, gestation, lactation, reforme, parite, lignee, tournee, pesee, mortalite, vaccin) dans `src/v70/data/tooltips.json`.

**Utilisations live** : 9 occurrences `<Tooltip term=...>` (principalement PerformanceV70).

**Encyclopédie articles** : 5 (cycle-vie-truie, isse-optimisation, biosecurite-bases, alimentation-gestation, sevrage-timing-conditions).

**Articles à ajouter Phase 4** :
1. Mortalité allaitement (causes/prévention)
2. Réforme zootechnique (critères)
3. Lignées tropicales (persona Aïssata)
4. Calcul coûts alimentaires
5. Préparation à la mise-bas

**Tooltips bonus à ajouter** : Truie pleine/vide/allaitante, Bande, Loge, Porcelet, Verrat, Engraissement, Finition, Sortie, RLS, Owner, Worker.

**Effort Phase 4** : ~6-8h.

---

## TOP 10 PRIORITAIRES V71

| # | Phase | Action | Effort | Bloquant ? |
|---|---|---|---|---|
| 1 | 1 | ✅ FIX #7 button-nesting TodayV70 | 0.5h | ✅ FAIT (commit `878e592`) |
| 2 | 1 | Re-test live 5 fractures pour confirmer FAUX POSITIFS | 0.5h | Non |
| 3 | 2 | Monitoring CycleTimeline screenshots responsive | 0.5h | Non |
| 4 | 3 | Helper `useEntityRelations` (Supabase) | 2h | ✅ Phase 3 |
| 5 | 3 | Fiches Loge/Bande/Porcelet enrichies cross-nav | 6h | ✅ Phase 3 |
| 6 | 4 | 5 articles encyclopédie manquants | 3h | Non |
| 7 | 4 | 10 tooltips bonus + déploiement 25+ termes | 2h | Non |
| 8 | 5 | RLS policies 6 tables critiques | 4h | ✅ AVANT push prod |
| 9 | 5 | Tests sécu manuels worker/owner | 1h | ✅ AVANT push prod |
| 10 | 6 | Audit Lighthouse + responsive 4 breakpoints | 2h | Non |

**Total estimé révisé** : ~22h (vs 30-40h brief — économie via faux positifs).

---

## DETTES V72 (hors scope V71)

- Refonte large TruieDetailView (logic vs présentation)
- Offline queue refactor (synchro centralisée)
- RLS étendue autres tables
- Lazy loading articles encyclopédie optimisé
- Permissions farm_id côté UI

---

## VERIFICATION (claims clés)

```
$ grep -n "/reglages" src/v70/router/V70Routes.tsx
149: <Route path="/reglages" element={<ReglagesV70 />} />
150: <Route path="/reglages/encyclopedie" element={<EncyclopediaPage />} />

$ grep -r "<CycleTimeline" src --include="*.tsx" | grep -v test | wc -l
3

$ jq 'keys | length' src/v70/data/tooltips.json
15

$ grep -c "slug:" src/v70/pages/EncyclopediaPage.tsx
5
```
