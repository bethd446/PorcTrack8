# V41 — Uniformité architecture de page

**Branche** : `migration/ds-v2-final`
**Date** : 2026-05-03
**Périmètre V41** : refonte d'architecture de page (header sobre, hero card unique, toolbar minimale, liste cohérente). LA 11e RÈGLE D'OR ajoutée au DS canonique.

---

## V41 — État final

### Métriques

| Indicateur | V41 (HEAD) | Baseline V40 | Δ |
|---|---|---|---|
| **Tests** | **1685 ✅** / 6 skipped / 0 fail (136 files) | 1682 ✅ / 132 files | +3 tests, +4 files |
| **Typecheck** | **OK** (0 erreur tsc) | OK | — |
| **Build** | **3.10s, 5.4M dist** | 2.94s | dans la marge |
| **Lint** | **30 errors / 129 warnings** | 30 / 132 | **−3 warnings** (0 régression) |
| **check-ds-compliance** | 3 erreurs / 4 warnings | 3 / 3 | +1 warning V41 (CHECK 15 multi-StatsGrid attendu sur dashboards) |

Les 3 erreurs compliance sont héritées V39/V40 (hex fallbacks `var(--x, #fff)` dans 5 fichiers hors scope V41) — voir dette technique.

### Liste des commits V41 (10)

```
b37ba35 refactor(v41): uniformiser toolbars TroupeauTruiesView via DS V2 (V41-G)
230a3eb feat(ci): étendre check-ds-compliance avec 3 règles V41 (CHECK 13-15)
afcdcc8 refactor(v41): /today /audit /outils /more — headers via PageHeader (V41-D)
98eb820 refactor(v41): classement header sobre + cleanup table legacy (V41-C3)
ed0ab9e refactor(v41): pilotage header sobre + bouton Classement déplacé (V41-C2)
879d51c refactor(v41): TruieDetailView hero compact + tabs propres (V41-C1)
1b5fae3 refactor(v41): troupeau header sobre + structure 3 sections (V41-B)
fb46924 feat(ds): PageHeader canonique pour enforcer pattern header sobre (V41-A)
```

(28+ commits cumulés sur `migration/ds-v2-final` depuis la création de la branche, V39+V40+V41).

### Statut des 8 pages principales — TOUTES en DS V2 strict

| Page | Route | Statut V41 | Mécanique |
|---|---|---|---|
| 1. Aujourd'hui | `/today` | ✅ DS V2 strict | `<PageHeader>` (eyebrow "Aujourd'hui" + h1 dynamique + date subtitle) |
| 2. Outils | `/outils` | ✅ DS V2 strict | `<PageHeader>` "OUTILS" + sections `<ActionRow>` |
| 3. Plus / Settings | `/more` | ✅ DS V2 strict | `<PageHeader>` "RÉGLAGES" + sections `<ActionRow>` + `<Toggle>` |
| 4. Audit | `/audit` | ✅ DS V2 strict | `<PageHeader>` "AUDIT" (subtitle "Suivi qualité de ta ferme", non-numérique) + `<Tabs>` filtres + `<AlertGroup>` |
| 5. Pilotage | `/pilotage` | ✅ DS V2 strict | `<PageHeader>` "PILOTAGE" + KPI Cards + sections + bouton Classement déplacé ici (depuis Troupeau) |
| 6. Élevage | `/troupeau` | ✅ DS V2 strict | `<PageHeader>` "ÉLEVAGE" sobre + 1 hero `<Card>` VUE D'ENSEMBLE (4 stats) + `<Tabs>` + toolbars uniformisées (`<Segment>` + `<Chips>` DS V2) + liste `<AnimalListItem>` |
| 7. Fiche truie | `/troupeau/truies/[id]` | ✅ DS V2 strict | `<PageHeader>` "FICHE TRUIE" + h1 displayId + Card hero compacte (IconBox 64×64 + Tags + boutons) + `<Tabs>` + `<CycleTimeline>` + `<LineageBreadcrumb>` (déplacée sous tabs) |
| 8. Reproduction | `/reproduction` | ✅ RÉFÉRENCE inchangée | Pattern DS V2 conservé (header sobre + sections étapes + CTA pills + FAB extended MISE-BAS contextuel) |

### Captures split-screen

8 captures dans `.claude/audits/v41/` (référence `/reproduction` à gauche, page V41 à droite) :

- `split-1-today.png` — Today
- `split-2-outils.png` — Outils
- `split-3-plus.png` — Plus / Settings
- `split-4-audit.png` — Audit
- `split-5-pilotage.png` — Pilotage
- `split-6-troupeau.png` — Élevage (scrolled to la liste 50 truies)
- `split-7-fichetruie.png` — Fiche truie T-001
- `split-8-reproduction.png` — Reproduction (référence comparée à elle-même comme contrôle)

Pattern visuel uniforme : eyebrow dot vert + label SMALL CAPS, h1 Big Shoulders, subtitle 1 ligne sans métriques, hero cards beige `--pt-surface`, boutons pills verts `--pt-primary`, IconBox carré beige `--pt-surface-warm`, tags pills DS V2.

---

## Dette technique acceptée (documentée pour V42)

### 1. Composants `src/components/design/*` (21 fichiers legacy)

Toujours présents et consommés, mais wrappés autour de styles legacy ou Tailwind hors-DS V2 :

