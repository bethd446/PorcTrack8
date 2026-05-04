# Contenu éducatif V70 — Draft

Premier draft du contenu éducatif PorcTrack V70 destiné à Aïssata (éleveuse, Côte d'Ivoire, 120 truies). À valider en bloc par Christophe avant intégration.

## Inventaire

### Tooltips — `tooltips.json`
15 entrées (30 à 50 mots chacune).

| Slug | Label | Mots |
|------|-------|------|
| saillie | Saillie | 42 |
| echographie | Échographie | 36 |
| mise-bas | Mise-bas | 33 |
| sevrage | Sevrage | 39 |
| isse | ISSE | 36 |
| iem | IEM | 35 |
| gestation | Gestation | 38 |
| lactation | Lactation | 34 |
| reforme | Réforme | 37 |
| parite | Parité | 39 |
| lignee | Lignée | 35 |
| tournee | Tournée | 35 |
| pesee | Pesée | 38 |
| mortalite | Mortalité | 38 |
| vaccin | Vaccin | 36 |

### Articles — `articles/*.md`
5 articles (200 à 500 mots hors frontmatter).

| Fichier | Niveau | Mots (body) |
|---------|--------|-------------|
| 01-cycle-vie-truie.md | débutant | 357 |
| 02-isse-optimisation.md | intermédiaire | 322 |
| 03-biosecurite-bases.md | débutant | 332 |
| 04-alimentation-gestation.md | intermédiaire | 359 |
| 05-sevrage-timing-conditions.md | intermédiaire | 369 |

## Statut de validation

**Niveau** : draft V2 (post-tranches Christophe Q1/Q3/Q5) — 2026-05-04.
**Validateur** : Christophe (tranches en bloc, voir section Questions remontées).
**Action attendue** : intégration UI Phase 6A (V70Router lit `tooltips.json` + `articles/*.md`).

## Sources utilisées

- **ITP** (Institut Technique du Porc, France) — chiffres de référence (114j gestation, ISSE > 12, mortalité allaitement)
- **IFIP** (Institut Français du Porc) — conduite technique du troupeau, GTTT
- **INRAE** (Institut National de Recherche pour l'Agriculture) — physiologie reproduction, adaptations climat tropical
- **FAO** (article 03 biosécurité) — guide PPA Afrique de l'Ouest

## Questions remontées à Christophe (statut post-validation)

Statut des 7 questions remontées sur le draft V1, après tranches Christophe du 2026-05-04.

### Q1 — Durée de gestation : 114 ou 115 jours ? — **TRANCHÉE**
- **Décision Christophe** : **115 jours partout** dans tooltips et articles, avec note explicative mentionnant la référence ITP (114 j, plage 113-117 j). L'app est la source de vérité, le contenu s'aligne sur `CLAUDE.md`.
- **Application V2** : tooltips `saillie`, `mise-bas`, `gestation` mis à jour ; articles 01 et 04 mis à jour ; note explicative ajoutée dans 01.

### Q2 — Lactation 21 ou 28 jours par défaut ? — **VALIDÉE**
- **Décision Christophe** : la fourchette 21 à 28 jours du draft V1 est conservée. Tooltip `lactation` et article 01 inchangés.

### Q3 — Retour chaleur post-sevrage : 3-7 ou 5-7 jours ? — **TRANCHÉE (rétractation 2026-05-05)**
- **Tranche initiale** : 5-7j (V2)
- **Tranche finale** : **3-7j** — rétractation après audit code par sub-agent CLEANUP-CLAUDE-MD
- **Justification** : code actuel utilise 3-7j en 3 fichiers (`alertEngine.ts`, `ProtocolsView.tsx`, `SaillieSuiviPanel.tsx`). Cohérent CLAUDE.md. Plus inclusif terrain (capture cas J3-J4 post-sevrage abrupt).
- **Tooltip final** : "Retour en chaleur après sevrage : généralement 3 à 7 jours. Référence ITP : médiane 5-7 jours. PorcTrack alerte si pas de saillie observée à J+7 (règle R3)."
- **Statut** : V3 contenu éducatif aligné sur code (3-7j)

### Q4 — Réforme zootechnique vs économique — **VALIDÉE**
- **Décision Christophe** : définition unique simple conservée. Pas de dédoublement `reforme-technique` / `reforme-economique`.

### Q5 — Mortalité allaitement : seuil 12 ou 15 % ? — **TRANCHÉE**
- **Décision Christophe** : reformulation tooltip selon pattern **cible métier vs alerte PorcTrack**. Texte final imposé : "Pourcentage de porcelets décédés entre la naissance et le sevrage. Cible ITP : moins de 12%. PorcTrack déclenche une alerte automatique si la mortalité dépasse 15% (règle R4)."
- **Application V2** : tooltip `mortalite` reformulé. Pattern à appliquer pour tout futur tooltip mentionnant un seuil chiffré (voir Annexe D du brief technique, règle 2).

### Q6 — Lignées en Côte d'Ivoire — **VALIDÉE**
- **Décision Christophe** : approche générique pro-rusticité conservée. Pas de citation de lignées commerciales (Pic, Hypor, Topigs).

### Q7 — Référence "PorcTrack" dans les définitions — **VALIDÉE**
- **Décision Christophe** : mention "PorcTrack" gardée dans les tooltips quand c'est pertinent (alertes automatiques, paramétrage). Voir Annexe D, règle 3.

### Q8 — Aucun cas où un article dépasse 500 mots
Tous les articles tiennent dans la fourchette. Pas de cas STOP à remonter.

## Limites assumées du draft

- Chiffres "moyennes ITP/IFIP France" appliqués à un élevage ivoirien — Christophe peut juger de la pertinence.
- Pas de contenu sur la peste porcine africaine en tant que tel (juste référence dans biosécurité). À discuter pour l'inclure dans une V2.
- Pas de tooltip sur l'insémination artificielle — à ajouter si Aïssata utilise l'IA.
- Niveau "avancé" non couvert dans les articles V1 — tous en débutant ou intermédiaire.

## Prochaines étapes après validation

1. Retour Christophe avec annotations
2. V2 du draft (corrections + arbitrages Q1 à Q7)
3. Intégration UI : composant `EduTooltip` lit `tooltips.json`, route `/encyclopedie` lit `articles/*.md`
4. Plan de contenu V2 : identifier les 5 prochains articles prioritaires
