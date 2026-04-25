# AUDIT GOOGLE SHEETS — PorcTrack 8 — 2026-04-25

> Audit en direct exécuté le 25/04/2026. Données lues via GAS endpoint.
> Token: `PORC800_JLB9kapOKuHRg-7CX6WPlSqMSvt5sU3v`

---

## RÉSUMÉ EXÉCUTIF

| Onglet | Rows lus | Statut |
|--------|----------|--------|
| REPRODUCTION | 29 | ⚠️ Anomalies |
| TRUIES_REPRODUCTION | 20 | ⚠️ Anomalies |
| PORCELETS_BANDES | 18 | ⚠️ Anomalies |
| STOCK_ALIMENTS | 10 | ⚠️ 3 alertes stock |
| STOCK_VETO | 86 | ❌ Données mélangées |
| ALERTES_ACTIVES | 15 | ❌ Faux positifs mortalité |
| VERRATS | 3 | ✅ OK |
| CHEPTEL | 25 | ⚠️ Données JSON parasites |
| CHEPTEL_GENERAL | 14 | ⚠️ Incohérences effectifs |
| MATERNITE | 12 | ⚠️ Données périmées (05/04) |
| POST_SEVRAGE | 28 | ⚠️ Données périmées (05/04) |
| LIFECYCLE | 23 | ⚠️ Données périmées + erreur format |
| SAISIE_SEMAINE | 48 | ❌ #ERROR! sur 8 cellules |
| PARAMETRES | 24 | ⚠️ 2 valeurs mal formatées |
| SANTE | 4 | ⚠️ Structure brisée (1 en-tête, 3 lignes) |

---

## ✅ DONNÉES PRÉSENTES ET COHÉRENTES

