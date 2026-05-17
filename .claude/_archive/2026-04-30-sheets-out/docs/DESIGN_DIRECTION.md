# PorcTrack 8 — Design Direction "Agritech Moderne"

> Version 1.0 — 17 avril 2026
> Contexte : ferme naisseur-engraisseur 17 truies + 2 verrats + bandes porcelets, pilotage à distance

## Principe directeur

**"Un cockpit de pilotage, pas un album photo."**

L'app n'est pas un outil de terrain avec des cartes décoratives — c'est un **tableau de bord dense** pour suivre en temps réel un élevage. Chaque pixel justifie sa présence par une information actionable. Inspirations : Linear, Bloomberg Terminal, Apple Health (section santé), GitHub Actions, Vercel Dashboard.

## Palette — Dark-first

| Token | Hex | Usage |
|---|---|---|
| `bg-0` | `#0A0D0C` | Fond global (noir-forêt très profond) |
| `bg-1` | `#12171A` | Cards principales |
| `bg-2` | `#1A2025` | Cards secondaires / hover |
| `border` | `#2A3239` | Séparateurs subtils |
| `text-0` | `#F4F7F6` | Texte principal (quasi-blanc) |
| `text-1` | `#A8B3B8` | Texte secondaire |
| `text-2` | `#6B7880` | Texte tertiaire / muted |
| **accent** | `#10B981` | Vert signal principal (emerald vif) |
| **accent-dim** | `#065F46` | Accent foncé (forest) — gradients, borders actifs |
| **amber** | `#F4A261` | Alerte modérée, highlight ambré |
| **red** | `#EF4444` | Critique, rupture, mortalité |
| **blue** | `#60A5FA` | Info, données neutres |
| **gold** | `#D4A056` | Métriques premium (GMQ, marge) |

**Pas de gradient coloré.** Fond uniforme bg-0 + cards bg-1 + accent thin lines.

## Typographie

| Usage | Police | Taille | Poids |
|---|---|---|---|
| Titres écrans | **Big Shoulders Display** | 22-28px | 800 Black |
| Labels / nav | **Inter** ou **Geist** | 11-13px | 600 SemiBold, UPPERCASE |
| Body | **Inter** | 13-15px | 400-500 |
| **Chiffres / KPI** | **JetBrains Mono** (ou DM Mono) | 20-48px | 600-700 |
| Code / IDs | **JetBrains Mono** | 11-12px | 500 |

**Tabular figures activé** (`font-feature-settings: 'tnum'`) pour alignement colonnes.

## Composants clés du style

### Cards
- `rounded-lg` (10px max — pas de `rounded-xl/2xl`)
- Border 1px `border` (jamais shadow)
- Fond `bg-1`, hover `bg-2`
- Padding interne : 16px / 20px desktop

### KPI Blocks (clé du design)
```
[ICON 16px]  LABEL MONO UPPERCASE
───────
12.4        ← Big JetBrains Mono, font-weight 700
units / ∆%  ← tiny text-2 + accent/red delta
```

### Tables denses
- Zebra strong : `bg-1` / `bg-0`
- Font mono 12px
- Hover : border-left accent 2px
- Pas de arrondis

### Boutons
- Primary : fond `accent`, texte `bg-0`, semi-bold, SMALL
- Secondary : border `border`, fond transparent
- Ghost : uniquement texte accent
- **Pas d'uppercase** sur les boutons (sauf nav labels)

### Graphs (recharts déjà installé)
- Ligne `accent` 2px, area `accent` alpha 0.1
- Axes `text-2` 10px mono
- Tooltip `bg-2` border-1 `border`

### Iconographie
- Lucide React exclusivement (déjà en place)
- Taille : 14 / 16 / 18 / 20 (pas au-dessus sauf empty states)
- Couleur : héritée du contexte, jamais multicolore

### Logo
Mark minimal : glyphe géométrique (triangle ou hexagone) évoquant un groin/boucle + wordmark "PorcTrack" en Big Shoulders Black. Pas d'animal illustré. Pas d'émoji.

## Iconographie métier (illustrations au besoin)

Silhouettes SVG monochromes `accent` ou `text-2`, style **tracé ingénieur** (1px constant), jamais rempli. Vocabulaire :
- Truie profile vs Porcelet profile vs Verrat profile
- Bande (groupe de 3-5 silhouettes alignées)
- Seringue, biberon, sac d'aliment, balance

## Motion

- `transition-colors 160ms cubic-bezier(0.23,1,0.32,1)` sur états
- `transition-transform` avec `scale(0.98)` sur press (jamais all)
- Skeleton shimmer sur chargement
- Micro-stagger 40ms sur listes (fade-in-up)
- Reduced-motion respecté

## Layout global

- **Safe-area** iOS/Android respecté
- Header fixe 56px : gradient thin accent-dim → transparent
- Tab bar fixe 64px : 5 tabs (Accueil / Cheptel / Bandes / Santé / Plus)
- Padding écran : 16px horizontal
- Max width cards : 720px (tablette)

## Densité vs respiration

Ratio cible : **3 infos par écran visible** (contre ~1 aujourd'hui). Chaque card peut contenir :
- 1 KPI principal
- 2-3 sous-métriques en grille
- 1 mini-graph optionnel
- 1 action rapide

## Principes d'interaction

1. **Pas de modals pour saisir** — inline edit ou pull-sheet bottom
2. **Long press** = actions secondaires (pas de menu contextuel caché)
3. **Haptic** light sur tap, medium sur action destructive
4. **Undo** systémique (toast 5s) pour suppressions
5. **Pull-to-refresh** sur toutes les vues listes

## À BANNIR

- Emoji 🐷 dans l'UI (icône custom ou Lucide uniquement)
- Gradients multi-couleurs
- Shadows visibles > 4px
- Rounded > 12px
- Uppercase partout (seulement labels nav et titres section)
- Polices cursives ou "fun"
- Couleurs pastel dans les KPIs
- Card-in-card (profondeur max = 1)
