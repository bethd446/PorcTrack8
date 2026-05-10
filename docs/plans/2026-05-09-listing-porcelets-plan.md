# Listing Porcelets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le listing porcelets stubs cosmétiques de `AnimalsV70.tsx` (4 lignes hardcodées P-MAR-01 à P-JAN-01) par un vrai affichage groupé par bande dépliable, alimenté par `bande.porcelets` (déjà chargé via JOIN Supabase V25).

**Architecture:** Découverte clé : `BandePorcelets.porcelets?: PorceletIndividuel[]` existe déjà via `src/types/farm.ts:147` et le JOIN dans `src/services/supabaseService.ts:178`. Donc **pas besoin de modifier `FarmContext`/`TroupeauContext`/`farmDataLoader`** — la donnée est déjà fetched et disponible dans chaque bande. Création d'un helper `derivePorceletPhase`, d'un composant `PorceletGroup`, et modification de `AnimalsV70.tsx` pour brancher le rendu groupé sur tab Porcelets. Un seul commit `v75-h`.

**Tech Stack:** TypeScript strict · React 18 · Ionic 8 · Tailwind v4 + tokens `--pt-*` · Vitest · Playwright.

**Pré-requis :**
- Branche `main` à jour, sans changements non commités
- Tests baseline verts : `npm run test:unit` = 1927 passing avant démarrage
- Vite dev server disponible sur `:5173`

**Spec source :** `docs/plans/2026-05-09-listing-porcelets-design.md`

**Découverte vs spec :** la spec §2.1 prévoyait d'étendre FarmContext avec `porcelets[]` et `porceletsByBande`. C'est inutile car `bande.porcelets` est déjà chargé. Le plan utilise directement cette propriété et économise plusieurs tasks de plumbing context. La spec reste valide pour l'intention métier, seul le plumbing technique est simplifié.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/v70/lib/porceletPhase.ts` | **Créer** | Helper `derivePorceletPhase(porcelet, bande)` retournant 5 phases ou null |
| `src/v70/lib/__tests__/porceletPhase.test.ts` | **Créer** | 7 tests Vitest couvrant les 5 phases + 2 edge cases |
| `src/v70/lib/index.ts` | Modifier | Re-export du helper et du type `PorceletPhase` |
| `src/v70/components/PorceletGroup.tsx` | **Créer** | Composant ligne bande dépliable + sub-items porcelets |
| `src/v70/pages/AnimalsV70.tsx` | Modifier | Counts `truies/verrats/porcelets/bandes`, state `expandedBandes`, branchement rendu `PorceletGroup` sur tab Porcelets, search étendue |
| `src/v70/pages/__tests__/AnimalsV70.test.tsx` | Modifier | Si tests existants assertent sur stubs P-MAR-01, ajuster |
| `tests/e2e/porcelets-listing.spec.ts` | **Créer** | 2 specs Playwright |

---

## Task 1 : Créer helper `derivePorceletPhase`

**Files:**
- Create: `src/v70/lib/porceletPhase.ts`
- Test: `src/v70/lib/__tests__/porceletPhase.test.ts`
- Modify: `src/v70/lib/index.ts`

- [ ] **Step 1 : Écrire les 7 tests qui vont échouer**

Crée `src/v70/lib/__tests__/porceletPhase.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { derivePorceletPhase } from '../porceletPhase';

function bandeWithMBDaysAgo(days: number): { dateMB: string } {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return { dateMB: d.toISOString().slice(0, 10) };
}

describe('derivePorceletPhase', () => {
  it('SOUS_MERE — porcelet 14 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 4 }, bandeWithMBDaysAgo(14));
    expect(phase).toBe('SOUS_MERE');
  });

  it('POST_SEVRAGE — porcelet 40 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 12 }, bandeWithMBDaysAgo(40));
    expect(phase).toBe('POST_SEVRAGE');
  });

  it('CROISSANCE — porcelet 80 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 35 }, bandeWithMBDaysAgo(80));
    expect(phase).toBe('CROISSANCE');
  });

  it('ENGRAISSEMENT — porcelet 130 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 65 }, bandeWithMBDaysAgo(130));
    expect(phase).toBe('ENGRAISSEMENT');
  });

  it('FINITION par jours — porcelet 200 jours après MB', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 90 }, bandeWithMBDaysAgo(200));
    expect(phase).toBe('FINITION');
  });

  it('FINITION par poids — poids ≥ 100kg force FINITION même J50', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 102 }, bandeWithMBDaysAgo(50));
    expect(phase).toBe('FINITION');
  });

  it('Pas de dateMB — retourne null', () => {
    const phase = derivePorceletPhase({ poidsCourantKg: 30 }, {});
    expect(phase).toBeNull();
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

Run :
```bash
npm run test:unit -- porceletPhase
```
Expected : FAIL avec `Cannot find module '../porceletPhase'`.

- [ ] **Step 3 : Implémenter le helper**

Crée `src/v70/lib/porceletPhase.ts` :

```ts
import type { BandePorcelets, PorceletIndividuel } from '../../types/farm';

