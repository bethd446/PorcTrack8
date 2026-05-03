# SHEETS — Data Integrity Audit

Date : 19/04/2026 17:39:47
Déploiement : `https://script.google.com/macros/s/***/exec`
Script (rerun) : `node scripts/audit-sheets-data-integrity.mjs [--fix]`

Résumé : **1 critiques** · **27 moyennes** · 18 infos · 0 fixes appliqués

---

## TL;DR — Top 5 actions prioritaires

- 🔴 **Trous truies** : T08, T17 absents de TRUIES mais référencés ailleurs (saillies). À créer ou renommer.
- 🔴 **Saillie orpheline** : au moins 1 saillie pointe sur une truie absente (ex: T17/boucle 86).
- 🔴 **SANTE inutilisable** : header cassé (12/14 colonnes vides). Feuille à refonder manuellement.
- 🔴 **ALIMENT_FORMULES manquante** : à créer + entry TABLES_INDEX.
- 🟡 **8 truies sans nom** : T05, T06, T10, T12, T13, T14, T18, T19 — renseigner pour UX.

---

## Partie A — Anomalies critiques 🔴

**Top critiques par type :**

- `REPRO:TRUIE_ORPHELINE` — 1×

**Détail (≤ 20) :**

- **[REPRO] TRUIE_ORPHELINE** — Saillie → truie absente de TRUIES : id="T17" boucle="86"

## Partie B — Anomalies moyennes 🟡

**Top moyennes par type :**

- `TRUIES:NO_NOM` — 8×
- `STOCK_ALIM:RUPTURE` — 5×
- `STOCK_VETO:DLC_ARTEFACT` — 5×
- `TRUIES:STATUT_NON_STANDARD` — 3×
- `PORCELETS:ID_TRUIE_MISMATCH` — 3×
- `TRUIES:NUMEROTATION_TROUS` — 1×
- `PORCELETS:MORTALITE_ELEVEE` — 1×
- `SHEETS:TABLE_MISSING` — 1×

**Échantillon détaillé (≤ 30) :**

- [TRUIES] **NO_NOM** — Truie T06 (boucle B.93) sans nom
- [TRUIES] **NO_NOM** — Truie T14 (boucle B.24) sans nom
- [TRUIES] **NO_NOM** — Truie T10 (boucle B.37) sans nom
- [TRUIES] **NO_NOM** — Truie T13 (boucle B.29) sans nom
- [TRUIES] **NO_NOM** — Truie T18 (boucle B.85) sans nom
- [TRUIES] **NO_NOM** — Truie T19 (boucle B.76) sans nom
- [TRUIES] **STATUT_NON_STANDARD** — Statut non canonique : "À surveiller" (truie T04)
- [TRUIES] **NO_NOM** — Truie T05 (boucle B.20) sans nom
- [TRUIES] **STATUT_NON_STANDARD** — Statut non canonique : "Pleine" (truie T05)
- [TRUIES] **NO_NOM** — Truie T12 (boucle B.10) sans nom
- [TRUIES] **STATUT_NON_STANDARD** — Statut non canonique : "Pleine" (truie T12)
- [TRUIES] **NUMEROTATION_TROUS** — Trous dans la numérotation T01..T19 : T08, T17
- [PORCELETS] **ID_TRUIE_MISMATCH** — ID "26-T14-01" préfixé T14 mais champ Truie="T15"
- [PORCELETS] **ID_TRUIE_MISMATCH** — ID "26-T8-01" préfixé T8 mais champ Truie="T09"
- [PORCELETS] **ID_TRUIE_MISMATCH** — ID "26-T15-01" préfixé T15 mais champ Truie="T16"
- [PORCELETS] **MORTALITE_ELEVEE** — Mortalité 16.7% (26-T6-01)
- [STOCK_ALIM] **RUPTURE** — Rupture stock aliment : Maïs grain
- [STOCK_ALIM] **RUPTURE** — Rupture stock aliment : Aliment truie gestation
- [STOCK_ALIM] **RUPTURE** — Rupture stock aliment : Aliment truie lactation
- [STOCK_ALIM] **RUPTURE** — Rupture stock aliment : Aliment porcelet démarrage
- [STOCK_ALIM] **RUPTURE** — Rupture stock aliment : Aliment engraissement
- [STOCK_VETO] **DLC_ARTEFACT** — DLC aberrante (< 2000) pour "2" : 1943-10-21 — probablement format de sérialisation Excel corrompu
- [STOCK_VETO] **DLC_ARTEFACT** — DLC aberrante (< 2000) pour "3" : 1941-01-24 — probablement format de sérialisation Excel corrompu
- [STOCK_VETO] **DLC_ARTEFACT** — DLC aberrante (< 2000) pour "4" : 1982-02-18 — probablement format de sérialisation Excel corrompu
- [STOCK_VETO] **DLC_ARTEFACT** — DLC aberrante (< 2000) pour "5" : 1924-08-21 — probablement format de sérialisation Excel corrompu
- [STOCK_VETO] **DLC_ARTEFACT** — DLC aberrante (< 2000) pour "6" : 1949-04-12 — probablement format de sérialisation Excel corrompu
- [SHEETS] **TABLE_MISSING** — ALIMENT_FORMULES inexistante — à créer manuellement + entry TABLES_INDEX

