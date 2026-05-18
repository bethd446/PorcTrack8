# design-input/ — PorcTrack 8 Design System Input
*Pour Claude.ai "Set up your design system" — 2026-05-18*

## Quoi

Sous-ensemble FRONTEND-ONLY de l'application PorcTrack 8, packagé pour que Claude.ai puisse générer un design system cohérent par-dessus l'architecture existante.

**Aucun backend, aucune migration SQL, aucune edge function, aucun test, aucun secret.** Uniquement le code source visuel (composants, écrans, styles, tokens, config build).

## App

**PorcTrack 8** — gestion technique troupeau porcin (GTTT) pour éleveurs ivoiriens.
Mobile-first (Android via Capacitor) + web. 5-50 truies, naisseur-engraisseur.

- Stack : React 19 + Vite 6 + Ionic 8 + Tailwind v4 + Supabase (backend exclu de ce zip)
- État : design partiellement désinstallé volontairement. La machine tient (787→2184 tests verts), la peau est minimale → c'est cette peau qu'on veut refaire.

## Arborescence

```
design-input/
├── BRIEF.md              # Blurb + notes design (≤280 + ≤1200 chars) à coller dans Claude.ai
├── DESIGN_AUDIT.md       # Audit tokens/Tailwind/Ionic/dettes existantes
├── README.md             # Ce fichier
├── index.html            # Entry point Vite
├── package.json          # Libs UI (Ionic 8, Tailwind v4, Radix, Lucide, GSAP, etc.)
├── components.json       # shadcn config si applicable
├── vite.config.ts        # Config build (PWA, chunks, alias @)
└── src/
    ├── App.tsx               # Router racine (V70 canonique + landing/auth/legal)
    ├── main.tsx              # Bootstrap React
    ├── index.css             # Theme global + Tailwind directives + variables
    ├── types/farm.ts         # Types métier (Truie, Verrat, BandePorcelets, Phase…)
    ├── pages/                # Pages publiques (Landing, About, CGU, Privacy)
    ├── styles/               # Styles globaux additionnels
    ├── components/           # Composants partagés (forms, UI atomiques)
    ├── design-system/        # Tokens centraux (tokens.css) + atomes
    └── v70/                  # ⭐ CANONIQUE — Tout nouveau code doit aller ici
        ├── components/
        │   ├── ds/           # Design system atomique (Button, Card, Pill, Section, Tabs…)
        │   └── v70/          # Composants applicatifs (BottomNav, DataTable, Dialog, PhotoUpload…)
        ├── pages/            # Écrans canoniques (V70Routes les lazy-load)
        ├── theme/
        │   ├── v70-tokens.css   # ⭐ TOKENS COULEURS — palette "Terrain Vivant"
        │   └── v70-global.css   # Styles globaux V70
        ├── lib/               # Helpers métier (formatBandeName, derivePorceletPhase…)
        └── router/V70Routes.tsx
```

## Comment lire l'arborescence

1. **Commencer par `BRIEF.md`** — ton, public, contraintes
2. **Puis `DESIGN_AUDIT.md`** — inventaire tokens/Tailwind/Ionic/dettes
3. **Tokens couleurs** : `src/v70/theme/v70-tokens.css` (variables `--pt-*`)
4. **Tokens typo** : `src/design-system/tokens/tokens.css`
5. **Design system atomique** : `src/v70/components/ds/` (Button, Card, Pill, Section, Tabs, ListItem, CycleTimeline, StatsGrid…)
6. **Écrans canoniques** : `src/v70/pages/` (V70Routes.tsx les lazy-load)
7. **Routeur** : `src/v70/router/V70Routes.tsx`

## Ce qui est canonique vs legacy

- ✅ **Canonique (V70)** : `src/v70/` — tout nouveau écran et composant DOIT aller ici
- ⚠️ **Legacy progressif** : `src/components/` — encore utilisé par certains forms, migration en cours vers v70/components/

## Polices actuelles

- `Big Shoulders Display 700` — titres uppercase, KPIs, nombres (chargée via Google Fonts dans `index.html`)
- `Instrument Sans` — body, boutons, labels
- `--pt-font-mono` = Instrument Sans + `tabular-nums` (pas de vraie monospace)

## Palette actuelle "Terrain Vivant" (à reprendre ou reconsidérer)

| Token | Hex | Usage |
|---|---|---|
| `--pt-primary` | #2D4A1F | Vert forêt — primary, headers, CTA |
| `--pt-primary-deep` | #1f3414 | Hover / active |
| `--pt-primary-light` | #4a7a2f | Secondary |
| `--pt-warm` | #F5E9D8 | Crème — tabs, surfaces chaudes |
| `--pt-accent` | #B8703D | Terre — FAB, signatures |
| `--pt-bg-app` | #FAFAFA | Background global |
| `--pt-ink` / `--pt-muted` | #1a1a1a / #6b6357 | Texte |
| `--pt-success/warning/danger/info` | #4a7a2f / #c08a3d / #a4453d / #4a6e8a | Sémantiques |

**Interdits actuels** (peuvent être levés si Claude.ai propose mieux) : hex hardcoded dans les composants, valeurs legacy `#064e3b` `#065f46` `#2d5a1b`.

## Ce qu'on attend de Claude.ai

1. **Tokens design system complets** : couleurs, espacements, radius, shadows, typographie (échelles), motion (timings + easings)
2. **Atomes UI revus** : Button (variants + sizes + states), Card, Input, Select, Toggle, Pill/Badge, Dialog, Toast, Skeleton, EmptyState
3. **Patterns spécifiques métier** : ListItem, EntityCard (truie/verrat/porcelet/bande), AlertCard (16 règles GTTT), CycleTimeline, StatsGrid, PhotoUpload
4. **Dark mode** : aucun thème dark actuel, à créer
5. **Layouts** : BottomNav (5 tabs mobile), Sidebar (desktop), PageHeader avec children slot, FAB, Empty states cohérents
6. **Accessibilité** : WCAG 2.1 AA min, contraste 4.5:1 (7:1 plein soleil), touch 44×44px, navigation clavier OK
