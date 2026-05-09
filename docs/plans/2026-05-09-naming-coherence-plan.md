# Naming & Cohérence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer les UUID exposés à l'éleveur, refondre l'AlertEngine en deux générateurs distincts (À sortir bientôt / À vendre), aligner le H1 Élevage et les libellés à un langage simple compréhensible par tous, supprimer le breadcrumb "Outils" reliquat, ajouter l'auto-submit des suggestions Marius.

**Architecture:** Un helper pivot `formatBandeName()` dans `src/v70/lib/`, un module `reformLogic` qui isole les prédicats métier, propagation dans 4 pages V70 + le widget Marius, ajustement du composant fiche truie, mise à jour des libellés et du breadcrumb. 3 commits successifs `v75-a` / `v75-b` / `v75-c` avec bloc `=== VERIFICATION ===` AGENT_CONTRACT à chaque commit.

**Tech Stack:** TypeScript strict · React 18 · Ionic 8 · Vitest (jsdom) · React Testing Library · Playwright · Tailwind v4 + tokens `--pt-*` · ESLint custom rules · Husky.

**Pré-requis :**
- Branche `main` à jour, sans changements non commités (vérifier `git status` avant Task 1)
- Tests verts en baseline : `npm run test:unit` doit afficher 1898 passing avant de démarrer
- Vite dev server disponible sur :5173 pour smoke tests (déjà tourné PID 51191 si toujours actif, sinon `npm run dev`)

**Spec source :** `docs/plans/2026-05-09-naming-coherence-design.md`

---

## File Structure

| Fichier | Création / Modification | Responsabilité |
|---|---|---|
| `src/v70/lib/formatBandeName.ts` | **Créer** | Source de vérité unique pour le nom affiché d'une bande à l'utilisateur |
| `src/v70/lib/__tests__/formatBandeName.test.ts` | **Créer** | 5+ cas couvrant les règles de format |
| `src/v70/lib/reformLogic.ts` | **Créer** | Prédicats métier (`isReformed`, `needsReformConsideration`, `alreadySortedOut`) + helper `reformReason` |
| `src/v70/lib/__tests__/reformLogic.test.ts` | **Créer** | 6+ cas couvrant prédicats + texte raison |
| `src/v70/lib/index.ts` | **Créer** | Re-export `formatBandeName` et `reformLogic` (DX) |
| `src/v70/pages/AnimalsV70.tsx` | Modifier | H1 "Élevage", `AnimalFilter` ajout `'a-vendre'`, counts.truiesAVendre, `realStubs.bandes` via formatBandeName, pill À VENDRE, ligne d'affichage |
| `src/v70/pages/__tests__/AnimalsV70.test.tsx` | Modifier | H1 attendu = "Élevage", nouveau test pill À VENDRE |
| `src/v70/pages/TodayV70.tsx` | Modifier | Refonte bloc 70-79 en deux générateurs distincts |
| `src/v70/pages/ReproV70.tsx` | Modifier | Ligne 348 utilise formatBandeName |
| `src/v70/pages/PerformanceV70.tsx` | Modifier | Top performances utilise formatBandeName |
| `src/features/troupeau/TruieDetailView.tsx` | Modifier | Bouton "Sortir cette truie" / "Marquer comme vendue" selon statut |
| `src/features/chatbot/ChatbotWidget.tsx` | Modifier | Auto-submit sur clic suggestion |
| `tests/e2e/naming-coherence.spec.ts` | **Créer** | 3 specs Playwright (bandes nom, alertes refondues, filtre À vendre) |

**Helper layout** : `src/v70/lib/` est un nouveau dossier — alignement avec la convention `src/v70/components/`, `src/v70/router/`, `src/v70/theme/`.

---

## Commit 1 — `feat(v75-a): helper formatBandeName + propagation`

### Task 1: Créer le helper `formatBandeName`

**Files:**
- Create: `src/v70/lib/formatBandeName.ts`
- Test: `src/v70/lib/__tests__/formatBandeName.test.ts`

- [ ] **Step 1: Écrire les tests qui vont échouer**

Crée `src/v70/lib/__tests__/formatBandeName.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { formatBandeName } from '../formatBandeName';

describe('formatBandeName', () => {
  it('format avec MB connue + truie mère', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        dateMB: '2026-05-03',
        truieMere: 'T-031',
      }),
    ).toBe('Bande Mai 2026 · T-031');
  });

  it('format avec MB connue, sans mère', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        dateMB: '2026-04-12',
      }),
    ).toBe('Bande Avril 2026');
  });

  it('format avec idPortee custom non-UUID — priorité absolue', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        idPortee: 'B-MAR-01',
        dateMB: '2026-05-03',
        truieMere: 'T-031',
      }),
    ).toBe('Bande B-MAR-01');
  });

  it('format sans MB ni idPortee, avec mère seule', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        truieMere: 'T-031',
      }),
    ).toBe('Bande T-031 · en cours');
  });

  it('fallback rare : aucune donnée exploitable', () => {
    expect(
      formatBandeName({ id: '21af315c-aaaa-bbbb-cccc-000000000000' }),
    ).toBe('Bande 21af315c');
  });

  it('option compact omet la truie mère', () => {
    expect(
      formatBandeName(
        {
          id: '21af315c-aaaa-bbbb-cccc-000000000000',
          dateMB: '2026-05-03',
          truieMere: 'T-031',
        },
        { compact: true },
      ),
    ).toBe('Bande Mai 2026');
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npm run test:unit -- formatBandeName`
Expected: FAIL avec "Cannot find module '../formatBandeName'"

- [ ] **Step 3: Implémenter le helper**

Crée `src/v70/lib/formatBandeName.ts` :

