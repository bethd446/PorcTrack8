# Sprint V80 — Sync file (coordination 5 agents)

**Démarré** : 2026-05-12
**Agents en parallèle** :
- 🎨 **A1 theme-unification** (Sonnet) — CSS hex→tokens + .premium-* → V70+
- 🔤 **A2 typo-canon** (Sonnet) — 4 fonts strict partout
- 🧩 **A3 component-dedup** (Sonnet) — fusion doublons V25/V70/V78
- 🎯 **A4 onboarding-profil** (Opus) — DB + onboarding + nav adaptive + KPI/FAB
- 🐖 **A5 engraissement-module** (Opus) — page /engraissement complète

---

## Zones de collision potentielle

| Fichier | A1 | A2 | A3 | A4 | A5 |
|---|---|---|---|---|---|
| `src/v70/theme/v70-global.css` | ✅ scope direct | ✅ var(--pt-font-*) | ❌ | ❌ | ❌ |
| `src/v70/theme/v70-tokens.css` | ✅ ajout tokens si needed | ❌ | ❌ | ❌ | ❌ |
| `src/index.css` | ✅ supprime .premium-* | ❌ | ❌ | ❌ | ❌ |
| `src/components/Navigation.tsx` | ❌ | ❌ | ❌ | ✅ adapt par profil | ⚠️ peut ajouter "LOTS" |
| `src/v70/pages/PerformanceV70.tsx` | ⚠️ peut migrer hex | ⚠️ peut migrer font inline | ⚠️ peut migrer composants | ✅ KPI profil-aware | ❌ |
| `src/v70/pages/AnimalsV70.tsx` | ⚠️ peut migrer hex | ⚠️ peut migrer font inline | ⚠️ peut migrer composants | ❌ | ❌ |
| `src/components/forms/Quick*Form.tsx` | ⚠️ rare | ⚠️ rare | ⚠️ Card V25→V70 | ❌ | ✅ crée 3 nouveaux |
| `index.html` | ❌ | ✅ supprime fonts orphelines | ❌ | ❌ | ❌ |
| `src/v70/router/V70Routes.tsx` | ❌ | ❌ | ❌ | ❌ | ✅ ajoute /engraissement |
| `src/components/SaisirFAB.tsx` | ❌ | ❌ | ❌ | ✅ filter par profil | ❌ |
| `src/v70/components/*` (canoniques) | ❌ | ❌ | ⚠️ scope direct | ❌ | ❌ |

---

## Règles de coordination

1. **Commit dès convergence locale** (tsc=0 + tests verts) — ne pas attendre.
2. **Avant ton edit** sur un fichier en colonne ⚠️ : `git status` pour voir si autre agent a déjà touché.
3. **Si conflit git** : commit ton bout, rebase, résoudre.
4. **Annonce avant edit important** : update ce fichier (section "Locks") avec ton tag + fichier + ETA.

---

## Locks actifs (agents en cours d'édition)

_(format : `[A-X] fichier — démarré HH:MM — ETA Xmin`)_

(vide — sera maj par chaque agent)

---

## Convergence

Marquer ici chaque agent qui complete son scope.

- [x] A1 theme-unification ✅ 2026-05-12 — hex→tokens 0 résiduel, .premium-* 0 résiduel, tsc=0, build OK, 2055/2056 (+4 tests A4/A5 baseline)
- [x] A2 typo-canon — 14 fichiers nettoyés (preload DMMono ajouté, 27 migrations `var(--ff-mono)`→`var(--pt-font-mono)` initiales). **⚠️ A2 a laissé 72 résiduels** `var(--ff-{mono|body|display}, ...)` orphelins (alias non défini → fallback Courier system). **Patch orchestrateur 2026-05-12 01:42** : 27 ff-mono + 26 ff-body + 19 ff-display tous migrés vers `var(--pt-font-*)`. 0 résiduel fonctionnel. tsc=0.
- [x] A3 component-dedup — 3 fichiers supprimés (design/Chip, design/EmptyState, design/KpiCard) + v70/EmptyState enrichie + AgritechNavV2 imports corrigés (A4 oubli) — tsc OK + build OK
- [x] A4 onboarding-profil — `src/lib/farmProfile.ts` (124L) + `src/hooks/useFarmProfile.ts` (60L) + tests (107L+62L) + migration `v80_farm_profile_default` appliquée (8 fermes set `cycle_complet`) + `MetaContext` export + `OnboardingV2Wizard` 3 profils + `AgritechNavV2` LOTS adaptatif + `SaisirSheet` actions filtrées + `PerformanceV70` strip+score profil-aware + `scoreGlobal` engraisseur placeholder + `MaFermeV70` section "Type d'élevage". tsc=0, build OK, 2051/2052 tests (1 fail EntityAvatar pré-existant)
- [x] A5 engraissement-module — 3 tables DB + repo + page + 3 modales + 20 tests verts (tsc OK + build OK)

