const e=`---
title: Calcul des coûts alimentaires
slug: couts-alimentaires
category: économique
level: intermédiaire
reading_time_min: 4
sources:
  - ITP (2023). Indicateurs économiques en élevage porcin
  - IFIP (2024). Coût alimentaire par kg produit
---

## Introduction

L'alimentation représente 65 à 75 % du coût de production d'un porc charcutier. C'est de loin le premier poste de dépense, et donc le premier levier d'optimisation. Maîtriser son indice de consommation et sa formule d'aliment, c'est gagner directement sur la marge nette par porc vendu. PorcTrack centralise les achats d'aliment et le suivi des consommations pour calculer le coût alimentaire réel par bande.

## Pourquoi

Le coût alimentaire d'un porc charcutier se calcule simplement : indice de consommation (IC) multiplié par le prix de l'aliment, multiplié par le poids vif produit. Un IC de 3,0 sur un porc de 100 kg avec un aliment à 350 FCFA/kg donne 105 000 FCFA d'aliment pour 100 kg vif. À 2 100 FCFA/kg vendu, le porc rapporte 210 000 FCFA brut, soit une marge brute aliment de 105 000 FCFA avant les autres charges.

Trois leviers font bouger ce coût :

**Indice de consommation** : passer de IC 3,2 à IC 2,9 sur un porc de 100 kg, c'est 30 kg d'aliment économisés, soit 10 500 FCFA par porc, 1 050 000 FCFA sur 100 porcs vendus.

**Prix d'achat de l'aliment** : achat groupé, négociation, comparaison entre fournisseurs. 10 % de gain sur le prix tonne = équivalent à un IC qui baisse de 0,3.

**Phases d'alimentation** : un seul aliment du sevrage à la finition coûte plus cher qu'une formule par phase, car on sur-nourrit en protéines coûteuses sur les 30 derniers kilos.

## Repères pratiques

- Indice de consommation cible engraissement : **2,8 à 3,2 kg aliment / kg gain**
- Coût aliment dans le coût total porc : **65 à 75 %**
- Prix vente PorcTrack par défaut : **2 100 FCFA/kg vif**
- Coût fixe par porc PorcTrack : **5 000 FCFA**
- Sortie abattoir cible : **110 kg vif** (alerte R16)
- Marge brute aliment cible : **>40 %** du chiffre d'affaires porc

## Bonnes pratiques

- Saisir chaque achat d'aliment dans PorcTrack (date, fournisseur, prix, quantité)
- Calculer l'IC par bande après chaque sortie abattoir et comparer entre bandes
- Adapter la formule par phase : démarrage, croissance, engraissement, finition
- Surveiller les rebuts d'aliment au sol (>5 % = mangeoires à régler)
- Anticiper les achats sur 1 à 2 mois pour profiter des baisses de marché
- Comparer prix par tonne entre fournisseurs au moins une fois par trimestre
`;export{e as default};
