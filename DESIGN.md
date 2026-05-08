---
name: PorcTrack 8
description: Application mobile Ionic React (Capacitor) de gestion technique de troupeau porcin (GTTT). DNA visuel "Terrain Vivant" V70.
colors:
  primary: "#2D4A1F"
  primary-deep: "#1f3414"
  primary-light: "#4a7a2f"
  warm: "#F5E9D8"
  warm-deep: "#E8D5B5"
  accent: "#B8703D"
  accent-light: "#D89968"
  bg: "#FAF7F0"
  bg-app: "#F1ECE0"
  ink: "#1a1a1a"
  muted: "#6b6357"
  subtle: "#a39888"
  success: "#4a7a2f"
  warning: "#c08a3d"
  danger: "#a4453d"
  info: "#4a6e8a"
  line: "rgba(26,26,26,0.08)"
  line-strong: "rgba(26,26,26,0.16)"
typography:
  display:
    fontFamily: "BigShoulders, 'Big Shoulders Display', sans-serif"
    fontSize: "36px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "BigShoulders, 'Big Shoulders Display', sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.05
  title:
    fontFamily: "BigShoulders, 'Big Shoulders Display', sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "InstrumentSans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "InstrumentSans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "InstrumentSans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
  nav:
    fontFamily: "InstrumentSans, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "14px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "16px"
  pill-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.bg}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.label}"
---

# Design System: PorcTrack 8

## 1. Overview

**Creative North Star: "Terrain Vivant"**

Application terrain pour éleveurs porcins en Côte d'Ivoire (ferme test K13). Le design parle métier, pas dashboard SaaS : les couleurs viennent du sol et du grain (vert forêt sombre, cream, ambre cuit), la typographie alterne deux voix franches (titres robustes condensés, corps lisible utilitaire), et chaque écran assume sa fonction sans décoration superflue. L'éleveur n'est pas un utilisateur d'app, c'est un opérateur sur le terrain qui décide vite : la fiche truie est un dossier, le bouton est un acte, l'alerte une convocation.

