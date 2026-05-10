# Prompt Claude Design 3b — Onboarding + Modals

> Ce prompt 3b vient APRÈS le prompt 3a (Ressources + Reproduction).
> Le prompt 3 complet a timeout SSE deux fois (~40k tokens limit). On scinde donc en 3a, 3b, 3c.
>
> **Pièces attachées obligatoires** :
> 1. `elevage-mockup-v76.html`
> 2. `reglages-pilotage-mockup-v76.html`
> 3. `ressources-reproduction-mockup-v76.html` (livrable du prompt 3a)

---

## Contexte

3ème mockup d'une série de 4. Tu as déjà livré :
- Mockup 1 : Élevage v76 (10 écrans + system + notes)
- Mockup 2 : Réglages-Pilotage v76 (16 écrans + bonus)
- Mockup 3a : Ressources + Reproduction (9 écrans)

Ce **prompt 3b** ne couvre que **2 groupes** : Onboarding wizard (5 étapes) + Modals quick-add (6 sheets). Le prompt 3c (Marius + patterns transverses + bonus) viendra après.

## Persona — inchangé

Yao + Aïssa. Mobile Android Chrome 4G, 6h matin.

## DNA — verrouillé (rappel court)

13 tokens `--pt-*` + 3 fonts (Big Shoulders / Instrument Sans / JetBrains Mono) + eyebrow mono uppercase 0.14em + tabular-nums + Lucide icons (jamais d'emojis) + patterns établis (`card-link`, `priority-line`, `score-billboard`, `alert-card`, `ph--primary`, `id-strip`, `cycle__rail`, Pills 7 variants, EntityAvatar 5 espèces, FAB primary).

Anti-AI feel : pas de gradient text, pas de glassmorphism, pas de cards icône+titre+sub clonées, pas de hero metric SaaS, pas de copy "Découvrez/Optimisez/Boostez".

## Scope — 11 livrables

### Groupe C — Onboarding wizard (5 étapes plein écran)

`/onboarding-v2` ou `/reglages/onboarding`. Wizard obligatoire première connexion + rejouable depuis Réglages > "Refaire le tutoriel". Format **plein écran** (pas de BottomNav visible pendant le wizard) :

**Header wizard commun (pattern)** :
- Bouton "Skip" discret en haut droite (mono uppercase 11px color subtle)
- Indicateur progression : `Étape N / 5` mono à gauche
- Titre étape Big Shoulders 28px uppercase (variante du h1 plus compact)

**Footer wizard commun** :
- Bouton secondaire "← Précédent" (ghost, désactivé sur étape 1)
- Bouton primary "Continuer" (sauf étape 5 → "C'est parti")

**Body wizard** : centré verticalement sur l'écran, illustration + texte + interaction. Animation suggérée slide-X entre étapes.

#### C.1 — Étape 1/5 — Bienvenue PorcTrack

**Heading** "Bienvenue dans **PorcTrack**" (gras sur "PorcTrack" Big Shoulders 900). Sub : "L'app GTTT pour les naisseurs-engraisseurs d'Afrique de l'Ouest. Une fois configurée, tu n'oublies plus rien."

**Illustration** : `<PigSilhouette size={96} strokeWidth={1.25} />` Lucide centré OU illustration custom métier (dessin line-art primary 2px d'une silhouette truie + 3-4 porcelets sous elle, cohérent avec le brief V70). Couleur strict `--pt-primary`, pas de gradient.

**Mini cycle viewer** : timeline 5 nœuds (Saillie → Écho J28 → MB J115 → Maternité → Sevrage J143) en bas du body, statique (pas d'interaction), pour illustrer ce que l'app va suivre. Réutilise pattern `cycle__rail`.

#### C.2 — Étape 2/5 — Alertes biologiques

Title "**14+ alertes** veillent sur ton élevage". Sub : "PorcTrack analyse ton troupeau en continu et te ping quand quelque chose mérite attention."

**Body** : 4 catégories en grid 2×2 cards. Chaque card :
- Icône Lucide carrée colorée selon catégorie (40px)
- Titre catégorie Big Shoulders 18px uppercase
- Sub : count règles + 2-3 exemples mono italic

Catégories :
- **Reproduction** (icône Heart, fond `--pt-truie-bg`) — 5 règles : Mise-bas imminente · Sevrage dû · Retour chaleur
- **Santé** (icône Stethoscope, fond `--pt-warm`) — 3 règles : Mortalité anormale · Portée orpheline · Manque pesée
- **Stock** (icône Package, fond `--pt-warm-deep`) — 3 règles : Aliment <2j · Véto bas · Vermifuge rupture
- **Performance** (icône TrendingUp, fond `--pt-bande-bg`) — 3 règles : Réforme zootechnique · Surdensité · Prêt abattoir

**Pas de liste plate des 16 règles** — juste donner l'idée. CTA "Continuer".

#### C.3 — Étape 3/5 — Ajouter ta première truie

Title "Tu commences avec **une truie**". Sub : "Code, boucle, statut. C'est tout ce qu'il faut pour démarrer."

**Embedded mini-form simulé** (ne soumet rien réellement, c'est un teaser éducatif) :
- Champ "Code de la truie" pré-rempli `T-001` mono
- Champ "Boucle officielle" placeholder `CI-001-26`
- Champ "Statut" radio (Vide ✓ / Pleine / Maternité)
- Champ "Date naissance" datepicker mock (aujourd'hui par défaut)

**Animation au validate (pas de vraie écriture DB)** : la card "T-001" pop in dans une mini-liste à droite/dessous. Toast success "Première truie ajoutée — bienvenue dans le troupeau".

CTA "Continuer".

#### C.4 — Étape 4/5 — Enregistrer une saillie

Title "**Saillie** = J0 du cycle". Sub : "Tu notes la saillie aujourd'hui, PorcTrack calcule pour toi écho J28, mise-bas J115, sevrage J143."

**Mock fiche truie T-001** simplifiée + bouton "+ Saisir évènement" → sheet bottom mockup avec choix `Saillie` `Écho` `Mise-bas` `Sevrage` `Réforme`. Sélection Saillie → champ Verrat (V-001 par défaut) + Date saillie (aujourd'hui).

**Animation au validate** : la timeline cycle se peuple progressivement (J0 saillie → J28 écho calculé → J115 MB calculée → J143 sevrage calculé). Noeuds qui s'allument en cascade dans le rail. Toast success "Cycle démarré · MB prévue 03/09/2026".

CTA "Continuer".

#### C.5 — Étape 5/5 — Comprendre tes KPIs

Title "**ISSE, GMQ, Marge**. Ton tableau de bord en un coup d'œil." Sub : "À tout moment, tu sais où en est ton élevage."

**Mini score billboard** (variant compact) : lettre `B` Big Shoulders 80px primary + sub `64/100 · Bon`. Pondérations en sub mono.

**Trois cards-link** vers encyclopédie :
- Comprendre l'ISSE (Lucide Heart) — sub `Indice Sevré-Saillie · cible >12`
- Comprendre la marge (Lucide Banknote) — sub `Calcul live FCFA`
- Comprendre la réforme (Lucide LogOut) — sub `Quand sortir une truie`

CTA primary final : **"C'est parti — voir mon élevage"** → redirect /today (à indiquer dans le mockup en commentaire).

### Groupe D — Modals quick-add (6 sheets bottom)

Pattern commun **bottom-sheet** mobile :
- Hauteur max 90vh, drag handle 40×4px en haut centré (color subtle)
- Backdrop semi-opaque `rgba(0,0,0,0.45)`
- Body padding 20px, scrollable si contenu long
- Sticky footer avec 2 boutons (Annuler ghost · Action primary)
- Fermeture : swipe-down OR backdrop-click OR bouton X discret en haut droite

**Pour chaque modal, montre 2 états** : état initial vide + état rempli avec données réelles.

#### D.1 — Quick add Truie — `<QuickAddTruieForm>`
Header sheet : eyebrow `NOUVELLE TRUIE`, titre Big Shoulders 22px `Ajouter une truie`. Champs :
- **Code** : input mono pré-rempli auto-gen `T-051` (next available)
- **Boucle officielle** : input libre, placeholder `CI-051-26`
- **Statut** : radio chips (Vide / Pleine / Maternité / À surveiller)
- **Date naissance** : datepicker
- **Loge** : select avec liste loges disponibles
- **Truie mère** : autocomplete (chercher par code)
- **Verrat origine** : select

Validation inline : code unique requis. CTAs sticky : `Annuler` · `Enregistrer la truie`.

#### D.2 — Quick add Verrat — `<QuickAddVerratForm>`
Header `NOUVEAU VERRAT`, titre `Ajouter un verrat`. Champs : Code `V-004`, Boucle, Date naissance, Origine (libre), Ration kg/j numeric. CTAs identiques.

#### D.3 — Quick add Bande — `<QuickAddBandeForm>`
Header `NOUVELLE BANDE`, titre `Ajouter une bande`. Champs :
- **Truie mère** : autocomplete obligatoire (filtre truies en gestation J100+)
- **Date mise-bas** : datepicker (default = aujourd'hui)
- **Nés vivants** : numeric tabular-nums
- **Morts à la naissance** : numeric (default 0)
- **Auto-génère** : `idPortee` aperçu (`Mai 2026 · M-04`) en mono lecture seule

CTAs.

#### D.4 — Quick add Porcelet — `<QuickAddPorceletForm>`
Header `NOUVEAU PORCELET`, titre `Ajouter un porcelet`. Champs :
- **Bande** : select obligatoire
- **Boucle** : input libre, placeholder `CR-13`
- **Sexe** : radio chips (M / F / Inconnu)
- **Poids naissance** : numeric kg avec stepper

CTAs.

#### D.5 — Quick add Loge — `<QuickAddLogeForm>`
Header `NOUVELLE LOGE`, titre `Ajouter une loge`. Champs :
- **Code** : auto-gen selon type (M-04 si maternité, PS-02 si post-sevrage…)
- **Type** : radio chips (Maternité / Post-sevrage / Engraissement)
- **Capacité max** : numeric
- **Position** : libre (`Bâtiment principal Est`)

CTAs.

#### D.6 — Quick saillie + Quick mise-bas (combo)

**Quick saillie** :
- Header `NOUVELLE SAILLIE`, titre `Saisir une saillie`
- Truie (autocomplete filtré truies en chaleur)
- Verrat (select)
- Date saillie (default aujourd'hui)
- **Preview cycle calculé** en bas, juste avant les CTAs : eyebrow `CYCLE PRÉVU` + 3 lignes mono :
  - `Écho J28 · 04/06/2026`
  - `Mise-bas J115 · 30/08/2026`
  - `Sevrage J143 · 27/09/2026`
- CTAs.

**Quick mise-bas** :
- Header `NOUVELLE MISE-BAS`, titre `Saisir une mise-bas`
- Truie (autocomplete filtré truies en gestation J110+)
- Date MB (default aujourd'hui)
- Nés vivants numeric, Morts numeric, Mort-nés numeric
- **Pré-rempli auto** depuis la saillie liée (date attendue affichée en hint)
- CTAs.

## Format livrable

**1 fichier HTML standalone** : `onboarding-modals-mockup-v76.html`. Tous écrans dans le même fichier, séparés par sections.

```html
<body>
  <nav>menu d'ancres</nav>
  <!-- C. Onboarding -->
  <section id="onboarding-1">…</section>
  <section id="onboarding-2">…</section>
  <section id="onboarding-3">…</section>
  <section id="onboarding-4">…</section>
  <section id="onboarding-5">…</section>
  <!-- D. Modals (6 modals empilés visuellement avec backdrop) -->
  <section id="modal-truie">…</section>
  <section id="modal-verrat">…</section>
  <section id="modal-bande">…</section>
  <section id="modal-porcelet">…</section>
  <section id="modal-loge">…</section>
  <section id="modal-saillie-mb">…</section>
</body>
```

Pour les modals, tu peux les présenter empilés avec backdrop simulé (chaque section affiche un viewport mobile + le sheet en overlay bottom). État `initial` (vide) ET état `filled` (avec données réelles) côte à côte si possible.

## Données réelles à intégrer

```
ONBOARDING (avatars éducatifs)
T-001 sample · CI-001-26 · né 14/03/2024 · parité 0
V-001 sample · CI-V01-26 · né 02/02/2024 · ration 2.4 kg/j
Mai 2026 · sample bande · NV 11 · MB 03/05

ONBOARDING C.5 score billboard
Lettre B · 64/100 · Bon
ISSE 11.4 · Marge +575k FCFA

MODAL TRUIE état rempli
Code T-051 · Boucle CI-051-26 · Statut Vide · Né 14/03/2024
Loge sélectionnée : G-02 · Mère T-005 · Verrat origine V-001

MODAL SAILLIE preview cycle
Truie T-013 · Verrat V-002 · Saillie 10/05/2026
Cycle prévu :
  Écho J28 · 07/06/2026
  Mise-bas J115 · 02/09/2026
  Sevrage J143 · 30/09/2026

MODAL MB état rempli
Truie T-026 · Date MB 12/05/2026
NV 12 · Morts 1 · Mort-nés 0
(Saillie liée 17/01/2026 · cycle 116 j cohérent)
```

## Critères d'acceptance

1. ✅ Cohérence 100% avec mockups précédents
2. ✅ Anti-AI feel respecté
3. ✅ Persona Yao testé sur l'onboarding (un éleveur novice doit comprendre en 2 min sans formation)
4. ✅ Modals : touch targets ≥ 44px, drag handle visible, backdrop sombre opaque
5. ✅ Datepickers : pattern natif HTML5 ou custom V70 (préfère natif sauf si UX terrible)
6. ✅ Autocomplete : suggestions filtrées sur frappe, ≥3 résultats visibles, max 6
7. ✅ Données réelles partout (pas de Lorem)
8. ✅ Pour chaque modal, montre vide ET rempli

## Décisions design attendues (3 minimum)

Tranche, explique, livre. Suggestions :
- **Onboarding** : animation slide-X entre étapes, ou stack vertical scrollable plein écran ?
- **Skip** : skip total ou skip step-by-step ? Confirmation avant skip ?
- **Modals** : sticky footer avec 2 boutons OU footer dans le scroll OU FAB sticky en bas droite ?
- **Datepicker** : natif HTML5 mobile OR custom V70 ? (compromis UX vs effort dev)
- **Autocomplete truie/verrat** : full-text search OR liste alphabétique navigable ?

## Effort dev attendu

Estimation jours dev React/Ionic Capacitor (Capacitor Preferences pour persistence onboarding step, Ionic IonModal pour bottom sheets), top 3 priorités, 2 zones d'hésitation.

---

**Sortie attendue : ~2200-2500 lignes HTML, sous le seuil de 30k tokens output.**
