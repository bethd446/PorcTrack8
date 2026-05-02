# VAGUE 3 — Plan détaillé : Polish typographie + cohérence visuelle

Version 1.0 · 2026-05-02 · auteur : architecte agent (audit-only)

---

## 0. Résumé exécutif

| Métrique | Valeur |
|---|---|
| `fontSize:` inline restants | **464** sur 38 fichiers |
| `text-[Xpx]` arbitraires | **1 406** sur ~110 fichiers |
| Total à migrer | **~1 870** |
| Classes utilitaires à créer | **10** |
| Lots de migration | **5** |
| Effort estimé | **~28-30 h** sur 6 sprints |

Phase A (tailles aberrantes) et B (unification fontFamily, 305
substitutions) déjà déployées (commit `1026905`).

---

## 1. Distribution actuelle (mesures factuelles)

### `fontSize:` inline (top 13)
```
100  fontSize: 11
 92  fontSize: 13
 54  fontSize: 10
 38  fontSize: 14
 36  fontSize: 34   ← page-title canon
 23  fontSize: 9
 23  fontSize: 12
 21  fontSize: 18   ← KPI value
 20  fontSize: 16
 17  fontSize: 15
  8  fontSize: 22   ← section-title
  5  fontSize: 28
  2  fontSize: 44   ← display-lg (SowHero)
```

### `text-[Xpx]` (top valeurs)
```
550  text-[11px]   ← MASSIF (39 %)
215  text-[10px]
209  text-[12px]
177  text-[13px]
101  text-[14px]
 30  text-[16px]
 29  text-[18px]
 26  text-[9px]
 17  text-[15px]
 14  text-[20px]
 13  text-[22px]
 10  text-[28px]
```
**88 % du volume tient dans 5 valeurs** : 11/10/12/13/14 px.

### Top 10 fichiers pollués `fontSize:` inline
1. `TruieDetailView.tsx` — 34
2. `AdminDashboard.tsx` — 30
3. `RessourcesHub.tsx` — 19
4. `PerfKpiView.tsx` — 17
5. `PilotageHub.tsx` — 16
6. `AlertsView.tsx` — 16
7. `AuditPrintTemplate.tsx` — 15
8. `SystemManagement.tsx` — 15
9. `PendingValidationsView.tsx` — 14
10. `TroupeauHub.tsx` — 14

### Top 10 fichiers pollués `text-[Xpx]`
1. `QuickEditVerratForm.tsx` — 50
2. `QuickAddBandeForm.tsx` — 42
3. `QuickVenteForm.tsx` — 41
4. `QuickEditStockForm.tsx` — 35
5. `QuickAddVerratForm.tsx` — 31
6. `OnboardingWizard.tsx` — 31
7. `MultiPorteeSevrageWizard.tsx` — 30
8. `QuickEditBandeForm.tsx` — 29
9. `QuickAddVetoForm.tsx` — 28
10. `TroupeauLogesView.tsx` — 28

→ Les `Quick*Form` cumulent ≈ 500 occurrences (35 % du total) → **lot dédié**.

---

## 2. Système typographique cible

### Tier 1 — Polices (déjà dans `index.css` @theme) ✅
```css
--font-heading: "BigShoulders", Impact, sans-serif;
--font-body:    "InstrumentSans", -apple-system, system-ui, sans-serif;
--font-mono:    "DMMono", ui-monospace, Menlo, monospace;
```

### Tier 2 — Échelle canonique (10 classes à créer)

| Classe | Taille | Police | Usage |
|---|---|---|---|
| `text-eyebrow` | 9.5px | mono uppercase tracking 0.20em | composant Eyebrow |
| `text-mono-micro` | 10px | mono uppercase tracking 0.06em | mini-labels, stamps |
| `text-caption` | 11px | body | captions discrètes |
| `text-mono-label` | 11px | mono uppercase tracking 0.10em | sub-labels structurants |
| `text-body` | 13px | body | texte courant |
| `text-body-lg` | 14px | body | body large |
| `text-section-label` | 13px | body 600 uppercase | en-têtes sous-sections |
| `text-kpi-value` | 18px | mono tabular 700 | KPI in-card |
| `text-kpi-value-lg` | 20px | mono tabular 700 | KPI larges |
| `text-section-title` | 22px | heading | titres cards prio |
| `text-page-title` | 34px | heading -0.02em | h1 hub/détail |
| `text-display-lg` | 44px | heading | hero (SowHero) |

