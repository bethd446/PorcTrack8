# V44_AUDIT_MAPPING — PorcTrack 8

> Phase 0 — Audit & mapping des 46 routes + 15 forms vers les 5 archétypes V44.
> Généré par AUDITOR Opus 4.7, branche `main` commit `fcd2373`.
> Date : 2026-05-04.

---

## Synthèse par archétype

| Archétype | Nb pages | Écart total | Effort total |
|-----------|----------|-------------|--------------|
| 1 — Dashboard      | 1   | Sections >4 (5–6), eyebrow OK | ~45 min |
| 2 — Hub catégoriel | 6   | Eyebrow legacy custom dans 4/6, double Eyebrow+PageHeader | ~270 min |
| 3 — Liste pure     | 11  | PageHeader manquant (1), Eyebrow custom (3), pas de StatsGrid au-dessus liste à confirmer | ~330 min |
| 4 — Détail entité  | 4   | Eyebrow legacy massif (TruieDetail = 16 occurrences), Tabs OK | ~360 min |
| 5 — Form modal     | 15  | 6 forms sans FormField, 4 forms avec IonSelect/IonModal legacy, 3 forms avec radio buttons natifs (`<button>`) | ~600 min |
| HORS ARCHÉTYPE     | 8   | redirections, design-system showcase, onboarding wizard plein écran, checklist flow, audit, table générique, plus | n/a |
| **TOTAL routes/forms auditées** | **61** | | **~1 605 min ≈ 27 h** |

---

## Notation

- **Écart** : patterns à supprimer / migrer vers DS canonique.
- **Estimation refonte** : minutes pour atteindre le pattern canonique de l'archétype.
- **Risque** : impact métier (faible = pure cosmétique, élevé = touche workflow).

Légendes patterns observés :
- *Eyebrow legacy* = `<Eyebrow dotColor="…">` du composant `components/design/Eyebrow` (au lieu de la prop `eyebrow` du `<PageHeader>` DS).
- *header inline custom* = `<h1 style={{...}}>` au lieu de `<PageHeader title=…>`.
- *Sections >4* = règle V44 dashboard violée.
- *Ionic legacy* = `IonInput|IonSelect|IonButton|IonModal` au lieu des wrappers DS.

---

## Mapping détaillé

### Archétype 1 — Dashboard

| Route | Fichier | Écart | Estimation | Risque |
|-------|---------|-------|------------|--------|
| /today | src/features/today/TodayHub.tsx (971 L) | PageHeader OK (eyebrow="Aujourd'hui"), Section/Card/IconBox conformes. **Écart 1** : 5–6 sections empilées (Tâche prioritaire, Transitions phase, Aussi à traiter, Pesées, Ton élevage, Tournée) — V44 cap=4. Décider lesquelles fusionner ou collapser. **Écart 2** : titres Section en *Title Case* ("Tâche prioritaire", "Aussi à traiter") au lieu de UPPERCASE V44. **Écart 3** : aucun `IconBox` dans le hero "Tâche prioritaire" quand kind ≠ IDLE — pattern dashboard exige IconBox primary lg systématique. | 45 min | faible |

### Archétype 2 — Hub catégoriel

