# AUDIT DESIGN V70 — 2026-05-14

Auteur : agent **designer-systeme** (Phase 1). Les 4 sections de domaine ci-dessous
sont directement actionnables par designer-navigation / designer-troupeau /
designer-gttt-alertes / designer-reglages — pas besoin de re-auditer.

Toutes les preuves (`grep`, `wc`) sont reproductibles. Voir bloc `=== VERIFICATION ===`.

---

## § Synthèse

État du design system V70 : **fonctionnel mais avec dette transverse**.

- Le routage est V70-only (`src/App.tsx` → `<V70Routes />`). Le legacy
  (`src/index.css`, `src/styles/*`, `src/components/`, `src/pages/`) n'est pas
  touché par cet audit.
- **Tokens réconciliés** (cette mission) : `src/v70/theme/v70-tokens.css` est
  désormais la **source unique des couleurs** `--pt-*` ;
  `src/design-system/tokens/tokens.css` ne porte plus que les tokens non-couleur
  (typo, échelle, espacements, radius, ombres, transitions) + le reset CSS / les
  overrides Ionic. **3 tokens en conflit supprimés** de `tokens.css` (ils
  portaient les valeurs legacy `#064e3b` / `#065f46` / accent amber divergent —
  interdits DNA). 11 tokens morts purgés. Zéro changement visuel (les valeurs
  autoritaires de `v70-tokens.css` étaient déjà celles appliquées au runtime).
- **Score "AI-feel" global : 6/10** — moyen. Le DNA est posé (eyebrows uppercase,
  `tabular-nums`, séparateurs dashed custom sur `priority-line`, palette tranchée)
  mais **deux violations systémiques** tirent le score vers le bas :
  1. **`v70-global.css` n'utilise JAMAIS l'easing Emil** `cubic-bezier(0.23, 1, 0.32, 1)`
     (0 occurrence sur ~4500 lignes ; 37 `ease` génériques). C'est l'archétype du
     "transition par défaut" que produit une IA.
  2. **Aucun `prefers-reduced-motion` dans tout `src/v70/`** — alors qu'il existe
     dans le legacy. C'est un manquement a11y + une rupture du mandat Emil.
- 3 `transition: all` dans `v70-global.css` (interdit absolu Emil).
- Aucun hex hardcodé "nu" trouvé dans les atomiques `ds/` ni dans `v70-global.css`
  (tous les `#...` sont des fallbacks `var(--token, #fallback)`). MAIS plusieurs
  fallbacks sont **faux/legacy** (ex. `var(--pt-primary, #064e3b)`) — à corriger
  par les agents de domaine, listés ci-dessous.

---

## § designer-navigation

| # | Issue | Fichier:ligne | Gravité | Fix proposé (1 phrase) |
|---|-------|---------------|---------|------------------------|
| N1 | Fallback legacy emerald `#064e3b` dans un `var()` — viole l'interdit DNA | `src/v70/pages/SynchronisationV70.tsx:256` | **P0** | Remplacer `var(--pt-primary, #064e3b)` par `var(--pt-primary, #2D4A1F)`. |
| N2 | `.fab` / `.fab--marius` : transitions en `ease` générique, pas d'easing Emil | `src/v70/theme/v70-global.css:572-619` | P1 | Passer les `transition` sur `cubic-bezier(0.23,1,0.32,1)` et l'active sur `scale(0.97)` 160ms. |
| N3 | `transition: all 0.15s` (×2) — interdit Emil, jamais `transition-all` | `src/v70/theme/v70-global.css:155`, `:281` | P1 | Lister les propriétés animées explicitement (`background, border-color, transform`). |
| N4 | `priority-line` hover/active sans easing Emil ni active-state `scale` | `src/v70/theme/v70-global.css:788-870` | P1 | Ajouter `transition` + `:active { transform: scale(0.97) }` avec l'easing DNA. |
| N5 | `PageHeader` : aucune transition d'entrée (`scale(0.98)+translateY(8px)`), bloc rendu "flat" | `src/v70/components/ds/PageHeader.tsx` (82 l.) | P2 | Ajouter l'animation d'entrée DNA <300ms (respecter reduced-motion). |
| N6 | Aucun `prefers-reduced-motion` côté V70 — BottomNav, FAB, transitions de page non protégés | `src/v70/` (global) | **P0** | Ajouter un bloc `@media (prefers-reduced-motion: reduce)` dans `v70-global.css` neutralisant les animations. |
| N7 | Bandeau Marius (`.bubble--marius`) : vérifier cohérence easing avec le reste | `src/v70/theme/v70-global.css:1540-1590` | P2 | Aligner sur l'easing Emil une fois N2/N3 faits. |

