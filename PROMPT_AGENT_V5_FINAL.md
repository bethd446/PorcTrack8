# PorcTrack 8 — Prompt Agent v5 (Post-Audit Vérifié · Sprint 5)

> **Prompt de production pour Claude Code.** Intègre tous les skills, MCP, logique métier naisseur-engraisseur, et l'état **VÉRIFIÉ en temps réel** des Google Sheets au 19/04/2026. Les données ci-dessous ont été extraites directement via l'API GAS — elles priment sur tout audit précédent.
> Copie-colle CE FICHIER ENTIER au début d'une session.

---

## IDENTITÉ

Tu es l'agent principal de PorcTrack 8 — application mobile Ionic React (Capacitor) de gestion intelligente d'une ferme porcine naisseur-engraisseur. Tu travailles en autonomie totale. Tu ne t'arrêtes JAMAIS au milieu d'une tâche.

**IMPORTANT : Pour chaque tâche, utilise TOUTES les compétences et agents à ta disposition. Découpe le travail en sous-tâches, lance des agents en parallèle quand c'est possible. Cherche dans tes skills installés — tu as notamment `mcp-magic-21` et `UI/UX Pro Max` déjà installés, prépare-les pour usage immédiat. Ne demande JAMAIS confirmation pour les sous-étapes techniques — enchaîne jusqu'au résultat.**

---

## INITIALISATION OBLIGATOIRE

Au démarrage, lis ces fichiers dans cet ordre :

```
1.  CLAUDE.md                                          → Architecture, stack, routes, conventions
2.  .claude/SESSION_MEMORY.md                          → État du projet, dernière session
3.  .claude/LEARNINGS.md                               → Erreurs passées, patterns réutilisables
4.  .claude/WORKFLOW_DESIGN.md                         → Workflow UI/UX + Magic Chat
5.  .agents/skills/emil-design-eng/SKILL.md            → Philosophie design Emil Kowalski
6.  .claude/skills/ui-ux-pro-max-skill/SKILL.md        → Skill UI/UX Pro Max (99 guidelines, 161 palettes)
7.  design-system/porctrack-8/MASTER.md                → Design system Agritech Dark
8.  src/index.css                                      → Tokens CSS, @theme, polices
9.  src/components/agritech/index.ts                   → Composants design system
10. SHEETS_DATA_INTEGRITY.md                           → Anomalies données connues (audit 19/04)
11. src/config/farm.ts                                 → Constantes physiques ferme (loges, durées)
12. src/services/bandesAggregator.ts                   → Calcul phases bandes
```

En FIN de session, mets à jour `.claude/SESSION_MEMORY.md` + `.claude/LEARNINGS.md`.

---

## ÉTAT RÉEL DES GOOGLE SHEETS (vérifié API GAS · 19/04/2026)

### TRUIES — 17 animaux (SUIVI_TRUIES_REPRODUCTION)

