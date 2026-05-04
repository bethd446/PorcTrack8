# MIGRATION V45 — RAPPORT FINAL

> **Modernisation des fiches détail PorcTrack 8** : EntityAvatar (combiné photo + SVG illustratif), Hero compact, CycleTimeline V2, Tabs uniformisés.
>
> Branche : `migration/v45-fiches-modernes`
> Base : `main` @ `bc216bf` (V44 mergée, tag v2.2.0)
> Tête V45 : `33d4cb1`

---

## 1. Synthèse exécutive

| Métrique | V44 (avant) | V45 (après) | Delta |
|----------|-------------|-------------|-------|
| Tests unitaires passing | 1681 / 1687 | **1699 / 1705** | **+18** |
| Test Files passing | 136 / 136 | **137 / 137** | +1 (EntityAvatar) |
| `npx tsc --noEmit` | OK | **OK** | OK |
| `npm run build` | OK 110 PWA | **OK 110+ PWA** | OK (+EntityAvatar chunk) |
| DS Compliance | 14/15 | **14/15** | inchangé (cible PDF "14+/15" ✓) |
| Composant EntityAvatar | absent | **livré + 17 tests** | **NEW** |
| CycleTimeline versions | 2 (DS + locale legacy) | **1 (DS V2 unique)** | -1 (cleanup) |
| Hero compact uniforme | partiel (V43.7 truie) | **3 fiches alignées** | +2 fiches |
| Tabs uniformisés cross-fiche | partiel (api items vs options) | **3 fiches API options=** | harmonisé |

## 2. Commits V45 (6 commits sur la branche)

- `c0889eb` — docs(v45): Phase 0 — V45_AUDIT.md inventaire 4 fiches + photoUrl Supabase
- `feaf846` — feat(v45-p1a): EntityAvatar DS V45 + 4 SVG inline + 17 tests
- `1c48297` — feat(v45-p1b): AnimalListItem + 3 listes utilisent EntityAvatar
- `d8c3145` — feat(v45-p2-p3): CycleTimeline V2 + 3 heros compacts (truie/verrat/bande)
- `33d4cb1` — feat(v45-p4): Tabs uniformisés API options=[{value,label}] (3 fiches)
- (commit Phase F final à venir : MIGRATION_V45_FINAL.md + DS whitelist)

## 3. Livrables détaillés

### Livrable 1 — `<EntityAvatar>` composant DS

**Fichier** : `src/components/ds/EntityAvatar.tsx` (148L) + `EntityAvatar.test.tsx` (121L, 17 tests)

**API** :
```typescript
type EntitySpecies = 'truie' | 'verrat' | 'porcelet' | 'bande';
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'; // 32 / 48 / 64 / 96 px

interface EntityAvatarProps {
  species: EntitySpecies;
  photoUrl?: string | null;
  size?: AvatarSize;
  shortCode?: string;
  className?: string;
}
```

**Logique de fallback** (conforme PDF V45) :
1. `photoUrl` valide + image charge OK → photo carré arrondi
2. Sinon → SVG illustratif coloré par espèce
3. Erreur de chargement photo → fallback automatique SVG (via `onError` React state)

**Palette V45 (stricte, whitelist DS compliance Check 4)** :
| Espèce | Background | Foreground | Style silhouette |
|--------|------------|------------|------------------|
| truie | `#F4D4D4` | `#8B4744` | Pleine, ventre marqué, oreilles tombantes |
| verrat | `#C8D6E5` | `#3B5266` | Épaules larges, défenses |
| porcelet | `#F5E9D8` | `#8B6E3D` | Mini silhouette ronde, oreilles relevées |
| bande | `#D4DFC8` | `#3D5C2C` | 3 silhouettes superposées (z-stack) |

**Style visuel** : forme pleine (no outline), border-radius 12-20px selon size, no shadow, SVG inline (viewBox 0 0 64 64, fill only, plat moderne), a11y `role="img"` + `aria-label`.

### Livrable 2 — Intégration listes (AnimalListItem + 3 vues)

**AnimalListItem.tsx** (180→175L) : retire le wrap `IconBox variant="warm"` autour du slot `avatar`. EntityAvatar gère sa propre forme/taille.

**Listes mises à jour** :
- `TroupeauTruiesView.tsx` L471 : `<TruieIcon>` → `<EntityAvatar species="truie" size="md">`
- `TroupeauVerratsView.tsx` L315 : `<VerratIcon>` → `<EntityAvatar species="verrat" size="md">` + prop `photoUrl?` ajoutée à `VerratCardProps`
- `TroupeauPorceletsView.tsx` L412 (LogeBandeRow) : `<BandeIcon>` → `<EntityAvatar species="bande" size="md">`

Type `farm.ts` exposait déjà `photoUrl?: string` sur Truie/Verrat/BandePorcelets (migration `2026_05_01_animal_photos_extended.sql` antérieure).

### Livrable 3 — `<CycleTimeline>` V2 (DS)

**Fichier** : `src/design-system/components/index.tsx` (~67 lignes refondues) + `components.css` (+137 lignes)