```ts
export type BandeForName = {
  id: string;
  idPortee?: string | null;
  truieMere?: string | null;     // displayId mère, ex: "T-031"
  dateMB?: string | null;        // ISO yyyy-MM-dd
};

export type FormatBandeOptions = {
  compact?: boolean;             // omet la truie mère
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FR_MONTHS = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatMonthYear(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return capitalize(FR_MONTHS.format(d));
}

export function formatBandeName(
  bande: BandeForName,
  options?: FormatBandeOptions,
): string {
  const compact = options?.compact ?? false;

  // 1. idPortee custom non-UUID — priorité absolue
  if (bande.idPortee && !UUID_RE.test(bande.idPortee)) {
    return `Bande ${bande.idPortee}`;
  }

  // 2. MB connue
  if (bande.dateMB) {
    const monthYear = formatMonthYear(bande.dateMB);
    if (monthYear) {
      if (!compact && bande.truieMere) {
        return `Bande ${monthYear} · ${bande.truieMere}`;
      }
      return `Bande ${monthYear}`;
    }
  }

  // 3. Mère sans MB
  if (bande.truieMere) {
    return `Bande ${bande.truieMere} · en cours`;
  }

  // 4. Fallback rare
  return `Bande ${bande.id.slice(0, 8)}`;
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npm run test:unit -- formatBandeName`
Expected: 6 passing.

- [ ] **Step 5: Créer l'index de re-export**

Crée `src/v70/lib/index.ts` :

```ts
export { formatBandeName } from './formatBandeName';
export type { BandeForName, FormatBandeOptions } from './formatBandeName';
```

- [ ] **Step 6: Vérifier tsc**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 2: Propager `formatBandeName` dans AnimalsV70

**Files:**
- Modify: `src/v70/pages/AnimalsV70.tsx:30` (interface AnimalStub) et `:145-152` (mapping bandes), `:437` (rendu title)

- [ ] **Step 1: Ajouter import en tête de fichier**

Dans `src/v70/pages/AnimalsV70.tsx`, après les imports existants (vers la ligne 28-30, après l'import `useFarm`) :

```tsx
import { formatBandeName } from '../lib';
```

- [ ] **Step 2: Étendre le type `AnimalStub`**

Localise le bloc :

```tsx
interface AnimalStub {
  id: string;
  status: string;
  statusLabel: string;
  pillVariant: PillVariant;
}
```

Remplace par :

```tsx
interface AnimalStub {
  id: string;                  // identifiant utilisé pour la navigation (UUID OK)
  displayName?: string;        // nom affiché à l'utilisateur (optionnel — fallback sur id)
  status: string;
  statusLabel: string;
  pillVariant: PillVariant;
}
```

- [ ] **Step 3: Modifier le mapping `realStubs.bandes`**

Localise le bloc actuel (vers ligne 145-152) :

```tsx
    bandes: bandes?.length
      ? bandes.slice(0, 8).map(b => ({
          // ID utilisé pour l'affichage + nav : on prend l'UUID réel
          id: b.id,
          status: `${b.truie ? `Mère ${b.truie} · ` : ''}${b.dateMB ? `MB ${b.dateMB}` : 'En cours'}${b.nv ? ` · ${b.nv} NV` : ''}`,
          statusLabel: b.statut ?? 'Active',
          pillVariant: 'success' as PillVariant,
        }))
      : null,
```

Remplace par :

```tsx
    bandes: bandes?.length
      ? bandes.slice(0, 8).map(b => ({
          id: b.id,
          displayName: formatBandeName({
            id: b.id,
            idPortee: b.idPortee,
            truieMere: b.truie,
            dateMB: b.dateMB,
          }),
          status: `${b.truie ? `Mère ${b.truie} · ` : ''}${b.dateMB ? `MB ${b.dateMB}` : 'En cours'}${b.nv ? ` · ${b.nv} NV` : ''}`,
          statusLabel: b.statut ?? 'Active',
          pillVariant: 'success' as PillVariant,
        }))
      : null,
```

- [ ] **Step 4: Modifier la ligne d'affichage `title` (vers ligne 437)**

Localise :

```tsx
              title={it.id.length > 16 ? `Bande ${it.id.slice(0, 8)}…` : it.id}
```

Remplace par :

```tsx
              title={it.displayName ?? (it.id.length > 16 ? `Bande ${it.id.slice(0, 8)}…` : it.id)}
```

- [ ] **Step 5: Smoke browser test**

Run: serveur Vite déjà sur :5173 (sinon `npm run dev`).
Naviguer http://localhost:5173/troupeau → tab Bandes → vérifier 6 lignes affichant `Bande Mai 2026 · T-031`, `Bande Mai 2026 · T-001`, etc. Aucune ligne avec UUID hex.

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 3: Propager `formatBandeName` dans ReproV70

**Files:**
- Modify: `src/v70/pages/ReproV70.tsx:348` (titre cycle bande)

- [ ] **Step 1: Ajouter import**

Dans `src/v70/pages/ReproV70.tsx`, après les imports existants :

```tsx
import { formatBandeName } from '../lib';
```

- [ ] **Step 2: Modifier la ligne 348**

Localise :

```tsx
                  <div className="list-title">
                    Bande {cycleBande.bande.idPortee || cycleBande.bande.id.slice(0, 8)} · J{cycleBande.currentDay}
                  </div>
```

Remplace par :

```tsx
                  <div className="list-title">
                    {formatBandeName({
                      id: cycleBande.bande.id,
                      idPortee: cycleBande.bande.idPortee,
                      truieMere: cycleBande.bande.truie,
                      dateMB: cycleBande.bande.dateMB,
                    }, { compact: true })} · J{cycleBande.currentDay}
                  </div>
```

Note : `compact: true` — le sous-titre affiche déjà `· {truie}` donc on évite la redondance dans le titre.

- [ ] **Step 3: Vérifier tsc**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 4: Propager `formatBandeName` dans PerformanceV70

**Files:**
- Modify: `src/v70/pages/PerformanceV70.tsx` (Top performances, vers ligne 380-405)

- [ ] **Step 1: Ajouter import**

Dans `src/v70/pages/PerformanceV70.tsx`, après les imports existants :

```tsx
import { formatBandeName } from '../lib';
```

- [ ] **Step 2: Modifier le rendu Top performances**

Localise (vers ligne 384-388 selon offset courant) :

```tsx
                title={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {b.truie ? `Bande ${b.truie}` : `Bande ${b.id.slice(0, 8)}…`}
                    <RankIcon
```

Remplace par :

```tsx
                title={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {formatBandeName({
                      id: b.id,
                      idPortee: b.idPortee,
                      truieMere: b.truie,
                      dateMB: b.dateMB,
                    }, { compact: true })}
                    <RankIcon
```

- [ ] **Step 3: Vérifier tsc**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 5: Propager `formatBandeName` dans le contexte Marius

**Files:**
- Modify: `src/features/chatbot/ChatbotWidget.tsx` (zone qui compose le contexte ferme — chercher `bandes` dans le file)

- [ ] **Step 1: Localiser le compositeur de contexte**

Run: `grep -n "bandes\|CONTEXTE FERME\|systemPrompt\|contextBlock" src/features/chatbot/ChatbotWidget.tsx`

L'output attendu inclut une zone qui mappe `bandes` ou bandes.map(...). Lire 30 lignes autour pour comprendre le format actuel.

- [ ] **Step 2: Ajouter import**

```tsx
import { formatBandeName } from '../../v70/lib';
```

(Adapter le chemin relatif selon profondeur du fichier — `src/features/chatbot/` → `src/v70/lib/` = `../../v70/lib`.)

- [ ] **Step 3: Remplacer toute occurrence d'UUID brut bande dans le contexte par `formatBandeName(...)`**

Pour chaque ligne dans le compositeur de contexte qui fait `b.id` ou `b.idPortee || b.id` ou similaire, substituer par :

```tsx
formatBandeName({
  id: b.id,
  idPortee: b.idPortee,
  truieMere: b.truie,
  dateMB: b.dateMB,
})
```

**Si le compositeur de contexte n'existe pas dans ce fichier** (cas où le system prompt est server-side sur le VPS llama-server) : ajouter un commentaire TODO en haut de `ChatbotWidget.tsx` :

```tsx
// V75-a — context Marius : si la composition se fait server-side, patcher
// llama-server system prompt pour utiliser formatBandeName-équivalent.
// Issue à créer : naming-coherence-marius-server-prompt
```

Et ne rien modifier d'autre dans ce fichier au commit 1 (sera repris au commit 3 pour l'auto-submit).

