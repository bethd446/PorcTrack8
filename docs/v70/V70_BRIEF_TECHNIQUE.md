# V70_BRIEF_TECHNIQUE — PorcTrack 8

> **Brief opérationnel destiné à l'orchestrateur frais qui dispatchera la task force V70 le 2026-05-19.**
>
> Ce document est **autosuffisant**. Il fixe le périmètre, la chronologie, les composants, les contrats agent, la procédure de bascule et les critères DONE. Aucune question à poser à Christophe avant le J+0 du dispatch — sauf les deux portes de validation explicites (audit Phase 0 et matrice RLS Phase 0.4).
>
> **Branche cible** : `migration/v70-vision-strategique` (créer le 2026-05-19, à partir de `main`).
> **Bible visuelle** : `docs/v70/v70-mockup.html` (1813 lignes — pixel-perfect).
> **Date dispatch** : **2026-05-19** (pas avant — fenêtre rédaction = 2026-05-04 → 2026-05-18).
> **Tag prévu post-merge** : `v2.4.0`.

---

## Table des matières

- [Section 0 — Pré-requis & contexte](#section-0--pré-requis--contexte)
- [Section 1 — DNA visuel V70](#section-1--dna-visuel-v70)
- [Section 2 — Stratégie clean-room feature flag](#section-2--stratégie-clean-room-feature-flag)
- [Section 3 — 8 phases de la task force](#section-3--8-phases-de-la-task-force)
- [Section 4 — Critères DONE V70 (17 checks)](#section-4--critères-done-v70-17-checks)
- [Section 5 — Procédure rollback détaillée](#section-5--procédure-rollback-détaillée)
- [Section 6 — Workflow GitHub Actions adapté V70](#section-6--workflow-github-actions-adapté-v70)
- [Section 7 — Documentation post-merge](#section-7--documentation-post-merge)
- [Annexe A — Composants nouveaux V70 (justification)](#annexe-a--composants-nouveaux-v70-justification)
- [Annexe B — Risques & mitigations](#annexe-b--risques--mitigations)
- [Annexe C — Cas edge non couverts (questions ouvertes)](#annexe-c--cas-edge-non-couverts-questions-ouvertes)
- [Annexe D — Règles éditoriales contenu (V70 stable)](#annexe-d--règles-éditoriales-contenu-v70-stable)

---

## Section 0 — Pré-requis & contexte

### 0.1 État acquis (vérifications avant dispatch)

| Check | Commande | Output attendu |
|---|---|---|
| V44 mergée tag v2.2.0 | `git tag --list v2.2.0` | `v2.2.0` |
| V45 mergée tag v2.3.0 | `git tag --list v2.3.0` | `v2.3.0` |
| HEAD = V45 | `git log --oneline -1` | doit pointer sur le commit de merge V45 (`bc216bf`+ ≈ `33d4cb1` mergé) |
| Tests verts V45 | `npm run test:unit 2>&1 \| grep "Tests "` | `Tests 1699 passed \| 6 skipped (1705)` |
| Build OK | `npm run build 2>&1 \| tail -1` | `✓ built in <Xs>` |
| EntityAvatar dispo | `wc -l src/components/ds/EntityAvatar.tsx` | `~148L` |
| CycleTimeline V2 dispo | `grep -c "shortenLabel" src/design-system/components/index.tsx` | `≥1` |

Si **un seul** de ces checks échoue → **STOP DISPATCH** + ping Christophe avant tout démarrage Phase 0.

### 0.2 Branche cible

```bash
# Le 2026-05-19, J+0 du dispatch :
git checkout main
git pull origin main
git checkout -b migration/v70-vision-strategique
git tag pre-v70-rollback   # snapshot pour rollback radical
git push origin pre-v70-rollback
```

### 0.3 Bible visuelle

**Référence absolue** : `docs/v70/v70-mockup.html` (1813 lignes).

Un mockup HTML interactif autonome qui montre les 5 onglets V70 (Aujourd'hui / Mes animaux / Repro / Performance / Réglages) dans un cadre `iPhone 380×760`. **Tout écart visuel non documenté dans ce brief est un défaut**. Toute couleur ou composant non listé déclenche une remontée orchestrateur.

### 0.4 Décisions tranchées (Christophe — non re-ouvertes)

| ID | Décision | Implication brief |
|----|----------|-------------------|
| **A** | **Naming hybride** : `BottomNav.tsx` label = `Élevage`, `<h1>` page TroupeauHub = `Mes animaux`. Le mockup affiche "Mes animaux" partout (Section 3B). | Phase 2 + 3B doivent diverger explicitement. |
| **B** | **`/controle` dans Tab Aujourd'hui** (carte "Tournée du jour"), **PAS** dans Repro. Le mockup ligne 1068-1079 affiche cette carte sous Aujourd'hui. | Phase 3A. |
| **C** | **RLS Supabase intégré V70**. Phase 5 dédiée, précédée d'un sub-agent `RLS-AUDITOR` en Phase 0.4. **Validation Christophe AVANT** que Phase 5 démarre. | Phase 0.4 + Phase 5. |
| **D** | **Toggle binaire pur `Mode avancé` off/on** — **PAS** les 3 modes du mockup (l. 1418-1431 "Essentiel/Standard/Expert"). Phrase explicative : *« Affiche les tableaux détaillés et active l'export CSV. Les graphiques avancés et l'export PDF arrivent prochainement. »* | Phase 7. |

### 0.5 5 règles cadrage final

1. **`v70-mockup.html` = bible visuelle pixel-perfect.** Aucun écart toléré sans justification écrite (annexe C ou ticket de divergence).
2. **Tokens CSS = liste blanche fermée.** Si une couleur manque, remontée orchestrateur AVANT d'inventer. Liste exhaustive en Section 1.1.
3. **8 composants atomiques listés.** Référencer ces composants, ne pas les redéfinir. Si un 9ᵉ émerge → annexe + justification.
4. **Clean-room feature flag non-négociable.** Tout nouveau code dans `src/v70/`. Ancien code intact. Bascule via `VITE_V70_ENABLED`. Section 2 détaille la mécanique. Aucun agent ne modifie cette mécanique.
5. **Critères DONE = check-list finale fermée.** Les 17 critères Section 4 sont la table de la loi. Pas un de plus, pas un de moins.

### 0.6 Scope strict du Mode avancé V70

| Périmètre | Décision | Phase |
|-----------|----------|-------|
| ✅ DataTables desktop (étendre `TableView` existant) | IN V70 | 7.2 |
| ✅ Export CSV (nouveau composant `<ExportButton>`) | IN V70 | 7.3 |
| ❌ Export PDF | **Reporté V71** (lib + maquettes templates) | — |
| ❌ Graphiques avancés (4-5 dashboards dédiés) | **Reporté V71** | — |

### 0.7 Stratégie clean-room feature flag (résumé)

- Variable env Vite : `VITE_V70_ENABLED=true|false` (défaut `false` jusqu'à la bascule J+14).
- Dossier parallèle : `src/v70/` (théme, composants, pages V70). `src/` legacy intact.
- Routage conditionnel dans `App.tsx` : si flag → tree V70, sinon → tree legacy.
- Bascule J+14 par changement env Hostinger (3 min).
- Rollback 60s : remettre flag à `false`, redéployer.
- Tests legacy maintenus min. **J+14+14 jours** (suppression tests legacy = sprint séparé V71).

Détail complet : Section 2.

---

## Section 1 — DNA visuel V70

### 1.1 Tokens CSS — liste blanche fermée

**Source** : `v70-mockup.html` lignes **11-40** (`:root`). À recopier **à l'identique** dans `src/v70/theme/v70-tokens.css` Phase 1.1.

| Token | Hex | Usage canonique |
|-------|-----|-----------------|
| `--primary` | `#2D4A1F` | Boutons primary, hero-icon, BottomNav active, page-eyebrow dot, section-label dot, tab actif |
| `--primary-deep` | `#1f3414` | Hover btn-primary |
| `--primary-light` | `#4a7a2f` | Réservé (pas d'usage actif dans mockup) |
| `--warm` | `#F5E9D8` | Background tabs-mini, edu-card gradient bottom, side-eyebrow bg, empty-edu gradient end |
| `--warm-deep` | `#E8D5B5` | pill-warm bg, card-hero gradient end |
| `--accent` | `#B8703D` | Italic global-title, term-tip-icon bg, edu-card border-left, side-eyebrow text, tl-step.active |
| `--accent-light` | `#D89968` | (réservé) |
| `--bg` | `#FAF7F0` | Background app principal, phone-content bg |
| `--bg-app` | `#F1ECE0` | Background gradient body, hover tab-btn |
| `--ink` | `#1a1a1a` | Texte principal, btn-secondary border |
| `--muted` | `#6b6357` | Sous-titres, list-arrow, page-subtitle, alert-meta |
| `--subtle` | `#a39888` | (réservé) |
| `--success` | `#4a7a2f` | pill-success darkened, ISSE hero stat-value |
| `--warning` | `#c08a3d` | alert-dot.warning |
| `--danger` | `#a4453d` | alert-dot.danger |
| `--info` | `#4a6e8a` | alert-dot.info |
| `--line` | `rgba(26,26,26,0.08)` | borders cards, list-item, section-label bottom |
| `--line-strong` | `rgba(26,26,26,0.16)` | timeline-track ligne, hover list-item border |
| `--truie-bg` / `--truie-fg` | `#F4D4D4` / `#8B4744` | EntityAvatar truie (cohérent V45) |
| `--verrat-bg` / `--verrat-fg` | `#C8D6E5` / `#3B5266` | EntityAvatar verrat |
| `--porcelet-bg` / `--porcelet-fg` | `#F5E9D8` / `#8B6E3D` | EntityAvatar porcelet |
| `--bande-bg` / `--bande-fg` | `#D4DFC8` / `#3D5C2C` | EntityAvatar bande |

**Règle stricte** : aucune couleur hardcodée dans les composants V70. Tout passe par `var(--token)`. Toute couleur hors-liste = remontée orchestrateur.

### 1.2 Typographie — 3 fonts

Charger via `<link>` dans `src/v70/theme/v70-tokens.css` (`@import url(...)`) ou `index.html` racine si flag actif :

```css
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;600&display=swap');
```

| Font | Poids | Usage canonique (mockup) |
|------|-------|--------------------------|
| **Big Shoulders Display** | 700, 900 | `.global-title`, `.page-title`, `.hero-title-text`, `.stat-value`, `.empty-edu-title`, `.side-title`, `.legend-num`, ISSE 32px hero |
| **Instrument Sans** | 400, 500, 600 | Texte courant, `.btn`, `.tab-btn`, `.list-sub`, `.alert-title`, `.imp-desc` |
| **JetBrains Mono** | 400, 600 | `.global-eyebrow`, `.page-eyebrow`, `.list-title` (codes T-001), `.tl-date`, kv-key |

**Différence vs design system V44/V45 actuel** : `BigShoulders` reste, `Instrument Sans` remplace `InstrumentSans` (chargement Google Fonts), `JetBrains Mono` remplace `DMMono`. **Ne PAS toucher** au design-system actuel sous `src/components/ds/` — c'est V70 qui charge ses propres fonts en parallèle.

### 1.3 Gabarit page strict

Toutes les pages V70 suivent **dans cet ordre** (mockup l. 994-1490) :

```
PageHeader (eyebrow + h1 + subtitle)
  → tabs-mini (sub-tabs si applicable, sous PageHeader)
    → card-hero (hero info clé, optionnel)
      → sections (.section + .section-label, répétables)
        → cards / list-items / stats-grid / timeline-v2 / edu-card / empty-edu
          → FAB (bouton flottant + bottom-right, optionnel)
            → BottomNav (5 items, en bas, sticky)
```

### 1.4 8 composants atomiques + 9ᵉ accepté

Référencer ces composants dans le code V70 (`src/v70/components/ds/`). **Ne pas les redéfinir** — copier les styles depuis le mockup, transposer en TSX.

| # | Composant | Mockup l. | Notes V70 |
|---|-----------|-----------|-----------|
| 1 | **PageHeader** (eyebrow + title + subtitle) | 238-277 | `<PageHeader eyebrow="..." title="..." subtitle="..." />`. Eyebrow inclut un dot avant text (`::before`). |
| 2 | **Section** + **section-label** | 280-302 | Container avec label uppercase + dot + bottom border. `<Section label="...">{children}</Section>`. |
| 3 | **Card** + **card-hero** + **hero-row** | 304-353 | `<Card>`, `<CardHero icon=... title=... sub=...>`. Hero a un `linear-gradient(135deg, white, var(--warm))`. |
| 4 | **Button variants** | 355-379 | `<Button variant="primary\|secondary\|accent\|ghost" size="default\|sm\|full">`. Border-radius 999px, uppercase, font-weight 600. |
| 5 | **Pill variants** | 381-402 | `<Pill variant="primary\|warm\|accent\|warning\|danger\|success\|info\|soft\|ghost">`. 9 variantes total. Padding 3px 10px, radius 999px. |
| 6 | **StatsGrid** + **Stat** | 404-436 | `<StatsGrid><Stat value="50" label="Truies"/></StatsGrid>`. Grid 4 colonnes par défaut, gap 8px, fond blanc. |
| 7 | **List-item** + **Avatar species** | 474-536 | `<ListItem avatar={...} title="..." sub="..." action={...}>`. Avatar = `EntityAvatar V45` (déjà livré, ré-exporté). |
| 8 | **Tabs-mini** | 538-564 | `<TabsMini value=... onChange=... options={[{value, label}]}>`. Pillules sur fond `--warm`. |
| 9 (accepté) | **CycleTimeline V2** | 566-648 | **Déjà livré V45** dans `src/design-system/components/index.tsx`. Réutilisé tel quel. Wrapper V70 = ré-export. |
| **Composants nouveaux V70** | — | — | — |
| 10 | **Term-tip** + **Edu-card** + **Empty-edu** | 650-887 | Couche éducative. **NEW V70**. Phase 6. |
| 11 | **ExportButton** | n/a (mockup) | **NEW V70**. Phase 7.3. Pas dans le mockup mais imposé par le scope Mode avancé. |
| 12 | **FAB** | 725-742 | Floating Action Button bottom-right + 16, 48×48px. Pas dans la liste 8 atomiques car déjà existant en legacy V44 — ré-implémentation V70 simple. |
| 13 | **BottomNav** | 189-235 | 5 items, sticky bottom, height ≈ 60px + safe-area. Mockup l. 1495-1516. **NEW V70** (le `Navigation.tsx` legacy a 6 items). |

**Règle composants** : si un agent identifie un 14ᵉ composant nécessaire → bloque + remonte à l'orchestrateur AVANT d'inventer.

---

## Section 2 — Stratégie clean-room feature flag

### 2.1 Architecture cible

```
src/
├── (legacy intact — V44/V45)
│   ├── components/
│   ├── features/
│   ├── App.tsx           (modifié : routage conditionnel V70/legacy)
│   └── ...
├── v70/                  (NEW — clean room)
│   ├── theme/
│   │   └── v70-tokens.css
│   ├── components/
│   │   └── ds/
│   │       ├── PageHeader.tsx
│   │       ├── Section.tsx
│   │       ├── Card.tsx
│   │       ├── CardHero.tsx
│   │       ├── Button.tsx
│   │       ├── Pill.tsx
│   │       ├── StatsGrid.tsx
│   │       ├── Stat.tsx
│   │       ├── ListItem.tsx
│   │       ├── TabsMini.tsx
│   │       ├── EntityAvatar.tsx     (ré-export src/components/ds/EntityAvatar.tsx)
│   │       ├── CycleTimeline.tsx    (ré-export src/design-system/components/index.tsx)
│   │       ├── TermTip.tsx          (NEW — Phase 6)
│   │       ├── EduCard.tsx          (NEW — Phase 6)
│   │       ├── EmptyEdu.tsx         (NEW — Phase 6)
│   │       ├── ExportButton.tsx     (NEW — Phase 7.3)
│   │       ├── FAB.tsx
│   │       └── BottomNav.tsx
│   ├── pages/
│   │   ├── TodayPage.tsx
│   │   ├── ElevagePage.tsx          (h1 = "Mes animaux")
│   │   ├── ReproductionPage.tsx
│   │   ├── PerformancePage.tsx
│   │   └── ReglagesPage.tsx
│   ├── context/
│   │   └── UIPreferencesContext.tsx (toggle Mode avancé — Phase 7.1)
│   └── routes/
│       └── V70Router.tsx
└── config/
    └── featureFlags.ts              (NEW — lit import.meta.env.VITE_V70_ENABLED)
```

### 2.2 `src/config/featureFlags.ts`

```typescript
export const featureFlags = {
  v70Enabled: import.meta.env.VITE_V70_ENABLED === 'true',
  modeAvanceEnabled: true,     // toggle utilisateur, lu via UIPreferencesContext
} as const;
```

### 2.3 Routage conditionnel dans `App.tsx`

Patch minimal (Phase 2) — laisser l'arbre legacy intact :

```tsx
import { featureFlags } from './config/featureFlags';
import { V70Router } from './v70/routes/V70Router';

function App() {
  if (featureFlags.v70Enabled) {
    return <V70Router />;
  }
  return <LegacyRouter />;  // l'arbre actuel <IonRouterOutlet> + Routes
}
```

### 2.4 Bascule J+14 (procédure 3 min)

1. Hostinger → variables env build → `VITE_V70_ENABLED=true`
2. Trigger redeploy (ou push trivial sur main → FTP-Deploy GH Action)
3. Vérification : `curl -s https://porctrack.tech/ | grep -E "Aujourd|Mes animaux"` doit matcher.
4. Smoke test 5 onglets sur mobile réel (Christophe).

### 2.5 Rollback 60s

1. Hostinger → `VITE_V70_ENABLED=false`
2. Trigger redeploy.
3. Vérification : `curl -s https://porctrack.tech/ | grep -E "TodayHub\|Pilotage"` doit matcher l'ancien.

### 2.6 Tests legacy

- Maintenus **inchangés** pendant V70.
- **Aucun test legacy ne doit être supprimé** Phase 1-7.
- Sprint dédié V71 : suppression tests legacy après stabilisation prod V70 (min. **14 jours** post-bascule).

---

## Section 3 — 8 phases de la task force

### Phase 0 — Audit & inventaire (séquentiel, 1h)

**Objectif** : confirmer l'état du repo + produire deux artefacts (audit pages legacy + matrice RLS).
**Mode** : séquentiel. **Bloquant pour la suite**.

#### 0.1 Vérifications état acquis

```bash
git tag --list | grep -E "v2\.[23]\.0"        # doit retourner v2.2.0 et v2.3.0
git log --oneline -1                            # HEAD = merge V45
npm run test:unit 2>&1 | grep "Tests "          # doit afficher 1699 passed
npx tsc --noEmit                                # doit être vide
npm run build 2>&1 | tail -1                    # doit afficher ✓ built
```

#### 0.2 Création branche

```bash
git checkout main
git pull origin main
git checkout -b migration/v70-vision-strategique
git tag pre-v70-rollback
git push origin pre-v70-rollback
```

#### 0.3 Sub-agent **AUDITOR**

**Brief** : produit `docs/v70/V70_AUDIT.md` listant **toutes** les routes legacy V44/V45 (matrice 46 routes V44 + livrables V45) avec mapping vers les 5 onglets V70 cibles + ligne mockup associée.

**Format requis** (table markdown) :
```
| Route legacy | Composant | Onglet V70 cible | Mockup ligne | Notes migration |
|--------------|-----------|------------------|--------------|------------------|
| /today       | TodayHub  | /today           | 994-1080     | Hero hardcoder priorité+alertes+stats+tournée |
| /troupeau    | TroupeauHub | /troupeau      | 1082-1176    | h1 = "Mes animaux", nav label = "Élevage" |
...
```

**Livraison** : `docs/v70/V70_AUDIT.md` (≥46 entrées). Bloc `=== VERIFICATION ===` strict.

#### 0.4 Sub-agent **RLS-AUDITOR** (critique — décision C)

**Brief** : produit `docs/v70/V70_RLS_MATRIX.md` (matrice **table × rôle × policy actuelle vs cible**).

**Tables Supabase à auditer** :
- `farms`, `users`, `farm_members`, `roles`
- `sows`, `boars`, `batches` (animaux)
- `cycles`, `mise_bas_events`, `saillies` (reproduction)
- `health_events`, `mortality_events` (santé)
- `feed_stocks`, `feed_plans`, `feed_consumption` (alimentation)
- `pharmacy_items`, `protocols` (santé/SOPs)
- `finances_marges` (sensible — owner-only)
- `audit_logs`, `tournees` (contrôle)
- toute table additionnelle découverte via `mcp__supabase__list_tables`

**Rôles** : `OWNER`, `ADMIN`, `PORCHER`, `VETO` (si présent), `LECTURE_SEULE` (si présent).

**Format matrice** :
```
| Table | Rôle | Policy actuelle | Policy cible V70 | Risque actuel |
|-------|------|------------------|---------------------|---------------|
| finances_marges | PORCHER | (aucune RLS — bloqué côté React) | DENY ALL | élevé : si bypass UI, fuite marge |
| sows           | PORCHER | SELECT * (RLS perm.)  | SELECT WHERE farm_id IN (membership) | moyen |
...
```

**Livraison** : `docs/v70/V70_RLS_MATRIX.md`. Bloc `=== VERIFICATION ===` strict.

#### 0.5 Validation Christophe (porte humaine bloquante)

L'orchestrateur :
1. Lit `V70_AUDIT.md` + `V70_RLS_MATRIX.md`.
2. Présente à Christophe avec questions précises : *"Approuves-tu cette migration de routes ?"*, *"Approuves-tu cette matrice RLS cible ?"*.
3. Attend OK explicite.
4. **Si NON-OK sur RLS** → Phase 5 reportée V71 + fallback `<ProtectedRoute>` documenté en dette.
5. **Si NON-OK sur AUDIT** → re-dispatch Phase 0.3 avec corrections.

---

### Phase 1 — Setup `src/v70/` + tokens + 8 composants atomiques (parallèle 3-4 agents, 3h)

**Objectif** : poser les fondations clean-room avant tout écran. Aucun écran dépend de Phase 1 — tout dépend de Phase 1.
**Mode** : parallèle (4 agents concurrents).

#### 1.1 Agent A — Tokens + theme

- Crée `src/v70/theme/v70-tokens.css` selon mockup l. 11-40 (recopier intégralement le bloc `:root`).
- Ajoute `@import` Google Fonts (l. 9 du mockup).
- Crée `src/v70/theme/v70-base.css` qui importe `v70-tokens.css` + `body` settings (l. 44-51).
- Test : un fichier témoin `src/v70/theme/__tests__/tokens.spec.ts` qui vérifie que les 22 tokens sont déclarés.

#### 1.2 Agent B — Composants atomiques 1-4 (PageHeader, Section, Card, Button)

Pour chacun : un fichier `.tsx` + un fichier `.test.tsx`. Style via classes liées aux selectors mockup (`.page-header`, `.section`, etc.) — créer `src/v70/components/ds/ds.css` qui transpose les règles CSS du mockup l. 238-379.

API précise :
```tsx
<PageHeader eyebrow="5 mai 2026 · Mardi" title="Aujourd'hui" subtitle="Bonjour Christophe — 3 priorités" />
<Section label="À traiter (3)">{children}</Section>
<Card>{children}</Card>
<CardHero icon="🐖" title="Mise-bas imminente" sub="T-018 · prévue demain" actionLabel="→ Voir T-018" onAction={...} />
<Button variant="primary" size="full" onClick={...}>→ Voir T-018</Button>
```

#### 1.3 Agent C — Composants atomiques 5-8 (Pill, StatsGrid+Stat, ListItem, TabsMini)

API :
```tsx
<Pill variant="warning">Action</Pill>
<StatsGrid>
  <Stat value="50" label="Truies" />
  <Stat value="3" label="Verrats" />
</StatsGrid>
<ListItem
  avatar={<EntityAvatar species="truie" size="md" />}
  title="T-001"
  sub="En attente saillie"
  pill={<Pill variant="warning">Vide</Pill>}
  arrow
/>
<TabsMini value={tab} onChange={setTab} options={[{value:'truies',label:'Truies'},{value:'verrats',label:'Verrats'}]} />
```

#### 1.4 Agent D — Migration EntityAvatar V45 + ré-exports + feature flag

- `src/v70/components/ds/EntityAvatar.tsx` : `export { EntityAvatar } from '../../../components/ds/EntityAvatar';` (ré-export simple — pas de fork code).
- `src/v70/components/ds/CycleTimeline.tsx` : ré-export depuis `src/design-system/components/index.tsx`.
- Crée `src/config/featureFlags.ts` (Section 2.2).
- Test : `src/config/__tests__/featureFlags.spec.ts` (3 cas : flag true, false, undefined → false).

#### 1.5 DoD Phase 1

- [ ] `src/v70/theme/v70-tokens.css` existe et déclare 22 tokens
- [ ] 8 composants atomiques + tests dans `src/v70/components/ds/`
- [ ] `featureFlags.ts` créé + tests
- [ ] `npx tsc --noEmit` OK
- [ ] `npm run test:unit` ≥1699 (+ tests Phase 1 ≈ +20 tests = ~1719 total)

---

### Phase 2 — BottomNav V70 + routage conditionnel (séquentiel, 1h)

**Objectif** : route conditionnelle prête, BottomNav 5 onglets fonctionnel.
**Mode** : séquentiel. Bloque Phase 3.

#### 2.1 BottomNav V70

`src/v70/components/ds/BottomNav.tsx` selon mockup l. 1495-1516 :

| Position | Icône (mockup) | Label nav (décision A) | Route |
|----------|---------------|------------------------|-------|
| 1 | `⌂` | `Aujourd'hui` | `/today` |
| 2 | `🐖` | `Élevage` | `/troupeau` |
| 3 | `❤` | `Repro` | `/reproduction` |
| 4 | `📊` | `Perf` | `/performance` |
| 5 | `⚙` | `Réglages` | `/reglages` |

Active state : icône carrée → cercle plein `--primary` (mockup l. 231-235).

#### 2.2 V70Router

`src/v70/routes/V70Router.tsx` :

```tsx
import { Switch, Route, Redirect } from 'react-router-dom';

export function V70Router() {
  return (
    <>
      <Switch>
        <Route exact path="/today" component={TodayPage} />
        <Route exact path="/troupeau" component={ElevagePage} />
        <Route exact path="/reproduction" component={ReproductionPage} />
        <Route exact path="/performance" component={PerformancePage} />
        <Route exact path="/reglages" component={ReglagesPage} />
        {/* redirects legacy → v70 (Phase 4) */}
        <Redirect from="/plus" to="/reglages" />
        <Redirect from="/outils" to="/today" />
        <Redirect from="/alertes" to="/today" />
        <Redirect from="/cycles/maternite" to="/reproduction?phase=maternite" />
        <Redirect from="/cycles/post-sevrage" to="/reproduction?phase=post-sevrage" />
        <Redirect from="/cycles/repro" to="/reproduction?phase=repro" />
        <Redirect from="/cycles/croissance" to="/reproduction?phase=croissance" />
        <Redirect from="/cycles/finition" to="/reproduction?phase=finition" />
        <Redirect from="/cycles/engraissement" to="/reproduction?phase=engraissement" />
        <Redirect from="/cycles/sortie" to="/reproduction?phase=sortie" />
        <Redirect from="/" to="/today" />
      </Switch>
      <BottomNav />
    </>
  );
}
```

#### 2.3 Patch `App.tsx`

Ne touche **rien** au router legacy. Ajoute uniquement le check de flag tout en haut du composant :

```tsx
import { featureFlags } from './config/featureFlags';
import { V70Router } from './v70/routes/V70Router';
// ...
function App() {
  return (
    <IonApp>
      {featureFlags.v70Enabled
        ? <V70Router />
        : <LegacyAppContent />}  {/* tout le tree existant déplacé ici */}
    </IonApp>
  );
}
```

#### 2.4 DoD Phase 2

- [ ] BottomNav 5 items affiché en bas de chaque page V70
- [ ] Route `/today` rend `TodayPage` placeholder (non-final, Phase 3 le rempli)
- [ ] Test : `cy.visit('/plus')` → redirect `/reglages` (test E2E ou unit avec MemoryRouter)
- [ ] `VITE_V70_ENABLED=true npm run dev` lance bien le tree V70 ; `=false` lance le legacy
- [ ] `npm run test:unit` ≥1729

---

### Phase 3 — 5 pages onglets (parallèle 5 agents, 4-6h)

**Objectif** : remplir les 5 placeholders de Phase 2 avec les pages pixel-perfect mockup.
**Mode** : parallèle (5 agents indépendants).

**Règle agent commune (toutes Phases 3A-3E)** :
- Lecture seule sur le repo legacy. **Aucune modification** de `src/components/`, `src/features/`, `src/services/`. Lecture autorisée pour comprendre la donnée.
- Source de données : réutilise les services existants (`alertEngine.ts`, `phaseEngine.ts`, `perfKpiAnalyzer.ts`, `supabaseService`, etc.). Importe-les depuis leur emplacement legacy. Ne **modifie pas** leur signature.
- Si une donnée manque dans les services → wrapper local `src/v70/lib/<feature>.ts` qui transforme la donnée existante. Ne touche pas au service.
- Référence visuelle : ligne mockup exacte. Tout écart de >10% pixel → STOP + ticket annexe C.

#### 3A — Today (mockup l. 994-1080)

**Agent dédié**. Page : `src/v70/pages/TodayPage.tsx`.

Structure cible :
```
PageHeader eyebrow="<date du jour>" title="Aujourd'hui" subtitle="Bonjour <user>, <N> priorités"

CardHero icon="<emoji selon priorité>" title="<priorité>" sub="<contexte>"
  → bouton primary full "→ Voir <id>"

Section label="À traiter (<N>)"
  Card
    AlertRow × N (alert-dot warning|info|danger + alert-info + Pill)
    cf. mockup l. 1017-1042

Section label="Mon élevage"
  StatsGrid
    Stat 50 Truies | 3 Verrats | 92 Porcelets | 6 Bandes

Section label="Tournée du jour"
  Card avec icône 📋, "Tournée terrain", "<N> points contrôle aujourd'hui",
  bouton primary full "▶ Démarrer la tournée" → naviguer /controle ou ouvrir component existant
```

**Décision B appliquée** : "Tournée du jour" est ici (pas dans Repro). La carte ouvre l'existant `ControleQuotidien.tsx` (component legacy V44) — naviguer vers `/controle` qui reste un alias temporaire ou injecter le component dans une modal V70.

**Données** :
- Priorité hero : règle = première alerte de sévérité maximale du jour (`alertEngine.ts` → `getCriticalAlerts(today).first()`).
- Alertes : top 3 du jour, hiérarchisées (danger > warning > info).
- Stats : `troupeauContext` ou query Supabase agrégée.
- Tournée : count points contrôle du jour (legacy `ControleQuotidien` → `getTodayCheckpoints().length`).

#### 3B — Élevage / Mes animaux (mockup l. 1082-1176)

**Agent dédié**. Page : `src/v70/pages/ElevagePage.tsx`.

**Décision A** : `<h1>Mes animaux</h1>` (mockup l. 1086) + nav label "Élevage" (Phase 2). PageHeader title = `"Mes animaux"` strictement.

Structure cible :
```
PageHeader eyebrow="Élevage · 145 animaux" title="Mes animaux" subtitle="Truies, verrats, porcelets, bandes, loges"

TabsMini value=cat onChange=setCat options=[truies, verrats, porcelets, bandes, loges]

Card padding=10px
  <input type="text" placeholder="🔍 Rechercher T-001..." />  (search persistant)

[Filter chips]
  Pill primary "Toutes (50)"  Pill ghost "Pleines (28)" "Maternité (11)" "Vides (6)"

section-label "<N> truies"

ListItem × N
  EntityAvatar species="truie" size="md"
  list-info: title (T-001 mono) + sub (statut)
  list-action: Pill statut + arrow

FAB +
```

**Données** : `troupeauContext.truies` filtré par `cat` + `searchTerm` + `filterChip`. Counters précalculés côté V70 via wrapper `src/v70/lib/elevage.ts`.

#### 3C — Repro (mockup l. 1178-1293)

**Agent dédié**. Page : `src/v70/pages/ReproductionPage.tsx`.

Structure cible :
```
PageHeader eyebrow="Cycle vivant" title="Reproduction" subtitle="Le cycle complet, en un seul écran"

TabsMini options=[agenda, en-cours, a-venir, historique] (4 sub-tabs — décision V70)

[KPIs Repro]
  StatsGrid  Stat 28 Pleines | 11 Materni. | 6 Vides | 3 MB 7j

[edu-card "💡 Le saviez-vous ?"]
  Texte sur cycle gestation 114j + écho J28 (mockup l. 1218)

Section label="Cycle bande mai 2026"
  CycleTimeline V2 (saillie / écho / gestation / mise-bas) — 4 steps, état dynamique selon phase

Section label="7 prochains jours"
  Card avec alert-row × N
    badge date (DEM, +2J, +5J) + alert-info + arrow
    cf. mockup l. 1255-1278

[empty-edu si aucun cycle en cours]
  📚 Comprendre les cycles
  bouton secondary sm "→ Encyclopédie" → /reglages/encyclopedie

FAB +
```

**Données** :
- KPIs : `phaseEngine.ts` → `countByPhase(...)`.
- Timeline : déterminer la bande active (la plus avancée non terminée), mapper sur 4 steps.
- 7 jours : `reproductionDashboard.getUpcomingEvents(7)` — fournit déjà la donnée (vérifié V44).
- Tooltip ISSE : voir Phase 6 (composant `<TermTip term="ISSE" />`).
- Sub-tabs Agenda/En cours/À venir/Historique : filtrent la liste/timeline. Phase initiale "Agenda" = vue mockup actuelle.

**Décision tabs** : 4 sub-tabs Agenda/En cours/À venir/Historique sont ceux du mockup. **Pas de cycles individuels** dans Repro V70 — les redirects /cycles/* (Phase 4) renvoient ici avec query param `?phase=...` qui pré-active le tab `historique` filtré sur la phase.

#### 3D — Performance (mockup l. 1295-1397)

**Agent dédié**. Page : `src/v70/pages/PerformancePage.tsx`.

Structure cible :
```
PageHeader eyebrow="Pilotage · Mai 2026" title="Performance" subtitle="Comment se porte ton élevage"

TabsMini options=[vue, kpis, finances, previsions] (4 sub-tabs)

[ISSE Hero]
  CardHero gradient
    hero-icon background var(--success) "📈"
    "ISSE moyen" + "Indice Sevré-Saillie" + <TermTip term="ISSE" />
    valeur 11.8 (BigShoulders 32px var(--success)) + "vs réf. 12.0"

[edu-card "💡 Qu'est-ce que l'ISSE ?"]
  Texte explicatif (mockup l. 1330-1334)

Section label="Indicateurs techniques"
  Card kv-row × 4
    Taux mise-bas / Nés vivants/portée / Mortalité allaitement / IEM moyen
    cf. mockup l. 1340-1356

Section label="Finances [Pill soft 'Owner']"
  Card → MASQUÉE si rôle != OWNER
    "Marge mensuelle" + valeur (BigShoulders 28px var(--primary)) + Pill success "+12% vs avril"
    boutons secondary sm "Détails" / "📥 PDF" (PDF désactivé V70 — voir 3D.5)

Section label="Top performances"
  ListItem × 2
    avatar bande (🏆 / 🥈) + "Bande de mars" + "ISSE 12.4 · marge +890€"
```

**3D.5 Bouton PDF** : présent visuellement (mockup l. 1372) MAIS **désactivé en V70** (décision périmètre Mode avancé). Affiché grisé avec tooltip *« Disponible prochainement »*. Phase 7 / V71 l'activera.

**Données** :
- ISSE : `perfKpiAnalyzer.getISSE(periode)`.
- KPIs techniques : `perfKpiAnalyzer.getTechnicalKPIs(periode)`.
- Finances : `pilotageContext.finances` (RLS ou ProtectedRoute selon Phase 5).
- Top bandes : `perfKpiAnalyzer.getTopPerformingBandes(2)`.

#### 3E — Réglages (mockup l. 1399-1490)

**Agent dédié**. Page : `src/v70/pages/ReglagesPage.tsx`.

Structure cible :
```
PageHeader eyebrow="Configuration" title="Réglages" subtitle="Profil, ferme, équipe, ressources"

[Profile card-hero]
  avatar avatar-lg fond var(--primary) blanc, initiale "C"
  hero-info: "Christophe" + "Owner · Ferme audit test"

Section label="Mode avancé"  ← DÉCISION D : toggle binaire pur
  Card
    [toggle off/on] <UIPreferencesContext.modeAvance>
    label: "Mode avancé"
    helper text: "Affiche les tableaux détaillés et active l'export CSV.
                  Les graphiques avancés et l'export PDF arrivent prochainement."

Section label="Configuration"
  ListItem × 4
    🏠 "Ma ferme" — "Identité, secteur, devise"
    👥 "Mon équipe" — "<N> utilisateurs · Owner+Porcher+Admin"
    🌾 "Ressources & stocks" — "Aliments, vétérinaire, fournisseurs"
    📋 "Protocoles santé" — "SOPs, vaccins, traitements"
  → chaque ListItem ouvre un détail (sous-page V70 ou modal — défer V71 si pas le temps)

Section label="Apprendre"
  ListItem accent gradient "📚 Encyclopédie porcine" — "<N> articles · cycles, santé, économie"
    → /reglages/encyclopedie (Phase 6.3)
  ListItem "🎓 Refaire le tutoriel" — "15 min · découverte de l'app"
    → relance OnboardingWizard legacy
```

**Décision D appliquée explicitement** : remplace le triplet "Essentiel / Standard / Expert" du mockup l. 1422-1425 par un **toggle on/off**. La phrase explicative l. 1427-1429 du mockup est remplacée par la phrase imposée.

**Important** : la Section "Mode avancé" est en haut, avant "Configuration", car c'est l'UX privilégiée de Christophe (« je veux pouvoir le trouver rapidement »).

#### 3.F DoD Phase 3

- [ ] 5 pages V70 affichent le contenu mockup pixel-perfect (écart < 10% capture vs mockup)
- [ ] Aucun appel à `src/components/legacy/...` modifiant le legacy (tous les services consommés tels quels)
- [ ] Tests par page : ≥3 tests rendering + interaction par page = ≥15 tests Phase 3
- [ ] `npm run test:unit` ≥1750 (1729 Phase 2 + ≈20 Phase 3 = 1749+)
- [ ] `npx tsc --noEmit` OK

---

### Phase 4 — Migrations redirects legacy (séquentiel, 30min)

**Objectif** : capturer 100% des routes legacy avec un redirect → V70.
**Mode** : séquentiel. Bloque smoke-test final.

#### 4.1 Liste exhaustive des redirects

À déclarer dans `V70Router.tsx` (Phase 2.2 a déjà posé les bases — ici on **complète + teste**).

| Route legacy | Redirect V70 | Justification |
|--------------|--------------|---------------|
| `/cycles/repro` | `/reproduction?phase=repro` | fusion 7→1 |
| `/cycles/maternite` | `/reproduction?phase=maternite` | fusion 7→1 |
| `/cycles/post-sevrage` | `/reproduction?phase=post-sevrage` | fusion 7→1 |
| `/cycles/croissance` | `/reproduction?phase=croissance` | fusion 7→1 |
| `/cycles/finition` | `/reproduction?phase=finition` | fusion 7→1 |
| `/cycles/engraissement` | `/reproduction?phase=engraissement` | fusion 7→1 |
| `/cycles/sortie` | `/reproduction?phase=sortie` | fusion 7→1 |
| `/cycles` (hub) | `/reproduction` | sans param → vue par défaut |
| `/plus` | `/reglages` | renaming "Plus" → "Réglages" |
| `/more` | `/reglages` | alias V44 (cf MIGRATION_V44_FINAL §3) |
| `/outils` | `/today` | suppression onglet Outils → carte alertes Today |
| `/alertes` | `/today` | suppression route → cartes alertes Today |
| `/audit` | `/today` | suppression — carte tournée Today |
| `/pilotage` | `/performance` | renaming hub |
| `/troupeau/*` (sub-routes) | `/troupeau` | onglet remplace les sub-routes |
| `/reproduction/lots` | `/reproduction?phase=repro` | fusion |
| `/ressources` | `/reglages` (section "Configuration → Ressources & stocks") | fusion sous Réglages |
| `/ressources/*` | `/reglages?section=ressources` | idem |
| `/fournisseurs` | `/reglages?section=fournisseurs` | fusion |
| `/protocoles` | `/reglages?section=protocoles` | fusion |
| `/aide` | `/reglages?section=aide` | fusion |
| `/sante` | `/troupeau?cat=truies&filter=sante` | accès via filtres animaux |
| `/admin` | reste tel quel (hors V70 cf MIGRATION_V44 §3 HORS) | non touché |
| `/design-system` | reste tel quel (showcase technique) | non touché |
| `/onboarding` | reste tel quel (wizard plein écran) | non touché |
| `/checklist/:name` | reste tel quel (wizard) | non touché |
| `/troupeau/truies/:id` etc. | reste tel quel (fiches détail V45 préservées) | non touché |
| `/troupeau/verrats/:id`, `/troupeau/loges/:id`, `/troupeau/bandes/:bandeId` | idem | préservées V45 |
| `/controle` | reste accessible (ouvert depuis carte Today) | décision B |

**Note importante** : V70 fusionne les **hubs** mais **préserve les fiches détail V45** intactes (TruieDetailView/VerratDetailView/BandeDetailView/LogeDetailView). Le BottomNav V70 + les listes V70 naviguent vers ces fiches existantes.

#### 4.2 Tests redirects

`src/v70/__tests__/redirects.spec.tsx` : pour chaque entrée du tableau 4.1, render le router avec `<MemoryRouter initialEntries={['/<legacy>']}>` et asserter que la route finale est celle attendue.

#### 4.3 DoD Phase 4

- [ ] 100% des routes legacy traitées (matrice 4.1 complète)
- [ ] Test redirects : 1 test par redirect ≈ 25 tests
- [ ] `npm run test:unit` ≥1775

---

### Phase 5 — RLS Supabase (séquentiel, 5-10h)

**Objectif** : sécuriser les données côté DB (pas seulement côté React).
**Mode** : séquentiel. **BLOQUÉE jusqu'à validation Christophe sur la matrice RLS-AUDITOR Phase 0.4** (décision C).

#### 5.1 Migration SQL

Pour chaque table de la matrice `V70_RLS_MATRIX.md` validée :

```sql
-- supabase/migrations/2026_05_19_v70_rls_<table>.sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table>_select_<role>" ON <table>
  FOR SELECT
  TO authenticated
  USING (
    -- selon matrice, ex pour PORCHER sur sows :
    farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid())
  );

CREATE POLICY "<table>_insert_<role>" ON <table>
  FOR INSERT
  TO authenticated
  WITH CHECK (...);

-- DENY ALL pour PORCHER sur finances_marges :
CREATE POLICY "finances_marges_deny_porcher" ON finances_marges
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.user_id = auth.uid()
        AND fm.farm_id = finances_marges.farm_id
        AND fm.role IN ('OWNER', 'ADMIN')
    )
  );
```

**Pattern strict** : 1 fichier de migration par table, naming `2026_05_19_v70_rls_<table>.sql`. Idempotent (`DROP POLICY IF EXISTS` avant `CREATE`).

#### 5.2 Tests automatisés sécu

`src/__tests__/rls.security.spec.ts` :

```typescript
describe('RLS V70', () => {
  it('PORCHER ne peut PAS query finances_marges', async () => {
    const supabasePorcher = createClient(URL, ANON_KEY, { auth: { storageKey: 'porcher' } });
    await supabasePorcher.auth.signInWithPassword({ email: 'porcher@test', password: '...' });
    const { data, error } = await supabasePorcher.from('finances_marges').select('*');
    expect(data).toEqual([]);  // RLS bloque → empty
    expect(error).toBeNull();   // pas d'erreur réseau, juste filtrage RLS
  });

  it('OWNER peut query finances_marges', async () => {
    const supabaseOwner = createClient(URL, ANON_KEY, { auth: { storageKey: 'owner' } });
    await supabaseOwner.auth.signInWithPassword({ email: 'owner@test', password: '...' });
    const { data } = await supabaseOwner.from('finances_marges').select('*');
    expect(data!.length).toBeGreaterThan(0);
  });

  // ... 1 test par couple (table sensible × rôle restreint)
});
```

#### 5.3 Audit sécu manuel

L'orchestrateur **bloque le merge** tant que Christophe n'a pas confirmé visuellement (via Supabase Studio) que :
- Les policies sont actives (`SELECT * FROM pg_policies WHERE tablename = 'finances_marges'` → ≥1 row).
- Un compte PORCHER de test ne voit pas les marges.
- Un compte OWNER voit tout.

#### 5.4 Fallback si Phase 5 échoue

Si la matrice RLS Phase 0.4 est rejetée OU si Phase 5 prend >10h :

1. Phase 5 reportée V71.
2. Garder le verrou React `<ProtectedRoute>` actuel + `<RoleGate role="OWNER">` autour de la Section "Finances" dans `PerformancePage.tsx`.
3. Documenter la dette dans `MIGRATION_V70_FINAL.md` § Risques résiduels :
   > « RLS Supabase non livrée V70 — verrou applicatif React seul. Risque : un utilisateur tech savvy peut bypass via call direct Supabase API. Sprint V71 dédié. »

#### 5.5 DoD Phase 5

- [ ] Matrice `V70_RLS_MATRIX.md` validée Christophe
- [ ] Migrations SQL `supabase/migrations/2026_05_19_v70_rls_*.sql` appliquées
- [ ] Tests sécu `rls.security.spec.ts` ≥10 tests
- [ ] Audit manuel Christophe OK
- [ ] **OU** dette documentée si Phase 5 reportée

---

### Phase 6 — Couche éducative (parallèle 2 agents, 3h)

**Objectif** : intégrer tooltips + encyclopédie + onboarding étendu.
**Mode** : parallèle (2 agents).

**Pré-requis** : `docs/v70/educational-content/` existe déjà (vérifié `ls`). Le contenu (tooltips JSON + articles MD) est rédigé en parallèle par un autre sub-agent — il sera dispo au dispatch. **Si absent**, Phase 6 démarre quand même avec contenu placeholder + ticket bloquant pour Christophe.

#### 6A — Agent 1 : Composants TermTip + EduCard + EmptyEdu

`src/v70/components/ds/TermTip.tsx` :

```tsx
import termsJson from '../../../docs/v70/educational-content/tooltips.json';

interface TermTipProps {
  term: string;          // ex: "ISSE"
  children?: ReactNode;  // texte autour (par défaut : term)
}

export function TermTip({ term, children }: TermTipProps) {
  const tip = termsJson[term];
  if (!tip) return <>{children ?? term}</>;
  return (
    <span className="term-tip" title={tip.short}>
      {children ?? term}
      <span className="term-tip-icon">?</span>
    </span>
  );
}
```

`tooltips.json` format attendu :
```json
{
  "ISSE": {
    "short": "Indice Sevré-Saillie : porcelets sevrés / truie / cycle",
    "long": "Référence métier : >12 = excellent, 10-12 = bon, <10 = à améliorer."
  },
  "saillie": { "short": "...", "long": "..." },
  ...
}
```

15 tooltips minimum imposés (mockup mentionne saillie, écho, gestation, ISSE, IEM, mise-bas, sevrage, retour chaleur, taux mise-bas, mortalité allaitement, nés vivants, marge, lot, bande, réforme).

`src/v70/components/ds/EduCard.tsx` (mockup l. 674-698) :

```tsx
<EduCard label="💡 Le saviez-vous ?">
  Le cycle de gestation d'une truie dure <strong>114 jours</strong>...
</EduCard>
```

`src/v70/components/ds/EmptyEdu.tsx` (mockup l. 859-887) :

```tsx
<EmptyEdu icon="📚" title="Comprendre les cycles" desc="Apprends comment optimiser tes saillies et ton ISSE..." actionLabel="→ Encyclopédie" onAction={...} />
```

#### 6B — Agent 2 : Page Encyclopédie + onboarding étendu

`src/v70/pages/EncyclopediaPage.tsx` route `/reglages/encyclopedie` :

```
PageHeader eyebrow="Apprendre" title="Encyclopédie porcine" subtitle="<N> articles"

Search bar (filtre titre + tags)

[Catégories — Pill ghost row]
  Cycles | Santé | Reproduction | Économie | Réglementation

ListItem × N (par catégorie)
  Avatar emoji + title + sub (résumé) + arrow
  → /reglages/encyclopedie/<slug> → render <EncyclopediaArticle slug={slug} />
```

`<EncyclopediaArticle slug="cycle-gestation" />` charge le `.md` depuis `docs/v70/educational-content/articles/<slug>.md` via `import.meta.glob` Vite.

5 articles minimum imposés : `cycle-gestation`, `comprendre-isse`, `mise-bas-protocole`, `economie-marge`, `reforme-decisions`.

Onboarding étendu : ajouter 5-8 étapes **éducatives** au wizard 12 actuel (`src/features/onboarding/OnboardingWizard.tsx`). Décision : **NE PAS modifier** le wizard legacy — créer un wrapper V70 `src/v70/pages/OnboardingV70.tsx` qui appelle le legacy puis ajoute les étapes éducatives à la fin (steps 13-20 : "Qu'est-ce que l'ISSE ?", "Comment lire une CycleTimeline ?", etc.). Si flag `v70Enabled=false`, le legacy reste seul.

#### 6.C DoD Phase 6

- [ ] `<TermTip term="ISSE" />` rend bien le texte + icône `?`
- [ ] `<EduCard>` + `<EmptyEdu>` rendent le visuel mockup
- [ ] `/reglages/encyclopedie` liste les articles
- [ ] `/reglages/encyclopedie/<slug>` rend l'article
- [ ] Tests : ≥10 tests Phase 6
- [ ] `npm run test:unit` ≥1785

---

### Phase 7 — Mode avancé (séquentiel, 4h)

**Objectif** : toggle binaire (décision D) + DataTable + ExportCSV.
**Mode** : séquentiel.

#### 7.1 Toggle dans Réglages → contexte

`src/v70/context/UIPreferencesContext.tsx` :

```tsx
interface UIPreferences {
  modeAvance: boolean;
  setModeAvance: (v: boolean) => void;
}
const Ctx = createContext<UIPreferences>(...);
export const useUIPreferences = () => useContext(Ctx);

export function UIPreferencesProvider({ children }) {
  const [modeAvance, setModeAvance] = useState(() => {
    return localStorage.getItem('v70_mode_avance') === 'true';
  });
  useEffect(() => {
    localStorage.setItem('v70_mode_avance', String(modeAvance));
  }, [modeAvance]);
  return <Ctx.Provider value={{ modeAvance, setModeAvance }}>{children}</Ctx.Provider>;
}
```

Le toggle est rendu dans `ReglagesPage.tsx` Section "Mode avancé" (Phase 3E).

#### 7.2 DataTable desktop (étendre TableView)

**Pas de fork** de `TableView.tsx` legacy. Créer `src/v70/components/ds/DataTable.tsx` qui reçoit `rows` + `columns` + tri/filtres. Quand `modeAvance === true` :

- `ElevagePage` affiche en plus une `<DataTable>` sous la liste (toggle vue Carte/Tableau).
- `PerformancePage` tab "KPIs" affiche les KPIs en table détaillée.

Si `modeAvance === false`, la DataTable n'est **pas rendue** (pas même en DOM) — c'est une optimisation et un signal UX clair.

#### 7.3 ExportCSV (`<ExportButton>`)

`src/v70/components/ds/ExportButton.tsx` :

```tsx
interface ExportButtonProps {
  rows: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; label: string }[];
}
export function ExportButton({ rows, filename, columns }: ExportButtonProps) {
  const handleClick = () => {
    const csv = generateCSV(rows, columns);
    downloadCSV(csv, filename);
  };
  return (
    <Button variant="secondary" size="sm" onClick={handleClick}>
      📥 Exporter CSV
    </Button>
  );
}
```

Utility `src/v70/lib/csv.ts` :

```typescript
export function generateCSV(rows, columns?) {
  const cols = columns ?? Object.keys(rows[0] ?? {}).map(k => ({ key: k, label: k }));
  const header = cols.map(c => c.label).join(',');
  const lines = rows.map(r => cols.map(c => escapeCsv(r[c.key])).join(','));
  return [header, ...lines].join('\n');
}
function escapeCsv(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```

`<ExportButton>` apparaît dans `ElevagePage`, `ReproductionPage`, `PerformancePage` **uniquement si `modeAvance === true`**.

#### 7.4 Phrase explicative

Dans `ReglagesPage.tsx`, sous le toggle, afficher exactement :

> *« Affiche les tableaux détaillés et active l'export CSV. Les graphiques avancés et l'export PDF arrivent prochainement. »*

(Cf décision D, intégral, sans modification.)

#### 7.5 Hors-scope V70

| Item | Statut V70 | Plan V71 |
|------|------------|----------|
| Export PDF | Bouton désactivé | Lib `pdf-lib` ou `jspdf` + maquettes templates |
| Charts avancés | Hors UI | 4-5 dashboards dédiés (`recharts` ou `apexcharts`) |

#### 7.6 DoD Phase 7

- [ ] Toggle Mode avancé fonctionnel + persisté localStorage
- [ ] DataTable affichée si toggle ON (sur ≥2 pages)
- [ ] ExportButton génère un CSV valide (test : parser de CSV vérifie)
- [ ] Phrase explicative présente intégrale
- [ ] Tests : ≥8 tests Phase 7
- [ ] `npm run test:unit` ≥1795

---

### Phase F — VALIDATOR (1h)

**Objectif** : preuve visuelle + DS compliance + tests verts + génération doc finale.
**Mode** : sub-agent dédié.

#### F.1 Sub-agent VALIDATOR

**Brief** :
1. `npm run dev` (background)
2. Set `VITE_V70_ENABLED=true` au build, ou configurer le dev server pour démarrer avec le flag.
3. Pour chacune des 5 pages onglets V70 (`/today`, `/troupeau`, `/reproduction`, `/performance`, `/reglages`) :
   - Capture screenshot via `chrome-devtools-mcp` ou `Playwright`.
   - Capture le mockup correspondant (la page rend dans `v70-mockup.html` via `data-tab`).
   - Compare visuellement (overlay diff).

#### F.2 Critère "écart"

Métrique : pourcentage de pixels divergents (en luminance + couleur dominante) sur la zone phone-content.

| Écart | Décision |
|-------|----------|
| < 5% | OK |
| 5-10% | OK avec note ticket annexe C |
| > 10% | **STOP — re-dispatch agent Phase 3 concerné** |

#### F.3 check-ds-compliance ≥ 14/15

`bash scripts/check-ds-compliance.sh` doit retourner ≥14/15 (objectif PDF V70 inchangé V44/V45).

#### F.4 Tests verts ≥1685 (≥V45 1699)

`npm run test:unit` doit retourner :
- Tests passed : ≥1795 (cumul Phase 1-7)
- Tests failed : 0
- Régression check : `grep -E "failed|FAIL"` = vide

#### F.5 Génère `MIGRATION_V70_FINAL.md`

Template Section 7. Le sub-agent VALIDATOR remplit les chiffres réels.

#### F.6 DoD Phase F

- [ ] 5 screenshots produits + 5 diffs vs mockup
- [ ] Tous diffs < 10%
- [ ] DS compliance ≥14/15
- [ ] Tests ≥1795 verts, 0 failed
- [ ] `MIGRATION_V70_FINAL.md` généré

---

## Section 4 — Critères DONE V70 (17 checks)

> **Réplique exacte des 17 critères du PDF V70 Section VI** — c'est la table de la loi.
> Le brief organise les phases pour atteindre **exactement ces 17 critères**. Pas un de plus, pas un de moins.

| # | Critère | Phase | Vérif |
|---|---------|-------|-------|
| 1 | 5 onglets BottomNav `Aujourd'hui / Élevage / Repro / Perf / Réglages` (label nav "Élevage" décision A) | 2 | screenshot bottom nav |
| 2 | h1 page `/troupeau` = "Mes animaux" (décision A) | 3B | grep `Mes animaux` dans `ElevagePage.tsx` |
| 3 | 7 routes `/cycles/*` redirigent vers `/reproduction?phase=...` | 4 | tests redirects |
| 4 | `/plus`, `/more`, `/outils`, `/alertes`, `/audit` redirigent | 4 | tests redirects |
| 5 | `/controle` accessible depuis Today (carte "Tournée du jour") (décision B) | 3A | clic sur carte → ouvre /controle |
| 6 | 8 composants atomiques DS V70 livrés (PageHeader, Section, Card, Button, Pill, StatsGrid, ListItem, TabsMini) | 1 | listing `src/v70/components/ds/` |
| 7 | EntityAvatar V45 ré-utilisé dans pages V70 (truie/verrat/porcelet/bande) | 1.4, 3B | grep `EntityAvatar` dans `src/v70/` |
| 8 | CycleTimeline V2 V45 ré-utilisé dans Reproduction | 3C | grep dans `ReproductionPage.tsx` |
| 9 | Couche éducative : ≥15 tooltips + ≥5 articles encyclopédie + onboarding étendu | 6 | listing `tooltips.json` + `articles/*.md` |
| 10 | Toggle Mode avancé binaire on/off avec phrase explicative imposée (décision D) | 7.1, 7.4 | screenshot Réglages |
| 11 | DataTable + ExportCSV actifs si Mode avancé ON | 7.2, 7.3 | tests interaction |
| 12 | RLS Supabase ou fallback documenté (décision C) | 5 | `V70_RLS_MATRIX.md` validé OU dette dans MIGRATION_V70_FINAL.md |
| 13 | Clean-room : 0 modification dans `src/components/ds/` legacy V44/V45 | toutes | `git diff src/components/ds/` = vide ou minimal (ré-export Phase 1.4 OK) |
| 14 | Feature flag `VITE_V70_ENABLED` fonctionnel (bascule `true`/`false` change le tree) | 1.4, 2 | test env var |
| 15 | DS compliance ≥14/15 verts | F.3 | `check-ds-compliance.sh` |
| 16 | Tests verts ≥1699 (≥ V45) | F.4 | `npm run test:unit` |
| 17 | `MIGRATION_V70_FINAL.md` généré | F.5 | `ls MIGRATION_V70_FINAL.md` |

---

## Section 5 — Procédure rollback détaillée

### Option A — Env var Hostinger (3 min)

1. Hostinger panel → variables env build → `VITE_V70_ENABLED=false`.
2. Trigger redeploy : action `Redeploy` ou push trivial sur main → FTP-Deploy GH Action.
3. Vérification rapide :
   ```bash
   curl -s https://porctrack.tech/ | head -200 | grep -E "today|troupeau|reglages"
   # doit matcher LegacyAppContent (TodayHub, /more, /outils visibles)
   ```
4. Si OK → notifier Christophe + ouvrir ticket post-mortem.
5. Si KO → escalader Option B.

### Option B — Git revert (radical)

1. Identifier le commit de merge V70 sur `main` :
   ```bash
   git log --oneline --merges -1
   # ex: abc1234 Merge V70 — vision stratégique 5 onglets
   ```
2. Revert :
   ```bash
   git checkout main
   git revert -m 1 <merge-commit-sha>
   git push origin main
   ```
3. Le push trigger FTP-Deploy → re-deploy de `v2.3.0` (V45).
4. Notifier Christophe + ouvrir ticket post-mortem.

### Option C — Tag `pre-v70-rollback` (radical²)

1. Tag créé J-1 (Phase 0.2).
2. Si Option A et B échouent :
   ```bash
   git checkout main
   git reset --hard pre-v70-rollback
   git push --force origin main   # ⚠️ requiert OK explicite Christophe
   ```

### Backup DB Supabase

Backup complet **J-1** du dispatch (= 2026-05-18) :
```bash
supabase db dump --db-url <PROD_URL> > backup_pre_v70_2026-05-18.sql
```

Stocker dans Hostinger storage privé + copie locale Christophe.

Si Phase 5 (RLS) introduit un bug → restore DB :
```bash
supabase db push --db-url <PROD_URL> backup_pre_v70_2026-05-18.sql
```

---

## Section 6 — Workflow GitHub Actions adapté V70

> Adaptation du workflow FTP-Deploy actuel pour intégrer vérifications post-deploy + canary FTP.

### `.github/workflows/deploy-v70.yml`

```yaml
name: Deploy V70 (FTP + canary)

on:
  push:
    branches: [main]
    tags: [v2.4.*]
  workflow_dispatch:
    inputs:
      v70_enabled:
        description: 'VITE_V70_ENABLED'
        required: true
        default: 'false'
        type: choice
        options: ['true', 'false']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: Type-check
        run: npx tsc --noEmit

      - name: Tests unitaires
        run: npm run test:unit

      - name: Build (avec flag V70)
        env:
          VITE_V70_ENABLED: ${{ github.event.inputs.v70_enabled || 'true' }}
        run: npm run build

      - name: Deploy FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.4
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./dist/
          server-dir: /
          dry-run: false

      - name: Vérif post-deploy curl (canary)
        run: |
          sleep 30
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://porctrack.tech/)
          if [ "$STATUS" != "200" ]; then
            echo "::error::Post-deploy HTTP $STATUS — rollback recommandé"
            exit 1
          fi

      - name: Vérif markers V70
        if: ${{ github.event.inputs.v70_enabled == 'true' }}
        run: |
          BODY=$(curl -s https://porctrack.tech/)
          echo "$BODY" | grep -q "Mes animaux\|Aujourd'hui\|Réglages" \
            || (echo "::error::Marker V70 absent" && exit 1)

      - name: Vérif markers legacy (si rollback)
        if: ${{ github.event.inputs.v70_enabled == 'false' }}
        run: |
          BODY=$(curl -s https://porctrack.tech/)
          echo "$BODY" | grep -q "TodayHub\|Pilotage\|/outils" \
            || (echo "::error::Rollback marker absent" && exit 1)
```

**Note** : si le workflow legacy `.github/workflows/deploy.yml` existe déjà, **ne PAS l'écraser**. Créer un workflow V70 séparé qui peut être trigger manuellement via `workflow_dispatch`.

---

## Section 7 — Documentation post-merge

### Template `MIGRATION_V70_FINAL.md` (généré Phase F.5)

```markdown
# MIGRATION V70 — RAPPORT FINAL

> **Refonte stratégique PorcTrack 8** : 5 onglets fusionnés, couche éducative, mode avancé, RLS Supabase.
>
> Branche : `migration/v70-vision-strategique`
> Base : `main` @ <sha> (V45 mergée, tag v2.3.0)
> Tête V70 : <sha>
> Tag prévu : `v2.4.0`

## 1. Synthèse exécutive

| Métrique | V45 (avant) | V70 (après) | Delta |
|----------|-------------|-------------|-------|
| Tests unitaires passing | 1699 / 1705 | <X> / <Y> | <delta> |
| Test Files passing | 137 / 137 | <X> / <Y> | <delta> |
| `npx tsc --noEmit` | OK | <OK\|FAIL> | — |
| `npm run build` | OK | <OK\|FAIL> | — |
| DS Compliance | 14/15 | <X>/15 | — |
| Routes legacy redirigées | 0 | <count> | +<count> |
| Composants atomiques V70 | 0 | 8+5 (atomiques + nouveaux) | +13 |
| Tooltips éducatifs | 0 | <count> | +<count> |
| Articles encyclopédie | 0 | <count> | +<count> |
| RLS policies | 0 | <count> ou "fallback documenté" | — |

## 2. Commits V70 (<count> commits sur la branche)

<git log --oneline migration/v70-vision-strategique ^main>

## 3. Couverture critères DONE (17 checks)

<table 17 critères avec ✅/⏳/❌>

## 4. Risques résolus / résiduels

### ✅ Résolus
<liste>

### ⚠️ Résiduels (acceptés / déférés V71)
<liste>

## 5. Validation finale

```
=== VALIDATION V70 ===

[1] Branche
$ git rev-parse --abbrev-ref HEAD
migration/v70-vision-strategique

[2] Commits sur la branche (vs main @ v2.3.0)
$ git log --oneline migration/v70-vision-strategique ^main | wc -l
<count>

[3] Type-check
$ npx tsc --noEmit
OK (output vide)

[4] Tests unitaires
$ npm run test:unit 2>&1 | tail -3
 Test Files  <X> passed (<X>)
      Tests  <Y> passed | <skipped> skipped (<total>)

[5] Build production
$ npm run build 2>&1 | tail -2
✓ built in <X>s

[6] DS Compliance
$ bash scripts/check-ds-compliance.sh
<X>/15 verts

[7] Feature flag
$ grep -c "VITE_V70_ENABLED" src/config/featureFlags.ts
1

[8] Bascule
$ VITE_V70_ENABLED=true npm run build && grep -c "Mes animaux" dist/assets/*.js
≥1
```

## 6. Procédure merge

```bash
git checkout migration/v70-vision-strategique
git pull
npm run test:unit  # >=1699 tests doivent passer
npm run build      # OK

git checkout main
git pull
git merge --no-ff migration/v70-vision-strategique -m "Merge V70 — vision stratégique 5 onglets"

git tag -a v2.4.0 -m "V70 — refonte 5 onglets + couche éducative + mode avancé + RLS"

# Push (déclenche FTP-Deploy automatique vers porctrack.tech)
git push origin main
git push origin v2.4.0
```

## 7. Procédure rollback (si bug critique)

cf docs/v70/V70_BRIEF_TECHNIQUE.md Section 5.

---

**Généré par l'orchestrateur V70 le 2026-05-19+, Phase F validator.**
```

---

## Annexe A — Composants nouveaux V70 (justification)

| Composant | Statut V70 | Justification | Phase |
|-----------|------------|---------------|-------|
| **PageHeader, Section, Card, Button, Pill, StatsGrid, ListItem, TabsMini** | NEW V70 (clean-room) | 8 atomiques imposés par mockup. Pas de fork des composants legacy : isolation clean-room. | 1.2-1.3 |
| **EntityAvatar** | Réutilisé V45 (ré-export) | Déjà livré V45 (`src/components/ds/EntityAvatar.tsx`, 148L, 17 tests). Ré-export pour usage V70. | 1.4 |
| **CycleTimeline V2** | Réutilisé V45 (ré-export) | Déjà livré V45 (`src/design-system/components/index.tsx`). Ré-export pour usage V70. | 1.4 |
| **TermTip** | NEW V70 | Couche éducative — tooltip métier inline. Pas d'équivalent legacy. | 6A |
| **EduCard** | NEW V70 | Carte "Le saviez-vous ?" avec gradient warm. Pas d'équivalent legacy. | 6A |
| **EmptyEdu** | NEW V70 | Empty state éducatif (mockup l. 859-887). Pas d'équivalent legacy. | 6A |
| **ExportButton** | NEW V70 | Mode avancé — export CSV. Pas dans le mockup mais imposé par scope (décision D + mode avancé). | 7.3 |
| **DataTable** | NEW V70 | Mode avancé — tableau desktop. Wrap `TableView` legacy ou réimplémentation simple. | 7.2 |
| **FAB** | NEW V70 | Bouton flottant + bottom-right. Visuel mockup l. 725-742. Existe vaguement en legacy (`PremiumUI`) mais pas pixel-aligné mockup. | 1.x ou intégré aux pages |
| **BottomNav** | NEW V70 | 5 items, pas 6 comme legacy. Décision A label hybride. | 2.1 |
| **UIPreferencesContext** | NEW V70 | Toggle Mode avancé. Pas dans mockup mais imposé décision D. | 7.1 |

**Total nouveaux composants V70** : 13 (8 atomiques + 5 spécifiques V70). Réutilisés V45 : 2.

---

## Annexe B — Risques & mitigations

> Réplique des 5 risques §VII PDF V70 + mitigations.

### Risque 1 — Régression visuelle vs mockup

- **Probabilité** : moyenne (5 pages en parallèle = risque divergence styles).
- **Impact** : élevé (refonte visible, perception qualité).
- **Mitigation** :
  - Tokens CSS centralisés (Phase 1.1) — toute couleur passe par var().
  - Sub-agent VALIDATOR Phase F qui compare screenshots vs mockup, bloque si écart >10%.
  - Mockup HTML accessible localement comme référence visuelle vivante.

### Risque 2 — Bug critique post-bascule J+14

- **Probabilité** : faible (clean-room limite blast radius).
- **Impact** : très élevé (utilisateurs prod impactés).
- **Mitigation** :
  - Rollback 60s via env var (Section 5 Option A).
  - Backup DB J-1.
  - Tag `pre-v70-rollback` pour rollback git radical.
  - Smoke test avant bascule sur device réel.

### Risque 3 — RLS Supabase mal configurée → fuite données sensibles

- **Probabilité** : moyenne (RLS = nouveau pour le projet).
- **Impact** : très élevé (fuite marges OWNER → PORCHER = perte de confiance).
- **Mitigation** :
  - Sub-agent RLS-AUDITOR Phase 0.4 produit matrice → validation Christophe.
  - Tests sécu automatisés Phase 5.2 (PORCHER ne peut PAS query finances_marges).
  - Audit manuel Christophe Phase 5.3 (Supabase Studio).
  - Fallback `<ProtectedRoute>` + `<RoleGate>` si RLS échoue (Phase 5.4).

### Risque 4 — Tests legacy cassés par modifications collatérales

- **Probabilité** : faible (clean-room = `src/v70/` isolé).
- **Impact** : moyen (régression V44/V45 acquis).
- **Mitigation** :
  - Règle stricte agents Phase 1-7 : aucune modification dans `src/components/`, `src/features/`, `src/services/` legacy.
  - Sub-agent VALIDATOR vérifie `git diff src/components/ds/` = vide ou ré-export uniquement.
  - Tests legacy maintenus inchangés Phase 1-7 + min. 14 jours post-bascule.

### Risque 5 — Couche éducative incomplète au dispatch

- **Probabilité** : moyenne (contenu rédigé en parallèle par autre sub-agent).
- **Impact** : moyen (Phase 6 dégradée).
- **Mitigation** :
  - Pré-requis Phase 6 : `docs/v70/educational-content/` doit contenir min. 15 tooltips + 5 articles au J+0.
  - Si contenu absent → Phase 6 démarre quand même avec placeholder + ticket bloquant Christophe.
  - Composants `<TermTip>` / `<EduCard>` gracefully fallback si terme manquant (rend le texte sans icône).

---

## Annexe C — Cas edge non couverts (questions ouvertes)

> Section vivante pendant la rédaction. À remplir par l'agent rédacteur si questions émergent.

### C.1 Statut de l'agent rédacteur (cette mission)

Pendant la rédaction de ce brief, **3 cas edge identifiés** :

#### C.1.1 — Ionic vs React-Router : `V70Router` doit-il rester dans `<IonReactRouter>` ?

**Question** : le routeur legacy utilise `<IonReactRouter>` + `<IonRouterOutlet>` (Ionic React). Le brief Section 2.3 propose un patch dans `App.tsx` qui remplace tout le tree par `<V70Router>` quand flag actif. Faut-il :

- **Option a** : `V70Router` enveloppe son propre `<IonReactRouter>` (séparation totale Ionic legacy / V70).
- **Option b** : `V70Router` utilise `<BrowserRouter>` standard + `<Switch>` react-router-dom (pas Ionic).
- **Option c** : `V70Router` réutilise `<IonRouterOutlet>` du parent (mais alors le legacy route tree ne peut pas coexister).

**Hypothèse de travail brief** : Option **b** (BrowserRouter standard, pas Ionic dans le tree V70 — cohérent avec l'esprit clean-room et avec le mockup qui n'utilise pas Ionic).

**À confirmer Christophe au J+0 dispatch.** Si Option a/c préférée, Phase 2.2-2.3 doit adapter le code.

#### C.1.2 — Quid des fiches détail V45 (TruieDetailView, etc.) ?

Le brief Section 4.1 dit : "V70 préserve les fiches détail V45 intactes". Mais ces fiches utilisent le DS legacy V44 (`PageHeader`, `Tabs`, `Section` de `src/design-system/`). Quand un utilisateur navigue depuis la liste V70 (`ElevagePage` → click sur T-001) vers `/troupeau/truies/T-001` :

- **Option a** : la fiche détail V45 s'affiche telle quelle (DS V44 mélangé visuellement avec BottomNav V70).
- **Option b** : créer des wrappers V70 des fiches détail (gros chantier non-compris dans le brief).

**Hypothèse de travail brief** : Option **a** assumée — les fiches détail V45 sont conservées telles quelles, le mélange visuel est temporaire (V71 ré-alignera les fiches sur le DS V70 si besoin).

**Risque** : utilisateur perçoit incohérence. **À assumer ou trancher J+0**. Annexe ticket V71 si besoin.

#### C.1.3 — Localisation `tooltips.json` et `articles/*.md`

Le brief Phase 6A référence :
- `docs/v70/educational-content/tooltips.json`
- `docs/v70/educational-content/articles/*.md`

`docs/` n'est pas habituellement servi par Vite en build. Deux options :

- **Option a** : déplacer `educational-content/` vers `src/v70/educational-content/` au moment de l'intégration Phase 6 (pour que Vite l'inline via `import.meta.glob`).
- **Option b** : copier `docs/v70/educational-content/` vers `public/educational-content/` au build (via script `npm run prebuild`).

**Hypothèse de travail brief** : Option **a** (déplacement vers `src/v70/educational-content/` au début de Phase 6A). Le sub-agent contenu éducatif livre directement à cet emplacement. **À confirmer J+0** que le sub-agent contenu suit cette consigne.

### C.2 Champ pour cas edge découverts par sub-agents Phase 0-7

Tout sub-agent dispatché Phase 0-7 qui identifie un cas edge :
- Note-le ici en pull-request sur ce brief (`docs/v70/V70_BRIEF_TECHNIQUE.md`).
- Bloque sa phase si le cas est bloquant.
- Continue avec hypothèse documentée si non-bloquant.

(Aucun cas additionnel à la rédaction — section reste ouverte pour itération J+0 → J+14.)

---

## Annexe D — Règles éditoriales contenu (V70 stable)

> Règles posées par Christophe le 2026-05-05 lors de la validation du draft V1 du contenu éducatif. À respecter pour toute future rédaction de tooltips/articles.

### Règle 1 — L'app est la source de vérité
Avant de figer un chiffre dans un tooltip ou article (durée, seuil, pourcentage), vérifier dans le code source :
- `src/lib/constants.ts` (ou équivalent — constantes biologiques)
- `src/services/alertEngine.ts` (seuils de déclenchement R1-R14)
- `src/types/farm.ts` (statuts, énumérations)

Si conflit irréductible entre code et source scientifique externe (ITP/IFIP) → **remontée à Christophe**, ne pas trancher seul.

Exemple V1 : Q1 gestation 114j (ITP) vs 115j (CLAUDE.md). Tranche Christophe : 115j gagne, contenu mentionne 114 ITP en note.

### Règle 2 — Distinguer cible métier vs alerte PorcTrack
Tout seuil chiffré dans un tooltip ou article DOIT distinguer deux notions :
- **Cible métier** : objectif zootechnique recommandé par ITP/IFIP/INRAE
- **Seuil d'alerte PorcTrack** : déclenchement automatique d'une règle R1-R14

Format type : "Cible : X. Alerte automatique : Y (règle Rn)."

Exemple V1 : Mortalité allaitement → "Cible ITP : <12%. PorcTrack déclenche une alerte si mortalité >15% (règle R4)."

### Règle 3 — Mention "PorcTrack" autorisée
Le contenu éducatif est intégré dans l'app PorcTrack. Les tooltips peuvent et doivent référencer "PorcTrack" quand c'est pertinent (alertes automatiques, calculs, paramétrage). Pas de neutralisation forcée.

### Règle 4 — Localisation Côte d'Ivoire prioritaire
Le contenu V70 cible Aïssata (éleveuse CI, 120 truies). Adaptations climat tropical, PPA Afrique de l'Ouest, programmes vaccinaux locaux à privilégier. Pas de "comme en France" sans justification.

### Règle 5 — Format strict
- **Tooltips** : 30-50 mots maximum, 1 référence métier minimum
- **Articles** : 200-500 mots, structure Introduction → Mécanisme → Repères pratiques → Bonnes pratiques
- **Frontmatter articles** : title, slug, category, level (débutant/intermédiaire/avancé), reading_time_min, sources

Si un article ne tient pas en 500 mots → remontée à Christophe.

### Règle 6 — Validation finale Christophe
Aucun contenu (tooltip ou article) ne va en prod sans validation explicite Christophe. Le sub-agent rédacteur livre des drafts dans `docs/v70/educational-content/`, Christophe valide en bloc avec annotations, V2 corrigée si besoin.

---

## Synthèse "lecture orchestrateur 2026-05-19"

L'orchestrateur frais qui ouvre ce brief le 2026-05-19 doit :

1. Lire **Section 0** : pré-requis, branche, décisions.
2. Vérifier les 7 checks 0.1 sur le repo.
3. Si OK → Phase 0 dispatch (séquentiel, 1 agent AUDITOR + 1 agent RLS-AUDITOR).
4. Récupère `V70_AUDIT.md` + `V70_RLS_MATRIX.md`, présente à Christophe.
5. **Attend OK Christophe sur audit + RLS**.
6. Phase 1 → 4 agents parallèles.
7. Phase 2 → séquentiel, ouvre Phase 3.
8. Phase 3 → 5 agents parallèles (1 par page).
9. Phase 4 → séquentiel.
10. Phase 5 → séquentiel **APRÈS validation matrice RLS**. Sinon fallback documenté.
11. Phase 6 → 2 agents parallèles.
12. Phase 7 → séquentiel.
13. Phase F → sub-agent VALIDATOR.
14. **Présente à Christophe** : 17 critères DONE check, screenshots vs mockup, MIGRATION_V70_FINAL.md.
15. Sur OK → merge main + tag v2.4.0 + push (FTP-Deploy auto avec flag toujours `false` pour ne pas basculer).
16. **J+14 (≈ 2026-06-02)** : Christophe bascule `VITE_V70_ENABLED=true` côté Hostinger.
17. **J+14+14 (≈ 2026-06-16)** minimum : si stable, sprint V71 supprime tests legacy + nettoie `src/components/legacy/...`.

---

**Brief généré par l'agent rédacteur le 2026-05-04. Pour dispatch 2026-05-19. Auteur : Claude Opus (1M context). Validé : Christophe (sur 5 règles + 4 décisions, 2026-05-04).**
