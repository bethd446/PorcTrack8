# Session live designer pro — landing page PorcTrack

**Date** : 2026-05-09
**Contexte** : Christophe en appel avec un designer professionnel. Notes en temps réel pour retenir les conseils et les appliquer sur la landing actuelle (`src/pages/landing-v2/`, déployée sur https://porctrack.tech).

**État landing au moment de la session** : V73 vague P livrée (refonte landing-v2 + 13 images premium Nano Banana, DNA "Terrain Vivant" photoréaliste : bois clair + inox + caillebotis béton, compression sharp+mozjpeg ~30x, fix typo FROISSEES → FROISSÉES).

---

## Méthodologie générale exposée par le designer

1. **Commencer par chercher des inspirations** avant de designer quoi que ce soit
2. **Attaquer directement par la hero section** (entrée principale du visiteur, plus fort levier de conversion)
3. **Favoriser le copywriting** — les mots passent avant le visuel
4. **Viser un design le plus professionnel possible**
5. **Objectif business explicite : augmenter le taux de conversion** (pas faire joli, faire convertir)

---

## Conseils détaillés

> *(captés au fil de l'écoute — chaque section prend forme au fur et à mesure)*

### Inspirations / références

- **Source d'inspiration design recommandée** : *[à confirmer — "design pour trouver" → probable : Dribbble. Sinon Designspiration / Mobbin / Land-book à creuser]*
- À utiliser comme moodboard pour la hero et les sections suivantes — chercher des patterns landing modernes 2026.

### Icônes — librairie validée

- **HugeIcons** : https://hugeicons.com/icons/all/
  - Bibliothèque d'icônes SVG personnalisables (couleur, stroke, taille)
  - Recommandée par le designer pour apporter une **touche de modernité** à PorcTrack
  - À substituer aux emojis et aux icônes Ionic / Lucide actuelles dans la landing et probablement plus tard dans l'app

**Faits techniques (web fetch 2026-05-09)** :
- **51 300 icônes** au total
- **Styles disponibles** : Rounded (Bulk, Solid, Two-tone, Duotone, Stroke) · Standard (Duotone, Solid, Stroke) · Sharp (Solid, Stroke)
- **Seul style gratuit confirmé** : `Stroke-Rounded` — tout le reste est marqué **PRO** (plan payant)
- **Formats / intégrations** : SVG, package NPM React, icon font (CDN), plugin Figma, MCP server (Node)
- **Catégories visibles** : Foods (1 260), Weather (960), Buildings (820). Pas de catégorie "Animals" standalone — il faudra chercher icône par icône dans Foods et autres pour truie / porcelet / ferme

**Décisions à prendre** :
- Style global de l'app : **Stroke-Rounded** (gratuit + cohérent moderne + lisible mobile) sauf si PRO budget validé
- Vérifier la licence pour usage commercial (porctrack.tech = produit en prod payant à terme)
- Icônes-clés à pré-mapper avant intégration : truie, verrat, porcelet, mise-bas, saillie, sevrage, alimentation, vétérinaire, calendrier, alerte, statistiques, ferme/exploitation
- Choisir entre **package NPM React** (DX top, tree-shaking) vs **SVG individuels** (zéro dépendance, contrôle total) — recommandation par défaut : NPM React

### Hero section


### Copywriting


### Composants & sections suivantes


### Couleurs / typographie / atmosphère


### Conversion (CTA, friction, social proof)


---

## Points à appliquer sur PorcTrack — backlog

| # | Conseil | Source | Application proposée | Statut |
|---|---|---|---|---|

---

## Questions ouvertes pour le designer (à lui poser)


---

## Décisions prises pendant la session

- **Stratégie de séquencement** : on continue le chantier en cours (naming-coherence V75) jusqu'au bout. Pendant ce temps, on capitalise les conseils designer pour préparer le **chantier suivant = refonte landing page** (avec inspirations + HugeIcons en input).
- **Librairie d'icônes** : HugeIcons retenue (touche de modernité, SVG personnalisables).