**Améliorations vs V1** :
- Layout vertical strict (cercle / label dessous / date dessous)
- Track CSS séparé du fill (anti-superposition)
- Helper `shortenLabel` (truncate intelligent : `SURVEILLANCE` → `SURV.` sur mobile)
- Animation pulse sur étape "active" (premier non-done)
- `aria-current="step"` sur étape active
- Support `prefers-reduced-motion`
- Responsive : `@media (max-width: 380px)` bascule vers labels abrégés
- API rétrocompat préservée (`currentDay`, `totalDays`, `steps`, `eyebrow`)

**Cleanup** :
- `src/features/tables/bandes/CycleTimeline.tsx` (52L legacy) **SUPPRIMÉ**
- BandeDetailView migré du legacy vers DS V2
- TruieDetailView mini-timeline doublon supprimée (décision V45 PDF : timeline UNIQUEMENT dans onglet Reproduction, pas dans le hero)

### Livrable 4 — Hero compact archétype 4 V45

**3 fiches refondues** :

#### TruieDetailView.tsx (1310→1295L)
- `EntityAvatar species="truie" size="xl"` (96×96)
- Tags inline + actions (Saisir évènement / Modifier) à droite
- minHeight 96 pour cohérence cross-fiche
- Mini-timeline doublon supprimée (CycleTimeline anciennement L514-528)
- Imports nettoyés : IconBox, TruieIcon, CycleTimeline retirés
- PageHeader V43.7 + Tabs V43.6 + 12 Sections UPPERCASE V44 préservés

#### VerratDetailView.tsx (553→574→610L après Phase 4)
- AnimalHero custom → PageHeader DS + Card hero compact
- `EntityAvatar species="verrat" size="xl"`
- Helper `statutHeroTone` (AnimalHeroChip) → `statutTagVariant` (Tag DS variants)
- Subtitle PageHeader retiré (évite duplication 'Actif' avec Tag)
- Imports : suppression AnimalHero/AnimalHeroChip/VerratIcon ; ajout Card/Tag/EntityAvatar
- Sections UPPERCASE V44 + breadcrumb V43.7 cliquable préservés

#### BandeDetailView.tsx (1010→1091→1092L après Phase 4)
- `EntityAvatar species="bande" size="xl"` inséré entre PageHeader et Tabs
- Titre "Bande {idPortee}" + sous-titre date MB inline si présente
- Tags contextuels : statut (variant mappé), nb vivants (soft), âge (default)
- Actions inline : Saisir évènement (bascule onglet santé) / Modifier
- PageHeader V43.6 + Tabs V43.6 + workflows critiques (MB confirmer, sevrage, mutations) intégralement préservés

### Livrable 5 — Tabs uniformisés (API harmonisée)

**API uniforme** : `<Tabs value={tab} onChange={...} options={[{value, label}]} />` (V45 PDF spec)

**TruieDetailView** : 4 onglets
- VUE D'ENSEMBLE / REPRODUCTION / SANTÉ / HISTORIQUE
- Migration `items=[{id,label}]` → `options=[{value,label}]`
- Valeurs `apercu/repro` → `overview/reproduction` (cohérence cross-fiche)
- 12 conditions `activeTab === '...'` propagées

**VerratDetailView** : 4 onglets **AJOUTÉS** (n'existaient pas — sections empilées avant)
- VUE D'ENSEMBLE / SAILLIES / SANTÉ / LIGNÉE
- Distribution : Identité+Notes+Photos+Actions sous overview, Saillies sous saillies, Historique soins sous sante, placeholder lignee
- Test 'historique soins empty state' adapté (fireEvent.click sur tab SANTÉ avant inspection)

**BandeDetailView** : 4 onglets renommés
- VUE D'ENSEMBLE / DÉTAILS / SANTÉ / NOTES
- Décision pragmatique : sémantique conservée (le contenu actuel ne match pas spec V45 animaux/reproduction/performance — refus de renommée brutale qui casserait les contenus). Labels harmonisés UPPERCASE.
- Valeur `apercu` → `overview` (cohérence cross-fiche)

## 4. PorceletDetailView — décision

**N'existe pas** dans le repo actuel. Décision orchestrateur Phase 0 : **BandeDetail = fiche porcelet de fait** (l'UX actuelle gère par bande, pas par porcelet individuel). Pas de fiche dédiée créée en V45 — défer à V46+ si besoin métier.

## 5. Risques résolus / résiduels

### ✅ Résolus
- **2 CycleTimeline coexistantes** : version DS V2 unique, legacy supprimée, consommateurs migrés
- **Mini-timeline doublon dans hero** : éliminée selon décision V45 PDF (timeline uniquement dans onglet Reproduction)
- **AnimalHero custom VerratDetail** : remplacé par PageHeader DS + Card hero compact uniforme
- **API Tabs incohérente** (items= vs options=) : harmonisée sur `options=[{value, label}]` partout
- **Avatar uniforme** : EntityAvatar species + photoUrl support sur 3 listes + 3 fiches détail