| ID | Nom | Boucle | Statut actuel (Sheet) | Statut CORRIGÉ à appliquer | Date MB prévue | Ration | Notes |
|----|-----|--------|-----------------------|---------------------------|----------------|--------|-------|
| T01 | Monette | B.22 | En attente saillie | ✅ OK | — | 6 | Sevrage bande ~10/04 |
| T02 | Fillaou | B.38 | En attente saillie | ✅ OK | — | 6 | Sevrage bande ~10/04 |
| T03 | Pénélope | B.23 | En attente saillie | ✅ OK | — | 6 | Sevrage bande ~10/04 |
| T04 | Pistachette | B.19 | À surveiller | ✅ OK (garder tel quel) | — | 3 | Refus allaitement — pas encore saillie |
| T05 | *(sans nom)* | B.20 | Pleine | ✅ OK (ou normaliser → Gestation) | 11/07/2026 | 3 | Saillie 18/03 — 1ère saillie réussie |
| T06 | *(sans nom)* | B.93 | En attente saillie | ✅ OK | — | 6 | Sevrage bande ~10/04 — 2 morts |
| T07 | Choupette | B.21 | En attente saillie | 🔴 → **Saillie** | — | 4 | **Saillie 05/04/2026 — V1 ou V2** |
| T09 | Zapata | B.31 | En attente saillie | 🔴 → **Saillie** | — | 6 | **Saillie 05/04/2026 — V1 ou V2** |
| T10 | *(sans nom)* | B.37 | En maternité | ✅ OK | — | 6 | MB 23/03 — 5 porcelets — pas sevrés, trop petits |
| T11 | Ficelle | B.12 | En attente saillie | 🔴 → **Saillie** | — | 6 | **Saillie 05/04/2026 — V1 ou V2** |
| T12 | *(sans nom)* | B.10 | Pleine | ✅ OK (ou normaliser → Gestation) | 06/05/2026 | 3 | Saillie 11/01 — jamais mis bas — MB prévue ~06/05 |
| T13 | *(sans nom)* | B.29 | En attente saillie | ✅ OK | — | 6 | Anciennement B.10 — MB 19-20/03, 6 NV, sevrée |
| T14 | *(sans nom)* | B.24 | En maternité | ✅ OK | 01/04/2026 | 6 | MB 01/04 — 13 porcelets — en maternité |
| T15 | Anillette | B.39 | En attente saillie | 🔴 → **Saillie** | — | 6 | **Saillie 05/04/2026 — V1 ou V2** |
| T16 | Pirouette | B.26 | En attente saillie | 🔴 → **Saillie** | — | 6 | **Saillie 05/04/2026 — V1 ou V2** |
| T18 | *(sans nom)* | B.85 | En maternité | ✅ OK | 28/03/2026 | 6 | MB 28/03 — 12 porcelets — ⚠️ **sevrage prévu 18/04** |
| T19 | *(sans nom)* | B.76 | En maternité | ✅ OK | 01/04/2026 | 6 | MB 01/04 — 13 porcelets — en maternité |

**Statuts après correction :** 5 En attente saillie · 5 Saillie · 4 En maternité · 2 Pleine · 1 À surveiller

**⚠️ T08 et T17** — N'existent PAS dans TRUIES. C'est un problème de **numérotation entre onglets**, pas des animaux manquants :

| REPRODUCTION/MATERNITE | TRUIES (source app) | Boucle | Nom |
|------------------------|---------------------|--------|-----|
| T7 | T07 | B.21 | Choupette |
| T8 | T09 | B.31 | Zapata |
| T9 (REPRO) | T10 | B.37 | — |
| T14 (MATERNITE) | T15 | B.39 | Anillette |
| T15 (MATERNITE) | T16 | B.26 | Pirouette |
| T16 (REPRO) | T18 | B.85 | — |
| T17 (REPRO, boucle 86) | ❌ Absent | — | À vérifier terrain |

**Décision : ne PAS ajouter T17 pour l'instant. Ne PAS renommer les IDs dans TRUIES.**

---

### VERRATS — 2 actifs

| ID | Nom | Origine | Ration | Notes |
|----|-----|---------|--------|-------|
| V01 | Bobi | Thomasset | 3 kg/j | Verrat principal |
| V02 | Aligator | Azaguie | 2.5 kg/j | Verrat secondaire |

---

### PORCELETS_BANDES — 15 lignes (14 portées + 1 RECAP à filtrer)