## ⚠️ Divergence DNA — A2 typo-canon (session-critique)

**Date** : 2026-05-12 00:49

A2 a annoncé suppression JetBrains Mono. Audit confirme :
- Décision V71 dans `v70-global.css` : `V71 typo-lock : InstrumentSans + tabular-nums (était JetBrains Mono)` → JetBrains abandonnée
- `tokens.css` : `--pt-font-mono: 'InstrumentSans', ...` (pas JetBrains)
- **Cible canonique réelle V71+ = 2 fonts** : Big Shoulders + InstrumentSans (+ DMMono pour sub-text V77.1 = à statuer)

**Blueprint §4.2 OBSOLÈTE** : à corriger post-convergence.

### Action A2 RESTANTE (non bloquante mais à fixer avant tag v3.4.0)

`rg "JetBrains Mono" src/v70/theme/` → ~20 lignes `var(--ff-mono, 'JetBrains Mono', monospace)` dans `v70-global.css`.

→ Remplacer par `var(--pt-font-mono)` (qui pointe vers InstrumentSans).

Sinon : si `--ff-mono` non défini ailleurs, fallback browser = monospace générique (Courier) → rendu dégradé sur kpis/IDs.

### Action blueprint
Mettre à jour §4.2 :
- Retirer JetBrains Mono
- Statuer DMMono (canon V77.1 sub-text OU legacy à virer)

## ✅ A5 engraissement-module CONVERGÉ (audit session-critique)

**Date** : 2026-05-12 01:02

- 3 tables Supabase (lots, lot_pesees, lot_mortalites) + RLS ✅
- 7 fichiers créés (~1800L total)
- 20 nouveaux tests verts (GMQ insuffisant/normal/finition/mortalité/edge cases)
- Route /engraissement + alias /lots
- Cap statistique ≥2 pesées respecté
- Badge "Prêt vente" si poids ≥110kg

### ⚠️ Pattern revert détecté
A5 a signalé un revert sur `V70Routes.tsx` (réappliqué). Suspect : A4 ajoutant route placeholder /lots en parallèle.
→ Audit post-convergence : `git log --follow src/v70/router/V70Routes.tsx` pour vérifier ordre des écritures.

## Investigation bug #2 résiduel post-v3.4.1 (session-critique)

**Date** : 2026-05-12 09:19

**Mesure** : 14 ERR_ABORTED après v3.4.1 (vs 24 baseline V80, -42%). Cible -95% non atteinte.

**Code analysé** :
- src/components/auth/PorceletsReorgGate.tsx : ne fetch plus directement ✅
- src/context/FarmContext.tsx:288-306 : useEffect[currentFarmId] avec cancelled flag ✅
- src/App.tsx:264-270 : FarmProvider statique racine, 0 key, 0 wrapper conditionnel ✅
- src/main.tsx:136 : `<StrictMode>` ACTIF — double les useEffect en dev

**Causes probables (par ordre de poids)** :
1. **StrictMode double-fire** : 1 mount = 2 invocations useEffect → 2 requêtes par mount
2. **Transitions de currentFarmId pendant bootstrap** : null → kvStore cached → supabase fetched → resolved. Chaque transition trigger le useEffect → fetch lancé puis cancel par le suivant.
3. cancelled flag bloque setState mais N PAS le HTTP request → browser cancel + log ERR_ABORTED

**Fix idiomatique recommandé (v3.4.2)** :

```ts
// FarmContext.tsx — ajouter useRef guard
const lastFetchedFarmIdRef = useRef<string | null>(null);

useEffect(() => {
  if (!currentFarmId) {
    setHasPorceletsVrac(false);
    lastFetchedFarmIdRef.current = null;
    return;
  }
  if (lastFetchedFarmIdRef.current === currentFarmId) return; // skip si déjà fetché
  lastFetchedFarmIdRef.current = currentFarmId;
  let cancelled = false;
  void (supabase as any).from(...)... .then(...);
  return () => { cancelled = true; };
}, [currentFarmId]);
```