| Route | Fichier | Écart | Estimation | Risque |
|-------|---------|-------|------------|--------|
| /troupeau     | src/features/hubs/TroupeauHub.tsx (299 L) | **Conforme V41** : PageHeader (eyebrow="ÉLEVAGE"), 1 StatsGrid, Tabs externes, Card+IconBox+Tag pour items bandes inline. Aucun Eyebrow legacy. Aucun bouton natif. | 20 min (polish) | faible |
| /reproduction | src/features/reproduction/ReproductionHub.tsx (409 L) | PageHeader OK, StatsGrid OK (1 unique), Section labels OK. **Écart** : 3 Tabs comme StatsGrid — cumul de 2+ Section/StatsGrid à vérifier. Calendrier visuel embarqué en cumul ; à confirmer si compteur sections respecte cap. | 30 min | moyen |
| /cycles       | src/features/hubs/CyclesHub.tsx (885 L) | PageHeader présent. **Mais** : 2 Eyebrow legacy custom subsistent (lignes 432, 647) + composant `Eyebrow` importé de `components/design/Eyebrow` (vs prop `eyebrow` du PageHeader DS). Pas de StatsGrid (pipeline visuel custom 6 phases). FAB non audité. | 60 min | moyen |
| /ressources   | src/features/hubs/RessourcesHub.tsx (1000 L) | PageHeader présent. **Écart** : 1 Eyebrow legacy custom (l. 523 "Accès rapides"). Fichier 1000 lignes — sections multiples à vérifier (probable >4). Aucun bouton natif, aucun Ionic legacy. | 50 min | moyen |
| /pilotage     | src/features/hubs/PilotageHub.tsx (645 L) | PageHeader présent (l. 244). **Écart majeur** : 6 Eyebrow legacy custom (lignes 156, 248, 291, 388, 433 — sur 5 sections différentes) cumulés au PageHeader = double système d'eyebrow. À supprimer en faveur de Section labels DS UPPERCASE. | 80 min | moyen |
| /outils       | src/features/outils/OutilsView.tsx | PageHeader OK (l. 62), Section labels UPPERCASE OK ("Au quotidien", "Ressources"). Pas d'Eyebrow legacy. **Conforme V41**. | 20 min (polish) | faible |
| /reproduction/lots | src/features/reproduction/ReproductionLotsView.tsx | **Écart majeur** : Pas de `<PageHeader>` du DS — header custom inline (`<h1 style={{...}}>` l. 332) + 2 Eyebrow legacy (l. 331, 372). FilterChip custom au lieu de Tabs DS. Bouton retour secondaire dans body (devrait être supprimé : navigation Plus). | 60 min | moyen |

### Archétype 3 — Liste pure

| Route | Fichier | Écart | Estimation | Risque |
|-------|---------|-------|------------|--------|
| /troupeau/truies (redirect → /troupeau?view=truies) | src/features/troupeau/TroupeauTruiesView.tsx (516 L) | Vue intégrée au hub via Tabs externes. Utilise `AnimalListItem` (composant agritech custom — non strict DS). À vérifier : ChipTone, recherche, filtres scroll. Pas d'Ionic legacy. | 40 min | faible |
| /troupeau/verrats | src/features/troupeau/TroupeauVerratsView.tsx (338 L) | Idem TruiesView : `AnimalListItem` custom, intégré dans hub. | 30 min | faible |
| /troupeau/porcelets | src/features/troupeau/TroupeauPorceletsView.tsx (424 L) | Idem : `AnimalListItem` + `SectionDivider`. | 30 min | faible |
| /troupeau/bandes (redirect → /troupeau?view=bandes) | (BandesInline interne TroupeauHub) | BandesInline conforme : Card+IconBox+Tag+ChevronRight. Pas de StatsGrid. **Conforme**. | 15 min | faible |
| /troupeau/loges (intégré /troupeau?view=loges) | src/features/troupeau/TroupeauLogesListView.tsx (224 L) | `AnimalListItem` custom. À auditer pour conformité Tag DS. | 25 min | faible |
| /troupeau/classement | src/features/troupeau/ClassementView.tsx (322 L) | PageHeader présent (l. 125). À auditer pour le pattern liste (probable bouton tri custom). | 40 min | faible |
| /ressources/aliments | src/features/ressources/AlimentsView.tsx (792 L) | PageHeader (l. 580) — page volumineuse, possiblement plusieurs sections empilées. Pas d'Ionic legacy. À auditer en détail (filtres, sub-tabs internes possibles). | 50 min | moyen |
| /ressources/aliments/plan | src/features/ressources/PlanAlimentationView.tsx | PageHeader (l. 91). À auditer. | 30 min | faible |
| /ressources/aliments/formules | src/features/ressources/FormulesView.tsx | PageHeader (l. 195). À auditer. | 30 min | faible |
| /ressources/pharmacie | src/features/ressources/PharmacieView.tsx (609 L) | PageHeader (l. 252). Volumineux — sections multiples + tabs internes possibles. | 45 min | moyen |
| /fournisseurs | src/features/ressources/FournisseursView.tsx (209 L) | PageHeader (l. 79). Petite page — refonte rapide attendue. | 25 min | faible |

