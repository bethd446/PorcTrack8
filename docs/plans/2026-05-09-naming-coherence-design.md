# Chantier Naming & Cohérence — design

> Type : spec design (pas encore plan d'implémentation). Le plan task-par-task suivra via `superpowers:writing-plans`.

**Goal :** Éliminer les UUID exposés à l'éleveur, refondre l'AlertEngine pour distinguer les truies à décider des truies à sortir, simplifier le langage métier pour des éleveurs avec niveau de français variable, aligner les écarts résiduels au brief V70 (H1 Élevage, breadcrumb sans onglet Outils). Cible : senior testeur manuel + éleveurs naisseurs-engraisseurs PWA.

**Contexte audit V74 (2026-05-09)** : sur le compte `audit-final@porctrack.test`, 8 frictions identifiées dont 2 P0 (UUID bandes affichés à l'utilisateur, dashboard pollué par 5 fausses suggestions de réforme), 6 P1/P2 (H1 hors-décision, filtre RÉFORMÉES manquant, bouton "Passer en réforme" actif sur truie déjà réformée, label tournée incohérent, breadcrumb "Outils" reliquat). Stack : Ionic 8 + React 18 + TS + Tailwind v4 + Supabase, V70 clean-room actif (`src/v70/`), AGENT_CONTRACT bloc `=== VERIFICATION ===` obligatoire.

**Tech Stack :** TypeScript strict · React 18 · Tailwind v4 + tokens `--pt-*` · Vitest · Playwright · ESLint custom rules.

---

## 1. Problèmes traités

| Code | Friction | Source | Gravité |
|---|---|---|---|
| **P0-1** | Les 5 priorités du dashboard pointent vers des truies déjà en réforme. Faux positifs quotidiens. | `src/v70/pages/TodayV70.tsx:71-79` | Bloquant UX |
| **P0-2** | Bandes affichées avec UUID tronqué ("Bande 21af315c…") sur Élevage, Repro timeline, Performance Top, et dans les réponses Marius. | `src/v70/pages/AnimalsV70.tsx:437`, `ReproV70.tsx:348`, propagé Performance + prompt Marius | Bloquant UX |
| **P1-1** | H1 page Élevage = "Mes animaux" — décision A du brief V70 dit "Élevage" (refus de l'infantilisation Expert). | `src/v70/pages/AnimalsV70.tsx:248` (et test ligne 28) | Sérieuse |
| **P1-2** | Filtres truies : 28+11+6=45 affichés sur 50 (les 5 réformées invisibles). Pas de pill dédiée. | `AnimalsV70.tsx` barre filtres | Sérieuse |
| **P1-5** | Bouton "Passer en réforme" reste actif sur truies déjà en statut réforme. | `TruieDetailView.tsx` actions | Sérieuse |
| **P1-6** | Breadcrumb audit terrain `Outils › Audit terrain` — l'onglet Outils a été supprimé du brief V70. | Page `/controle` breadcrumb | Sérieuse |
| **P2-3** | Marius : cliquer une suggestion remplit la textbox sans envoyer (pattern attendu = auto-send). | `src/features/chatbot/ChatbotWidget.tsx` | Polish |
| **P2-6** | Performance Top : ligne 1 affiche UUID, ligne 2 affiche T-016 (mère). Inconsistance d'affichage entre voisins immédiats. | `PerformanceV70.tsx` Top — fix par P0-2 | Polish (résolu en cascade) |

P1-3 (porcelets 92 affichés vs 4 lignes) et P1-4 (label "12 points" vs 3 questions audit) sont **hors scope** de ce chantier — ils touchent des modèles de données et la sémantique du module audit. À traiter dans un chantier ultérieur.

---

## 2. Architecture de la solution

### 2.1 Nouveau helper pivot : `src/v70/lib/formatBandeName.ts`

Source de vérité unique pour l'affichage du nom d'une bande à l'utilisateur final.

```ts
export type BandeForName = {
  id: string;
  idPortee?: string | null;
  truieMere?: string | null;       // displayId de la mère, ex: "T-031"
  miseBasDate?: string | null;     // ISO date YYYY-MM-DD
  saillieDate?: string | null;     // ISO date YYYY-MM-DD (fallback si pas de MB)
};

export type FormatBandeOptions = {
  compact?: boolean;  // sans truie mère, pour espaces étroits
};

export function formatBandeName(
  bande: BandeForName,
  options?: FormatBandeOptions,
): string;
```

**Règles d'affichage** (par ordre de priorité) :

1. **MB connue + mère** → `Bande Mai 2026 · T-031`
2. **MB connue, pas de mère** → `Bande Mai 2026`
3. **Pas de MB, saillie connue + mère** → `Bande T-031 · saillie 12/04`
4. **idPortee custom (ex import Excel)** → `Bande ${idPortee}` (priorité absolue si défini et non-UUID)
5. **Fallback** (rare) → `Bande ${id.slice(0, 8)}` *avec* suffixe `…` (visiblement temporaire pour debug, jamais en prod normale)

Mois en français long (`Janvier`, `Février`…) via `Intl.DateTimeFormat('fr', { month: 'long', year: 'numeric' })` capitalisé.

`compact: true` → omet `· T-031` quand utilisé dans des cards étroites (Performance Top, Repro timeline).

### 2.2 Refonte AlertEngine — `src/v70/pages/TodayV70.tsx`

Le bloc `truies.filter(...).forEach(...)` actuel (lignes 71-79) est éclaté en deux générateurs distincts.

```ts
// Truies à décider (statut ≠ réforme + critères métier)
truies
  .filter(t => !isReformed(t) && needsReformConsideration(t))
  .forEach(t => alerts.push({
    id: `reform-suggest-${t.id}`,
    variant: 'warning',
    tag: 'Bientôt',
    title: `À sortir bientôt — ${t.displayId}`,
    meta: reformReason(t),  // texte dynamique selon critère qui a déclenché
    to: `/troupeau/truies/${t.id}`,
  }));

// Truies déjà réformées (à sortir physiquement)
truies
  .filter(t => isReformed(t) && !alreadySortedOut(t))
  .forEach(t => alerts.push({
    id: `reform-action-${t.id}`,
    variant: 'warning',
    tag: 'Cette semaine',
    title: `À vendre — ${t.displayId}`,
    meta: 'Marquer comme vendue ou abattue depuis sa fiche',
    to: `/troupeau/truies/${t.id}`,
  }));
```

**Critères de réforme suggérée — MVP (validé)** :
- `parité ≥ 6` (truie âgée, productivité décroissante naturelle)
- **OU** (`portées_total === 0` ET `âge_mois ≥ 12`) (truie improductive)

`reformReason(t)` retourne en clair :
- parité ≥ 6 → `"Truie âgée — 6 portées ou plus"`
- 0 portée + ≥ 12 mois → `"Trop âgée ou pas assez de portées"`

**`isReformed(t)`** : `/réforme|reforme/i.test(t.statut ?? '')` (régex existante, déplacée dans helper).
**`alreadySortedOut(t)`** : `t.statut === 'sortie'` ou `t.dateSortie != null` — à confirmer en lisant le modèle truie. Si pas de champ "sortie" en DB aujourd'hui, on garde l'alerte affichée (l'éleveur l'acquitte manuellement) jusqu'à introduction du champ dans un sprint ultérieur.

Helpers extraits dans `src/v70/lib/reformLogic.ts` (testables isolément).

### 2.3 H1 page Élevage

`AnimalsV70.tsx:248` : `title="Mes animaux"` → `title="Élevage"`.
`AnimalsV70.tsx:8` (commentaire) à aligner.
Test `src/v70/pages/__tests__/AnimalsV70.test.tsx:28` : `getByRole('heading', { name: /élevage/i })`.

### 2.4 Filtre RÉFORMÉES (renommé "À VENDRE")

Dans `AnimalsV70.tsx`, ajout d'une pill dans la barre de filtres truies. Variant `ghost` (sobre, pas alarmiste). Compteur dynamique sur `truies.filter(isReformed).length`.

Ordre des pills : `TOUTES` · `PLEINES` · `MATERNITÉ` · `VIDES` · `À VENDRE`.

### 2.5 Bouton fiche truie

`TruieDetailView.tsx` actions :
- Si `!isReformed(t)` → `Sortir cette truie` (texte simplifié, ex-"Passer en réforme")
- Si `isReformed(t)` && `!alreadySortedOut(t)` → `Marquer comme vendue` (ouvre dialog : type sortie [vente / abattoir / mortalité], date)
- Si `alreadySortedOut(t)` → bouton désactivé `Sortie enregistrée le ${date}` (info read-only)

Le dialog "Marquer comme vendue" est out-of-scope ce chantier si la donnée DB n'est pas prête — fallback v1 : bouton désactivé avec tooltip "Disponible bientôt — utilise pour l'instant la vue Sortie cheptel". Décision DB à valider au début de l'implémentation.

### 2.6 Breadcrumb audit terrain

Page `/controle` (composant à localiser) : breadcrumb actuel `Outils › Audit terrain` → `Aujourd'hui › Audit terrain` (cohérent avec décision B brief : `/controle` rattaché à l'onglet Aujourd'hui).

### 2.7 Marius — auto-send sur clic suggestion

`src/features/chatbot/ChatbotWidget.tsx` : handler de clic sur les boutons suggestion. Aujourd'hui = remplit `<textarea>` puis attend clic Envoyer. Cible = remplit ET déclenche immédiatement la soumission (équivalent `form.requestSubmit()`).

### 2.8 Marius — contexte ferme avec noms de bandes

Le prompt context envoyé à `https://api.porctrack.tech/chat` doit citer les noms via `formatBandeName()` — pas les UUID. Si le contexte n'est pas encore composé côté front (RAG niveau B mémoire), on ajoute *a minima* le mapping `bandeId → bandeName` dans le préambule système.

### 2.9 Grille de simplification du langage

| Avant (jargon ou trop technique) | Après (clair pour tous) |
|---|---|
| `Réforme suggérée — T-018` | `À sortir bientôt — T-018` |
| `À sortir du cheptel — T-046` | `À vendre — T-046` |
| Tag `À décider` | `Bientôt` |
| Tag `À planifier` | `Cette semaine` |
| Pill `RÉFORMÉES (5)` | `À VENDRE (5)` |
| Bouton `PASSER EN RÉFORME` | `Sortir cette truie` |
| Bouton (déjà réformée) `À SORTIR DU CHEPTEL` | `Marquer comme vendue` |
| Meta alerte `Productivité insuffisante · voir fiche` | `Trop âgée ou pas assez de portées` |
| `Cheptel` (texte courant) | `Élevage` ou `ferme` selon contexte |

**Termes métier conservés** (connus de tout éleveur même francophone de base) : truie, verrat, porcelet, saillie, mise-bas, sevrage, gestation, allaitement, bande, loge, portée, parité.

**Termes savants gardés mais accompagnés** (Tooltip ou eyebrow explicatif obligatoire à la première occurrence) : ISSE, IEM, GMQ, IC.

---

## 3. Découpage en commits

3 commits successifs sur `main`, dans l'esprit V72-V74 (commit-par-vague pour traçabilité bisect du senior testeur).

### Commit 1 — `feat(v75-a): helper formatBandeName + propagation`

- Création `src/v70/lib/formatBandeName.ts`
- Création `src/v70/lib/__tests__/formatBandeName.test.ts` (5+ cas)
- Propagation : `AnimalsV70.tsx:437`, `ReproV70.tsx:348`, `PerformanceV70.tsx` (Top 1/2), prompt context Marius (`ChatbotWidget.tsx` ou compositeur de contexte)
- Test e2e Playwright : "audit-final voit Bande Mai 2026 · T-001 sur Élevage > Bandes"

### Commit 2 — `feat(v75-b): refonte AlertEngine + filtre À vendre + actions fiche truie`

- Création `src/v70/lib/reformLogic.ts` (`isReformed`, `needsReformConsideration`, `alreadySortedOut`, `reformReason`)
- Tests unitaires `reformLogic.test.ts`
- Refonte `TodayV70.tsx:71-79`
- Pill `À VENDRE (n)` dans `AnimalsV70.tsx`
- Boutons conditionnels `TruieDetailView.tsx` (avec fallback désactivé si dialog vente non prêt)

### Commit 3 — `feat(v75-c): H1 Élevage + breadcrumb + langage simplifié + Marius auto-send`

- `AnimalsV70.tsx:248` H1 → "Élevage"
- Test `AnimalsV70.test.tsx:28` mis à jour
- Breadcrumb page `/controle` → `Aujourd'hui › Audit terrain`
- Application grille de simplification (tags, libellés alertes, meta)
- Marius `ChatbotWidget.tsx` : auto-submit sur clic suggestion

---

## 4. Plan de tests

### 4.1 Unit (Vitest) — cible 1898 → ≥ 1909 (+11 nouveaux)

- `formatBandeName.test.ts` : 5 cas (MB+mère, MB seul, saillie+mère, idPortee custom, fallback)
- `reformLogic.test.ts` : 6 cas (isReformed positif/négatif, needsReform parité, needsReform 0-portée, alreadySortedOut, reformReason texte par critère)
- Adaptation `AnimalsV70.test.tsx` (H1) — modification d'existant, pas un nouveau test

### 4.2 E2E (Playwright)

- `bande-naming.spec.ts` : naviguer Élevage > Bandes, vérifier `text=Bande Mai 2026 · T-` présent, **absent** : `text=21af`, `text=56284`
- `reform-alerts.spec.ts` : sur Aujourd'hui, vérifier 0 alerte "Réforme suggérée" pour truies T-046..T-050 (déjà réformées) ; vérifier alertes `À vendre — T-046..T-050` présentes ; cliquer sur l'une, voir fiche détail avec bouton `Marquer comme vendue`
- `vendre-filter.spec.ts` : sur Élevage > Truies, cliquer pill `À VENDRE`, vérifier 5 lignes affichées (T-046..T-050), aucune autre
- `controle-breadcrumb.spec.ts` : naviguer Aujourd'hui > Démarrer la tournée, vérifier breadcrumb `Aujourd'hui › Audit terrain`

### 4.3 AGENT_CONTRACT — bloc VERIFICATION par commit

Chaque commit termine par output réel :
```
=== VERIFICATION ===
1. wc -l <fichiers nouveaux/modifiés>
2. git diff --stat HEAD~1
3. npx tsc --noEmit          → 0 erreur
4. npm run test:unit         → ≥ 1909 passing (1898 + 11)
5. npm run build             → exit 0
6. git log --oneline -1      → hash + sujet
7. delta tests : avant 1898 → après ≥ 1909
8. régression check : pas de test passing avant qui échoue après
```

### 4.4 Smoke browser

Sur `localhost:5173` après chaque commit :
- Compte `audit-final@porctrack.test`
- 5 onglets BottomNav cliqués → 0 erreur console
- Aujourd'hui : 5 alertes visibles, toutes avec libellés simplifiés
- Élevage > Bandes : aucune ligne avec UUID
- Performance > Top : Top 1 et Top 2 avec format cohérent
- Marius : clic suggestion → submit immédiat

---

## 5. Critères "done"

- 3 commits poussés sur `main` (`v75-a`, `v75-b`, `v75-c`)
- ≥ 1909 tests Vitest passing
- 3 specs Playwright nouveaux verts
- 0 erreur console sur smoke browser 5 onglets compte audit
- 0 occurrence de `\b[0-9a-f]{8}\b` (UUID 8-char) visible à l'utilisateur dans tout l'écran captured (vérification grep DOM via Chrome DevTools MCP)
- Fiche truie T-046 : bouton `Marquer comme vendue` présent, ancien `PASSER EN RÉFORME` absent
- Marius : clic sur "Que dois-je faire aujourd'hui en priorité ?" → réponse arrivée sans clic Envoyer
- Marius : aucune occurrence d'UUID dans la réponse texte sur cas de test connus

---

## 6. Hors-scope (à traiter ultérieurement)

- **P1-3** Listing porcelets 92 vs 4 lignes : nécessite décision UX sur représentation par bande vs vrac individuel + modèle data clarifié. Chantier dédié.
- **P1-4** Audit "12 points" vs 3 questions : étendre l'audit à 12 questions réelles est un chantier rédactionnel et data, pas naming.
- **P2-1/P2-2** Polish KPIs Repro (`MATERNI.` tronqué, timeline gestation/MB doublon) : à grouper dans un futur chantier "Polish KPI/Timeline".
- **P2-5** Roadmap visible utilisateur dans Réglages (`graphiques avancés … prochainement`) : décision produit séparée.
- Suivi dialog "Marquer comme vendue" complet (3 types sortie + date + raison) : si DB pas prête, livrer fallback désactivé en commit 2 et créer chantier dédié dialog/persistence.

---

## 7. Risques

- **Modèle truie côté DB** peut ne pas avoir de champ `dateSortie` ou enum `statut` distinct entre "réforme" et "sortie effective" → vérifier `mcp__supabase__list_tables` au démarrage du commit 2. Fallback prévu : mode dégradé sans `alreadySortedOut`.
- **Marius prompt context** : si la composition de prompt est server-side (sur le VPS llama-server), il faudra un patch system-prompt distinct, hors front. Si tel est le cas, le sous-livrable Marius des commits 1+3 se réduit à : (a) auto-submit, (b) issue trackée pour patch VPS séparé.
- **Acquittement persisté** des alertes : `useState<Set<string>>(new Set())` actuel = perdu au reload. Ce chantier ne touche **pas** ce comportement. Si l'éleveur acquitte 5 alertes "À vendre" et reload, elles reviennent. À noter pour testeur senior, à fixer dans un chantier "Persistance acquittements".
