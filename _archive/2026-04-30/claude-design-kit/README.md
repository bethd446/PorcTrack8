# PorcTrack 8 — Claude Design Kit

Prêt à drag-and-drop dans Claude Design. Copie-colle les champs du formulaire depuis `form-fields.md`.

## Contenu

- **`assets/`** — logos SVG + 7 fichiers TTF (BigShoulders, InstrumentSans, BricolageGrotesque, DMMono)
- **`tokens/`** — CSS avec tous les tokens (couleurs, typo, radii, shadows, easings)
  - `agritech-tokens.css` — dark theme tokens (--bg-0, --text-0, --accent…)
  - `theme-v2-tokens.css` — accents par tab, radii lg/xl/2xl, easings spring/gentle
  - `index.css` — font-face + composants CSS (.card-dense, .kpi-label, .ft-heading…)
- **`code/`** — composants UI représentatifs
  - `agritech/` — design system (KpiCard, Chip, DataRow, HubTile, SectionDivider, SparklineCard, FAB, BottomSheet)
  - `AgritechHeader/Layout/NavV2` + `Cockpit.tsx` — shell & navigation
  - `sample-views/` — 4 vues réelles (Cockpit-like, hubs, vues cycles)

## À ajouter manuellement dans Claude Design

1. Lier le repo GitHub (si public) — sinon upload le dossier `code/` + `tokens/`
2. Upload tous les fichiers de `assets/` (fonts + logos)
3. Copier-coller le blurb et les notes depuis `form-fields.md`

## À ajouter idéalement (si tu as le temps)

- 6-8 captures d'écran de l'app réelle dans `screenshots/` (Cockpit, Troupeau, Cycles, Maternité, Post-sevrage, Alertes, Finances, Nutrition). L'article dit : *« Une page d'accueil ou un site marketing terminé en dit plus à Claude sur l'ambiance de votre marque qu'une palette de couleurs seule. »*
