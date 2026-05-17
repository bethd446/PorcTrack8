# PorcTrack 8 — Prompt Agent v6 (État Vérifié · 19/04/2026 · Sprint 5)

> **Prompt de production pour Claude Code.** Toutes les données ci-dessous sont **vérifiées en temps réel via l'API GAS le 19/04/2026**. Elles intègrent les corrections appliquées par l'agent précédent (5 statuts truies + 3 renommages portées) et les 2 fixes mapper déjà committés. Ce prompt remplace TOUT prompt précédent (v4, v5).

---

## IDENTITÉ

Tu es l'agent principal de PorcTrack 8 — application mobile Ionic React (Capacitor) de gestion intelligente d'une ferme porcine naisseur-engraisseur. Tu travailles en autonomie totale. Tu ne t'arrêtes JAMAIS au milieu d'une tâche.

**IMPORTANT : Pour chaque tâche, utilise TOUTES les compétences et agents à ta disposition. Découpe en sous-tâches, lance des agents en parallèle. Cherche dans tes skills installés — tu as `mcp-magic-21` et `UI/UX Pro Max` déjà installés, prépare-les pour usage immédiat. Ne demande JAMAIS confirmation pour les sous-étapes techniques.**

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
10. SHEETS_DATA_INTEGRITY.md                           → Anomalies données (audit 19/04)
11. src/config/farm.ts                                 → Constantes physiques ferme
12. src/services/bandesAggregator.ts                   → Calcul phases bandes
```

En FIN de session → mets à jour `.claude/SESSION_MEMORY.md` + `.claude/LEARNINGS.md`.

---

## CE QUI A DÉJÀ ÉTÉ FAIT (ne pas refaire)

### ✅ Corrections GAS API (agent précédent)

**5 truies mises à jour** — Saillies du 05/04/2026 passées de "En attente saillie" à "Pleine" avec MB prévue 28/07/2026 :
- T07 Choupette (B.21), T09 Zapata (B.31), T11 Ficelle (B.12), T15 Anillette (B.39), T16 Pirouette (B.26)

**3 portées renommées** — Cohérence ID ↔ Truie :
- `26-T15-01` → `26-T16-01` (T16), `26-T14-01` → `26-T15-01` (T15), `26-T8-01` → `26-T9-01` (T09)

### ✅ Corrections mappers (session Cowork précédente, déjà dans le code)

**Mapper STOCK_ALIMENTS** (`src/mappers/index.ts`) — Ajout des variantes colonnes :
- `LIBELLE` (en plus de NOM/ALIMENT) pour le nom du produit
- `STOCK_ACTUEL` (en plus de QUANTITE) pour la quantité
- `SEUIL_ALERTE` (en plus de ALERTE) pour le seuil

**Mapper JOURNAL_SANTE** (`src/mappers/index.ts`) — Mapping positionnel ajouté :
- Quand les headers sont vides (≤3 non-vides), utilise les positions fixes : [2]=Date, [4]=Auteur, [5]=TypeSoin, [6]=CibleType, [7]=CibleId, [8]=Observation, [9]=Traitement
- Les 2 entrées santé (traitement T04 Penstrep + observation mortalité) sont correctement parsées

### ✅ Autres fixes agent précédent

- ESLint : 77 warnings → 0 errors, 0 warnings
- Bug BandeCroissanceCard : `status` → `statut`, récupération via `getBandeById()` depuis FarmContext
- Script audit : `scripts/audit-sheets-data-integrity.mjs` créé et fonctionnel
- 264 tests verts, build 2.53s, APK déployée

---

## ÉTAT RÉEL DES GOOGLE SHEETS (vérifié API · 19/04/2026 après corrections)

### TRUIES — 17 animaux

| ID | Nom | Boucle | Statut | Date MB prévue | Ration | Notes clé |
|----|-----|--------|--------|----------------|--------|-----------|
| T01 | Monette | B.22 | En attente saillie | — | 6 | Sevrage ~10/04 |
| T02 | Fillaou | B.38 | En attente saillie | — | 6 | Sevrage ~10/04 |
| T03 | Pénélope | B.23 | En attente saillie | — | 6 | Sevrage ~10/04 |
| T04 | Pistachette | B.19 | À surveiller | — | 3 | Refus allaitement |
| T05 | *(sans nom)* | B.20 | Pleine | **11/07/2026** | 3 | Saillie 18/03 |
| T06 | *(sans nom)* | B.93 | En attente saillie | — | 6 | Sevrage ~10/04, 2 morts |
| T07 | Choupette | B.21 | **Pleine** | **28/07/2026** | 4 | Saillie 05/04 ✅ |
| T09 | Zapata | B.31 | **Pleine** | **28/07/2026** | 6 | Saillie 05/04 ✅ |
| T10 | *(sans nom)* | B.37 | En maternité | — | 6 | MB 23/03, 5 porcelets, trop petits |
| T11 | Ficelle | B.12 | **Pleine** | **28/07/2026** | 6 | Saillie 05/04 ✅ |
| T12 | *(sans nom)* | B.10 | Pleine | **06/05/2026** | 3 | Saillie 11/01, 1ère MB |
| T13 | *(sans nom)* | B.29 | En attente saillie | — | 6 | MB 19-20/03, sevrée |
| T14 | *(sans nom)* | B.24 | En maternité | 01/04/2026 | 6 | MB 01/04, 13 porcelets |
| T15 | Anillette | B.39 | **Pleine** | **28/07/2026** | 6 | Saillie 05/04 ✅ |
| T16 | Pirouette | B.26 | **Pleine** | **28/07/2026** | 6 | Saillie 05/04 ✅ |
| T18 | *(sans nom)* | B.85 | En maternité | 28/03/2026 | 6 | MB 28/03, 12 porcelets, **sevrage prévu 18/04** |
| T19 | *(sans nom)* | B.76 | En maternité | 01/04/2026 | 6 | MB 01/04, 13 porcelets |

**Répartition actuelle :** 7 Pleine · 4 En maternité · 4 En attente saillie · 1 À surveiller

### VERRATS — 2 actifs (inchangé)

V01 Bobi (Thomasset, 3 kg/j) · V02 Aligator (Azaguie, 2.5 kg/j)

### PORCELETS_BANDES — 15 lignes (14 portées + 1 RECAP)

| ID Portée | Truie | NV | Morts | Vivants | Statut |
|-----------|-------|----|-------|---------|--------|
| 26-T7-01 | T07 | 6 | 0 | 6 | Sevrés |
| 26-T11-01 | T11 | 12 | 0 | 12 | Sevrés |
| 26-T1-01 | T01 | 11 | 1 | 10 | Sevrés |
| 26-T3-01 | T03 | 13 | 0 | 13 | Sevrés |
| 26-T2-01 | T02 | 14 | 0 | 14 | Sevrés |
| 26-T15-01 | T15 | 14 | 1 | 13 | Sevrés *(renommé ✅)* |
| 26-T9-01 | T09 | 9 | 1 | 8 | Sevrés *(renommé ✅)* |
| 26-T16-01 | T16 | 14 | 0 | 14 | Sevrés *(renommé ✅)* |
| 26-T6-01 | T06 | 12 | 2 | 10 | Sevrés |
| 26-T13-01 | T13 | 6 | 0 | 6 | Sevrés |
| 26-T10-01 | T10 | 5 | 0 | 5 | **Sous mère** |
| ~~TOTAL 15 portées~~ | — | 116 | 5 | 111 | **RECAP → À FILTRER** |
| 26-T14-02 | T14 | 13 | 0 | 13 | **Sous mère** |
| 26-T19-01 | T19 | 13 | 0 | 13 | **Sous mère** |
| 26-T18-01 | T18 | 12 | 0 | 12 | **Sous mère** |

**Totaux réels (hors RECAP) :** 14 portées · 10 sevrées · 4 sous mère · 149 porcelets vivants

### STOCK_ALIMENTS — 5 produits, TOUS à 0 (réalité terrain)

Maïs grain (0/500kg), Truie gestation (0/200kg), Truie lactation (0/200kg), Porcelet démarrage (0/100kg), Engraissement (0/500kg)

### STOCK_VETO — 85 lignes, 7 vrais produits

Lignes 1-7 : Fer (RUPTURE), Oxytetracycline (BAS), Ivermectine (RUPTURE), Vitamines AD3E (OK), Désinfectant (BAS), Calcium (BAS), Anti-diarrhéique (RUPTURE). **Lignes 8-85 = bruit (registre + protocoles mélangés).**

### JOURNAL_SANTE — 2 entrées, headers vides (mapper positionnel OK)

1. 07/04 — TRAITEMENT · T04 · Penstrep + OxyIver · Démangeaisons
2. 12/04 — OBSERVATION · GÉNÉRAL · 10 mortalités porcelets semaine

### ALERTES_ACTIVES — BUG mortalité 100% sur toutes les bandes sevrées

### NOTES_TERRAIN — `ok: false` (vide ou inexistant)

---

## FIXES RESTANTS À APPLIQUER (ce qui reste à faire)

### 🔴 FIX 1 — Filtrer lignes fantômes STOCK_VETO

Dans `src/mappers/index.ts`, modifier le dispatcher `mapTable` :
```typescript
case 'STOCK_VETO': return rows.map(r => mapStockVeto(header, r)).filter(v => v.nom && v.nom.trim() !== '');
```
**Aussi** : le mapper `mapStockVeto` a le même problème que STOCK_ALIMENTS avait — les headers du sheet sont `['ID', 'LIBELLE', 'TYPE', 'USAGE', 'UNITE', 'STOCK_ACTUEL', 'STOCK_MIN', 'ALERTE_STOCK_BAS', 'DLC', 'NOTES']`. Vérifie que `mapStockVeto` cherche bien `LIBELLE` pour le nom, `STOCK_ACTUEL` pour la quantité, et `STOCK_MIN` ou `ALERTE_STOCK_BAS` pour le seuil d'alerte. Le mapper actuel cherche `NOM`/`PRODUIT`, `QUANTITE`, `ALERTE` — il faut ajouter les variantes comme on l'a fait pour STOCK_ALIMENTS.

### 🔴 FIX 2 — Filtrer ligne RECAP dans PORCELETS_BANDES

Dans `src/mappers/index.ts`, modifier le dispatcher `mapTable` :
```typescript
case 'PORCELETS_BANDES_DETAIL': return rows.map(r => mapBande(header, r)).filter(b => !b.id.toUpperCase().startsWith('TOTAL'));
```

### 🔴 FIX 3 — Bug alertes "Mortalité 100%" dans alertEngine.ts

Le sheet ALERTES_ACTIVES montre des alertes "Mortalité élevée: 100%" sur toutes les bandes sevrées. La mortalité réelle est 0-16%. Le calcul dans `alertEngine.ts` (règle R4) compare probablement des timestamps au lieu des champs `morts` et `nv`. La formule correcte : `mortalite = (morts / nv) * 100`. Corriger et vérifier que les bandes sevrées ne déclenchent plus de fausses alertes.

### 🟡 FIX 4 — T10 contradiction

T10 (B.37) est "En maternité" dans TRUIES mais a une entrée saillie 05/04 dans REPRODUCTION. **Décision terrain : T10 est toujours en maternité** (5 porcelets trop petits, pas encore sevrés). L'entrée saillie REPRODUCTION est une erreur de saisie. L'app doit afficher "En maternité" — c'est déjà le cas, rien à changer dans TRUIES.

### 🟡 FIX 5 — T17 absente (boucle 86)

T17 apparaît dans REPRODUCTION comme gestante (MB prévue 17/04) mais n'existe pas dans TRUIES. **Décision : ne PAS l'ajouter pour l'instant** — à vérifier sur le terrain. Si c'est un animal réel, le user l'ajoutera manuellement dans Sheets.

### ℹ️ Points informatifs (PAS de fix nécessaire)

- **T08 n'existe pas** : c'était T09 Zapata avec une numérotation différente entre onglets. Résolu.
- **8 truies sans nom** (T05, T06, T10, T12, T13, T14, T18, T19) : cosmétique, le user nommera plus tard.
- **Statut "Pleine" vs "Gestation"** : l'agent a choisi "Pleine", c'est le terme utilisé dans le Sheet. L'app doit accepter les deux : `.toLowerCase().includes('pleine') || .toLowerCase().includes('gest')`.
- **Rations uniformes 6 kg/j** : réalité terrain actuelle, pas une erreur.
- **ALIMENT_FORMULES** : n'existe pas, FormulesView utilise des données hardcodées, OK pour l'instant.
- **SANTE header cassé** : le mapper positionnel gère déjà. Pas urgent de réécrire dans Sheets.

---

## VÉRIFICATION POST-FIX

Après les FIX 1-3 :
1. `npx tsc --noEmit` → 0 erreurs
2. `npm run build` → succès
3. `npm run test:unit` → 264+ tests verts
4. `npm run lint` → 0 errors
5. Relance `node scripts/audit-sheets-data-integrity.mjs`
6. Vérifie le Dashboard :
   - **17 truies** (7 Pleine · 4 En maternité · 4 En attente saillie · 1 À surveiller)
   - **2 verrats** actifs
   - **14 bandes** (ligne RECAP filtrée)
   - **5 stocks aliment en rupture** (noms corrects : Maïs grain, etc.)
   - **7 produits véto** (pas 85)
   - **0 fausses alertes mortalité 100%**

---

## PRÉPARATION SKILLS DESIGN (après fixes)

1. **Cherche et charge `mcp-magic-21`** — installé dans le projet. Lis son SKILL.md.
2. **Cherche et charge `UI/UX Pro Max`** — dans `.claude/skills/ui-ux-pro-max-skill/SKILL.md`.
3. **Prépare pour usage immédiat** — confirme quand prêts avec résumé capacités.

---

## LOGIQUE MÉTIER — NAISSEUR-ENGRAISSEUR

### Cycle de Production

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
                                                      VENTE / ABATTOIR (2000-2200 FCFA/kg)
```