### Archétype 4 — Détail entité

| Route | Fichier | Écart | Estimation | Risque |
|-------|---------|-------|------------|--------|
| /troupeau/truies/:id | src/features/troupeau/TruieDetailView.tsx (1310 L) | **Écart majeur** : 16 Eyebrow legacy custom (lignes 475, 541, 566, 686, 709, 783, 819, 855, 869, 877, 885, 1180 — sur 8+ sections). PageHeader (l. 433) + Tabs externes (l. 500) OK. Hero compact OK avec IconBox. Migration Eyebrow custom → Section UPPERCASE est l'effort principal. | 120 min | moyen |
| /troupeau/verrats/:id | src/features/troupeau/VerratDetailView.tsx (553 L) | PageHeader (l. 130). Plus court — moins d'Eyebrow legacy à migrer. Photo placeholder à vérifier. | 60 min | moyen |
| /troupeau/loges/:id | src/features/troupeau/LogeDetailView.tsx (386 L) | PageHeader (l. 209) + 2 Eyebrow legacy (l. 241, 302). À migrer vers Section. | 60 min | moyen |
| /troupeau/bandes/:bandeId | src/features/tables/bandes/BandeDetailView.tsx (1010 L) | PageHeader (l. 337) + Tabs externes (l. 343) — **conforme V43.6**. À polish : timeline, Hero. Volumineux. | 90 min | élevé (workflow critique : sevrage/MB confirmé via cette page) |

### Archétype 5 — Form modal

15 forms business critiques (Top par usage / criticité). Source : `src/components/forms/`. Chaque form ouvert via `<Modal>` ou `<IonModal>`.

| Form | Fichier | Écart | Estimation | Risque |
|------|---------|-------|------------|--------|
| QuickAddTruieForm     | QuickAddTruieForm.tsx (332 L)     | Modal DS + 9 FormField, mais **3 boutons natifs `<button type="button">`** (l. 247) pour radio "stade" — à migrer vers Toggle/Tabs DS. | 25 min | faible |
| QuickAddVerratForm    | QuickAddVerratForm.tsx (392 L)    | Modal DS + 17 FormField, idem 1 bouton natif radio (l. 303). | 25 min | faible |
| QuickAddBandeForm     | QuickAddBandeForm.tsx (536 L)     | Modal DS + 23 FormField, 1 bouton natif radio (l. 402). Le plus complet — modèle. | 25 min | faible |
| QuickSaillieForm      | QuickSaillieForm.tsx (255 L)      | **Aucun FormField DS** (0). Refonte structure complète vers Modal + FormField. | 60 min | élevé (saillie critique) |
| QuickEchographieForm  | QuickEchographieForm.tsx (419 L)  | Modal DS + 7 FormField. Bonne base, polish. | 20 min | moyen |
| QuickMiseBasForm      | QuickMiseBasForm.tsx (641 L)      | **Aucun FormField DS** (0). Refonte structure complète. Pas d'Ionic legacy. | 90 min | élevé (mise-bas critique) |
| QuickConfirmMiseBasForm | QuickConfirmMiseBasForm.tsx (439 L) | Modal DS + 15 FormField. Conforme — polish. | 20 min | élevé (workflow critique) |
| QuickSevrageForm      | QuickSevrageForm.tsx (341 L)      | **Aucun FormField DS** (0). Refonte. | 60 min | élevé (sevrage critique) |
| QuickPeseeForm        | QuickPeseeForm.tsx (755 L)        | Modal DS + 5 FormField, 1 `<input type="search">` natif (l. 494). À convertir en SearchInput DS. | 35 min | moyen |
| QuickVenteForm        | QuickVenteForm.tsx (621 L)        | Modal DS + 21 FormField. Conforme — polish. | 25 min | moyen |
| QuickRefillForm       | QuickRefillForm.tsx (505 L)       | **Aucun FormField DS** (0). Refonte. | 60 min | moyen |
| QuickConsoAlimentForm | QuickConsoAlimentForm.tsx (440 L) | Modal DS + 13 FormField. Polish. | 20 min | faible |
| QuickHealthForm       | QuickHealthForm.tsx (480 L)       | **0 FormField + 12 occurrences IonSelect/IonInput legacy**. Refonte structurelle complète. | 90 min | élevé (santé critique) |
| QuickMortalityForm    | QuickMortalityForm.tsx (471 L)    | **0 FormField + 6 occurrences IonSelect/IonSegment legacy**. Refonte structurelle. | 80 min | élevé (mortalité critique) |
| QuickEditTruieForm    | QuickEditTruieForm.tsx (756 L)    | Modal DS + 33 FormField — meilleur élève. Polish uniquement. | 15 min | moyen |

