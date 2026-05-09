# Brief — Senior Testeur · PorcTrack 8 · sprint V75

**Date** : 2026-05-09
**Build prod** : commits `269333c` → `7273dbe` (V75 a→f) sur `main`, déployés 10:39:41 UTC

---

## Ce qu'on te demande

Tester l'app PorcTrack 8 en production, persona **éleveur de porcs professionnel** (naisseur-engraisseur). On a livré 2 chantiers en parallèle :

1. **Naming & Cohérence (V75 a/b/c)** : 8 frictions UX corrigées dans l'app (compte audit-final).
2. **Refonte Landing (V75 d/e/f)** : nouvelle vitrine `/landing-v2` avec vidéo cinématique + DNA visuel strict.

Tu remontes :
- ✅ Ce qui marche bien (qu'on garde)
- ❌ Frictions résiduelles (avec gravité P0/P1/P2 et `fichier:ligne` si tu le sais, sinon décris l'écran et les étapes)
- 💡 Améliorations suggérées (ne pas implémenter — juste signaler)

Format de retour : un fichier markdown ou un voice memo, peu importe. L'important est le détail.

---

## URLs et accès

| Ressource | URL |
|---|---|
| Landing publique | https://porctrack.tech/landing-v2 |
| App principale | https://porctrack.tech/today |
| Marius (chatbot) | Icône en haut à droite → **bulle conversation** dans Réglages ou Aujourd'hui |

**Compte test** :
- Email : `audit-final@porctrack.test`
- Mot de passe : `AuditFinal2026!`
- Profil : OWNER, ferme "Ferme Audit Test", 50 truies + 3 verrats + 92 porcelets + 6 bandes + 0 loge

Si tu te déconnectes, tu peux te reconnecter via https://porctrack.tech/login

---

## Les 8 frictions audit V74 corrigées (à valider visuellement)

### P0 — bloquantes UX éleveur

**P0-1** · Alertes Aujourd'hui pour réformes
- **Avant** : 5 alertes "Réforme suggérée — T-046..T-050" sur des truies *déjà en réforme* (faux positifs quotidiens)
- **Maintenant** : 5 alertes "À vendre — T-046..T-050" tag `Cette semaine`, message "Marquer comme vendue ou abattue depuis sa fiche"
- **À tester** : ouvre `/today` → vérifier les 5 alertes affichent bien "À vendre — T-XXX"

**P0-2** · Naming des bandes (UUID exposé)
- **Avant** : listings affichaient "Bande 21af315c…", "Bande 56284a1c…" (UUID tronqué — illisible)
- **Maintenant** : "Bande Mai 2026 · T-031", "Bande B-AUDIT-CR", etc. selon données disponibles
- **À tester** : navigue Élevage > Bandes / Reproduction (timeline cycles) / Performance (Top performances) / Marius (cite-lui un cycle, vérifie qu'il dit le nom et pas un UUID)

### P1 — frictions sérieuses

**P1-1** · H1 page Élevage
- **Avant** : "Mes animaux" (jugé infantilisant pour un éleveur professionnel)
- **Maintenant** : "Élevage"
- **À tester** : Élevage tab → titre principal

**P1-2** · Filtre "À vendre" sur Truies
- **Avant** : 28+11+6 = 45 truies visibles sur 50 (les 5 réformées invisibles)
- **Maintenant** : pill `À vendre (5)` ajoutée. Total cohérent : Toutes(50) / Pleines(28) / Maternité(11) / Vides(6) / À vendre(5)
- **À tester** : Élevage > Truies → barre de filtres, clic "À vendre" → 5 truies T-046..T-050

**P1-5** · Bouton fiche truie selon statut
- **Avant** : "Passer en réforme" actif même sur truies déjà réformées
- **Maintenant** :
  - Truies "À surveiller" → bouton "Sortir cette truie"
  - Truies déjà réformées → bouton "Marquer comme vendue (bientôt)" *désactivé v1* (le dialog vente/abattoir/mortalité arrive bientôt)
- **À tester** : ouvre la fiche T-001 (active) puis T-046 (réformée), compare les boutons en bas de page

**P1-6** · Breadcrumb audit terrain
- **Avant** : `Outils › Audit terrain` (l'onglet Outils a été supprimé du brief V70)
- **Maintenant** : `Aujourd'hui › Audit terrain`
- **À tester** : `/today` → "Démarrer la tournée" → vérifier le fil d'ariane

### P2 — polish

**P2-3** · Marius auto-submit
- **Avant** : cliquer une suggestion remplissait juste l'input (il fallait cliquer "Envoyer" séparément)
- **Maintenant** : clic suggestion = envoi automatique (pattern type ChatGPT)
- **À tester** : ouvre Marius → clique une des 3 suggestions → la réponse arrive sans clic supplémentaire

**P2-6** · Performance Top — cohérence affichage
- **Avant** : Top 1 montrait "Bande {UUID}…" et Top 2 "Bande T-016" (inconsistance entre lignes voisines)
- **Maintenant** : les deux utilisent `formatBandeName()` (même format)
- **À tester** : Performance tab → section "Top performances"

---

## Refonte Landing — `/landing-v2`

7 sections en scrollytelling GSAP + Lenis. Validation visuelle souhaitée :

1. **Hero** : vidéo Creatify autoplay loop muet, headline "LA PRÉCISION EN PLEIN ÉLEVAGE.", 2 CTAs (vert forêt + ghost ivoire)
2. **3 floating cards** : REPRO T-031, BANDE Mai 2026, ALERTE À sortir T-018 (en quinconce gauche/centre/droite)
3. **Video break** : photo plein écran feeder/paille (placeholder vidéo 2 — à venir)
4. **Pour qui** : 3 profils (Éleveur seul / Équipe / Coopérative) en grid responsive
5. **Comment ça marche** : 3 étapes (Saisis bande / L'app calcule / Marius alerte) avec gros 1/2/3 ambre
6. **Marius** : section vert forêt avec capture conversation
7. **CTA final + footer** sobre 1 ligne

**Points à valider en particulier** :
- [ ] Vidéo charge et boucle (pas de saut visible)
- [ ] Watermark Creatify masqué par voile dégradé bottom (regarde le coin bas-droite — on doit voir le voile cream prendre le dessus)
- [ ] CTAs cliquables — "Démarrer mon élevage" → /signup
- [ ] Lecture mobile (DevTools 360px width) → poster fallback au lieu de la vidéo (perf)
- [ ] Aucune couleur hors palette (pas de noir générique #0a0a0a, pas de vert mint #10b981)

---

## 5 scénarios de test guidés (~30-45 min total)

### Scénario 1 — Éleveur ouvre l'app le matin (~5 min)
1. Connecte-toi avec audit-final
2. Tu arrives sur `/today` — observes les 5 alertes
3. Clique sur une alerte "À vendre — T-046" → tu arrives sur la fiche
4. Vérifie : statut "Réforme", "0 portée", bouton "Marquer comme vendue (bientôt)" *désactivé*
5. Reviens en arrière (breadcrumb ou tab Élevage)

### Scénario 2 — Filtrer les truies à vendre (~3 min)
1. Onglet Élevage → tab Truies
2. Pill "À vendre (5)" → clique
3. Vérifie : 5 truies T-046..T-050, pill statut "À VENDRE" sur chaque

### Scénario 3 — Cycle reproduction (~5 min)
1. Onglet Reproduction
2. Vérifie les KPIs Pleines/Maternité/Vides/MB 7J
3. Si un cycle est affiché, vérifie le titre format "Bande {Mois Année} · J{N}"

### Scénario 4 — Marius (~5 min)
1. Ouvre Marius depuis Réglages (icône bulle)
2. Clique la suggestion "Que dois-je faire aujourd'hui en priorité ?"
3. Vérifie : la réponse arrive **sans** clic supplémentaire (auto-submit)
4. Lis la réponse — Marius doit citer T-026, T-016, et les bandes par leur **nom métier** (pas par UUID)
5. Pose une question custom : "Quelle est la situation de la bande Mai 2026 ?" — voir si Marius répond cohéremment

### Scénario 5 — Audit terrain + tournée (~5 min)
1. `/today` → "Démarrer la tournée"
2. Vérifie le breadcrumb : `Aujourd'hui › Audit terrain` (plus aucun "Outils")
3. Réponds aux 3 questions
4. Note : la tournée annonce "12 points" mais en a 3 — c'est un point hors-scope V75 (à signaler si tu veux mais on est au courant)

### Scénario 6 — Landing publique (~3 min)
1. Déconnecte-toi
2. Va sur https://porctrack.tech/landing-v2
3. Scrolle de haut en bas
4. Note ce qui te plaît / déplaît, le rythme du scroll, les zones illisibles si la vidéo gêne le texte

---

## Hors-scope V75 — connu et assumé

Les points suivants sont identifiés mais pas dans ce sprint :

- **Listing Porcelets** (P1-3) : "92 porcelets" annoncés mais 4 lignes affichées. À résoudre prochain sprint (vrac vs représentant par bande à trancher).
- **Audit "12 points"** (P1-4) : la tournée dit "12 points" mais le questionnaire en a 3. Soit étendre, soit corriger le label.
- **Polish KPIs Repro** (P2-1, P2-2) : "MATERNI." tronqué, timeline gestation/MB doublonnée.
- **Roadmap visible utilisateur** (P2-5) : Réglages mentionne "graphiques avancés et export PDF arrivent prochainement".
- **Vidéo 2 finishing-pen** : la 3e section landing est un placeholder photo en attendant.
- **Dialog "Marquer comme vendue"** : bouton désactivé v1, dialog vente/abattoir/date à venir.
- **Mobile portrait 9:16** : la vidéo hero tombe sur poster fallback en dessous de 768px (pas de regen 9:16 v1).

---

## Comment remonter tes frictions

Format préféré (un par friction) :

```
### F-{N} · {titre court}
- Gravité : P0 / P1 / P2
- Écran : URL exacte ou nom de l'onglet
- Reproduction :
  1. Étape
  2. Étape
  3. Résultat observé
- Résultat attendu :
- Capture (optionnel) :
- Note métier éleveur (optionnel) :
```

Exemple :
```
### F-15 · Fiche verrat ne montre pas le rythme de saillies
- Gravité : P1
- Écran : /troupeau/verrats/V-001
- Reproduction :
  1. Tab Élevage > Verrats > clic V-001
  2. Pas de section "saillies du mois"
  3. Difficile de juger l'activité du verrat
- Résultat attendu : section "3 saillies / mois" ou similaire
- Note : un éleveur expert calcule mentalement, mais pour un porcher
  débutant cette donnée doit être visible.
```

Si tu trouves des frictions critiques (P0) qui rendent l'app inutilisable pour un usage métier, signale-le immédiatement par WhatsApp / appel — on patche en hot-fix.

---

## Contact

- **Christophe** (orchestrateur projet) · WhatsApp / contact@liegeoischristophe.com
- **Bug critique en prod** : ouvrir un GitHub issue sur https://github.com/bethd446/PorcTrack8 avec label `prod-incident`

Bon test 🐷