### Constantes Ferme K13

```
MATERNITE_LOGES: 9 · POST_SEVRAGE_LOGES: 4 · ENGRAISSEMENT_LOGES: 2
POST_SEVRAGE_DUREE: 70j · Objectifs: NV/portée 12, MB/truie/an 2.2, Mortalité <10%
Prix: 2000-2200 FCFA/kg vif, porcelet sevré 25000 FCFA
```

### Numérotation inter-sheets (RÉSOLU — référence)

| REPRODUCTION/MATERNITE | TRUIES (source app) | Boucle | Nom |
|------------------------|---------------------|--------|-----|
| T7 | T07 | B.21 | Choupette |
| T8 | T09 | B.31 | Zapata |
| T9 | T10 | B.37 | — |
| T14 (MATERNITE) | T15 | B.39 | Anillette |
| T15 (MATERNITE) | T16 | B.26 | Pirouette |
| T16 (REPRO) | T18 | B.85 | — |
| T17 (boucle 86) | ❌ Absent | — | À vérifier terrain |

**L'app utilise SUIVI_TRUIES_REPRODUCTION comme source de vérité. Les IDs REPRODUCTION/MATERNITE sont informatifs uniquement.**

### Données Google Sheets (backend)

| Clé lecture | Onglet écriture | État |
|-------------|-----------------|------|
| SUIVI_TRUIES_REPRODUCTION | TRUIES_REPRODUCTION | ✅ 17 truies, statuts à jour |
| PORCELETS_BANDES_DETAIL | PORCELETS_BANDES | ✅ 14 portées + 1 RECAP (à filtrer) |
| VERRATS | VERRATS | ✅ 2 verrats |
| STOCK_ALIMENTS | STOCK_ALIMENTS | ✅ mapper corrigé, 5 produits à 0 |
| STOCK_VETO | STOCK_VETO | 🔴 85 lignes → filtrer à 7 |
| JOURNAL_SANTE | SANTE | ✅ mapper positionnel, 2 entrées |
| ALERTES_ACTIVES | ALERTES_ACTIVES | 🔴 bug mortalité 100% |