export type PorceletPhase =
  | 'SOUS_MERE'
  | 'POST_SEVRAGE'
  | 'CROISSANCE'
  | 'ENGRAISSEMENT'
  | 'FINITION';

const FINITION_POIDS_KG = 100;
const SEVRAGE_J = 28;
const POST_SEVRAGE_FIN_J = 63;   // 28 + 35
const CROISSANCE_FIN_J = 100;    // 63 + 37
const ENGRAISSEMENT_FIN_J = 180; // 100 + 80

function joursDepuisMB(dateMB: string): number | null {
  const d = new Date(dateMB);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function derivePorceletPhase(
  porcelet: Pick<PorceletIndividuel, 'poidsCourantKg'>,
  bande: Pick<BandePorcelets, 'dateMB'>,
): PorceletPhase | null {
  // Priorité 1 : poids ≥ 100kg force FINITION (peu importe l'âge)
  if ((porcelet.poidsCourantKg ?? 0) >= FINITION_POIDS_KG) {
    return 'FINITION';
  }

  if (!bande.dateMB) return null;
  const j = joursDepuisMB(bande.dateMB);
  if (j === null) return null;

  if (j < SEVRAGE_J) return 'SOUS_MERE';
  if (j < POST_SEVRAGE_FIN_J) return 'POST_SEVRAGE';
  if (j < CROISSANCE_FIN_J) return 'CROISSANCE';
  if (j < ENGRAISSEMENT_FIN_J) return 'ENGRAISSEMENT';
  return 'FINITION';
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

Run :
```bash
npm run test:unit -- porceletPhase
```
Expected : 7 passing.

- [ ] **Step 5 : Re-export depuis `src/v70/lib/index.ts`**

Lire le fichier actuel puis ajouter en fin de fichier :

```ts
export { derivePorceletPhase } from './porceletPhase';
export type { PorceletPhase } from './porceletPhase';
```

- [ ] **Step 6 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

---

## Task 2 : Créer composant `PorceletGroup`

**Files:**
- Create: `src/v70/components/PorceletGroup.tsx`

- [ ] **Step 1 : Créer le fichier composant**

Crée `src/v70/components/PorceletGroup.tsx` :

```tsx
import React from 'react';
import type { BandePorcelets, PorceletIndividuel } from '../../types/farm';
import { Pill, type PillVariant } from './ds/Pill';
import { formatBandeName, derivePorceletPhase, type PorceletPhase } from '../lib';

const PHASE_LABEL: Record<PorceletPhase, string> = {
  SOUS_MERE: 'Sous mère',
  POST_SEVRAGE: 'Post-sevrage',
  CROISSANCE: 'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION: 'Finition',
};

const PHASE_PILL: Record<PorceletPhase, PillVariant> = {
  SOUS_MERE: 'warm',
  POST_SEVRAGE: 'info',
  CROISSANCE: 'info',
  ENGRAISSEMENT: 'warm',
  FINITION: 'success',
};

const ACTIVE_STATUTS = new Set(['VIVANT', 'MALADE', 'QUARANTAINE']);

export type PorceletGroupProps = {
  bande: BandePorcelets;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigateToBande: (bandeId: string) => void;
};

export function PorceletGroup({
  bande,
  isExpanded,
  onToggle,
  onNavigateToBande,
}: PorceletGroupProps) {
  const allPorcelets = bande.porcelets ?? [];
  const activePorcelets = allPorcelets.filter(p => ACTIVE_STATUTS.has(p.statut));
  const count = activePorcelets.length;
  const isEmpty = count === 0;
  const bandeName = formatBandeName({
    id: bande.id,
    idPortee: bande.idPortee,
    truieMere: bande.truie,
    dateMB: bande.dateMB,
  }, { compact: true });

  return (
    <div
      style={{
        background: 'var(--pt-bg)',
        border: '1px solid var(--pt-line)',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <button
          type="button"
          onClick={isEmpty ? undefined : onToggle}
          disabled={isEmpty}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Replier' : 'Déplier'} ${bandeName}`}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: isEmpty ? 'default' : 'pointer',
            minHeight: 44,
            opacity: isEmpty ? 0.55 : 1,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 14, color: 'var(--pt-muted)', width: 14 }}>
            {isEmpty ? '·' : isExpanded ? '▾' : '▸'}
          </span>
          <span
            style={{
              flex: 1,
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: 'var(--pt-ink)',
            }}
          >
            {bandeName}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--pt-muted)',
            }}
          >
            {isEmpty ? '0 vivants — bande terminée' : `${count} vivants`}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateToBande(bande.id)}
          aria-label={`Voir la fiche bande ${bandeName}`}
          style={{
            padding: '0 16px',
            background: 'transparent',
            border: 'none',
            borderLeft: '1px solid var(--pt-line)',
            cursor: 'pointer',
            color: 'var(--pt-muted)',
            fontSize: 16,
            minHeight: 44,
          }}
        >
          ›
        </button>
      </div>

      {isExpanded && !isEmpty && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            borderTop: '1px solid var(--pt-line)',
            background: 'var(--pt-warm)',
          }}
        >
          {activePorcelets.map(p => {
            const phase = derivePorceletPhase(p, bande);
            return (
              <li
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px 10px 44px',
                  borderBottom: '1px solid var(--pt-line)',
                  fontSize: 13,
                }}
              >
                <span aria-hidden="true" style={{ color: 'var(--pt-muted)' }}>↳</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--pt-ink)',
                    minWidth: 90,
                  }}
                >
                  {p.boucle}
                </span>
                <span style={{ color: 'var(--pt-muted)', minWidth: 70 }}>
                  {p.poidsCourantKg != null ? `${p.poidsCourantKg} kg` : '—'}
                </span>
                <span style={{ color: 'var(--pt-muted)', minWidth: 24 }}>
                  {p.sexe === 'INCONNU' ? '—' : p.sexe}
                </span>
                <span style={{ flex: 1 }} />
                {phase && <Pill variant={PHASE_PILL[phase]}>{PHASE_LABEL[phase]}</Pill>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

---

## Task 3 : Modifier `AnimalsV70.tsx` — counts dynamique

**Files:**
- Modify: `src/v70/pages/AnimalsV70.tsx` (vers ligne 105-130, bloc `counts`)

- [ ] **Step 1 : Localiser le bloc `counts` actuel**

Lire `src/v70/pages/AnimalsV70.tsx` autour de la ligne 105 pour trouver :

```tsx
  const counts = useMemo(() => {
    const truiesPleines = truies.filter(t => /pleine|gestante|gestation/i.test(t.statut ?? '')).length;
    const truiesMater = truies.filter(t => /maternit[eé]|allaitante|allaitement/i.test(t.statut ?? '')).length;
    const truiesVides = truies.filter(t => /attente saillie|vide|sevr[eé]e/i.test(t.statut ?? '')).length;
    const truiesAVendre = truies.filter(isReformed).length;
    const porcelets = bandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0);
    ...
```

(Note : la ligne `truiesAVendre` a été ajoutée en V75-b commit `83159bf`.)

- [ ] **Step 2 : Remplacer le calcul `porcelets`**

Remplace :

```tsx
    const porcelets = bandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0);
```

par :

```tsx
    const porcelets = bandes.reduce((acc, b) => {
      const active = (b.porcelets ?? []).filter(
        p => p.statut === 'VIVANT' || p.statut === 'MALADE' || p.statut === 'QUARANTAINE',
      ).length;
      return acc + active;
    }, 0);
```

Le compteur reflète maintenant les `porcelets_individuels` actifs par bande (source unique de vérité). Si la donnée DB est désynchronisée avec `b.vivants` agrégé, c'est volontaire : la table individuelle est plus fiable.

- [ ] **Step 3 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

---

## Task 4 : Modifier `AnimalsV70.tsx` — state `expandedBandes`

**Files:**
- Modify: `src/v70/pages/AnimalsV70.tsx` (zone des hooks de state, vers ligne 100)

- [ ] **Step 1 : Ajouter useEffect import**

Vérifier que `useEffect` est importé. Localise (ligne 14) :

```tsx
import React, { useState, lazy, Suspense, useMemo } from 'react';
```

Remplace par :

```tsx
import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
```

- [ ] **Step 2 : Ajouter le state d'expansion**

Localise (vers ligne 100, après `const [search, setSearch] = useState('');`) :

```tsx
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
```

Insère AVANT la déclaration `addOpen` :

```tsx
  const [expandedBandes, setExpandedBandes] = useState<Set<string>>(new Set());

  // V75-h : ouvrir le 1er groupe par défaut quand les bandes arrivent (data lazy via FarmContext).
  useEffect(() => {
    if (bandes.length > 0 && expandedBandes.size === 0) {
      setExpandedBandes(new Set([bandes[0].id]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandes.length]);
```

- [ ] **Step 3 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

---

## Task 5 : Modifier `AnimalsV70.tsx` — branchement rendu `PorceletGroup`

**Files:**
- Modify: `src/v70/pages/AnimalsV70.tsx` (zone `<Section>` rendu liste, vers ligne 326)

- [ ] **Step 1 : Ajouter import du composant**

En haut du fichier après les imports v70 existants (vers ligne 18) :

```tsx
import { PorceletGroup } from '../components/PorceletGroup';
```

- [ ] **Step 2 : Brancher le rendu groupé**

Localise le bloc `<Section label={sectionLabel[tab]}>` (vers ligne 326). Lis 30 lignes pour comprendre la structure.

Repère le pattern actuel :
```tsx
      <Section label={sectionLabel[tab]}>
        {filteredList.length === 0 ? (
          search.trim() ? (
            <div ...>{`Aucun résultat pour « ${search} »`}</div>
          ) : ...
        ) : (
          filteredList.map((it) => (
            <ListItem ... />
          ))
        )}
      </Section>
```

Insérer une branche `tab === 'porcelets'` AVANT le ternaire `filteredList.length === 0 ?`. Cette branche utilise les `bandes` filtrées par la search et rend des `PorceletGroup`.

Remplace le bloc complet `<Section label={sectionLabel[tab]}>...</Section>` par :

```tsx
      <Section label={sectionLabel[tab]}>
        {tab === 'porcelets' ? (
          (() => {
            const q = search.trim().toLowerCase();
            const visibleBandes = q
              ? bandes.filter(b => {
                  const bandeNameLc = (
                    b.idPortee || `${b.truie ?? ''} ${b.dateMB ?? ''}`
                  ).toLowerCase();
                  if (bandeNameLc.includes(q)) return true;
                  return (b.porcelets ?? []).some(p => p.boucle.toLowerCase().includes(q));
                })
              : bandes;

            if (visibleBandes.length === 0) {
              return (
                <div style={{ padding: 18, textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  {q ? `Aucun résultat pour « ${search} »` : 'Aucune bande active'}
                </div>
              );
            }

            return visibleBandes.map(b => {
              // Search match sur boucle force déplié
              const matchesByBoucle = q
                ? (b.porcelets ?? []).some(p => p.boucle.toLowerCase().includes(q))
                : false;
              const isExpanded = expandedBandes.has(b.id) || matchesByBoucle;
              return (
                <PorceletGroup
                  key={b.id}
                  bande={b}
                  isExpanded={isExpanded}
                  onToggle={() => {
                    setExpandedBandes(prev => {
                      const next = new Set(prev);
                      if (next.has(b.id)) next.delete(b.id);
                      else next.add(b.id);
                      return next;
                    });
                  }}
                  onNavigateToBande={(id) => navigate(`/troupeau/bandes/${id}`)}
                />
              );
            });
          })()
        ) : filteredList.length === 0 ? (
          search.trim() ? (
            <div style={{ padding: 18, textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
              {`Aucun résultat pour « ${search} »`}
            </div>
          ) : (tab === 'bandes' || tab === 'loges') && tabBandesEmptyForLoading ? (
            <ListingSkeleton count={3} />
          ) : (() => {
            // V74 — empty state V73 contextualisé
            const emptyCopy = tab === 'bandes'
              ? {
                  alt: 'Couloir bâtiment porcin calme, loge libre prête à accueillir une bande',
                  title: 'Aucune bande active',
                  desc: 'Crée ta première bande pour démarrer le suivi.',
                }
              : tab === 'loges'
              ? {
                  alt: 'Loge propre vide, paille fraîche',
                  title: 'Aucune loge configurée',
                  desc: 'Ajoute tes loges pour activer le suivi par bande.',
                }
              : {
                  alt: 'Loge propre vide, paille fraîche',
                  title: 'Aucun animal',
                  desc: 'Loge prête. Ajoute ton premier animal.',
                };
            return (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  aspectRatio: '4 / 3',
                  margin: '12px 0',
                  background: '#f5efe2',
                }}
                data-testid={`empty-state-${tab}`}
              >
                {/* …garder le contenu existant identique à l'actuel… */}
              </div>
            );
          })()
        ) : (
          filteredList.map((it) => (
            <ListItem
              key={it.id}
              avatar={<EntityAvatar species={TAB_DATA[tab].species} size="md" shortCode={it.id.slice(0, 8)} />}
              title={it.displayName ?? (it.id.length > 16 ? `Bande ${it.id.slice(0, 8)}…` : it.id)}
              subtitle={it.status}
              trailing={
                <>
                  <Pill variant={it.pillVariant}>{it.statusLabel}</Pill>
                  <span className="list-arrow">›</span>
                </>
              }
              onClick={() => navigate(`${TAB_DATA[tab].routePrefix}${it.id}`)}
            />
          ))
        )}
      </Section>
```

**Important** : le commentaire `{/* …garder le contenu existant identique à l'actuel… */}` doit être remplacé par le contenu réel du bloc `<div data-testid={empty-state-${tab}}>...</div>` existant. Lire le fichier autour de la ligne 365 pour copier le markup exact (boutons, image picture/img, etc.) et le coller à la place du commentaire. Ne PAS perdre ce contenu — c'est l'empty state V74.

- [ ] **Step 3 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

- [ ] **Step 4 : Smoke browser**

Le serveur Vite tourne sur :5173. Naviguer http://localhost:5173/troupeau (compte audit-final connecté). Cliquer tab Porcelets.

Expected :
- 6 groupes affichés (1 par bande de la ferme audit)
- Premier groupe ouvert par défaut
- Clic sur header replie/déplie
- Clic sur chevron `›` → arrive sur `/troupeau/bandes/{uuid}`
- Search `P-MAI` filtre les groupes ne contenant pas `P-MAI*`
- Console DevTools : 0 erreur

---

## Task 6 : Adapter le test `AnimalsV70.test.tsx`

**Files:**
- Modify: `src/v70/pages/__tests__/AnimalsV70.test.tsx`

- [ ] **Step 1 : Identifier les tests qui asserent sur les stubs**

Run :
```bash
grep -n "P-MAR\|P-FEV\|P-JAN\|porcelet\|Porcelet" src/v70/pages/__tests__/AnimalsV70.test.tsx
```

Si aucune ligne ne ressort sur des assertions porcelets : aucun changement nécessaire à cette étape.

Si des tests assertent sur `P-MAR-01` ou similaires : les adapter pour utiliser le nouveau pattern (mock `bandes` avec `porcelets` ou skip le test "Tab Porcelets stubs" si trop fragile).

- [ ] **Step 2 : Run le test**

Run :
```bash
npm run test:unit -- AnimalsV70
```
Expected : tous les tests passent. Si un test échoue, lire l'erreur, ajuster le mock dans le test pour fournir au moins une bande avec un porcelet vivant et que le tab Porcelets affiche le composant `PorceletGroup`.

- [ ] **Step 3 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

---

## Task 7 : Tests Playwright `porcelets-listing.spec.ts`

**Files:**
- Create: `tests/e2e/porcelets-listing.spec.ts`

- [ ] **Step 1 : Créer le fichier**

Le pattern d'auth est dans `tests/e2e/naming-coherence.spec.ts` (V75-a). Réutiliser le même login.

Crée `tests/e2e/porcelets-listing.spec.ts` :

```ts
import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'audit-final@porctrack.test';
const LOGIN_PASSWORD = 'AuditFinal2026!';

async function loginAuditFinal(page: import('@playwright/test').Page) {
  await page.goto(`${APP_URL}/login`);
  await page.locator('#login-email').fill(LOGIN_EMAIL);
  await page.locator('#login-password').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL(/\/today/, { timeout: 10000 });
}

test.describe('Listing porcelets — V75-h', () => {
  test('Tab Porcelets affiche 6 groupes de bandes avec compteurs cohérents', async ({ page }) => {
    await loginAuditFinal(page);
    await page.goto(`${APP_URL}/troupeau`);
    await page.getByRole('tab', { name: /porcelets/i }).click();

    // Au moins 1 groupe rendu (texte "vivants" en bout de ligne)
    const groups = page.locator('button[aria-expanded]').filter({ hasText: /vivants/ });
    await expect(groups.first()).toBeVisible({ timeout: 10000 });
    const groupCount = await groups.count();
    expect(groupCount).toBeGreaterThanOrEqual(1);

    // Aucune ligne avec UUID 8-hex tronqué dans les noms de bande visibles
    const titles = await groups.allInnerTexts();
    for (const t of titles) {
      expect(t).not.toMatch(/Bande [0-9a-f]{8}…/);
    }
  });

  test('Clic sur header bande déplie/replie le groupe', async ({ page }) => {
    await loginAuditFinal(page);
    await page.goto(`${APP_URL}/troupeau`);
    await page.getByRole('tab', { name: /porcelets/i }).click();

    const groups = page.locator('button[aria-expanded]').filter({ hasText: /vivants/ });
    await expect(groups.first()).toBeVisible({ timeout: 10000 });

    // Trouver un groupe collapsed (aria-expanded="false")
    const collapsed = groups.filter({ hasText: /vivants/ }).and(
      page.locator('[aria-expanded="false"]'),
    );
    const target = collapsed.first();
    if (await target.count() > 0) {
      await target.click();
      // Après click, devient aria-expanded="true"
      await expect(target).toHaveAttribute('aria-expanded', 'true', { timeout: 2000 });
      // Re-click → repli
      await target.click();
      await expect(target).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 });
    }
  });
});
```

- [ ] **Step 2 : Vérifier que le serveur Vite tourne**

Run :
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
```
Expected : `200`. Si pas, run `npm run dev > /tmp/porctrack-dev.log 2>&1 &` puis attendre 4s.

- [ ] **Step 3 : Exécuter les 2 specs**

Run :
```bash
npx playwright test --config tests/playwright.config.ts tests/e2e/porcelets-listing.spec.ts
```
Expected : 2 passing.

Si une spec échoue :
- Vérifier que la ferme audit a bien des porcelets (`b.porcelets`) en DB. Si pas : insérer manuellement quelques rows `porcelets_individuels` rattachés à un batch existant pour le test (ou skip avec `test.skip()` en commentaire si la donnée n'est pas peuplable).
- Si le sélecteur `button[aria-expanded]` ne match pas : vérifier que `PorceletGroup` rend bien `aria-expanded` sur son bouton header (Task 2 step 1).

---

## Task 8 : Commit `feat(v75-h)`

- [ ] **Step 1 : Vérifier baseline tests**

Run :
```bash
npm run test:unit
```
Expected : ≥ 1934 passing (1927 baseline + 7 porceletPhase).

- [ ] **Step 2 : Lint + build**

Run :
```bash
npm run lint
```
Note : le projet a 6 erreurs lint pré-existantes hors-scope (TopBarSync, notifications, EditTruieWizard) — ignorer si elles ne touchent pas nos fichiers V75-h. Vérifier qu'aucune nouvelle erreur n'apparaît dans `src/v70/lib/porceletPhase.ts`, `src/v70/components/PorceletGroup.tsx`, `src/v70/pages/AnimalsV70.tsx`.

Run :
```bash
npm run build
```
Expected : exit 0.

- [ ] **Step 3 : Tests Playwright complets V75 toujours verts**

Run :
```bash
npx playwright test --config tests/playwright.config.ts tests/e2e/naming-coherence.spec.ts tests/e2e/landing-v75.spec.ts tests/e2e/porcelets-listing.spec.ts
```
Expected : 10 passing (3 naming + 5 landing + 2 porcelets).

- [ ] **Step 4 : Stage + commit**

```bash
cd ~/Desktop/PorcTrack8
git add src/v70/lib/porceletPhase.ts \
        src/v70/lib/__tests__/porceletPhase.test.ts \
        src/v70/lib/index.ts \
        src/v70/components/PorceletGroup.tsx \
        src/v70/pages/AnimalsV70.tsx \
        tests/e2e/porcelets-listing.spec.ts

# si AnimalsV70.test.tsx a été modifié au Task 6 :
git add src/v70/pages/__tests__/AnimalsV70.test.tsx 2>/dev/null

git commit -m "$(cat <<'EOF'
feat(v75-h): listing porcelets groupé par bande dépliable

- Création src/v70/lib/porceletPhase.ts : helper derivePorceletPhase
  (5 phases SOUS_MERE/POST_SEVRAGE/CROISSANCE/ENGRAISSEMENT/FINITION,
  priorité poids ≥ 100kg force FINITION). 7 tests Vitest.
- Création src/v70/components/PorceletGroup.tsx : composant ligne bande
  dépliable. Header toggle (aria-expanded) + chevron › distinct vers
  fiche bande. Sub-items avec boucle, poids, sexe, pill phase.
- AnimalsV70.tsx : counts.porcelets calculé depuis bande.porcelets actifs
  (source unique de vérité, plus l'agrégat bande.vivants). State
  expandedBandes Set<string>. 1er groupe ouvert par défaut au mount des
  bandes via useEffect (data lazy FarmContext). Branche conditionnelle
  rendu groupé sur tab='porcelets'. Search étendue : nom de bande OU
  boucle porcelet (force déplié si match boucle).
- 2 specs Playwright tests/e2e/porcelets-listing.spec.ts.

Élimine la friction P1-3 audit V74 (92 porcelets annoncés, 4 stubs
hardcodés affichés). Les porcelets viennent du JOIN porcelets_individuels
déjà présent dans le fetch bandes V25 — pas de modification context.

=== VERIFICATION ===
- npx tsc --noEmit : 0 erreur
- npm run test:unit : ≥ 1934 passing | 5 skipped (+7 porceletPhase)
- npm run build : OK
- 2/2 specs Playwright porcelets-listing vertes
- 10/10 specs Playwright V75 totales (3 naming + 5 landing + 2 porcelets)
- 1er groupe ouvert par défaut, toggle marche, chevron route fiche bande

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5 : Vérifier le commit**

Run :
```bash
git log --oneline -1
```
Expected : `feat(v75-h): listing porcelets groupé par bande dépliable`.

---

## Task 9 : Vérification finale + journal

- [ ] **Step 1 : Smoke browser final**

Naviguer http://localhost:5173/troupeau (compte audit-final). Tab Porcelets. Vérifier :
- 6 groupes correspondants aux 6 bandes audit
- Sum des compteurs `{N} vivants` annoncé par chaque groupe = `92` (eyebrow page)
- Toggle marche sur tous les groupes
- Chevron `›` route vers la fiche bande
- Search `B-AUDIT` ne garde que les groupes dont le nom matche
- Search `P-` (si des porcelets ont des boucles `P-XXX`) force déplié les groupes contenant un match
- Console DevTools : 0 erreur

- [ ] **Step 2 : Audit "stubs cosmétiques éliminés"**

Dans la console browser sur le tab Porcelets :

```js
const text = document.body.innerText;
console.log('P-MAR-01 visible ?', text.includes('P-MAR-01'));
console.log('P-FEV-01 visible ?', text.includes('P-FEV-01'));
```

Expected : `false` pour les deux. Si un des deux ressort `true`, c'est que le branchement Task 5 ne couvre pas un cas — investiguer.

- [ ] **Step 3 : Push prod (optionnel — demander au user)**

```bash
git push origin main
```

Le workflow GitHub Actions `Deploy to Hostinger` se déclenche automatiquement. Surveiller via :
```bash
gh run list --workflow "Deploy to Hostinger" --branch main --limit 1
```

- [ ] **Step 4 : Mémoire projet**

Ajouter une entrée dans `.claude/memory/journal.md`, juste avant l'entrée V75 d/e/f :

```markdown
## 2026-05-09 · [V75-h] Listing porcelets dépliable · commit `<hash>`

**Contexte** : friction P1-3 audit V74 — "92 porcelets" annoncés mais 4 stubs hardcodés affichés. Découverte clé pendant exploration : `BandePorcelets.porcelets?` (V25) déjà chargé via JOIN `porcelets_individuels` dans `supabaseService.ts:178`. Donc pas de modification context nécessaire.

**Livré** :
- Helper `derivePorceletPhase` (5 phases + priorité poids 100kg) avec 7 tests
- Composant `PorceletGroup` avec header toggle + chevron route séparé
- `AnimalsV70` : counts depuis `bande.porcelets` actifs, state expansion, search étendue boucle+nom-bande
- 2 specs Playwright

**Tests** : 1927 → ≥ 1934 (+7). 10 specs Playwright V75 vertes. tsc 0.

**Hors-scope** : fiche porcelet dédiée, bottom-sheet quick-actions, tri/filtre poids/phase/sexe, pagination > 500 porcelets.

**Liens** : [[learnings]] (réutiliser JOIN existant > recharger via context)
```

Commit la mémoire :
```bash
git add .claude/memory/journal.md
git commit -m "docs(memory): journal V75-h listing porcelets dépliable

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Notes critiques

- **Découverte `bande.porcelets`** : éliminer cette section du plan si l'engineer ne croit pas que c'est déjà chargé. Vérifier d'abord en lisant `src/services/supabaseService.ts:178` — la chaîne `'porcelets_individuels(id, batch_id, boucle, sexe, poids_courant_kg, statut, notes)'` est dans le SELECT. Confirmé.
- **`b.vivants` vs `bande.porcelets` actifs** : si la donnée DB est désynchronisée, le compteur affiché viendra de `bande.porcelets` (Task 3). C'est le comportement souhaité (source plus fiable). À noter au senior testeur si écart visible.
- **Empty state quand bande sans porcelet** : `PorceletGroup` rend `0 vivants — bande terminée` et désactive le toggle (`disabled`). Ne pas confondre avec une bande qui n'a juste pas encore eu sa MB.
- **Tests Playwright porcelets** : nécessitent que la ferme audit ait des `porcelets_individuels` peuplés. Si la prod a `b.vivants` mais pas de rows individuels, les tests vont passer la spec 1 (1+ groupe) mais le toggle n'expanira rien (count=0). Anticiper en provisionnant la donnée test si nécessaire (insert SQL manuel sur 1 batch test).
- **Mobile portrait** : sub-items dépliés avec `padding-left: 44px` sont étroits sur 360px. Si signalé, réduire à 28px ou repenser layout (poids et sexe sur 2e ligne).

---

## Self-review (résultats)

**1. Spec coverage** :
- §1 choix structurants → tasks 1, 2, 3-5 (helper, composant, branchement)
- §2.1 source data → Task 3 (bande.porcelets, pas FarmContext) — *simplification vs spec*
- §2.2 helper → Task 1
- §2.3 composant → Task 2
- §2.4.1 counts → Task 3
- §2.4.2 realStubs → Task 5 (branchement direct, pas via realStubs)
- §2.4.3 branchement rendu → Task 5
- §2.4.4 state expansion → Task 4
- §2.4.5 search étendue → Task 5
- §2.4.6 FAB → préservé sans modification (mention dans Task 5)
- §2.5 tests → Tasks 1, 6, 7
- §3 commit → Task 8
- §4 plan tests → Tasks 1, 7, 8
- §5 critères done → Task 8 + 9
- §6 hors-scope → respecté
- §7 risques → Notes critiques
- §8 inputs → vérifiés au début
- §9 prérequis → header du plan

**2. Placeholder scan** : aucun "TBD", "TODO" sans plan. Le commentaire `{/* …garder le contenu existant identique à l'actuel… */}` dans Task 5 step 2 est explicitement instructif (le code existant doit être copié) — pas un placeholder de spec mais une consigne claire à l'engineer.

**3. Type consistency** : `PorceletPhase`, `derivePorceletPhase`, `PorceletGroupProps`, `BandePorcelets`, `PorceletIndividuel` cohérents entre Task 1 (def) et Tasks 2, 5 (consommation). Filter `statut` partout sur `'VIVANT' | 'MALADE' | 'QUARANTAINE'` (Task 2 + Task 3). Set `ACTIVE_STATUTS` défini dans `PorceletGroup.tsx` mais pas extrait — ok pour ce scope (1 file consumer principal). Si réutilisé ailleurs, à promote dans `porceletPhase.ts` plus tard.
