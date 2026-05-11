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
