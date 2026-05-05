const e=`---
title: Préparation à la mise-bas
slug: preparation-mise-bas
category: cycles
level: débutant
reading_time_min: 4
sources:
  - ITP (2023). Conduite de la mise-bas et accueil du porcelet
  - IFIP (2024). Préparation de la maternité, protocole pratique
---

## Introduction

La mise-bas est le moment le plus critique du cycle de la truie. Tout ce qui est mal préparé en amont se paie en mortalité néonatale, en stress de la truie et en pertes de productivité sur la portée. La règle d'or : la maternité doit être prête au minimum 4 jours avant la date prévue, soit J111 pour une gestation de 115 jours.

## Pourquoi

Une truie qui arrive en maternité dans un environnement propre, calme et tempéré met bas plus vite, expulse mieux son délivre et accepte plus facilement de se laisser téter. À l'inverse, une mise-bas dans un box sale, bruyant ou trop chaud allonge la durée de mise-bas (>4 heures), augmente le nombre de mort-nés et les troubles post-partum (métrite, agalactie).

PorcTrack programme automatiquement l'alerte R1 (Mise-Bas) entre J-3 et J+2 de la date prévue, avec passage en priorité critique à J0. Cette alerte sert à enclencher le protocole de préparation. La date prévue est calculée à partir de la saillie + 115 jours (référence ITP, modifiable dans les Réglages).

## Repères pratiques

- Date prévue mise-bas : **saillie + 115 jours** (± 2 j, plage 113 à 117 j)
- Préparation maternité : **dès J111** (4 jours avant la date prévue)
- Alerte PorcTrack R1 active : **J-3 à J+2**
- Température cible truie en maternité : **22 à 26 °C**
- Température point chaud porcelets : **32 à 34 °C** (J0 à J7)
- Durée de mise-bas normale : **2 à 4 heures**
- Surveillance rapprochée : **24 premières heures** post-mise-bas

## Bonnes pratiques

- Nettoyer et désinfecter la loge maternité dès le sevrage de la portée précédente
- Faire un vide sanitaire minimum de 5 jours entre deux truies dans la même loge
- Installer la lampe ou le nid chauffant 24 h avant l'entrée de la truie (J110)
- Vérifier le bon fonctionnement de l'abreuvoir avant l'arrivée de la truie
- Transférer la truie en maternité à J110-J111, sans précipitation, le matin
- Réduire l'aliment dans les 48 heures pré-mise-bas (transit et pré-éclampsie)
- Préparer la trousse de mise-bas : iode, gants, fil, ciseaux, lampe de poche
- Prévoir une présence sur les 24 premières heures (écrasements, hypothermie)
- Enregistrer la mise-bas dans PorcTrack dès la fin (nés vivants, mort-nés, momifiés)
`;export{e as default};
