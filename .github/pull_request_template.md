# Pull Request — PorcTrack 8

## Résumé
<!-- 1-2 phrases sur ce que la PR change et pourquoi -->

## Changements
- [ ] …

## Type
- [ ] feat (nouvelle feature)
- [ ] fix (bug)
- [ ] refactor (sans changement de comportement)
- [ ] docs / chore / style

---

## Design System Compliance (V33)

> Toute PR qui touche l'UI **doit** cocher chaque case ou justifier l'écart en
> commentaire. Référence : Design System v2.0 · Source of Truth.

- [ ] **Tokens uniquement** : aucune couleur en hex hardcodée — uniquement `var(--pt-*)` (ou alias `--ds-*`).
- [ ] **Typo canonique** : Big Shoulders pour titres + chiffres ; Instrument Sans pour le body. Pas de `font-mono` introduit dans un nouveau composant.
- [ ] **Composants DS** : utilisé `Card`, `Button`, `Tag`, `IconBox`, `Input`, `Tabs`, `Segment`, `Chip`, `Search`, `ListItem`, `ActionRow`, `Stat`, `StatsGrid`, `AlertGroup`, `AlertRow`, `Wizard` — pas de réinvention locale.
- [ ] **Tap targets ≥ 44px** sur tous les éléments interactifs (boutons, inputs, rows, segments).
- [ ] **Radius pill** sur les boutons et inputs canoniques (`var(--pt-radius-pill)`).
- [ ] **Pas de `-mt-X` négatif** pour positionner du contenu (utiliser flex/grid/children slot).
- [ ] **Eyebrow + H1** présents sur les vues de premier niveau, sous-titre body court.
- [ ] **Empty / loading / error states** définis quand pertinent.
- [ ] **A11y** : aria-label sur les boutons icône, role correct (tab/radio/dialog/group), focus visible.
- [ ] **i18n FR** : tous les textes UI en français — pas de chaîne anglaise oubliée.

## Test final

- [ ] `npx tsc --noEmit` retourne 0 erreur.
- [ ] `npm run test:unit` : tests baseline + nouveaux tests passent (0 failed).
- [ ] `npm run build` : build vert + chunks raisonnables.

---

## Captures (si UI)
<!-- before / after sur device mobile + desktop si applicable -->

## Notes pour le reviewer
<!-- décisions architecturales, pièges, suivi à prévoir -->
