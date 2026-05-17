# Audit Google Sheets — PorcTrack 8

Date : 18/04/2026 15:58:09
Déploiement GAS : https://script.google.com/macros/s/***/exec

## 1. Tables indexées (TABLES_INDEX)

| KEY | Sheet | Module | idHeader | Audité |
|---|---|---|---|---|
| `SUIVI_TRUIES_REPRODUCTION` | `TRUIES_REPRODUCTION` | Reproduction | ID | ✓ |
| `PORCELETS_BANDES_DETAIL` | `PORCELETS_BANDES` | Porcelets | ID | ✓ |
| `JOURNAL_SANTE` | `SANTE` | Sante | ID | ✓ |
| `STOCK_ALIMENTS` | `STOCK_ALIMENTS` | Stock | ID | ✓ |
| `STOCK_VETO` | `STOCK_VETO` | Stock | ID | ✓ |
| `SUIVI_REPRODUCTION_ACTUEL` | `REPRODUCTION` | Reproduction | ID | — |
| `CHEPTEL_GENERAL` | `CHEPTEL_GENERAL` | Cheptel | ID | — |
| `CHEPTEL` | `CHEPTEL` | Cheptel | ID | — |
| `MATERNITE` | `MATERNITE` | Maternite | ID | — |
| `POST_SEVRAGE` | `POST_SEVRAGE` | PostSevrage | ID | — |
| `ENGRAISSEMENT` | `ENGRAISSEMENT` | Engraissement | ID | — |
| `ALIMENTATION` | `ALIMENTATION` | Alimentation | ID | — |
| `FINANCES` | `FINANCES` | Finances | ID | — |
| `LIFECYCLE` | `LIFECYCLE` | Lifecycle | ID | — |
| `SAISIE_SEMAINE` | `SAISIE_SEMAINE` | Saisie | ID | — |
| `ALERTES_ACTIVES` | `ALERTES_ACTIVES` | Alertes | ID | — |
| `PARAMETRES` | `PARAMETRES` | Config | KEY | — |
| `VERRATS` | `VERRATS` | Cheptel | ID | ✓ |
| `STOCK_ALIMENTS_MVT` | `STOCK_ALIMENTS_MOUVEMENTS` | Stock | ID | — |

## 1.b. Feuilles non référencées dans le TABLES_INDEX

- `DASHBOARD`
- `QUESTIONS_CONTROLE`
- `CHECKLISTS`
- `ZZ_LOGS`
- `NOTES_TERRAIN`
- `DATA_EXPORT`
- `_AUDIT`
- `KPI_PROJECTIONS`
- `Suivi Maternité`
- `Journal des Traitements`
- `TABLES_INDEX`
- `Fiche Suivi Quotidien`
- `Point Hebdomadaire`

## 2. Audit par entité

### SUIVI_TRUIES_REPRODUCTION → `Truie` (17 lignes)

**En-têtes réels Sheets :**

`ID` · `Nom` · `Boucle` · `Statut` · `Date MB prevue` · `Nb portees` · `Derniere portee NV` · `Alimentation` · `Ration kg/j` · `Notes`

**Matchés (champ code → colonne Sheets) :**

- `id` → `ID`
- `boucle` → `Boucle`
- `nom` → `Nom`
- `statut` → `Statut`
- `ration` → `Ration kg/j` ⚠️ _match partiel_

**❌ Champs code sans colonne Sheets correspondante :**

- `race` (cherché : RACE)
- `poids` (cherché : POIDS)
- `emplacement` (cherché : LOGE, EMPLACEMENT, ZONE)
- `stade` (cherché : STADE)
- `nbPortees` (cherché : NB_PORTEES, PORTÉES)
- `dateDerniereMB` (cherché : DATE_DERNIERE_MB, DERNIERE_MB)
- `dateMBPrevue` (cherché : DATE_MB_PREVUE, PROCHAINE_MB)
- `nvMoyen` (cherché : NV_MOYEN, MOY_NV)

**➕ Colonnes Sheets non utilisées par le code :**