| Composant | Consumers | Impact |
|---|---|---|
| Eyebrow | 37 | Largement remplacé par `<PageHeader>` sur les pages V41 mais reste dans des sub-views et formulaires |
| TopBarSync | 32 | Modifié V40 T1 (sync/Marius conditionnels) mais base CSS legacy |
| EmptyState | 18 | Empty placeholder Tailwind |
| KpiCard | 15 | Alternative DS V2 = `<StatsGrid>` + `<Stat>` ; à migrer |
| NotesTimeline | 4 | Timeline custom |
| AnimalHero / SowHero | 1 (TruieDetailView, V41 a refait son propre hero compact) | Quasi-orphelin |
| Autres (CommandPalette, PhaseBadge, PublicShell, DecisionBinaire, ReproTracker, SyncIndicator, TimelineVerticale, LineageBreadcrumb, LineageTree, Chip, MariusFAB, MariusPanel, CohortTimeline, Sidebar) | 0–4 | Legacy ponctuel |

### 2. Classes Tailwind non-DS V2 — **2129 occurrences sur 113 fichiers** (55% du codebase TSX)

Patterns concernés : `text-text-0`, `bg-bg-2`, `border-border`, `text-accent`, `bg-accent`. Ces classes mappent sur les anciens tokens `--ink-*`, `--bg-*`, `--accent-*` (CSS legacy `src/styles/*`), pas sur les `--pt-*` du DS V2.

**Top 9 fichiers concernés** :
- `src/features/tables/bandes/BandeDetailView.tsx` — 73 occurrences
- `src/features/onboarding/OnboardingWizard.tsx` — 65
- `src/components/forms/QuickEditVerratForm.tsx` — 58
- `src/components/forms/QuickAddBandeForm.tsx` — 48
- `src/components/forms/QuickEditBandeForm.tsx` — 46
- `src/components/forms/QuickVenteForm.tsx` — 41
- `src/components/forms/QuickEditStockForm.tsx` — 41
- `src/features/troupeau/SaillieSuiviPanel.tsx` — 40
- `src/components/forms/QuickPeseeForm.tsx` — 40

### 3. CSS legacy `src/styles/*` (7 fichiers)

Tous chaînés via `src/index.css` lignes 16-22 :

- `theme-tokens.css`
- `agritech-tokens.css`
- `agritech-utilities.css`
- `typography-utils.css`
- `theme-v2-tokens.css`
- `terra-v2-tokens.css`
- `terrain-vivant-v6.css`

Ils définissent les variables `--ink-*`, `--bg-*`, `--accent-*`, `--module-*`, `--bg-pig-*` consommées par les classes Tailwind legacy listées au point 2.

### 4. 9 formulaires Quick* + 2 vues riches (BandeDetailView, OnboardingWizard)

UI ponctuelle (modaux, parcours guidé, sub-route rare) hors du flux principal. Style mixte (Tailwind legacy + DS V2 partiel).

### 5. Rétro-compat DS V2 monobloc

Conservée depuis V39 (cf rapport NUKE) : `Button.variant=ghost|destructive`, `tone=` alias, `Tabs.items[]`, `Tag.variant=success`, etc. À retirer une fois la totalité du codebase migré.

### 6. Faux positifs check-ds-compliance restants

- **CHECK 4** (3 erreurs) : hex en fallback `var(--x, #fff)` dans `AgritechNavV2`, `SaisirSheet`, `EditableNumber/Text`, `PhotoStrip`, `pages/Landing.tsx`
- **CHECK 1** : faux positifs sur literals UUID dans tests
- **CHECK 10** : faux positifs sur intervalles `J0 → J28` non protégés
- **CHECK 15** (warning) : `PerfKpiView` avec 8 `<StatsGrid>` (dashboard multi-sections — légitime)

---

## Plan V42 (sessions futures, pas maintenant)

### V42-A — Façades wrappers (~1h, 52 fichiers impactés sans refactor appelants)

Transformer `Eyebrow`, `EmptyState`, `KpiCard` en façades qui rendent du DS V2 sous le capot :
- `Eyebrow` (37 consumers) → wrap `<PageHeader>` ou span pt-page-header__eyebrow
- `EmptyState` (18 consumers) → wrap `<Empty>` du DS V2
- `KpiCard` (15 consumers) → wrap `<Card>` + `<StatsGrid>` + `<Stat>`

Quick-win énorme : 52+ fichiers passent visuellement en DS V2 sans toucher leur code.

### V42-B — Formulaires Quick\* (~3-4h, ~400 occurrences Tailwind éliminées)

Migrer les 9 plus gros formulaires modaux vers `var(--pt-*)` + `<Card>` + `<FormField>` + `<Input>` + `<Button>` du DS V2.

### V42-C — BandeDetailView + OnboardingWizard (~2h)

Pages riches mais peu vues. Migration ciblée (BandeDetailView 73 occurrences, OnboardingWizard 65).

### V42-D — Purge CSS legacy `src/styles/*` (~30min)

Une fois V42-A/B/C complétées, plus aucun consommateur des classes Tailwind legacy. Retirer les 7 fichiers + l'import dans `src/index.css`.

### V42-E — Retrait rétro-compat DS V2 monobloc (~30min)

Retirer les `Button.variant=ghost|destructive`, `tone=`, `Tabs.items[]`, `Tag.success` etc. devenus inutiles.

---

## Recommandation finale

**Merge-ready**. Périmètre V40 + V41 verrouillé : 8 pages principales 100% DS V2 strict, 27 décalages corrigés (24 V40 + 3 V41), 4 nouveaux composants au DS canonique (Toggle, CycleTimeline, DataTable, PageHeader), 7 garde-fous CI ajoutés (CHECK 9-15), 0 régression fonctionnelle (1685 ✅ / 0 fail).

La dette V42 est **isolée** dans des zones secondaires (formulaires modaux, sub-routes, parcours d'onboarding) qui ne polluent pas le flux principal de l'app.
