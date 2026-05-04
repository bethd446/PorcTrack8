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

**Niveau** : draft initial — non validé.
**Validateur** : Christophe (validation en bloc avec commentaires).
**Action attendue** : revue, annotations, retour à l'agent rédacteur pour V2.

## Sources utilisées

- **ITP** (Institut Technique du Porc, France) — chiffres de référence (114j gestation, ISSE > 12, mortalité allaitement)
- **IFIP** (Institut Français du Porc) — conduite technique du troupeau, GTTT
- **INRAE** (Institut National de Recherche pour l'Agriculture) — physiologie reproduction, adaptations climat tropical
- **FAO** (article 03 biosécurité) — guide PPA Afrique de l'Ouest

## Questions remontées à Christophe (à trancher)

Liste des points d'ambiguïté métier qui n'ont pas été tranchés par l'agent rédacteur, conformément à la consigne "ne pas trancher seul sur les ambiguïtés métier".

### Q1 — Durée de gestation : 114 ou 115 jours ?
- **Constat** : `CLAUDE.md` (constantes biologiques projet) indique **115 jours ± 2**. Sources ITP/IFIP grand public utilisent **114 jours ± 2** (3 mois, 3 semaines, 3 jours = 114).
- **Choix actuel du draft** : 114 jours (aligné sources externes).
- **Question** : faut-il aligner les contenus éducatifs sur la constante interne (115j) pour cohérence avec l'app, ou sur la référence ITP (114j) ?

### Q2 — Lactation 21 ou 28 jours par défaut ?
- **Constat** : `CLAUDE.md` indique **28 jours** comme constante. Pratique ITP varie 21 à 28j selon le type d'élevage. En climat tropical, 21 à 24j est souvent préférable (truie qui maigrit moins).
- **Choix actuel du draft** : fourchette 21 à 28 jours partout.
- **Question** : Aïssata sèvre-t-elle à un âge précis ? Si oui, ajuster le ton.

### Q3 — Retour chaleur post-sevrage : 3-7 ou 5-7 jours ?
- **Constat** : `CLAUDE.md` indique **3-7 jours**. Sources ITP/IFIP : **5-7 jours** (médiane 5j). 3 jours est rare et signale souvent une saillie chevauchée non détectée.
- **Choix actuel du draft** : 5 à 7 jours (référence ITP).
- **Question** : si la constante interne reste 3-7, faut-il l'aligner ?

### Q4 — Réforme zootechnique vs économique
- **Constat** : le terme "réforme" peut désigner la décision technique (truie infertile, ISSE faible) ou la décision économique (cours du marché, renouvellement programmé). Le tooltip actuel mélange les deux causes (âge, perf, infertilité, sanitaire).
- **Choix actuel du draft** : approche zootechnique large, sans distinction explicite.
- **Question** : faut-il dédoubler en deux tooltips (`reforme-technique` / `reforme-economique`) ou garder une définition unique ?

### Q5 — Mortalité allaitement : seuil 12 ou 15 % ?
- **Constat** : `CLAUDE.md` parle de **> 15 %** comme seuil d'alerte. ITP cite **12 %** comme cible technique. Le tooltip mortalité mentionne les deux (alerte 15 %, cible 12 %), ce qui peut être ambigu.
- **Choix actuel du draft** : alerte > 15 %, cible 12 %.
- **Question** : à clarifier — sont-ce deux concepts distincts ou doit-on en supprimer un ?

### Q6 — Lignées en Côte d'Ivoire
- **Constat** : la mention "lignées européennes pures" vs "lignées adaptées tropical" dans le tooltip `lignee` est une simplification. Beaucoup d'élevages ivoiriens utilisent des Large White × Landrace en bâtiments climatisés.
- **Choix actuel du draft** : conseil général pro-rusticité, sans nommer de lignée.
- **Question** : faut-il citer des lignées précises (Pic, Hypor, Topigs) ou rester générique ?

### Q7 — Référence "PorcTrack" dans les définitions
- **Constat** : 3 tooltips citent "PorcTrack" (saillie, mise-bas — implicitement). Risque de couplage fort contenu/produit.
- **Choix actuel du draft** : citation maintenue car cohérente avec l'usage in-app.
- **Question** : OK pour Christophe ou neutraliser pour une encyclopédie réutilisable hors app ?

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