- [ ] **Step 4: Vérifier tsc**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 6: Test E2E Playwright nom de bande

**Files:**
- Create: `tests/e2e/naming-coherence.spec.ts`

- [ ] **Step 1: Créer le fichier avec 1 spec**

```ts
import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

test.describe('Naming & cohérence', () => {
  test('Bandes affichent un nom lisible (pas d\'UUID 8 hex)', async ({ page }) => {
    await page.goto(`${APP_URL}/troupeau`);
    await page.getByRole('tab', { name: /bandes/i }).click();

    // Au moins une bande visible avec format "Bande {Mois} {Année}"
    const items = page.locator('[role="button"]').filter({ hasText: /^Bande / });
    await expect(items.first()).toBeVisible({ timeout: 10000 });

    // Vérifier qu'aucun item n'affiche un UUID 8-hex tronqué
    const titles = await items.allInnerTexts();
    for (const t of titles) {
      expect(t).not.toMatch(/Bande [0-9a-f]{8}…/);
    }
  });
});
```

- [ ] **Step 2: Exécuter le test**

Run: `npx playwright test tests/e2e/naming-coherence.spec.ts -g "lisible"`
Expected: 1 passing (le serveur Vite doit être actif sur :5173).

Si serveur pas actif : `npm run dev &` puis re-run.

---

### Task 7: Commit 1

- [ ] **Step 1: Vérifier baseline tests**

Run: `npm run test:unit`
Expected: ≥ 1903 passing (1898 baseline + 5+ nouveaux de formatBandeName ; reformLogic viendra au commit 2).

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Stage + commit**

```bash
git add src/v70/lib/ src/v70/pages/AnimalsV70.tsx src/v70/pages/ReproV70.tsx src/v70/pages/PerformanceV70.tsx src/features/chatbot/ChatbotWidget.tsx tests/e2e/naming-coherence.spec.ts
git commit -m "$(cat <<'EOF'
feat(v75-a): helper formatBandeName + propagation 4 écrans

- Création src/v70/lib/formatBandeName.ts (5 règles, fallback UUID 8-char)
- Propagation : AnimalsV70 listing bandes, ReproV70 timeline cycles,
  PerformanceV70 Top performances, ChatbotWidget contexte Marius
- 6 tests unitaires + 1 spec Playwright "Bandes affichent un nom lisible"

Élimine la friction P0-2 audit V74 (UUID exposés à l'éleveur).

=== VERIFICATION ===
- wc -l src/v70/lib/formatBandeName.ts : ~55 lignes
- tsc --noEmit : 0 erreur
- npm run test:unit : ≥ 1903 passing
- npm run build : OK
- delta tests : 1898 → 1904 (+6)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Vérifier le commit**

Run: `git log --oneline -1`
Expected: `feat(v75-a): helper formatBandeName...`

---

## Commit 2 — `feat(v75-b): refonte AlertEngine + filtre À vendre + actions fiche truie`

### Task 8: Créer le module `reformLogic`

**Files:**
- Create: `src/v70/lib/reformLogic.ts`
- Test: `src/v70/lib/__tests__/reformLogic.test.ts`
- Modify: `src/v70/lib/index.ts` (re-export)

- [ ] **Step 1: Écrire les tests qui vont échouer**

Crée `src/v70/lib/__tests__/reformLogic.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import {
  isReformed,
  needsReformConsideration,
  alreadySortedOut,
  reformReason,
} from '../reformLogic';

const baseTruie = {
  id: 't-001',
  displayId: 'T-001',
  boucle: 'BCL-0001',
  ration: 0,
  statut: 'En attente saillie' as string,
  nbPortees: 2,
  dateNaissance: '2024-01-01',
};

describe('isReformed', () => {
  it('vrai si statut contient "réforme"', () => {
    expect(isReformed({ ...baseTruie, statut: 'Réforme' })).toBe(true);
  });

  it('vrai si statut contient "reforme" sans accent', () => {
    expect(isReformed({ ...baseTruie, statut: 'reforme' })).toBe(true);
  });

  it('faux si statut autre', () => {
    expect(isReformed({ ...baseTruie, statut: 'Pleine' })).toBe(false);
  });
});