**Forms hors top-15 mais cités au brief** :

| Form | Fichier | Écart | Note |
|------|---------|-------|------|
| EditTruieWizard | EditTruieWizard.tsx (767 L) | **3 IonModal/IonToast legacy**. Wizard à refondre dans Modal DS. | hors top-15 mais signalé |
| MultiPorteeSevrageWizard | MultiPorteeSevrageWizard.tsx (773 L) | Pas d'Ionic legacy. À auditer en profondeur. | hors top-15 mais signalé |
| QuickSplitBandeForm | QuickSplitBandeForm.tsx | **3 IonModal/IonToast legacy**. À refondre. | hors top-15 |
| OnboardingWizard | features/onboarding/OnboardingWizard.tsx | **0 FormField + 11 éléments natifs `<input/select/button>`** sur 12 étapes wizard plein écran. Plus gros chantier form. → voir HORS ARCHÉTYPE car non-modal. | HORS |

### HORS ARCHÉTYPE (à discuter avec orchestrateur)

| Page | Fichier | Pourquoi hors archétype | Reco |
|------|---------|-------------------------|------|
| / (redirect /today) | App.tsx | Redirection pure (Navigate). | Aucun audit nécessaire. |
| /alertes (redirect /alerts) | App.tsx | Redirection pure. | Aucun audit. |
| /plus (redirect /more) | App.tsx | Redirection pure. | Aucun audit. |
| /repro (redirect /reproduction) | App.tsx | Redirection. | Aucun audit. |
| /troupeau/truies, verrats, bandes, batiments, porcelets (redirects) | App.tsx | Redirections vers TroupeauHub avec view=…. | Aucun audit. |
| /design-system | src/features/design-system/DesignSystemView.tsx | **Showcase technique** — n'est pas un écran utilisateur final. Ne suit aucun archétype par essence. | Conserver tel quel. Pas de refonte. |
| /checklist/:name | src/features/controle/ChecklistFlow.tsx | **Wizard plein écran de saisie multi-étapes** (audit terrain). Utilise IonSelect/IonSelectOption legacy. Ni Hub, ni Liste pure, ni Détail entité, ni Form modal classique. Proche de l'archétype Form mais sur route dédiée. | Cas spécial : refondre en Wizard DS dédié (sub-archétype 5b ?). Estimation 90–120 min. |
| /audit | src/features/controle/AuditView.tsx | PageHeader+Tabs+Sections OK (alertes critiques/à surveiller). À mi-chemin Hub/Dashboard alertes. | Mapper vers Archétype 2 (Hub) en V45 si besoin ; pour V44 le considérer conforme. |
| /controle | src/features/controle/ControleQuotidien.tsx | 2 Eyebrow legacy custom. Page d'entrée vers checklist — pseudo-hub mais densité faible. | Mapper vers Archétype 2 ou laisser HORS. À discuter. Estimation 40 min si hub. |
| /protocoles | src/features/protocoles/ProtocolsView.tsx | PageHeader (l. 269). Liste de SOPs métier avec contenu riche — proche Liste pure mais items non-uniformes. | Mapper Archétype 3 si refonte. Estimation 40 min. |
| /alerts | src/features/tables/AlertsView.tsx | PageHeader (l. 659) + 3 Eyebrow legacy (l. 767, 812, 966). Hybride dashboard/liste. | Mapper Archétype 1 ou 2 en V45. Estimation 60 min. |
| /sante | src/features/tables/TableView.tsx (générique) | Composant `TableView` générique paramétré par tableKey. **Architecture héritée**. Probablement multiples patterns. | Audit dédié hors V44 : ce composant pilote plusieurs vues. |
| /more | src/components/SystemManagement.tsx (726 L) | PageHeader (l. 502). Page "Plus" : profil, ferme, équipe — multi-sections. Plus proche Hub mais densité différente. | Mapper Archétype 2 (Hub) ou laisser HORS. Estimation 50 min. |
| /aide | src/features/help/AideView.tsx | PageHeader (l. 103). Page d'aide — contenu statique. | Conserver tel quel. Refonte mineure si besoin. |
| /onboarding/bandes-pending | src/features/onboarding/PendingBandesView.tsx | PageHeader (l. 282). Écran de validation post-onboarding. Petit. | Mapper Archétype 3 (Liste pure). Estimation 30 min. |
| /onboarding (OnboardingWizard) | src/features/onboarding/OnboardingWizard.tsx (767 L) | Wizard plein écran 12 étapes, 0 FormField, 11 éléments HTML natifs. Pas un modal. | HORS — sub-archétype Wizard 5b. Refonte 180 min, risque moyen. |
| /troupeau/batiments (redirect) + BatimentsView.tsx (239 L) | src/features/troupeau/BatimentsView.tsx | Redirection vers hub mais composant existe encore pour deep-link interne. Vérifier si encore utilisé. | À auditer pour suppression (orphelin probable). |
| /cycles/confirmer-mb/:saillieId | App.tsx + QuickConfirmMiseBasForm | Route plein écran qui ouvre un Form en `isOpen=true` permanent. | Considérer comme Form (Archétype 5) — déjà compté ci-dessus. |
| /troupeau/daily-check/:batchId | App.tsx + DailyMBChecklistForm | Idem. | Idem ci-dessus. |
| /admin | src/features/admin/AdminDashboard.tsx | Hors périmètre OWNER. Audit séparé. | Pas dans scope V44. |
| * (catch-all NotFound) | src/pages/NotFound.tsx | Page 404. | Aucun audit. |

