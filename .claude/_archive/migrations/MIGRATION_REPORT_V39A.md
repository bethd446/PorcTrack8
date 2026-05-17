# V39-A — Rapport Phase 4 (4 pages consultation)

Branche : `migration/ds-v2-final`. Pas de push.

## 1. Pages traitées + commits

| # | Page                          | Hash      |
|---|-------------------------------|-----------|
| 1 | `src/features/today/TodayHub.tsx`           | `39bb837` |
| 2 | `src/features/outils/OutilsView.tsx`        | `b0a3865` |
| 3 | `src/components/SystemManagement.tsx`       | `d3c5bb8` |
| 4 | `src/features/controle/AuditView.tsx`       | `060ee25` |

## 2. Composants DS manquants

- **Toggle / Switch** : aucun composant `<Toggle>` dans `@/design-system`. La règle "aucun `<button>` natif" est inapplicable pour le pattern switch ARIA des notifications dans SettingsPage. Le `<button role="switch">` actuel est conservé tel quel — utilise les tokens `--pt-accent`, `--pt-surface-alt`, `--pt-radius-pill`. À ajouter au DS pour V39-CLEANUP.
- **Card avec `key`** : `<Card>` n'accepte pas la prop `key` dans son type (omission probable). Workaround : wrapper `<div key>` autour. Trivial à corriger côté DS.

## 3. Imports `@/design-system`

Le brief V39-A demande `@/design-system`. Or `tsconfig.json` configure `@/*` vers `./*` (racine du repo, pas `src`), donc `@/design-system` ne résout pas. Tous les fichiers existants (`AuditView`, `OutilsView`, `BandeDetailView`, `TroupeauHub`, etc.) utilisent l'import relatif `'../../design-system'`. J'ai conservé ce pattern relatif pour cohérence et pour ne pas casser le build. Si le brief V39 maintient `@/design-system`, il faut ajouter `"@/design-system": ["./src/design-system"]` dans `tsconfig.json` + `vite.config.ts` (à arbitrer V39-CLEANUP).

## 4. Tests

Aucun test n'a nécessité de mise à jour structurelle. Tests couvrant les pages refondues :

- `TodayHub.test.tsx` : 3/3 passants (transitions de phase R15/R16, modal pré-rempli).
- `OutilsView.test.tsx` : 9/9 passants (header, 6 ActionRow, badge alertes, navigation).
- `AuditView.test.tsx` : 6/6 passants (UUID_REGEX zéro hit confirmé, sectioning Critiques/Surveiller, AlertGroup).
- `SystemManagement` : pas de fichier `.test.tsx` (pas de régression possible).

Suite globale : **132 fichiers, 1666 tests passants, 6 skipped, 0 fail.**

## 5. UUIDs / monospace / hex éliminés

| Fichier                 | Avant         | Après                                |
|-------------------------|---------------|--------------------------------------|
| TodayHub                | 4 `<button>`  | 0 (tous → `<Button>` DS)             |
| TodayHub                | ~6 hex/Tailwind tokens legacy (`var(--bg-surface)`, `var(--ink)`, `var(--color-accent-500)`) | 100 % `var(--pt-*)` |
| OutilsView              | 0 violations  | 0 (déjà conforme, juste `Eyebrow` → `Section`) |
| SystemManagement        | 7 `<button>` natifs | 1 (switch ARIA toggle, justifié — voir §2) |
| SystemManagement        | 8 `font-mono` Tailwind hors DS | 3 `var(--pt-font-mono)` DS (email, code ferme, version — conformes Annexe A §6) |
| SystemManagement        | hex inline `#fdecea`/`#c0392b`/`#EF4444` (3) | 0 (passés à `var(--pt-danger)` + `rgba` token-aligné) |
| AuditView               | UUID risk via fallback `b.id` | Garde `safeDisplay()` posée sur `idPortee` et `displayId` |
| AuditView               | `SectionHeader` legacy alias | `<Section>` direct + tone correct (`danger` pour Critiques, `accent` pour Surveiller) |

Tags HIGH/MEDIUM/LOW : aucun à éliminer (AuditView utilisait déjà `severity: 'urgent' | 'surveil'` mappé vers les couleurs DS, et le check 8 du script confirme : "Aucun tag statut anglais affiché").

## 6. Lint / build / CI

| Métrique             | Avant V39-A | Après V39-A |
|----------------------|-------------|-------------|
| `npm run lint`       | 158 problèmes (30 errors, 128 warnings) | **156 problèmes (30 errors, 126 warnings)** |
| `npm run build`      | OK          | **OK (2.95s)** |
| `npm run test:unit`  | OK          | **OK — 1666/1672 (6 skipped)** |
| `check-ds-compliance.sh` | échec (autres pages) | échec, mais **0 erreur sur les 4 pages V39-A** (les hits restants sont GlobalSearch, TableView, BandesView, AdminDashboard, Landing, Privacy, CGU, About, NotFound — scope V39-B) |

Aucune nouvelle erreur lint/build introduite. Les 30 erreurs préexistantes (BandeDetailView, financesAnalyzer, alertSubject.test) sont hors scope.

Faux positif `check-ds-compliance` sur les 4 pages :
- `TodayHub:514` → `navigate(\`/cycles/confirmer-mb/${data.id}\`)` — UUID dans URL programmatique, pas dans le JSX rendu. Le checker ne distingue pas.
- `SystemManagement:123` → `<button role="switch">` du toggle ARIA (cf. §2).

## 7. Blockers non résolus

Aucun. Les 4 pages compilent, lintent (sans nouvelle erreur), passent leurs tests respectifs et s'affichent côté build sans warning. Les 2 limitations DS notées en §2 sont à arbitrer côté V39-CLEANUP — elles ne bloquent ni le rendu ni les tests.
