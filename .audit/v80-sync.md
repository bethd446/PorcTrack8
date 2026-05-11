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

- [ ] A1 theme-unification
- [ ] A2 typo-canon
- [ ] A3 component-dedup
- [ ] A4 onboarding-profil
- [ ] A5 engraissement-module