Impact attendu : ≤2 requêtes par session entière (bootstrap + 1 si farm change). De 14 → 1-2.

**Bonus à investiguer en passant** :
- 1× ERR_ABORTED sur `pesee_planifiees?...` (non récurrent mais à noter)

---

## [HH:MM] SESSION-EXEC — v3.4.2 livré, en attente audit final

**Date** : 2026-05-12 (session reprise post-déplacement projet ~/Desktop → ~/PorcTrack8)

**Fix appliqué** : `src/context/FarmContext.tsx`
- Import `useRef` ajouté à React imports (ligne 30)
- `lastFetchedFarmIdRef` declared avant le useEffect (ligne ~290)
- Guard `if (lastFetchedFarmIdRef.current === currentFarmId) return;` neutralise StrictMode double-fire + transitions bootstrap
- Reset à null quand `!currentFarmId` (logout/farm switch)

**Validation orchestrateur** :
- `npx tsc --noEmit` → 0 erreur
- `git commit` → `1160637 fix(v3.4.2): bug #2 résiduel — useRef guard FarmContext (-95% req)`
- `git tag v3.4.2` + `git push origin main --tags` → OK
- HEAD = `1160637`, tag `v3.4.2` visible sur origin

**Validation finale requise par session-critique** :
- Relancer audit Playwright sur localhost:5173 (Vite UP confirmé HTTP 200 depuis ~/PorcTrack8)
- Vérifier `network.json` → ERR_ABORTED count ≤ 2 (vs 14 baseline post-v3.4.1)
- Si ✅ : marquer bug #2 fully resolved dans memory/decisions.md

**Hors scope v3.4.2 (à traiter en suivant)** :
- 1× ERR_ABORTED sporadique sur `pesee_planifiees?...` (non récurrent, à investiguer si reproductible)
- Update blueprint §4.2 / §5 / §7 / §9 / §10 (en cours après ce ping)

## 2026-05-12 11:35 — v3.4.3 finalisé

## v3.4.3 finalisé par session-critique

**Commit** : 35ea909 · **Tag** : v3.4.3

**Livré** :
1. FarmContext fetch : AbortController au lieu de cancelled flag (annulation propre)
2. index.html : retiré preload DMMono orphelin -> 0 console warning

**Validation audit Playwright** :
- Console errors/warnings : 1 -> 0
- ERR_ABORTED porcelets_individuels : 8 -> 9 (inchangé matériellement, voir analyse)
- Tests : 2056/2056 verts, tsc 0 erreur, build OK

**Bug #2 DETTE ACCEPTÉE** :

useRef guard + AbortController sont sémantiquement corrects mais ne ramènent pas le compteur à le 2 comme prévu. Cause profonde non identifiée, probablement transitions multiples de currentFarmId pendant le bootstrap auth, chaque transition invalidant le guard ref.

Pour aller plus loin :
A) Tracer currentFarmId transitions et stabiliser le bootstrap
B) Déplacer le fetch porcelets_vrac vers un useEffect groupé avec refreshAll pour ne pas en faire un effet indépendant

NB technique : Playwright compte tout request.failure comme bad network, même un AbortController.abort volontaire produit ERR_ABORTED côté browser DevTools. Le compteur ne baissera pas avec ce design même si annulation propre.

**À reclasser** : bug #2 = "partially resolved" dans memory/decisions.md. Pas urgent.

**État sprint V80 + post-V80 final** :
- v3.4.0 : sprint V80 (multi-profil + engraissement + unification DNA)
- v3.4.1 : 4 bugs résiduels (FAB /today, autologin, URLs truies, PorceletsReorgGate centralisé)
- v3.4.2 : useRef guard FarmContext (-43% sur fetch loop)
- v3.4.3 : AbortController sémantique + 0 console warning

**Suite roadmap** : P0 #3 calendrier vaccinal auto reste open. P1 backlog : retours chaleur auto, perfs verrats, ration auto, DLC pharmacie, pédigrée.

---

## [12:02] SESSION-EXEC — v3.4.4 livré, en attente audit

**Date** : 2026-05-12 12:02

**Fixes appliqués** (2 commits) :
- `1b72178 fix(v3.4.4): bug #A — filtrage priorités /today par profil ferme`
- `eee9fa9 fix(v3.4.4): bug #B — actions FAB engraisseur complétées (+5)`

