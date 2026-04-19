# Schéma cible — Code ↔ Sheets (17 avril 2026)

Source de vérité : `/Users/desk/Desktop/SUIVI_FERME_A130_18-04-2026.xlsx` + audit GAS V20.

## TRUIES (sheet: `TRUIES_REPRODUCTION`, key: `SUIVI_TRUIES_REPRODUCTION`)

| Champ code | Colonne Sheets | Type |
|---|---|---|
| `id` | `ID` | string |
| `nom` | `Nom` | string |
| `boucle` | `Boucle` | string |
| `statut` | `Statut` | enum |
| `stade` | `Stade` | enum |
| `nbPortees` | `Nb Portées` | number |
| `derniereNV` | `Dernière portée NV` | number |
| `dateMBPrevue` | `Date MB prévue` | string (dd/mm/yyyy) |
| `ration` | `Ration kg/j` | number |
| `notes` | `Notes` | string |

**Enum Statut** (valeurs autorisées) : `En attente saillie` · `En maternité` · `Pleine` · `À surveiller`

**Enum Stade** : `En attente saillie` · `En attente saillie (sevrée)` · `En maternité` · `Pleine` · `À surveiller`

**SUPPRIMÉS** (ne plus référencer) : `race`, `poids`, `emplacement`, `dateDerniereMB`, `nvMoyen`, `Flushing`

## VERRATS (sheet: `VERRATS`)

| Champ code | Colonne Sheets |
|---|---|
| `id` | `ID` |
| `nom` | `Nom` |
| `boucle` | `Boucle` |
| `statut` | `Statut` |
| `origine` | `Origine` |
| `alimentation` | `Alimentation` (texte libre, ex: "Gestation (KPC)") |
| `ration` | `Ration kg/j` |
| `notes` | `Notes` |

**Enum Statut** : `Actif` (plus tard : `Réforme`, `Mort`)

**SUPPRIMÉS** : `race`, `poids`, `dateNaissance`

## PORCELETS BANDES (sheet: `PORCELETS_BANDES`, key: `PORCELETS_BANDES_DETAIL`)

| Champ code | Colonne Sheets |
|---|---|
| `id` / `idPortee` | `ID Portée` |
| `truie` | `Truie` |
| `boucleMere` | `Boucle mère` |
| `dateMB` | `Date MB` |
| `nv` | `NV` |
| `morts` | `Morts` |
| `vivants` | `Vivants` |
| `dateSevragePrevue` | `Sevrage prévu` |
| `dateSevrageReelle` | `Sevrage réel` |
| `statut` | `Statut` |
| `notes` | `Notes` |

**Enum Statut** : `Sous mère` · `Sevrés` · `RECAP` (ignoré en UI)

## STOCK ALIMENTS (sheet + key: `STOCK_ALIMENTS`)

| Champ code | Colonne Sheets |
|---|---|
| `id` | `ID` |
| `libelle` (remplace `nom`) | `Libellé` |
| `unite` | `Unité` |
| `stockActuel` (remplace `quantite`) | `Stock actuel` |
| `seuilAlerte` (remplace `alerte`) | `Seuil alerte` |
| `statutStock` | `Statut` (RUPTURE/BAS/OK — trust Sheets value) |
| `notes` | `Notes` |

**SUPPRIMÉ** : `type`

## STOCK VETO (sheet + key: `STOCK_VETO`)

| Champ code | Colonne Sheets |
|---|---|
| `id` | `ID` |
| `produit` (remplace `nom`) | `Produit` |
| `type` | `Type` |
| `usage` | `Usage` |
| `unite` | `Unité` |
| `stockActuel` | `Stock` |
| `stockMin` | `Stock min` |
| `statutStock` | `Statut` |
| `notes` | `Notes` |

**AJOUTÉS** : `type`, `usage`, `stockMin`. **SUPPRIMÉ** : `dlc` (déplacé ailleurs ?)

## ALERTES (nouveau mapper — sheet: `ALERTES_ACTIVES`)

Remplace éventuellement `alertEngine` côté code (à discuter — pour l'instant les deux coexistent).

| Champ code | Colonne Sheets |
|---|---|
| `priorite` | `Priorité` — enum : `CRITIQUE` · `HAUTE` · `NORMALE` · `INFO` |
| `categorie` | `Catégorie` — enum : `BANDES` · `REPRO` · `STOCK` |
| `sujet` | `Sujet` (texte libre) |
| `description` | `Alerte` (texte) |
| `actionRequise` | `Action requise` |
| `date` | `Date` |

## PHARMACIE INVENTAIRE (nouveau, sheet: `PHARMACIE INVENTAIRE` — pas encore dans TABLES_INDEX côté GAS ?)

| Champ code | Colonne Sheets |
|---|---|
| `no` | `No` |
| `produit` | `Produit` |
| `famille` | `Famille` |
| `unite` | `Unité` |
| `usagePrincipal` | `Usage principal` |
| `stock` | `Stock` |
| `coutUnitFCFA` | `Coût unit (FCFA)` |
| `valeurStockFCFA` | `Valeur stock (FCFA)` |

## PROTOCOLES (reference read-only — sheet: `PROTOCOLES`, headers en row 2)

| Champ code | Colonne |
|---|---|
| `action` | `Action` |
| `produit` | `Produit` |
| `cible` | `Cible` |
| `dose` | `Dose` |
| `frequence` | `Fréquence` |
| `periode` | `Période` |
| `responsable` | `Responsable` |

## JOURNAL_SANTE (en refonte — schéma cible à écrire)

Côté Sheets actuel : cassé (juste ID + TS + colonnes vides). **Cible** :

| Colonne Sheets | Champ code | Notes |
|---|---|---|
| `ID` | `id` | généré GAS (SANTE-YYYYMMDD-NNNN) |
| `DATE` | `date` | dd/mm/yyyy |
| `CIBLE_TYPE` | `cibleType` | enum : TRUIE · VERRAT · BANDE · GENERAL |
| `CIBLE_ID` | `cibleId` | FK vers TRUIES.ID / VERRATS.ID / PORCELETS_BANDES.ID |
| `BOUCLE` | `boucle` | snapshot au moment du soin (recherche facile) |
| `TYPE_SOIN` | `typeSoin` | enum : Vaccination · Traitement curatif · Déparasitage · Complément · Obstétrique · Autre |
| `PRODUIT` | `produit` | lien vers STOCK_VETO.Produit si possible |
| `DOSE` | `dose` | nombre + unité |
| `OBSERVATION` | `observation` | texte libre |
| `AUTEUR` | `auteur` | PORCHER / ADMIN / VETERINAIRE |

## Règles de statut (alertEngine)

Ancien → Nouveau :
- `Gestante` → `Pleine`
- `Allaitante` → `En maternité`
- `Vide` → `En attente saillie`
- `Observation` → `À surveiller`
- `Flushing` → **supprimé** (plus un statut, c'est du flux alimentaire géré ailleurs)
- `Saillie` → **déplacé** vers `SUIVI_REPRODUCTION_ACTUEL` (cycle)

## Conventions colonnes

- **Variants à tester** dans `findIdx` : accents inclus (`ÉÀÈÔÛÎ`), espaces vs underscores, singulier/pluriel, majuscules/minuscules
- `findIdx` doit normaliser : `'Nb Portées'.toUpperCase() === 'NB PORTÉES'` → match sur `'PORTÉES'` ou `'NB_PORTEES'`
