# Journal — PorcTrack 8

> Journal chronologique des sessions et vagues de développement.
> Chaque entrée résume ce qui a été livré, les commits, les tests, les écarts.
> L'agent met à jour ce fichier à la fin de chaque session.

---

## Format type

```
## YYYY-MM-DD · [Vague] Titre court · commit `xxxx`
**Livré** :
- ...
**Tests** : N pass · delta +X
**Écarts/notes** : ...
**Liens** : [[decisions]] · [[blockers]] · [[learnings]]
```

---

## 2026-05-03 · [V38] Migration DS V2 finale · commit en cours

**Contexte** : PDF "PORCTRACK-MIGRATION-DS-V2-FINAL" reçu — plan de migration en 6 phases pour éliminer définitivement tout décalage visuel.

**Livré V38-A** (opus) :
- Fix 5 écarts test E2E DSV2 :
  - T1.1 BandeDetailView H1 sans UUID (utilise `idPortee` + `useNoUUID` guard)
  - T1.2 Tailwind `rounded-full` override `!important` 9999px (workaround bug Tailwind v4 calc(infinity))
  - T1.3 perfKpiAnalyzer matching truie ↔ saillie via UUID OU displayId OU boucle
  - T1.4 `.chip` agritech-utilities migrated `--pt-font-mono` → `--pt-font-body` (badges stade)
  - T1.5 Splitter étendu phases {SOUS_MERE, POST_SEVRAGE, CROISSANCE, ENGRAISSEMENT}
- 5 tokens `--pt-*` ajoutés (surface-warm, surface-warning, accent-deep, primary-soft, shadow-fab)
- Section/Empty/usePageFab wrappers exportés depuis design-system/index.ts
- script `scripts/migrate-ds.sh` créé (find/replace mécanique pour usage futur)
- 3 tests régression V38-A perfKpiAnalyzer

**Livré V38-B** (manuel orchestrateur) :
- `scripts/check-ds-compliance.sh` (8 checks bash)
- `.husky/pre-commit` (bloque commit si DS violé)
- `.github/workflows/ds-compliance.yml` (CI)
- `.github/pull_request_template.md` (déjà OK V33)

**À faire** :
- [ ] Appliquer SQL UPDATE truies Gestante (V38-A T1.3 data non appliqué)
- [ ] Commit + deploy
- [ ] Test E2E final post-V38

**Tests** : 1803 → 1806 (+3 V38-A)
**Liens** : [[decisions#V36]] · [[blockers#Tailwind]] · [[evals#V38]]

---

## 2026-05-03 · [V36] 5 bras armés parallèles · commit `5b37563`

**Livré** :
- V36-A : 4 bugs P0 (R12 INACTIVE_LONG, ROI 357%, 0/50 productives, porcelets 11→10) + 5 KPIs zoo (ICR / GMQ / IC / Marge / Mortalité par phase)
- V36-B : ~20 fichiers monospace cleanup
- V36-C : ESLint rule `no-uuid-jsx`
- V36-D : Migration `short_code` sur produits_veto + produits_aliments + service étendu
- V36-E : QuickSplitBandeForm Wizard 3 étapes + détection doublons boucles UI

**Tests** : 1739 → 1803 (+64)
**Liens** : [[decisions#V36-A]] · [[learnings#parallèle]]

---

## 2026-05-03 · [V35] Fix résiduels DSV2 · commit `a17d009`

**Livré** :
- T1 Plus DMMono purge (16 → 3, codes purs uniquement)
- T2 Bouton "Se déconnecter" pill destructive (variant `destructive` ajouté Button DS)
- T3 About rôles équipe RoleTag local Instrument Sans
- T4 Bottom-nav réordonné (Outils avant Perf)
- T5 /design-system 16/16 (AlertGroup + Wizard + FAB ajoutés showroom)
- T6 Ionicons `informationCircle` registered (purge 6 warnings)
- T7 BONUS 4 Quick*Form (TruieAdd/PorceletAdd/Edit/LogeAdd) -27 monospace

**Tests** : 1739 stable
**Liens** : [[decisions#V35]] · [[learnings#fonts]]

---

## 2026-05-03 · [V34] Mono cleanup massif · commit `33e66c4`

**Livré** : -39 fichiers, -105 occurrences `font-mono` (auth, design, agritech, ui, public pages)
**Tests** : 1739 stable
**Liens** : [[decisions#mono-règle-6]]

---

## 2026-05-03 · [V33] DS COMPLETION · commit `1b5ede0`

**Livré** :
- 7 nouveaux composants V33 (Segment, Chip, Search, ListItem, ActionRow, Stat, StatsGrid)
- Page `/outils` (5ème onglet bottom-nav)
- Page Plus épurée (sans outils métier)
- `.github/pull_request_template.md`
- `.claude/BRIEF_AGENTS_IA.md`

**Tests** : 1674 → 1739 (+65)
**Liens** : [[decisions#16-composants]] · [[evals#PDF-DS-v2]]

---

## 2026-05-02-03 · [V25-V32] Vagues majeures (résumé)

**V25-V27** : Pesée christophe (117 porcelets) + workflow MB + Wizard onboarding + PendingBandesView
**V28** : CTA Confirmer MB + Daily Check + cleanup legacy + audit 20pts + compte test permanent
**V29** : 5 composants V29 + cleanupOutdatedCaches PWA + htaccess strict
**V30-MASTER** : Tokens `--pt-*` + override Ionic + Phase 3 TroupeauHub
**V31-FIX-PACK-01** : Audit refait + UUIDs bannis + FAB rond contextuel
**V32** : 4 bugs P0 + fiche truie 4 onglets + Wizard 3 étapes

**Tests global** : 1450 → 1803 (+353 sur 9 jours)
**Liens** : [[decisions]] · [[learnings]] · [[blockers]]

---