---

## § designer-troupeau

| # | Issue | Fichier:ligne | Gravité | Fix proposé (1 phrase) |
|---|-------|---------------|---------|------------------------|
| T1 | Atomiques `ds/` (Button, Card, ListItem, Pill, Section, StatsGrid, TabsMini, CycleTimeline) : **aucun hex hardcodé** — RAS, conforme | `src/v70/components/ds/*.tsx` | — | Aucune action ; bon état de base. |
| T2 | `Button` / `Card` / `ListItem` / `Pill` ne portent aucune transition ni active-state inline — tout est délégué à `v70-global.css` (`.btn`, etc.) qui n'a pas l'easing Emil | `src/v70/components/ds/Button.tsx`, `Card.tsx`, `ListItem.tsx`, `Pill.tsx` | P1 | Une fois `v70-global.css` corrigé (N2/N3), vérifier que `.btn:active` fait bien `scale(0.97)` 160ms. |
| T3 | `transition: all 0.2s` (3e occurrence) — probable carte/ListItem troupeau | `src/v70/theme/v70-global.css:649` | P1 | Remplacer par transitions ciblées + easing DNA. |
| T4 | Recherche / filtres / densité de liste sur `AnimalsV70` : à auditer visuellement (pas d'anomalie token détectée, mais densité non vérifiée) | `src/v70/pages/AnimalsV70.tsx` | P2 | Vérifier touch targets ≥44px sur les pills de filtre et la densité des `ListItem`. |
| T5 | `CycleTimeline` (atomique) importe depuis `design-system` — vérifier qu'il ne tire pas un token couleur supprimé | `src/v70/components/ds/CycleTimeline.tsx` | P2 | Confirmé : 0 hex hardcodé ; juste vérifier le rendu après réconciliation tokens. |

---

## § designer-gttt-alertes

| # | Issue | Fichier:ligne | Gravité | Fix proposé (1 phrase) |
|---|-------|---------------|---------|------------------------|
| G1 | **Hiérarchie des priorités incomplète** : le DNA prévoit 4 niveaux (CRITIQUE / HAUTE / NORMALE / INFO) mais `priority-line` n'a que 3 variantes visuelles (`.crit`, `.warm`, `.info`) | `src/v70/theme/v70-global.css:828-846` | **P0** | Ajouter une 4e variante distincte ; aujourd'hui HAUTE et NORMALE sont visuellement fusionnées. |
| G2 | Le mapping métier écrase la nuance : `TodayV70` réduit `priority` à `variant ∈ {warning,info,danger}` puis à `{crit,warm,info}` — perte des 4 priorités de `alertEngine` | `src/v70/pages/TodayV70.tsx:36`, `:287` | **P0** | Mapper explicitement les 4 priorités `alertEngine` vers 4 classes CSS distinctes. |
| G3 | `.alert-card` n'a que 2 variantes (`--info`, `--danger`) — pas de couverture warning/critique | `src/v70/theme/v70-global.css:3548-3582` | P1 | Ajouter `--warning` / `--critique` alignés sur la palette sémantique. |
| G4 | `priority-line.crit` / `.warm` / `.info` utilisent `var(--pt-warm)` comme couleur de texte sur fond saturé — contraste à vérifier (cible 4.5:1, 7:1 plein soleil) | `src/v70/theme/v70-global.css:828-846` | P1 | Vérifier le contraste `--pt-warm` sur `--pt-danger`/`--pt-accent`/`--pt-info` ; basculer sur `#fff` si insuffisant. |
| G5 | `priority-line` : pas de transition/easing Emil ni active-state (voir N4, doublon transverse) | `src/v70/theme/v70-global.css:788` | P1 | Voir N4. |
| G6 | `CycleTimeline` (atomique GTTT) : 0 hex hardcodé, conforme — juste vérifier le rendu post-réconciliation | `src/v70/components/ds/CycleTimeline.tsx` | P2 | Contrôle visuel uniquement. |

---

## § designer-reglages

| # | Issue | Fichier:ligne | Gravité | Fix proposé (1 phrase) |
|---|-------|---------------|---------|------------------------|
| R1 | `DiagnosticView` : fallback `var(--pt-danger, #ef4444)` — `#ef4444` n'est pas la valeur du token (`#a4453d`) | `src/v70/pages/DiagnosticView.tsx:152` | P1 | Corriger le fallback en `#a4453d`. |
| R2 | `PerformanceV70` : fallbacks faux/legacy multiples — `var(--pt-warm, #faf6ef)`, `var(--pt-warm, #FAF7F0)`, `var(--pt-bg, #FAF7F0)` (la vraie valeur est `--pt-warm #F5E9D8`, `--pt-bg #FFFFFF`) | `src/v70/pages/PerformanceV70.tsx:251,641,721,790` | P1 | Aligner tous les fallbacks sur les valeurs réelles des tokens (`#F5E9D8`, `#FFFFFF`). |
| R3 | `MonEquipeV70` : nombreux styles inline avec fallbacks — corrects sur la valeur mais inline plutôt que classes ; densité de la liste rôles à vérifier | `src/v70/pages/MonEquipeV70.tsx:93-345` | P2 | Externaliser les styles inline répétés vers `v70-global.css` ; vérifier touch targets des rows. |
| R4 | `DataTable` / `ToggleAdvancedMode` / `EncyclopediaPage` / `OnboardingEduPage` : pas d'anomalie token détectée, audit visuel densité/touch à faire | `src/v70/components/v70/DataTable.tsx`, `ToggleAdvancedMode.tsx`, `src/v70/pages/EncyclopediaPage.tsx`, `OnboardingEduPage.tsx` | P2 | Vérifier touch ≥44px et cohérence des eyebrows uppercase. |
| R5 | `MaFermeV70` / `ReglagesV70` : `ReglagesV70.tsx:241` fallback `#a4453d` correct — RAS sur tokens, audit visuel restant | `src/v70/pages/ReglagesV70.tsx`, `MaFermeV70.tsx` | P2 | Contrôle visuel hiérarchie + densité. |

---

## § designer-systeme (suite — ce qui me reste)

| # | Sujet | État | Gravité | Action |
|---|-------|------|---------|--------|
| S1 | Easing Emil absent de `v70-global.css` (0/4500 lignes) | À faire | **P0** | Introduire `--pt-ease: cubic-bezier(0.23,1,0.32,1)` (token transition, non-couleur → `tokens.css`) et migrer les 37 `ease` + le `cubic-bezier(0.2,0.8,0.3,1)` ligne 2929. Gros chantier transverse, à cadrer après les agents de domaine. |
| S2 | `prefers-reduced-motion` absent de tout `src/v70/` | À faire | **P0** | Ajouter un bloc `@media (prefers-reduced-motion: reduce)` global dans `v70-global.css`. |
| S3 | `transition: all` ×3 dans `v70-global.css` (l.155, 281, 649) | À faire | P1 | Remplacer par des listes de propriétés explicites. |
| S4 | États skeleton/empty/error : `Skeleton.tsx` (94 l.), `EmptyState.tsx` (93 l.), `EmptyEdu.tsx` (52 l.) présents ; animation skeleton `skp 1.6s ease-in-out` (l.1700, 1885) non-Emil | À revoir | P2 | Vérifier que l'easing skeleton respecte le DNA ou est justifié (loop) ; harmoniser. |
| S5 | Atomiques `ds/` "trop génériques" ? — `Button`, `Pill`, `Card` sont des répliques pixel du mockup, structure saine, pas de signal "AI-generated". `TabsMini` et `Section` OK. | OK | — | RAS. Le risque AI-feel est dans les **transitions** (S1), pas la structure. |
| S6 | Tokens legacy-dérivés conservés dans `tokens.css` : `--pt-primary-hover #065f46`, `--pt-primary-soft rgba(6,78,59,…)` (emerald legacy mais 1-2 usages actifs, non-conflit) | À migrer plus tard | P2 | Hors périmètre behavior-preserving de cette mission ; à recolorer sur la palette olive dans un sprint dédié. |
| S7 | a11y / touch : seul `PageHeader.tsx:60` déclare `minHeight: 44` explicitement parmi les atomiques | À vérifier | P1 | Audit touch-target systématique sur `Button`, `Pill`, `ListItem` (peut venir de `v70-global.css` — à confirmer). |

---

## Détail réconciliation tokens (cette mission)

**Avant** : `tokens.css` (chargé par `main.tsx`) et `v70-tokens.css` (chargé en
async par `App.tsx`) définissaient tous deux `--pt-primary`, `--pt-accent`,
`--pt-accent-deep` avec des valeurs **divergentes** (legacy emerald `#064e3b` vs
DNA olive `#2D4A1F`). Le runtime appliquait `v70-tokens.css` (chargé en dernier)
mais c'était fragile et `tokens.css` violait l'interdit DNA.

**Après** :
- `v70-tokens.css` = source unique couleurs `--pt-*` (en-tête mise à jour).
- `tokens.css` = tokens non-couleur uniquement + reset CSS + overrides Ionic
  (en-tête réécrite pour documenter le partage).
- Supprimés de `tokens.css` (conflit → la valeur DNA de `v70-tokens.css` reste
  appliquée, **zéro changement visuel**) : `--pt-primary`, `--pt-accent`,
  `--pt-accent-deep`.
- Purgés (0 usage prouvé dans tout `src/`, tests inclus) : `--pt-text-h2`,
  `--pt-space-1`, `--pt-space-6`, `--pt-space-7`, `--pt-space-8`,
  `--pt-radius-sm`, `--ds-radius-pill`, `--ds-primary`, `--ds-accent`,
  `--ds-text-subtle`, `--ds-divider`.
- Conservés dans `tokens.css` (encore consommés hors V70, non-conflit) :
  surfaces `--pt-surface*`, `--pt-primary-hover`, `--pt-primary-soft`,
  `--pt-primary-text`, `--pt-accent-soft`, `--pt-accent-pill`, textes, divider.

**Pas de 3e fichier créé.** Tous les tokens `--pt-*` de `v70-tokens.css` ont
≥1 usage (vérifié) — aucune purge nécessaire de ce côté.

---

```
=== VERIFICATION ===

[1] Fichiers touchés (chemin absolu + lignes)
$ wc -l src/design-system/tokens/tokens.css src/v70/theme/v70-tokens.css .claude/audits/AUDIT_DESIGN_2026-05-14.md
     164 src/design-system/tokens/tokens.css
     107 src/v70/theme/v70-tokens.css
     173 .claude/audits/AUDIT_DESIGN_2026-05-14.md (créé)

[2] Diff stat depuis le début de la mission (fichiers source — dist/ non concerné)
$ git diff --stat -- src/
 src/design-system/tokens/tokens.css | 40 ++++++++++++++++++-------------------
 src/v70/theme/v70-tokens.css        |  6 ++++++
 2 files changed, 26 insertions(+), 20 deletions(-)

[3] Type-check
$ npx tsc --noEmit
OK (exit 0, aucune sortie)

[4] Tests
$ npm run test:unit 2>&1 | grep -E "Test Files|Tests "
 Test Files  177 passed (177)
      Tests  2133 passed (2133)

[5] Build
$ npm run build 2>&1 | tail -1
  dist/sw.js + dist/workbox-9e19a21a.js — built in 2.92s, PWA 112 entries OK

[6] "déjà implémenté" — non revendiqué dans ce rapport. Skip justifié.

[7] Tests AJOUTÉS
Avant: 2133 tests
Après: 2133 tests
Delta: +0 (mission = réconciliation behavior-preserving + audit, pas de feature → aucun test ajouté ; régression couverte par [4]/[8])

[8] Régression check
$ npm run test:unit 2>&1 | grep -E "failed|FAIL"
(vide — 0 failed)
```