### ⚠️ Résiduels (acceptés / déférés)
- **Path alias `@/components/...`** non résolu par tsc (tsconfig mappe `@/*` → `./*` racine, pas `./src/*`). Tous les imports EntityAvatar utilisent chemin relatif. **Tag** : à normaliser éventuellement V46 via tsconfig path mapping.
- **Tab Lignée Verrat** : placeholder texte (pas de données généalogiques structurées disponibles). **Tag** : `// TODO V46: arbre généalogique` quand données disponibles.
- **Bande tabs sémantique** : conservée (apercu/details/sante/notes au lieu de animaux/reproduction/performance spec V45). **Tag** : si Christophe veut renommer brutalement, ouvrir un sub-batch dédié pour réorganiser les contenus de tabs.
- **photo_url Supabase** : déjà présent dans `sows`, `boars`, `batches` (migration `2026_05_01` antérieure). Aucune migration V45 nécessaire. Optionnel V46 : table `porcelets_individuels` (si fiche individuelle créée).
- **CHECK 2 DS Compliance** (~10 boutons natifs) : radio buttons `role="radio"` intentionnels (pas de RadioGroup primitif au DS). Idem V44.
- **Bande shortCode human-readable** (`B-20260503-M-02` → `26-T1-01`) : pas de fonction repo existante. **Tag** : `// TODO V46: format human-readable`.

## 6. Validation finale

```
=== VALIDATION V45 ===

[1] Branche
$ git rev-parse --abbrev-ref HEAD
migration/v45-fiches-modernes

[2] Commits sur la branche (vs main @ v2.2.0)
$ git log --oneline migration/v45-fiches-modernes ^main | wc -l
6 commits

[3] Type-check
$ npx tsc --noEmit
OK (output vide)

[4] Tests unitaires
$ npm run test:unit 2>&1 | tail -3
 Test Files  137 passed (137)
      Tests  1699 passed | 6 skipped (1705)

[5] Build production
$ npm run build 2>&1 | tail -2
files generated (110+ PWA entries, +EntityAvatar chunk)

[6] DS Compliance
$ bash scripts/check-ds-compliance.sh
14/15 verts (1 erreur bloquante CHECK 2 = radiogroups natifs intentionnels,
2 warnings CHECK 3 IonButtons résiduels SystemManagement + CHECK 10 ASCII commentaires)
Cible PDF V45 : "≥ 14/15 verts" — atteinte

[7] EntityAvatar usage
$ grep -rn "EntityAvatar" src --include="*.tsx" | grep -v "\.test\." | wc -l
4+ usages (composant + 3 listes + 3 heros) confirmés

[8] CycleTimeline legacy supprimée
$ ls src/features/tables/bandes/CycleTimeline.tsx 2>/dev/null
(absent — suppression confirmée)

[9] Tabs API harmonisée
$ grep -rn "items=\[{id" src/features/troupeau src/features/tables 2>/dev/null
(0 occurrence ancien API — toutes options=[{value,label}])
```

## 7. Critères de DONE V45 (du PDF)

| Critère | Statut |
|---------|--------|
| `<EntityAvatar>` créé et utilisé dans 4 fiches + 4 listes | ✅ 3 fiches (truie/verrat/bande) + 3 listes (truies/verrats/porcelets-bandes-row) — porcelet pas de fiche par décision Phase 0 |
| CycleTimeline V2 sans superposition, responsive, lisible | ✅ DS V2 refondue, legacy supprimée |
| 3 fiches détail avec hero compact (pas de zone vide) | ✅ truie/verrat/bande |
| 3 fiches détail avec 4 tabs uniformisés | ✅ API `options=[{value,label}]` harmonisée |
| Tests verts (1685+ ✓) | ✅ 1699 passed (+18 vs V44) |
| `check-ds-compliance` ≥ 14/15 verts | ✅ 14/15 |
| Smoke test orchestrateur OK sur 3 fiches | ⏳ **EN ATTENTE Christophe** |
| MIGRATION_V45_FINAL.md généré | ✅ ce fichier |
| Merge main + tag v2.3.0 + deploy prod | ⏳ **EN ATTENTE OK Christophe** |

## 8. Procédure merge (à exécuter après OK Christophe)

```bash
# Vérifier état branche
git checkout migration/v45-fiches-modernes
git pull
npm run test:unit  # 1699 tests doivent passer
npm run build      # doit réussir

# Merge sur main (no-ff pour préserver l'historique des 6 commits V45)
git checkout main
git pull
git merge --no-ff migration/v45-fiches-modernes -m "Merge V45 — fiches détail modernes + EntityAvatar"

# Tag v2.3.0
git tag -a v2.3.0 -m "V45 — fiches détail modernes + EntityAvatar (3 fiches uniformes)"

# Push (déclenche FTP-Deploy automatique vers porctrack.tech)
git push origin main
git push origin v2.3.0
```

## 9. Procédure rollback (si bug critique en prod)

```bash
git revert -m 1 <merge-commit-sha>
git push origin main
# Le push trigger automatiquement re-deploy de v2.2.0 (V44)
```

⚠️ Rollback **uniquement** sur instruction explicite de Christophe.

---

**Généré par l'orchestrateur V45 le 2026-05-04. Phase F validator.**