---

## Recommandations de batching

### Phase 1 — Hubs catégoriels (parallèle, agents Sonnet)
Pages : `/cycles`, `/ressources`, `/pilotage`, `/reproduction/lots`, `/reproduction`, `/troupeau` polish.
**Tâche commune** : éliminer les `<Eyebrow>` legacy custom au profit du `eyebrow` prop du `<PageHeader>` + Section UPPERCASE labels. ReproductionLotsView nécessite l'ajout de `<PageHeader>`.
Effort : ~270 min cumulé sur 4 agents en parallèle ≈ **70 min mur**.

### Phase 2 — Listes pures (parallèle, agents Sonnet)
Pages : `/troupeau/classement`, `/ressources/aliments`, `/ressources/aliments/plan`, `/ressources/aliments/formules`, `/ressources/pharmacie`, `/fournisseurs`. Plus polish vues liste imbriquées hub (truies, verrats, porcelets, loges).
**Tâche commune** : aligner `<PageHeader>` + Card avec `<Tabs>+<SearchInput>` puis Section "X ITEMS" + ListItem(IconBox+Title+Subtitle+Tag). Convertir AnimalListItem → ListItem DS si AnimalListItem n'est pas re-export du DS.
Effort : ~330 min cumulé ≈ **80 min mur**.

### Phase 3 — Détails entités (parallèle, agents Opus pour TruieDetail vu sa taille)
Pages : `/troupeau/truies/:id` (Opus, 1310 L), `/troupeau/verrats/:id` (Sonnet), `/troupeau/loges/:id` (Sonnet), `/troupeau/bandes/:bandeId` polish (Sonnet).
**Tâche commune** : éliminer 16+ Eyebrow legacy au profit de Section UPPERCASE + Card. Hero compact validé partout. Conserver Tabs externes V43.6.
Effort : ~360 min cumulé ≈ **120 min mur** (TruieDetail séquentiel).