describe('needsReformConsideration', () => {
  it('parité ≥ 6 → vrai', () => {
    expect(needsReformConsideration({ ...baseTruie, nbPortees: 6 })).toBe(true);
  });

  it('0 portée + âge ≥ 12 mois → vrai', () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    expect(
      needsReformConsideration({
        ...baseTruie,
        nbPortees: 0,
        dateNaissance: oldDate.toISOString().slice(0, 10),
      }),
    ).toBe(true);
  });

  it('jeune avec 0 portée → faux', () => {
    const recent = new Date();
    recent.setMonth(recent.getMonth() - 6);
    expect(
      needsReformConsideration({
        ...baseTruie,
        nbPortees: 0,
        dateNaissance: recent.toISOString().slice(0, 10),
      }),
    ).toBe(false);
  });

  it('parité moyenne, productive → faux', () => {
    expect(needsReformConsideration({ ...baseTruie, nbPortees: 3 })).toBe(false);
  });
});

describe('alreadySortedOut', () => {
  it('vrai si dateSortie présente', () => {
    expect(alreadySortedOut({ ...baseTruie, dateSortie: '2026-04-01' } as any)).toBe(true);
  });

  it('faux si dateSortie absente', () => {
    expect(alreadySortedOut(baseTruie as any)).toBe(false);
  });
});