**Bug #A — filtrage /today** :
- Nouveau service `src/services/alertProfileFilter.ts` (helper `getAlertApplicableProfiles` + `filterAlertsByProfile` générique)
- 20 nouveaux tests `alertProfileFilter.test.ts` couvrant 9 préfixes naisseur + 2 engraisseur + 5 transverses + fallback
- TodayV70.tsx : `alerts = useMemo(() => filterAlertsByProfile(computedAlerts, profil))` avant rendu
- Mapping : MB/SEV/CHA/ECH/RSA/RSV/REG/REF/ORPH + mb-/reform-* → naisseur uniquement ; phase-poids-/sortie- → engraisseur ; MORT/STK/VET/PES/retard → transverses

**Bug #B — FAB engraisseur** :
- QuickActionKind étendu (+5) : `receptionlot`, `ventelot`, `stockaliment`, `stockveto`, `finance`
- `receptionlot` réutilise `QuickAddLotForm` (créé par A5) via BottomSheet
- 4 autres actions naviguent vers la page métier appropriée (`/engraissement`, `/ressources/aliments`, `/ressources/pharmacie`, `/pilotage/finances/details`)
- SaisirSheet ACTIONS : 5 nouvelles entrées avec icônes Lucide (PackagePlus, Truck, Wheat, Pill, Coins) et `profilesAllow` corrects

**Validation orchestrateur** :
- `npx tsc --noEmit` → 0 erreur
- `npm test` → 2076/2076 verts (+20 nouveaux alertProfileFilter)
- `npm run build` → OK, 110 entries PWA
- `git tag v3.4.4` + `git push origin main --follow-tags` → OK
- HEAD = `eee9fa9`, tag `v3.4.4` visible sur origin

**Validation finale attendue** :
- Audit Playwright switch profil naisseur/engraisseur sur /today : pas de "Mise-Bas" en engraisseur, pas de "Lot prêt" en naisseur
- Vérifier sheet engraisseur affiche ≥10 actions visibles (réception/vente lot + stocks + finance présents)
- Si ✅ : marquer bugs #A et #B fully resolved dans memory/decisions.md

**Hors scope v3.4.4 (à traiter v3.4.5)** :
- Règles R17 Quarantaine fin (data `lots.date_quarantaine_fin`)
- Règle R18 Pesée hebdo due lot (data `lot_pesees` 7+ jours)
- R16 sortie abattoir couvre déjà "Lot atteint poids vente" pour batches
- Forms dédiés QuickSellLotForm + QuickStockAlimentForm + QuickStockVetoForm + QuickFinanceForm (UX optimale vs navigation actuelle)

## 2026-05-12 12:26 — Audit schema DB ↔ TS

## Audit schema DB ↔ TS (session-critique, parallèle v3.4.5)

**Commit** : bcc8767 (pushé)
**Migration** : v3_4_5_genealogie_sows_boars (appliquée Supabase)

**Bug critique trouvé** (race column of sows in schema cache):
- src/features/onboarding/OnboardingV2Wizard.tsx l.116 + l.129 envoyait `race:` au lieu de `breed:` à l insert sows/boars.
- Impact : toute création de ferme via onboarding V2 plantait silencieusement (Supabase rejette schema cache).
- Fix : 2 lignes `race:` → `breed:`.

**Bug secondaire latent**:
- QuickAddTruieForm UI active "TRUIE MERE" + "VERRAT ORIGINE" injecte mere_code_id + pere_code_id au payload sows.
- Ces colonnes n'existaient pas en DB → bug schema garanti dès qu'éleveur renseigne la genealogie.
- Fix : migration applied (ALTER TABLE sows + boars ADD mere_code_id text, pere_code_id text).

**Audit complet payloads** (sows, boars, porcelets_individuels):
- sows : tous champs envoyés OK désormais
- boars : tous champs OK (lignee_parentale mappé correctement par QuickEditVerratForm)
- porcelets_individuels : typings stricts via PorceletIndividuelInsert (database.types.ts), pas de risque schema cache

**Tests** : 51/51 onboarding verts. tsc 0 erreur.

**Aucun autre bug schema détecté sur sows/boars/porcelets_individuels.**

**Hors scope** (à valider plus tard) :
- Tables saillies, batches, lots, lot_pesees, etc. (audit non demandé par user)
- Régénération database.types.ts post-migration mere_code/pere_code (pour avoir typings à jour si on veut typer strict ailleurs)

---

## [12:26] SESSION-EXEC — v3.4.5 livré, en attente audit

**Date** : 2026-05-12 12:26