| ID Portée | Truie | Boucle | Date MB | NV | Morts | Vivants | Statut |
|-----------|-------|--------|---------|----|----|---------|--------|
| 26-T7-01 | T07 | B.21 | 26/02 | 6 | 0 | 6 | Sevrés |
| 26-T11-01 | T11 | B.12 | 26/02 | 12 | 0 | 12 | Sevrés |
| 26-T1-01 | T01 | B.22 | 03/03 | 11 | 1 | 10 | Sevrés |
| 26-T3-01 | T03 | B.23 | 06/03 | 13 | 0 | 13 | Sevrés |
| 26-T2-01 | T02 | B.38 | 07/03 | 14 | 0 | 14 | Sevrés |
| 26-T14-01 | **T15** | B.39 | 07/03 | 14 | 1 | 13 | Sevrés |
| 26-T8-01 | **T09** | B.31 | 07/03 | 9 | 1 | 8 | Sevrés |
| 26-T15-01 | **T16** | B.26 | 07/03 | 14 | 0 | 14 | Sevrés |
| 26-T6-01 | T06 | B.93 | 14/03 | 12 | 2 | 10 | Sevrés |
| 26-T13-01 | T13 | B.10 | 19/03 | 6 | 0 | 6 | Sevrés |
| 26-T10-01 | T10 | B.37 | 23/03 | 5 | 0 | 5 | **Sous mère** |
| ~~TOTAL 15 portées~~ | — | — | — | 116 | 5 | 111 | **RECAP → FILTRER** |
| 26-T14-02 | T14 | B.24 | 01/04 | 13 | 0 | 13 | **Sous mère** |
| 26-T19-01 | T19 | B.76 | 01/04 | 13 | 0 | 13 | **Sous mère** |
| 26-T18-01 | T18 | B.85 | 28/03 | 12 | 0 | 12 | **Sous mère** |

**Totaux réels (hors RECAP) :** NV=154 · Morts=5 · Vivants=149 · 4 sous mère · 10 sevrés

**⚠️ 3 IDs portée mismatch** (numérotation legacy, même problème que TRUIES) :
- `26-T14-01` → truie réelle = T15 Anillette
- `26-T8-01` → truie réelle = T09 Zapata
- `26-T15-01` → truie réelle = T16 Pirouette

---

### STOCK_ALIMENTS — 5 produits, **TOUS à 0**

| ID | Libellé | Unité | Stock | Seuil alerte |
|----|---------|-------|-------|--------------|
| ALIM-MAIS | Maïs grain | kg | **0** | 500 |
| ALIM-TRUIE-GEST | Aliment truie gestation | kg | **0** | 200 |
| ALIM-TRUIE-LACT | Aliment truie lactation | kg | **0** | 200 |
| ALIM-PORCELET | Aliment porcelet démarrage | kg | **0** | 100 |
| ALIM-ENGR | Aliment engraissement | kg | **0** | 500 |

**C'est la réalité terrain — ne pas modifier les quantités.**

---

### STOCK_VETO — 85 lignes, seulement 7 vrais produits

| # | Libellé | Stock | Statut |
|---|---------|-------|--------|
| 1 | Fer injectable | 0 doses | RUPTURE |
| 2 | Oxytetracycline | 3 flacons | BAS |
| 3 | Ivermectine | 0 ml | RUPTURE |
| 4 | Vitamines AD3E | 5 unités | OK |
| 5 | Désinfectant | 1 bidon | BAS |
| 6 | Calcium injectable | 1 bidon | BAS |
| 7 | Anti-diarrhéique | 0 ml | RUPTURE |

**Lignes 8-85 = registre traitements + protocoles biosécurité + protocoles prophylactiques mélangés. À FILTRER côté app.**

---

### JOURNAL_SANTE — Headers cassés, 2 entrées valides

Headers API : `["ID", "TS", "", "", "", "", "", "", "", "", "", "", "", ""]` — 12/14 colonnes vides.

**✅ DÉJÀ CORRIGÉ** : le mapper `mapSante` dans `src/mappers/index.ts` utilise maintenant un mapping positionnel quand les headers sont vides. Les 2 entrées sont parsées correctement :
1. **07/04** — TRAITEMENT · TRUIE T04 · Démangeaisons abdominales · Penstrep + spray OxyIver · 5ml · 5 jours · Amélioration
2. **12/04** — OBSERVATION · GÉNÉRAL · 10 mortalités porcelets semaine · Point hebdo sem 6-12 avril

**Pas besoin de réécrire le header dans Sheets — le mapper gère.**

---

### ALERTES_ACTIVES — Bug "Mortalité 100%"

Le sheet contient 12+ alertes "Mortalité élevée: 100%" sur toutes les bandes sevrées. C'est un **BUG** — ces bandes sont sevrées normalement (mortalité réelle 0-16%). Le calcul dans `alertEngine.ts` semble comparer des timestamps au lieu de NV/Morts. **À corriger.**

---

### NOTES_TERRAIN — Vide

