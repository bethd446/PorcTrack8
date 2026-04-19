# Plan d'écrans — Refonte Agritech Moderne

> Version 1.0 — 17 avril 2026
> Cible : ferme naisseur-engraisseur A130 · 17 truies + 2 verrats + bandes porcelets
> Style : dark-first cockpit (Linear / Vercel / Bloomberg Terminal)
> Data source : Google Sheets V20 (TRUIES_REPRODUCTION, PORCELETS_BANDES, STOCK_ALIMENTS, STOCK_VETO, ALERTES_ACTIVES, PROTOCOLES, JOURNAL_SANTE) + FarmContext local

---

## TOC

1. [Principes d'interaction](#principes-dinteraction-rappel)
2. [Nav 5 onglets](#nav-5-onglets)
3. [Sprint 1 — MVP](#sprint-1--mvp-6-ecrans)
4. [Sprint 2 — Cycles](#sprint-2--cycles-6-ecrans)
5. [Sprint 3 — Pilotage](#sprint-3--pilotage-8-ecrans)
6. [Par écran (détails)](#par-ecran-details)
7. [Composants transverses à créer](#composants-transverses-a-creer)
8. [Migration des routes existantes](#migration-des-routes-existantes-old--new)
9. [Annexes : API props des nouveaux composants](#annexes--api-props-des-nouveaux-composants)

---

## Principes d'interaction (rappel)

- **Dark-first strict** — `bg-0` page, `bg-1` cards, border 1px, zéro shadow visible
- **Chiffre d'abord** — JetBrains Mono pour TOUT chiffre/ID, `font-variant-numeric: tabular-nums`
- **Accent parcimonieux** — `#10B981` jamais en fond massif, seulement état actif/delta positif
- **Bottom-sheets, pas modals** — toute saisie rapide glisse du bas (Capacitor-friendly)
- **Long press** = action secondaire (réforme, archiver) ; **tap** = détail
- **Pull-to-refresh** sur toutes les listes
- **Haptic light** sur tap, **medium** sur destructif, **Undo 5s** systémique
- **Radius max 10px**, pas de `rounded-xl/2xl` dans les surfaces agritech
- **Densité cible** : ≥ 3 infos par viewport — ratio x3 vs version actuelle
- **Safe-area** iOS/Android respecté ; header 56px fixe, tab-bar 64px fixe
- **Français** partout ; dates `dd/mm/yyyy` mono ; heures `HH:mm` mono

---

## Nav 5 onglets

Remplace la nav actuelle (4 onglets : Aujourd'hui / Troupeau / Journal / Plus).

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                       [ écran courant ]                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ◉         ◯          ◯          ◯          ◯                  │
│ COCKPIT  TROUPEAU   CYCLES   RESSOURCES   PILOTAGE              │
│  (/)    (/troupeau) (/cycles)(/ressources)(/pilotage)           │
└─────────────────────────────────────────────────────────────────┘
  Home     TruieIcon   Repeat    Wheat+      LineChart
           (custom)    (Lucide) Syringe (Lucide)
```

Labels : `.kpi-label` mono 11px uppercase. Actif : icône `accent` + underline 2px `accent`. Inactif : `text-2`.

---

## Sprint 1 — MVP (6 écrans)

Objectif : livrer une valeur immédiate sur ce qu'un éleveur regarde 3× par jour.

| # | Écran | Route | Gain |
|---|---|---|---|
| 1 | Cockpit | `/` | 4 KPI + 3 alertes + 3 actions en 1 coup d'œil |
| 2 | Troupeau (hub) | `/troupeau` | Entrée unique 3 tuiles (truies / verrats / bandes) |
| 3 | Truies (liste) | `/troupeau/truies` | Table dense mono + filtres statut |
| 4 | Truie (détail) | `/troupeau/truies/:id` | Lifetime record + timeline soins + quick actions |
| 5 | Alertes | `/pilotage/alertes` | Refonte dark + section Serveur déjà OK |
| 6 | Plan Alimentation | `/ressources/aliments/plan` | Conso/j = ration × effectif → jours couverture |

## Sprint 2 — Cycles (6 écrans)

Objectif : rendre visible le flux temporel naisseur → engraisseur.

| # | Écran | Route | Gain |
|---|---|---|---|
| 7 | Cycles (hub) | `/cycles` | 4 tuiles : Repro / Maternité / Post-sev / Engrais |
| 8 | Repro | `/cycles/repro` | Calendrier saillies + MB prévues J-7/J+30 |
| 9 | Maternité | `/cycles/maternite` | Truies J0→J+21 + pesée porcelets J3/J7/J14/J21 |
| 10 | Post-sevrage | `/cycles/post-sevrage` | Bandes < J+70 + GMQ calculé |
| 11 | Engraissement | `/cycles/engraissement` | Bandes > J+70 + projection abattage |
| 12 | Bandes (liste + détail) | `/troupeau/bandes` · `/:id` | Vue porcelets groupés par portée |

## Sprint 3 — Pilotage (8 écrans)

Objectif : perf, finances, admin, réglages.

| # | Écran | Route |
|---|---|---|
| 13 | Pilotage (hub) | `/pilotage` |
| 14 | KPI Perf | `/pilotage/perf` |
| 15 | Finances | `/pilotage/finances` |
| 16 | Audit (admin) | `/pilotage/audit` |
| 17 | Réglages | `/pilotage/reglages` |
| 18 | Ressources (hub) | `/ressources` |
| 19 | Véto (stock) | `/ressources/veto` |
| 20 | Véto (protocoles + calendrier vaccinal) | `/ressources/veto/protocoles` |
| 21 | Aliments (stock) | `/ressources/aliments` |
| 22 | Verrats (liste + détail) | `/troupeau/verrats` · `/:id` |

---

## Par écran (détails)

---

### `/` — Cockpit

**But** : vue pilote matinale — 4 KPI + 3 alertes prioritaires + 3 quick actions.
**Priorité** : Sprint 1

```
┌─────────────────────────────────────────────────┐
│ COCKPIT                                         │
│ Ferme A130 · Nord · mar 17 avr                  │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│ │TRUIES PL.│ │MATERNITÉ │ │STOCK CRIT│ │ALERTE││
│ │    8     │ │    4     │ │    2     │ │  5   ││
│ │ / 17     │ │ J+14 moy │ │ aliments │ │ jour ││
│ └──────────┘ └──────────┘ └──────────┘ └──────┘│
├─────────────────────────────────────────────────┤
│ [!] MISE-BAS T-142 · J-2 · 2026-04-19       →  │
│ [!] STOCK KPC RUPTURE J+2                    →  │
│ [·] SEVRAGE BANDE N°7 demain                 →  │
├─────────────────────────────────────────────────┤
│ [+ Quick Saillie] [+ Quick Soin] [+ Quick Note]│
└─────────────────────────────────────────────────┘
```

**Data** : `truies` (filtre statut), `bandes` (statut=Sous mère), `stockAliment/Veto` (statutStock), `alerts` (local) + `alertesServeur` (backend).
**Actions** : tap KPI → liste filtrée · tap alerte → détail · tap quick action → bottom-sheet.
**États** : loading (skeleton 4 KPI + 3 rows), empty (aucune alerte : "Tout est vert"), error (banner rouge + retry).
**Composants** : [NOUVEAU] `KpiCard`, [NOUVEAU] `AlertRow`, [NOUVEAU] `QuickActionBar`.
**Classes** : `.card-dense`, `.kpi-label`, `.kpi-value`, `.kpi-delta-up/down`, `.chip--red/amber`.
**Icônes** : `TruieIcon`, `BandeIcon`, Lucide `Package`, `AlertTriangle`, `Plus`.
**Migration** : remplace `Dashboard.tsx` actuel (conserver logique `alertEngine`).

---

### `/troupeau` — Troupeau (hub)

**But** : point d'entrée 3 tuiles vers Truies / Verrats / Bandes + compteurs.
**Priorité** : Sprint 1

```
┌─────────────────────────────────────────────────┐
│ TROUPEAU                                        │
│ 17 truies · 2 verrats · 12 bandes              │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐  │
│ │ ♀ TRUIES                              →   │  │
│ │ 17   · 8 pleines · 4 mater · 5 attente    │  │
│ └───────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────┐  │
│ │ ♂ VERRATS                             →   │  │
│ │ 2    · 2 actifs                            │  │
│ └───────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────┐  │
│ │ ◉◉◉ BANDES                            →   │  │
│ │ 12   · 4 sous mère · 8 sevrés             │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Data** : `truies`, `verrats`, `bandes`.
**Actions** : tap tuile → liste.
**États** : loading (3 rows skeleton), empty (n/a), error.
**Composants** : `PremiumCard` (existant) ou [NOUVEAU] `HubTile`.
**Classes** : `.card-dense`, `.kpi-value` (chiffre principal), `.chip`.
**Icônes** : `TruieIcon`, `VerratIcon`, `BandeIcon`.

---

### `/troupeau/truies` — Truies (liste)

**But** : table dense des 17 truies avec filtres statut + recherche boucle.
**Priorité** : Sprint 1 (refonte de l'actuel `CheptelView`)

```
┌─────────────────────────────────────────────────┐
│ TRUIES · 17                                     │
│ [◉ Tous] [Pleines 8] [Mater 4] [Attente 5]      │
│ 🔍 Chercher boucle/nom…                          │
├──────┬──────────┬─────────┬──────┬──────────────┤
│ ID   │ BOUCLE   │ STATUT  │ PORT │ MB PRÉVUE    │
├──────┼──────────┼─────────┼──────┼──────────────┤
││T-142│ 4F0012   │ PLEINE  │  5   │ 19/04/2026   │
│ T-108│ 4F0023   │ MATER   │  3   │ —            │
│ T-203│ 4F0045   │ ATTENTE │  2   │ —            │
│ T-017│ 4F0007   │ À SURV  │  8   │ 03/05/2026   │
└─────────────────────────────────────────────────┘
        pull-to-refresh · tap row → détail
```

**Data** : `truies` (filtre statut, search sur `boucle`, `nom`).
**Actions** : tap → `/troupeau/truies/:id` · long-press → menu (réforme, note) · pull-to-refresh.
**États** : loading (5 rows skeleton mono), empty ("Aucune truie · importer Sheets"), error.
**Composants** : [NOUVEAU] `DataTable`, [NOUVEAU] `FilterChips`, [NOUVEAU] `SearchBar` (dark).
**Classes** : `.data-table`, `.data-row`, `.chip--accent/amber/blue`.
**Icônes** : `TruieIcon`, Lucide `Search`, `SlidersHorizontal`.
**Migration** : refonte `CheptelView` en mode dark + table agritech (remplace cards grid).

---

### `/troupeau/truies/:id` — Truie (détail)

**But** : lifetime record truie — KPIs repro + timeline soins + quick actions.
**Priorité** : Sprint 1 (existe déjà, à moderniser)

```
┌─────────────────────────────────────────────────┐
│ ← T-142 · 4F0012                   [⋯]          │
├─────────────────────────────────────────────────┤
│ ● PLEINE · STADE J+97 · MB 19/04/26             │
│ ┌─────────┬─────────┬─────────┬──────────────┐ │
│ │ NV MOY  │ MORTAL. │ PORTÉES │ SEVRÉS/AN    │ │
│ │  11.2   │  8.4%   │   5     │   24.8       │ │
│ └─────────┴─────────┴─────────┴──────────────┘ │
├─────────────────────────────────────────────────┤
│ TIMELINE SOINS                                  │
│ 14/04 · VACCIN parvo · 2ml                      │
│ 02/04 · DÉPARASITAGE · ivermectine              │
│ 20/03 · SAILLIE · verrat V-01                   │
│ ─────                                           │
│ [+ Ajouter soin] [+ Note] [→ Voir bande]        │
└─────────────────────────────────────────────────┘
```

**Data** : `truies[id]`, `sante.filter(cibleId=id)`, `bandes.filter(truie=boucle)`.
**Actions** : [+ Soin] bottom-sheet · [+ Note] · [→ Bande] si sous-mère · long-press sur soin = éditer.
**États** : loading (skeleton KPIs + 4 rows timeline), empty timeline ("Aucun soin"), error.
**Composants** : [NOUVEAU] `KpiGrid` (4 cols dense), [NOUVEAU] `TimelineRow`, `PremiumButton` (existant, à styler dark).
**Classes** : `.card-dense`, `.kpi-label`, `.kpi-value`, `.chip--accent`, `.ft-code` pour dates.
**Icônes** : `TruieIcon`, `SeringueIcon`, Lucide `FileText`, `ArrowRight`, `MoreVertical`.
**Migration** : `AnimalDetailView.tsx` → ajouter KPI lifetime (dérivés de `bandes` + `sante`, non stockés Sheets).

---

### `/troupeau/verrats` — Verrats (liste)

**But** : 2 verrats en mode card (petit N — pas besoin de table).
**Priorité** : Sprint 3

```
┌─────────────────────────────────────────────────┐
│ VERRATS · 2                                     │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐  │
│ │ ♂ V-01 · 5G0003              ● ACTIF      │  │
│ │ Origine : Achat              Ration 3.2kg │  │
│ │ Alim : Gestation (KPC)                    │  │
│ └───────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────┐  │
│ │ ♂ V-02 · 5G0008              ● ACTIF      │  │
│ │ Origine : Naissance          Ration 3.0kg │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Data** : `verrats`.
**Actions** : tap → détail · long-press → note.
**États** : loading, empty.
**Composants** : `.card-dense` + `VerratIcon`.
**Classes** : `.card-dense`, `.chip--accent`, `.ft-code`.
**Icônes** : `VerratIcon`.

---

### `/troupeau/verrats/:id` — Verrat (détail)

**But** : profil verrat + historique saillies.
**Priorité** : Sprint 3

```
┌─────────────────────────────────────────────────┐
│ ← V-01 · 5G0003                   [⋯]           │
│ ● ACTIF · Origine Achat                         │
├─────────────────────────────────────────────────┤
│ ALIM : Gestation (KPC) · Ration 3.2 kg/j        │
├─────────────────────────────────────────────────┤
│ SAILLIES (derniers 90j)                         │
│ 20/03 · T-142                                   │
│ 02/03 · T-108                                   │
│ 15/02 · T-203                                   │
└─────────────────────────────────────────────────┘
```

**Data** : `verrats[id]`, saillies dérivées de `bandes` (via `truie→boucleMere→dateMB`).
**Actions** : [+ Saillie] bottom-sheet.
**Composants** : `.card-dense`, [NOUVEAU] `TimelineRow`.
**Icônes** : `VerratIcon`.

---

### `/troupeau/bandes` — Bandes (liste)

**But** : 12 bandes porcelets — groupées par statut Sous-mère / Sevrés.
**Priorité** : Sprint 2 (refonte `BandesView`)

```
┌─────────────────────────────────────────────────┐
│ BANDES · 12                                     │
│ [Tous] [Sous mère 4] [Sevrés 8]                 │
├─────────────────────────────────────────────────┤
│ SOUS MÈRE                                       │
││B-07 · T-142 · J+14 · NV 12 · Morts 1 · V 11  │
││B-06 · T-108 · J+03 · NV 14 · Morts 0 · V 14  │
│ ─────                                           │
│ SEVRÉS                                          │
││B-04 · T-203 · J+35 · NV 11 · V 10            │
││B-03 · T-017 · J+72 · NV 13 · V 12            │
└─────────────────────────────────────────────────┘
```

**Data** : `bandes` (group by `statut`).
**Actions** : tap → détail · long-press → sevrage manuel · pull-to-refresh.
**Composants** : [NOUVEAU] `DataTable` + [NOUVEAU] `SectionDivider`.
**Classes** : `.data-table`, `.data-row`, `.chip--accent/blue`.
**Icônes** : `BandeIcon`, `PorceletIcon`.

---

### `/troupeau/bandes/:id` — Bande (détail)

**But** : détail portée + timeline pesée (si Sprint 2 maternité) + actions sevrage/mortalité.
**Priorité** : Sprint 2

```
┌─────────────────────────────────────────────────┐
│ ← B-07 · Truie T-142             [⋯]            │
│ ● SOUS MÈRE · J+14                              │
├─────────────────────────────────────────────────┤
│ ┌──────┬──────┬──────┬────────────┐             │
│ │ NV   │MORTS │VIVANT│ SEV PRÉVU  │             │
│ │ 12   │  1   │  11  │ 28/04/2026 │             │
│ └──────┴──────┴──────┴────────────┘             │
├─────────────────────────────────────────────────┤
│ PESÉES                                          │
│ J+03 · 1.4 kg moy · 11 porcelets                │
│ J+07 · 2.1 kg moy                               │
│ J+14 · 3.6 kg moy                               │
│ ─────                                           │
│ [+ Pesée] [+ Mortalité] [→ Sevrer]              │
└─────────────────────────────────────────────────┘
```

**Data** : `bandes[id]`, pesées dérivées (nouveau : `BandePorcelets.pesees` à ajouter — Sheets `PORCELETS_PESEES` nouveau).
**Actions** : `[+ Pesée]` → [NOUVEAU] Quick Pesée bulk · `[+ Mortalité]` · `[→ Sevrer]` marque `statut=Sevrés`.
**Composants** : `KpiGrid`, `TimelineRow`.
**Icônes** : `BandeIcon`, `PorceletIcon`, `BalanceIcon`.
**Migration Sheets** : nouvelle table `PORCELETS_PESEES` (idBande, date, poidsMoyenKg, nbPesés).

---

### `/cycles` — Cycles (hub)

**But** : hub 4 tuiles couvrant le cycle naisseur-engraisseur complet.
**Priorité** : Sprint 2

```
┌─────────────────────────────────────────────────┐
│ CYCLES                                          │
├─────────────────────────────────────────────────┤
│ ┌───────────────────┬───────────────────┐      │
│ │ ↻ REPRO           │ ♡ MATERNITÉ       │      │
│ │ 5 saillies J-7    │ 4 truies          │      │
│ │ 3 MB prévues      │ J+3 à J+21        │      │
│ ├───────────────────┼───────────────────┤      │
│ │ ◉◉ POST-SEVRAGE   │ ■ ENGRAISSEMENT   │      │
│ │ 4 bandes          │ 4 bandes          │      │
│ │ GMQ 320g moy      │ 85j à abattage    │      │
│ └───────────────────┴───────────────────┘      │
└─────────────────────────────────────────────────┘
```

**Data** : dérivés `bandes`, `truies` (stade/statut).
**Actions** : tap → sous-écran.
**Composants** : [NOUVEAU] `HubTile` grille 2×2.
**Icônes** : Lucide `Repeat`, `Heart`, `BandeIcon`, Lucide `Warehouse`.

---

### `/cycles/repro` — Repro

**But** : calendrier saillies passées + MB prévues J-7/J+30.
**Priorité** : Sprint 2

```
┌─────────────────────────────────────────────────┐
│ REPRO · avril 2026                              │
│ [ Semaine ] [ Mois ]                            │
├─────────────────────────────────────────────────┤
│      L  M  M  J  V  S  D                        │
│ S15  ·  ·  ▲  ·  ·  ·  ·       ▲ saillie        │
│ S16  ·  ●  ·  ·  ·  ·  ·       ● MB prévue      │
│ S17  ·  ·  ·  ●  ·  ·  ·       ◆ MB réalisée    │
│ S18  ·  ·  ·  ·  ●  ·  ·                        │
├─────────────────────────────────────────────────┤
│ MB PRÉVUES 30 PROCHAINS J                       │
││T-142 · 19/04 · J-2  (IMMINENTE)               │
│ T-108 · 24/04 · J+3                            │
│ T-203 · 12/05 · J+25                           │
└─────────────────────────────────────────────────┘
```

**Data** : `truies.filter(dateMBPrevue)`, saillies dérivées `bandes.dateMB - 115j`.
**Actions** : tap MB → truie détail · [+ Saillie] FAB.
**Composants** : [NOUVEAU] `CalendarGrid`, [NOUVEAU] `DataTable`.
**Classes** : `.card-dense`, `.chip--amber/red`, `.ft-code`.
**Icônes** : Lucide `Calendar`, `Plus`.
**Migration Sheets** : utilise `TRUIES_REPRODUCTION.dateMBPrevue` + table future `SUIVI_REPRODUCTION_ACTUEL` (saillies).

---

### `/cycles/maternite` — Maternité

**But** : truies en maternité J0→J+21 + pesée porcelets J3/J7/J14/J21.
**Priorité** : Sprint 2

```
┌─────────────────────────────────────────────────┐
│ MATERNITÉ · 4 truies en cours                   │
├─────────────────────────────────────────────────┤
││T-108 · J+03 · NV 14 · Morts 0 · V 14          │
│   Pesée J+3 ✓ 1.4kg                            │
││T-142 · J+14 · NV 12 · Morts 1 · V 11          │
│   Pesée J+14 ✓ 3.6kg   J+7 ✓   J+3 ✓          │
││T-045 · J+08 · NV 10 · Morts 2 · V 8           │
│   Pesée J+7 ✓   J+3 ✓                          │
││T-203 · J+20 · NV 13 · Morts 1 · V 12          │
│   Pesée J+14 ✓ ··· J+21 ⚠ À FAIRE              │
├─────────────────────────────────────────────────┤
│ [+ Pesée bulk] [+ Mortalité]                    │
└─────────────────────────────────────────────────┘
```

**Data** : `truies.filter(statut='En maternité')` + `bandes.filter(statut='Sous mère')` + pesées.
**Actions** : tap truie → `/troupeau/bandes/:id` · [+ Pesée bulk] bottom-sheet Quick Pesée.
**États** : empty ("Aucune truie en maternité"), loading.
**Composants** : [NOUVEAU] `MaterniteRow`, [NOUVEAU] `PeseeStepsDots` (J3/J7/J14/J21 ✓⚠—).
**Classes** : `.data-table`, `.chip--accent` ✓, `.chip--amber` ⚠.
**Icônes** : `TruieIcon`, `PorceletIcon`, `BalanceIcon`.

---

### `/cycles/post-sevrage` — Post-sevrage

**But** : bandes sevrées < J+70 + GMQ calculé (poids actuel - poids sevrage / jours).
**Priorité** : Sprint 2

```
┌─────────────────────────────────────────────────┐
│ POST-SEVRAGE · 4 bandes                         │
├──────┬─────┬────┬──────┬──────┬────────────────┤
│ BAND │ AGE │ N  │ POIDS│ GMQ  │ STATUS         │
├──────┼─────┼────┼──────┼──────┼────────────────┤
││B-04│ J+35│ 10 │ 18kg │ 340g │ ● OK           │
│ B-05│ J+42│ 11 │ 22kg │ 310g │ ● OK           │
│ B-06│ J+55│  9 │ 26kg │ 280g │ ◐ moyen        │
│ B-07│ J+68│ 12 │ 32kg │ 365g │ ● OK           │
└─────────────────────────────────────────────────┘
```

**Data** : `bandes.filter(statut=Sevrés, age<70)` + pesées.
**Actions** : tap → détail · [+ Pesée] bulk.
**Composants** : [NOUVEAU] `DataTable` avec colonne GMQ derivée.
**Classes** : `.data-table`, `.chip--accent/amber`, `.kpi-value` pour GMQ.
**Icônes** : `PorceletIcon`, `BalanceIcon`.

---

### `/cycles/engraissement` — Engraissement

**But** : bandes > J+70 + projection date abattage (hypothèse 110kg).
**Priorité** : Sprint 2

```
┌─────────────────────────────────────────────────┐
│ ENGRAISSEMENT · 4 bandes                        │
├──────┬─────┬──────┬──────┬─────────────────────┤
│ BAND │ AGE │ PDS  │ GMQ  │ ABATT. PROJETÉ      │
├──────┼─────┼──────┼──────┼─────────────────────┤
││B-03│J+85 │ 48kg │ 760g │ 15/06/2026 (J+140)  │
│ B-02│J+110│ 72kg │ 710g │ 03/06/2026 (J+135) │
│ B-01│J+145│ 98kg │ 680g │ 24/05/2026 (J+165) │
└─────────────────────────────────────────────────┘
```

**Data** : `bandes.filter(age>70)` + pesées + projection = `(110 - poidsActuel) / GMQ + today`.
**Actions** : tap → détail · [+ Pesée vif].
**Composants** : `DataTable`.
**Classes** : `.data-table`, `.ft-code`, `.kpi-value`.
**Icônes** : Lucide `Warehouse`, `TrendingUp`.

---

### `/ressources` — Ressources (hub)

**But** : 2 tuiles — Aliments + Véto.
**Priorité** : Sprint 1 (stub) — Sprint 3 (final)

```
┌─────────────────────────────────────────────────┐
│ RESSOURCES                                      │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐  │
│ │ ≡ ALIMENTS                            →   │  │
│ │ 5 aliments · 1 BAS · 1 RUPTURE            │  │
│ └───────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────┐  │
│ │ ℞ VÉTO                                →   │  │
│ │ 12 produits · 2 sous seuil                │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Data** : `stockAliment`, `stockVeto`.
**Composants** : [NOUVEAU] `HubTile`.
**Icônes** : Lucide `Wheat`, `SeringueIcon`.

---

### `/ressources/aliments` — Aliments (stock)

**But** : table stock aliments + badge statut (OK/BAS/RUPTURE).
**Priorité** : Sprint 3 (refonte table actuelle dark)

```
┌─────────────────────────────────────────────────┐
│ ALIMENTS · 5                     [→ Plan]       │
├──────────┬────────┬──────┬───────┬──────────────┤
│ LIBELLÉ  │ STOCK  │ UNIT │ SEUIL │ STATUT       │
├──────────┼────────┼──────┼───────┼──────────────┤
│ KPC      │ 12     │ sacs │ 20    │ ● BAS        │
│ Croiss.  │ 45     │ sacs │ 15    │ ● OK         │
│ Finit.   │  0     │ sacs │ 10    │ ● RUPTURE    │
│ Soja     │ 80     │ kg   │ 50    │ ● OK         │
└─────────────────────────────────────────────────┘
```

**Data** : `stockAliment`.
**Actions** : tap → éditer (inline edit) · [→ Plan] → `/ressources/aliments/plan` · long-press → note.
**Composants** : [NOUVEAU] `DataTable` + `.chip`.
**Classes** : `.data-table`, `.chip--accent/amber/red`.
**Icônes** : Lucide `Wheat`, `AlertCircle`.
**Migration** : `TableView tableKey="STOCK_ALIMENTS"` → vue custom dark.

---

### `/ressources/aliments/plan` — Plan Alimentation

**But** : ration × effectif par catégorie = conso/j, jours couverture par aliment.
**Priorité** : Sprint 1 (quick win #2)

```
┌─────────────────────────────────────────────────┐
│ PLAN ALIMENTATION                               │
│ ferme A130 · calcul au 17/04                    │
├─────────────────────────────────────────────────┤
│ KPC (Gestation)                                 │
│ 8 truies × 2.8 kg/j = 22.4 kg/j                 │
│ Stock 12 sacs × 50kg = 600 kg                   │
│ ══════════════════════════════════ 27 jours     │
│ ─────                                           │
│ Croissance                                      │
│ 4 bandes × ~80 porcelets × 1.2 = 384 kg/j      │
│ Stock 45 sacs × 50 = 2250 kg                    │
│ ═════════════════════════════════ 5.8 jours ⚠  │
├─────────────────────────────────────────────────┤
│ [ Simuler effectif ] [ Exporter PDF ]           │
└─────────────────────────────────────────────────┘
```

**Data** : `stockAliment` + `truies` (count × ration moy 2.8) + `bandes` (count vivants × ration selon âge).
**Actions** : tap aliment → détail · Simuler effectif → bottom-sheet (+/- truies, +/- porcelets).
**États** : loading skeleton 2 groupes.
**Composants** : [NOUVEAU] `RationRow`, [NOUVEAU] `CoverageBar` (barre mono + jours).
**Classes** : `.card-dense`, `.kpi-value` pour jours, `.chip--red/amber`.
**Icônes** : Lucide `Wheat`, `Calculator`.
**Migration** : nouveau écran — dérivé du code existant mais regroupé.

---

### `/ressources/veto` — Véto (stock)

**But** : stock produits vétérinaires + badges.
**Priorité** : Sprint 3

```
┌─────────────────────────────────────────────────┐
│ VÉTO · 12 produits              [→ Protocoles]  │
│ [ Tous ] [ Vaccins ] [ AB ] [ Dépar. ]          │
├──────────┬──────────┬──────┬───────┬────────────┤
│ PRODUIT  │ TYPE     │ STK  │ MIN   │ STATUT     │
├──────────┼──────────┼──────┼───────┼────────────┤
│ Parvovac │ Vaccin   │ 40ml │ 100ml │ ● BAS      │
│ Ivermec. │ Dépar.   │ 20ml │ 50ml  │ ● BAS      │
│ Amox.    │ AB       │ 200ml│ 100ml │ ● OK       │
└─────────────────────────────────────────────────┘
```

**Data** : `stockVeto`.
**Actions** : tap → détail · long-press → usage · [→ Protocoles].
**Composants** : `DataTable`, `FilterChips`.
**Classes** : `.data-table`, `.chip--accent/amber/red`.
**Icônes** : `SeringueIcon`, Lucide `Pill`.

---

### `/ressources/veto/protocoles` — Protocoles + Calendrier vaccinal

**But** : guide métier read-only + vue calendrier vaccinal (prochaines échéances).
**Priorité** : Sprint 3 (moderniser `ProtocolsView`)

```
┌─────────────────────────────────────────────────┐
│ PROTOCOLES · CALENDRIER VACCINAL                │
│ [ Vaccinaux ] [ Curatifs ] [ Dépar. ]           │
├─────────────────────────────────────────────────┤
│ PROCHAINES ÉCHÉANCES                            │
││19/04 · Parvovac · Truies gestation · 2ml IM   │
│ 22/04 · Ivermectine · Bande B-07 · 1ml/10kg    │
│ 28/04 · Fer · Porcelets J+3 bande B-06 · 2ml   │
├─────────────────────────────────────────────────┤
│ FICHES PROTOCOLES                               │
││Vaccination parvo-ery (truies pré-saillie)    │
│ Déparasitage porcelets (J+3)                   │
│ Flushing pré-saillie                           │
└─────────────────────────────────────────────────┘
```

**Data** : protocoles Sheets (read-only) + dérivé `bandes` pour échéances.
**Actions** : tap échéance → [+ Soin] pré-rempli · tap fiche → détail.
**Composants** : [NOUVEAU] `EcheanceRow`, card-dense.
**Classes** : `.data-table`, `.chip--amber`, `.ft-code`.
**Icônes** : `SeringueIcon`, Lucide `Calendar`.

---

### `/pilotage` — Pilotage (hub)

**But** : 5 tuiles : Perf · Finances · Alertes · Audit · Réglages.
**Priorité** : Sprint 3

```
┌─────────────────────────────────────────────────┐
│ PILOTAGE                                        │
├─────────────────────────────────────────────────┤
│ ┌────────────────┬────────────────┐            │
│ │ ↗ PERF         │ ₣ FINANCES     │            │
│ │ 24 sev/truie/an│ +1.2M FCFA/mois│            │
│ ├────────────────┼────────────────┤            │
│ │ ⚠ ALERTES      │ ✓ AUDIT        │            │
│ │ 5 aujourd'hui  │ admin only     │            │
│ ├────────────────┼────────────────┤            │
│ │ ⚙ RÉGLAGES     │                │            │
│ │ sync · auteur  │                │            │
│ └────────────────┴────────────────┘            │
└─────────────────────────────────────────────────┘
```

**Data** : dérivés multiples.
**Composants** : `HubTile` grille 2×N.
**Icônes** : Lucide `TrendingUp`, `Banknote`, `AlertTriangle`, `ShieldCheck`, `Settings`.

---

### `/pilotage/perf` — KPI Perf

**But** : 4 KPI clés — NV moyen, mortalité, intervalle sevrage-saillie, sevrés/truie/an + mini-graph 12 mois.
**Priorité** : Sprint 3

```
┌─────────────────────────────────────────────────┐
│ KPI PERF · 12 derniers mois                     │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │NV MOYEN  │ │MORTALITÉ │ │INT. SEV- │         │
│ │  11.4    │ │  8.2%    │ │  SAIL 6j │         │
│ └──────────┘ └──────────┘ └──────────┘         │
│ ┌──────────────────────────┐                    │
│ │SEVRÉS / TRUIE / AN       │                    │
│ │  24.8                     │                    │
│ └──────────────────────────┘                    │
├─────────────────────────────────────────────────┤
│ [sparkline NV moyen 12 mois, recharts]          │
├─────────────────────────────────────────────────┤
│ [sparkline mortalité 12 mois]                   │
└─────────────────────────────────────────────────┘
```

**Data** : agrégats `bandes` (NV, morts, sevrés) + `truies` (nbPortées) + dates calcul.
**Actions** : tap KPI → drill-down liste lots concernés.
**Composants** : `KpiCard` + [NOUVEAU] `SparklineCard` (Recharts wrapper dark).
**Classes** : `.card-dense`, `.kpi-value`, `.kpi-delta-up/down`.
**Icônes** : Lucide `TrendingUp`, `TrendingDown`.

---

### `/pilotage/finances` — Finances

**But** : coût aliment/lot, coût médical, marge brute estimée.
**Priorité** : Sprint 3

```
┌─────────────────────────────────────────────────┐
│ FINANCES · avril 2026              [ Mois ▼ ]   │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │CONSO ALI.│ │CONSO VÉTO│ │MARGE BRUT│         │
│ │ 820k FCFA│ │ 95k FCFA │ │ +1.2M    │         │
│ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│ PAR LOT                                         │
││B-03 · ali 180k · véto 12k · revenu 420k = +228k│
│ B-02 · ali 140k · véto 8k  · revenu 310k = +162k│
└─────────────────────────────────────────────────┘
```

**Data** : dérivé Sheets `FINANCES` (non branché actuellement — à câbler) + `PHARMACIE INVENTAIRE` (coût unit).
**Actions** : tap lot → détail · filtre mois.
**Composants** : `KpiCard`, `DataTable`.
**Classes** : `.card-dense`, `.kpi-value`, `gold` color pour marge.
**Icônes** : Lucide `Banknote`, `TrendingUp`.
**Migration** : câbler table `FINANCES` Sheets (actuellement ignorée).

---

### `/pilotage/alertes` — Alertes

**But** : refonte `AlertsView` dark — section Locale (alertEngine) + Serveur (alertesServeur).
**Priorité** : Sprint 1 (l'existant a déjà la logique, juste dark restyle)

```
┌─────────────────────────────────────────────────┐
│ ALERTES · 5                                     │
│ [ Toutes ] [ Critique 2 ] [ Haute 3 ]           │
├─────────────────────────────────────────────────┤
│ LOCALES (moteur GTTT)                           │
││⬤ MB IMMINENTE · T-142 · J-2              →    │
│ ⬤ SEVRAGE DEMAIN · B-07                  →    │
│ ⬤ STOCK KPC BAS                          →    │
├─────────────────────────────────────────────────┤
│ SERVEUR (Sheets ALERTES_ACTIVES)                │
││⬤ CRITIQUE · STOCK · Finitions rupture    →    │
│ ⬤ HAUTE · REPRO · T-203 retour chaleur   →    │
└─────────────────────────────────────────────────┘
```

**Data** : `alerts` (alertEngine) + `alertesServeur` (Sheets).
**Actions** : tap → écran cible · swipe-left = masquer local.
**Composants** : `AlertRow`, `SectionDivider`.
**Classes** : `.card-dense` (par alerte), `.chip--red/amber/blue`, border-left 2px couleur priorité.
**Icônes** : Lucide `AlertTriangle`, `AlertCircle`, `Info`.

---

### `/pilotage/audit` — Audit (admin)

**But** : cohérence données — ids orphelins, Sheets vs cache, boucles dupliquées.
**Priorité** : Sprint 3 (existe, dark restyle)

```
┌─────────────────────────────────────────────────┐
│ AUDIT · cohérence données                       │
│ Dernière analyse : 17/04 10:24                  │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ERREURS   │ │WARNINGS  │ │OK        │         │
│ │  2       │ │  4       │ │  156     │         │
│ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│ ERREURS                                         │
││! T-???  · Bande B-09 boucleMere orpheline     │
│ ! STK    · Aliment "KPC" id doublon           │
├─────────────────────────────────────────────────┤
│ [ Relancer audit ] [ Exporter ]                 │
└─────────────────────────────────────────────────┘
```

**Data** : diff `truies` / `bandes` / `stockAliment` côté FarmContext.
**Composants** : `KpiCard`, `DataTable`.
**Icônes** : Lucide `ShieldCheck`, `AlertTriangle`.

---

### `/pilotage/reglages` — Réglages

**But** : settings (sync, auteur, rôle) — refonte `/more`.
**Priorité** : Sprint 3

```
┌─────────────────────────────────────────────────┐
│ RÉGLAGES                                        │
├─────────────────────────────────────────────────┤
│ SYNC                                            │
│  Dernière sync : 17/04 10:24 · ✓ 56 lignes      │
│  [ Forcer sync ]                                │
│ ─────                                           │
│ UTILISATEUR                                     │
│  Auteur : openformac@gmail.com                  │
│  Rôle   : ADMIN                                 │
│ ─────                                           │
│ AFFICHAGE                                       │
│  Thème : Dark (forcé)                           │
│  Densité : Compacte                             │
│ ─────                                           │
│ AVANCÉ                                          │
│  [ Vider cache ] [ Export Sheets ID ]           │
└─────────────────────────────────────────────────┘
```

**Data** : localStorage (GAS URL, user) + `syncStatus` FarmContext.
**Actions** : toggle, bouton action, input URL.
**Composants** : `PremiumInput` (existant, à styler dark), [NOUVEAU] `SettingsRow`.
**Classes** : `.card-dense`.
**Icônes** : Lucide `Settings`, `RefreshCcw`, `User`.
**Migration** : `SystemManagement.SettingsPage` → restyle dark.

---

### Forms bottom-sheet (pas modals)

Tous accessibles depuis cockpit + écrans contextuels. **Dark bottom-sheet** Capacitor-safe, drag-to-dismiss.

#### Quick Saillie (existant, moderniser)
**Trigger** : cockpit · détail truie · détail verrat.
**Champs** : truie (select) · verrat (select) · date (default today) · notes.
**Data** : crée ligne dans future `SUIVI_REPRODUCTION_ACTUEL` + met à jour `Truie.dateMBPrevue = date + 115j`.
**Composants** : [NOUVEAU] `BottomSheet` + `PremiumInput` dark.

#### Quick Soin (existant, moderniser)
**Trigger** : cockpit · détail truie · détail bande · échéance vaccinale.
**Champs** : cibleType · cibleId · typeSoin · produit (select) · dose · observation.
**Data** : crée `TraitementSante` + push `JOURNAL_SANTE`.
**Composants** : `BottomSheet`, `PremiumInput`, `SeringueIcon`.

#### Quick Note (existant, moderniser)
**Trigger** : header `[⋯]` n'importe où.
**Champs** : cible (optionnel) · texte.
**Data** : stockée offline (NotesService existant).

#### [NOUVEAU] Quick Pesée (bulk terrain)
**Trigger** : maternité, post-sevrage, détail bande.
**Wireframe** :
```
┌─ QUICK PESÉE · B-07 ─────────────┐
│ Porcelet 1/11                    │
│ ┌────────────────────────────┐   │
│ │  Scan boucle ou saisir…    │   │
│ └────────────────────────────┘   │
│ Poids (kg)  [ 3.6            ]   │
│ [ Passer ]  [ Suivant → ]        │
│ ─── 3/11 pesés · moy 3.4 kg ─── │
└──────────────────────────────────┘
```
**Comportement** : clavier numérique ouvert, Next auto-focus, fin = enregistre batch + MAJ `PORCELETS_PESEES`.
**Composants** : [NOUVEAU] `BulkWeighSheet`.
**Icônes** : `BalanceIcon`, `PorceletIcon`.
**Migration** : nouvelle table Sheets `PORCELETS_PESEES`.

#### [NOUVEAU] Quick Mortalité
**Trigger** : détail bande, maternité.
**Champs** : bande · cause (select : Écrasement · Sous-poids · Maladie · Autre) · nombre · date.
**Data** : incrémente `BandePorcelets.morts` + décrémente `vivants` + optionnel ligne `JOURNAL_SANTE` (cibleType=BANDE, typeSoin=Mortalité).
**Composants** : `BottomSheet`, [NOUVEAU] `CauseSelector`.

---

## Composants transverses à créer

Préfixe `[NOUVEAU]`. Design system agritech dark.

| Composant | Usage | Écrans |
|---|---|---|
| `KpiCard` | Card KPI 1 valeur + label + delta optionnel | Cockpit, Perf, Finances |
| `KpiGrid` | Grille 2×N ou 4×N de mini-KPIs | Truie détail, Bande détail, Finances |
| `HubTile` | Tuile cliquable avec compteur + icône | Tous les hubs (Troupeau, Cycles, Ressources, Pilotage) |
| `DataTable` | Table dense mono zebra | Truies, Bandes, Aliments, Véto, Post-sev, Engrais |
| `FilterChips` | Barre chips filtres (Tous / Statut 1 / Statut 2) | Listes |
| `SearchBar` | Input search dark + icône loupe | Listes longues (Truies) |
| `SectionDivider` | Hairline + label mono pour grouper | Bandes, Alertes |
| `TimelineRow` | Row dense date mono + contenu | Truie détail, Verrat détail |
| `AlertRow` | Row dense avec border-left couleur priorité | Cockpit, Alertes |
| `QuickActionBar` | Barre 3 boutons ghost bottom-sheet triggers | Cockpit |
| `BottomSheet` | Drawer drag-to-dismiss dark | Tous les quick forms |
| `BulkWeighSheet` | Bottom-sheet pesée bulk next-focus | Maternité, Post-sev |
| `CauseSelector` | Grille 4 boutons causes mortalité | Quick Mortalité |
| `CalendarGrid` | Mini-calendrier mois avec markers | Repro |
| `SparklineCard` | Wrapper Recharts style agritech | Perf, Cockpit KPIs |
| `PeseeStepsDots` | 4 dots J3/J7/J14/J21 avec état ✓⚠— | Maternité |
| `MaterniteRow` | Row truie avec sous-ligne pesées | Maternité |
| `CoverageBar` | Barre mono + label "N jours" | Plan alim |
| `RationRow` | Card ligne ration (effectif × ration = conso) | Plan alim |
| `EcheanceRow` | Row date mono + protocole + cible | Calendrier vaccinal |
| `SettingsRow` | Row label + action/toggle | Réglages |

**Réutilisés** (ne pas jeter, éventuellement restyler dark) : `PremiumCard`, `PremiumButton`, `PremiumInput`, `SectionHeader`, `SkeletonCard`, `ConfirmationModal`, icônes custom (Truie/Verrat/Porcelet/Bande/Balance/Seringue).

---

## Migration des routes existantes (old → new)

| Ancienne route | Nouvelle route | Action |
|---|---|---|
| `/` | `/` | **Refondu** (Dashboard → Cockpit dark) |
| `/controle` | `/cycles/...` + quick actions | **Éclaté** dans cycles (maternité, post-sev) |
| `/cheptel` | `/troupeau/truies` + `/troupeau/verrats` | **Scindé** — onglets → 2 routes |
| `/cheptel/truie/:id` | `/troupeau/truies/:id` | **Renommé** + restyle |
| `/cheptel/verrat/:id` | `/troupeau/verrats/:id` | **Renommé** |
| `/bandes` | `/troupeau/bandes` | **Renommé** |
| `/bandes/:bandeId` | `/troupeau/bandes/:id` | **Renommé** + enrichi (pesées) |
| `/sante` | integrated → `/pilotage/alertes` + timelines détails | **Supprimé** (trop brut) ; saisie via Quick Soin |
| `/stock` + `/stock/aliments` | `/ressources/aliments` | **Fusionné** (doublon éliminé) |
| `/stock/veto` | `/ressources/veto` | **Renommé** + tabs types |
| `/alerts` | `/pilotage/alertes` | **Renommé** |
| `/more` | `/pilotage/reglages` | **Renommé** + dépouillé |
| `/controle` | `/cockpit` quick actions + `/cycles/maternite` | **Éclaté** |
| `/checklist/:name` | `/controle/checklist/:name` | **Namespaced** (reste accessible depuis Cockpit) |
| `/audit` | `/pilotage/audit` | **Renommé** |
| `/sync` | `/pilotage/reglages#sync` | **Fusionné** dans réglages |
| `/protocoles` | `/ressources/veto/protocoles` | **Renommé** + enrichi calendrier |

**Nouvelles routes créées** : `/troupeau`, `/cycles`, `/cycles/repro`, `/cycles/maternite`, `/cycles/post-sevrage`, `/cycles/engraissement`, `/ressources`, `/ressources/aliments/plan`, `/pilotage`, `/pilotage/perf`, `/pilotage/finances`.

**Garder redirections 301 internes** pour anciens deep-links (ex. `/bandes/:id` → `/troupeau/bandes/:id`) pendant 2 sprints.

---

## Annexes : API props des nouveaux composants

```ts
// [NOUVEAU] KpiCard
interface KpiCardProps {
  label: string;                          // uppercase mono
  value: string | number;                 // mono 48px
  sub?: string;                           // "sur 17", "70%"
  delta?: { direction: 'up'|'down'; value: string };
  sparkline?: number[];                   // optionnel 7-30 points
  icon?: React.ComponentType<AgritechIconProps>;
  onTap?: () => void;                     // navigation drill-down
  status?: 'ok'|'warn'|'crit';            // drive chip color
}

// [NOUVEAU] HubTile
interface HubTileProps {
  title: string;                          // "TRUIES"
  count: string | number;                 // "17"
  subtitle?: string;                      // "8 pleines · 4 mater"
  icon: React.ComponentType<any>;
  to: string;                             // react-router path
}

// [NOUVEAU] DataTable
interface DataTableProps<T> {
  columns: Array<{ key: keyof T; label: string; align?: 'left'|'right'; render?: (row: T) => React.ReactNode }>;
  rows: T[];
  getRowKey: (row: T) => string;
  onRowTap?: (row: T) => void;
  onRowLongPress?: (row: T) => void;
  empty?: React.ReactNode;
  loading?: boolean;
  group?: { key: keyof T; label: (v: string) => string };
}

// [NOUVEAU] FilterChips
interface FilterChipsProps {
  options: Array<{ id: string; label: string; count?: number }>;
  value: string;                          // id actif
  onChange: (id: string) => void;
  tone?: 'default'|'accent';
}

// [NOUVEAU] BottomSheet
interface BottomSheetProps {
  open: boolean;
  onDismiss: () => void;
  title: string;
  children: React.ReactNode;
  snapPoints?: [number, number];          // [peek, full] en px ou %
  footerCTA?: { label: string; onTap: () => void; variant?: 'primary'|'ghost'|'danger' };
}

// [NOUVEAU] SparklineCard
interface SparklineCardProps {
  label: string;
  data: Array<{ x: string; y: number }>;
  color?: 'accent'|'amber'|'red'|'gold';
  height?: number;                        // default 56
  yDomain?: 'auto'|[number, number];
}

// [NOUVEAU] AlertRow
interface AlertRowProps {
  priority: 'CRITIQUE'|'HAUTE'|'NORMALE'|'INFO';
  title: string;                          // "MB IMMINENTE"
  meta?: string;                          // "T-142 · J-2"
  description?: string;
  to?: string;                            // navigation cible
  icon?: React.ComponentType<any>;
}

// [NOUVEAU] TimelineRow
interface TimelineRowProps {
  date: string;                           // "14/04"
  label: string;                          // "VACCIN parvo"
  detail?: string;                        // "2ml"
  icon?: React.ComponentType<any>;
  onTap?: () => void;
}

// [NOUVEAU] BulkWeighSheet
interface BulkWeighSheetProps {
  open: boolean;
  bandeId: string;
  expectedCount: number;
  onSubmit: (weights: Array<{ boucle?: string; kg: number }>) => Promise<void>;
  onDismiss: () => void;
}

// [NOUVEAU] CoverageBar
interface CoverageBarProps {
  consoPerDay: number;                    // kg
  stock: number;                          // kg
  unit?: string;
  warningThresholdDays?: number;          // default 7
  criticalThresholdDays?: number;         // default 2
}

// [NOUVEAU] RationRow
interface RationRowProps {
  alimentLibelle: string;
  categorie: string;                      // "Truies gestation"
  effectif: number;
  rationKgJour: number;
  stockKg: number;
}

// [NOUVEAU] EcheanceRow
interface EcheanceRowProps {
  date: string;
  protocoleAction: string;                // "Parvovac"
  cible: string;                          // "Truies gestation"
  dose?: string;
  onTap?: () => void;                     // → Quick Soin préfill
}

// [NOUVEAU] PeseeStepsDots
interface PeseeStepsDotsProps {
  steps: Array<{ label: 'J+3'|'J+7'|'J+14'|'J+21'; state: 'done'|'todo'|'late' }>;
}
```

**Convention props dark** : tous les composants agritech consomment les tokens CSS via classes `.card-dense`, `.kpi-value`, `.chip--*`. Aucun style inline. Tous acceptent `className` pour composition Tailwind extra.

---

## Notes de migration data Sheets

| Écran | Source | Nouveauté Sheets |
|---|---|---|
| Cockpit | TRUIES_REPRODUCTION · PORCELETS_BANDES · STOCK_ALIMENTS · STOCK_VETO · ALERTES_ACTIVES | — |
| Troupeau/Truies | TRUIES_REPRODUCTION | — |
| Truie détail | TRUIES_REPRODUCTION + JOURNAL_SANTE (refonte schéma cible) + PORCELETS_BANDES | schéma JOURNAL_SANTE à normaliser |
| Bandes | PORCELETS_BANDES | — |
| Maternité + Post-sev | PORCELETS_BANDES + **PORCELETS_PESEES** (nouvelle table) | **nouvelle table PORCELETS_PESEES** (idBande, date, poidsMoyen, nbPesés) |
| Repro | TRUIES_REPRODUCTION + **SUIVI_REPRODUCTION_ACTUEL** (nouveau) | **nouvelle table saillies** (idTruie, idVerrat, date, notes) |
| Plan alim | STOCK_ALIMENTS + TRUIES_REPRODUCTION.ration + PORCELETS_BANDES | rien (calcul côté client) |
| Protocoles + vaccinal | PROTOCOLES (read-only) + dérivé bandes | rien |
| Perf | agrégats côté client sur bandes/truies | rien |
| Finances | **FINANCES** (à câbler, existe côté Sheets non branché) + PHARMACIE INVENTAIRE | câbler table existante |
| Véto stock | STOCK_VETO | — |
| Alertes | ALERTES_ACTIVES + alertEngine local | — |

**Nouvelles tables Sheets à créer côté GAS** (2) :
1. `PORCELETS_PESEES` — clé `idBande`, colonnes : Date · Poids moyen (kg) · Nb pesés · Auteur · Notes
2. `SUIVI_REPRODUCTION_ACTUEL` — colonnes : Date saillie · Truie ID · Verrat ID · MB prévue (Date+115j) · Statut (En attente · Confirmée · Échec) · Notes

---

## Ordre d'exécution recommandé

1. **Tokens + utilitaires agritech** déjà en place (`agritech-tokens.css`, `agritech-utilities.css`) ✓
2. **Composants transverses core** : `KpiCard`, `DataTable`, `HubTile`, `FilterChips`, `BottomSheet`, `AlertRow` (semaine 1)
3. **Sprint 1 MVP** : Cockpit, Troupeau hub, Truies liste/détail, Alertes refonte, Plan Alim (semaines 2-3)
4. **Nav 5 onglets** + migration routes + redirections (fin semaine 3)
5. **Sprint 2 Cycles** : Cycles hub, Repro, Maternité, Post-sev, Engrais, Bandes modernisées (semaines 4-5)
6. **Tables Sheets nouvelles** (PORCELETS_PESEES, SUIVI_REPRODUCTION_ACTUEL) côté GAS (semaine 5 parallèle)
7. **Sprint 3 Pilotage** : Perf, Finances, Audit dark, Réglages, Ressources hub, Véto + Protocoles, Verrats (semaines 6-7)

Chaque écran livré : `npx tsc --noEmit` OK + `npm run build` OK + smoke test Capacitor Android.