## Partie B-bis — Infos ℹ

- [NOTES] TYPE_INCONNU — Catégorie note inconnue : "Porcher"
- [NOTES] TYPE_INCONNU — Catégorie note inconnue : "Porcher"
- [NOTES] TYPE_INCONNU — Catégorie note inconnue : "Porcher"
- [NOTES] TYPE_INCONNU — Catégorie note inconnue : "Alertes GTTT"
- [NOTES] TYPE_INCONNU — Catégorie note inconnue : "2026-04-17T07:00:00.000Z"
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:39.658Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:39.680Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:39.700Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:39.721Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:39.742Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:39.770Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:39.796Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:39.875Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:39.909Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:40.063Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:40.091Z
- [ALERTES] PRIO_INVALIDE — Priorité non standard : 2026-04-19T07:31:40.117Z
- [FINANCES] MONTANT_NEGATIF — Ligne finance négative : -7

## Partie C — Fixes appliqués via GAS API

_Aucun fix auto appliqué. Relancer avec `--fix` pour tenter suppressions RECAP + normalisation statuts._

## Partie D — Actions manuelles user requises 🛠

| Prio | Table | Action |
|---|---|---|
| HAUTE | `SANTE` | Réécrire le header de la feuille SANTE (actuellement : 1-2 colonnes + 12 vides). Colonnes recommandées : ID, DATE, CIBLE_TYPE, CIBLE_ID, TYPE_SOIN, TRAITEMENT, DOSE, OBSERVATION, AUTEUR, TS |
| HAUTE | `ALIMENT_FORMULES` | Créer la feuille ALIMENT_FORMULES + entry TABLES_INDEX (GAS API n'expose pas create_sheet). |
| MOYENNE | `TRUIES` | Renseigner le nom des truies sans nom : T06, T14, T10, T13, T18, T19, T05, T12 |
| BASSE | `PORCELETS` | Saisir les ~9 porcelets manquants au terrain (user dit 158 terrain vs ~149 sheets). |
| MOYENNE | `STOCK_VETO` | Nettoyer les 9 lignes sans libellé + les DLC aberrantes (<2000) — probables formats corrompus. |

## Partie E — Counts factuels

```json
{
  "sheetsTotal": 32,
  "tablesIndexed": 19,
  "truiesTotal": 17,
  "truiesStatuts": {
    "En attente saillie": 10,
    "En maternité": 4,
    "À surveiller": 1,
    "Pleine": 2
  },
  "truiesPrimipares": 11,
  "truiesProductives": 6,
  "truiesEnMaternite": 4,
  "truiesTrous": [
    "T08",
    "T17"
  ],
  "verratsTotal": 2,
  "verratsList": [
    {
      "id": "V01",
      "nom": "Bobi"
    },
    {
      "id": "V02",
      "nom": "Aligator"
    }
  ],
  "porteesTotal": 15,
  "porteesRecap": 1,
  "porteesActives": 14,
  "totalSevresApprox": 106,
  "totalSousMereApprox": 43,
  "totalPorceletsApprox": 149,
  "santeHeader": [
    "",
    "2026-04-07T08:00:00.000Z",
    "2026-04-07T07:00:00.000Z",
    "1899-12-30T16:00:00.000Z",
    "Porcher",
    "TRAITEMENT",
    "TRUIE",
    "T04",
    "Demangeaisons abdominales",
    "Penstrep + spray OxyIver",
    "5ml",
    "5 jours",
    "Amelioration",
    "Boucle 24-26"
  ],
  "santeRows": 1,
  "stockAlimentsTotal": 5,
  "stockAlimentsRupture": 5,
  "stockAlimentsBas": 0,
  "stockVetoTotal": 85,
  "stockVetoSansDLC": 71,
  "stockVetoExpires": 0,
  "stockVetoRupture": 72,
  "stockVetoBas": 3,
  "stockVetoLignesVides": 9,
  "notesHeader": [
    "Date",
    "Heure",
    "Catégorie",
    "Note",
    "Animal concerné",
    "Auteur",
    "",
    "",
    "",
    "",
    ""
  ],
  "notesRows": 9,
  "notesSheetLike6col": 4,
  "notesAppLike5col": 0,
  "notesBadCat": 5,
  "notesSansCategorie": 0,
  "reproTotal": 26,
  "reproOrphanTruie": 1,
  "reproOrphanVerrat": 0,
  "reproDateFuture": 0,
  "reproNoTruieId": 0,
  "alertesTotal": 12,
  "alertesObsoletes30j": 0,
  "alertesPrioInvalides": 12,
  "financesTotal": 18,
  "financesMontantNegatif": 1,
  "financesSansCategorie": 3,
  "financesSansPoste": 2,
  "parametresTotal": 21,
  "parametresSample": [
    {
      "key": "Duree gestation",
      "value": 114,
      "unit": "jours"
    },
    {
      "key": "Age sevrage",
      "value": 21,
      "unit": "jours"
    },
    {
      "key": "NV/portee objectif",
      "value": 12,
      "unit": "tetes"
    },
    {
      "key": "NV/portee reel",
      "value": 11.2,
      "unit": "tetes"
    },
    {
      "key": "Sevres/truie objectif",
      "value": 10.5,
      "unit": "tetes"
    },
    {
      "key": "MB/truie/an objectif",
      "value": 2.2,
      "unit": "MB/an"
    },
    {
      "key": "Fertilite",
      "value": 92.3,
      "unit": "%"
    },
    {
      "key": "Retour chaleur post-sevrage",
      "value": 7,
      "unit": "jours"
    },
    {
      "key": "Loges maternite",
      "value": 9,
      "unit": "loges"
    },
    {
      "key": "GMQ post-sevrage obj",
      "value": 450,
      "unit": "g/jour"
    },
    {
      "key": "GMQ engraissement obj",
      "value": 650,
      "unit": "g/jour"
    },
    {
      "key": "IC engraissement",
      "value": 3.2,
      "unit": "kg/kg"
    },
    {
      "key": "Duree post-sevrage",
      "value": 42,
      "unit": "jours"
    },
    {
      "key": "Duree engraissement",
      "value": 90,
      "unit": "jours"
    },
    {
      "key": "Poids vente objectif",
      "value": 90,
      "unit": "kg vif"
    },
    {
      "key": "Mortalite porcelets obj",
      "value": 10,
      "unit": "%"
    },
    {
      "key": "Mortalite post-sevrage obj",
      "value": 5,
      "unit": "%"
    },
    {
      "key": "Prix vente min",
      "value": 2000,
      "unit": "FCFA/kg"
    },
    {
      "key": "Prix vente moyen",
      "value": 2100,
      "unit": "FCFA/kg"
    },
    {
      "key": "Prix vente max",
      "value": 2200,
      "unit": "FCFA/kg"
    },
    {
      "key": "Prix porcelet sevre",
      "value": 25000,
      "unit": "FCFA"
    }
  ],
  "sheetsNonIndexees": [
    "DASHBOARD",
    "QUESTIONS_CONTROLE",
    "CHECKLISTS",
    "ZZ_LOGS",
    "NOTES_TERRAIN",
    "DATA_EXPORT",
    "_AUDIT",
    "KPI_PROJECTIONS",
    "Suivi Maternité",
    "Journal des Traitements",
    "TABLES_INDEX",
    "Fiche Suivi Quotidien",
    "Point Hebdomadaire"
  ]
}
```