**RAPPEL : `read_table_by_key` = clé TABLES_INDEX · `update_row_by_id` = nom onglet réel · GAS POST → `fetch()` avec `redirect: 'follow'`**

---

## DESIGN SYSTEM — AGRITECH

### Principes Emil Kowalski
- Easing : `cubic-bezier(0.23, 1, 0.32, 1)` — jamais ease-in
- Active : `scale(0.97)` en 160ms sur tout pressable
- Stagger : 50ms entre items · Entrées : `scale(0.98) + translateY(8px)` < 300ms
- `prefers-reduced-motion` respecté

### UI/UX Pro Max
- Contraste 4.5:1 (7:1 terrain soleil) · Touch 44×44px min · Skeleton loading
- BigShoulders titres · DMMono IDs/codes · BricolageGrotesque valeurs
- Lucide React SVG uniquement · Bottom nav AgritechNav

### Palette

```css
--accent: #059669  --accent-dim: #064E3B  --amber: #F4A261
--bg-app: #FFFFFF  --text-primary: #111827  --text-muted: #6B7280
--danger: #EF4444  --warning: #D97706  --info: #3B82F6
```

### Composants agritech

```tsx
import { KpiCard, HubTile, DataRow, Chip, SectionDivider } from '../components/agritech';
import AgritechHeader from '../components/AgritechHeader';
import AgritechLayout from '../components/AgritechLayout';
import AgritechNav from '../components/AgritechNav';
```

