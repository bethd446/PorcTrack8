# Audit comportemental V13 — porctrack.tech

Date : 2026-05-01 18h45
Compte : contact@liegeoischristophe.com (admin Christophe, ferme K13)
Méthode : test click-by-click sur prod, snapshot DOM avant/après chaque action, scoring friction 1-5.

Légende friction :
- 1 = parfait, attendu
- 2 = mineur (cosmétique)
- 3 = friction notable (l'user hésite mais comprend)
- 4 = bloquant doux (l'user trouve mais perd 30s+)
- 5 = bloquant dur (l'user abandonne ou se trompe)

Légende bug :
- 🚨 BLOC = bloque un parcours métier
- 🐛 BUG = comportement incorrect
- ⚠️ UX = friction UX importante
- 💡 IMPROV = amélioration suggérée
- ✅ OK = fonctionne comme attendu

---

## 1. Sidebar (20 items testés)

| Item | URL réelle | H1 destination | Verdict |
|---|---|---|---|
| Inbox alertes 7 | `/alerts` | Alertes | ✅ OK |
| Audit du jour | `/audit` | Audit cohérence | ⚠️ UX libellé "audit cohérence" obscur pour fermier |
| **Tâches** | `/audit` | Audit cohérence | 🚨 BLOC **DOUBLON** — pointe sur la même URL que "Audit du jour" |
| Troupeau | `/troupeau` | Troupeau | ✅ OK |
| Vue globale (Cycles) | `/cycles` | Cycles | ✅ OK |
| Reproduction | `/cycles/repro` | Reproduction | ✅ OK |
| Maternité | `/cycles/maternite` | Maternité | ✅ OK |
| Post-sevrage | `/cycles/post-sevrage` | Post-sevrage | ✅ OK |
| Croissance | `/cycles/croissance` | Croissance | ✅ OK |
| Engraissement | `/cycles/engraissement` | Engraissement | ✅ OK |
| Finition | `/cycles/finition` | Finition | ✅ OK |
| Sortie | `/cycles/sortie` | Sortie | ✅ OK |
| Performance | `/pilotage/perf` | Performance | ✅ OK |
| Finances | `/pilotage/finances` | Finances | ✅ OK |
| **Rapports** | `/pilotage/finances/rapport` | Rapport financier | ⚠️ UX architecturalement enfant de Finances mais affiché autonome dans sidebar — confusion |
| Prévisions | `/pilotage/previsions` | Prévisions | ✅ OK |
| Aliments | `/ressources/aliments` | Aliments | ✅ OK |
| Pharmacie | `/ressources/pharmacie` | Pharmacie | ✅ OK |
| **Utilisateurs** | `/admin` | Administration | ⚠️ UX libellé sidebar "Utilisateurs" mais page = "Administration" (pas dédié) |
| **Ferme & Système** | `/more` | Réglages | ⚠️ UX URL `/more` = fourre-tout, label sidebar ≠ titre page |

→ **Bug bloquant** : doublon Tâches/Audit du jour (2 items pour 1 destination).
→ **Confusion architecture** : Rapports rattaché aux finances (Cohérent ? Si oui afficher en sous-item, pas autonome).
→ **Drift labels** : sidebar disait "Utilisateurs" / "Ferme & Système" mais routes "Administration" / "Réglages" → cohérence label↔titre cassée.

## 2. Actions critiques sur /today

| Action | URL avant | URL après | Effet observé | Effet attendu | Verdict |
|---|---|---|---|---|---|
| Click "ALERTE STOCK Bas — Aliment engraissement" | /today | `/alerts` | Page Alertes générique | `/ressources/aliments?filter=stock-bas` direct | 🚨 BLOC fix B2 incomplet |
| Click "ALERTE Sevrage à Confirmer — Bande 26-T10-01" | /today | `/alerts` | Page Alertes générique | Fiche bande + modal "Confirmer sevrage" | 🚨 BLOC |
| Click LINK "Bande 26-T10-01 J+18 retard" (région Sevrages) | /today | `/troupeau/bandes/{uuid}` | Fiche bande chargée | Idem | ✅ OK (seul cas qui marche, parce que `<a>` natif) |
| Click "CONFIRM SEVRAGE — Bande 26-T19-01" (Confirmations en attente) | /today | `/alerts` | **Ouvre modal "Déclarer une mortalité"** !! | Modal "Confirmer le sevrage de 26-T19-01 ?" | 🚨🚨 BUG CATASTROPHIQUE handler attribué à la mauvaise action |
| Click "Lancer un audit" | /today | `/audit` | Page audit cohérence | Idem | ✅ OK |
| Click pill ÉPINGLÉ "Bande 26-T9-01" | /today | `/troupeau/bandes/{uuid}` | Fiche bande chargée | Idem | ✅ OK |
| Click bouton "Rechercher⌘K" | /today | /today | Modal command palette s'ouvre | Idem | ✅ OK |
| Tape "T13" dans recherche | (modal open) | (modal open) | 58 items, 1er = "Aujourd'hui" | 1er = fiche T13 (match exact prioritaire) | ⚠️ UX fuzzy search non-prioritaire |
| Click Marius FAB | /today | /today | Modal Marius "Bonjour, je suis Marius. Posez une question." | Idem | ✅ OK |

## 3. Parcours métier "Saisir saillie T13"

| # | Action | Verdict |
|---|---|---|
| 1 | Sidebar > Troupeau > onglet TRUIES > click T13 | ✅ |
| 2 | Fiche T13 : 2 boutons proéminents = "NOUVEL ÉVÈNEMENT" + "IMPRIMER" | ⚠️ pourquoi IMPRIMER aussi proéminent que la création évènement ? |
| 3 | Click "NOUVEL ÉVÈNEMENT" | 🚨 BLOC ouvre modal **édition métadonnées** (nom/boucle/race/photo/ration/stade) PAS un formulaire saillie |
| 4 | Pas de bouton "Saisir saillie" / "Saisir mise-bas" / "Saisir IA" dédié visible | 🚨 BLOC parcours métier inexistant |
| 5 | Pas de champ "Verrat utilisé" → traçabilité génétique cassée | 🚨 BLOC modèle métier |
| 6 | Pour bricoler : changer manuellement "STATUT: En attente saillie → Pleine" + saisir "DATE MB PRÉVUE" (calcul à la main aujourd'hui+115j) | 🚨 charge cognitive injustifiée |

## 4. Parcours métier "Déclarer mort porcelet bande 26-T9-01"

| # | Action | Verdict |
|---|---|---|
| 1 | Sidebar > Troupeau > onglet BANDES | ✅ |
| 2 | Click card "26-T9-01" dans la liste | 🚨 BUG ROUTING URL change vers `/troupeau/bandes/{uuid}` MAIS la fiche ne se rend pas, on reste sur la liste |
| 3 | Solution forcée : copier-coller URL directe | 🚨 inacceptable terrain |
| 4 | Sur fiche : 4 actions en bas = "Déclarer mortalité" × 2 + "SOIN" + "NOUVELLE PESÉE" | ⚠️ doublon visuel (2 boutons mortalité) |
| 5 | Click "Déclarer mortalité" | confirmation modale "irréversible" (faussement alarmant — la donnée est éditable après) |
| 6 | Click "CONTINUER" | ouvre formulaire mortalité |
| 7 | Formulaire : `valuemax="0"` sur spinbutton "Nombre de morts" (max devrait être 7 = vivants) | 🐛 BUG constraint min/max |
| 8 | "CAUSE SUSPECTÉE" combobox vide (pas de liste pré-remplie diarrhée/hypothermie/écrasement) | ⚠️ effort saisie |
| 9 | Pas de date du décès (forcée à aujourd'hui implicite) | ⚠️ rétroactif impossible |
| 10 | Pas de sexe, pas d'ID porcelet (si mortalité unitaire) | ⚠️ traçabilité limitée |

## 5. /today — Cognitive load

Régions affichées simultanément :
1. "Bonjour, Christophe / Vendredi 1 Mai 2026"
2. "ALERTES CRITIQUES · 5"
3. "SEVRAGES · 3 EN RETARD, 0 CETTE SEMAINE"
4. "CYCLES EN COURS · 14 bandes actives · 7 phases"
5. "CONFIRMATIONS EN ATTENTE · 5"
6. "AUDIT DU JOUR · Aucun audit enregistré · Lancer un audit"

→ **Pas de "Single Most Important Action"**. L'éleveur voit ~13 trucs à régler sans hiérarchie.
→ **Doublon sémantique** : "ALERTES CRITIQUES" et "CONFIRMATIONS EN ATTENTE" se chevauchent (même bandes 26-T19-01 / 26-T14-02 dans les deux).
→ **Vocabulaire** : "phases", "GTTT" (jargon technique non traduit pour fermier).

## 6. Marius (chatbot)

- ✅ FAB persistant bas-droit visible partout
- ✅ Modal s'ouvre avec input "Posez une question sur votre élevage."
- ❌ Pas proactif (n'indique pas les 5 alertes à traiter)
- ❌ Pas de suggestions d'actions ("Saisir saillie", "Voir bandes en retard", etc.)
- ❌ Backend Marius pas branché (cf. plan Hermes en attente)

## 7. Recherche globale ⌘K

- ✅ Modal s'ouvre avec liste pages
- ⚠️ Fuzzy search faible : tape "T13" → 1er résultat = "Aujourd'hui" (au lieu de la fiche T13)
- ⚠️ 58 items pour une recherche aussi spécifique que "T13" = pas de scoring
- 💡 Manque section "Actions" (Saisir saillie / Mise-bas / Mort) dans la palette

## 8. Synthèse — Top 10 fixes priorisés pour la refonte

| Rang | Bug | Type | Friction | Impact métier |
|---|---|---|---|---|
| 1 | "NOUVEL ÉVÈNEMENT" → modal métadonnées (au lieu de form saillie/mise-bas) | 🚨 BLOC | 5 | Saisie saillie impossible proprement |
| 2 | "CONFIRM SEVRAGE" → ouvre modal "Mortalité" | 🚨 BUG | 5 | Risque données fausses (mort déclarée au lieu de sevrage confirmé) |
| 3 | Click card bande dans liste → URL change mais fiche pas rendue | 🚨 BUG | 5 | Parcours fiche bande cassé (10+ bandes/jour) |
| 4 | Cards alertes critiques /today → /alerts générique (pas /ressources?filter=… ni fiche bande) | 🚨 BLOC | 4 | 5 alertes/jour non actionables direct |
| 5 | Sidebar "Tâches" et "Audit du jour" → même URL /audit | 🚨 BLOC | 3 | Confusion nav |
| 6 | Spinbutton mortalité `valuemax="0"` (devrait être nb vivants) | 🐛 BUG | 3 | Saisie impossible si >1 mort |
| 7 | 2 boutons "Déclarer mortalité" cote à cote sur fiche bande | ⚠️ UX | 3 | Confusion clic |
| 8 | /today : 6 régions sans hiérarchie, pas de Single CTA | ⚠️ UX | 4 | Cognitive overload daily |
| 9 | Modal mortalité confirme AVANT saisie ("irréversible" alarmant) | ⚠️ UX | 3 | Anti-pattern, peut décourager saisie |
| 10 | Recherche globale faible (T13 → 1er = "Aujourd'hui") | ⚠️ UX | 2 | Recherche peu utilisable |

