# Schéma Google Sheets — PorcTrack 8 (source de vérité)

> Documentation canonique des schémas Google Sheets consommés par l'app PorcTrack 8.
> Générée à partir des mappers réels (`src/mappers/index.ts`) + snapshot vérifié
> (`scripts/data-broker/snapshot-2026-04-20.json`) + ground truth terrain
> (`scripts/data-broker/ground-truth-2026-04-20.md`).
>
> **Mise à jour** : 2026-04-19 — ferme K13 (alias historique A130)
>
> Toute variante documentée ici est **réellement acceptée** par `findIdx()` dans
> le mapper. Ne JAMAIS ajouter un nom de colonne à ce doc sans avoir d'abord
> étendu le mapper correspondant.

---

## Table des matières

1. [Conventions & règles globales](#conventions--règles-globales)
2. [SUIVI_TRUIES_REPRODUCTION](#1-suivi_truies_reproduction-truies)
3. [VERRATS](#2-verrats)
4. [PORCELETS_BANDES_DETAIL](#3-porcelets_bandes_detail-portées)
5. [JOURNAL_SANTE](#4-journal_sante-santé)
6. [STOCK_ALIMENTS](#5-stock_aliments)
7. [STOCK_VETO](#6-stock_veto)
8. [NOTES_TERRAIN](#7-notes_terrain)
9. [FINANCES](#8-finances)
10. [SUIVI_REPRODUCTION_ACTUEL](#9-suivi_reproduction_actuel-saillies)
11. [ALERTES_ACTIVES](#10-alertes_actives)
12. [Annexe A — Alias `sheetName` → `tableKey`](#annexe-a--alias-sheetname--tablekey)
13. [Annexe B — Truies archivées](#annexe-b--truies-archivées-t08-t17)
14. [Annexe C — Variants `findIdx`](#annexe-c--comment-findidx-matche-les-variantes)

---

## Conventions & règles globales

### Structure des feuilles
- **Header row obligatoire en ligne 1** (sauf PROTOCOLES — row 2).
- **UTF-8 strict**, pas de BOM, pas de double-encoding.
- **Pas de cellules mergées** : casse la lecture par `values.get`.
- **Pas de formules de calcul visibles** dans les colonnes de données — uniquement
  des valeurs atomiques. Les agrégats RECAP/TOTAL sont filtrés par `mapTable`.

### Formats acceptés

| Champ | Formats acceptés | Format canonique |
|-------|------------------|------------------|
| Date  | `dd/MM/yyyy` · `yyyy-MM-dd` · ISO 8601 · serial number Sheets (20000–60000) | `dd/MM/yyyy` (retour `parseSheetDate`) |
| Nombre | entier, flottant, string avec `,` ou `.` | `number` |
| Montant | `125000`, `125 000 FCFA`, `125,5` → nettoyé via regex `[^\d.,-]` | `number` absolu (signe porté par `TYPE`) |
| Booléen | `TRUE` / `FALSE` / `1` / `0` | `boolean` |
| Enum | casse libre (UPPERCASE normalisé côté mapper) | UPPERCASE |

### Case-insensitive + accents
`findIdx()` (mapper) :
1. `toUpperCase()` sur header ET sur chaque variante testée.
2. Cherche d'abord un match **exact**, sinon un match **partial** (includes).
3. Les accents (`ÉÀÈÔÛÎ`) passent tels quels après `.toUpperCase()`. Pour matcher
   une colonne accentuée, la variante accentuée ET la version sans accent sont
   fournies en fallback.

### IDs stables
- **Jamais réécrire un ID** après création (les bandes, portées, alertes
  référencent des IDs par string — réécriture = perte de traçabilité).
- Format truies : `T##` (zéro-paddé), verrats : `V##`, portées : `YY-T<n>-<k>`.

### Actions autorisées
Chaque table liste : `READ` (lecture UI) · `UPDATE` (patch ligne existante) ·
`APPEND` (ajout ligne) · `DELETE` (rare — préférer flag archivé).

### Truies archivées
`T08` et `T17` sont **réformées** — absentes de `SUIVI_TRUIES_REPRODUCTION` mais
encore présentes dans l'historique (`SUIVI_REPRODUCTION_ACTUEL`, dérivées).
Helpers : `isArchivedTruie()` / `ARCHIVED_TRUIE_IDS` dans
[`src/lib/truieHelpers.ts`](../src/lib/truieHelpers.ts).

### Source de vérité
Si divergence feuille ↔ terrain, **le terrain gagne** (voir ground truth). Les
corrections passent par l'UI (qui ré-écrit la Sheet), jamais par édition
directe de la Sheet en production (sauf opérations documentées).

---

## 1. SUIVI_TRUIES_REPRODUCTION (TRUIES)

**Objet** : inventaire des truies reproductrices actives (17 truies avril 2026).
Clé canonique dans TABLES_INDEX : `SUIVI_TRUIES_REPRODUCTION`. Alias
`sheetName` acceptés : `TRUIES_REPRODUCTION`, `SUIVI_TRUIES_REPRODUCTION`.

**Actions** : READ · UPDATE · APPEND (nouvelles truies)

| Colonne canonique (UPPERCASE) | Type | Obl. | Variantes acceptées par `findIdx` |
|-------------------------------|------|:---:|-----------------------------------|
| `ID` | string `T##` | ✅ | `ID`, `ID_TRUIE` |
| `BOUCLE` | string (ex. `B.22`) | ✅ | `BOUCLE` |
| `NOM` | string | ⭕ | `NOM` |
| `STATUT` | enum | ✅ | `STATUT`, `ETAT` |
| `STADE` | enum | ⭕ | `STADE` |
| `RATION KG/J` | number | ⭕ | `RATION KG/J`, `RATION` |
| `NB PORTÉES` | int | ⭕ | `NB PORTÉES`, `NB PORTEES`, `NB_PORTEES`, `PORTÉES`, `PORTEES` |
| `DERNIÈRE PORTÉE NV` | float | ⭕ | `DERNIÈRE PORTÉE NV`, `DERNIERE PORTEE NV`, `DERNIERE_NV`, `DERNIÈRE NV`, `DERNIERE NV`, `MOY_NV`, `NV_MOYEN` |
| `DATE MB PRÉVUE` | date | ⭕ | `DATE MB PRÉVUE`, `DATE MB PREVUE`, `DATE_MB_PREVUE`, `PROCHAINE MB`, `PROCHAINE_MB` |
| `NOTES` | string | ⭕ | `NOTES` |

### Enums

- **`STATUT`** (tolérant `string` en fallback) :
  `En attente saillie` · `Pleine` · `En maternité` · `À surveiller`
  *Legacy remappés côté alertEngine* : `Gestante` → `Pleine`,
  `Allaitante` → `En maternité`, `Vide` → `En attente saillie`,
  `Observation` → `À surveiller`, `Flushing` → **supprimé**.

- **`STADE`** : `Gestation` · `Lactation` · `Sevrée` · `Surveillance` · libre.

### Exemples

| ID | BOUCLE | NOM | STATUT | STADE | RATION | NB_PORTEES | DERNIERE_NV | DATE_MB_PREVUE |
|----|--------|-----|--------|-------|--------|------------|-------------|----------------|
| T01 | B.22 | Monette | En attente saillie | Sevrée | 6 | 1 | 11 | — |
| T05 | B.20 | — | Pleine | Gestation | 3 | 0 | 0 | 11/07/2026 |
| T12 | B.10 | — | Pleine | Gestation | 3 | 0 | 0 | 06/05/2026 |
| T18 | B.85 | — | En maternité | Lactation | 6 | 1 | 12 | 28/03/2026 |

### Règles de validation
- `ID` match `/^T\d{1,2}$/i` (normalisé `T##` par `normalizeTruieId`).
- `BOUCLE` ≠ vide pour toute truie active.
- `RATION KG/J` ∈ `[0, 15]` (réalité ferme : 3–7 kg/j).
- `DATE MB PRÉVUE` postérieure à aujourd'hui tant que la truie est `Pleine`.
- `NB PORTÉES` ≥ 0.

---

## 2. VERRATS

**Objet** : inventaire des verrats reproducteurs (2 verrats K13 : V01 Bobi, V02 Aligator).
Clé TABLES_INDEX : `VERRATS`. **Actions** : READ · UPDATE · APPEND.

| Colonne canonique | Type | Obl. | Variantes acceptées |
|-------------------|------|:---:|--------------------|
| `ID` | string `V##` | ✅ | `ID`, `ID_VERRAT` |
| `BOUCLE` | string | ⭕ | `BOUCLE` |
| `NOM` | string | ⭕ | `NOM` |
| `STATUT` | enum | ✅ | `STATUT`, `ETAT` |
| `ORIGINE` | string | ⭕ | `ORIGINE` |
| `ALIMENTATION` | string (libre — ex. `Gestation (KPC)`) | ⭕ | `ALIMENTATION` |
| `RATION KG/J` | number | ⭕ | `RATION KG/J`, `RATION` |
| `NOTES` | string | ⭕ | `NOTES` |

### Enums
- **`STATUT`** : `Actif` (futur : `Réforme`, `Mort`).

### Exemples

| ID | NOM | STATUT | ORIGINE | ALIMENTATION | RATION |
|----|-----|--------|---------|--------------|--------|
| V01 | Bobi | Actif | Thomasset | — | 3.0 |
| V02 | Aligator | Actif | Azaguie | — | 2.5 |

### Règles de validation
- `ID` match `/^V\d{1,2}$/i`.
- `RATION KG/J` ∈ `[0, 10]`.

---

## 3. PORCELETS_BANDES_DETAIL (PORTÉES)

**Objet** : une ligne = une portée (bande de porcelets). Cycle :
`Sous mère` → `Sevrés` → séparation M/F → engraissement → vente.
Clé TABLES_INDEX : `PORCELETS_BANDES_DETAIL`. Alias `sheetName` :
`PORCELETS_BANDES`, `PORCELETS_BANDES_DETAIL`.

**Actions** : READ · UPDATE · APPEND (naissances) · DELETE (rare).

### Filtrage par `mapTable`
- Lignes avec `STATUT === 'RECAP'` → filtrées (agrégat Sheets).
- Lignes avec `ID` commençant par `TOTAL` → filtrées.

| Colonne canonique | Type | Obl. | Variantes acceptées |
|-------------------|------|:---:|--------------------|
| `ID PORTÉE` | string | ✅ | `ID PORTÉE`, `ID PORTEE`, `ID_PORTEE`, `ID` |
| `TRUIE` | string (FK vers TRUIES.ID) | ⭕ | `TRUIE` |
| `BOUCLE MÈRE` | string | ⭕ | `BOUCLE MÈRE`, `BOUCLE MERE`, `BOUCLE_MERE` |
| `DATE MB` | date | ⭕ | `DATE MB`, `DATE_MB` |
| `NV` | int | ⭕ | `NV` |
| `MORTS` | int | ⭕ | `MORTS` |
| `VIVANTS` | int | ⭕ | `VIVANTS` |
| `STATUT` | enum | ✅ | `STATUT` |
| `SEVRAGE PRÉVU` | date | ⭕ | `SEVRAGE PRÉVU`, `SEVRAGE PREVU`, `DATE SEVRAGE PRÉVUE`, `SEVRAGE_PREVUE` |
| `SEVRAGE RÉEL` | date | ⭕ | `SEVRAGE RÉEL`, `SEVRAGE REEL`, `DATE SEVRAGE RÉELLE`, `SEVRAGE_REELLE` |
| `NB_MALES` | int | ⭕ | `NB_MALES`, `NB MALES`, `NBMALES`, `MÂLES`, `MALES` |
| `NB_FEMELLES` | int | ⭕ | `NB_FEMELLES`, `NB FEMELLES`, `NBFEMELLES`, `FEMELLES` |
| `LOGE_ENG` | enum `M`/`F` | ⭕ | `LOGE_ENG`, `LOGE ENGRAISSEMENT`, `LOGEENGRAISSEMENT`, `LOGE` |
| `DATE_SEPARATION` | date | ⭕ | `DATE_SEPARATION`, `DATE SEPARATION`, `DATESEPARATION`, `SEPARATION` |
| `NOTES` | string | ⭕ | `NOTES` |

### Enums
- **`STATUT`** : `Sous mère` · `Sevrés` · `RECAP` (filtré) · libre.
- **`LOGE_ENG`** (normalisation par mapper) :
  - `M` · `MÂLE*` · `MALE*` → `'M'`
  - `F` · `FEMELLE*` → `'F'`
  - vide/autre → `undefined`

### Exemples

| ID PORTÉE | TRUIE | BOUCLE_MERE | DATE_MB | NV | MORTS | VIVANTS | STATUT | SEVRAGE_PREVU |
|-----------|-------|-------------|---------|----|-------|---------|--------|---------------|
| 26-T1-01 | T01 | B.22 | — | 11 | 1 | 10 | Sevrés | — |
| 26-T18-01 | T18 | B.85 | 28/03/2026 | 12 | 0 | 12 | Sous mère | 18/04/2026 |
| 26-T14-02 | T14 | B.24 | 01/04/2026 | 13 | 0 | 13 | Sous mère | 22/04/2026 |

### Règles de validation
- `ID PORTÉE` match `YY-T<n>-<k>` (ex. `26-T18-01`).
- `VIVANTS == NV - MORTS` (invariant).
- `SEVRAGE PRÉVU ≈ DATE MB + 21 jours` (règle GTTT).
- `DATE_SEPARATION ≈ SEVRAGE + 70 jours` si renseignée.
- Mortalité alerte si `MORTS / NV > 15%` (règle R4 alertEngine).

---

## 4. JOURNAL_SANTE (SANTÉ)

**Objet** : historique des soins, traitements, vaccinations, déparasitages.
Clé TABLES_INDEX : `JOURNAL_SANTE`. Alias `sheetName` : `SANTE`, `JOURNAL_SANTE`.

**Actions** : READ · APPEND (append-only strict — pas d'UPDATE, pas de DELETE).

| Colonne canonique | Type | Obl. | Variantes acceptées |
|-------------------|------|:---:|--------------------|
| `DATE` | date | ✅ | `DATE` |
| `CIBLE_TYPE` | enum | ✅ | `CIBLE_TYPE`, `SUJET_TYPE`, `TYPE` |
| `CIBLE_ID` | string (FK) | ✅ | `CIBLE_ID`, `SUJET_ID`, `ID`, `BOUCLE` |
| `TYPE_SOIN` | enum | ✅ | `TYPE_SOIN`, `TYPE` |
| `TRAITEMENT` | string (produit) | ✅ | `TRAITEMENT`, `SOIN`, `PRODUIT` |
| `OBSERVATION` | string | ⭕ | `OBSERVATION`, `NOTE`, `NOTES` |
| `AUTEUR` | string | ⭕ | `AUTEUR`, `USER` |

### Enums
- **`CIBLE_TYPE`** (UPPERCASE par mapper) : `TRUIE` · `VERRAT` · `BANDE` · `GENERAL`.
- **`TYPE_SOIN`** : `Vaccination` · `Traitement curatif` · `Déparasitage` · `Complément` · `Obstétrique` · `Autre`.

### Règles de validation
- `DATE` ≤ aujourd'hui (pas de soin futur).
- `CIBLE_ID` doit exister dans la table correspondant à `CIBLE_TYPE`
  (TRUIE → `SUIVI_TRUIES_REPRODUCTION.ID`, etc.). Si `GENERAL`, peut être vide.
- `TRAITEMENT` idéalement référence `STOCK_VETO.LIBELLÉ`.

### Note
L'ID de l'entrée est généré côté mapper (`health-<date>-<cibleId>-<rnd>`) —
pas de colonne `ID` requise dans la Sheet, même si GAS en ajoute une
(`SANTE-YYYYMMDD-NNNN`).

---

## 5. STOCK_ALIMENTS

**Objet** : inventaire des aliments et matières premières. 5 lignes K13.
Clé TABLES_INDEX : `STOCK_ALIMENTS`. **Actions** : READ · UPDATE.

### Filtrage par `mapTable`
- Lignes sans `LIBELLÉ` (trim vide) → filtrées (squelettes).

| Colonne canonique | Type | Obl. | Variantes acceptées |
|-------------------|------|:---:|--------------------|
| `ID` | string | ⭕ | `ID` |
| `LIBELLÉ` | string | ✅ | `LIBELLÉ`, `LIBELLE`, `NOM`, `ALIMENT` |
| `STOCK ACTUEL` | number | ✅ | `STOCK ACTUEL`, `STOCK_ACTUEL`, `QUANTITE` |
| `UNITÉ` | string | ⭕ (default `kg`) | `UNITÉ`, `UNITE` |
| `SEUIL ALERTE` | number | ✅ | `SEUIL ALERTE`, `SEUIL_ALERTE`, `ALERTE` |
| `STATUT` | enum | ✅ (default `OK`) | `STATUT` |
| `NOTES` | string | ⭕ | `NOTES` |

### Enums
- **`STATUT`** : `OK` · `BAS` · `RUPTURE` (tolérant `string`).
  La valeur de la Sheet est **trust** par le mapper — pas de recalcul côté
  client.

### Exemples

| LIBELLÉ | STOCK_ACTUEL | UNITÉ | SEUIL_ALERTE | STATUT |
|---------|--------------|-------|--------------|--------|
| Maïs grain | 0 | kg | 500 | RUPTURE |
| Aliment truie gestation | 0 | kg | 200 | RUPTURE |
| Aliment porcelet démarrage | 0 | kg | 100 | RUPTURE |

### Règles de validation
- `STOCK ACTUEL` ≥ 0.
- `SEUIL ALERTE` > 0.
- Cohérence attendue (pas imposée) : `STOCK == 0` → `RUPTURE` ;
  `STOCK < SEUIL` → `BAS` ; sinon `OK`.

---

## 6. STOCK_VETO

**Objet** : inventaire des produits vétérinaires (7 lignes K13).
Clé TABLES_INDEX : `STOCK_VETO`. **Actions** : READ · UPDATE.

### Filtrage par `mapTable`
- Lignes sans `PRODUIT` (trim vide) → filtrées (85 squelettes → 7 réels).

| Colonne canonique | Type | Obl. | Variantes acceptées |
|-------------------|------|:---:|--------------------|
| `ID` | string | ⭕ | `ID` |
| `LIBELLÉ` (alias PRODUIT) | string | ✅ | `LIBELLÉ`, `LIBELLE`, `PRODUIT`, `NOM` |
| `TYPE` | string | ⭕ | `TYPE` |
| `USAGE` | string | ⭕ | `USAGE` |
| `STOCK_ACTUEL` | number | ✅ | `STOCK_ACTUEL`, `STOCK ACTUEL`, `STOCK` |
| `UNITÉ` | string | ⭕ (default `ml`) | `UNITÉ`, `UNITE` |
| `STOCK_MIN` | number | ⭕ | `STOCK_MIN`, `STOCK MIN` |
| `ALERTE_STOCK_BAS` (seuil) | number | ⭕ | `ALERTE_STOCK_BAS`, `SEUIL ALERTE`, `SEUIL_ALERTE`, `ALERTE` |
| `STATUT` | enum | ⭕ (default `OK`) | `STATUT` |
| `NOTES` | string | ⭕ | `NOTES` |

### Enums
- **`TYPE`** (libre) : `Antibiotique` · `Antiparasitaire` · `Vitamines` ·
  `Minéral` · `Digestif` · `Hygiène` · …
- **`USAGE`** (libre) : `Porcelets`, `Truies gestantes`, `Curatif bactérien`, …
- **`STATUT`** : `OK` · `BAS` · `RUPTURE`.

### Exemples

| PRODUIT | TYPE | USAGE | STOCK_ACTUEL | UNITÉ | STATUT |
|---------|------|-------|--------------|-------|--------|
| Fer injectable | Minéral | Porcelets | 0 | ml | RUPTURE |
| Oxytétracycline | Antibiotique | Curatif bactérien | 3 | flac. | BAS |
| Vitamines AD3E | Vitamines | Support général | 8 | flac. | OK |

---

## 7. NOTES_TERRAIN

**Objet** : journal des notes terrain (observations ponctuelles, checklist
quotidienne, point hebdo). Clé TABLES_INDEX : `NOTES_TERRAIN`.

**Actions** : READ · APPEND (append-only).

### Schéma positionnel (5 colonnes)

Le mapper `mapRowToNote` lit par **position** (pas par header), les 5 premières colonnes :

| Position | Colonne canonique | Type | Obl. | Description |
|:--------:|-------------------|------|:---:|-------------|
| 0 | `DATE` | date | ✅ | `dd/MM/yyyy` |
| 1 | `TYPE_ANIMAL` | enum | ✅ | Voir enum ci-dessous |
| 2 | `ID_ANIMAL` | string | ⭕ | ID truie/verrat/bande selon `TYPE_ANIMAL` |
| 3 | `NOTE` | string | ✅ | Texte libre |
| 4 | `AUTEUR` | string | ⭕ | Nom porcher / ADMIN / autre |

### Enum `TYPE_ANIMAL` (normalisation par mapper)

Types canoniques : `TRUIE` · `VERRAT` · `BANDE` · `CONTROLE` · `CHECKLIST` · `GENERAL`.

Legacy remappés (avec `logger.warn`) :
- `CONTROLE_QUOTIDIEN` → `CONTROLE`
- `CHECKLIST_DONE`, `POINT_HEBDO_AUTO` → `GENERAL`
- Type inconnu → `GENERAL`

### Compat legacy 11-colonnes
Si `row.length >= 11 && row[0].startsWith('NOTE-')` — ancien format
`[NOTE_ID, ISO, DATE_FR, TIME, PORCHER, TYPE, QUESTION, ANSWER, DETAILS, SOURCE, DEVICE]`
— le mapper reconstruit best-effort :
- `date` ← row[1] (ISO) ou row[2] (FR)
- `animalType` ← row[5] (normalisé)
- `animalId` ← row[6]
- `texte` ← `row[7]` (answer) + `row[8]` (details)
- `auteur` ← row[4] (porcher)

### Filtrage
- Row vide ou sans `DATE` ET sans `TYPE` → `null` (filtré).

### Exemples

| DATE | TYPE_ANIMAL | ID_ANIMAL | NOTE | AUTEUR |
|------|-------------|-----------|------|--------|
| 19/04/2026 | TRUIE | T04 | Refus allaitement ce matin | PORCHER |
| 19/04/2026 | BANDE | 26-T6-01 | 2 morts porcelets | PORCHER |
| 19/04/2026 | CONTROLE | — | Checklist quotidienne OK | PORCHER |

---

## 8. FINANCES

**Objet** : journal comptable (charges fixes, charges variables, recettes).
Clé TABLES_INDEX : `FINANCES`. **Actions** : READ · APPEND.

### Filtrage par mapper
Row filtrée (retour `null`) si : pas de `DATE` ET pas de `LIBELLÉ` ET `montant === 0`.

| Colonne canonique | Type | Obl. | Variantes acceptées |
|-------------------|------|:---:|--------------------|
| `DATE` | date | ⭕ | `DATE`, `PERIODE`, `PÉRIODE` |
| `CATEGORIE` | string | ⭕ (default `DIVERS`) | `CATEGORIE`, `CATÉGORIE`, `CAT` |
| `LIBELLE` | string | ✅ | `LIBELLE`, `LIBELLÉ`, `DESCRIPTION`, `INTITULE`, `INTITULÉ` |
| `MONTANT` | number | ✅ | `MONTANT`, `MONTANT FCFA`, `MONTANT (FCFA)`, `PRIX` |
| `TYPE` | enum | ⭕ (default `DEPENSE`) | `TYPE`, `NATURE` |
| `NOTES` | string | ⭕ | `NOTES`, `NOTE`, `REMARQUE` |

### Enum `TYPE` (détection par mot-clé)
Le mapper normalise en `REVENU` ou `DEPENSE` :
- Contient `REV` / `VENTE` / `INCOME` → `REVENU`
- Contient `DEP` / `CHARGE` / `EXPENSE` → `DEPENSE`
- Autre / vide → `DEPENSE` (hypothèse conservative)

### Normalisation `MONTANT`
- Regex nettoyage : `/[^\d.,-]/g` (retire `FCFA`, espaces, etc.).
- Virgule → point décimal.
- **Toujours stocké en valeur absolue** (signe porté par `TYPE`).

### Exemples

| DATE | CATEGORIE | LIBELLE | MONTANT | TYPE |
|------|-----------|---------|---------|------|
| — | Charge fixe | Salaires porcher | 120000 | DEPENSE |
| — | Charge var. | Achat maïs | 250000 | DEPENSE |
| — | Recette | Vente porcs finis (x8) | 1440000 | REVENU |

### Note sur `BANDE_ID`
Le snapshot mentionne un champ `bandeId` (corrélation portée ↔ recette), mais
**le mapper actuel ne le lit pas**. S'il doit être ajouté : étendre
`mapFinance` avec `findIdx(header, 'BANDE_ID', 'ID_BANDE', 'BANDE')`.

---

## 9. SUIVI_REPRODUCTION_ACTUEL (SAILLIES)

**Objet** : saillies actives (couple truie × verrat + date prévue de MB).
Permet de relier un verrat aux portées qu'il a engendrées via match date MB.
Clé TABLES_INDEX : `SUIVI_REPRODUCTION_ACTUEL`.

**Actions** : READ · APPEND · UPDATE (statut).

| Colonne canonique | Type | Obl. | Variantes acceptées |
|-------------------|------|:---:|--------------------|
| `ID TRUIE` | string (FK) | ✅ | `ID TRUIE`, `ID_TRUIE`, `TRUIE` |
| `BOUCLE` | string (snapshot truie) | ⭕ | `BOUCLE` |
| `NOM` | string (snapshot truie) | ⭕ | `NOM` |
| `DATE SAILLIE` | date | ✅ | `DATE SAILLIE`, `DATE_SAILLIE` |
| `VERRAT` | string (FK) | ✅ | `VERRAT` |
| `DATE MB PRÉVUE` | date | ⭕ | `DATE MB PRÉVUE`, `DATE MB PREVUE`, `DATE_MB_PREVUE` |
| `STATUT` | enum | ⭕ | `STATUT` |
| `NOTES` | string | ⭕ | `NOTES` |

### Enums
- **`STATUT`** (libre — valeurs rencontrées) : `CONFIRMEE` · `EN_ATTENTE` ·
  `ECHEC` · autre.

### Règles de validation
- `DATE MB PRÉVUE ≈ DATE SAILLIE + 115 jours` (gestation porcine).
- `VERRAT` doit exister dans `VERRATS.ID`.
- `ID TRUIE` peut contenir des IDs archivés (T08, T17) — **ne pas rejeter**,
  utiliser `isArchivedTruie()`.

### Exemple

| ID TRUIE | BOUCLE | NOM | DATE SAILLIE | VERRAT | DATE MB PRÉVUE | STATUT |
|----------|--------|-----|--------------|--------|----------------|--------|
| T07 | B.21 | Choupette | 05/04/2026 | V01 | 28/07/2026 | CONFIRMEE |
| T12 | B.10 | — | 11/01/2026 | V02 | 06/05/2026 | CONFIRMEE |

---

## 10. ALERTES_ACTIVES

**Objet** : alertes émises par le **backend GAS** (script Google Apps Script).
Distincte du moteur local `alertEngine.ts` — les deux coexistent dans l'UI.
Clé TABLES_INDEX : `ALERTES_ACTIVES`. **Actions** : READ (pour l'app).

### Filtrage par mapper
- Rows "fantômes" (bug GAS connu) : description matchant
  `/mortalit[eé]\s*(?:\w+\s*)?:\s*100\s*%.*\(\d{10,}\s*\/.*GMT/i`
  (timestamps Unix interprétés comme morts/nv=100%) → filtrées.

| Colonne canonique | Type | Obl. | Variantes acceptées |
|-------------------|------|:---:|--------------------|
| `PRIORITÉ` | enum | ✅ | `PRIORITÉ`, `PRIORITE`, `PRIO` |
| `CATÉGORIE` | enum | ⭕ (default `BANDES`) | `CATÉGORIE`, `CATEGORIE`, `CAT` |
| `SUJET` | string | ✅ | `SUJET` |
| `ALERTE` | string (description) | ✅ | `ALERTE`, `DESCRIPTION`, `DÉTAIL`, `DETAIL` |
| `ACTION REQUISE` | string | ⭕ | `ACTION REQUISE`, `ACTION_REQUISE`, `ACTION` |
| `DATE` | date | ✅ | `DATE` |

### Enums
- **`PRIORITÉ`** (UPPERCASE trim par mapper, fallback `NORMALE`) :
  `CRITIQUE` · `HAUTE` · `NORMALE` · `INFO`.
- **`CATÉGORIE`** (UPPERCASE trim, default `BANDES`) :
  `BANDES` · `REPRO` · `STOCK` (tolérant `string`).

### Exemple

| PRIORITÉ | CATÉGORIE | SUJET | ALERTE | DATE |
|----------|-----------|-------|--------|------|
| HAUTE | BANDES | 26-T18-01 | Sevrage imminent | 18/04/2026 |
| CRITIQUE | STOCK | ALIM-MAIS | Stock à 0 | 19/04/2026 |

### Note qualité
Bug connu côté GAS sur la règle R4 (mortalité) : 10/12 alertes du snapshot
2026-04-20 sont des **faux positifs**. Le moteur local `alertEngine.ts`
réimplémente la règle correctement — préférer ses résultats pour l'UI.

---

## Annexe A — Alias `sheetName` → `tableKey`

Mapping défini dans `src/services/googleSheets.ts` (`SHEET_TO_KEYS`) — permet
d'invalider le bon cache Preferences après une écriture.

| `sheetName` (Google Sheets) | `tableKey` (TABLES_INDEX) |
|-----------------------------|--------------------------|
| `TRUIES_REPRODUCTION` | `SUIVI_TRUIES_REPRODUCTION` |
| `SUIVI_TRUIES_REPRODUCTION` | `SUIVI_TRUIES_REPRODUCTION` |
| `VERRATS` | `VERRATS` |
| `PORCELETS_BANDES` | `PORCELETS_BANDES_DETAIL` |
| `PORCELETS_BANDES_DETAIL` | `PORCELETS_BANDES_DETAIL` |
| `SANTE` | `JOURNAL_SANTE` |
| `JOURNAL_SANTE` | `JOURNAL_SANTE` |
| `STOCK_ALIMENTS` | `STOCK_ALIMENTS` |
| `STOCK_VETO` | `STOCK_VETO` |

Tables sans alias (clé = sheetName) : `SUIVI_REPRODUCTION_ACTUEL`, `FINANCES`,
`ALERTES_ACTIVES`, `NOTES_TERRAIN`, `ALIMENT_FORMULES`.

---

## Annexe B — Truies archivées (T08, T17)

Les IDs `T08` et `T17` sont **réformés** (absents de `SUIVI_TRUIES_REPRODUCTION`)
mais **encore présents** dans l'historique :
- `SUIVI_REPRODUCTION_ACTUEL` (anciennes saillies)
- `PORCELETS_BANDES_DETAIL` (anciennes portées)
- `JOURNAL_SANTE` (anciens soins)

Ce n'est **pas un bug** — c'est l'historique repro normal d'une exploitation
qui réforme ses truies. Le code doit :
- Ne **pas** logger d'erreur en rencontrant ces IDs.
- Utiliser `isArchivedTruie(id)` avant tout warn sur ID orpheline.
- Pour un audit exhaustif : `node scripts/audit-sheets-data-integrity.mjs --include-archived`.

Liste canonique active (17 truies, avril 2026) :
```
T01, T02, T03, T04, T05, T06, T07,
T09, T10, T11, T12, T13, T14, T15, T16,
T18, T19
```

Source : [`src/lib/truieHelpers.ts`](../src/lib/truieHelpers.ts).

---

## Annexe C — Comment `findIdx` matche les variantes

Signature : `findIdx(header: string[], ...variants: string[]) → number`.

Algorithme (voir `src/mappers/index.ts:11`) :
1. Upper-case tout le header : `upperHeader = header.map(h => h.toUpperCase())`.
2. Pour chaque variante dans l'ordre :
   - Upper-case la variante.
   - Cherche un **match exact** via `indexOf`. Si trouvé → retourne l'index.
   - Sinon cherche un **match partial** via `findIndex(h => h.includes(v))`.
     Si trouvé → retourne l'index.
3. Aucune variante ne matche → retourne `-1`.

### Implications

- **Ordre des variantes** : mettre la plus précise en premier. `'NB_PORTEES'`
  AVANT `'PORTEES'` — sinon `NB_PORTEES_MORTES` matcherait partial sur `PORTEES`.
- **Accents** : `.toUpperCase()` ne les retire pas. Pour matcher une colonne
  accentuée, fournir la variante accentuée ET la variante sans accent en
  fallback.
- **Cas pathologique** : une variante courte (ex. `'ID'`) matche partiellement
  toute colonne contenant `ID` (ex. `BANDE_ID`). Dans les mappers où c'est
  ambigu, utiliser une variante plus spécifique (`'ID_TRUIE'`, `'ID_VERRAT'`).

### Checklist pour ajouter une colonne

1. Ajouter la colonne canonique en UPPERCASE dans ce doc.
2. Étendre le mapper correspondant avec `findIdx(header, 'NOM_CANONIQUE', ...variantes)`.
3. Lister TOUTES les variantes observées en prod (accents, underscore, espace,
   singulier/pluriel).
4. Ajouter un test dans `src/mappers/index.test.ts`.
5. Régénérer le snapshot : `node scripts/data-broker/build-snapshot.mjs`.
