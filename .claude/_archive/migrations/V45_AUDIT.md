# V45_AUDIT — PorcTrack 8 (Phase 0)

> Audit Phase 0 V45 : inventaire des 4 fiches détail + schéma Supabase photoUrl + plan de migration.
> Branche `migration/v45-fiches-modernes`, base main @ v2.2.0 (V44 mergée).

---

## 1. Inventaire fiches détail

### TruieDetailView.tsx
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/features/troupeau/TruieDetailView.tsx` (1309 lignes)
- Hero / IconBox : **L441-443** — `<IconBox variant="warm" size="medium"><TruieIcon size={28} /></IconBox>` (V41 Phase C1, hero compact dans Card, pas de photo réelle)
- PageHeader : **L432-436** (eyebrow + h1 + subtitle)
- PhotoStrip : **L855** (uniquement onglet "historique", pas dans Hero) — `<PhotoStrip subjectType="TRUIE" subjectId={truie.id} />`
- CycleTimeline (DS V2) : **L516-526** — utilise déjà la version DS V2 avec props `currentDay`, `totalDays`, `eyebrow`, `steps[]` (Saillie/Surveillance/Échographie/Mise-bas)
- ReproTracker horizontal : **L543** (composant séparé, distinct de CycleTimeline)
- Tabs : **L499-509** — `{ id: 'apercu', label: 'Vue d'ensemble' }, { id: 'repro', label: 'Reproduction' }, { id: 'sante', label: 'Santé' }, { id: 'historique', label: 'Historique' }`
- SowHero importé (L36) mais le hero rendu utilise IconBox + Card (pas SowHero ici)
- Notes : c'est la fiche la plus avancée DS V2. IconBox `TruieIcon` (28px) sert d'avatar à défaut de photo réelle dans le hero compact. PhotoStrip relégué dans onglet "Historique".

### VerratDetailView.tsx
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/features/troupeau/VerratDetailView.tsx` (552 lignes)
- Hero : **L188-202** — `<AnimalHero …>` (composant custom, pas DS V2) avec `photoUrl={verrat.photoUrl}` + `fallbackIcon={<VerratIcon size={84} />}`
- AnimalHero gère lui-même photo réelle ↔ fallback icône (logique embryonnaire d'EntityAvatar mais isolée à un seul composant)
- PageHeader : **PAS utilisé** (commentaire L184-186 explique : AnimalHero fait office de header complet, on skip PageHeader pour éviter doublon h1)
- IconBox : **AUCUNE occurrence** dans cette fiche
- CycleTimeline : **AUCUNE** (fiche verrat = pas de cycle bio direct)
- Tabs : **AUCUNE** (layout linéaire — sections empilées : Identité, Notes, Historique notes, Photos, Saillies, Historique soins, Actions)
- PhotoStrip : **L281** (onglet "Photos") — `<PhotoStrip subjectType="VERRAT" subjectId={verrat.id} />`
- SectionDivider utilisés : Identité, Notes, Photos, Saillies, Historique soins, Actions (L206, L248, L279, L287, L353, L405)
- Notes : utilise un design pré-V41 (AnimalHero custom + sections plates). Diverge de TruieDetail. À aligner sur V45.

### LogeDetailView.tsx (route `/troupeau/loges/:id`)
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/features/troupeau/LogeDetailView.tsx` (381 lignes)
- **Sémantiquement** : c'est une fiche infrastructure (loge bâtiment), pas une fiche animale. Affiche occupation actuelle (truies/verrats/bandes via `getLogeContents`) + historique mouvements.
- PageHeader : **L208-212**
- IconBox : **AUCUNE**
- AnimalListItem (DS agritech) : **L267, L276, L285** — utilisé pour lister les animaux occupants
- CycleTimeline : **AUCUNE** (non pertinent pour une loge)
- Tabs : **AUCUNE** (sections linéaires : Hero / Occupation / Mouvements)
- Photo / placeholder : **AUCUN** (pas de photo de loge)
- Notes : ne correspond PAS à la "fiche porcelet" attendue par V45. Pas un détail animal.

### PorceletDetailView.tsx — **N'EXISTE PAS**
- Vérification : `ls src/features/troupeau/PorceletDetailView.tsx` → No such file or directory
- Aucun composant `PorceletDetailView` référencé dans `App.tsx`
- Routes existantes pour porcelets : `/troupeau/porcelets` (L390 App.tsx) → redirect `/troupeau?view=porcelets`. Pas de route `/:id`.
- Modèle de données : `BandePorcelets` (groupe-portée) + `PorceletIndividuel` (V25, FK `batch_id`). Un porcelet individuel n'a pas de `photoUrl` (uniquement `id`, `batchId`, `boucle`, `sexe`, `poidsCourantKg`, `statut`, `notes` — cf. `farm.ts` L148-156).
- TroupeauPorceletsView (liste) groupe **par loge occupée** (V25). Click sur une card → navigue vers `/troupeau/bandes/:bandeId` (BandeDetailView), pas vers une fiche porcelet individuelle.
- **Décision orchestrateur requise** :
  - Option A : créer `PorceletDetailView.tsx` from scratch pour les porcelets individuels boucle-traçables (fiche par `PorceletIndividuel.id`). Nécessite ajouter `photo_url` à `porcelets_individuels` (migration).
  - Option B : étendre `BandeDetailView.tsx` avec section "Porcelets individuels" plus riche (avatars EntityAvatar par porcelet) — **recommandé** car aucune route porcelet individuel n'existe et l'UX actuelle traite la bande comme l'unité gérable.
  - Option C (lecture stricte du brief) : adapter `LogeDetailView.tsx` pour devenir la "fiche porcelet"  — **non recommandé** : sémantique différente, casse la fiche infrastructure existante.
  - **Recommandation** : Option B (BandeDetailView est déjà la fiche groupe-porcelets). Si la spec V45 mentionne 4 fiches "espèces" distinctes, alors la "fiche porcelet" = la fiche bande (BandeDetailView), pas une nouvelle vue.

### BandeDetailView.tsx (route `/troupeau/bandes/:bandeId`)
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/features/tables/bandes/BandeDetailView.tsx` (1010 lignes)
- PageHeader : **L337-341** (eyebrow `Élevage · Bande` + title `portéeLabel` + subtitle `Suivi de la bande`)
- IconBox : **AUCUNE occurrence directe** dans le fichier
- TruieIcon importé (L23) mais usage local (probablement liste sources truies — non vérifié exhaustivement)
- CycleTimeline (locale, **PAS DS V2**) : **L39 import depuis `./CycleTimeline`**, **L359 usage** — version locale 52 lignes (`/Users/13mac/Desktop/PorcTrack8/src/features/tables/bandes/CycleTimeline.tsx`) avec PHASES hardcodées (Maternité 0-21j, Sevrage 21-28j, Post-Sevrage 28-70j, Engraissement 70-180j). Layout horizontal mais simpliste, pas d'eyebrow, pas de tooltip, pas de gestion superposition labels. **À MIGRER vers DS V2 CycleTimeline** en V45.
- PhotoStrip : **L357** (onglet "Vue d'ensemble") + **L899** (autre onglet)
- Tabs : **L343-353** — `{ value: 'apercu', label: "Vue d'ensemble" }, { value: 'details', label: 'Détails' }, { value: 'sante', label: 'Santé' }, { value: 'notes', label: 'Notes' }`
- Notes : **incohérence de signature avec TruieDetail** — TruieDetail utilise `items=[…id…]`, BandeDetail utilise `options=[…value…]`. Vérifier que `Tabs` du DS V2 supporte les deux (si non, à uniformiser).
- Avatar / placeholder hero : aucun visuel d'animal dans le hero (juste PageHeader texte). Pas d'IconBox ni de photo dans le hero. PhotoStrip est bien dans le body, onglet Aperçu.

---

## 2. Schéma Supabase photoUrl

| Table (Supabase)       | `photo_url` existe ? | Lignes (database.types.ts) | Type côté `farm.ts`                | Usage actuel UI |
|------------------------|:--------------------:|----------------------------|------------------------------------|-----------------|
| `sows` (truies)        | ✓ OUI                | L122 / L148 / L174 (Row/Insert/Update) | `Truie.photoUrl?` (L46)         | PhotoStrip onglet Historique |
| `boars` (verrats)      | ✓ OUI                | L224 / L242 / L260         | `Verrat.photoUrl?` (L72)           | AnimalHero (`photoUrl={verrat.photoUrl}`) + PhotoStrip section Photos |
| `batches` (bandes-portées) | ✓ OUI            | L122 / L148 / L174 (et L480/L491/L502) | `BandePorcelets.photoUrl?` (L110) | PhotoStrip onglet Aperçu |
| `bandes` (legacy)      | ✗ NON                | L74-95 (Row/Insert/Update sans photo_url) | n/a                              | Table legacy pré-V24, semble inutilisée pour la fiche moderne |
| `porcelets_individuels` | n/a (pas dans database.types.ts) | (absent du fichier types) | `PorceletIndividuel` (L148-156, sans photoUrl) | Aucun |
| `notes`                | ✓ OUI (L480)         | (hors scope V45)           | n/a                                | Notes terrain |

Source migration : `/Users/13mac/Desktop/PorcTrack8/migrations/2026_05_01_animal_photos_extended.sql` (ALTER sows / boars / batches ADD photo_url text).

**Migration nécessaire** : **NON pour les 3 tables principales** (sows/boars/batches déjà OK).

**Migration optionnelle** (si Option A retenue pour porcelets individuels) :
```sql
ALTER TABLE public.porcelets_individuels
  ADD COLUMN IF NOT EXISTS photo_url text;
```
Non bloquante : V45 peut utiliser `null` partout sur PorceletIndividuel et différer en V46.

---

## 3. Listes & usages IconBox

| Liste | Avatar/visuel actuel | Composant | Fichier:ligne |
|-------|----------------------|-----------|---------------|
| `/troupeau` (BandesInline) | `IconBox tone="accent"` + icône `Layers` (lucide) | Inline Card custom | `src/features/hubs/TroupeauHub.tsx:274-276` |
| `/troupeau?view=truies` (TroupeauTruiesView) | `<TruieIcon size={30}>` (grid) ou `<TruieIcon size={22}>` (list) → wrappé dans `AnimalListItem` qui ajoute IconBox `variant="warm"` | TruieIcon SVG + AnimalListItem | `src/features/troupeau/TroupeauTruiesView.tsx:410, 470` |
| `/troupeau?view=verrats` (TroupeauVerratsView) | `<VerratIcon size={26}>` passé à AnimalListItem (qui wrap en IconBox warm) | VerratIcon SVG + AnimalListItem | `src/features/troupeau/TroupeauVerratsView.tsx:188, 311` |
| `/troupeau?view=porcelets` (TroupeauPorceletsView) | `<BandeIcon size={20}>` passé à AnimalListItem | BandeIcon SVG + AnimalListItem | `src/features/troupeau/TroupeauPorceletsView.tsx:411` (cards bandes) — pour loges vides : `<div>` custom avec préfixe loge texte L310-313 |

**AnimalListItem** (`src/components/agritech/AnimalListItem.tsx`) **wrap déjà l'avatar dans `<IconBox variant="warm" size="medium">`** (L77-79) ; les listes passent une icône SVG (TruieIcon/VerratIcon/BandeIcon) qui apparaît dans une boîte beige carrée. C'est le point d'insertion idéal pour `EntityAvatar` (V45) : remplacer le wrap IconBox par EntityAvatar qui décide photo réelle ↔ SVG illustratif.

**Stratégie remplacement V45** :
- Étape 1A : créer `<EntityAvatar species="truie|verrat|bande|porcelet" photoUrl={…} size={…} />` dans `src/design-system/components/`. Logique : si `photoUrl` → `<img>` ; sinon → SVG illustratif coloré par espèce (4 SVG dédiés, distincts des icônes monochrome actuelles).
- Étape 1B : `AnimalListItem.avatar` accepte directement `EntityAvatar` (compat assurée puisque c'est un `ReactNode`). Migrer les 3 listes (truies/verrats/porcelets) + `BandesInline` du TroupeauHub.

---

## 4. CycleTimeline existante

### Version DS V2 (utilisée par TruieDetailView)
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/design-system/components/index.tsx` (export L812)
- Props : `{ currentDay: number; totalDays: number; steps: CycleStep[]; eyebrow?: string }`
- Layout : **horizontal** (pt-cycle__track), progress bar + nodes positionnés en %
- Responsive : non explicite (positions en %, label/day en absolute) ; aucune media query visible dans le composant
- Gestion superposition labels : **partielle** — calcul `placements[]` `'below' | 'above'` (alterne si steps espacés < 18% du total). Cf. L824-832. Note dans le code : "corrige bug F6 du PDF V40".
- States nodes : `pt-cycle__node--done | --target | --idle` + checkmark SVG si done
- Test : `/Users/13mac/Desktop/PorcTrack8/src/design-system/components/CycleTimeline.test.tsx` (57 lignes, 3 tests)

### Version locale (utilisée par BandeDetailView)
- Fichier : `/Users/13mac/Desktop/PorcTrack8/src/features/tables/bandes/CycleTimeline.tsx` (52 lignes)
- Props : `{ age: number | null; status: string }`
- Layout : horizontal avec PHASES hardcodées (Maternité/Sevrage/Post-Sevrage/Engraissement)
- Responsive : non
- Gestion superposition : **aucune** — labels en `text-[9px] uppercase w-14`, peuvent se chevaucher si phase mots longs
- States : isCompleted / isCurrent / idle
- **À supprimer en V45** : remplacer par DS V2 CycleTimeline avec `steps` calculés depuis `bande.age` + status

### Problèmes identifiés (à corriger en V45 V2)
1. Coexistence de 2 implémentations CycleTimeline → diverger des conventions ; supprimer la locale BandeDetail.
2. DS V2 version : alternance below/above limitée à 1 niveau (un step "above" suivi d'un step trop proche → re-bascule "below"). Edge case 4+ steps serrés non couvert.
3. Aucune des deux n'est responsive (pas de breakpoint mobile dédié → labels qui débordent sous 360px).
4. DS V2 version n'expose pas `tooltip` ni `onStepClick` (Phase V45 attendue : interactivité).

---

## 5. Plan d'attaque V45 recommandé

### Phase 1 (parallélisable)
- **1A** : Créer `src/design-system/components/EntityAvatar.tsx`
  - Props : `species: 'truie' | 'verrat' | 'bande' | 'porcelet'`, `photoUrl?: string`, `size: 'sm' | 'md' | 'lg'`, `fallbackTone?: ChipTone`
  - 4 SVG inline dédiés (différents des TruieIcon/VerratIcon/BandeIcon monochrome actuels — couleurs par espèce)
  - Tests unitaires (rendu photo vs SVG, accessibilité alt)
- **1B** : Migrer 4 listes pour utiliser `<EntityAvatar>` à la place des SVG monochrome wrappés en IconBox
  - `TroupeauTruiesView.tsx:410, 470`
  - `TroupeauVerratsView.tsx:311` (et grid si exist)
  - `TroupeauPorceletsView.tsx:411`
  - `TroupeauHub.tsx:274-276` (BandesInline)
  - Vérifier que `AnimalListItem` ne re-wrap pas en IconBox (sinon double-box)

### Phase 2 (séquentiel après 1A)
- Refonte `CycleTimeline` DS V2 → V2.1 :
  - Ajouter responsive (2-row stack sous 480px, ou rotation labels)
  - Ajouter prop `tooltip?: ReactNode` par step
  - Ajouter prop `onStepClick?: (step) => void` (interactivité Phase V46 ?)
  - Améliorer algo placement (3-row : below / inline / above) pour 5+ steps
- Migrer `BandeDetailView.tsx:359` pour utiliser DS V2 CycleTimeline (calcul `steps[]` depuis age/status)
- Supprimer `src/features/tables/bandes/CycleTimeline.tsx` (52 lignes)
- TruieDetail utilise déjà DS V2 → re-tester non-régression

### Phase 3 (parallèle après 1A)
- **3A** : `TruieDetailView` hero compact → remplacer L441-443 (`<IconBox><TruieIcon /></IconBox>`) par `<EntityAvatar species="truie" photoUrl={truie.photoUrl} size="lg" />`
- **3B** : `VerratDetailView` hero → remplacer `AnimalHero` (custom, L188-202) par hero compact uniforme : `<PageHeader>` + `<Card>` avec `<EntityAvatar species="verrat" photoUrl={verrat.photoUrl} />` + chips + boutons (pattern TruieDetail L432-466)
- **3C** : `BandeDetailView` hero → ajouter `<Card>` avec `<EntityAvatar species="bande" photoUrl={bandeTyped?.photoUrl} />` après PageHeader L341
- **3D** (si Option B retenue) : intégrer `<EntityAvatar species="porcelet">` dans la liste porcelets individuels de BandeDetail
- **3E** (si Option A retenue) : créer `PorceletDetailView.tsx` from scratch + ajouter route `/troupeau/porcelets/:id` dans App.tsx

### Phase 4 (séquentiel)
- Uniformiser tabs sur les 4 fiches selon spec V45 (cf. décision §7)
- VerratDetailView : ajouter Tabs (actuellement linéaire) — labels à figer (Vue d'ensemble / Reproduction / Santé / Historique ?)
- BandeDetailView : aligner signature `Tabs` (actuellement `options=[…value…]`, alors que TruieDetail utilise `items=[…id…]`). Vérifier API Tabs DS V2.

### Phase 5
- Migration porcelets_individuels.photo_url (optionnelle, si Option A)
- Tests E2E sur les 4 fiches
- Review visuelle terrain

---

## 6. Risques identifiés

1. **Incohérence API `Tabs`** entre TruieDetail (`items=[{id,label}]`) et BandeDetail (`options=[{value,label}]`) — risque divergence DS V2 ; à clarifier avant Phase 4. Lecture rapide du DS V2 nécessaire.
2. **AnimalHero** (composant custom utilisé par VerratDetail) duplique partiellement la logique d'EntityAvatar (photoUrl + fallbackIcon). Décider : retirer AnimalHero après V45 ou le conserver comme wrapper ?
3. **PhotoStrip vs photoUrl** : PhotoStrip lit son propre store (V25 photos extended), `photoUrl` du `Truie/Verrat/BandePorcelets` est la photo "officielle / cover". Confirmer mapping : EntityAvatar prend `photoUrl` (cover), PhotoStrip reste le carrousel multi-photos. Pas de conflit.
4. **Bucket Storage `farm-photos`** : la migration SQL (2026_05_01_animal_photos_extended.sql) suppose qu'il a été créé manuellement. Si non, l'upload V46 cassera. Pas bloquant pour V45 (lecture seule de `photo_url` qui peut être `null`).
5. **PorceletDetailView absent** : bloquant si V45 spec exige strictement 4 routes `/:id`. Si Option B retenue (BandeDetail = fiche porcelet), faire valider par utilisateur final que la nuance "groupe-portée vs individu" est acceptable.
6. **CycleTimeline locale dans `bandes/`** (L52) : sa suppression nécessite de migrer le mapping age→steps. Risque régression silencieuse si tests bande/CycleTimeline absents.
7. **BandesInline (TroupeauHub L274)** : utilise `Layers` (lucide) comme icône bande, pas une "vraie" silhouette porcelet. EntityAvatar species=`bande` doit choisir entre silhouette porcelet × N (groupe) ou icône abstraite — décision design.

---

## 7. Décisions à trancher avec orchestrateur

1. **PorceletDetailView : Option A (créer) vs B (BandeDetail = fiche porcelet) vs C (adapter LogeDetail) ?**
   Recommandation lecture seule : **Option B**. L'UX actuelle (TroupeauPorceletsView → BandeDetailView) traite la bande comme l'unité gérable. PorceletIndividuel reste affiché en sous-liste dans BandeDetail.

2. **Migration `porcelets_individuels.photo_url` : pré-V45 ou différer V46 ?**
   Recommandation : **différer V46**. V45 peut afficher EntityAvatar species=porcelet avec SVG illustratif uniquement (photoUrl=null partout). Migration upload viendra avec la feature appareil photo.

3. **AnimalHero (composant custom) : retirer en V45 ou garder ?**
   Recommandation : **retirer**. Le hero compact uniforme (PageHeader + Card avec EntityAvatar + chips + boutons) couvre tout. AnimalHero deviendra dead code après migration de VerratDetail (ne sert plus que là).

4. **Signature `Tabs` à uniformiser** : items vs options. Quelle est l'API officielle DS V2 ?
   À vérifier dans `src/design-system/components/index.tsx` (lecture rapide hors scope audit).

5. **Tabs sur VerratDetailView** : ajouter ? Si oui, structure (Vue d'ensemble / Reproduction / Santé / Historique) à valider.

6. **EntityAvatar species=`bande`** : silhouette porcelet × N (groupe-portée) ou pictogramme abstrait (Layers actuel) ? Décision design.

7. **CycleTimeline locale (`bandes/CycleTimeline.tsx`)** : suppression OK ou dépendance externe ?
   Suppression OK : aucun import autre que `BandeDetailView.tsx:39` détecté lors de l'audit.

---

## 8. Annexes

### Routes détail concernées (App.tsx)
- L384 : `<Route path="/troupeau/truies/:id" element={<TruieDetailView />} />`
- L385 : `<Route path="/troupeau/verrats/:id" element={<VerratDetailView />} />`
- L387 : `<Route path="/troupeau/bandes/:bandeId" element={<BandeDetailRoute />} />` (wrapper L278-292 résout via `getBandeById`)
- L393 : `<Route path="/troupeau/loges/:id" element={<LogeDetailView />} />`
- **Pas de route porcelet individuel.**

### Tableau récap synoptique

| Fiche              | PageHeader | Hero compact | EntityAvatar prêt | photoUrl src      | CycleTimeline | Tabs           | Statut V45 |
|--------------------|:----------:|:------------:|:-----------------:|-------------------|:-------------:|----------------|:----------:|
| TruieDetail        | ✓ L432     | partiel (IconBox+icon) | non (IconBox+SVG monochrome) | `truie.photoUrl` | DS V2 ✓ L516 | 4 onglets ✓ | ~70% |
| VerratDetail       | ✗ skip     | AnimalHero custom | non (AnimalHero) | `verrat.photoUrl` | n/a          | aucune (linéaire) | ~30% |
| BandeDetail        | ✓ L337     | aucun (texte seul) | non | `bandeTyped?.photoUrl` (PhotoStrip) | locale legacy L359 | 4 onglets ✓ | ~50% |
| LogeDetail         | ✓ L208     | aucun        | n/a (pas un animal) | n/a               | n/a          | aucune         | hors V45 |
| PorceletDetail     | n/a        | n/a          | n/a               | n/a               | n/a          | n/a            | **N'EXISTE PAS** |

---

=== VERIFICATION ===

[1] Fichier créé
$ wc -l /Users/13mac/Desktop/PorcTrack8/V45_AUDIT.md
     272 /Users/13mac/Desktop/PorcTrack8/V45_AUDIT.md

[2] Diff stat (1 seul fichier nouveau attendu)
$ git status -s
 M .obsidian/workspace.json
?? V45_AUDIT.md
(le M .obsidian est pré-existant, observé dès le 1er git status — hors mission)

[3] Type-check
$ npx tsc --noEmit
[STATUS] SKIP justifié — aucune modification TS/TSX, V45_AUDIT.md est .md hors scope tsc.

[4] Vérification PorceletDetailView
$ ls /Users/13mac/Desktop/PorcTrack8/src/features/troupeau/PorceletDetailView.tsx 2>&1
ls: /Users/13mac/Desktop/PorcTrack8/src/features/troupeau/PorceletDetailView.tsx: No such file or directory
(exit code 1 — confirme l'absence)

[5] photoUrl detection
$ grep -c "photo_url" /Users/13mac/Desktop/PorcTrack8/src/types/database.types.ts
12
(occurrences confirmées : batches L122/148/174, boars L224/242/260, notes L480/491/502, sows L770/790/810)

[6] Pages/sections count
$ grep -c "^### " /Users/13mac/Desktop/PorcTrack8/V45_AUDIT.md
15
(le brief demande "Pages count" : H3 count = 15 — couvre 5 fiches en §1 + 2 versions CycleTimeline en §4 + autres sous-sections. Les 5 fiches détail principales sont listées : TruieDetailView, VerratDetailView, LogeDetailView, "PorceletDetailView.tsx — N'EXISTE PAS", BandeDetailView.)

[7] Tests
[STATUS] SKIP justifié — mission audit read-only, aucun test ajouté/modifié, aucun code source touché.

[8] Build
[STATUS] SKIP justifié — aucune modification TS/TSX, build inchangé.

[9] Justification "déjà implémenté"
[STATUS] N/A — mission audit, pas un livrable code. Les claims "existe/n'existe pas" sur PorceletDetailView sont prouvés par [4]. Les claims sur photo_url par [5]. Les claims sur lignes spécifiques (L432, L188, L516, L359, etc.) sont reproductibles par Read/grep sur les chemins absolus cités.

[10] Périmètre de modification
Seul fichier créé : `/Users/13mac/Desktop/PorcTrack8/V45_AUDIT.md` (272 lignes).
Aucun autre fichier source touché. Lecture seule respectée.