- `Date MB prevue`
- `Nb portees`
- `Derniere portee NV`
- `Alimentation`
- `Notes`

**Valeurs uniques Statut rencontrées :**

`En attente saillie` · `En maternité` · `À surveiller` · `Pleine`

**Échantillon IDs (5 premiers) :**

- T01 (boucle: B.22)
- T02 (boucle: B.38)
- T03 (boucle: B.23)
- T06 (boucle: B.93)
- T09 (boucle: B.31)

---

### PORCELETS_BANDES_DETAIL → `BandePorcelets` (15 lignes)

**En-têtes réels Sheets :**

`ID Portée` · `Truie` · `Boucle mère` · `Date MB` · `NV` · `Morts` · `Vivants` · `Date sevrage prévue` · `Date sevrage réelle` · `Statut` · `Notes`

**Matchés (champ code → colonne Sheets) :**

- `id` → `ID Portée`
- `truie` → `Truie`
- `boucleMere` → `Boucle mère`
- `dateMB` → `Date MB`
- `nv` → `NV`
- `morts` → `Morts`
- `vivants` → `Vivants`
- `statut` → `Statut`
- `dateSevragePrevue` → `Date sevrage prévue`
- `dateSevrageReelle` → `Date sevrage réelle`

**➕ Colonnes Sheets non utilisées par le code :**

- `Notes`

**Valeurs uniques Statut rencontrées :**

`Sevrés` · `Sous mère` · `RECAP`

**Échantillon IDs (5 premiers) :**

- 26-T7-01 (boucle: B.21)
- 26-T11-01 (boucle: B.12)
- 26-T1-01 (boucle: B.22)
- 26-T3-01 (boucle: B.23)
- 26-T2-01 (boucle: B.38)

---

### JOURNAL_SANTE → `TraitementSante` (3 lignes)

**En-têtes réels Sheets :**

`ID` · `TS` · `` · `` · `` · `` · `` · `` · `` · `` · `` · `` · `` · ``

**Matchés (champ code → colonne Sheets) :**

- `cibleId` → `ID`

**❌ Champs code sans colonne Sheets correspondante :**

- `date` (cherché : DATE)
- `cibleType` (cherché : CIBLE_TYPE, SUJET_TYPE, TYPE)
- `typeSoin` (cherché : TYPE_SOIN, TYPE)
- `traitement` (cherché : TRAITEMENT, SOIN, PRODUIT)
- `observation` (cherché : OBSERVATION, NOTE, NOTES)
- `auteur` (cherché : AUTEUR, USER)

**➕ Colonnes Sheets non utilisées par le code :**

- `TS`
- ``
- ``
- ``
- ``
- ``
- ``
- ``
- ``
- ``
- ``
- ``
- ``

**Échantillon IDs (5 premiers) :**

-  (boucle: —)
-  (boucle: —)
-  (boucle: —)

---

### STOCK_ALIMENTS → `StockAliment` (5 lignes)

**En-têtes réels Sheets :**

`ID` · `LIBELLE` · `UNITE` · `STOCK_ACTUEL` · `SEUIL_ALERTE` · `NOTES`

**Matchés (champ code → colonne Sheets) :**

- `id` → `ID`
- `unite` → `UNITE`
- `alerte` → `SEUIL_ALERTE` ⚠️ _match partiel_

**❌ Champs code sans colonne Sheets correspondante :**

- `nom` (cherché : NOM, ALIMENT)
- `type` (cherché : TYPE)
- `quantite` (cherché : QUANTITE)

**➕ Colonnes Sheets non utilisées par le code :**

- `LIBELLE`
- `STOCK_ACTUEL`
- `NOTES`

**Échantillon IDs (5 premiers) :**

- ALIM-MAIS (boucle: —)
- ALIM-TRUIE-GEST (boucle: —)
- ALIM-TRUIE-LACT (boucle: —)
- ALIM-PORCELET (boucle: —)
- ALIM-ENGR (boucle: —)

---

