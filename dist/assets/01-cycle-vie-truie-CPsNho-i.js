const e=`---
title: Le cycle de vie de la truie
slug: cycle-vie-truie
category: cycles
level: débutant
reading_time_min: 4
sources:
  - ITP (2023). Cycle de production en élevage porcin
  - IFIP (2024). Gestion technique du troupeau de truies
  - INRAE (2022). Reproduction de la truie en milieu tropical
---

## Introduction

Le cycle de vie reproductif d'une truie est la base de la production porcine. Maîtriser ses étapes permet d'anticiper les saillies, de préparer les mises-bas et d'optimiser la productivité du troupeau. Pour un élevage de 120 truies en Côte d'Ivoire, chaque jour gagné sur le cycle représente plusieurs porcelets supplémentaires sur l'année.

## Mécanisme

Le cycle complet d'une truie reproductrice se déroule en cinq grandes phases enchaînées.

**Saillie (J0)** : la truie est en chaleur 3 à 7 jours après le sevrage. Le verrat ou l'insémination artificielle interviennent à ce moment précis. Cette date sert de référence pour tout le cycle.

**Gestation (J0 à J115)** : durée de 115 jours, avec une marge de plus ou moins 2 jours. La référence ITP/IFIP est de 114 jours, en pratique la durée varie de 113 à 117 jours selon la lignée et la parité. PorcTrack utilise 115 jours comme repère par défaut, modifiable dans les Réglages avancés (V71). L'échographie à J28 confirme la fécondation et permet d'écarter les truies vides. La gestation se découpe en trois phases : implantation, croissance, finition.

**Mise-bas (J115)** : la truie met au monde sa portée, en moyenne 12 à 14 porcelets. La maternité doit être prête dès J111 (nettoyage, désinfection, point chaud).

**Lactation (J115 à J136-J143)** : la truie allaite ses porcelets pendant 21 à 28 jours. Sevrage anticipé en climat tropical pour limiter l'amaigrissement de la truie.

**Sevrage et retour en chaleur** : 3 à 7 jours après le sevrage, la truie revient en chaleur et un nouveau cycle peut démarrer.

## Repères pratiques

- Gestation : **115 jours** (± 2 jours, ITP : 114 j)
- Lactation : **21 à 28 jours**
- Retour en chaleur post-sevrage : **3 à 7 jours**
- Cycle complet (saillie à saillie) : **~150 jours**
- Nombre de portées par truie/an : **2,3 à 2,4** (objectif technique)
- Carrière reproductive moyenne : **5 à 7 portées** avant réforme

## Bonnes pratiques

- Noter la date de saillie à J0 dans PorcTrack dès l'observation des chaleurs
- Programmer l'échographie à J28 pour détecter rapidement les truies vides
- Préparer la maternité 4 à 5 jours avant la date prévue de mise-bas (J111)
- Sevrer entre J21 et J28 selon l'état de la truie et le poids des porcelets
- Surveiller le retour en chaleur dans les 7 jours post-sevrage et noter les retards
`;export{e as default};
