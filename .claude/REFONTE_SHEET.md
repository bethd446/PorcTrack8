# Refonte du Google Sheet PorcTrack 8
## Spécification complète de la migration de la structure de données

**Date** : 18 avril 2026  
**Exploitation** : Ferme A130, Secteur Nord  
**Modèle** : Naisseur-engraisseur (Saillie → Gestation → Maternité → Sevrage → Engraissement)  
**Volume actuel** : 17 truies, 2 verrats, 153 porcelets, 12 bandes actives

---

## 1. PROBLÈMES IDENTIFIÉS

### 1.1 Structure actuelle (PROBLÈMES CRITIQUES)

#### A. **Identification animale sans source de vérité**
- Les porchers utilisent les **numéros de boucle** sur le terrain (visible, physique)
- Le Sheet stocke les IDs (T01-T07, T09-T16, T18-T19 = 17 truies + V01-V02) en colonne "ID" — PAS de T08 ni T17
- Les boucles sont **incohérentes** : tombent parfois, se perdent, sont remplacées sans log
- **Pas d'historique** : impossible de tracer quelle truie avait la boucle #42 il y a 3 mois
- Résultat : confusion between ID système (T01) et identifiant terrain (Boucle #42)
- **Impact métier** : porcher n'utilise que la boucle → risque de décalage ID/boucle en onglet JOURNAL_SANTE

#### B. **Suivi reproduction fragmenté**
- Onglet **TRUIES_REPRODUCTION** : colonnes Statut (Gestation, Allaitante, Flushing, Vide, Réforme, Morte)
- **Aucune colonne "Date saillie"** → impossible de calculer DPA (date prévue de mise-bas) sans extrapolation
- **Aucun lien vers le verrat** → on ne sait pas quel verrat a saillies quelle truie
- **Pas d'onglet "SAILLIES"** → historique saillie/résultats perdu
- Colonne "Dernière portée NV" : piste numéros vivants, mais pas de timeline
- **Impact métier** : porcher doit écrire "gestation j46" dans Notes → pas d'alerte automatique de mise-bas

#### C. **Suivi porcelets sans traçabilité post-sevrage**
- Onglet **PORCELETS_BANDES** : Date sevrage réelle, mais après = vide
- **Pas d'onglet "BANDES_ENGRAISSEMENT"** → où vont les porcelets après sevrage ?
- Statut bandes : "Sevrés, Transition, Engraissement" = vague, pas indexé
- Pas de suivi **poids moyen par loge** → impossible de mesurer croissance
- **Pas de lien vers loge/secteur** → comment on sait où sont les porcelets ?
- Objectif 100kg en 5 mois = stratégie métier mais non tracée
- **Impact métier** : porcher doit noter "porcelets gros sevrés 5 avril" → pas d'alerte IA quand poids atteint

#### D. **Statuts en anglais + incohérents**
- JOURNAL_SANTE : colonnes "Animal", "Type" (Text), "Subject" = confusion
- Pas de terminologie GTTT standard : Mise-Bas (R1), Sevrage (R2), Mortalité (R4) cachées dans Notes
- Statuts bandes : pas d'énumération → "Sevrés" vs "Sevrés" vs "Sevres" (typo possible)
- **Impact métier** : porcher doit apprendre la syntaxe → erreurs de saisie

#### E. **Récapitulatif CHEPTEL_GENERAL non indexé**
- Table "CHEPTEL_GENERAL" : données redondantes (récapitulatif du troupeau)
- Pas de lien vers les onglets de source → si on modifie TRUIES, CHEPTEL ne se met pas à jour
- Valeurs calculées manuellement = risque de dérive
- **Impact métier** : réunion d'élevage = données potentiellement obsolètes

#### F. **Pas d'automatisations GAS**
- Nombre de portées par truie = compté manuellement
- Alerte boucle dupliquée = pas détectée
- Poids moyen par loge = calculé à la main
- Timeline truie (saillie→MB→sevrage→prochaine saillie) = invisible
- **Impact métier** : porcher oublie des alertes critiques

---

## 2. NOUVELLE STRUCTURE PROPOSÉE

### 2.1 Fondements de la refonte

**Principes directeurs :**
1. **Source de vérité unique** : Chaque donnée existe UNE FOIS dans le Sheet
2. **Traçabilité complète** : Historique de chaque événement (saillie, MB, sevrage, changement boucle)
3. **Automatisation maximaliste** : Calculs et alertes générés par GAS, pas le porcher
4. **Workflow terrain** : Colonnes ordonnées selon les gestes du porcher (saillie → gestation → MB → sevrage → engraissement)
5. **Statuts standardisés** : Énumérations fixes en TABLES_INDEX pour éviter les typos

---

## 2.2 Onglets proposés (détail complet)

### **A. TRUIES** (remplace TRUIES_REPRODUCTION)

**Objectif** : Vue unique de l'état actuel de chaque truie reproductrices, avec historique lié.

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| ID | String | T01 | PK — Identifiant système (immutable) |
| Nom | String | Malouine | Nom du porcher (optionnel) |
| Boucle Actuelle | Integer | 42 | Boucle RFID/métal actuellement apposée (peut changer) |
| Date Entrée Troupeau | Date | 2024-01-15 | Date d'achat/mise en troupeau |
| **Statut Actuel** | Enum | `GESTATION`, `LACTATION`, `FLUSHING`, `VIDE`, `REFORME`, `MORTE` | CF. TABLES_INDEX — mis à jour par les événements |
| **Saillie Actuelle** | Link | #SAILLIES!A1:C100 | Lien vers dernier enregistrement dans SAILLIES (date, verrat, résultat) |
| Date Saillie Dernière | Date | 2026-03-05 | Calculé auto depuis SAILLIES.max(date_saillie) |
| Verrat Utilisé (dernière) | String | V01 | Calculé auto depuis SAILLIES.verrat |
| DPA (Date Prévue MB) | Date | 2026-05-29 | Calculé : Date Saillie + 115j ± 2j |
| **Date MB Prévue (écart)** | Number | -2 | Jours avant DPA (aide porcher : "Mise-bas dans 3 jours") |
| Date MB Réelle | Date | (null) | Remplissage manuel lors accouchement |
| Nb Portées Historiques | Integer | 7 | Calculé auto : COUNT(PORTEES WHERE truie_id = T01 AND date_mb_reelle IS NOT NULL) |
| Nb Vivants Dernière | Integer | 9 | Dernier PORTEES.vivants pour cette truie |
| Nb Morts Dernière | Integer | 1 | Dernier PORTEES.morts |
| NV Moyen Historique | Decimal | 8.6 | Calculé auto : AVG(PORTEES.vivants) |
| Ration Journalière (kg) | Decimal | 2.5 | Alimentation standard (peut varier par statut) |
| Alimentation | String | Alim. Maternité STD | Référence produit (lien STOCK_ALIMENTS ?) |
| Statut Sanitaire | String | Normal | Aucun traitement en cours (autre colonne pour traitements actifs ?) |
| Observations | Text | Allaitante forte, bon NV | Notes libres pour suivi |
| Date Dernière Modif | Date | 2026-04-18 | Auto-rempli (Timestamp) |
| Modifié Par | String | porcher_001 | Qui a modifié (device_id de FarmContext) |

**Automatisations GAS à connecter :**
- Mise à jour "Statut Actuel" lors création d'un événement (saillie → GESTATION, MB réelle → LACTATION, etc.)
- Alerte si DPA atteinte et MB Réelle vide (R1 : Mise-Bas)
- Calcul DPA = MAX(0, DATEDIF(Date Saillie Dernière, TODAY()) + 115) ? Pré-alerte à J-3
- Détection boucle dupliquée (voir HISTORIQUE_BOUCLES)

---

### **B. SAILLIES** (NOUVEAU)

**Objectif** : Historique complet de tous les accouplements, source de vérité pour la reproduction.

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| ID Saillie | String | SAIL_20260305_T01_V01 | PK — Format auto-généré ou manuel (unique) |
| Date Saillie | Date | 2026-03-05 | Date de l'accouplement |
| Truie ID | String | T01 | FK vers TRUIES.ID (lien de traçabilité) |
| Truie Boucle (snapshot) | Integer | 42 | Boucle à la date de saillie (pour audit) |
| Verrat ID | String | V01 | FK vers VERRATS.ID |
| Verrat Boucle (snapshot) | Integer | 101 | Boucle du verrat à la date de saillie |
| Résultat | Enum | `REUSSI`, `ECHEC`, `INCERTAIN` | REUSSI = gestation confirmée, ECHEC = pas de réaction, INCERTAIN = retour à J17-21 ? |
| Résultat Confirmé ? | Boolean | TRUE | Date de confirmation ? Ou booléen simple |
| Détails Résultat | Text | Retour chaleur J20 | Si ECHEC : quand retour chaleur ? |
| Notes | Text | Bonne réactivité | Observations porcher |
| Technologie Détection | Enum | `OBSERVATION_DIRECTE`, `ECHOGRAPHIE_J28`, `COMPORTEMENT` | Comment on a confirmé ? |
| Date Confirmation | Date | 2026-04-05 | Quand on a su que c'était REUSSI (souvent J30-35) |
| Date Dernière Modif | Date | 2026-04-18 | Auto-timestamp |

**Index & lien vers PORTEES :**
- PORTEES.saillie_id = SAILLIES.ID_Saillie
- Permet tracer : Saillie (3/5) → Gestation confirmée (4/5) → MB prévue (5/29) → Portée réelle (5/27)

**Automatisations GAS :**
- Lors création SAILLIES : mettre à jour TRUIES.Statut Actuel = GESTATION
- Alerter si pas de confirmation Résultat à J35
- Alerte : "Retour chaleur détecté → nouvelle saillie ?" quand Date de confirmation vide

---

### **C. PORTEES** (amélioration de PORCELETS_BANDES)

**Objectif** : Suivi de chaque portée depuis naissance jusqu'au sevrage (sert de lien vers BANDES_ENGRAISSEMENT après).

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| ID Portée | String | PORT_20260527_T01 | PK — Date MB + Truie |
| **Saillie ID** | String | SAIL_20260305_T01_V01 | FK vers SAILLIES (traçabilité complète du cycle) |
| Truie ID | String | T01 | FK vers TRUIES.ID |
| Date MB Réelle | Date | 2026-05-27 | Date accouchement |
| Heure MB | Time | 14:30 | Optionnel (aide suivi temps réel) |
| Vivants Naissance | Integer | 10 | NV à la naissance |
| Morts Naissance | Integer | 1 | Morts nés ou mort dans les 24h post-MB |
| Vivants à J7 | Integer | 10 | Suivi mortalité semaine 1 |
| Morts Cumulés J7 | Integer | 0 | = Morts Naissance + morts J1-J7 |
| Allaitement Normal ? | Boolean | TRUE | Colonne de contrôle rapide |
| Observations Maternité | Text | NV faible, 1 allait mal | Notes porcher j1-j14 |
| **Date Sevrage Prévue** | Date | 2026-06-17 | = Date MB + 21j (ou +28j) |
| **Date Sevrage Réelle** | Date | 2026-06-17 | Quand sevrage réellement exécuté |
| Vivants à Sevrage | Integer | 9 | Après mortalité maternité |
| Morts en Maternité (cumul) | Integer | 1 | = Morts Naissance + morts pendant les 21j |
| Taux Mortalité % | Decimal | 9.1 | = (Morts Cumul / NV) * 100 |
| **Alerte Mortalité ?** | Boolean | FALSE | Auto-check : Taux > 15% → CRITIQUE (R4 moteur alertes) |
| **Loge Maternité** | String | M-Nord-3 | Où étaient mère + porcelets |
| Sortis Vers (Bande ID) | String | BD_001 | FK vers BANDES_ENGRAISSEMENT (après sevrage) |
| Notes Sanitaires | Text | Diarrhée J14 → Traitement X | Événements sanitaires (lien JOURNAL_SANTE ?) |
| Date Dernière Modif | Date | 2026-04-18 | Auto-timestamp |

**Logique de transition :**
- À Sevrage Réelle remplie : créer automatiquement BANDES_ENGRAISSEMENT avec Vivants à Sevrage
- Lien unidirectionnel PORTEES → BANDES_ENGRAISSEMENT

---

### **D. BANDES_ENGRAISSEMENT** (NOUVEAU)

**Objectif** : Suivi de chaque lot de porcelets post-sevrage jusqu'à finition (100kg, vente/abattage).

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| **ID Bande** | String | BD_001 | PK — Format : BD_YYYYMMDD_[N] ou BD_001 simple |
| **ID Portée Source** | String | PORT_20260527_T01 | FK vers PORTEES (traçabilité génétique) |
| **Truie Source** | String | T01 | FK vers TRUIES (généalogie rapide) |
| Date Création Bande | Date | 2026-06-17 | = PORTEES.Date Sevrage Réelle |
| Effectif Initial | Integer | 9 | = PORTEES.Vivants à Sevrage |
| **Sexe Composition** | Enum | `MIXTE`, `MALES_SEULS`, `FEMELLES_SEULES` | Important pour alim. / croissance différente |
| **Loge Actuelle** | String | Sect-Sud-Loge-2 | Où sont les porcelets ? (peut changer) |
| Historique Loges | Text | Sect-Sud-Loge-1 (6-21j), Sect-Sud-Loge-2 (21j+) | Mouvements pour regroupement |
| **Statut Bande** | Enum | `TRANSITION`, `ENGRAISSEMENT`, `PRE_FINITION`, `FINITION`, `VENDU_ABATTAGE` | CF. TABLES_INDEX |
| **Poids Moyen Initial** | Decimal | 7.5 | kg à sevrage (peut être estimé) |
| **Poids Moyen Actuel** | Decimal | 32.4 | kg today (souvent estimé ou pesée spot) |
| Date Dernier Pesage | Date | 2026-04-15 | Quand a-t-on mesuré ? |
| Effectif Actuel | Integer | 9 | (peut baisser : morts, ventes partielles) |
| Morts en Engraissement | Integer | 0 | Suivi santé post-sevrage |
| **Croissance Moyenne (g/j)** | Decimal | 485 | Calculé : (Poids Actuel - Poids Initial) / (Jours écoulés) |
| **EJA (Estimé Jour Abattage)** | Date | 2026-09-28 | Si croissance = 485g/j, jour atteint 100kg = ? (alerte porcher) |
| **Écart EJA** | Integer | 15 | Jours avant/après objectif 5 mois (150j) = (EJA - TODAY()) |
| Ration Journalière (kg/porc) | Decimal | 1.2 | Augmente avec poids (voir tableau d'alimentation) |
| Type Alimentation | String | Démarrage 15-25kg STD | Référence produit alimentaire |
| Consommation Estimée (kg/j totale bande) | Decimal | 10.8 | = Ration × Effectif Actuel |
| **Statut Sanitaire** | Enum | `SAIN`, `TRAITEMENT_COURSE`, `QUARANTAINE` | CF. TABLES_INDEX |
| Événements Sanitaires | Text | Toux légère (1 porc, 4/12), Diarrhée (2 porcs, 4/14) | Lien JOURNAL_SANTE ? |
| Coût Alimentaire Cumulé (€) | Decimal | 15.60 | Calculé : Ration × Prix unitaire × Jours |
| Objectif Vente | Enum | `100kg_FINITION`, `80kg_EXPORT`, `ELEVAGE_RENOUVELLEMENT`, `CENDRILLON_REJET` | Destiné où ? |
| Notes | Text | Groupe homogène, croissance idéale | Observations porcher |
| Date Dernière Modif | Date | 2026-04-18 | Auto-timestamp |

**Automatisations GAS :**
- Calcul EJA = Sevrage + ((100kg - Poids Actuel) / (Croissance g/j * 1000)) jours
- Alerte quand EJA < TODAY() + 7j (finition approche)
- Alerte Regroupement (R6) : quand 2+ bandes avec "Sevrables dans ±3 jours"
- Consommation Estimée = Ration × Effectif

**Notes métier :**
- Sevrage : Transition (7j) = alim démarrage légère
- Transition → Engraissement : changement d'alim, peut fusionner 2-3 bandes petits
- 60-90 jours en engraissement (poids 25→100kg @ 485g/j)
- Finition : 30j avant EJA pour finition optimale
- Si EJA > J+180 : alerte "croissance faible, problème alim/santé"

---

### **E. HISTORIQUE_BOUCLES** (NOUVEAU)

**Objectif** : Audit complet de chaque changement d'identifiant physique (boucle), source de vérité pour la traçabilité.

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| **ID Log Boucle** | String | LOG_BOUCLE_001 | PK — Auto-généré |
| Date Changement | Date | 2026-04-10 | Quand la boucle a changé |
| Animal Type | Enum | `TRUIE`, `VERRAT` | Type d'animal |
| Animal ID Système | String | T01 | FK vers TRUIES ou VERRATS |
| **Boucle Ancienne** | Integer | 41 | Boucle qui a tombé/cassé |
| **Boucle Nouvelle** | Integer | 42 | Nouvelle boucle apposée |
| Raison Changement | Enum | `PERTE_PHYSIQUE`, `CASSEE`, `INUTILISABLE`, `RE_ETIQUETAGE_OREILLE`, `AUTRE` | Pourquoi ? |
| Notes | Text | Boucle rouillée, détachée lors transport | Contexte du porcher |
| Modifié Par | String | porcher_001 | Qui a noté le changement |
| Vérification Faite ? | Boolean | TRUE | Porcher a bien scanné la nouvelle boucle ? |

**Automatisations GAS :**
- Alerte si même Boucle (nouvelle) déjà utilisée ailleurs → duplication ! (détectée via UNIQUE constraint GAS)
- Historique : Quand on affiche une Truie, montrer chronologie de ses boucles

---

### **F. VERRATS** (peu de changement)

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| ID | String | V01 | PK |
| Nom | String | Générateur | Nom du porcher |
| **Boucle Actuelle** | Integer | 101 | Peut aussi changer |
| Date Entrée Troupeau | Date | 2023-06-01 | |
| **Statut Actuel** | Enum | `ACTIF`, `REFORME`, `MORT` | CF. TABLES_INDEX |
| Rondeur Génétique | String | LL ou LW | Lignée (optional) |
| Nombre Saillies Historiques | Integer | 87 | COUNT(SAILLIES WHERE verrat_id = V01) |
| Dernière Saillie | Date | 2026-04-05 | MAX(SAILLIES.date) |
| Statut Sanitaire | String | Normal | |
| Ration Journalière (kg) | Decimal | 3.0 | Entretien + activité sexuelle |
| Alimentation | String | Alim. Verrats STD | |
| Observations | Text | Activité normale, santé ok | |
| Date Dernière Modif | Date | 2026-04-18 | |

---

### **G. JOURNAL_SANTE** (inchangé, mais meilleures conventions)

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| ID Soin | String | SOIN_20260418_001 | PK |
| Date Soin | Date | 2026-04-18 | |
| Animal Type | Enum | `TRUIE`, `VERRAT`, `BANDE_PORCELETS` | Standardisé |
| **Animal ID** | String | T01 ou BD_001 | FK vers TRUIES, VERRATS, ou BANDES_ENGRAISSEMENT |
| Catégorie | Enum | `VACCINATION`, `TRAITEMENT`, `OBSERVATION`, `PROCEDURE` | |
| Description Soin | Text | Vaccination Circovirus BD_001 | |
| Produit Utilisé | String | Vaccin ABC Lot #XYZ | |
| Dose (kg ou mL) | Decimal | 0.5 | Si applicable |
| Voie Admin | Enum | `ORAL`, `INJECTION_IM`, `INJECTION_IV`, `TOPIQUE`, `EAU` | |
| Résultat | Enum | `OK`, `RECTION_LEGERE`, `REACTION_GRAVE`, `ECHEC` | |
| Observé Par | String | porcher_001 | |
| Notes | Text | Bien acceptée, aucune réaction | |
| Date Dernière Modif | Date | 2026-04-18 | |

**Amélioration** : Lien FK vers Animal ID (pas juste "Type" + "Subject")

---

### **H. STOCK_ALIMENTS** (inchangé mais clarifications)

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| ID Stock | String | STOCK_ALI_001 | PK |
| Date Inventaire | Date | 2026-04-18 | |
| Produit | String | Alim. Démarrage 15-25kg | Référence interne stable |
| Quantité (kg) | Decimal | 450.5 | Stock physique mesuré |
| Quantité Théorique (kg) | Decimal | 440.0 | Attendu (Théorique - Réelle = Consommation) |
| Écart (kg) | Decimal | 10.5 | Quantité - Théorique |
| % Écart | Decimal | 2.3 | Pour audit |
| Prix Unitaire (€/kg) | Decimal | 0.42 | Coût interne |
| Valeur Stock (€) | Decimal | 189.2 | = Quantité × Prix |
| Fournisseur | String | Fournisseur ABC | |
| Date Alerte Seuil Critique | Date | 2026-04-20 | Si Quantité < 200kg |
| Observations | Text | Livrés lundi 15/4 | |
| Date Dernière Modif | Date | 2026-04-18 | |

---

### **I. STOCK_VETO** (inchangé)

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| ID Stock | String | STOCK_VETO_001 | PK |
| Date Inventaire | Date | 2026-04-18 | |
| Produit | String | Vaccin Circovirus ABC | |
| Quantité | Decimal | 15 | Nombre doses/flacons |
| Unité | String | dose | dose, flacon, ampoule, etc. |
| Date Expiration | Date | 2026-12-31 | ALERTE CRITIQUE si < TODAY() |
| Utilisé Cumulé | Decimal | 5 | Doses utilisées depuis achat |
| Restant | Decimal | 10 | = Quantité - Utilisé |
| Fournisseur | String | Pharma Veto XYZ | |
| Prix Total (€) | Decimal | 120.00 | Coût du flacon/lot |
| Prix Unitaire (€/dose) | Decimal | 8.00 | |
| Observations | Text | Conservé 2-8°C | |
| Date Dernière Modif | Date | 2026-04-18 | |

---

### **J. TABLES_INDEX** (amélioré + nouvelles énumérations)

**Objectif** : Registre de toutes les tables + énumérations de statuts/catégories (source de vérité pour les dropdowns).

#### Partie 1 : Liste des tables

| Table | Onglet Google Sheet | Description | Clé Primaire |
|-------|-------------------|-----------|---------
| TRUIES_REPRO | TRUIES | Truies reproductrices actives + historique | ID |
| SAILLIES_HISTORIQUE | SAILLIES | Historique saillies (nouveaux) | ID Saillie |
| PORTEES_MATERNITE | PORTEES | Portées nées (amélioration) | ID Portée |
| BANDES_POST_SEVRAGE | BANDES_ENGRAISSEMENT | Lots en engraissement (nouveau) | ID Bande |
| HISTORIQUE_BOUCLES_ANIMAUX | HISTORIQUE_BOUCLES | Log changement boucles (nouveau) | ID Log Boucle |
| VERRATS_REPRO | VERRATS | Verrats reproducteurs | ID |
| SOINS_SANTE | JOURNAL_SANTE | Soins, traitements, vaccinations (amélioration) | ID Soin |
| STOCK_ALIMENTAIRE | STOCK_ALIMENTS | Inventaire aliments | ID Stock |
| STOCK_VETERINAIRE | STOCK_VETO | Inventaire produits vétérinaires | ID Stock |

#### Partie 2 : Énumérations (statuts, catégories, résultats)

**TRUIES.Statut Actuel :**
```
GESTATION      → Enceinte, attente mise-bas (DPA calculé)
LACTATION      → Allaitante (post-MB, jusqu'à sevrage)
FLUSHING       → Préparation prochaine saillie post-sevrage (7-10j)
VIDE           → En attente saillie (pas en lactation)
REFORME        → Retirée du troupeau reproducteur
MORTE          → Décédée
```

**SAILLIES.Résultat :**
```
REUSSI         → Gestation confirmée (échographie J28 ou comportement post-J35)
ECHEC          → Retour chaleur détecté ou pas de gestation
INCERTAIN      → Confirmation en attente
```

**BANDES_ENGRAISSEMENT.Statut :**
```
TRANSITION     → 0-7j post-sevrage (alim démarrage, adaptation)
ENGRAISSEMENT  → 7-120j (croissance rapide, 25→100kg)
PRE_FINITION   → J120-150 (approche finition, gain ralentit)
FINITION       → J150-180 (dernier poids, dépôt de gras)
VENDU_ABATTAGE → Partie vendue, lot fini
```

**BANDES_ENGRAISSEMENT.Statut Sanitaire :**
```
SAIN           → Aucun traitement, pas de suspicion
TRAITEMENT_COURSE → Traitement actif (antibio, antiinflammatoire, etc.)
QUARANTAINE    → Isolé en raison symptômes possibles
```

**JOURNAL_SANTE.Catégorie :**
```
VACCINATION    → Injections de vaccin
TRAITEMENT     → Antibiotiques, antiinflammatoires, antiparasitaires
OBSERVATION    → Note de suivi (sans intervention)
PROCEDURE      → Castration, écornage, etc.
```

**JOURNAL_SANTE.Voie Admin :**
```
ORAL           → Dans l'eau ou aliment
INJECTION_IM   → Injection intramusculaire
INJECTION_IV   → Injection intraveineuse (rare porcins)
TOPIQUE        → Crème, pommade, pulvérisation
EAU            → Eau de boisson
```

---

## 3. ONGLETS À SUPPRIMER

### **CHEPTEL_GENERAL**
- **Raison** : Données redondantes, récapitulatif non-indexé
- **Remplacé par** : Dashboards dynamiques React côté FarmContext
  - Nombre truies : COUNT(TRUIES WHERE Statut != MORTE)
  - Nombre verrats : COUNT(VERRATS WHERE Statut != MORT)
  - Nombre porcelets sevrés : SUM(PORTEES.Vivants à Sevrage) par statut bande
  - Totaux alimentaires : SUM(BANDES.Consommation) + Ration truies + ration verrats
- **Migration** : Copier les historiques pertinents dans notes / onglets spécialisés

---

## 4. AUTOMATISATIONS GOOGLE APPS SCRIPT (GAS) À AJOUTER

### 4.1 Calcul auto du nombre de portées par truie

**Déclencheur** : Quand une nouvelle ligne est ajoutée dans PORTEES avec Date MB Réelle non-vide

**Logique :**
```
TRUIES[ID = PORTEES.Truie ID].Nb Portées Historiques = 
  COUNT(PORTEES WHERE truie_id = ID AND date_mb_reelle IS NOT NULL)
```

**Avantage** : Plus besoin de compter à la main → jamais désynchronisé

---

### 4.2 Alerte duplication de boucle

**Déclencheur** : Quand HISTORIQUE_BOUCLES.Boucle Nouvelle est écrite

**Logique :**
```
new_boucle = HISTORIQUE_BOUCLES[dernier ajout].Boucle Nouvelle
existing = RECHERCHER(new_boucle DANS TRUIES.Boucle Actuelle OU VERRATS.Boucle Actuelle)
IF existing.length > 1:
  FLAG HISTORIQUE_BOUCLES.Vérification Faite = FALSE
  ENVOYER EMAIL porcher : "⚠️ BOUCLE #42 DUPLIQUÉE ! T01 et T03 l'utilisent"
```

**Avantage** : Détection automatique des erreurs d'apposition boucle

---

### 4.3 Calcul poids moyen + EJA par bande

**Déclencheur** : Quand BANDES_ENGRAISSEMENT.Poids Moyen Actuel ou Date Dernier Pesage change

**Logique :**
```
jours_ecoulés = TODAY() - Sevrage Réelle
croissance_g_j = (Poids Moyen Actuel - Poids Moyen Initial) * 1000 / jours_écoulés
EJA = Sevrage + ((100 - Poids Moyen Actuel) / (croissance_g_j / 1000))

IF EJA <= TODAY() + 7:
  ALERTE PORCHER : "BD_001 : Finition dans 7 jours (EJA = 28/4)"
```

**Avantage** : Porcher sait QUAND passer à finition sans calcul

---

### 4.4 Timeline par truie (Saillie → MB → Sevrage → Prochaine Saillie)

**Déclencheur** : Dashboard / Vue détail Truie

**Logique (affichage, pas stockage) :**
```
Afficher pour T01 :
  ├─ Saillie 1 : 3/5 → Gestation confirmée 5/5 → MB prévue 29/5
  ├─ MB réelle : 27/5 → Vivants 10, Morts 1
  ├─ Sevrage : 17/6 → Détail bande (BD_001)
  └─ Saillie 2 : ? (Flushing depuis 18/6, attente porcher)
```

**Avantage** : Porcher voit le cycle complet en 1 coup d'œil (pas besoin de concatener Notes)

---

### 4.5 Alertes GTTT intégrées (existant, à maintenir)

Les 6 règles de `alertEngine.ts` restent identiques, maintenant alimentées par la nouvelle structure :

| Règle | Déclencheur | Source Data | Priorité |
|-------|---------|----------|------|
| **R1 : Mise-Bas** | DPA atteinte ± 3j | TRUIES.DPA, PORTEES.Date MB Réelle | HAUTE→CRITIQUE |
| **R2 : Sevrage** | PORTEES.Date MB + 21j | PORTEES.Date Sevrage Réelle | HAUTE→NORMALE |
| **R3 : Retour Chaleur** | PORTEES.Sevrage + 3-7j | PORTEES.Date Sevrage Réelle | HAUTE→NORMALE |
| **R4 : Mortalité** | Taux > 15% | PORTEES.Taux Mortalité % | HAUTE→CRITIQUE |
| **R5 : Stock Critique** | Quantité ≤ seuil | STOCK_ALIMENTS.Quantité | HAUTE→CRITIQUE |
| **R6 : Regroupement** | 2+ bandes sevrables ±3j | BANDES.Date Création Bande | INFO |

---

## 5. PLAN DE MIGRATION

### 5.1 Préparation (Jour 0)

1. **Backup complet** du Google Sheet actuel (télécharger en .xlsx)
2. **Créer nouveau Sheet de travail** (ne pas toucher au Sheet actuel)
3. **Copier structure onglets existants** dans nouveau Sheet pour tester

### 5.2 Phase 1 : Fondations (Jour 1)

1. Créer 4 onglets vides : SAILLIES, BANDES_ENGRAISSEMENT, HISTORIQUE_BOUCLES, TABLES_INDEX (amélioré)
2. Copier et renommer :
   - TRUIES_REPRODUCTION → TRUIES
   - PORCELETS_BANDES → PORTEES (+ ajouter colonnes manquantes)
   - VERRATS → VERRATS (no change)
3. Valider structure avec porcher : "Ces colonnes suffisent ?"
4. **Ne pas supprimer CHEPTEL_GENERAL ni JOURNAL_SANTE** pour l'instant (données actives)

### 5.3 Phase 2 : Migration données historiques (Jour 1-2)

Pour chaque truie (T01-T07, T09-T16, T18-T19 = 17 truies) :

1. **Lister toutes les saillies** (depuis Notes si nécessaire, ou historique papier)
   - Ajouter dans SAILLIES : Date, Truie ID, Verrat ID, Résultat (estimé si inconnu), Notes
2. **Lister toutes les portées** (depuis PORCELETS_BANDES)
   - Ajouter lien Saillie ID (calculé : dernière saillie avant MB)
   - Ajouter colonnes manquantes (Vivants J7, Taux Mortalité, etc.)
3. **Lister tous les changements boucles** (depuis historique si disponible)
   - Si données boucle manquent = utiliser boucles actuelles comme "J0"
4. **Créer bandes engraissement** pour tous les lots actuels
   - Sevrage passé : données depuis PORCELETS_BANDES
   - Sevrage futur : modèles vides attendant événement
5. **Peupler TABLES_INDEX** avec énumérations standardisées

### 5.4 Phase 3 : Validation + tests porcher (Jour 2-3)

1. Montrer Sheet au porcher :
   - "Vérifiez les saillies historiques : dates, verrats correctes ?"
   - "Vérifiez les bandes actuelles : effectif, loge, poids corrects ?"
2. Test ajout manuel :
   - Porcher ajoute saillie fictive dans SAILLIES
   - Vérifier que TRUIES.Statut se met à jour
   - Vérifier que DPA se calcule
3. Test ajout MB :
   - Porcher ajoute portée dans PORTEES
   - Vérifier calculs (NV, mortalité, vivants J7, etc.)

### 5.5 Phase 4 : Intégration React (Jour 3-5)

1. **Mapper nouvelle structure** dans `src/types/farm.ts` et mappers
   - Ajouter types Saillie, BandeEngraissement, HistoriqueBoucle
   - Mettre à jour Truie et BandePorcelets
2. **Mettre à jour googleSheets.ts**
   - Fonction getSaillies()
   - Fonction getBandesEngraissement()
   - Fonction getHistoriqueBoucles()
3. **Mettre à jour FarmContext.tsx**
   - Charger nouvelles tables
   - Recalculer alertes GTTT sur nouvelle structure
4. **Mettre à jour AlertEngine.ts**
   - Vérifier logique R1-R6 avec nouveaux champs (DPA, EJA, Taux Mortalité, etc.)
5. **Mettre à jour vues React**
   - AnimalDetailView : afficher Timeline (Saillies → MB → Sevrage)
   - BandesView : afficher EJA + Croissance % + Statut Sanitaire
   - Dashboard : alertes GTTT sur nouvelle structure

### 5.6 Phase 5 : Déploiement + cutover (Jour 5-6)

1. **Derniers tests** sur Sheet + React (sur émulateur Android)
2. **Double-check** : Aucune donnée perdue, tous les historiques copiés
3. **Renommer** : Old Sheet → "BACKUP_2026-04-18", New Sheet → "PRODUCTION"
4. **Informer porcher** : "Nouveau Sheet live à partir de demain, utilisez-le pour les nouvelles entrées"
5. **Surveillance 1 semaine** : Vérifier données entrées, pas d'erreurs format

### 5.7 Phase 6 : Nettoyage + Fermeture (Jour 6-7)

1. Supprimer CHEPTEL_GENERAL (plus besoin, données en FarmContext)
2. Archiver Old Sheet dans dossier Google Drive "Archive Sheets"
3. Documenter dans `.claude/LEARNINGS.md` :
   - Que s'est-il bien passé ?
   - Qu'aurait-on pu faire mieux ?
   - Le porcher a-t-il adopté la nouvelle structure ?

---

## 6. AVANTAGES DE LA NOUVELLE STRUCTURE

### Pour le porcher (UX terrain)
| Besoin | Ancien Sheet | Nouveau Sheet |
|--------|------|---------|
| "Dans combien de jours la mise-bas ?" | Compter les jours à partir de Notes | Colonne DPA → "3 jours" |
| "Quand finir cette bande ?" | Calcul mental poids/croissance | Colonne EJA → "28 avril" |
| "Quelle truie avait la boucle #42 ?" | Balayer tout le troupeau | HISTORIQUE_BOUCLES → LOG complet |
| "Cette bande a-t-elle un problème santé ?" | Comparer poids estimé vs attendu | Colonne Croissance + Alertes auto |

### Pour l'exploitation (KPIs)
| Métrique | Ancien Sheet | Nouveau Sheet |
|----------|------|---------|
| Prolificité (NV moyen/truie/an) | Compter portées manuellement | TRUIES.Nb Portées Historiques (auto) |
| Taux mortalité en maternité | Dans Notes | PORTEES.Taux Mortalité % (auto) |
| Croissance moyen par bande | Estimation | BANDES.Croissance g/j (pesée → auto) |
| Coût alimentaire par porc | Non tracé | BANDES.Coût Alimentaire Cumulé (auto) |
| Durée de cycle Saillie→Abattage | Inconnu | Timeline complète + EJA |

### Pour PorcTrack 8 (Tech)
| Aspiration | Ancien | Nouveau |
|----------|--------|---------|
| Alertes automatiques | 6 règles, mais données fragmentées | Données structurées → alertes 100% couvertes |
| Traçabilité génétique | Impossible (pas lien Saillie→Portée→Bande) | SAILLIES.ID → PORTEES.saillie_id → BANDES.portee_id |
| Audit trail | Boucles perdues, changements non loggés | HISTORIQUE_BOUCLES complet |
| Intégration Excel export | Difficile (données non normalisées) | Facile (requête SQL-like simple) |
| Machine Learning futur | Pas assez de données structurées | Données de qualité → modèles prédictifs possibles |

---

## 7. QUESTIONS FRÉQUENTES

**Q : Et s'il manque une donnée historique (ex : date saillie 2024) ?**  
A : Ajouter ce qu'on a dans SAILLIES (truie, verrat, résultat estimé). Pour dates perdues, écrire "?" ou "Circa" + approximation. Le porcher peut enrichir après. Important : ne pas bloquer sur perfectionnisme → 90% des données vallent mieux que 0%.

**Q : Comment on gère la saisie porcher en terrain (pas de connexion) ?**  
A : Utiliser l'app PorcTrack 8 → elle gère le offline + sync auto. Le Sheet reste la source de vérité (read-only pour porcher via Googlesheet mobile, écriture via FarmContext).

**Q : Et les boucles qui tombent en plein engraissement ?**  
A : Ajouter dans HISTORIQUE_BOUCLES comme d'habitude. La perte d'ID physique ne bloque pas : on a toujours ID Système (BD_001) + Généalogie (Portée source).

**Q : On peut vraiment supprimer CHEPTEL_GENERAL ?**  
A : Oui. Tout ce qui y était = calculable depuis TRUIES + VERRATS + BANDES. FarmContext le recalcule en temps réel. Garder 1 mois pour sécurité = le copier en "CHEPTEL_GENERAL_BACKUP_2026-04" s'il faut comparaison.

**Q : Comment on formule les alertes R1-R6 maintenant ?**  
A : Voir section 4.5. La logique bouge pas (encore 6 règles) mais les colonnes sources changent (DPA au lieu de "Statut=Gestation", EJA au lieu d'estimation, etc.).

---

## 8. CHECKLIST PRE-PRODUCTION

- [ ] Backup old Sheet téléchargé + archivé
- [ ] Nouvelle structure crée + colonnes validées avec porcher
- [ ] Tous les historiques saillies migrés + dates vérifiées
- [ ] Tous les historiques portées + bandes migrés + vivants/morts cohérents
- [ ] HISTORIQUE_BOUCLES complété pour au moins 6 mois back
- [ ] Énumérations TABLES_INDEX remplies + dropdowns opérationnels
- [ ] googleSheets.ts actualisé + getSaillies/getBandesEngraissement/etc. testés
- [ ] FarmContext renouvele + alerts GTTT testées en React
- [ ] Dashboard affiche timeline truies (Saillie→MB→Sevrage)
- [ ] BandesView affiche EJA + Croissance % + Alerte finition
- [ ] Aucun hex/typo dans colonnes (validé avec porcher)
- [ ] 1 semaine test en parallèle (ancien + nouveau Sheet)
- [ ] Porcher signe "J'ai vérifié les données, OK pour switch"

---

## 9. DÉPENDANCES ET ORDRE DE TRAVAIL POUR AGENT CLAUDE

**Blockages** (à faire en ordre) :
1. Migration données historiques SAILLIES + PORTEES (fondation)
2. Mise à jour types TypeScript (`src/types/farm.ts`)
3. Mise à jour mappers data
4. Mise à jour googleSheets.ts (5 nouvelles fonctions)
5. Mise à jour FarmContext (charger nouvelles tables)
6. Mise à jour AlertEngine.ts (logique alertes sur nouvelles sources)
7. Tests React + visual verification

**Parallélisable** (une fois 1-2 fait) :
- PremiumUI updates si changement structure affichage
- AnimalDetailView timeline
- BandesView enhancements
- Documentation `.claude/SESSION_MEMORY.md`

---

## 10. CONCLUSION

Cette refonte élimine 6 catégories de problèmes métier majeurs :
1. ✅ Traçabilité boucles complète
2. ✅ Reproduction tracée fin-à-fin (Saillie→Portée→Bande)
3. ✅ Post-sevrage suivi détaillé (poids, croissance, EJA)
4. ✅ Alertes GTTT alimentées de données fiables
5. ✅ Historiques auto-calculés (portées, boucles, croissance)
6. ✅ Définitions standardisées (statuts, catégories, résultats)

**Impact attendu** :
- Porcher gagne **20 min/jour** (alertes auto au lieu de calculs manuels)
- Exploitation gagne **visibilité complète** cycle animal (génétique + croissance + sanitaire)
- Tech (PorcTrack) gagne **données normalisées** pour future IA/ML

**Démarrage préconisé** : Dès demain matin, phase 1-2 (Jours 0-1) pour validation porcher. Production week 2.