### STOCK_VETO → `StockVeto` (85 lignes)

**En-têtes réels Sheets :**

`ID` · `LIBELLE` · `TYPE` · `USAGE` · `UNITE` · `STOCK_ACTUEL` · `STOCK_MIN` · `ALERTE_STOCK_BAS` · `DLC` · `NOTES`

**Matchés (champ code → colonne Sheets) :**

- `id` → `ID`
- `unite` → `UNITE`
- `dlc` → `DLC`
- `alerte` → `ALERTE_STOCK_BAS` ⚠️ _match partiel_

**❌ Champs code sans colonne Sheets correspondante :**

- `nom` (cherché : NOM, PRODUIT)
- `quantite` (cherché : QUANTITE)

**➕ Colonnes Sheets non utilisées par le code :**

- `LIBELLE`
- `TYPE`
- `USAGE`
- `STOCK_ACTUEL`
- `STOCK_MIN`
- `NOTES`

**Échantillon IDs (5 premiers) :**

- SANTE-20260414-0001 (boucle: —)
- SANTE-20260414-0002 (boucle: —)
- SANTE-20260414-0003 (boucle: —)
- SANTE-20260414-0004 (boucle: —)
- SANTE-20260414-0005 (boucle: —)

---

### VERRATS → `Verrat` (2 lignes)

**En-têtes réels Sheets :**

`ID` · `Nom` · `Boucle` · `Statut` · `Origine` · `Alimentation` · `Ration kg/j` · `Notes`

**Matchés (champ code → colonne Sheets) :**

- `id` → `ID`
- `boucle` → `Boucle`
- `nom` → `Nom`
- `statut` → `Statut`
- `ration` → `Ration kg/j` ⚠️ _match partiel_

**❌ Champs code sans colonne Sheets correspondante :**

- `race` (cherché : RACE)
- `poids` (cherché : POIDS)
- `dateNaissance` (cherché : DATE_NAISSANCE, NAISSANCE)

**➕ Colonnes Sheets non utilisées par le code :**

- `Origine`
- `Alimentation`
- `Notes`

**Valeurs uniques Statut rencontrées :**

`Actif`

**Échantillon IDs (5 premiers) :**

- V01 (boucle: )
- V02 (boucle: )

---

## 3. Récapitulatif à agir

- **SUIVI_TRUIES_REPRODUCTION** : 8 champ(s) code sans colonne Sheets → race, poids, emplacement, stade, nbPortees, dateDerniereMB, dateMBPrevue, nvMoyen
- **SUIVI_TRUIES_REPRODUCTION** : 5 colonne(s) Sheets non exploitée(s) → `Date MB prevue`, `Nb portees`, `Derniere portee NV`, `Alimentation`, `Notes`
- **PORCELETS_BANDES_DETAIL** : 1 colonne(s) Sheets non exploitée(s) → `Notes`
- **JOURNAL_SANTE** : 6 champ(s) code sans colonne Sheets → date, cibleType, typeSoin, traitement, observation, auteur
- **JOURNAL_SANTE** : 13 colonne(s) Sheets non exploitée(s) → `TS`, ``, ``, ``, ``, ``, ``, ``, ``, ``, ``, ``, ``
- **STOCK_ALIMENTS** : 3 champ(s) code sans colonne Sheets → nom, type, quantite
- **STOCK_ALIMENTS** : 3 colonne(s) Sheets non exploitée(s) → `LIBELLE`, `STOCK_ACTUEL`, `NOTES`
- **STOCK_VETO** : 2 champ(s) code sans colonne Sheets → nom, quantite
- **STOCK_VETO** : 6 colonne(s) Sheets non exploitée(s) → `LIBELLE`, `TYPE`, `USAGE`, `STOCK_ACTUEL`, `STOCK_MIN`, `NOTES`
- **VERRATS** : 3 champ(s) code sans colonne Sheets → race, poids, dateNaissance
- **VERRATS** : 3 colonne(s) Sheets non exploitée(s) → `Origine`, `Alimentation`, `Notes`
