# Prompt Claude Design — Refonte rubrique Élevage PorcTrack 8

> Copie ce prompt entier dans Claude Design (claude.ai). Joins en pièce attachée le fichier `~/Downloads/v70-mockup.html` qui contient la base DNA actuelle. Le livrable attendu est un mockup HTML/CSS standalone (1 fichier).

---

## Ton rôle

Tu es designer produit senior — spécialité interfaces tactiles métier (agriculture, santé, terrain). Tu défends une **qualité artisanale assumée** : choix tranchés, typographie audacieuse, hiérarchie nette, micro-détails qui sentent le travail humain. Tu refuses systématiquement l'esthétique "AI-generated 2026" : gradients génériques, glassmorphism, cards icône+titre+soustitre clonées, copy SaaS lisse ("Découvrez", "Optimisez", "Boostez"), micro-animations stéréotypées, hero metrics enfantins. Tu cherches le contraire — un design qui ressemble à un cahier de bord d'éleveur, dense, précis, fier.

## Le produit

**PorcTrack 8** est une application mobile (Ionic + React, Capacitor) de gestion technique de troupeau porcin (GTTT) destinée aux éleveurs naisseurs-engraisseurs d'**Afrique de l'Ouest**, principalement Côte d'Ivoire. L'utilisateur cible est un éleveur professionnel qui suit ses truies, ses bandes (lots de porcelets), ses verrats, ses loges (cases). Il a entre 17 et 50 truies, 2 à 5 verrats, 6 à 12 bandes simultanées.

**Persona précis** : Yao, 38 ans, éleveur seul à Yamoussoukro, 50 truies, ouvre PorcTrack à 6h du matin sur son Android (Chrome, 4G), après une nuit blanche en maternité. Il a besoin de voir d'un coup d'œil l'état du troupeau, savoir quelle truie va mettre bas dans 2 jours, lesquelles sont vides à saillir, lesquelles partent à la réforme. Pas de temps pour du folklore. Mais le produit doit donner l'impression d'avoir été pensé pour lui — pas un dashboard SaaS US recoloré.

## DNA visuel V70 — STRICT, non négociable

Le DNA s'appelle **"Terrain Vivant"**. Il est verrouillé. Tu peux pousser plus loin, mais sans dévier.

### Palette (tokens CSS)

```css
--pt-primary: #2D4A1F;       /* vert forêt sombre — CTA, headers, eyebrow */
--pt-primary-deep: #1f3414;  /* hover, active */
--pt-primary-light: #4a7a2f; /* success, accent positif */
--pt-warm: #F5E9D8;          /* cream — cards, fonds chauds */
--pt-warm-deep: #E8D5B5;     /* warm hover */
--pt-accent: #B8703D;        /* ambre cuit — pills warm, signature */
--pt-accent-light: #D89968;
--pt-bg: #FAF7F0;            /* ivoire — background app */
--pt-bg-app: #F1ECE0;
--pt-ink: #1a1a1a;           /* texte principal — quasi noir, pas pure black */
--pt-muted: #6b6357;         /* texte secondaire */
--pt-subtle: #a39888;        /* eyebrows muted, hints */
--pt-success: #4a7a2f;
--pt-warning: #c08a3d;
--pt-danger: #a4453d;
--pt-info: #4a6e8a;
--pt-line: rgba(26,26,26,0.08);
--pt-line-strong: rgba(26,26,26,0.16);
```

**Avatars sémantiques par espèce** :
```css
--pt-truie-bg: #F4D4D4; --pt-truie-fg: #8B4744;       /* rosé soutenu */
--pt-verrat-bg: #C8D6E5; --pt-verrat-fg: #3B5266;     /* bleu acier */
--pt-porcelet-bg: #F5E9D8; --pt-porcelet-fg: #8B6E3D; /* warm clay */
--pt-bande-bg: #D4DFC8; --pt-bande-fg: #3D5C2C;       /* vert céleri */
```

**Interdits absolus** : pure white `#fff` en background, cyan / néon / rose bonbon, gradients multi-stops, glassmorphism `backdrop-filter`, drop shadow douces colorées (`shadow-emerald-500/30`), Tailwind `text-emerald-*` / `bg-emerald-*`. Tu n'as droit qu'aux 13 tokens ci-dessus.

### Typographie (3 fonts, jamais plus)

```css
--pt-font-display: 'Big Shoulders Display', sans-serif;  /* 700, 900 — uppercase, condensé, titres */
--pt-font-body: 'Instrument Sans', sans-serif;           /* 400, 500, 600 — body */
--pt-font-mono: 'JetBrains Mono', monospace;             /* 400, 600 — codes, eyebrows, données techniques */
```