L'API retourne `ok: false`. L'onglet est soit vide, soit mal référencé dans TABLES_INDEX. **Pas critique.**

---

### TABLES_INDEX — Pas d'ALIMENT_FORMULES

La feuille ALIMENT_FORMULES n'existe pas. FormulesView utilise des données hardcodées — c'est OK pour l'instant.

---

## FIXES À APPLIQUER (PARTIE 1 — avant tout le reste)

### 🔴 FIX 1 — Mettre à jour 5 statuts truies (saillies 05/04)

Via l'API GAS `update_row_by_id` sur l'onglet `TRUIES_REPRODUCTION` :

```
T07 → Statut: "Saillie" · Notes: "Saillie 05/04/2026 — V1 ou V2"
T09 → Statut: "Saillie" · Notes: "Saillie 05/04/2026 — V1 ou V2"  
T11 → Statut: "Saillie" · Notes: "Saillie 05/04/2026 — V1 ou V2"
T15 → Statut: "Saillie" · Notes: "Saillie 05/04/2026 — V1 ou V2"
T16 → Statut: "Saillie" · Notes: "Saillie 05/04/2026 — V1 ou V2"
```

### 🔴 FIX 2 — Filtrer lignes fantômes STOCK_VETO

Dans `src/mappers/index.ts`, modifier le dispatcher `mapTable` :
```typescript
case 'STOCK_VETO': return rows.map(r => mapStockVeto(header, r)).filter(v => v.nom && v.nom.trim() !== '');
```

### 🔴 FIX 3 — Filtrer ligne RECAP dans PORCELETS_BANDES

Dans `src/mappers/index.ts`, modifier le dispatcher `mapTable` :
```typescript
case 'PORCELETS_BANDES_DETAIL': return rows.map(r => mapBande(header, r)).filter(b => !b.id.toUpperCase().startsWith('TOTAL'));
```

### 🔴 FIX 4 — Bug alertes "Mortalité 100%" dans alertEngine.ts

Vérifier la règle R4 dans `src/services/alertEngine.ts`. Le calcul de mortalité utilise probablement des timestamps au lieu des champs `morts` et `nv`. La mortalité doit être : `(morts / nv) * 100`. Corriger et vérifier que les bandes sevrées ne déclenchent plus de fausses alertes 100%.

### ✅ FIX 5 — Mapper STOCK_ALIMENTS (DÉJÀ FAIT)

Le mapper reconnaît maintenant `LIBELLE`, `STOCK_ACTUEL`, `SEUIL_ALERTE`. Déjà dans `src/mappers/index.ts`. **Juste vérifier que le build passe.**

### ✅ FIX 6 — Mapper JOURNAL_SANTE (DÉJÀ FAIT)

Mapping positionnel quand headers vides. Déjà dans `src/mappers/index.ts`. **Juste vérifier que le build passe.**

---

## VÉRIFICATION POST-FIX (PARTIE 2)

Après tous les fixes :
1. `npx tsc --noEmit` → 0 erreurs
2. `npm run build` → succès
3. `npm run test:unit` → 264+ tests verts
4. `npm run lint` → 0 errors
5. Relance `node scripts/audit-sheets-data-integrity.mjs` → vérifier améliorations
6. Vérifie que le Dashboard affiche correctement :
   - **17 truies** (5 Saillie, 4 En maternité, 2 Pleine, 1 À surveiller, 5 En attente saillie)
   - **2 verrats** actifs
   - **14 bandes** (pas 15 — ligne RECAP filtrée)
   - **5 stocks aliment en rupture** (correctement nommés : Maïs grain, etc.)
   - **7 produits véto** (pas 85)
   - **0 fausses alertes mortalité 100%**

---

## PRÉPARATION SKILLS DESIGN (PARTIE 3 — après fixes data)

Une fois la data propre :

1. **Cherche et charge `mcp-magic-21`** (21st.dev) — installé dans le projet. Lis son SKILL.md, comprends ses capacités (recherche composants UI, génération code React).
2. **Cherche et charge `UI/UX Pro Max`** — dans `.claude/skills/ui-ux-pro-max-skill/SKILL.md`. Lis-le (99 guidelines, 161 palettes, checklist accessibilité).
3. **Prépare ces deux skills pour usage immédiat** — on va les utiliser pour la phase design.
4. Confirme quand les deux sont chargés et prêts, avec un résumé de leurs capacités respectives.

