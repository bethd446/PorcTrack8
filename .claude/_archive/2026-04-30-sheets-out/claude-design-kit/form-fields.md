# Claude Design — Champs du formulaire (copy-paste)

## Company name and blurb

```
PorcTrack 8 — Agritech Dark
```

Blurb (copy-paste intégral) :

```
PorcTrack 8 is a mobile-first Ionic React + Capacitor app for managing a family-run pig farm in Côte d'Ivoire (Ferme K13 — 17 sows, 2 boars, ~100 piglets across 4 weaning pens). Used by the farm owner remotely and by the stockman on the ground.

Design system: "Agritech Dark" — a calm, data-dense dark theme inspired by professional field instruments. Heavy use of monospace for figures (tabular-nums), uppercase headings in BigShoulders condensed sans-serif, and a restrained emerald/amber/coral accent palette tied to content categories (cycles, finance, alerts). UI in French.

Key design principles:
- Data first, chrome second — KPI cards, data rows and chips dominate
- Monospace for anything numeric (IDs, dates, counts, percentages)
- One accent per tab, never decorative
- Generous negative space + rounded-xl/2xl surfaces
- Offline-first, optimistic UI, no skeletons for data already cached
- Tap targets ≥44px, uppercase short labels, minimal iconography (Lucide)

Typography stack:
- BigShoulders Bold — uppercase headings & KPI values (.ft-heading)
- InstrumentSans — body
- BricolageGrotesque — large numeric values
- DMMono — monospace for IDs, codes, dates, percentages
```

---

## Link code on GitHub

Lien repo (à adapter si privé) :

```
https://github.com/<ton-user>/PorcTrack8
```

Si le repo est privé ou pas hébergé → utiliser **"Link code from your computer"** et glisser le dossier `claude-design-kit/code/`.

---

## Link code from your computer

Glisser le dossier :

```
/Users/desk/PorcTrack8/claude-design-kit/code/
```

Contient :
- `agritech/` — 8 composants du design system
- `AgritechHeader.tsx`, `AgritechLayout.tsx`, `AgritechNavV2.tsx`, `Cockpit.tsx` — shell
- `sample-views/` — 4 vues représentatives

---

## Upload .fig file

**Aucun** — on n'a pas de fichier Figma. Sauter ce champ.

---

## Add fonts, logos and assets

Glisser tout le dossier :

```
/Users/desk/PorcTrack8/claude-design-kit/assets/
```

Contient :
- 4 logos SVG (agritech-logo, agritech-mark, logo, icon)
- 7 fichiers TTF (BigShoulders Bold/Regular, BricolageGrotesque Bold/Regular, DMMono, InstrumentSans Bold/Regular)

---

## Any other notes?

```
Core tokens (Agritech Dark) — see tokens/agritech-tokens.css:
- Surfaces: --bg-0 #0A0E0B (deepest), --bg-1 #121714 (elevated), --bg-2 #1A211E (cards)
- Text: --text-0 #E8EFE8 (primary), --text-1 #9FB0A6 (secondary), --text-2 #6B7E74 (tertiary)
- Accent (emerald/forest): --accent #10B981, --accent-fg #04392D
- Status: --success #22C55E, --warning #F59E0B, --danger #EF4444, --info #3B82F6
- Per-tab accents (theme-v2-tokens.css): --accent-cockpit (emerald), --accent-troupeau (teal), --accent-cycles (cyan), --accent-ressources (amber), --accent-pilotage (coral)
- Radii: --radius-sm 6px, --radius-md 10px, --radius-lg 14px, --radius-xl 20px, --radius-2xl 28px
- Shadows are very subtle (dark theme) — use border + bg elevation, not shadows
- Easings: spring (cubic-bezier 0.34, 1.56, 0.64, 1), gentle, snappy

Key CSS components in index.css:
- .card-dense — standard data card (bg-2, rounded-xl, border, padding 16px)
- .kpi-label — uppercase 11px micro-label in text-2
- .ft-heading — BigShoulders Bold uppercase tracking-wide
- .font-mono + tabular-nums — for any numeric display
- .pressable — tap feedback (scale 0.98 + opacity on active)

UX conventions:
- Headers: AgritechHeader (uppercase title + subtitle, optional backTo) — no gradient, flat
- Bottom nav: 5 tabs (Cockpit, Troupeau, Cycles, Ressources, Pilotage), each with own accent color
- Empty states: centered icon + short uppercase h3 + 1-sentence helper text
- Chips: tone-based (accent, amber, red, gold, purple), never decorative

Brand voice:
- French, technical but warm
- Short uppercase labels
- "Tu" form acceptable in helper text
- No marketing fluff — stockman needs info fast
```

---

## Après la création du design system

Test prompts suggérés (à copier-coller dans Claude Design une fois le system publié) :

1. `Crée un écran "Module Finances" pour PorcTrack avec KPI (CA mois, dépenses, marge), un graphique en barres des ventes par bande, et une liste des 5 dernières transactions.`
2. `Redesign l'écran Finition (porcs ≥80 kg prêts abattoir) avec carte par porc listant ID, sexe, poids estimé, jours depuis sevrage, et un CTA "Programmer sortie".`
3. `Crée une landing page marketing pour PorcTrack 8 — éleveur cible fermes familiales ouest-africaines 10-50 truies.`
