# AUDIT 100 POINTS — Plan d'action consolidé

Date : 2026-05-02 · 5 agents bras-armé persona-éleveur

## Score global

| Module | Score | Frustrations |
|---|---|---|
| Cheptel | **22/25** | 5 P0 + 10 P1 + 7 P2 |
| Reproduction | **8/25** (17 frustr.) | 5 P0 + 10 P1 + 2 P2 |
| Performance | **9/20** (11 frustr.) | 5 P0 + 7 P1 + 4 P2 |
| Plus/Stocks | **9/20** (11 frustr.) | 5 P0 + 5 P1 + 2 P2 |
| Design system | **4.5/10** (5.5 frustr.) | 4 P0 + 5 P1 + 1 P2 |
| **TOTAL** | **52.5/100** | **24 P0 + 37 P1 + 16 P2** |

L'app n'est **pas prête terrain** dans cet état pour 50 truies — 24 frictions P0 bloquent l'éleveur en bottes.

---

## P0 critiques — 24 fix prioritaires

### Cheptel (5)
1. **Bottom-tab Élevage redirige vers /cycles** — `AgritechNavV2.tsx:214` — retirer `'/cycles'` du `match[]`
2. **Bouton "Éditer" planqué bas de fiche truie** (border dashed) — `TruieDetailView.tsx:875` — promouvoir en CTA secondaire dans header SowHero
3. **Préfixe AUDIT-T-/V-/B- non modifiable** dans 3 forms — `QuickEditTruieForm.tsx:288` + Verrat + Bande — ajouter input displayId éditable + migration DB `display_id` si absente
4. **Auto-redirect parasite scroll → /reproduction** — investiguer `useAutoRefresh.ts` + listeners IonRefresher dans TroupeauHub
5. **FARM_CONFIG hardcodé 9/6/6 loges K13** — `config/farm.ts:21-42` — migrer vers `farm_settings` table Supabase + FarmContext

### Reproduction (5)
6. **Statut truies désynchronisé** entre 4 vues (Today/Hub Repro/Maternite/TruieDetail/CyclesHub) — jointure `truie.id ↔ bande.truieMereId ↔ saillie.truieId` cassée — `reproductionDashboard.ts` + `MaterniteView.tsx`
7. **/reproduction/lots tous "EN SAILLIE 0"** — `reproductionBatchAnalyzer.ts` ne joint pas portées
8. **Compteurs jours faux dans /cycles** (20 gestations "J+0/115", 9 cartes "IMMINENT 0J") — `CyclesHub.tsx:201-213`
9. **ISSE/IEM "—" sans message** alors qu'on a la donnée — `ReproductionHub.tsx:284,290` — fallback "Pas assez de données (X/5)"
10. **/cycles/finition affiche `19 490 415 €`** absurde (devise FCFA non convertie) — `FinitionView.tsx` formatCurrency

### Performance (5)
11. **Tab Perf pointe sur /pilotage/perf** au lieu du hub — `AgritechNavV2.tsx:225` — `path: '/pilotage'` (cohérence pattern hub-first)
12. **Top/Flop bandes non cliquables** — `PilotageHub.tsx:515-585` — wrap en `<Link>` ou onClick
13. **ClassementView orpheline** : pas IonPage/AgritechLayout/TopBarSync — `ClassementView.tsx:107`
14. **Grid 4 cols fixe à 320px illisible** — `PilotageHub.tsx:124,332` — `grid-cols-2 md:grid-cols-4`
15. **Fallback FCFA inversé** — `financesAnalyzer.ts:135,161` — supprimer default, exiger devise en param

### Plus/Stocks (5)
16. **🚨 BLOQUANT — Alertes véto absentes** — `alertEngine.ts:719` ne boucle pas sur `stockVetos`. Vaccin Parvo BAS jamais alerté.
17. **/more sans Outils terrain** (Alertes/Contrôle/Santé/Protocoles/Ressources/Fournisseurs invisibles) — `SystemManagement.tsx:608+`
18. **Bottom-nav muet sur /controle, /sante** (active "Aujourd'hui") — `AgritechNavV2.tsx:236` — étendre `match[]`
19. **WhatsApp commande signée "K13"** au lieu du nomFerme — `AlimentsView.tsx:40,422,431` + `PharmacieView.tsx:29,599` — propager useMeta().nomFerme jusqu'aux Row CTA
20. **Tap target "Nouvel aliment" 36px** (sub-44 WCAG) — `AlimentsView.tsx:634` — h-9 → h-11

