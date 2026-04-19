# PorcTrack 8 — Structure actuelle + Gaps fonctionnels

> Analyse ciblée ferme naisseur-engraisseur 17 truies + 2 verrats + bandes porcelets.

## A. Inventaire existant

### Routes (17)
| Route | Rôle | État |
|---|---|---|
| `/` | Dashboard "Aujourd'hui" (actions + KPI top) | ✓ utile mais surchargé |
| `/cheptel` | Liste truies + verrats (tabs) | ✓ |
| `/cheptel/truie/:id` | Détail animal (+ timeline) | ✓ récent |
| `/cheptel/verrat/:id` | Détail verrat | ✓ |
| `/bandes` | Liste bandes porcelets + sevrage | ✓ lourd (1 écran gère tout) |
| `/bandes/:bandeId` | Détail bande | ⚠️ vide ou minimal |
| `/sante` | Journal santé (table brute) | ⚠️ schéma Sheets cassé |
| `/stock` | Stock aliments (table) | ✓ |
| `/stock/aliments` | Alias /stock | redondant |
| `/stock/veto` | Stock véto (table) | ✓ |
| `/alerts` | Alertes locales + serveur | ✓ récent |
| `/more` | Settings + Sync + Protocoles | fourre-tout |
| `/controle` | Contrôle quotidien (checklist) | ✓ |
| `/checklist/:name` | Exécution checklist | ✓ |
| `/audit` | Cohérence données | admin only |
| `/sync` | File queue offline | admin only |
| `/protocoles` | Guide métier SOPs | read-only |

### Entités data (types/farm.ts)
Truie · Verrat · BandePorcelets · TraitementSante · StockAliment · StockVeto · AlerteServeur · Note

### Alertes GTTT (6 règles)
R1 Mise-bas · R2 Sevrage · R3 Retour chaleur · R4 Mortalité · R5 Stock · R6 Regroupement

## B. Top 10 gaps critiques (naisseur-engraisseur)

| # | Gap | Domaine | Impact | Complexité |
|---|---|---|---|---|
| 1 | **Pas de calendrier repro** (saillies planifiées, MB à venir 30j) | Repro | ⚠️ pilotage aveugle | M |
| 2 | **Pas d'écran maternité** (J-1 à J+21, pesée porcelets, prise alim truie) | Maternité | critique — 80% mortalité est ici | M |
| 3 | **Pas de suivi post-sevrage** (GMQ, IC, homogénéité lot) | Post-sevrage | passe inaperçu | L |
| 4 | **Pas d'écran engraissement** (poids vifs, date abattage, calibrage) | Engraissement | finalité économique invisible | L |
| 5 | **Pas de plan alimentaire** (ration par catégorie × effectif = conso/j) + jours couverture stock | Aliments | devine à la main | M |
| 6 | **Pas de calendrier vaccinal** / protocoles prophylactiques récurrents | Santé | oublis fréquents | M |
| 7 | **Pas de KPI performance** (NV moyen, taux mortalité, intervalle sevrage-saillie, sevrés/truie/an) | Pilotage | pas de benchmark | S |
| 8 | **Pas de dashboard éco** (coût aliment/j, coût médical/lot, marge par porcelet) | Finances | ROI invisible (Sheets a FINANCES table non branchée) | M |
| 9 | **Pas de saisie poids rapide** (bulk edit terrain — pesée hebdo) | Terrain | aujourd'hui 1 par 1, friction | S |
| 10 | **Pas de vue "historique truie"** au-delà des traitements — lifetime record (MB, NV, mortalité cumul) | Repro perf | impossible de réformer intelligemment | S |

## C. Architecture nav proposée — 5 onglets

Rupture avec l'actuel "Aujourd'hui / Troupeau / Journal / Plus". Proposition :

```
┌─ COCKPIT ──────── Vue pilote : KPI, alertes serveur, quick actions
├─ TROUPEAU ─────── Cheptel (truies + verrats) + Bandes (porcelets)
├─ CYCLES ───────── Repro · Maternité · Post-sevrage · Engraissement
├─ RESSOURCES ───── Aliments (stock + plan ration) · Véto (stock + protocoles)
└─ PILOTAGE ─────── Perf (KPI) · Finances · Audit · Réglages
```

**Justification découpage** :
- **Cockpit** = ce que le manager regarde matin midi soir (KPI + alertes + 3 actions)
- **Troupeau** fusionne cheptel + bandes (un seul "qui possède quoi")
- **Cycles** = vues temporelles (avant/pendant/après — naisseur-engraisseur pur)
- **Ressources** = ce qu'on stocke et ce qu'on planifie
- **Pilotage** = meta (perf, finance, admin)

## D. Écrans additionnels à créer (10)

1. **Cockpit** (remplace Dashboard actuel) — KPI sparkline + 3 alertes top + 3 quick actions
2. **Calendrier Repro** (vue mois + liste J-7/J+30)
3. **Maternité** (liste truies en maternité + form rapide pesée/mortalité porcelets)
4. **Post-sevrage** (liste bandes sevrées < 70j + GMQ calculé)
5. **Engraissement** (liste bandes > 70j + projection abattage)
6. **Plan Alimentation** (ration × effectif par catégorie = conso/j, jours couverture par aliment)
7. **Calendrier Vaccinal** (protocoles récurrents avec prochaines échéances)
8. **KPI Perf** (sevrés/truie/an, mortalité par stade, intervalle sevrage-saillie moy)
9. **Finances** (coût aliment/lot, coût médical, marge brute estimée)
10. **Saisie poids bulk** (mode terrain : scan boucle → poids → next)

**À fusionner/supprimer** :
- `/stock` + `/stock/aliments` (doublon) → garder `/ressources/aliments`
- `/more` fourre-tout → éclater dans Pilotage + Ressources
- `/audit` + `/sync` → admin, visibles uniquement si rôle ADMIN

## E. Top 3 quick wins (1-2j chacun)

1. **Cockpit refondu** : 4 KPI en 1 coup d'œil (Truies pleines / Bandes sous-mère / Stock critique / Alertes jour) — **valeur immédiate pour pilotage distant**
2. **Plan Alimentation auto** : effectif × ration = conso/j ; alerte "stock aliment X tient N jours" — **gain argent direct** (pas de rupture, pas de surstock)
3. **KPI Perf truie** dans AnimalDetailView : mini stats bar (moy NV, mortalité cumul, nb portées/an) — **réforme intelligente des truies faibles**