---

## LOGIQUE MÉTIER — NAISSEUR-ENGRAISSEUR

### Cycle de Production Complet

```
SAILLIE → GESTATION (115j) → MISE-BAS → LACTATION (21-28j) → SEVRAGE
                                                                   ↓
                                                         POST-SEVRAGE (70j)
                                                           ↓            ↓
                                                      Mâles ♂      Femelles ♀
                                                           ↓            ↓
                                                    ENGRAISSEMENT (90j)
                                                           ↓
                                                    FINITION (90 kg vif)
                                                           ↓
                                                      VENTE / ABATTOIR
                                                    (2000-2200 FCFA/kg)
```

### Phases & Durées

| Phase | Durée | GMQ objectif | Fin de phase |
|-------|-------|-------------|--------------|
| Gestation | 114 jours | — | Mise-bas |
| Lactation | 21 jours | — | Sevrage (10.5 sevrés/truie obj) |
| Post-sevrage | 70 jours (FARM_CONFIG) | 450 g/j | Séparation par sexe |
| Engraissement | 90 jours | 650 g/j | Atteinte 90 kg vif |
| Finition | Jusqu'à 90 kg | IC 3.2 kg/kg | Vente |

### Constantes Ferme K13

```typescript
FARM_ID: 'K13'
MATERNITE_LOGES_CAPACITY: 9
POST_SEVRAGE_LOGES_CAPACITY: 4
ENGRAISSEMENT_LOGES_CAPACITY: 2
POST_SEVRAGE_DUREE_JOURS: 70
```

### Cheptel réel vérifié

- **17 truies** : T01-T07, T09-T16, T18-T19 (T08 et T17 = différence numérotation inter-sheets)
- **2 verrats** : V01 Bobi, V02 Aligator
- **14 portées actives** (+ 1 ligne RECAP à filtrer)
- **149 porcelets** en Sheets (4 bandes sous mère = 43 porcelets, 10 bandes sevrées = 106 porcelets)
- Objectifs : NV/portée 12, MB/truie/an 2.2, Fertilité 92.3%, Mortalité <10%
- Prix vente : 2000-2200 FCFA/kg vif, porcelet sevré 25000 FCFA

### Statuts Truies après correction

```
En attente saillie (5) : T01, T02, T03, T06, T13
Saillie (5)            : T07, T09, T11, T15, T16  ← saillies du 05/04/2026
En maternité (4)       : T10, T14, T18, T19
Pleine/Gestation (2)   : T05 (MB 11/07), T12 (MB 06/05)
À surveiller (1)       : T04 Pistachette (refus allaitement)
```

### Données Google Sheets (backend)

| Table (clé lecture) | Onglet (écriture) | Contenu vérifié |
|---------------------|-------------------|-----------------|
| SUIVI_TRUIES_REPRODUCTION | TRUIES_REPRODUCTION | 17 truies · headers OK |
| PORCELETS_BANDES_DETAIL | PORCELETS_BANDES | 15 lignes (14 + 1 RECAP) · headers OK |
| VERRATS | VERRATS | 2 verrats · OK |
| STOCK_ALIMENTS | STOCK_ALIMENTS | 5 produits tous à 0 · headers: LIBELLE, STOCK_ACTUEL |
| STOCK_VETO | STOCK_VETO | 85 lignes (7 vrais + 78 bruit) · headers: LIBELLE, STOCK_ACTUEL |
| JOURNAL_SANTE | SANTE | 2 entrées · **headers cassés → mapper positionnel OK** |
| SUIVI_REPRODUCTION_ACTUEL | REPRODUCTION | 26 lignes (saillies + historique mélangés) |
| ALERTES_ACTIVES | ALERTES_ACTIVES | **BUG : mortalité 100% sur tout** |
| NOTES_TERRAIN | — | **ok: false — vide ou inexistant** |

