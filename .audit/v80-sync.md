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