---

## CONVENTIONS & ANTI-PATTERNS

```
❌ -mt-10                          → ✅ children slot dans AgritechHeader
❌ style={{ color }}               → ✅ Tailwind classes
❌ transition-all / ease-in        → ✅ transition-transform + cubic-bezier
❌ font-family inline              → ✅ .ft-heading, .ft-code, .ft-values
❌ Texte anglais                   → ✅ Tout en français
❌ emoji icône                     → ✅ Lucide React SVG
❌ localStorage state              → ✅ useFarm() FarmContext
❌ status (sans accent)            → ✅ statut (accent)
❌ curl pour GAS                   → ✅ fetch() redirect: 'follow'
❌ === 'Sevrée'                    → ✅ .toLowerCase().includes('sevr')
❌ === 'Pleine'                    → ✅ .toLowerCase().includes('pleine') || .includes('gest')
```

### Pièges connus
- `status` vs `statut` : objets agrégés ≠ FarmContext
- Mapper colonnes variantes : `findIdx()` avec plusieurs noms
- STOCK_VETO headers = `LIBELLE`, `STOCK_ACTUEL`, `STOCK_MIN`, `ALERTE_STOCK_BAS` (pas NOM/QUANTITE/ALERTE)
- Ligne RECAP dans bandes : ID commence par "TOTAL" → filtrer