Le système rejette explicitement les codes "agritech-tech" (gradients néon, dashboards bleu-vert, illustrations vectorielles génériques d'animaux mignons), les codes SaaS génériques (cards à icône+titre+sous-titre dupliquées, glassmorphism, métriques héro), et les codes d'apps de gestion européennes "propre-blanc-bleu" (le contexte K13 africain demande chaleur et terre, pas asepsie).

**Key Characteristics:**
- Palette terre + forêt, jamais de neutres tech (gris froid, blanc clinique).
- Big Shoulders en titre, Instrument Sans en corps. Pas de troisième voix typographique.
- Tabular-nums systématiques sur tous les chiffres et codes (alignement vertical des KPIs).
- Spacing généreux mais pas aéré, densité utilitaire de carnet de bord.
- 5 onglets bottom nav stricts (Aujourd'hui · Élevage · Repro · Performance · Réglages). Ni plus ni moins.

## 2. Colors: La palette Terrain Vivant

Vert forêt comme primaire, cream warm comme background, ambre cuit comme accent. Sémantiques (success/warning/danger/info) tirées de la même famille terre.

### Primary
- **Vert forêt sombre** (`#2D4A1F`) : header gradient end, boutons primaires, success states. Le vert n'est pas Material — c'est un vert de feuillage humide en saison, désaturé.
- **Vert forêt deep** (`#1f3414`) : pressed states, ombres internes.
- **Vert forêt clair** (`#4a7a2f`) : success backgrounds, indicateurs OK.

### Secondary
- **Ambre cuit** (`#B8703D`) : accent signature, CTA secondaires, warm states. Couleur de la terre rouge ivoirienne après pluie.
- **Ambre clair** (`#D89968`) : hover sur accent.

### Tertiary
- **Cream warm** (`#F5E9D8`) : backgrounds maternité, pills warm. Pas un beige bureau, un cream de papier carbone.
- **Cream deep** (`#E8D5B5`) : line dividers warm.

### Neutral
- **Bg principal** (`#FAF7F0`) : background app. Tinté warm, jamais `#fff`.
- **Bg-app** (`#F1ECE0`) : background "elevated" pour cards en surface.
- **Ink** (`#1a1a1a`) : texte primaire. Tinté warm, jamais `#000`.
- **Muted** (`#6b6357`) : texte secondaire (sous-titres, captions).
- **Subtle** (`#a39888`) : placeholder, disabled.
- **Line** (`rgba(26,26,26,0.08)`) : séparateurs subtils dans les cards.
- **Line-strong** (`rgba(26,26,26,0.16)`) : séparateurs section.

### Sémantiques
- **Success** (`#4a7a2f`) : Pleine, OK, validé. Aligné sur primary-light pour cohérence.
- **Warning** (`#c08a3d`) : Vide, action requise.
- **Danger** (`#a4453d`) : Critique, urgent. Rouge brique terre, pas rouge vif tech.
- **Info** (`#4a6e8a`) : Auto, lecture seule.

### Entity avatars
4 paires bg/fg pour les 4 espèces : truie (`#F4D4D4`/`#8B4744`), verrat (`#C8D6E5`/`#3B5266`), porcelet (`#F5E9D8`/`#8B6E3D`), bande (`#D4DFC8`/`#3D5C2C`).

### Named Rules

**La règle des cream-only backgrounds.** Les surfaces de fond sont *toujours* tintées warm (`#FAF7F0` ou `#F1ECE0`). Jamais de `#fff` ni de gris froid. Cette règle est inviolable — un fond clinique trahit instantanément le DNA Terrain Vivant.

**La règle du single-accent rare.** L'ambre cuit (`#B8703D`) couvre maximum 10% d'un écran à la fois. Sa rareté est ce qui fait son poids visuel. Si un écran a 3+ pills accent, le pill devient bruit, plus signal.

## 3. Typography

**Display Font:** BigShoulders (Big Shoulders Display, sans-serif fallback) — 400 + 700 weights chargés via @font-face local.
**Body Font:** InstrumentSans (system-ui sans-serif fallback) — 400 + 700 weights.

**Character:** Big Shoulders est condensé et industriel ; Instrument Sans est neutre et lisible. La pairing évoque un bordereau d'imprimerie : titre robuste, corps utilitaire, sans concession humaniste.

### Hierarchy
- **Display** (BigShoulders 900, 36px, line-height 1, -0.02em) : titres de page, KPI hero. PageHeader.
- **Headline** (BigShoulders 700, 22px, line-height 1.05) : titres de section dans Card (`<Section label />`).
- **Title** (BigShoulders 700, 18px, line-height 1.1) : titres de Card individuelle, hero de fiche animale.
- **Body** (InstrumentSans 400, 13px, line-height 1.5) : paragraphes, DataRow values, contenu courant.
- **Caption** (InstrumentSans 500, 12px, line-height 1.4) : sous-info, hints, timestamps.
- **Label** (InstrumentSans 600, 11px, 0.06em uppercase) : eyebrow PageHeader, badges, Tag.
- **Nav** (InstrumentSans 600, 10px, 0.14em uppercase) : labels bottom nav, segments, breadcrumb.
- **Tiny** (InstrumentSans 600, 9px) : count badges, sub-counts. À éviter sauf espace contraint.

### Named Rules

**La règle du tabular-nums systématique.** Tous les chiffres (KPIs, IDs, codes, dates, prix FCFA) passent par `.ft-values` ou `.ft-code` qui appliquent `font-feature-settings: "tnum" 1, "lnum" 1`. Chiffres non-tabulaires sur un tableau de KPIs = lecture cassée.

**La règle des deux voix.** Pas de troisième famille typographique. Si une nouvelle vue a besoin d'une fonte distincte, la vue est mal designée — pas la palette typo.

## 4. Elevation

Le système est plat par défaut. Les shadows existent mais sont *infimes* : `0 1px 2px rgba(17,24,39,0.04)` sur les cards en surface. Pas de shadows multi-couches, pas de drop-shadows colorées. La hiérarchie passe par tonal layering (fond `#FAF7F0` vs cards `#FAF7F0` avec line subtle), pas par élévation visuelle.

### Shadow vocabulary
- **subtle** (`box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04)`) : cards en surface, divs card-style des Section overview.

### Named Rules

**La règle du flat-by-default.** Les surfaces sont plates au repos. Aucune card hero ne flotte. Les modales sont l'exception, pas la règle.

## 5. Components

8 composants atomiques canoniques V70 (cf. `src/design-system/components/index.tsx`) plus extensions.

### Buttons (`<Button variant="primary|secondary|ghost" size="sm|md|lg" />`)
- **Shape** : pill (`border-radius: 999px`).
- **Primary** : bg `--pt-primary` (#2D4A1F), text `--pt-bg`, padding `10px 20px`, typo Label uppercase.
- **Secondary** : bg `--pt-bg`, text `--pt-ink`, border 1px `--pt-line-strong`, padding identique.
- **Ghost** : transparent, hover bg `--pt-bg-app`. Utilisé pour ActionButton (grid 2×2 fiches).
- **Hover** : transition 200ms, opacity 0.9 + transform translateY(-1px).

### Section (`<Section label="LABEL" tone="primary|accent" />`)
Composant signature V70 : barre de label uppercase + ligne. Utilisé en tête de chaque card overview (IDENTITÉ, REPRODUCTION, JOURNAL TERRAIN, ACTIONS).

### Card / div card-style
- **Corner** : `border-radius: 12px`.
- **Background** : `var(--bg-surface)` (= `--pt-bg`).
- **Shadow** : subtle (cf. Elevation).
- **Padding** : `6px 16px` pour data rows ; `16px` pour content riche.
- **Border** : aucune par défaut. Line-strong en bottom uniquement si suivi d'une nouvelle section.

### Tag / Pill (`<Tag variant="primary|accent|success|warm|warning|danger|info|soft|ghost" />`)
- **Style** : pill rounded-full, padding `4px 10px`, typo Label uppercase, bg + text de la palette sémantique.
- **Mapping français V70** : success = Pleine/OK, warm = Maternité, warning = Vide/Action, danger = Critique/Urgent, info = Auto, soft = Owner, ghost = filtre off.

### Inputs (`<Input />`, `<Select />`, `<FormField />`)
- **Style** : border 1px `--pt-line-strong`, bg `--pt-bg`, radius 8px, typo Body.
- **Focus** : border `--pt-primary`, outline 2px `--pt-primary` 0.2 opacity.

### Bottom nav
- **5 onglets stricts** : Aujourd'hui · Élevage · Repro · Performance · Réglages.
- **Style** : icônes Lucide (pas Ionicons emoji), labels Nav (10px/0.14em uppercase).
- **Active** : icon + label `--pt-primary`, dot underneath.

### Signature : EntityAvatar
- **Sizes** : sm (32px), md (48px), lg (64px), xl (96px).
- **Background** : palette espèce (cf. tokens entity).
- **Foreground** : initiale espèce ou photoUrl si fournie.
- **Border-radius** : 50% (cercle).

## 6. Do's and Don'ts

### Do:
- **Do** utiliser les tokens `--pt-*`. Aucune couleur hardcodée hors de `v70-tokens.css`.
- **Do** combiner BigShoulders pour les titres, Instrument Sans pour le corps. Toujours.
- **Do** appliquer `.ft-values` ou `.ft-code` sur tous les chiffres et codes (tabular-nums obligatoire).
- **Do** utiliser `<Section label />` au-dessus de chaque carte d'overview, pas `<SectionDivider />` (composant legacy V40).
- **Do** garder l'accent ambre rare (≤10% de la surface).
- **Do** Lucide icons, pas Ionicons emoji (sauf legacy non encore migré).

### Don't:
- **Don't** utiliser `#fff` ni `#000`. Toujours les tokens warm-tinted (`--pt-bg`, `--pt-ink`).
- **Don't** introduire un troisième font-family. Big Shoulders + Instrument Sans, c'est tout.
- **Don't** utiliser `font-mono` ou DMMono pour les codes — la règle V70 est `tabular-nums` sur Instrument Sans, pas une fonte monospace dédiée.
- **Don't** créer de SectionDivider neuf, ni de card-dense neuf — ces composants legacy sont à remplacer par `<Section />` + div card-style.
- **Don't** utiliser de `border-left` ≥ 1px comme stripe accent. Jamais.
- **Don't** utiliser glassmorphism, gradient text, hero-metric template, modales en réflexe.
- **Don't** utiliser de em dash (`—` typographique OK seulement comme séparateur dans le titre Hero `Votre ferme, — au cœur de la donnée.`). Pas dans le corps de texte.
- **Don't** pousser un dashboard "agritech-tech" (gradients néon vert-bleu, illustrations vectorielles cochon mignon, KPI hero card). Le DNA Terrain Vivant rejette ce langage.