---

## 3. Phase C1 — Création `src/styles/typography-utils.css`

```css
@layer utilities {
  .text-eyebrow {
    font-family: var(--font-mono); font-size: 9.5px; line-height: 1;
    letter-spacing: 0.20em; text-transform: uppercase; font-weight: 500;
    color: var(--muted);
  }
  .text-mono-micro {
    font-family: var(--font-mono); font-size: 10px; line-height: 1.4;
    letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500;
    font-feature-settings: "tnum" 1;
  }
  .text-caption {
    font-family: var(--font-body); font-size: 11px; line-height: 1.45;
    color: var(--muted);
  }
  .text-mono-label {
    font-family: var(--font-mono); font-size: 11px; line-height: 1.3;
    letter-spacing: 0.10em; text-transform: uppercase; font-weight: 500;
  }
  .text-body { font-family: var(--font-body); font-size: 13px; line-height: 1.5; }
  .text-body-lg { font-family: var(--font-body); font-size: 14px; line-height: 1.5; }
  .text-section-label {
    font-family: var(--font-body); font-size: 13px; line-height: 1.2;
    font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  }
  .text-kpi-value {
    font-family: var(--font-mono); font-size: 18px; line-height: 1;
    font-weight: 700; font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1; letter-spacing: -0.005em;
  }
  .text-kpi-value-lg {
    font-family: var(--font-mono); font-size: 20px; line-height: 1;
    font-weight: 700; font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
  }
  .text-section-title {
    font-family: var(--font-heading); font-size: 22px; line-height: 1.15;
    font-weight: 700; letter-spacing: -0.01em;
  }
  .text-page-title {
    font-family: var(--font-heading); font-size: 34px; line-height: 1;
    font-weight: 700; letter-spacing: -0.02em; color: var(--ink);
  }
  .text-display-lg {
    font-family: var(--font-heading); font-size: 44px; line-height: 1;
    font-weight: 700; letter-spacing: -0.02em; color: var(--ink);
  }
}
```

Import dans `src/index.css` après `@import "./styles/terrain-vivant-v6.css";`.
**Effort C1 : 30 min.**

---

## 4. Lot 1 — Hubs visibles (13 fichiers, ~5 h)

### Pattern h1 commun aux 36 hubs/cycles
```jsx
// AVANT (chaque hub répète ces 8 lignes)
<h1 style={{
  fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 700,
  lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--ink)',
  margin: '8px 0 4px',
}}>

// APRÈS
<h1 className="text-page-title mt-2 mb-1">
```

### Substitutions sed sécurisables
```bash
# text-mono-micro (toutes les 6 permutations)
gsed -i -E 's/text-\[10px\] uppercase font-mono/text-mono-micro/g' <file>
gsed -i -E 's/text-\[10px\] font-mono uppercase/text-mono-micro/g' <file>
gsed -i -E 's/uppercase text-\[10px\] font-mono/text-mono-micro/g' <file>
gsed -i -E 's/uppercase font-mono text-\[10px\]/text-mono-micro/g' <file>
gsed -i -E 's/font-mono text-\[10px\] uppercase/text-mono-micro/g' <file>
gsed -i -E 's/font-mono uppercase text-\[10px\]/text-mono-micro/g' <file>
```

### Liste des 13 fichiers
| Fichier | inline | text-[] |
|---|---|---|
| TodayHub.tsx | 11 | — |
| TroupeauHub.tsx | 14 | 2 |
| ReproductionHub.tsx (features/reproduction/) | 10 | 0 |
| CyclesHub.tsx | 12 | 0 |
| RessourcesHub.tsx | 19 | 0 |
| PilotageHub.tsx | 16 | 0 |
| ClassementView.tsx | 0 | 19 |
| MaterniteView.tsx | 3 | 13 |
| PostSevrageView.tsx | 3 | 16 |
| CroissanceView.tsx | 3 | 8 |
| EngraissementView.tsx | 3 | 7 |
| FinitionView.tsx | 3 | 13 |
| SortieCalendarView.tsx | 2 | 2 |

---

## 5. Lots 2-5 (séquencés)