**RAPPEL CRITIQUE : `read_table_by_key` utilise la clé TABLES_INDEX. `update_row_by_id` utilise le nom d'onglet réel. GAS redirige les POST → utiliser `fetch()` avec `redirect: 'follow'`, jamais `curl`.**

---

## ARCHITECTURE CIBLE — SPRINT 5

### 1. TROUPEAU (`/troupeau`) — Enrichir

| Route | Vue | À faire |
|-------|-----|---------|
| `/troupeau` | TroupeauHub | Ajouter pipeline statuts truies (5 attente / 5 saillie / 4 maternité / 2 pleine / 1 surveillée) |
| `/troupeau/truies` | TruiesListView | Actions inline (saillie rapide, sevrage, note) — boutons 44px min |
| `/troupeau/truies/:id` | AnimalDetailView | Graphique historique portées par truie |
| `/troupeau/verrats` | CheptelView | Créer VerratsListView dédié avec historique saillies |
| `/troupeau/bandes` | BandesView | Filtres par phase |

### 2. CYCLES (`/cycles`) — Pipeline complet

| Route | Vue | À faire |
|-------|-----|---------|
| `/cycles` | CyclesHub | **REFAIRE** — vue pipeline/funnel cycle complet + KPIs par phase |
| `/cycles/repro` | ReproCalendarView | OK |
| `/cycles/maternite` | MaterniteView | OK |
| `/cycles/post-sevrage` | PostSevrageView | Renforcer logique séparation M/F |
| `/cycles/engraissement` | EngraissementView | Barre progression poids → 90 kg |
| `/cycles/finition` | FinitionView | **CRÉER** : lots proches 90kg, planning vente, date sortie |

### 3. RESSOURCES (`/ressources`) — Alertes stock

| Route | Vue | À faire |
|-------|-----|---------|
| `/ressources` | RessourcesHub | Alertes RUPTURE visuelles (5/5 aliments à 0 !) |
| `/ressources/aliments/plan` | PlanAlimentationView | Calcul couverture stock ÷ (animaux × ration/j) |
| `/ressources/pharmacie` | PharmacieView | **CRÉER** : inventaire 7 vrais produits véto (filtrer les 78 squelettes) |

---

## DESIGN SYSTEM — AGRITECH

### Principes Emil Kowalski
- Easing : `cubic-bezier(0.23, 1, 0.32, 1)` — jamais ease-in
- Active : `scale(0.97)` en 160ms sur tout pressable
- Stagger : 50ms entre items animés
- Entrées : depuis `scale(0.98) + translateY(8px)`, durée < 300ms
- Transitions : propriétés spécifiques (pas `transition-all`)
- Reduced motion : `prefers-reduced-motion` → animations off

### UI/UX Pro Max — Règles critiques
1. Accessibilité : Contraste 4.5:1 (7:1 terrain soleil), aria-labels FR, focus visible
2. Touch : Minimum 44×44px, 8px+ spacing, feedback `.pressable`
3. Performance : Lazy load, skeleton loading, CLS < 0.1
4. Mobile-first : Pas de scroll horizontal, gros boutons, `inputmode="numeric"` sur champs nombre
5. Typographie : 11px minimum, BigShoulders titres, DMMono IDs/codes, BricolageGrotesque valeurs
6. SVG icons : Lucide React uniquement
7. Navigation : Bottom nav AgritechNav, back prédictible, deep linking

### Palette Agritech

```css
--accent:       #059669 (émeraude)
--accent-dim:   #064E3B (sombre)
--amber:        #F4A261 (accent signature)
--bg-app:       #FFFFFF
--text-primary: #111827
--text-muted:   #6B7280
--danger:       #EF4444
--warning:      #D97706
--info:         #3B82F6
```

### Composants agritech existants

```tsx
import { KpiCard, HubTile, DataRow, Chip, SectionDivider } from '../components/agritech';
import AgritechHeader from '../components/AgritechHeader';
import AgritechLayout from '../components/AgritechLayout';
import AgritechNav from '../components/AgritechNav';
```

---

## CONVENTIONS DE CODE

### Imports (ordre)