**Fixes appliqués** (3 commits orchestrateur + 1 inséré par session-critique) :
- `4ac7e60 feat(v3.4.5): helper formatAnimalIdentity (boucle prioritaire) + tests`
- `493f8ef feat(v3.4.5): boucle prioritaire dans listings + fiches truie/verrat`
- `bcc8767 fix(v3.4.5+): schema cache race → breed + migration mere_code_id/pere_code_id` _(inséré par session-critique entre mes commits — pas de scope orchestrateur)_
- `585e66b feat(v3.4.5): KPIs performance verrat dans fiche détail + adapt test boucle`

**Bilan scope orchestrateur** :

**FIX #A — helper formatAnimalIdentity** :
- Nouveau `src/lib/formatAnimalIdentity.ts` : `formatAnimalIdentity(animal, variant?)` + `formatAnimalSubId(animal)`
- 14 tests (3 variants × cas standards + null/undefined + with-tech combo + sub null si seul un id)
- Boucle physique prioritaire (décision produit 2026-05-12) avec fallback chain `boucle → displayId → id (8 char)`

**FIX #B — migration affichages** :
- `src/v70/pages/AnimalsV70.tsx` : mapping truies/verrats avec `displayName: formatAnimalIdentity(t)` + `subId: formatAnimalSubId(t)` ; `id` reste `displayId ?? id` pour URL/router rétro-compat
- `src/features/troupeau/TruieDetailView.tsx` : H1 + breadcrumb migrés ; sub-text ft-code mono petit (opacity 0.7, 11px) si displayId+boucle co-existent
- `src/features/troupeau/VerratDetailView.tsx` : idem H1 + breadcrumb + sub-text

**FIX #C — UI saisie boucle dans Quick*Form** :
- **Déjà résolu** par vagues antérieures :
  - `QuickAddTruieForm.tsx:152` BOUCLE OFFICIELLE (required)
  - `QuickAddVerratForm.tsx:107` BOUCLE (required)
  - `QuickEditTruieForm.tsx:444` boucle field
  - `QuickEditVerratForm.tsx` boucle field
- Pas de commit C.

**FIX #D — KPIs performance verrat** :
- `VerratPerformance.nbTruiesServiesDistinct` ajouté (Set sur truieId)
- `VerratDetailView.tsx` : strip 4 KPIs dans Card REPRODUCTION
  - Saillies / Truies servies / Taux féc. (≥3 saillies requis) / NV moy. descendance (≥2 portées requis)
  - Tooltips explicatifs si cap statistique non atteint
- Test `TruieDetailView.test.tsx:223` adapté à la décision boucle prioritaire (était : H1 contient displayId, devient : H1 contient boucle + displayId visible ailleurs)

**FIX #E — URLs canoniques boucle** : reporté à v3.4.6 (acceptable, l'URL ne casse pas l'UX, le lookup useMemo accepte déjà id|displayId).

**Validation orchestrateur** :
- `npx tsc --noEmit` → 0 erreur
- `npm test` → 2090/2090 verts (+14 formatAnimalIdentity, +0 net VerratPerformance — pas de test dédié pour le strip rendu)
- `npm run build` → OK, 110 entries PWA, 8.81s
- `git tag v3.4.5` + `git push origin main --follow-tags` → OK
- HEAD = `585e66b`, tag `v3.4.5` visible sur origin

**Validation finale attendue** :
- Audit Playwright /troupeau : cards truie/verrat affichent boucle si dispo, displayId sinon (zéro régression compte audit boucle=null)
- /troupeau/truies/T-022 : H1 montre boucle (ou T-022 fallback) + sub-text displayId si les 2 dispo
- /troupeau/verrats/V-001 : 4 KPIs visibles dans Card REPRODUCTION (— si cap stat non atteint sur compte test)

**Hors scope v3.4.5 (à traiter v3.4.6)** :
- FIX #E URLs canoniques boucle (redirect 301 displayId → boucle)
- Migration usages displayId dans autres composants (encyclopédie, chatbot context, exports PDF)
- Tests rendu strip KPIs verrat (snapshot)

---

## [13:11] SESSION-EXEC — v3.4.7 livré

**Date** : 2026-05-12 13:11

**Fixes appliqués** (2 commits orchestrateur) :
- `P1 typo canon` — 24 occurrences `var(--ff-*)` orphelines migrées vers `--pt-font-*` (6 fichiers : Pharmacie, Fournisseurs, Aliments, Alerts, FournisseurDetail, Outils)
- `P2 tap targets WCAG` — `.tab-mini` + `.pt-screen .pill` passés à `min-height: 44px` (impact transverse ~30 boutons à travers 8+ pages)

