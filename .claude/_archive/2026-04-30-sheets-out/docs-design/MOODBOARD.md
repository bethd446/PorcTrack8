# PorcTrack 8 — Moodboard Agritech Moderne

> Dark-first cockpit. Dense, engineered, mono-first. Zero gradient confetti.
> Version 1.0 — 17 avril 2026

---

## 1. Palette — Dark-first

### Surfaces

| Swatch | Token | Hex | Usage |
|---|---|---|---|
| ![#0A0D0C](https://readme-swatches.vercel.app/0A0D0C?style=round) | `bg-0` | `#0A0D0C` | Fond global (quasi-noir forêt) |
| ![#12171A](https://readme-swatches.vercel.app/12171A?style=round) | `bg-1` | `#12171A` | Cards principales |
| ![#1A2025](https://readme-swatches.vercel.app/1A2025?style=round) | `bg-2` | `#1A2025` | Hover / secondaire |
| ![#2A3239](https://readme-swatches.vercel.app/2A3239?style=round) | `border` | `#2A3239` | Séparateurs 1px |

### Texte

| Swatch | Token | Hex | Usage |
|---|---|---|---|
| ![#F4F7F6](https://readme-swatches.vercel.app/F4F7F6?style=round) | `text-0` | `#F4F7F6` | Titres, KPIs |
| ![#A8B3B8](https://readme-swatches.vercel.app/A8B3B8?style=round) | `text-1` | `#A8B3B8` | Body secondaire |
| ![#6B7880](https://readme-swatches.vercel.app/6B7880?style=round) | `text-2` | `#6B7880` | Muted, axes, labels |

### Signaux

| Swatch | Token | Hex | Usage |
|---|---|---|---|
| ![#10B981](https://readme-swatches.vercel.app/10B981?style=round) | `accent` | `#10B981` | Vert signal — actif, positif |
| ![#065F46](https://readme-swatches.vercel.app/065F46?style=round) | `accent-dim` | `#065F46` | Borders actifs, gradients contenus |
| ![#F4A261](https://readme-swatches.vercel.app/F4A261?style=round) | `amber` | `#F4A261` | Alerte modérée |
| ![#EF4444](https://readme-swatches.vercel.app/EF4444?style=round) | `red` | `#EF4444` | Critique, mortalité |
| ![#60A5FA](https://readme-swatches.vercel.app/60A5FA?style=round) | `blue` | `#60A5FA` | Info, données neutres |
| ![#D4A056](https://readme-swatches.vercel.app/D4A056?style=round) | `gold` | `#D4A056` | Métrique premium (GMQ, marge) |

**Règle d'or** : 80% `bg-0/1/2` + 15% texte + 5% accent. L'accent ne doit JAMAIS saturer l'écran.

---

## 2. Typographie

### Échantillons

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   CHEPTEL                                            │ ← Big Shoulders Display
│   ─────────                                          │    28px / weight 800
│                                                      │    letter-spacing -0.01em
│                                                      │
│   Suivi technique du troupeau — Ferme A130          │ ← Inter 14px / 400
│                                                      │    color: text-1
│                                                      │
│   ─────────────────────────────                      │
│                                                      │
│   TRUIES EN GESTATION            ↑ +2                │ ← JetBrains Mono 11px
│                                                      │    uppercase, tracking 0.06em
│   17                                                 │ ← JetBrains Mono 48px
│                                                      │    weight 700, tabular-nums
│   truies · 3 bandes                                  │ ← Inter 12px / 500
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Règles

- **Big Shoulders Display** → titres d'écran uniquement (22–28px)
- **Inter** → body, labels, boutons (11–15px)
- **JetBrains Mono** → TOUS les chiffres, IDs, codes, axes de graphes
- `font-variant-numeric: tabular-nums` activé partout où il y a des colonnes de chiffres
- Jamais d'uppercase sur le body, uniquement sur labels mono (chips, nav, kpi-label)

---

## 3. Cards — 3 archétypes

### Archétype A — KPI Card

```
┌────────────────────────────────────────────────┐
│ ● TRUIES ALLAITANTES         ↑ +2            │ ← label mono + delta accent
│                                                │
│  12                                            │ ← kpi-value 48px mono
│                                                │
│  sur 17   ·   70%                              │ ← sub-metrics text-1
│                                                │
│  ──────────────────────────────                │ ← agritech-hairline
│  [sparkline 7 jours, stroke accent]           │
└────────────────────────────────────────────────┘
bg-1 · border 1px · radius 10px · padding 16px
hover → bg-2
```

### Archétype B — List Row (data-row)

```
┌────────────────────────────────────────────────┐
│ │ T-142    GESTATION   J+97   ↻ 2026-04-29   │
│ │ T-108    ALLAITANTE  J+14   ↻ 2026-04-24   │  ← :hover border-l-2 accent
│ │ T-203    VIDE        —      ↻ —             │
│ │ T-017    RÉFORME     —      ⚠                │
└────────────────────────────────────────────────┘
all mono 12px · padding 10x12 · zebra bg-0/bg-1 · border-bottom border
```

### Archétype C — Alert Card

```
┌────────────────────────────────────────────────┐
│ [!]  MISE-BAS IMMINENTE                        │ ← icon amber/red 16px
│  ────                                          │
│  T-142 · bande N°7                             │ ← ft-code text-1
│  J-2 de la date prévue (2026-04-19)            │ ← text-1 Inter 13px
│                                                │
│  [ Voir la truie → ]                           │ ← ghost button accent
└────────────────────────────────────────────────┘
border-left 2px amber · bg-1 · radius 10px
icône toujours monochrome, jamais fillée
```

---

## 4. Inspirations (liens texte)

- **Linear Dashboard** — https://linear.app — densité, navigation latérale, monochrome + un accent
- **Apple Health (section Santé)** — iOS 17+ — cards KPI, typo chiffres dominante, absence de décor
- **Vercel Dashboard** — https://vercel.com/dashboard — tables denses, logs mono, hiérarchie par typo pas par couleur
- **GitHub Actions** — https://github.com/features/actions — status dots, durées mono, lignes hairline
- **Bloomberg Terminal** — référence historique — tout mono, toutes colonnes alignées, zéro décoration
- **Nothing OS** — pour le ton "engineered / dot-matrix" — polices display très marquées sur fond neutre

---

## 5. Principes en 3 lignes

1. **Chiffre d'abord** — la donnée est la protagoniste ; typo mono, tabular-nums, tailles généreuses.
2. **Accent parcimonieux** — le vert `#10B981` ne paraît que pour indiquer un état actif ou une tendance positive ; jamais en fond massif.
3. **Radius serrés, shadows nulles** — le relief vient des bordures 1px et du contraste bg-0/bg-1, pas du flou.