| Sprint | Description | Effort |
|---|---|---|
| 1 | Foundations : `typography-utils.css` + import + migrer `Eyebrow.tsx` | 2 h |
| 2 | Lot 1 Hubs visibles (13 fichiers) | 5 h |
| 3 | Lot 2 Forms (30+ fichiers, ~520 text-[Xpx]) | 6-7 h |
| 4 | Lot 3 Détails + cohérence Hero (TruieDetailView, BandeDetailView, VerratDetailView, SaillieSuiviPanel) | 5-6 h |
| 5 | Lot 4 Pilotage/Tables/Ressources (16 fichiers) | 5 h |
| 6 | Lot 5 Tail (Auth, design components, pages publiques) + cohérence finale (Chip dedup, Toast wrapper, Troupeau* harmo) | 4-5 h |
| **TOTAL** | | **~28-30 h** |

---

## 6. Cohérence visuelle restante

### 6.1 Layouts Troupeau* — divergences confirmées

| Composant | CTA | Summary strip | Recherche | Tri seg | ViewMode |
|---|:---:|:---:|:---:|:---:|:---:|
| TroupeauTruiesView | OUI top-right | NON | OUI | OUI | OUI |
| TroupeauVerratsView | OUI top-right | OUI 3 KPI | OUI | NON | NON |
| TroupeauPorceletsView | NON | OUI 3 KPI | OUI | NON | NON |
| TroupeauLogesView | NON | OUI compact | NON | NON | NON |

**Reco** : ajouter summary strip à TroupeauTruiesView, CTA `justify-end`
partout, ViewModeToggle absorbé dans summary strip, gap-5 partout.

### 6.2 Fiches détail — divergence majeure

| Fiche | Hero |
|---|---|
| TruieDetailView | **SowHero** (44px, photo, chips, CTA) |
| VerratDetailView | header simple 34px + card-dense séparée |
| BandeDetailView | header simple 34px (pas de photo) |

**Reco** :
- VerratDetailView → réutiliser `SowHero` avec `fallbackIcon={<VerratIcon />}`
  (le composant accepte déjà `fallbackIcon`)
- BandeDetailView → créer `BandeHero` (44px h1, visualisation phase/cohort)
- Optionnellement renommer `SowHero` → `AnimalHero`

### 6.3 Doublon `Chip` CRITIQUE

- `src/components/agritech/Chip.tsx` (tones canoniques)
- `src/components/design/Chip.tsx` (10px inline)

**Reco** : conserver `agritech/Chip`, supprimer `design/Chip`, migrer
imports. Effort : 1 h.

### 6.4 Toasts dispersés

17 fichiers utilisent `<IonToast>` direct avec props variables.

**Reco** : `useToast()` hook + `<AppToast>` wrapper standardisé. Effort : 1 h.

---

## 7. Critères d'acceptation

- `grep -rohE 'fontSize:\s*[0-9]+' src --include='*.tsx' | wc -l` < **50** (vs 464, -90 %)
- `grep -rohE 'text-\[[0-9]+px\]' src --include='*.tsx' | wc -l` < **150** (vs 1 406, -90 %)
- `src/styles/typography-utils.css` existe avec ≥ 10 utilities
- `Eyebrow.tsx` n'utilise plus de `fontSize` inline
- 3 fiches détail (Truie/Verrat/Bande) avec hero pattern cohérent
- Doublon `Chip` éliminé
- `npm run build` 0 warning, `npx tsc --noEmit` 0 erreur, `npm run test:unit` 100 % pass

---

## 8. Risques

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Breaking visuel | Moyenne | Moyen | Spot-check emulator par sprint |
| Régression spacing | Moyenne | Faible | Conserver margin inline lors migration h1 |
| Conflit Tailwind v4 `@layer utilities` | Faible | Bloquant | Tester C1 isolé ; fallback `@utility` syntax v4 |
| Sed batch destructeur | Moyenne | Moyen | `git diff` obligatoire ; jamais sed >5 fichiers sans review |
| Confusion mono-label vs mono-micro | Élevée | Faible | Mapping strict dans description PR |

---

## 9. Notes d'arborescence

- `ReproductionHub` → `src/features/reproduction/` (PAS hubs/)
- `TodayHub` → `src/features/today/` (PAS hubs/)
- Autres hubs → `src/features/hubs/`
