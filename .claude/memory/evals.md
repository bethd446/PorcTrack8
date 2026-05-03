# Evals — PorcTrack 8

> Évaluations qualité du projet : tests, audits, conformité PDF DS V2, métriques perf, validations utilisateur.
> L'agent consulte ce fichier pour comprendre la qualité actuelle et les zones à risque.

---

## Format type

```
## YYYY-MM-DD · [Type] Titre
**Méthodologie** : ...
**Résultat** : OK/KO/PARTIEL
**Métriques** : chiffres
**Frictions** : liste P0/P1/P2
**Liens** : [[journal]] · [[blockers]]
```

---

## 2026-05-03 · [Test E2E DSV2] Conformité 10 règles

**Méthodologie** : test "mode gamin curieux" sur compte `audit-final@porctrack.test`, purge SW + cache, 10 règles d'or PDF.
**Résultat** : 8/10 conformes — 2 écarts P0
**Détails** :
- ✅ R2 : Cards ✓
- ✅ R3 : Sections puce + label + ligne ✓
- ✅ R4 : SMALL CAPS 11px ✓
- ✅ R5 : Big Shoulders + Instrument Sans ✓
- ✅ R7 : 3 couleurs max ✓
- ✅ R8 : Air vs densité ✓
- ✅ R9 : Tags pills FR (pas HIGH/MEDIUM) ✓
- ❌ R1 : Boutons pills — Tailwind `.rounded-full` non générée → boutons secondaires carrés
- ⚠️ R6 : Monospace banni — 51 occurrences résiduelles sur badges stade truie
- ❌ R10 : UUIDs jamais affichés — H1 fiche Bande affiche UUID brut

**Frictions résiduelles** :
- 🔴 P0-1 BandeDetailView H1 UUID (FIXÉ V38-A)
- 🔴 P0-2 Tailwind rounded-full (FIXÉ V38-A override !important)
- 🔴 P0-3 T-001 incohérence statut (FIXÉ CODE V38-A, DATA SQL prêt)
- 🟠 P1-4 Badges DMMono (FIXÉ V38-A `.chip`)
- 🟠 P1-5 Splitter pas visible (FIXÉ V38-A élargi phases)

**Liens** : [[journal#V38]] · [[blockers]] · [[decisions#V36]]

---

## 2026-05-03 · [Test E2E V36] Validation post-V36

**Résultat** : 6 frictions résiduelles dont 2 P1
**Métriques perf** :
- FCP 136ms · LCP 184ms · CLS 0
- Bundle vendor critique : 1.18 MB (Ionic 63%)
- 18 XHR Supabase pour /today (N+1 explicite)
- Login → /today : 9.4s (lent)

**Frictions** :
- 🔴 P1 Plus DMMono 25+ occurrences (FIXÉ V35)
- 🔴 P1 Bouton "Se déconnecter" non destructive (FIXÉ V35)
- 🟠 P2 About rôles équipe DMMono (FIXÉ V35)
- 🟠 P2 Bottom-nav ordre Perf (FIXÉ V35)
- 🟠 P2 DS showroom 14/16 (FIXÉ V35 16/16)
- 🟠 P2 Ionicons warnings (FIXÉ V35)

**Liens** : [[journal#V35]] · [[blockers]]

---

## 2026-05-03 · [Audit code] Pré-migration V38

**Méthodologie** : grep + count sur `src/` (hors tests, design-system).

| Métrique | Avant V38 | Après V38-A | Cible |
|---|---|---|---|
| UUIDs JSX `.id}` | 255 | 254 | 0 (mais beaucoup faux positifs `key=`) |
| `<button>` natif | 396 | 396 | <50 (DS Button rend `<button>` sous le capot) |
| IonButton | 10 | 10 | 0 (faux positifs `IonButtons` container) |
| `font-mono` | 273 | 97 | <30 (codes/IDs purs OK) |
| Hex colors hors tokens | 214 | 274 | <50 hex purs (fallbacks `var(--x, #hex)` OK) |
| border-radius px | 6 | 8 | 0 (sauf override pt-radius-pill) |

**Liens** : `MIGRATION_AUDIT.md` (snapshot) · [[journal#V38]]

---

## 2026-05-03 · [Tests unitaires] Coverage

**Résultat** : 1806 pass / 6 skipped / 1812 total
**Évolution** : 1450 (V25) → 1806 (V38) = +356 tests sur 9 jours
**Files tests** : 152
**Top contributeurs** :
- V36-A : +64 (perfKpiAnalyzer + reproductionDashboard + alertSubject)
- V36-E : +30 (Splitter + détection doublons)
- V33 : +65 (7 composants V33 + OutilsView)
- V32 : +31 (Wizard + sailliesFilter)
- V31 : +57 (AlertGroup + AlertRow + uuidGuard + usePageFab)

**Liens** : [[journal]] · [[learnings#tests]]

---

## 2026-05-03 · [Build prod] Métriques bundle

**Build time** : 3.21s (V38-A)
**PWA precache** : 111 entries · 4278 KiB
**Top chunks** :
- vendor-ionic-core : 446 KB
- vendor-ionic-components-a : 296 KB
- vendor-react : 233 KB
- vendor-supabase : 200 KB
- index : ~257 KB
- Routes lazy : OK (45/45 routes lourdes en React.lazy)

**Liens** : `vite.config.ts` · [[blockers#bundle]]

---

## 2026-05-02 · [Audit 20 points] Persona-éleveur

**Résultat** : 22 problèmes (4 P0 / 11 P1 / 7 P2)
**Top 5 quick wins** :
1. autoFocus 1er input (36/37 forms manquants) — F1 persona
2. parseDecimalFR (virgule FR → point) — F12
3. z-FAB (FAB sous nav) — F1
4. Codemod inline `style={{}}` — qualité code
5. Refresh CLAUDE.md (tokens obsolètes) — doc

**Fichier** : `.claude/audits/AUDIT_20PTS_2026-05-03.md`
**Liens** : [[journal#V28]] · [[learnings#persona]]

---
