---
status: 📝 draft
title: [Nom de l'écran]
priority: [1-5]
owner: openformac@gmail.com
---

# [Nom de l'écran]

## Contexte métier

[2-3 lignes sur le rôle de l'écran. Qui l'utilise (propriétaire à distance / porcher terrain), dans quel moment de sa journée, pour quelle décision.]

## Point d'entrée

- **Depuis** : [Cockpit / HubTile Pilotage / FAB / ligne cliquable dans liste / …]
- **Type** : [plein écran / bottom sheet / modal]
- **Back** : [destination du bouton retour]

## Structure demandée

### Header

`AgritechHeader`
- title: `[TITRE EN MAJUSCULES]`
- subtitle: `[sous-titre contextuel]`
- backTo: `[/route]`

### Bloc KPI

`[N]` cartes `KpiCard` en grid-cols-2 sm:grid-cols-4 :
| Label | Valeur | Unité | Tone |
|-------|--------|-------|------|
| [label] | [valeur exemple] | [unité] | [default/success/warning/critical] |

### Bloc principal

**Type** : [liste / grille / timeline / formulaire / carte-carte / graphique]

[Description précise : combien d'éléments, quels champs par élément, quelles interactions.]

### Bloc secondaire (optionnel)

[Si l'écran a un 2e bloc au-dessus du fold bas — sinon supprimer cette section.]

### Actions

- **FAB** : [emerald permanent, N actions stagger] / [contextuel spécifique écran] / [pas de FAB]
- **Boutons bas** : [aucun / CTA primaire / 2 boutons]

## Données réalistes

Contexte ferme K13 (Côte d'Ivoire, 17 truies T01-T17, 2 verrats, ~100 porcelets).

- [exemple 1 : 25-T07-01, 9 porcelets, né le 12/03/2026]
- [exemple 2 : …]
- …

**Devise** : FCFA, format `1 245 000` (espace séparateur, pas de virgule).

## Empty state

Si [condition de vide] :
- Icône : `[Lucide name ou icône custom]`
- Titre (uppercase, BigShoulders) : `[TEXTE]`
- Helper (1 phrase, ton "tu") : `[texte]`

## Variantes UX à explorer

[Si une décision UX mérite 2 options, les lister ici. Sinon "aucune".]

**Variante 1 — [nom]** : [description]
**Variante 2 — [nom]** : [description]

## Contraintes globales

- Monospace + tabular-nums pour tous les chiffres
- Uppercase BigShoulders pour titres + KPI labels
- French UI, ton "tu"
- Card-dense partout (bg-2, rounded-xl, border, padding 16)
- Chips tone : accent=neutre, amber=warning, red=critique, gold=premium
- Empty state si vide, jamais d'état "loading" pour données déjà cachées (offline-first)
- Tap targets ≥44px

## Source Claude Design

<!-- Rempli après prototypage -->

- **Lien partageable** : [URL ou "en cours"]
- **Screenshots déposés** : `docs/design-mockups/XX-[nom].png`
- **Variante retenue** : [1 / 2 / N/A]
- **Notes post-design** : [surprises, choix finaux, éléments à ajuster côté code]

## Handoff code (pour Claude Code)

<!-- Rempli quand status = ready-to-code -->

- **Composants agritech à réutiliser** : [KpiCard, DataRow, Chip, HubTile, SectionDivider, SparklineCard, FAB, BottomSheet]
- **Nouveaux composants à créer** : [liste + justification pourquoi pas réutilisable]
- **Route à ajouter** : [/chemin]
- **Contexte à connecter** : [useFarm().bandes / .truies / .finances …]
- **Tests unitaires clés** : [comportements à tester]