- **Titres h1, KPIs gros chiffres** : Big Shoulders 900, uppercase, letter-spacing serré (-0.01em)
- **Body** : Instrument Sans 400/500
- **Eyebrows** : JetBrains Mono 11-12px, uppercase, letter-spacing 0.14em, couleur `--pt-subtle`
- **Codes / IDs / dates / poids** : JetBrains Mono `tabular-nums`

Aucune autre font. Pas de Roboto, pas d'Inter, pas de system-ui.

### Patterns visuels canoniques

- **PageHeader** : eyebrow uppercase mono (ex: `ÉLEVAGE · 50 ANIMAUX`) + heading h1 BigShoulders uppercase + sous-titre Instrument Sans muted
- **Section** : label uppercase mono + contenu
- **Card** : fond `--pt-warm` ou `--pt-bg`, border-radius 12-16px, border 1px `--pt-line`, pas de shadow
- **Pills sémantiques** : `success` (vert) / `warm` (ambre) / `warning` (orange) / `danger` (rouge) / `info` (bleu) / `soft` (gris) / `ghost` (transparent border)
- **Tabular nums** sur tous les chiffres
- **Séparateurs** : 1px line, jamais d'ombres pour séparer

### Anti-AI feel — règles dures

❌ **Gradient text** ("from-emerald-500 to-amber-500 bg-clip-text") — interdit  
❌ **Cards uniformes icône+titre+soustitre** dupliquées en grille 3×N — interdit  
❌ **Hero metric central énorme avec sous-texte vague** ("17 truies — Tu fais tout") — interdit  
❌ **Glassmorphism** (backdrop-blur, transparence) — interdit  
❌ **Modal-réflexe** pour confirmer une action triviale — interdit  
❌ **Copy SaaS** ("Découvrez vos performances", "Optimisez votre élevage", "Booster") — interdit  
❌ **Émojis dans titres ou labels** (🐷 🔮 📦 ❤) — interdit, utilise Lucide  
❌ **Cards avec dropshadow douce colorée** — interdit, utilise border 1px line

✅ **Typographie qui parle** : contraste fort de poids (BigShoulders 900 vs Instrument 400), uppercase tendu, letter-spacing assumé  
✅ **Espacement non-uniforme** : rythme 8/12/24/40px, pas une grille rigide  
✅ **Micro-détails métier** : `Parité 4 · ISSE 11.8 · J42 gestation` plutôt que cards génériques  
✅ **Couleurs assumées** : vert forêt sombre, ambre cuit, jamais cyan ni rose  
✅ **Données concrètes en copy** : "32 truies pleines · 11 maternité · 6 vides · 5 à sortir" plutôt que "Vue d'ensemble du troupeau"  
✅ **Numéros tabular-nums** partout  
✅ **Eyebrows uppercase mono 0.14em letter-spacing** comme signature  
✅ **Séparateurs custom** (line ondulée, eyebrow inversé sur fond accent, etc.)

## Scope précis — 11 écrans à mockuper

**Rubrique Élevage uniquement** (pas Today, pas Repro, pas Performance, pas Réglages — ces rubriques seront refondues plus tard).

### A. Écran de liste — `/troupeau` avec 5 sous-onglets