### Troupeau (conforme aux attentes)
- **2 verrats** présents : V01 Bobi (B.89, Thomasset) + V02 Aligator (B.100, Azaguié) — statut Actif ✅
- **17 truies** dans TRUIES_REPRODUCTION (T01–T19, avec T08 absent du registre, T09 mal nommée) ✅
- **Ferme A130 non mentionnée** dans les onglets (cohérent — pas de colonne ferme, c'est un projet unique)

### Verrats (VERRATS — tab)
- V01 Bobi, V02 Aligator — 2 lignes propres, statuts corrects ✅

### Stock alimentaire (STOCK_ALIMENTS)
- 9 lignes de stock + 1 en-tête = 9 produits inventoriés au 21/04/2026
- Maïs (3050 kg), Alim. gestation (500 kg), Alim. engraissement (500 kg) — au-dessus des seuils ✅
- Alim. lactation (200 kg = exactement au seuil 200) — en zone orange
- Alim. porcelet (150 kg > seuil 100) — OK mais à surveiller

### Paramètres zootechniques (PARAMETRES)
- Durée gestation 114j, sevrage J21, NV objectif 12, fertilité 92.3% ✅
- Valeurs conformes aux références NRC/Max Farmer

### Saillies du 05/04/2026
- 5 truies saillies le 05/04 : T7 Choupette, T8 Zapata, T11 Ficelle, T14 Anillette, T15 Pirouette ✅
- T11 : retour chaleur documenté le 21/04/2026 — statut "Non confirmée" dans REPRODUCTION ✅

### Bande 26-T18-01 (L5 attendue)
- T18 B.85 — 12 NV — MB 28/03/2026 — **sevrage réel le 20/04/2026** ✅ (urgent du 18/04 effectué)
- Correspond à la "bande sevrée le 20/04/2026" attendue dans le brief

---

## ⚠️ ANOMALIES DÉTECTÉES

### ANOMALIE 1 — REPRODUCTION : données périmées (critique)
- **Onglet REPRODUCTION, ligne R1** : `"Mise a jour: 05/04/2026"` → L'onglet n'a pas été mis à jour depuis 3 semaines
- R3–R6 (T17, T9, T16, T12) : notes disent "MB dans 12/14/15/30 jours" calculés depuis le 05/04
  - T17 B.86 : MB prévue 17/04 → **date passée de 8 jours (25/04)**, note dit "MB dans 12 jours" — faux
  - T9 B.37 : MB prévue 19/04 → **date passée de 6 jours**, note dit "MB dans 14 jours" — faux
  - T16 B.85 : MB prévue 20/04 → **date passée de 5 jours**, note dit "MB dans 15 jours" — faux
  - T12 B.10 : MB prévue 05/05 → note dit "MB dans 30 jours" depuis le 05/04, maintenant 10 jours
- **Correction attendue** : mettre à jour la date de MAJ et recalculer les notes dynamiques

### ANOMALIE 2 — REPRODUCTION : doublons de lignes (structurel)
- **Lignes R7–R11** (saillies actives) et **R22–R26** (même 5 saillies) sont dupliquées
  - R7: T7 Choupette saillie 05/04 → dupliqué en R22
  - R8: T8 Zapata → dupliqué en R23
  - R9: T11 Ficelle → dupliqué en R24
  - R10: T14 Anillette → dupliqué en R25
  - R11: T15 Pirouette → dupliqué en R26
- **Correction attendue** : supprimer les lignes R22–R26 (doublons de la section historique)

### ANOMALIE 3 — REPRODUCTION : ligne R27 incohérente
- R27 : `["T10",37,"--","2026-04-05T07:00:00.000Z","V1 ou V2","2026-07-14T07:00:00.000Z","Saillie","Saillie 05/04 - en cours"]`
- T10 est déjà documentée dans TRUIES_REPRODUCTION comme "En maternité" avec MB 23/03/2026
- La boucle est 37 mais dans CHEPTEL T9=boucle 10, T10=boucle 29 → incohérence d'ID/boucle
- **Correction attendue** : vérifier si T10 a réellement été saillée le 05/04 (post-sevrage de sa portée non clôturée)

### ANOMALIE 4 — REPRODUCTION : ligne R20 / R28 format log brut dans onglet
- R20 : `"2026-04-05 | T7 | mise_bas | NV:6 MN:0 | Mise bas T7 - NV:6 MN:0 | "`
- R28 : `"2026-04-07 | T17 | mise_bas | NV:0 MN:0 | Mise bas | "`
- Ces lignes sont des **logs bruts injectés** dans l'onglet REPRODUCTION (mauvais onglet)
- T17 : mise bas log avec NV:0 MN:0 — anormal pour une gestation signalée
- **Correction attendue** : déplacer vers SANTE ou LIFECYCLE, nettoyer REPRODUCTION

### ANOMALIE 5 — TRUIES_REPRODUCTION : T09 nommée "Zapata" (conflit avec T08)
- R7 : T09 nommée "Zapata" B.31
- R8 dans CHEPTEL : T8 boucle 31, nom "Zapata"
- Dans TRUIES_REPRODUCTION T09 = boucle B.31 = Zapata, mais dans CHEPTEL T8 = boucle 31 = Zapata
- **Vrai problème** : T08 et T09 ont des IDs/boucles qui se croisent selon l'onglet
  - CHEPTEL : T8=B.31 Zapata, T9=B.10
  - TRUIES_REPRO : T09=B.31 Zapata, T15=Anillette B.39, T16=Pirouette B.26
- **Correction attendue** : harmoniser la correspondance ID/Boucle/Nom entre CHEPTEL et TRUIES_REPRODUCTION

### ANOMALIE 6 — TRUIES_REPRODUCTION : T14 sans nom, boucle B.24 (conflit CHEPTEL)
- TRUIES_REPRO R9 : T14 boucle B.24, pas de nom
- CHEPTEL R18 : T14 boucle 39, nom "Anillette"
- PORCELETS_BANDES R8 : 26-T15-01 attribue "Anillette" à T15 B.39
- **Correction attendue** : T14 = Anillette B.39 (pas B.24), corriger dans TRUIES_REPRODUCTION

### ANOMALIE 7 — TRUIES_REPRODUCTION : T11 statut "Pleine" vs REPRODUCTION "Non confirmée"
- TRUIES_REPRO R8 : T11 statut **"Pleine"**, MB prévue 28/07/2026
- REPRODUCTION R9 : T11 statut **"Non confirmée"** — retour chaleur 21/04/2026
- L'état réel est "Non confirmée" / retour chaleur → T11 n'est PAS gestante
- **Correction attendue** : mettre T11 à "En attente re-saillie" dans TRUIES_REPRODUCTION, effacer date MB 28/07

### ANOMALIE 8 — TRUIES_REPRODUCTION : T14 "En maternité" avec MB prévue 01/04 dépassée
- R9 : T14 statut "En maternité", date MB prévue `2026-04-01` (passée)
- La MB a eu lieu (PORCELETS_BANDES R15 confirme MB 01/04 — 13 porcelets)
- Date MB prévue devrait être effacée ou remplacée par date MB réelle
- **Correction attendue** : champ "Date MB prevue" → vider (MB déjà effectuée), ajouter date MB réelle

### ANOMALIE 9 — TRUIES_REPRODUCTION : T18 "En maternité" alors que sevrage réel 20/04
- R14 : T18 B.85, statut "En maternité", sevrage prévu 18/04 noté "urgent"
- PORCELETS_BANDES R17 confirme sevrage réel le **20/04/2026**
- **Correction attendue** : T18 → statut "En attente saillie" (sevrée + 5j post-sevrage = retour chaleur imminent)

### ANOMALIE 10 — PORCELETS_BANDES : lignes de recap / totaux mélangées avec données
- R14 : `["TOTAL 15 portées","","","",116,5,111,...,"LIGNE RECAP"]` — ligne de total dans les données
- Interférera avec les calculs applicatifs qui parcourent les lignes
- **Correction attendue** : déplacer la ligne TOTAL en bas (après R17), hors de la plage de données actives

### ANOMALIE 11 — PORCELETS_BANDES : portée 26-T15-01 avec ID boucle mère B.39 / 26-T14-01 avec B.39
- R8 : 26-T15-01, Boucle mère B.39 (Anillette)
- LIFECYCLE R8 : 26-T14-01, Boucle B.39 → ID de portée T14 mais boucle Anillette = T15
- **Correction attendue** : harmoniser — Anillette = T15 dans PORCELETS_BANDES, T14 dans LIFECYCLE (ou vice versa selon vérité terrain)

### ANOMALIE 12 — PORCELETS_BANDES : bande L5 (26 porcelets sevrés le 20/04) non retrouvée
- Le brief mentionne "Bande active L5 (36 porcelets sevrés le 20/04/2026)"
- L'onglet PORCELETS_BANDES montre 26-T18-01 : 12 porcelets sevrés le 20/04
- Aucune bande de 36 porcelets sevrés le 20/04 — seul T18 (12 porc.) concorde avec la date
- Possiblement la "Bande L5" = regroupement de plusieurs portées — **non documenté dans le sheet**
- **Correction attendue** : documenter la constitution de la bande L5 si elle regroupe plusieurs portées

### ANOMALIE 13 — ALERTES_ACTIVES : 12 faux positifs "Mortalité élevée 100%"
- Toutes les alertes (R3–R13) signalent "Mortalité élevée: 100%" sur des portées sevrées
- Exemple R3 : "26-T7-01 — Mortalité élevée: 100%" → portée de 6 porcelets sevrés (0 morts)
- **Cause** : le moteur d'alertes calcule mortalité = porcelets disparus / NV initial, or les sevrés ne sont plus "vivants" dans la loge → 100% erroné
- R14 : "Sous mère — Mortalité élevée: 100% (2026-05-01)" — alerte future non-sens
- **Correction attendue** : corriger le calcul de mortalité dans alertEngine.ts — exclure les sevrés du calcul, ou corriger le script GAS qui génère ces alertes

### ANOMALIE 14 — CHEPTEL : 2 lignes JSON brutes en R23–R24
- R23 : `{"id":"V01","boucle":89,"nom":"Verrat","race":"M",...}`
- R24 : `{"id":"T3","boucle":23,"nom":"Truie","race":"F",...}`
- Ces lignes sont des **objets JSON injectés** directement dans la feuille (bug d'écriture)
- **Correction attendue** : supprimer R23 et R24 dans CHEPTEL

### ANOMALIE 15 — CHEPTEL : T9 boucle 10 (conflit avec T12 boucle 10)
- CHEPTEL R13 : T9 = boucle 10
- CHEPTEL R16 : T12 = boucle 10
- **Deux truies avec la même boucle 10** — impossible en élevage réel
- **Correction attendue** : vérifier terrain — T9 boucle réelle vs T12 boucle réelle et corriger

### ANOMALIE 16 — CHEPTEL_GENERAL : ligne R6 incohérente (effectifs incorrects)
- R6 : "En maternité" : effectif 4, mais détail liste 9 truies (T01,T02,T03,T06,T09,T11,T14,T15,T16)
- R7 : "Pleines (saillies)" : effectif 7, mais détail liste seulement 4 truies (T10,T13,T18,T19)
- R7 dates : "T10(19/04), T13(05/05), T18(20/04), T19(17/04)" — T18 et T19 ont MB passée
- **Correction attendue** : recalculer les effectifs par catégorie, MAJ avec données actuelles (25/04)

### ANOMALIE 17 — MATERNITE : données figées au 05/04/2026 (20 jours de retard)
- L1 Monette : statut "Allaitante J33" au 05/04 → maintenant J53 (si toujours en maternité)
- L3 Fillaou, L4 Anillette, L5 Zapata, L6 Pirouette : statuts "Saillée 05/04" → correct au 05/04 mais pas mis à jour
- L7 T6 : "Allaitante J22" → sevrage devrait être effectué
- **Correction attendue** : mettre à jour la date de MAJ et tous les statuts/jours post-MB

### ANOMALIE 18 — POST_SEVRAGE : données figées au 05/04/2026
- Bande 2 décrite comme "en retard (J29-J33)" → ces truies ont été sevrées le 10/04 (confirmé PORCELETS_BANDES)
- La "Bande 2" est maintenant en post-sevrage depuis J15, pas "sous mère en retard"
- **Correction attendue** : recréer l'onglet POST_SEVRAGE avec l'état réel au 25/04

### ANOMALIE 19 — LIFECYCLE : champ "Mortalité" = 0 pour toutes portées sevrées
- Les portées 26-T7-01, 26-T11-01 ont mortalité 0 mais NV=6 et NV=12, Vivants=6 et 12 → cohérent
- MAIS LIFECYCLE R14 (TOTAL) affiche NV Initial = 126 alors que PORCELETS_BANDES total = 116
  - Écart de 10 porcelets non expliqué
- **Correction attendue** : réconcilier les totaux NV entre LIFECYCLE et PORCELETS_BANDES

### ANOMALIE 20 — LIFECYCLE : ligne R18 format erroné (date au lieu de poids)
- R18 : Phase "Sous mère", Poids début = `"2026-05-01T07:00:00.000Z"` au lieu d'un poids en kg
- La valeur attendue est le poids de naissance (~1.2–1.5 kg)
- **Correction attendue** : remplacer la date par le poids de naissance (ex: 1.5 kg)

### ANOMALIE 21 — SAISIE_SEMAINE : 8 cellules #ERROR!
- Lignes R17–R24 (stocks hebdomadaires) : colonne 4 contient `#ERROR!` au lieu du statut calculé
- Cela indique des formules Sheet cassées référençant des plages inexistantes
- **Correction attendue** : réviser les formules de la colonne D dans SAISIE_SEMAINE (plages de référence obsolètes)

### ANOMALIE 22 — STOCK_ALIMENTS : 3 produits sous seuil d'alerte
- ALIM-LACT : 200 kg = seuil 200 → exactement au minimum, zone critique si consommation continue
- ALIM-SON (Son de blé) : **50 kg < seuil 80** → stock BAS, commande urgente (48h)
- ALIM-COQ (Coquillage) : **20.3 kg < seuil 30** → stock très BAS, commande urgente
- ALIM-KPC : **300 kg < seuil 400** → stock BAS, ~1 semaine de consommation
- ALIM-SOJA : **200 kg < seuil 300** → stock BAS, 5-7 jours

### ANOMALIE 23 — STOCK_VETO : structure brisée (onglet multi-usage)
- L'onglet STOCK_VETO (86 rows) mélange en un seul tab :
  1. Stock vétérinaire (R1–R7) — 7 produits
  2. Lignes vides + headers (R8–R10)
  3. Registre des traitements (R11–R13)
  4. Protocole biosécurité (R15–R33)
  5. Inventaire pharmacie daté 19/03/2026 (R36–R63)
  6. Synthèse pharmacie (R65–R69)
  7. Alerte sélénium (R71–R72)
  8. Traitements individuels (R75–R84)
- **Produits en RUPTURE** : Fer injectable (0 doses), Ivermectine (0 ml), Anti-diarrhéique (0 ml)
- **Oxytocine = 0** : CRITIQUE pour les mises bas
- **Correction attendue** : séparer en onglets distincts (STOCK_VETO, TRAITEMENTS, PROTOCOLES_SANTE)

### ANOMALIE 24 — PARAMETRES : 2 valeurs mal formatées
- R7 : "Sevres/truie objectif" → valeur 10.5, colonne Ref = `"2026-12-09T08:00:00.000Z"` (date au lieu de valeur de référence)
- R10 : "Retour chaleur post-sevrage" → colonne Ref = `"2026-06-04T07:00:00.000Z"` (date au lieu de "5-7 j")
- **Correction attendue** : remplacer les dates erronées par les valeurs de référence correctes

### ANOMALIE 25 — CHEPTEL : T04 Pistachette statut "Observation" avec note "résolue 05/04"
- CHEPTEL R8 : T4 B.19 statut "Observation" note "Observation résolue 05/04"
- TRUIES_REPRO R16 : T04 statut "À surveiller", note "Refus allaitement — pas encore saillie"
- Statuts contradictoires entre les deux onglets
- **Correction attendue** : harmoniser le statut de T04 (si observation résolue → "En attente saillie" ou "Flushing")

---

## ❌ DONNÉES MANQUANTES

### 1. Aucun enregistrement de mise bas pour T17, T9, T16 post-04/2026
- T17 MB prévue 17/04, T9 MB prévue 19/04, T16 MB prévue 20/04
- Ces dates sont passées (25/04) mais aucune ligne de MB dans PORCELETS_BANDES pour ces truies
- Soit les mises bas n'ont pas eu lieu (problème), soit elles n'ont pas été saisies

### 2. Re-saillie de T11 non documentée
- T11 : retour chaleur signalé le 21/04/2026 (boucle 38, cycle ~21j depuis saillie du 05/04)
- Aucune ligne de re-saillie dans REPRODUCTION (les dates post-21/04 sont absentes)
- La re-saillie attendue vers le 25-28/04 n'est pas documentée

### 3. Bande L5 de 36 porcelets introuvable
- Le brief mentionne "Bande L5 — 36 porcelets sevrés le 20/04"
- Seule la portée 26-T18-01 (12 porcelets, sevrés 20/04) correspond à cette date
- 36 porcelets nécessiterait un regroupement de 3+ portées — non documenté

### 4. Onglet MORTALITES inexistant
- L'index des 19 tables ne liste pas d'onglet MORTALITES distinct
- Les mortalités sont éparpillées dans PORCELETS_BANDES (colonne Morts), SANTE, et les notes
- Manque un onglet MORTALITES dédié pour le suivi R4 (règle alerte >15%)

### 5. Lysine absente du stock alimentaire
- Le brief attend : Coquillage, Son blé, Maïs, Lysine, CMV
- STOCK_ALIMENTS liste 9 produits — **Lysine absente**
- CMV présent sous forme "ALIM-KPC" (prémix vitamines) et "ALIM-TRUIE-GEST/LACT" mais pas de Lysine pure
- **Correction attendue** : ajouter une ligne ALIM-LYS dans STOCK_ALIMENTS si Lysine utilisée

### 6. Boucles absentes pour V01 et V02 dans VERRATS
- VERRATS R1 : V01 Bobi, champ Boucle = `""` (vide)
- VERRATS R2 : V02 Aligator, champ Boucle = `""` (vide)
- CHEPTEL indique V01=boucle 89, V02=boucle 100
- **Correction attendue** : remplir les boucles dans l'onglet VERRATS

### 7. Champ "Nb portées" vide pour la plupart des truies dans TRUIES_REPRODUCTION
- Colonnes "Nb portees" et "Derniere portee NV" vides pour T01, T02, T03, T05, T07, T09, T11, T12, T13, T15, T16
- Données importantes pour le suivi de productivité et les décisions de réforme
- **Correction attendue** : renseigner à partir des données historiques disponibles

### 8. Aucune donnée POST_SEVRAGE mise à jour pour les bandes sevrées du 10/04
- PORCELETS_BANDES confirme sevrage de 7 portées le 10/04/2026 (T01, T02, T03, T06, T09, T13, T15, T16)
- POST_SEVRAGE n'a pas été mis à jour pour refléter ces sevrages (toujours en "Bande 2 en retard")

### 9. ENGRAISSEMENT vide / inexistant comme onglet actif
- CHEPTEL_GENERAL R12 : "Engraissement 0 — Premières ventes juillet 2026"
- SAISIE_SEMAINE confirme 0 têtes en engraissement
- L'index liste l'onglet ENGRAISSEMENT mais aucune donnée active — acceptable si première vague pas encore arrivée

---

## 📊 RÉSUMÉ

| Métrique | Trouvé | Attendu | Statut |
|----------|--------|---------|--------|
| Onglets lus | 15 | 19 disponibles | ✅ Couverts les essentiels |
| Verrats | 2 | 2 | ✅ |
| Truies documentées | 17 (T01–T19) | 17 | ✅ |
| Bandes avec portées | 15 portées documentées | 12+ bandes actives | ⚠️ (certaines périmées) |
| Portées actives sous mère | 3 (T10, T14, T19) | — | ⚠️ T17/T9/T16 MB non saisies |
| Produits stock aliment | 9 | 5 référencés (brief) | ⚠️ Lysine manquante |
| Produits RUPTURE véto | 4 (Fer, Ivermectine, Anti-diarrhéique, Oxytocine) | 0 | ❌ CRITIQUE |
| Alertes faux positifs | 12 | 0 | ❌ Bug moteur alertes |
| Bande L5 (36 porc. 20/04) | Non identifiée | 1 bande | ❌ Manquante |
| Re-saillie T11 post-retour chaleur | Absente | 1 saillie | ❌ Non saisie |

### Corrections nécessaires : **25 anomalies identifiées**

**Priorité CRITIQUE (bloquer la production) :**
1. Oxytocine en rupture (mises bas imminentes T17, T9, T16)
2. T11 statut contradictoire Pleine vs Non confirmée
3. Alertes faux positifs 100% mortalité (12 alertes parasites)
4. MB de T17/T9/T16 non saisies (dates passées)

**Priorité HAUTE (données incohérentes) :**
5. REPRODUCTION doublon lignes R7–R11 / R22–R26
6. T09/T08 boucle conflict (B.31 Zapata)
7. T12 et T9 même boucle 10 dans CHEPTEL
8. JSON bruts en R23–R24 dans CHEPTEL
9. T18 toujours "En maternité" alors que sevrée le 20/04
10. SAISIE_SEMAINE 8 cellules #ERROR!

**Priorité NORMALE (mise à jour / complétude) :**
11–25. Données périmées (MATERNITE, POST_SEVRAGE, LIFECYCLE), champs vides (boucles verrats, nb portées), total NV incohérent, format erreurs PARAMETRES, structure STOCK_VETO à refactorer

---

## ANNEXE — DONNÉES BRUTES COMPLÈTES

### ANNEXE A — REPRODUCTION (29 lignes)

```
R0: ["REPRODUCTION - Suivi Saillie & Gestation - PORC800 (T1-T17)","","","","","","",""]
R1: ["Mise a jour: 05/04/2026","","","","","","",""]
R2: [HEADERS: ID Truie | Boucle | Nom | Date saillie | Verrat | Date MB prevue | Statut | Notes]
R3: T17 | 86 | -- | -- | -- | 2026-04-17 | Gestante | MB dans 12 jours [PÉRIMÉ]
R4: T9  | 37 | -- | -- | -- | 2026-04-19 | Gestante | MB dans 14 jours [PÉRIMÉ]
R5: T16 | 85 | -- | -- | -- | 2026-04-20 | Gestante | MB dans 15 jours [PÉRIMÉ]
R6: T12 | 10 | -- | -- | -- | 2026-05-05 | Gestante | MB dans 30 jours [PÉRIMÉ]
R7: T7  | 21 | Choupette | 2026-04-05 | -- | -- | Saillie | Saillie du 05/04
R8: T8  | 31 | Zapata    | 2026-04-05 | -- | -- | Saillie | Saillie du 05/04
R9: T11 | 12 | Ficelle   | 2026-04-05 | -- | -- | Non confirmée | Retour chaleur 2026-04-21 [OK]
R10: T14 | 39 | Anillette | 2026-04-05 | -- | -- | Saillie | Saillie du 05/04
R11: T15 | 26 | Pirouette | 2026-04-05 | -- | -- | Saillie | Saillie du 05/04
R12: T5  | 20 | --        | --         | -- | -- | Saillie en cours | Accouplements echoues
R13: [VIDE]
R14: [HEADER] HISTORIQUE SAILLIES 05/04/2026
R15: 2026-04-05 | T7  | saillie | Choupette B.21
R16: 2026-04-05 | T8  | saillie | Zapata B.31
R17: 2026-04-05 | T11 | saillie | Ficelle B.12
R18: 2026-04-05 | T14 | saillie | Anillette B.39
R19: 2026-04-05 | T15 | saillie | Pirouette B.26
R20: [LOG BRUT] "2026-04-05 | T7 | mise_bas | NV:6 MN:0 | ..." [ANOMALIE]
R21: [LOG BRUT] "2026-04-05 | T10 | saillie | NV:0 MN:0 | ..." [ANOMALIE]
R22: T7  | 21 | Choupette | 2026-04-05 | V1 ou V2 | -- | Saillie | [DOUBLON R7]
R23: T8  | 31 | Zapata    | 2026-04-05 | V1 ou V2 | -- | Saillie | [DOUBLON R8]
R24: T11 | 12 | Ficelle   | 2026-04-05 | V1 ou V2 | -- | Saillie | [DOUBLON R9]
R25: T14 | 39 | Anillette | 2026-04-05 | V1 ou V2 | -- | Saillie | [DOUBLON R10]
R26: T15 | 26 | Pirouette | 2026-04-05 | V1 ou V2 | -- | Saillie | [DOUBLON R11]
R27: T10 | 37 | --        | 2026-04-05 | V1 ou V2 | 2026-07-14 | Saillie | [INCOHÉRENT]
R28: [LOG BRUT] "2026-04-07 | T17 | mise_bas | NV:0 MN:0 | Mise bas |" [ANOMALIE]
```

### ANNEXE B — TRUIES_REPRODUCTION (17 truies, lignes R3–R19)

```
T01 Monette  B.22 | En attente saillie | Sevrage bande ~10/04
T02 Fillaou  B.38 | En attente saillie | Sevrage bande ~10/04
T03 Penelope B.23 | En attente saillie | Sevrage bande ~10/04
T04 Pistachette B.19 | À surveiller | Refus allaitement — pas encore saillie
T05 --       B.20 | Pleine | MB prévue 2026-07-11 | Saillie 18/03/2026
T06 --       B.93 | En attente saillie | Sevrage bande ~10/04 — 2 morts
T07 Choupette B.21 | Pleine | MB prévue 2026-07-28 | Saillie 05/04
T09 Zapata   B.31 | Pleine | MB prévue 2026-07-28 | Saillie 05/04 [NOM CONFLIT]
T10 --       B.37 | En maternité | MB 23/03/2026 — 5 porcelets — surveiller
T11 Ficelle  B.12 | Pleine | MB prévue 2026-07-28 | [CONFLIT: retour chaleur réel]
T12 --       B.10 | Pleine | MB prévue 2026-05-06 | Saillie 11/01/2026
T13 --       B.29 | En attente saillie | MB 19-20/03, 6 NV, sevrée
T14 --       B.24 | En maternité | MB 01/04/2026 — 13 porcelets [BOUCLE ERREUR]
T15 Anillette B.39 | Pleine | MB prévue 2026-07-28 | Saillie 05/04
T16 Pirouette B.26 | Pleine | MB prévue 2026-07-28 | Saillie 05/04
T18 --       B.85 | En maternité | MB 28/03 — SEVRAGE PRÉVU 18/04 [PÉRIMÉ: sevrée 20/04]
T19 --       B.76 | En maternité | MB 01/04/2026 — 13 porcelets
```

### ANNEXE C — PORCELETS_BANDES (15 portées actives + 1 recap)

```
26-T7-01  | T07 B.21 | MB 26/02 | 6 NV  | 0M | 6V  | Sevrage réel 19/03 | Sevrés
26-T11-01 | T11 B.12 | MB 26/02 | 12 NV | 0M | 12V | Sevrage réel 19/03 | Sevrés
26-T1-01  | T01 B.22 | MB 03/03 | 11 NV | 1M | 10V | Sevrage réel 10/04 | Sevrés
26-T3-01  | T03 B.23 | MB 06/03 | 13 NV | 0M | 13V | Sevrage réel 10/04 | Sevrés
26-T2-01  | T02 B.38 | MB 07/03 | 14 NV | 0M | 14V | Sevrage réel 10/04 | Sevrés
26-T15-01 | T15 B.39 | MB 07/03 | 14 NV | 1M | 13V | Sevrage réel 10/04 | Sevrés [Anillette — CONFLIT ID]
26-T9-01  | T09 B.31 | MB 07/03 |  9 NV | 1M |  8V | Sevrage réel 10/04 | Sevrés
26-T16-01 | T16 B.26 | MB 07/03 | 14 NV | 0M | 14V | Sevrage réel 10/04 | Sevrés
26-T6-01  | T06 B.93 | MB 14/03 | 12 NV | 2M | 10V | Sevrage réel 10/04 | Sevrés
26-T13-01 | T13 B.10 | MB 19/03 |  6 NV | 0M |  6V | Sevrage réel 10/04 | Sevrés
26-T10-01 | T10 B.37 | MB 23/03 |  5 NV | 0M |  5V | Pas de sevrage réel | Sous mère
R14: [RECAP LIGNE — à déplacer]
26-T14-02 | T14 B.24 | MB 01/04 | 13 NV | 0M | 13V | Sevrage prévu 22/04 | Sous mère
26-T19-01 | T19 B.76 | MB 01/04 | 13 NV | 0M | 13V | Sevrage prévu 22/04 | Sous mère
26-T18-01 | T18 B.85 | MB 28/03 | 12 NV | 0M | 12V | Sevrage réel 20/04  | Sevrés ✅
```

**Total NV : 116 | Total morts : 5 | Total vivants : 111**

### ANNEXE D — STOCK_ALIMENTS (9 produits au 21/04/2026)

```
ALIM-MAIS      | Maïs grain         | 3050 kg | Seuil 500  | ✅ OK
ALIM-TRUIE-GEST| Alim. gestation    |  500 kg | Seuil 200  | ✅ OK
ALIM-TRUIE-LACT| Alim. lactation    |  200 kg | Seuil 200  | ⚠️ AU SEUIL
ALIM-PORCELET  | Alim. porcelet dém |  150 kg | Seuil 100  | ⚠️ À surveiller
ALIM-ENGR      | Alim. engraissement|  500 kg | Seuil 500  | ⚠️ AU SEUIL
ALIM-KPC       | KPC 5% prémix      |  300 kg | Seuil 400  | ❌ BAS (~1 sem)
ALIM-SOJA      | Tourteau de soja   |  200 kg | Seuil 300  | ❌ BAS (5-7j)
ALIM-SON       | Son de blé         |   50 kg | Seuil  80  | ❌ BAS (48h)
ALIM-COQ       | Coquillage (Ca)    | 20.3 kg | Seuil  30  | ❌ URGENT
```

### ANNEXE E — STOCK_VETO (produits de suivi critiques, R1–R7)

```
Fer injectable     | 0 doses  | Min 20 | RUPTURE ❌
Oxytetracycline    | 3 flacons | Min 5  | BAS ⚠️
Ivermectine        | 0 ml     | Min 50 | RUPTURE ❌
Vitamines AD3E     | 5 unités | Min 3  | OK ✅
Désinfectant       | 1 bidon  | Min 3  | BAS ⚠️
Calcium injectable | 1 bidon  | Min 3  | BAS ⚠️
Anti-diarrhéique   | 0 ml     | Min 50 | RUPTURE ❌
[+ Oxytocine (inventaire R38) : 0 fl — CRITIQUE ❌]
```

### ANNEXE F — ALERTES_ACTIVES (12 faux positifs + 1 alerte non-sens)

Toutes les alertes R3–R13 signalent "Mortalité élevée: 100%" sur des portées sevrées normales.
Générées le 2026-04-25 07:31:39–42 (aujourd'hui même, donc problème actif du moteur).

### ANNEXE G — VERRATS

```
V01 Bobi     | Boucle: [VIDE] | Thomasset | Actif | Ration 3 kg/j gestation KPC
V02 Aligator | Boucle: [VIDE] | Azaguie   | Actif | Ration 2.5 kg/j
```

### ANNEXE H — PARAMETRES (valeurs clés)

```
Durée gestation   : 114 jours
Age sevrage       : 21 jours
NV/portée objectif: 12 têtes
NV/portée réel    : 11.2 têtes
MB/truie/an obj.  : 2.2
Fertilité terrain : 92.3% (dépasse objectif 85%)
Loges maternité   : 9
Mortalité porcelets objectif : <10%
Prix vente        : 2000–2200 FCFA/kg, porcelet sevré 25 000 FCFA
```

---

*Audit généré automatiquement le 2026-04-25 par l'agent PorcTrack 8.*
*Prochaine mise à jour recommandée : immédiate pour les 4 anomalies CRITIQUES.*