### Design system (4)
21. **Eyebrow 9.5px illisible** plein soleil — `Eyebrow.tsx:38` → 11px weight 600
22. **Chip 10px illisible** — `Chip.tsx:45` → 12px
23. **`--text-2: #8A8A8A` 3.31:1 FAIL WCAG** — `theme-tokens.css:21` → `#6B6B6B` (5.4:1)
24. **Amber-pork sur Chip "Allaitante" 1.97:1 FAIL** — palette à revoir pour status chips

---

## Plan d'exécution recommandé — 5 vagues

### Vague 4 — P0 critiques cleanup (1-2 jours, 24 fixes)
Une seule session focalisée sur les 24 P0. Cleanup avant Vague 2/3.

**Sprint 4A — Routing + Edit + Identité** (~6h)
- Fix #1 #11 nav (AgritechNavV2.tsx)
- Fix #2 promotion bouton Éditer
- Fix #3 displayId éditable (3 forms + migration DB)
- Fix #5 #19 FARM_CONFIG → farm_settings + propagation nomFerme

**Sprint 4B — Données métier cohérentes** (~6h)
- Fix #6 jointure truie↔bande↔saillie (`reproductionDashboard.ts`)
- Fix #7 reproductionBatchAnalyzer
- Fix #8 compteurs jours réels CyclesHub
- Fix #9 fallback "Pas assez de données"
- Fix #16 alertes stockVetos dans alertEngine

**Sprint 4C — UI + Devise + Contraste** (~5h)
- Fix #10 #15 devise EUR partout
- Fix #14 grid responsive
- Fix #20 tap target 44px
- Fix #21 #22 #23 #24 design system contraste WCAG
- Fix #4 auto-redirect parasite (debug + fix scroll listener)

**Sprint 4D — Nav unifié** (~3h)
- Fix #12 #13 Top/Flop cliquables + ClassementView wrap IonPage
- Fix #17 #18 /more "Outils terrain" + match nav

**Validation Vague 4** : tests unitaires + e2e + persona Christophe (re-test 100pts via 5 agents).

### Vague 5 — Cohérence visuelle (déjà planifiée VAGUE_3_PLAN.md)
- Composant unifié `<AnimalListItem>` (TruiesView/VerratsView/PorceletsView/LogesView)
- Hero pattern (TruieDetailView/VerratDetailView/BandeDetailView)
- Dedup `Chip` (agritech vs design)
- AppToast wrapper standardisé

### Vague 6 — Bandes multi-mères + loges (VAGUE_2_PLAN.md acté)
23h / 4 sprints — table batch_sows + loges + onboarding loges typées.

### Vague 7 — Polish typographie (VAGUE_3_PLAN.md acté)
28-30h / 6 sprints — 1870 occurrences à migrer vers 10 classes utilitaires.

### Vague 8 — Refonte Hub Pilotage (P1 #20 audit Perf)
Module gestion en navigation primaire + 4e tuile Classement + filtrage Trésorerie cumul.

---

## Budget effort total estimé

| Vague | Description | Effort |
|---|---|---|
| V4 | 24 P0 critiques cleanup | 20h |
| V5 | Cohérence visuelle | 12h |
| V6 | Bandes multi-mères + loges | 23h |
| V7 | Polish typographie | 28-30h |
| V8 | Refonte Pilotage Hub | 8h |
| **TOTAL** | | **~91-93h** |

Recommandation : V4 immédiate (terrain bloqué sinon), V5+V6+V7 en parallèle ensuite si plusieurs agents Opus dispo.

---

## Frustrations terrain (codes F1-F15) — distribution

| Code | Description | Occurrences |
|---|---|---|
| F1 | Tap impossible (<44px) | 5 |
| F3 | Texte illisible plein soleil | 8 |
| F4 | Saisie laborieuse | 6 |
| F6 | Cherche pas trouve | 4 |
| F7 | Vocabulaire pro confus | 4 |
| F8 | Action en double / feedback ambigu | 5 |
| F9 | Calculs absents | 2 |
| F10 | Décision pas suggérée | 2 |
| F11 | Photo galère | 1 |
| F12 | Données fausses publiées | 12 ⚠ critique |
| F13 | Identité ferme floue | 8 |
| F14 | Devise étrangère | 3 |
| F15 | Refonte menu disruptive | 7 |

**F12 (12×) et F13 (8×) sont les frustrations dominantes** — Christophe ne peut pas faire confiance aux chiffres affichés ni à l'identité de sa ferme.

---

## Décision attendue de l'utilisateur

**Lance-t-on Vague 4 (24 P0 cleanup) immédiatement ?**

- **OUI rapide** : 4 agents Opus parallèles (Sprints 4A/4B/4C/4D) — résultat en ~3-4h chronologique
- **OUI séquentiel** : 1 agent à la fois pour bien valider — ~12-16h chronologique
- **NON** : on attend retour terrain Christophe pour prioriser autrement
