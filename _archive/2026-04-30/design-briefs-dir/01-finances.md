---
status: ✅ ready-to-code
title: Module Finances
priority: 1
owner: openformac@gmail.com
---

# Module Finances

## Contexte métier

Ferme K13 n'a aucun suivi financier dans l'app. Le propriétaire gère à distance et veut savoir en un coup d'œil : combien j'ai vendu ce mois, combien j'ai dépensé, quelle marge il reste. Les ventes sont essentiellement des porcs vifs (bandes finition ≥80 kg). Les dépenses principales : aliment ~70 %, vétérinaire, main d'œuvre, maintenance. Devise FCFA.

## Point d'entrée

- **Depuis** : Pilotage → HubTile "FINANCES" (tone gold, count = nombre transactions mois)
- **Type** : plein écran
- **Back** : `/pilotage`

## Structure demandée

### Header

`AgritechHeader`
- title: `FINANCES`
- subtitle: `Suivi trésorerie K13`
- backTo: `/pilotage`

### Toggle période

Chips en haut : Mois en cours | Mois précédent | Année

### Bloc KPI

4 cartes grid-cols-2 sm:grid-cols-4 :
| Label | Valeur | Unité | Tone |
|-------|--------|-------|------|
| Chiffre d'affaires | 1 245 000 | FCFA | success |
| Dépenses | 820 000 | FCFA | warning (amber) |
| Marge nette | 425 000 | FCFA | success si >0, critical si <0 |
| Trésorerie estimée | 2 100 000 | FCFA | default |

### Bloc principal A — Vue ventes (variante 2 SYNTHÈSE retenue)

`SparklineCard` CA mois avec delta vs mois précédent + liste compacte des 3 dernières ventes (DataRow).

### Bloc principal B — Ventilation dépenses

Donut + légende 4 postes : Aliment / Véto / Main d'œuvre / Maintenance avec chip %.

### Bloc liste

`SectionDivider` "DERNIÈRES TRANSACTIONS · N"
8 à 10 DataRow :
- primary : libellé
- secondary : date · catégorie · bande liée
- meta : montant signé monospace (↙ vert pour vente, ↗ amber pour sortie)
- accessory : ChevronRight
Bouton "Voir tout" en bas → sous-écran Rapport financier.

### HubTile vers sous-écran

HubTile bas tone=gold "RAPPORT FINANCIER" avec chevron → écran Rapport financier (variante 1 EMPILÉE + export PDF placeholder).

### Actions

- **FAB contextuel emerald** (bas-droit, permanent sur Finances) → 2 actions stagger :
  - Enregistrer vente
  - Enregistrer dépense

## Données réalistes

- CA mois : 1 245 000 FCFA (3 bandes vendues : 25-T05-01, 25-T07-01, 25-T09-01)
- Dépenses mois : 820 000 FCFA (Aliment 580k, Véto 120k, Main d'œuvre 80k, Maintenance 40k)
- Marge : 425 000 FCFA
- Trésorerie : 2 100 000 FCFA
- 8 transactions récentes mélangées entrée/sortie

**Format devise** : `1 245 000 FCFA` (espace séparateur)
**Format date** : `dd/MM` pour mois en cours, `dd/MM/yyyy` pour ancien

## Empty state

Si 0 transactions ce mois :
- Icône : `Coins` (Lucide)
- Titre : `AUCUNE TRANSACTION CE MOIS`
- Helper : `Appuie sur + pour enregistrer ta première vente ou dépense.`

## Variantes UX

**Variante 1 — EMPILÉE** : graphique barres empilées 6 mois, CA par bande ventilé
**Variante 2 — SYNTHÈSE** (retenue) : sparkline + 3 dernières ventes

→ Variante 1 déplacée dans sous-écran **Rapport financier** (HubTile gold depuis Finances + entrée directe via Pilotage → Rapports).

## Contraintes globales

Voir [_TEMPLATE.md](_TEMPLATE.md).

## Source Claude Design

- **Lien partageable** : [à compléter — demander à Claude Design]
- **Screenshots déposés** : `docs/design-mockups/01-finances.png`, `02-rapport-financier.png`
- **Variante retenue** : 2 (SYNTHÈSE) pour Finances, 1 (EMPILÉE) pour Rapport financier
- **Notes post-design** :
  - FAB Finances = contextuel, l'écran Finances a son propre FAB en plus du FAB global terrain
  - Double accès à Rapport financier : direct (Pilotage → Rapports) et contextuel (Finances → Rapport financier)

## Handoff code

- **Composants agritech à réutiliser** : KpiCard, SparklineCard, DataRow, SectionDivider, HubTile, Chip, FAB, BottomSheet
- **Nouveaux composants à créer** :
  - `DonutChart` (Recharts) pour ventilation dépenses
  - `TransactionRow` (spécialisation de DataRow avec icône directionnelle + montant coloré)
  - `PeriodToggle` (3 chips switchables)
- **Routes à ajouter** :
  - `/pilotage/finances` → `FinancesView`
  - `/pilotage/finances/rapport` → `RapportFinancierView`
- **Contexte à connecter** : `useFarm()` — **ajouter** `transactions: Transaction[]` au FarmContext (aujourd'hui absent). Besoin d'un nouveau sheet Google `TRANSACTIONS` avec colonnes : id, date, type (VENTE/DEPENSE), categorie, libelle, montantFcfa, bandeId?.
- **Sheet Google à créer** : `TRANSACTIONS` (append-only, GAS action `append_row`)
- **Tests unitaires clés** :
  - Calcul CA/Dépenses/Marge sur période donnée
  - Ventilation par catégorie = somme correcte
  - Empty state affiché si 0 transactions
  - Format FCFA avec espace séparateur
  - Signe correct des transactions (vente positive, dépense négative)