Une page unique avec un BottomNav 5 tabs (déjà figé V70 : Aujourd'hui · Élevage · Repro · Performance · Réglages — utilise Lucide Home/PigSilhouette/Heart/BarChart3/Settings). Dans la page, 5 sous-tabs en haut :

1. **TRUIES** (50) — filtres : Toutes / Pleines / Maternité / Vides / À vendre
2. **VERRATS** (3) — filtres : Tous / Actifs / Réforme
3. **PORCELETS** (92) — groupés par bande (collapsibles), avec poids et phase
4. **BANDES** (6 actives) — tri par date MB / effectif / statut
5. **LOGES** (0 ou N) — vue grille capacité / occupation

Chaque sous-onglet a sa propre liste (avatar coloré par espèce + identité + statut + pill + chevron). FAB "Ajouter une [type]" en bas droite.

### B. Fiches détail (5 templates)

1. **Fiche Truie** (`/troupeau/truies/:id`)
   - Header : eyebrow `ÉLEVAGE · TRUIE`, h1 code (ex `T-031`), sous-titre statut + parité + portées
   - Avatar XL (96px+) couleur truie
   - 4 tabs : Vue d'ensemble · Reproduction · Santé · Historique
   - Sections **Vue d'ensemble** : Lignée (parents → truie → portées), Dernière activité, Performance économique (4 KPIs : portées / NV moyens / aliment consommée / marge estimée), Identité (code, boucle, loge, naissance, parité), Lecture Marius (analyse IA en bullet)
   - Actions footer : `+ Saisir évènement`, `Modifier`, `Marquer sortie`
   - Le tab Reproduction doit afficher le cycle vivant (timeline saillie → écho J28 → mise-bas J115 → sevrage J143 ou J28 selon protocole)
   - Tabular-nums systématique sur dates et chiffres

2. **Fiche Verrat** (`/troupeau/verrats/:id`)
   - Header eyebrow `ÉLEVAGE · VERRAT`, h1 code (ex `V-001`), sous-titre statut
   - Avatar XL bleu acier
   - 4 tabs : Vue d'ensemble · Saillies · Santé · Lignée
   - Sections : Identité (boucle, nom, origine), Reproduction (alimentation, ration/j, total saillies, dernière saillie, taux fécondation), Journal terrain (notes + photos), Actions
   - Tab Saillies : table compacte (date, truie, écho J28 résultat, MB, NV)

3. **Fiche Porcelet** (`/troupeau/porcelets/:id`)
   - Header eyebrow `ÉLEVAGE · PORCELET`, h1 code (ex `CR-12`), sous-titre bande + sexe + phase + poids actuel
   - Avatar M warm clay
   - 3 tabs : Vue d'ensemble · Pesées · Santé
   - Sections : Identité (bande, mère, sexe, naissance, ordre dans portée), Croissance (mini-graphe pesées avec GMQ calculé, phase courante, prochain seuil), Santé (vaccins, traitements)
   - À noter : la fiche porcelet n'existe pas encore en V70, à concevoir from scratch en cohérence avec les autres

4. **Fiche Bande** (`/troupeau/bandes/:id`)
   - Header eyebrow `ÉLEVAGE · BANDE`, h1 nom court (ex `26-T16-01` ou `Mai 2026 · T-016`), sous-titre statut + vivants
   - Avatar XL vert céleri
   - 4 tabs : Vue d'ensemble · Détails · Santé · Notes
   - Sections : Cycle bande timeline 5 phases (Maternité J0 / Sevrage J21 / Post-sevrage J28 / Croissance / Engraissement J70+) avec curseur sur position actuelle, Pesées (graphe poids moyen + GMQ par phase), Performances (vivants, mortalité %, ALERTES SANTÉ count), Truie mère + bande sœur si adoption
   - Action `Démarrer le daily check du jour` + `Pesée groupée`

5. **Fiche Loge** (`/troupeau/loges/:id`)
   - Header eyebrow `ÉLEVAGE · LOGE`, h1 code (ex `M-03` pour maternité 3), sous-titre type + capacité
   - Avatar XL warm
   - 3 tabs : Vue d'ensemble · Occupation · Santé
   - Sections : Identité (type, capacité max, ventilation, état), Occupation (animaux présents, durée, prochaine rotation prévue), Historique (rotations, désinfections)
   - Action `Déplacer animaux`, `Marquer désinfectée`

### C. Cohérence transverse

- **Breadcrumb** en haut de chaque fiche : `Élevage › Truies › T-031` (font-mono uppercase eyebrow style)
- **EntityAvatar** uniforme (5 espèces, 4 tailles : sm 24 / md 32 / lg 48 / xl 96)
- **Pills mapping FR strict** : `success`=Pleine/OK, `warm`=Maternité/Lactation, `warning`=Vide/Action, `danger`=Critique/Urgent, `info`=Auto, `soft`=Owner, `ghost`=filtre off
- **Empty states** : pas d'image stock, plutôt une typographie austère + 1 CTA primary + 1 line de copy concrète métier
- **Skeleton loading** : pas de wave shimmer générique, plutôt des blocs avec `--pt-line` qui s'allument en cascade

## Données réelles à intégrer dans le mockup

Utilise ces vraies données du compte audit (50 truies / 3 verrats / 92 porcelets / 6 bandes) — pas des `Lorem ipsum` ni des "Truie 1, Truie 2".

```
TRUIES (extraits)
T-001  Vide          parité 3  dernière MB 12/01/2026  ISSE 11.2
T-016  Maternité     parité 5  MB 03/05/2026 · 10 vivants  J7 lactation
T-026  Pleine        parité 2  J113 gestation  MB prévue 12/05
T-031  Allaitante    parité 4  MB 06/04/2026 · 11 vivants  J34 sevrage J143
T-046  Réforme       parité 0  À sortir — 0 portée
T-050  Réforme       parité 7  À sortir — productivité insuffisante

VERRATS
V-001  Actif  total saillies 87  fécondation 89%  ration 2.4 kg/j
V-002  Actif  total saillies 64  fécondation 91%
V-003  Actif  total saillies 23  fécondation 94%

BANDES
26-T16-01    Mère T-016  MB 03/05/2026  10 NV  Sous mère J7
26-T1-01     Mère T-001  MB 03/05/2026  11 NV  Sevré J28
Mai 2026     Mère T-001  MB 03/05/2026  5 NV   Sous mère J7  (label V70 reformaté depuis B-20260503-M-02)
B-AUDIT-MB   Mère T-031  MB 06/04/2026  11 NV  En cours J34
B-AUDIT-PS   Mère T-032  MB 03/04/2026  25 NV  Post-sevrage J37
B-AUDIT-CR   En cours    30 NV          Croissance

KPIs élevage troupeau
50 truies (28 pleines · 11 maternité · 6 vides · 5 à sortir)
3 verrats actifs
92 porcelets (25 sous mère · 25 post-sevrage · 30 croissance · 12 finition)
6 bandes actives
ISSE moyen 11.4  Taux MB 86%  Mortalité allaitement 8.2%  GMQ post-sevrage 412g
```

## Format livrable

**1 fichier HTML standalone** : `elevage-mockup-v76.html`. Tailwind CDN + Google Fonts (Big Shoulders Display, Instrument Sans, JetBrains Mono) + Lucide icons via `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js">`. Tous les écrans dans le même fichier, séparés par sections, navigables par ancres. Pas de framework JS lourd — du HTML/CSS quasi-statique avec un peu de JS pour switcher entre tabs.

Structure attendue dans le fichier :
```html
<body>
  <!-- 1. Liste Élevage — sous-tab Truies actif -->
  <section id="liste-truies">…</section>
  <section id="liste-verrats">…</section>
  <section id="liste-porcelets">…</section>
  <section id="liste-bandes">…</section>
  <section id="liste-loges">…</section>
  <!-- 2. Fiches détail -->
  <section id="fiche-truie">…</section>
  <section id="fiche-verrat">…</section>
  <section id="fiche-porcelet">…</section>
  <section id="fiche-bande">…</section>
  <section id="fiche-loge">…</section>
</body>
```

En haut du fichier, un menu de navigation pour accéder à chaque section (utilitaire de visualisation, pas un composant produit).

## Critères d'acceptance

Avant de me rendre le mockup, vérifie :

1. ✅ Aucun emoji dans titres ou labels
2. ✅ Aucun gradient text ni glassmorphism
3. ✅ Aucune couleur hors des 13 tokens `--pt-*`
4. ✅ Aucune font hors Big Shoulders / Instrument Sans / JetBrains Mono
5. ✅ Tous les chiffres en `tabular-nums`
6. ✅ Eyebrows uppercase mono 0.14em letter-spacing présents sur chaque écran
7. ✅ Données réelles du compte audit (pas de Lorem)
8. ✅ Persona Yao testé : un éleveur ivoirien à 6h du matin doit pouvoir s'orienter en 3 secondes sur la liste Truies
9. ✅ Cohérence cross-écrans : même header, même breadcrumb, mêmes patterns Pills, même grille
10. ✅ Le mockup peut être ouvert dans Chrome mobile (DevTools 390×844 iPhone) sans débordement horizontal

## Bonus (si tu as encore du jus)

- Une **section "system"** en fin de fichier avec : palette tokens visualisée, échelle typographique (h1/h2/body/eyebrow/mono), grille des Pills 7 variants, grille des Avatars 5×4 tailles. Ça servira de garde-fou pour l'implémentation.
- Une **variante "mode avancé"** sur la fiche Truie : ajout d'une DataTable détaillée des 4 dernières portées (date saillie / écho / MB / NV / NS / sevrage / NS sevrés), exportable CSV.

## Ce que je vais faire de ton livrable

J'ouvre ton HTML mockup en **split-screen** pendant que je code la refonte React/Ionic dans le projet. Chaque écran V70 doit pixel-matcher (ou esprit-matcher) ton mockup. Les variations sont OK si elles servent le DNA, pas l'inverse.

---

**Référence à attacher** : `~/Downloads/v70-mockup.html` (DNA de base, version actuelle — tu améliores, tu ne réinventes pas).

**Référence stratégique** (pour comprendre la philosophie produit) : `~/Downloads/V70-VISION-STRATEGIQUE.md` et `~/Downloads/REPONSE-A-ORCHESTRATEUR-V70.md` — cite les deal-breakers et principes V70 si pertinent.

Quand tu me rends le mockup, indique aussi :
- Les **3 décisions design fortes** que tu as tranchées (et pourquoi)
- Les **2 zones où tu as hésité** (et l'alternative que tu as écartée)
- Une **estimation effort dev** pour porter ce mockup en React/Ionic Capacitor (jours)

Tu n'as pas besoin de me demander mon avis avant de livrer. Tranche, livre, je commenterai.