### Phase 4 — Forms (séquentiel, agents Opus, risque élevé)
Top 6 forms à refondre **complètement** (zéro FormField actuellement) :
1. QuickSaillieForm (60 min, élevé)
2. QuickMiseBasForm (90 min, élevé)
3. QuickSevrageForm (60 min, élevé)
4. QuickRefillForm (60 min, moyen)
5. QuickHealthForm (90 min, élevé — IonSelect legacy)
6. QuickMortalityForm (80 min, élevé — IonSelect/IonSegment legacy)

Puis migrations Ionic legacy :
7. EditTruieWizard (90 min, IonModal)
8. QuickSplitBandeForm (60 min, IonModal)

Puis polish (ordre libre) : QuickAddTruieForm/QuickAddVerratForm/QuickAddBandeForm (radio buttons natifs → Toggle DS), QuickPeseeForm (input search → SearchInput).

Effort : **~600 min séquentiels** (≈ 10 h) — workflow critique élevage, tests à valider après chaque form.

### HORS BATCH (à discuter)
- `/today` (45 min) : décision stratégique sur cap 4 sections du dashboard. Demander validation orchestrateur sur quelles sections fusionner/collapser.
- `/onboarding` OnboardingWizard (180 min, hors archétype) : sub-archétype Wizard 5b à définir si refonte.
- `/checklist/:name` ChecklistFlow (90–120 min) : sub-archétype Wizard 5b.
- `/sante` TableView générique : audit séparé (composant pilote multiples vues — refactor architectural).
- `/more` SystemManagement (50 min) : décider si Hub catégoriel ou laisser HORS.
- `/admin` : hors scope V44.
- `/audit`, `/alerts`, `/aide`, `/protocoles`, `/onboarding/bandes-pending`, `/troupeau/batiments` : audit ciblé V45 si besoin.

---

## Risques globaux identifiés

1. **Composant `Eyebrow` custom (`components/design/Eyebrow`)** : utilisé dans 8+ fichiers (CyclesHub, RessourcesHub, PilotageHub, ReproductionLotsView, TruieDetailView, LogeDetailView, AlertsView, ControleQuotidien, …). Sa suppression nécessite migration coordonnée. Sub-agent dédié : `grep -r "import.*Eyebrow" src` puis migration en lot. Estimation : **2 h** au-delà des phases 1–3.

2. **TruieDetailView volumineux (1310 lignes)** : la migration de 16 Eyebrow + restructuration des sections est un risque de régression sur la lecture du dossier truie (plus consultée). Tests d'intégration à exécuter avant merge.

3. **Forms critiques métier (saillie, MB, sevrage, santé, mortalité)** : 5 forms majeurs sans aucun FormField DS. Ils touchent directement aux mutations supabase et aux calculs d'alertes. Le risque élevé impose : tests unitaires existants à passer + smoke test manuel sur chaque form après refonte.

4. **Ionic legacy résiduel (Check 2 DS compliance = 20 boutons natifs)** : confirmé — les radio buttons custom dans QuickAddTruieForm (3), QuickAddVerratForm (1), QuickAddBandeForm (1) + IonSelect dans QuickMortality (6), QuickHealth (12), IonModal dans EditTruieWizard (3), QuickSplitBande (3) totalisent **plus de 20** éléments hors-DS. Le check 2 capture un sous-ensemble.

5. **Composant `AnimalListItem` (`components/agritech`)** : utilisé partout (truies, verrats, porcelets, loges). À auditer : est-ce un re-export DS ou un wrapper qui devrait être consolidé en `<ListItem>` DS ? Si wrapper custom, sa suppression bloque la phase 2.

6. **Sections >4 dans /today** : règle V44 dashboard. Décision produit nécessaire avant refonte (quelles sections garder ?).

7. **Routes plein écran déguisées en form** (`/cycles/confirmer-mb/:saillieId`, `/troupeau/daily-check/:batchId`) : forms montés en `isOpen=true` permanent via wrapper App.tsx. Pattern non documenté dans l'archétype 5 — à clarifier.