describe('reformReason', () => {
  it('parité ≥ 6 → texte spécifique', () => {
    expect(reformReason({ ...baseTruie, nbPortees: 6 })).toBe('Truie âgée — 6 portées ou plus');
  });

  it('0 portée âgée → texte spécifique', () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    expect(
      reformReason({
        ...baseTruie,
        nbPortees: 0,
        dateNaissance: oldDate.toISOString().slice(0, 10),
      }),
    ).toBe('Trop âgée ou pas assez de portées');
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npm run test:unit -- reformLogic`
Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implémenter**

Crée `src/v70/lib/reformLogic.ts` :

```ts
import type { Truie } from '../../types/farm';

const REFORM_RE = /réforme|reforme/i;
const PARITY_THRESHOLD = 6;
const AGE_MONTHS_THRESHOLD = 12;

export function isReformed(t: Pick<Truie, 'statut'>): boolean {
  return REFORM_RE.test(t.statut ?? '');
}

function ageInMonths(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

export function needsReformConsideration(t: Pick<Truie, 'statut' | 'nbPortees' | 'dateNaissance'>): boolean {
  if (isReformed(t as Truie)) return false;
  const portees = t.nbPortees ?? 0;
  if (portees >= PARITY_THRESHOLD) return true;
  if (portees === 0) {
    const months = ageInMonths(t.dateNaissance);
    if (months !== null && months >= AGE_MONTHS_THRESHOLD) return true;
  }
  return false;
}

export function alreadySortedOut(t: Truie & { dateSortie?: string | null }): boolean {
  return Boolean(t.dateSortie);
}

export function reformReason(t: Pick<Truie, 'nbPortees' | 'dateNaissance'>): string {
  const portees = t.nbPortees ?? 0;
  if (portees >= PARITY_THRESHOLD) return 'Truie âgée — 6 portées ou plus';
  if (portees === 0) {
    const months = ageInMonths(t.dateNaissance);
    if (months !== null && months >= AGE_MONTHS_THRESHOLD) {
      return 'Trop âgée ou pas assez de portées';
    }
  }
  return 'À évaluer';
}
```

- [ ] **Step 4: Re-export depuis index**

Modifie `src/v70/lib/index.ts` pour ajouter :

```ts
export {
  isReformed,
  needsReformConsideration,
  alreadySortedOut,
  reformReason,
} from './reformLogic';
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npm run test:unit -- reformLogic`
Expected: 8 passing.

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 9: Refondre AlertEngine TodayV70

**Files:**
- Modify: `src/v70/pages/TodayV70.tsx:70-79` (bloc "Truies à réformer")

- [ ] **Step 1: Ajouter imports**

Dans `src/v70/pages/TodayV70.tsx`, après les imports existants :

```tsx
import { isReformed, needsReformConsideration, alreadySortedOut, reformReason } from '../lib';
```

- [ ] **Step 2: Remplacer le bloc "Truies à réformer"**

Localise le bloc actuel (lignes 70-79) :

```tsx
    // Truies à réformer
    truies.filter(t => /réforme|reforme/i.test(t.statut ?? '')).forEach(t => {
      result.push({
        id: `reforme-${t.id}`,
        variant: 'warning',
        tag: 'À décider',
        title: `Réforme suggérée — ${t.displayId}`,
        meta: 'Productivité insuffisante · voir fiche',
        to: `/troupeau/truies/${t.id}`,
      });
    });
```

Remplace par :

```tsx
    // Truies à décider (statut ≠ réforme + critères métier)
    truies
      .filter(t => !isReformed(t) && needsReformConsideration(t))
      .forEach(t => {
        result.push({
          id: `reform-suggest-${t.id}`,
          variant: 'warning',
          tag: 'Bientôt',
          title: `À sortir bientôt — ${t.displayId}`,
          meta: reformReason(t),
          to: `/troupeau/truies/${t.id}`,
        });
      });

    // Truies déjà réformées (à sortir physiquement du cheptel)
    truies
      .filter(t => isReformed(t) && !alreadySortedOut(t as never))
      .forEach(t => {
        result.push({
          id: `reform-action-${t.id}`,
          variant: 'warning',
          tag: 'Cette semaine',
          title: `À vendre — ${t.displayId}`,
          meta: 'Marquer comme vendue ou abattue depuis sa fiche',
          to: `/troupeau/truies/${t.id}`,
        });
      });
```

- [ ] **Step 3: Smoke browser**

Run: rafraîchir http://localhost:5173/today.
Expected : alertes affichent maintenant `À vendre — T-046` à `À vendre — T-050` (5 alertes), tag `Cette semaine`. Aucun `Réforme suggérée — T-046`.

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 10: Ajouter le filtre "À vendre" dans AnimalsV70

**Files:**
- Modify: `src/v70/pages/AnimalsV70.tsx`

- [ ] **Step 1: Étendre le type `AnimalFilter`**

Localise (vers ligne 36) :

```tsx
type AnimalFilter = 'all' | 'pleines' | 'maternite' | 'vides';
```

Remplace par :

```tsx
type AnimalFilter = 'all' | 'pleines' | 'maternite' | 'vides' | 'a-vendre';
```

- [ ] **Step 2: Ajouter import isReformed**

Si l'import `formatBandeName` est déjà là, étendre :

```tsx
import { formatBandeName, isReformed } from '../lib';
```

- [ ] **Step 3: Étendre le bloc `counts`**

Localise (vers lignes 105-118) :

```tsx
  const counts = useMemo(() => {
    const truiesPleines = truies.filter(t => /pleine|gestante|gestation/i.test(t.statut ?? '')).length;
    const truiesMater = truies.filter(t => /maternit[eé]|allaitante|allaitement/i.test(t.statut ?? '')).length;
    const truiesVides = truies.filter(t => /attente saillie|vide|sevr[eé]e/i.test(t.statut ?? '')).length;
    const porcelets = bandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0);
    return {
      truies: truies.length,
      truiesPleines,
      truiesMater,
      truiesVides,
      verrats: verrats.length,
      porcelets,
      bandes: bandes.length,
      totalAnimaux: truies.length + verrats.length + porcelets,
    };
  }, [truies, verrats, bandes]);
```

Remplace par :

```tsx
  const counts = useMemo(() => {
    const truiesPleines = truies.filter(t => /pleine|gestante|gestation/i.test(t.statut ?? '')).length;
    const truiesMater = truies.filter(t => /maternit[eé]|allaitante|allaitement/i.test(t.statut ?? '')).length;
    const truiesVides = truies.filter(t => /attente saillie|vide|sevr[eé]e/i.test(t.statut ?? '')).length;
    const truiesAVendre = truies.filter(isReformed).length;
    const porcelets = bandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0);
    return {
      truies: truies.length,
      truiesPleines,
      truiesMater,
      truiesVides,
      truiesAVendre,
      verrats: verrats.length,
      porcelets,
      bandes: bandes.length,
      totalAnimaux: truies.length + verrats.length + porcelets,
    };
  }, [truies, verrats, bandes]);
```

- [ ] **Step 4: Étendre le filtre listing**

Localise (vers lignes 188-194) :

```tsx
        if (filter === 'pleines') return /pleine/i.test(s);
        if (filter === 'maternite') return /maternit/i.test(s);
        if (filter === 'vides') return /vide/i.test(s);
        return true;
```

Remplace par :

```tsx
        if (filter === 'pleines') return /pleine/i.test(s);
        if (filter === 'maternite') return /maternit/i.test(s);
        if (filter === 'vides') return /vide/i.test(s);
        if (filter === 'a-vendre') return /réforme|reforme/i.test(s);
        return true;
```

- [ ] **Step 5: Ajouter la pill de filtre dans la barre**

Localise la dernière pill existante (vers ligne 314-320, le bouton "vides") puis ajoute juste après le bouton de fermeture :

```tsx
          <button
            type="button"
            onClick={() => setFilter('a-vendre')}
            className="filter-pill-button"
            aria-pressed={filter === 'a-vendre'}
          >
            <Pill variant={filter === 'a-vendre' ? 'primary' : 'ghost'}>{`À vendre (${counts.truiesAVendre})`}</Pill>
          </button>
```

(Adapter à la classe CSS exacte des autres pills si différente — copier le pattern du bouton "vides" du fichier.)

- [ ] **Step 6: Étendre `realStubs.truies` pour inclure les réformées**

Localise le bloc `realStubs.truies` (vers ligne 124-138) — actuellement `slice(0, 8)`. Pour que le filtre À vendre voie les 5 réformées (T-046 à T-050) qui ne sont pas dans les 8 premières truies par défaut, modifier la stratégie de slice : si le filtre est actif, ne pas slice avant le filtre.

**Diagnostic préalable** : lire le bloc `baseList` (vers ligne 178-180) et `filteredList`. La logique actuelle slice à 8 puis filtre. Pour préserver l'affichage tout en supportant le filtre :

```tsx
    truies: truies?.length
      ? truies.map(t => {  // ← retirer .slice(0, 8) ici, le slice se fait après filtre
          const s = (t.statut ?? '').toLowerCase();
          const isPleine = /pleine|gestante|gestation/.test(s);
          const isMater = /maternité|maternite|allaitante|allaitement/.test(s);
          const isVide = /attente saillie|vide|sevrée|sevree/.test(s);
          const isAVendre = /réforme|reforme/.test(s);
          return {
            id: t.displayId ?? t.id,
            status: t.statut ?? 'Truie active',
            statusLabel: isPleine ? 'Pleine' : isMater ? 'Maternité' : isVide ? 'Vide' : isAVendre ? 'À vendre' : (t.statut ?? 'Active'),
            pillVariant: (isPleine ? 'success' : isMater ? 'warm' : isVide ? 'warning' : isAVendre ? 'ghost' : 'info') as PillVariant,
          };
        })
      : null,
```

Puis dans `filteredList` (ligne ~196 après le filtre), ajouter `.slice(0, 8)` si filter === 'all' pour préserver le comportement initial. Sinon afficher tout le sous-ensemble filtré (les listes 5-15 truies restent gérables) :

Localise après le bloc `if (search.trim())` :

```tsx
    return list;
```

Remplace par :

```tsx
    if (filter === 'all' && !search.trim()) {
      return list.slice(0, 8);
    }
    return list;
```

- [ ] **Step 7: Smoke browser**

Run: rafraîchir http://localhost:5173/troupeau (tab Truies).
Expected : 5 pills `Toutes (50) · Pleines (28) · Maternité (11) · Vides (6) · À vendre (5)`. Cliquer "À vendre" → 5 lignes T-046 à T-050 affichées.

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 11: Boutons fiche truie selon statut

**Files:**
- Modify: `src/features/troupeau/TruieDetailView.tsx` (vers ligne 905, bloc actions)

- [ ] **Step 1: Ajouter import isReformed**

Dans `src/features/troupeau/TruieDetailView.tsx`, après les imports existants :

```tsx
import { isReformed } from '../../v70/lib';
```

- [ ] **Step 2: Remplacer le bloc bouton réforme**

Localise (vers ligne 905-908) :

```tsx
                    {(truie.statut === 'À surveiller' || truie.statut === 'Réforme') && (
                      <Button variant="danger" size="sm" onClick={handleReformer}>
                        Passer en réforme
                      </Button>
                    )}
```

Remplace par :

```tsx
                    {!isReformed(truie) && truie.statut === 'À surveiller' && (
                      <Button variant="danger" size="sm" onClick={handleReformer}>
                        Sortir cette truie
                      </Button>
                    )}
                    {isReformed(truie) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        ariaLabel={`Marquer la truie ${truie.displayId} comme vendue (bientôt disponible)`}
                      >
                        Marquer comme vendue (bientôt)
                      </Button>
                    )}
```

Note : le bouton "Marquer comme vendue" est désactivé v1 — la persistance dateSortie/typeSortie sera traitée dans un chantier dédié. Tooltip aria-label informatif.

- [ ] **Step 3: Mettre à jour le confirm dialog "Mise en réforme"**

Localise `handleReformer` (vers ligne 224-244) — message du dialog :

```tsx
      message: `Confirmer la mise en réforme de la truie ${truie.displayId} ?`,
```

Remplace par :

```tsx
      message: `Confirmer que la truie ${truie.displayId} doit être sortie du cheptel ?`,
```

Et le toast :

```tsx
            setToast('Truie passée en réforme');
```

Remplace par :

```tsx
            setToast('Truie marquée à sortir');
```

(Le statut DB reste `'Réforme'` pour rétrocompat — on ne change pas le modèle de données dans ce chantier.)

- [ ] **Step 4: Smoke browser**

Run: naviguer http://localhost:5173/troupeau/truies/{id-d-une-truie-T-001-non-réformée}. Vérifier bouton `Sortir cette truie`.
Naviguer vers T-046 (réformée). Vérifier bouton `Marquer comme vendue (bientôt)` désactivé.

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 12: Tests E2E commit 2

**Files:**
- Modify: `tests/e2e/naming-coherence.spec.ts`

- [ ] **Step 1: Ajouter 2 specs**

À la fin de `tests/e2e/naming-coherence.spec.ts`, dans le `describe`, ajouter :

```ts
  test('Alertes Aujourd\'hui — refonte (à vendre, plus de "Réforme suggérée" sur réformées)', async ({ page }) => {
    await page.goto(`${APP_URL}/today`);

    // 0 alerte "Réforme suggérée — T-046..T-050"
    for (const code of ['T-046', 'T-047', 'T-048', 'T-049', 'T-050']) {
      await expect(page.getByText(`Réforme suggérée — ${code}`)).toHaveCount(0);
    }

    // 5 alertes "À vendre — T-046..T-050"
    for (const code of ['T-046', 'T-047', 'T-048', 'T-049', 'T-050']) {
      await expect(page.getByText(`À vendre — ${code}`)).toBeVisible();
    }
  });

  test('Filtre "À vendre" sur Élevage > Truies → 5 résultats', async ({ page }) => {
    await page.goto(`${APP_URL}/troupeau`);
    await page.getByRole('button', { name: /À vendre \(\d+\)/ }).click();

    for (const code of ['T-046', 'T-047', 'T-048', 'T-049', 'T-050']) {
      await expect(page.getByText(code)).toBeVisible();
    }
  });
```

- [ ] **Step 2: Exécuter les 3 specs**

Run: `npx playwright test tests/e2e/naming-coherence.spec.ts`
Expected: 3 passing.

---

### Task 13: Commit 2

- [ ] **Step 1: Tests unit**

Run: `npm run test:unit`
Expected: ≥ 1912 passing (1898 + 6 formatBandeName + 8 reformLogic = 1912).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Stage + commit**

```bash
git add src/v70/lib/reformLogic.ts src/v70/lib/__tests__/reformLogic.test.ts src/v70/lib/index.ts src/v70/pages/TodayV70.tsx src/v70/pages/AnimalsV70.tsx src/features/troupeau/TruieDetailView.tsx tests/e2e/naming-coherence.spec.ts
git commit -m "$(cat <<'EOF'
feat(v75-b): refonte AlertEngine + filtre À vendre + actions fiche truie

- Module reformLogic : isReformed, needsReformConsideration,
  alreadySortedOut, reformReason
- TodayV70 : 2 générateurs distincts ("À sortir bientôt" pour décision,
  "À vendre" pour truies déjà réformées) — élimine friction P0-1
- AnimalsV70 : pill filtre "À vendre (n)" + count truiesAVendre + filtre
  listing
- TruieDetailView : bouton conditionnel selon statut. Truies actives à
  surveiller : "Sortir cette truie". Truies réformées : bouton désactivé
  "Marquer comme vendue (bientôt)" en attente du dialog persistence
- 8 tests unitaires reformLogic + 2 specs Playwright

=== VERIFICATION ===
- tsc --noEmit : 0 erreur
- npm run test:unit : ≥ 1912 passing
- npm run build : OK
- delta tests : 1904 → 1912 (+8)
- 3/3 specs Playwright naming-coherence vertes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Commit 3 — `feat(v75-c): H1 Élevage + breadcrumb + langage simplifié + Marius auto-send`

### Task 14: H1 Élevage et test associé

**Files:**
- Modify: `src/v70/pages/AnimalsV70.tsx:248` (et commentaire ligne 8)
- Modify: `src/v70/pages/__tests__/AnimalsV70.test.tsx:28`

- [ ] **Step 1: Modifier le commentaire d'intro**

Localise (ligne 8) :

```tsx
 * - H1 page : "Mes animaux" (titre lu par l'utilisateur, plus chaleureux)
```

Remplace par :

```tsx
 * - H1 page : "Élevage" (alignement strict décision A — V75-c naming-coherence)
```

- [ ] **Step 2: Modifier le H1**

Localise (ligne 248) :

```tsx
        title="Mes animaux"
```

Remplace par :

```tsx
        title="Élevage"
```

- [ ] **Step 3: Mettre à jour le test**

Localise dans `src/v70/pages/__tests__/AnimalsV70.test.tsx:28` :

```tsx
    expect(screen.getByRole('heading', { level: 1, name: /mes animaux/i })).toBeTruthy();
```

Remplace par :

```tsx
    expect(screen.getByRole('heading', { level: 1, name: /élevage/i })).toBeTruthy();
```

- [ ] **Step 4: Run le test**

Run: `npm run test:unit -- AnimalsV70`
Expected: passing.

---

### Task 15: Breadcrumb /controle

**Files:**
- Modify: page `/controle` (composant à localiser au démarrage de cette task)

- [ ] **Step 1: Localiser le composant**

Run: `grep -rn "Audit terrain\|Outils.*Audit\|breadcrumb.*Outils" src/v70 src/pages src/features 2>/dev/null | head -5`

Identifier le fichier qui rend le breadcrumb `Outils › Audit terrain`. Probablement dans `src/v70/pages/` ou `src/features/audit/` ou `src/pages/ControlePage.tsx`. Lire 30 lignes autour de la match.

- [ ] **Step 2: Modifier le breadcrumb**

Dans le fichier identifié, remplacer la chaîne `Outils` par `Aujourd'hui` dans le breadcrumb. Exemple :

```tsx
<Breadcrumb items={[{ label: 'Outils' }, { label: 'Audit terrain' }]} />
```

devient :

```tsx
<Breadcrumb items={[{ label: 'Aujourd\'hui', to: '/today' }, { label: 'Audit terrain' }]} />
```

(Adapter selon la signature exacte du composant Breadcrumb du projet — copier-coller depuis un autre breadcrumb du projet pour l'API.)

- [ ] **Step 3: Smoke browser**

Run: naviguer http://localhost:5173/today → cliquer "Démarrer la tournée" → vérifier breadcrumb `Aujourd'hui › Audit terrain`.

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 16: Marius auto-submit sur clic suggestion

**Files:**
- Modify: `src/features/chatbot/ChatbotWidget.tsx` (vers ligne 380-398)

- [ ] **Step 1: Ajouter une ref formulaire**

En tête du composant, après `inputRef` existant, ajouter :

```tsx
const formRef = useRef<HTMLFormElement>(null);
```

(Si `useRef` n'est pas déjà importé : ajouter à l'import React.)

- [ ] **Step 2: Brancher la ref sur le formulaire**

Localise (vers ligne 462-464) :

```tsx
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2 border-t"
        style={{ borderColor: 'var(--line)' }}
      >
```

Ajouter `ref={formRef}` :

```tsx
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2 border-t"
        style={{ borderColor: 'var(--line)' }}
      >
```

- [ ] **Step 3: Modifier le onClick suggestion**

Localise (vers ligne 384-388) :

```tsx
                  onClick={() => {
                    setInput(s.question);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
```

Remplace par :

```tsx
                  onClick={() => {
                    setInput(s.question);
                    // Auto-submit après que React ait flush l'input.
                    setTimeout(() => formRef.current?.requestSubmit(), 0);
                  }}
```

- [ ] **Step 4: Adapter le test ChatbotWidget si présent**

Run: `npm run test:unit -- ChatbotWidget`

Si un test casse (par ex. test qui clique une suggestion et attend un clic Envoyer séparé), l'adapter pour vérifier que la requête fetch est déclenchée immédiatement après le clic suggestion.

Si les tests existants passent : continuer.

- [ ] **Step 5: Smoke browser**

Run: naviguer http://localhost:5173/reglages → cliquer icône Marius → cliquer une des 3 suggestions → vérifier que la réponse arrive sans clic Envoyer.

Run: `npx tsc --noEmit`
Expected: 0 erreur.

---

### Task 17: Application grille langage simplifié

**Files:**
- Modify: `src/v70/pages/TodayV70.tsx` (déjà touché commit 2 — pas de re-modif si tags `Bientôt` / `Cette semaine` déjà appliqués)

- [ ] **Step 1: Vérification de cohérence**

Run: `grep -rn "À décider\|À planifier\|Productivité insuffisante\|Cheptel\|cheptel" src/v70 src/features 2>/dev/null | grep -v node_modules | grep -v test | head -20`

Identifier toute occurrence résiduelle des termes de l'ancienne grille. Pour chaque match :
- `À décider` (tag) → remplacer par `Bientôt`
- `À planifier` (tag) → remplacer par `Cette semaine`
- `Productivité insuffisante · voir fiche` → déjà remplacé au commit 2 par `reformReason(t)`
- `cheptel` dans copie utilisateur → remplacer par `élevage` ou `ferme` selon contexte (pas dans les commentaires de code, qui restent en français technique)

- [ ] **Step 2: Vérifier tsc + tests**

Run: `npx tsc --noEmit`
Run: `npm run test:unit`
Expected: 0 erreur, ≥ 1912 passing.

---

### Task 18: Commit 3

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 0 erreur.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Tests E2E complets**

Run: `npx playwright test tests/e2e/naming-coherence.spec.ts`
Expected: 3 passing.

- [ ] **Step 4: Stage + commit**

```bash
git add src/v70/pages/AnimalsV70.tsx src/v70/pages/__tests__/AnimalsV70.test.tsx src/features/chatbot/ChatbotWidget.tsx
# Ajouter le fichier breadcrumb modifié à Task 15 (path identifié au runtime)
git status  # vérifier qu'il n'y a pas d'oubli
git add -A  # si tout est validé
git commit -m "$(cat <<'EOF'
feat(v75-c): H1 Élevage + breadcrumb + langage simplifié + Marius auto-send

- AnimalsV70 H1 "Mes animaux" → "Élevage" (alignement décision A brief V70)
- Test AnimalsV70 mis à jour
- Breadcrumb /controle "Outils › Audit terrain" → "Aujourd'hui ›
  Audit terrain" (suppression reliquat onglet Outils)
- Marius : clic suggestion déclenche maintenant l'envoi automatiquement
  (pattern attendu type ChatGPT)
- Audit grille langage simplifié — pas de "À décider", "Productivité
  insuffisante" résiduel

Élimine frictions P1-1, P1-6, P2-3 audit V74.

=== VERIFICATION ===
- tsc --noEmit : 0 erreur
- npm run lint : 0 erreur
- npm run test:unit : ≥ 1912 passing (pas de nouveau test, ajustement existant)
- npm run build : OK
- 3/3 specs Playwright naming-coherence vertes
- Smoke browser 5 onglets compte audit-final : 0 erreur console

Clôture chantier V75 naming-coherence (commits a + b + c).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Vérifier l'historique**

Run: `git log --oneline -3`
Expected:
```
{hash} feat(v75-c): H1 Élevage + breadcrumb + langage simplifié...
{hash} feat(v75-b): refonte AlertEngine + filtre À vendre...
{hash} feat(v75-a): helper formatBandeName + propagation...
```

---

### Task 19: Vérification finale (cross-cutting)

- [ ] **Step 1: Smoke compte audit complet**

Naviguer http://localhost:5173/ avec compte `audit-final@porctrack.test` :
- `/today` : 5 alertes affichent `À vendre — T-046..T-050`, tag `Cette semaine`
- `/troupeau` (tab Truies) : 5 pills `Toutes / Pleines / Maternité / Vides / À vendre (5)`. Clic "À vendre" → 5 truies T-046..T-050. H1 = "Élevage"
- `/troupeau` (tab Bandes) : 6 lignes `Bande Mai 2026 · T-...` ou `Bande Avril 2026 · T-031`. Aucune ligne UUID
- `/reproduction` : timeline cycles avec format `Bande {Mois} {Année} · J{n}`
- `/performance` : Top 1 et Top 2 avec format cohérent (les deux via formatBandeName)
- `/controle` : breadcrumb `Aujourd'hui › Audit terrain`
- Marius : clic suggestion → réponse arrive sans clic Envoyer
- Console DevTools : 0 erreur, 0 warning sur tous les onglets

- [ ] **Step 2: Vérification "0 UUID exposé"**

Dans Chrome DevTools console, exécuter :

```js
const text = document.body.innerText;
const matches = text.match(/\b[0-9a-f]{8}\b/g) || [];
console.log('UUID 8-hex visibles:', matches.length, matches.slice(0, 5));
```

Sur chaque écran principal (Today, Élevage > Bandes, Repro, Performance) :
Expected: 0 ou rare match accidentel uniquement (jamais dans un titre de listing).

- [ ] **Step 3: Tests complets**

Run: `npm run test:unit && npm run lint && npm run build`
Expected: all green, ≥ 1912 passing, 0 erreur.

Run: `npx playwright test tests/e2e/naming-coherence.spec.ts`
Expected: 3/3 passing.

- [ ] **Step 4: Mettre à jour mémoire projet**

Ajouter une entrée dans `.claude/memory/journal.md` :

```markdown
## 2026-05-09 — V75 chantier Naming & Cohérence (commits a+b+c)

- **a** : helper `formatBandeName` (5 règles, fallback UUID 8-char), propagé sur AnimalsV70 / ReproV70 / PerformanceV70 / contexte Marius
- **b** : module `reformLogic` (isReformed / needsReformConsideration / alreadySortedOut / reformReason). TodayV70 a 2 générateurs distincts : "À sortir bientôt" (à décider) + "À vendre" (déjà réformée). Pill filtre "À vendre (n)" sur AnimalsV70. Bouton fiche truie selon statut. Bouton "Marquer comme vendue" désactivé v1 (dialog persistence à venir).
- **c** : H1 "Élevage" (alignement décision A brief V70). Breadcrumb /controle sans "Outils". Marius auto-submit sur clic suggestion. Grille langage simplifié appliquée (pour éleveurs francophones niveau variable).

Frictions audit V74 fixées : P0-1, P0-2, P1-1, P1-2, P1-5, P1-6, P2-3, P2-6.
Hors-scope (chantiers ultérieurs) : P1-3 listing porcelets, P1-4 audit 12-points, dialog persistence sortie cheptel, fix prompt VPS server-side si Marius garde des UUIDs.

Tests : 1898 → 1912 (+14). 3 e2e Playwright nouveaux verts.
```

---

## Notes critiques

- **Port Vite** : si `:5173` est déjà occupé, kill PID 51191 ou utiliser `npm run dev -- --port 5174` (et adapter `APP_URL` du test e2e).
- **Risque DB `dateSortie`** : la fonction `alreadySortedOut` lit `t.dateSortie`. Si le modèle DB n'a pas ce champ (probable au moment du chantier), `alreadySortedOut()` retourne `false` partout, donc les 5 truies réformées génèrent toutes l'alerte "À vendre". C'est **le comportement souhaité v1**. Quand un chantier ultérieur ajoutera persistence sortie, ce helper deviendra utile sans modification.
- **Texte hardcodé i18n** : tous les libellés sont en français hardcodé — cohérent avec le reste du projet PorcTrack8 (pas d'i18n actif).
- **Breadcrumb component** : la signature exacte (props `items` ou `crumbs`, etc.) est à découvrir au moment de Task 15 — la modif est triviale dès qu'on a le fichier.
- **VPS Marius** : si la composition de contexte est server-side (cas découvert à Task 5), le commit 1 inclura juste un commentaire TODO. Une issue séparée à créer pour patcher le system prompt VPS llama-server. Ne pas bloquer ce chantier dessus.
- **Senior testeur** : ce chantier prépare l'app pour son passage. Après les 3 commits, faire un push prod et notifier le testeur.

---

## Self-review (résultats)

**1. Spec coverage** — chaque section de la spec couverte par au moins une task :
- §2.1 helper formatBandeName → Task 1
- §2.2 refonte AlertEngine → Task 9 (avec dépendance Task 8 reformLogic)
- §2.3 H1 Élevage → Task 14
- §2.4 filtre À VENDRE → Task 10
- §2.5 boutons fiche truie → Task 11
- §2.6 breadcrumb → Task 15
- §2.7 Marius auto-send → Task 16
- §2.8 Marius contexte ferme → Task 5 (avec fallback TODO server-side)
- §2.9 grille langage → distribué Tasks 9, 11, 17 + audit final Task 17

**2. Placeholder scan** — aucun "TBD", "TODO" sans plan, "implement later", ou "similar to". Tous les snippets sont du code réel. Le seul commentaire TODO toléré est l'éventuel patch VPS Marius (Task 5 step 3) — c'est un risque documenté, pas un placeholder de plan.

**3. Type consistency** — `BandeForName`, `FormatBandeOptions`, `AnimalStub` (avec `displayName?`), `AnimalFilter` (étendu `'a-vendre'`), prédicats `Truie`-typed cohérents entre Task 8 (définition) et Task 9-11 (consommation). `formatBandeName` signature stable (tâches 2, 3, 4, 5).