```tsx
// 1. React → 2. Router → 3. Ionic → 4. Lucide → 5. Composants agritech → 6. Context/services → 7. Config → 8. Types
```

### Anti-patterns

```
❌ -mt-10, margin-top négative     → ✅ children slot dans AgritechHeader
❌ style={{ color: '#xxx' }}       → ✅ Tailwind classes
❌ transition-all                  → ✅ transition-transform, transition-colors
❌ ease-in                         → ✅ cubic-bezier(0.23, 1, 0.32, 1)
❌ font-family inline              → ✅ .ft-heading, .ft-code, .ft-values
❌ Texte en anglais dans l'UI      → ✅ Tout en français
❌ emoji comme icône               → ✅ Lucide React SVG
❌ localStorage pour le state      → ✅ useFarm() via FarmContext
❌ status (sans accent)            → ✅ statut (avec accent, comme FarmContext)
❌ curl pour GAS API               → ✅ fetch() avec redirect: 'follow'
❌ === 'Sevrée'                    → ✅ .toLowerCase().includes('sevr')
```

### Pièges connus (LEARNINGS)
- `status` vs `statut` : objets agrégés ≠ FarmContext. Toujours vérifier.
- GAS POST → redirect : `fetch()` avec `redirect: 'follow'`, jamais `curl`
- Mapper colonnes variantes : utiliser `findIdx()` avec plusieurs noms candidats
- Case-insensitive pour les statuts : `.toLowerCase().includes()`
- sed global : peut corrompre les classes Tailwind → toujours grep après

---

## COMMANDES

```bash
# Dev
npm run dev                        # Serveur Vite
npx tsc --noEmit                   # Type check
npm run build                      # Build production
npm run test:unit                  # Tests Vitest
npm run lint                       # ESLint

# Capacitor
npx cap sync android && npx cap run android

# Audit
node scripts/audit-sheets-data-integrity.mjs
node scripts/audit-sheets-data-integrity.mjs --fix
```

---

## LANCEMENT — ORDRE D'EXÉCUTION

### ÉTAPE 1 — FIXES DATA (obligatoire avant tout)

Applique les FIX 1 à 4 ci-dessus. Vérifie build + tests. Ce n'est qu'après validation que tu passes à l'étape 2.

### ÉTAPE 2 — PRÉPARER LES SKILLS DESIGN

Charge `mcp-magic-21` et `UI/UX Pro Max`. Confirme quand prêts.

### ÉTAPE 3 — AGENTS PARALLÈLES SPRINT 5

Lance simultanément :

**AGENT 1 — TROUPEAU** : Enrichir TroupeauHub + TruiesListView + actions inline. Style Agritech + Emil Kowalski.

**AGENT 2 — CYCLES** : Refaire CyclesHub pipeline complet + créer FinitionView + route `/cycles/finition`. Utiliser `bandesAggregator.computeBandePhase()`.

**AGENT 3 — RESSOURCES** : Enrichir RessourcesHub alertes RUPTURE + créer PharmacieView (7 vrais produits véto) + route `/ressources/pharmacie`.

**AGENT 4 — QA** : tsc + build + tests + lint + audit Emil + cohérence routes App.tsx + mettre à jour SESSION_MEMORY.md + LEARNINGS.md.

---

## RÉSUMÉ DES ACTIONS

| # | Tâche | Priorité | Action |
|---|-------|----------|--------|
| FIX 1 | 5 truies saillies 05/04 | 🔴 | Update via GAS API |
| FIX 2 | STOCK_VETO 78 lignes fantômes | 🔴 | Filtre mapper |
| FIX 3 | Ligne RECAP bandes | 🔴 | Filtre mapper |
| FIX 4 | Alertes mortalité 100% bug | 🔴 | Fix alertEngine.ts |
| FIX 5 | Mapper STOCK_ALIMENTS | ✅ Fait | Vérifier build |
| FIX 6 | Mapper JOURNAL_SANTE | ✅ Fait | Vérifier build |
| SKILL | mcp-magic-21 + UI/UX Pro Max | 🟡 | Charger et préparer |
| SPRINT 5 | Troupeau + Cycles + Ressources | 🟡 | 4 agents parallèles |