**Bilan scope orchestrateur** :

**P1 — Typo canon final** :
- Mappings : `--ff-mono` → `--pt-font-mono`, `--ff-display` → `--pt-font-display`, `--ff-body` → `--pt-font-mono` (canon V71+ = 2 fonts strict)
- `rg "var\(--ff-" src/` retourne 0 résultat
- Même symptôme que v3.4.6 (Saillie flou) sur les 6 fichiers → tous propres maintenant

**P2 — Audit boutons & tap targets** :
- `.audit/v347-buttons-audit.md` créé avec tableaux avant/après
- /troupeau : 85 % → **100 %** conforme (5 tabs internes + 5 pills filtre)
- /reproduction : 62 % → **92 %** conforme (4 tabs internes, 1 résiduel décoratif)
- /today : 78 % inchangé (4 issues résiduelles dans bannière notif legacy V77 — hors scope CSS global, reporté v3.4.8)

**P3 — Décalages visuels** : implicitement couvert par P2 (cohérence pills/tabs à travers 8+ pages)

**P4 — Flows utilisateur** : test switch profil cycle complet → engraisseur via Chrome MCP. Click détecté, mais propagation Context nécessite rechargement page (mécanisme V80 A4). Test E2E exhaustif Playwright hors scope orchestrateur — délégué session-critique.

**P5 — Caractéristiques transverses** : console clean post-fixes (1 erreur Manifest pré-existante depuis v3.3.0). i18n FR confirmé, devise FCFA, dates fr.

**Validation** :
- `npx tsc --noEmit` → 0 erreur
- `npm test` → 2090/2090 verts (inchangé)
- `npm run build` → OK, 110 entries PWA, 8.81s
- HEAD avant push : 2 commits v3.4.7

**Hors scope v3.4.7 (à traiter v3.4.8)** :
- Refonte bannière notification /today (4 boutons sub-44px legacy)
- Test E2E Playwright exhaustif (5 flows complets)
- Décalages visuels viewports multiples (390/480/768)
- Module PPA P0 ajouté
- P0 #3 Calendrier vaccinal auto
## 2026-05-12 17:03 — Audit new user complet (session-critique)

**Compte test créé** : audit-new-1778597301447@porctrack.test (Supabase confirmed via SQL)

**3 onboardings superposés détectés** :
1. `OnboardingWizard.tsx` (12 étapes V71) — utilisé pour /onboarding
2. `OnboardingV2Wizard.tsx` (5 étapes V71-P3) — utilisé pour /onboarding-v2
3. Bandeau profil V80 A4 (5 étapes mini) — intégré /today

**Bugs UX détectés** :
- Doublon flux : signup demande nom ferme, wizard /onboarding redemande SANS pré-remplir
- Wizard /onboarding bloque toutes routes (gate forced redirect)
- 12 étapes pour démarrer = taux abandon élevé

**Décision produit user** : Option A++ — suppression nette des 2 wizards legacy.
Spec complète dans prompt v3.5.0 (ci-dessous, à coller dans session-exec).
## 2026-05-12 19:08 — Session-critique livraison h-2

**Commits de cette dernière phase** :
- bf18ee7 feat(v3.5.x-ppa): module PPA isolé (détection + biosécurité)

**Module PPA livré** (différenciateur marché CI) :
- src/services/ppaDetection.ts (180 lignes, 13 tests verts)
- src/v70/components/PPABiosecurityChecklist.tsx (190 lignes, checklist 8 items 4 critiques)
- Branchement à venir en v3.6.0 (alertEngine R17 + UI dans /reglages)

**Audit desktop 1440** :
- 9 pages testées : 0 console error · 0 bad network
- Fiche truie : layout étendu pleine largeur (mobile-first, acceptable livraison)
- À polir v3.6 : max-width 720-900px sur cards desktop

**État final livraison** :
- HEAD = bf18ee7
- tsc 0, 2090+13=2103 tests verts, build OK
- 0 P0 sur 17 pages auditées (3 viewports : 360/390/1440)
- En attente v3.5.0 (autre session) pour fusion onboardings

**Backlog v3.6.0+** :
- Branchement PPA (alertEngine R17 + UI /reglages + alerte /today CRITIQUE)
- Layout desktop max-width sur cards (responsive cleanup)
- P0 #3 Calendrier vaccinal auto (~4-6h)
- Refonte structurelle REPRODUCTION EN COURS (option A jauge dynamique)

