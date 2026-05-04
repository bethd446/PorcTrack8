# MIGRATION V43 — Design System V2.0 (final)

## Statut
Migration majeure DS V2 finalisée sur la branche `migration/v43-task-force`. **Prête pour merge vers `main` + tag `v2.1.0` + déploiement prod via FTP workflow.**

## Métriques finales

| Métrique | Avant V43 | Après V43 | Delta |
|---|---:|---:|---:|
| Boutons natifs (CHECK 2) | 254+ | **20** | **−92%** |
| StatsGrid >1 par fichier (CHECK 15) | 2 fichiers | 0 | propre |
| Scrolls horizontaux custom (CHECK 12) | 4 | 0 | propre |
| Pages avec PageHeader DS V2 | 8 | **38** | +30 |
| Quick forms refondus DS V2 | 0 | **38** | tous |
| Classes CSS orphelines | 18 | 0 | purgé |
| Variables CSS orphelines | 25 | 0 | purgé |
| Tests passants | 1685 | **1685** | stable, 0 régression |
| Erreurs typecheck | 0 | 0 | stable |

**Total LOC nets supprimées V43** : ~3 500 lignes (refonte concise des forms + suppression classes legacy mortes).

---

## Récapitulatif des PRs (V43)

### Phase 1 — Infrastructure & boutons natifs
| PR | Titre | Fichiers | Boutons | LOC delta |
|---|---|---:|---:|---:|
| #1 | hot-fix V42-pre lint | 30 | — | — |
| #2 | V42-bugfix E2E | 7 | — | — |
| #3 | V43-B : 19 boutons natifs | 7 | 19 | +59/-42 |
| #4 | V43-E : StatsGrid PerfKpi 8→4 + TroupeauHub 2→1 | 7 | — | nouvelle architecture |
| #5 | Deploy Hostinger FTP + canary | 1 (workflow YAML) | — | — |
| #6 | V43-B-bis-2 : 78 boutons | 24 | 78 | +346/-385 |
| #7 | V43-B-bis-3 : 92 boutons | 41 | 92 | +584/-278 |
| #8 | V43-B-bis-1 : 58 boutons | 20 | 58 | +176/-272 |
| #9 | Script CHECK 2 amélioré | 1 | — | +8/-1 |

### Phase 2 — Refonte structurelle DS V2
| PR | Titre | Pages | LOC delta |
|---|---|---:|---:|
| #10 | V43-F : 4 scrolls custom → Tabs/Chips/pt-data-table | 4 | +18/-23 |
| #11 | C-1 : PageHeader sur 3 hubs racines | 3 | +19/-42 |
| #12 | V43-A-bis-purge : −16 classes −21 vars CSS orphelines + doc V44 | 5 | +77/-108 |
| #13 | C-2 : PageHeader sur 7 vues cycles | 7 | +44/-130 |
| #14 | C-3 : PageHeader sur 5 vues troupeau (skips justifiés) | 5 | +52/-125 |
| #15 | C-4 : PageHeader sur 15 vues pilotage/ressources/tables/autres | 15 | +162/-409 |

### Phase 3 — Quick forms refonte DS V2 (D-1 / D-2 / D-3)
| PR | Titre | Forms | LOC delta |
|---|---|---:|---:|
| #16 | D-1 : 3 plus gros forms (1431+1037+1036L) | 3 | +392/-1068 (-676 nets) |
| #17 | D-2 : 5 forms moyens (720-998L) | 5 | +317/-1231 (-914 nets) |
| #18 | D-3b : 13 forms Health/MiseBas/Mortality/Saillie/etc. | 13 | +201/-513 (-312 nets) |
| #19 | D-3a : 17 forms Add/Adopt/Confirm/Conso/Echo/Edit | 17 | +772/-2387 (-1615 nets) |

**Total forms refondus : 38/38** (3 + 5 + 17 + 13 = 38).

---

## Dette V44 (~22h estimées)

### CSS legacy — wrapper en composants DS V2 (~10h)
3 fichiers KEEP (indispensables) jusqu'à migration complète :
- `src/styles/theme-tokens.css` (foundation jour/nuit)
- `src/styles/agritech-tokens.css` (couche `@theme` Tailwind)
- `src/styles/terrain-vivant-v6.css` (palette client validée)

À migrer :
| Cible | Occurrences | Plan V44 |
|---|---:|---|
| `card-dense` | 147× | `<Card variant="compact">` ou `.pt-card--compact` |
| `chip*` agritech | 72× | tone-map vers `pt-tag*` |
| `agritech-heading` | 38× | utility Tailwind ou classe DS dédiée |
| `kpi-label` | 37× | utility Tailwind ou `pt-section__label` |
| `text-mono-micro` (78× total classes `text-*`) | 78× | utilities Tailwind directes |

Variables massivement consommées à migrer vers `--pt-*` :
- `--muted` 222× · `--ink` 207× · `--color-accent` 187× · `--radius-premium` 134×

### Quick forms — composants DS V2 manquants (~10h)
20 lignes CHECK 2 résiduelles, toutes annotées `// TODO V44` dans le code :

