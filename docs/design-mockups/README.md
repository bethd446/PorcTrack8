# PorcTrack 8 — Design mockups pack

Paquet de livraison Claude Design → Ionic React. Chaque sous-dossier est autonome.

## Structure

```
_delivery/
├── _shared/                         # Socle commun (tokens + CSS + composants)
│   ├── tokens.json                  # Style Dictionary — source de vérité
│   ├── tailwind.config.js           # Preset Tailwind (CSS vars)
│   ├── colors_and_type.css          # Variables CSS + fonts
│   ├── components.css               # Classes utilitaires (.card, .btn, .input, ...)
│   ├── fonts/                       # 7 .ttf (BigShoulders, InstrumentSans, BricolageGrotesque, DMMono)
│   ├── assets/                      # Logos + 6 icons livestock
│   ├── components/
│   │   ├── Primitives.jsx           # Card, Button, Chip, DataRow, KpiCard, SparkCard, Icon, Progress, HubTile
│   │   └── Chrome.jsx               # AgritechHeader, BottomNav, FAB, BottomSheet, FinancesFAB, PhoneFrame
│   └── App.jsx                      # Routing + toutes les sheets (réf. intégration)
│
├── _tabs/                           # 5 écrans tabs principaux
│   ├── 01-cockpit/
│   ├── 02-troupeau/
│   ├── 03-cycles/
│   ├── 04-ressources/
│   └── 05-pilotage/
│
├── 01-finances/                     # Écrans feature
│   ├── source.jsx                   # JSX React DOM
│   ├── preview.html                 # ★ standalone bundle (offline, 1 fichier)
│   ├── tokens.json                  # sous-ensemble de tokens utilisés
│   ├── screenshot.png               # capture 390×844
│   └── README.md
├── 02-rapport-financier/
├── 03-bande-detail/
├── 04-cycle-timeline/
├── 05-truie-detail/
└── 06-stock-reorder/                # sheet uniquement
```

## Écrans livrés (11)

| # | Écran | Accent |
|---|---|---|
| 01 | Cockpit (tab) | emerald |
| 02 | Troupeau (tab) | teal |
| 03 | Cycles (tab) | cyan |
| 04 | Ressources (tab) | amber |
| 05 | Pilotage (tab) | coral |
| 01 | Finances | gold |
| 02 | Rapport financier | gold |
| 03 | Bande detail | cyan |
| 04 | Cycle timeline | cyan |
| 05 | Truie detail | teal |
| 06 | Stock reorder (sheet) | amber |

## Intégration Ionic React (pipeline)

1. Copier `_shared/colors_and_type.css` et `_shared/components.css` dans `src/theme/`
2. Importer `_shared/tailwind.config.js` comme preset dans ton `tailwind.config.js`
3. Copier les fichiers `source.jsx` des écrans voulus, les adapter :
   - `<div>` de layout → `IonPage` / `IonContent` / `IonHeader`
   - `<BottomSheet>` → `<IonModal breakpoints={[0, 0.9]}>`
   - `<PhoneFrame>` → supprimer (c'est un device frame de mockup)
4. Garder toutes les classes CSS et usages de tokens (`var(--bg-1)`, etc.)

## Conventions

- **Tokens** : toujours référencer via CSS vars (`var(--accent)`) — jamais de hex en dur
- **Typographie** : utiliser les classes sémantiques `.ft-heading`, `.ft-body`, `.ft-code`, `.kpi-label`, `.kpi-value`
- **Radii** : `var(--radius-sm|md|lg|xl|2xl)` — jamais de px en dur
- **Spacing** : grille 4pt (`var(--space-1)` à `--space-12`)
- **Un accent par écran** : défini par le tab actif, le FAB reste toujours emerald

## Brief nouveau écran

Dans le repo `bethd446/PorcTrack8`, créer `design-briefs/[date]-[nom].md`. Claude Design lit, produit un nouveau sous-dossier `docs/design-mockups/NN-slug/`, livre le tout zippé.