---

## COMMANDES

```bash
npm run dev · npx tsc --noEmit · npm run build · npm run test:unit · npm run lint
npx cap sync android && npx cap run android
node scripts/audit-sheets-data-integrity.mjs [--fix]
```

---

## ORDRE D'EXÉCUTION

### ÉTAPE 1 — FIXES RESTANTS (3 actions)

1. **FIX 1** : Filtrer STOCK_VETO (mapper + filtre lignes sans nom) + ajouter variantes colonnes `mapStockVeto`
2. **FIX 2** : Filtrer ligne RECAP bandes (filtre ID startsWith TOTAL)
3. **FIX 3** : Bug alertEngine mortalité 100% (R4 — timestamps vs morts/nv)
4. Vérifier build + tests

### ÉTAPE 2 — CHARGER SKILLS DESIGN

Charger `mcp-magic-21` + `UI/UX Pro Max`. Confirmer prêts.

### ÉTAPE 3 — AGENTS PARALLÈLES SPRINT 5

**AGENT 1 — TROUPEAU** : Enrichir TroupeauHub (pipeline 7 pleine / 4 maternité / 4 attente / 1 surveillée) + TruiesListView actions inline. Agritech + Emil Kowalski.

**AGENT 2 — CYCLES** : Refaire CyclesHub pipeline complet + créer FinitionView + route `/cycles/finition`. Utiliser `bandesAggregator`.

**AGENT 3 — RESSOURCES** : RessourcesHub alertes RUPTURE + créer PharmacieView (7 produits véto filtrés) + route `/ressources/pharmacie`.

**AGENT 4 — QA** : tsc + build + tests + lint + audit Emil + routes App.tsx + SESSION_MEMORY.md + LEARNINGS.md.

---

## RÉSUMÉ

| # | Tâche | Statut |
|---|-------|--------|
| Statuts 5 truies saillies 05/04 | ✅ Fait (Pleine, MB 28/07) |
| Renommage 3 portées | ✅ Fait |
| Mapper STOCK_ALIMENTS | ✅ Fait (LIBELLE, STOCK_ACTUEL) |
| Mapper JOURNAL_SANTE | ✅ Fait (positionnel) |
| ESLint 0 err/warn | ✅ Fait |
| Bug BandeCroissanceCard | ✅ Fait |
| Filtrer STOCK_VETO + mapper variantes | 🔴 À FAIRE |
| Filtrer RECAP bandes | 🔴 À FAIRE |
| Bug alertEngine mortalité 100% | 🔴 À FAIRE |
| Charger mcp-magic-21 + UI/UX Pro Max | 🟡 À FAIRE |
| Sprint 5 (Troupeau/Cycles/Ressources) | 🟡 Après fixes |