| Pattern | Forms concernés | Composant DS V2 manquant |
|---|---|---|
| Radio button-based (`<button role="radio">`) | QuickAddPorceletForm, QuickEditPorceletForm, QuickAddTruieForm, QuickAddTransactionForm, QuickEditTransactionForm, QuickEchographieForm, QuickAddVerratForm, QuickSaillieForm, QuickMoveSubjectForm, QuickMortalityForm, QuickSaillieBandeForm | **`<Radio>` à créer** |
| Checkbox natif | QuickAddFournisseurForm, QuickSplitBandeForm, QuickSaillieBandeForm | **`<Checkbox>` à créer** |
| Photo button + dictée vocale | QuickNoteForm | composant `<MediaPicker>` à créer |
| `IonSelect` popover (recherchable) | QuickHealthForm (cause/produit), QuickMortalityForm | `<SearchSelect>` à créer |
| `IonSegment` (BANDE/TRUIE/VERRAT) | QuickMortalityForm | `<Segment>` (existe en DS, à appliquer) |
| Card-as-button complexe (`<ListItem>`) | ReproCalendarView.tsx:370 | refactor en `<ListItem>` |

### Cleanup
- 4 sous-composants `quickMiseBas/*` (MiseBasTruieField, IdAndDateBlock, CountsBlock, PoidsAndNotesBlock) — out of scope V43
- Sous-composants `MotifSelect`, `ProduitVetoSelect` (QuickHealthForm) — pattern recherchable

---

## Composants DS V2 à créer en V44
- `<Radio>` / `<RadioGroup>` (high priority — 11 forms en attendent)
- `<Checkbox>` (3 forms)
- `<SearchSelect>` (recherche dans select, 2 cas)
- `<MediaPicker>` (photo + dictée, 1 cas)

---

## Méta — bonnes pratiques V43 (à conserver V44+)

### Orchestration sub-agents
- **`isolation: "worktree"`** systématique pour parallélisation sûre (pas de conflits working tree)
- **Briefs auto-suffisants** : chaque sub-agent recharge contexte from scratch, brief doit contenir tout le nécessaire
- **`git checkout -B branch origin/...`** au lieu de `git reset --hard` (sandbox-friendly)
- **PAS de `--no-verify`** sauf cas exceptionnel autorisé explicitement
- **Filet de sécurité grep** avant suppressions CSS : re-vérifier 0 consumer

### Pattern de migration Quick forms (établi V43-D)
```tsx
// AVANT
<div>
  <label>Label</label>
  <input value={x} onChange={...} className="..." />
  {errors.x && <p>{errors.x}</p>}
</div>

// APRÈS
<FormField label="Label" error={errors.x}>
  <Input value={x} onChange={...} aria-label="Label" />
</FormField>
```

⚠️ **Pas de `<ActionRow>` pour footer modal** (c'est un menu-list). Utiliser `<div className="flex gap-3 ...">` + `<Button>` côte-à-côte.

⚠️ **Tests a11y `*.a11y.test.ts`** : conserver `aria-label="..."` (kebab) au lieu de `ariaLabel="..."` (camelCase prop DS) pour préserver le grep dans les tests.

### Anti-patterns à éviter
- Compteurs CHECK 2 pré-merges (counting bug, voir V43-B-bis-final)
- Sub-agents sans `isolation: "worktree"` (sandbox plus restrictif)
- Migration en parallèle de fichiers partagés (helpers)

---

## Compliance finale (post-merges V43)

| CHECK | Avant V43 | Après V43 | Status |
|---|---|---|---|
| 1 — UUIDs JSX | ✓ | ✓ | propre |
| 2 — Boutons natifs | 254+ lignes | 20 lignes (TODO V44) | **−92%** |
| 3 — IonButton | warn | warn | dette héritée |
| 4 — Hex en dur | ✓ | ✓ | propre |
| 5 — radius px direct | ✓ | ✓ | propre |
| 6 — font-family inline | ✓ | ✓ | propre |
| 7 — imports legacy | ✓ | ✓ | propre |
| 8 — tags EN | ✓ | ✓ | propre |
| 9 — variants illégitimes | ✓ | ✓ | propre |
| 10 — → ASCII | warn | warn | faux positifs commentaires |
| 11 — double `<Fab>` | ✓ | ✓ | propre |
| 12 — scroll horiz custom | warn | ✓ | **résolu V43-F** |
| 13 — `<Button>` dans `<PageHeader>` | ✓ | ✓ | propre |
| 14 — subtitle métriques chiffrées | ✓ | ✓ | propre |
| 15 — 2+ `<StatsGrid>` | warn | ✓ | **résolu V43-E** |

**1 ÉCHEC bloquant** (CHECK 2) avec 20 lignes documentées TODO V44 (scope V44 défini, composants DS manquants à créer).

---

## Tests & build

- `npx tsc --noEmit` : **0 erreur**
- `pnpm vitest run` : **136 fichiers, 1685 tests passants, 6 skipped, 0 fail**
- `npm run build` : **success** (PWA 110 entries, ~4.2MB précachées)

---

## Prochaines étapes (post-merge `main`)

1. Tag `v2.1.0` avec récap V40+V41+V42+V43
2. Push `main` → trigger automatique workflow `deploy.yml` (Hostinger FTP)
3. Surveiller logs deploy + canary FTP path validation
4. Smoke test prod après deploy (curl + login compte test)
5. V44 : créer `<Radio>` / `<Checkbox>` DS, migrer card-dense / chip / kpi-label

---

🤖 Migration orchestrée par un agent Claude (Sonnet) avec dispatch sub-agents worktree-isolated pour parallélisation. 19 PRs au total mergées sur `migration/v43-task-force`.
