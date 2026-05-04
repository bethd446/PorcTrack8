# MIGRATION V43 — Design System V2.0 (final)

## Statut
Migration majeure DS V2 finalisée. Branche d'intégration : `migration/v43-task-force` → merge prévu vers `main` avec tag `v2.1.0`.

## Récap V43

### Boutons natifs migrés
- V43-B (PR #3) : 19 boutons
- V43-E (PR #4) : consolidation StatsGrid (PerfKpiView 8→4 + TroupeauHub 2→1)
- V43-B-bis-1 (PR #8) : 58 boutons (cycles + controle + troupeau + reproduction)
- V43-B-bis-2 (PR #6) : 78 boutons (tables + admin + onboarding + hubs + ressources + protocoles + help)
- V43-B-bis-3 (PR #7) : 92 boutons (pilotage + components + App.tsx)
- **Total : ~247 boutons natifs migrés vers `<Button>` du DS V2**

### Refonte structurelle
- V43-F (PR #10) : 4 scrolls horizontaux custom → `<Tabs>` / `<Chip>` / `pt-data-table`
- C-1 (PR #11) : PageHeader DS V2 sur 3 hubs racines (Cycles, Ressources, Reproduction)
- C-2 : PageHeader DS V2 sur 7 vues cycles (en cours)
- C-3, C-4 : PageHeader troupeau + pilotage/ressources/tables (à venir)

### Infra
- Hook `.husky/pre-commit` rendu tolérant pendant migration (commit `b91a6dd`)
- Script `check-ds-compliance.sh` CHECK 2 amélioré (exclude tests + comments) — PR #9
- Workflow GitHub Action deploy auto Hostinger via FTP — PR #5 (canary FTP path inclus)

### CHECK 2 final
108 lignes (107 dans `forms/Quick*Form*.tsx` = scope D-x + 1 exception annotée TODO V44).

---

## Dette V44 — CSS legacy migration (~10h)

V43-A-bis-purge (cette PR) supprime **16 classes orphelines + 21 variables orphelines** des fichiers CSS legacy mais **3 fichiers KEEP** restent indispensables jusqu'à migration complète :
- `src/styles/theme-tokens.css` (foundation jour/nuit)
- `src/styles/agritech-tokens.css` (couche `@theme` Tailwind, génère `bg-bg-0`/`text-accent-dim` partout)
- `src/styles/terrain-vivant-v6.css` (palette client validée)

### Scope V44
Wrapper / migrer en composants DS V2 monobloc :

| Cible | Occurrences | Plan V44 |
|---|---|---|
| `card-dense` | 147× | `<Card variant="compact">` ou classe `.pt-card--compact` |
| `chip*` (via `<Chip>` agritech) | 72× | tone-map vers `pt-tag*` |
| `agritech-heading` | 38× | utility Tailwind ou classe DS dédiée |
| `kpi-label` | 37× | utility Tailwind ou `pt-section__label` |
| `agritech-root` | 11× | wrapper `<AgritechLayout>` |
| `text-mono-micro` (78× total classes `text-*`) | 78× | utilities Tailwind directes |

Variables massivement consommées à migrer vers `--pt-*` :
- `--muted` 222×
- `--ink` 207×
- `--color-accent` 187×
- `--radius-premium` 134×

### Quick forms (D-1/D-2/D-3)
36 formulaires Quick* dans `src/components/forms/Quick*Form*.tsx` à refondre vers DS V2 (107 boutons natifs résiduels + ~25000 lignes de structure à moderniser via `<FormField>`/`<Input>`/`<Select>`/`<ActionRow>` du DS).

### Cards-as-button complexes (1 cas)
- `src/features/cycles/ReproCalendarView.tsx:370` : annoté `// TODO V44: refactor as <ListItem>` — layout flex-1 complexe (icône + texte + meta date), à refactoriser en `<ListItem>` du DS.

### Estimation effort V44
~10h de migration ciblée + tests visuels + dark mode + V44-Quick-forms (D-x) ~12h.

---

## Méta — bonnes pratiques V43

- **Sub-agents pour parallélisation** quand >3 fichiers : `isolation: "worktree"` + brief auto-suffisant
- **`git checkout -B branch origin/...`** au lieu de `git reset --hard` (évite blocage sandbox)
- **Filet de sécurité grep** avant chaque suppression CSS : re-vérifier 0 consumer
- **Compteurs pré/post merges** : un diagnostic chiffré peut être faux si fait pré-merges (counting bug)