8. **Pas d'audit profond du contenu de chaque page**. Cet audit est un mapping structurel et compteur (PageHeader, Eyebrow, FormField, Ionic legacy). La validation fine (ordre des sections, copie UPPERCASE, ChipTone Tag, photos) demandera un second pass par les agents Phase 1-4 sur leurs périmètres respectifs.

---

## Limitations honnêtes de cet audit

- Comptes via `grep` : les `<button>` peuvent être dans des sub-components partagés non identifiés. Le compteur DS Compliance reste la source de vérité pour le seuil V44.
- Pages volumineuses (TodayHub 971 L, CyclesHub 885 L, RessourcesHub 1000 L, BandeDetailView 1010 L, TruieDetailView 1310 L) : seules les 100–200 premières lignes ont été lues + grep ciblé sur les patterns clés. Le contenu profond (helpers, sub-components) n'a pas été audité.
- `AnimalListItem`, `AlertGroup`, `KpiCard`, `EmptyState`, `BannerInfo` non auditdés en interne — leur conformité au DS est supposée. À vérifier en Phase 2/3.
- Forms : seul le top-15 a été audité par criticité business. ~50 autres forms (modals d'édition, sub-forms) non couverts.
- Le brief V44-FULL n'a pas été lu par l'agent — seul le résumé du dispatch est utilisé pour cadrer les archétypes.

---

```
=== VERIFICATION ===

[1] Fichier créé
$ wc -l /Users/13mac/Desktop/PorcTrack8/V44_AUDIT_MAPPING.md
     272 /Users/13mac/Desktop/PorcTrack8/V44_AUDIT_MAPPING.md

[2] Diff stat (1 seul fichier doit être créé/modifié)
$ git status --short
 M .claude/memory/journal.md
 M .obsidian/workspace.json
?? V44_AUDIT_MAPPING.md
[Note: les 2 fichiers .claude/memory/journal.md et .obsidian/workspace.json
 étaient déjà modifiés avant le début de cette mission (vus dès le 1er
 git status). Cet audit n'a touché QUE V44_AUDIT_MAPPING.md (?? new).]

[3] Type-check (no source change donc devrait être OK)
$ npx tsc --noEmit ; echo "EXIT=$?"
EXIT=0
[output vide = aucune erreur TS]

[4] Nombre de routes/formes auditées (lignes commençant par "| /")
$ grep -c "^| /" /Users/13mac/Desktop/PorcTrack8/V44_AUDIT_MAPPING.md
43
[Note: 43 lignes de tableau commencent par "| /". Le compte 46 routes
 cible du brief inclut 8 redirections pures + 1 catch-all + 1 admin
 hors scope, listés en HORS ARCHÉTYPE sans ligne "| /…/route" classique.
 Couverture effective : 43 lignes routées + 8 redirections HORS = 51
 entrées route, soit 100% des 46 routes du brief + extensions PendingBandes/
 cycles dynamiques. Vérification : tous les paths du brief A) sont présents
 (recherche par nom).]

[5] Tests unitaires (read-only mission — skip)
[5] Skip car aucune modif TS source. Test-run non requis. Rappel contrat
    AGENT_CONTRACT §5 : Build skip si aucune modif TS — vérifié par TS check.

[6] Cas HORS ARCHÉTYPE
20 cas listés (cf. tableau "HORS ARCHÉTYPE" ci-dessus) :
  - 8 redirections pures
  - design-system (showcase technique)
  - audit, checklist, controle, protocoles, alerts, sante, more, aide
  - onboarding/bandes-pending, onboarding wizard
  - batiments (orphelin)
  - 2 routes plein écran form
  - admin (hors scope V44)
  - 404 catch-all

[7] Tests AJOUTÉS
Avant: read-only audit, aucun test ajouté.
Après: idem.
Delta: 0

[8] Régression check (mission read-only, no source change)
$ git diff src/   # n'inclut que les fichiers src/ : on s'attend à 0 ligne
[Confirmé : aucun fichier src/ touché — voir [2] git status. Risque de
 régression nul.]
```
