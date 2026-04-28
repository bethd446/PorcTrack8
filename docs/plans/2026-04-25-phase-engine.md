# Phase Engine — Moteur de Suivi Biologique Intelligent

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Créer un moteur qui détecte automatiquement les transitions de phase biologiques, les propose à l'éleveur via popup de validation, et enregistre l'historique complet — sans aucune valeur hardcodée.

**Architecture:** Un service pur `phaseEngine.ts` calcule les transitions biologiques en comparant la phase "terrain" (basée sur l'âge/poids) vs la phase "déclarée" (statut GAS). Un hook React `usePhaseTransitions` consomme ce service, gère l'état des popups et écrit dans GAS via `offlineQueue`. Les loges physiques ENGRAISSEMENT couvrent CROISSANCE + ENGRAISSEMENT + FINITION.

**Tech Stack:** TypeScript strict, React 18, Vitest, offlineQueue (GAS backend), kvStore (localStorage), date-fns

---

## Contexte critique à lire avant de coder

### Fichiers de référence
- `src/config/farm.ts` — FARM_CONFIG (source de vérité des durées)
- `src/services/bandesAggregator.ts` — `computeBandePhase()` (logique existante à NE PAS casser)
- `src/services/offlineQueue.ts` — `enqueueAppendRow()` (pattern pour écrire dans GAS)
- `src/services/alertEngine.ts` — pattern d'alerte existant
- `src/types/farm.ts` — types `BandePorcelets`, `BandeStatut`

### Règle physique K13
```
LOGES PHYSIQUES       PHASES BIOLOGIQUES
─────────────────     ──────────────────
MATERNITE (9)    ←→   SOUS_MERE
POST_SEVRAGE (6) ←→   POST_SEVRAGE
ENGRAISSEMENT (6)←→   CROISSANCE + ENGRAISSEMENT + FINITION
```
Une bande en CROISSANCE, ENGRAISSEMENT ou FINITION occupe une loge ENGRAISSEMENT.

### Pattern de test existant
Les tests utilisent Vitest + `makeBande(statut, count)` (voir `bandesAggregator.test.ts`).
Pour les tests de composant React, utiliser `@testing-library/react` + `MemoryRouter`.

---

## T1 — FARM_CONFIG : Ajouter les constantes manquantes

**Files:**
- Modify: `src/config/farm.ts`
- Test: `src/services/bandesAggregator.test.ts` (vérifier que le seuil 152 disparaît)

### Step 1 : Vérifier les constantes existantes

```bash
grep -n "DUREE\|POIDS\|ENGRAISSEMENT" src/config/farm.ts
```
Résultat attendu : `POST_SEVRAGE_DUREE_JOURS: 35`, `CROISSANCE_DUREE_JOURS: 37`, pas de `ENGRAISSEMENT_DUREE_JOURS`.

### Step 2 : Ajouter les 3 constantes manquantes

Dans `src/config/farm.ts`, après `CROISSANCE_DUREE_JOURS: 37` :

```typescript
/**
 * Durée de la phase d'engraissement (jours post-sevrage).
 * De J100 à J180 environ (80 jours). Loges partagées avec CROISSANCE et FINITION.
 */
ENGRAISSEMENT_DUREE_JOURS: 80,
/**
 * Poids minimum (kg) pour passer en phase FINITION.
 * En dessous : l'animal est en ENGRAISSEMENT standard.
 */
FINITION_POIDS_MIN_KG: 100,
/**
 * Poids commercial cible pour l'abattage (kg).
 * Au-dessus : l'animal est prêt pour la sortie.
 */
FINITION_POIDS_MAX_KG: 110,
```

### Step 3 : Corriger le 152 hardcodé dans bandesAggregator.ts

Localiser `if (diffJours < 152)` et remplacer par :

```typescript
const ENGRAIS_FIN = FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS
  + FARM_CONFIG.CROISSANCE_DUREE_JOURS
  + FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS; // 35+37+80 = 152

if (diffJours < ENGRAIS_FIN) return 'ENGRAISSEMENT';
return 'FINITION';
```

### Step 4 : Vérifier tsc + tests

```bash
npx tsc --noEmit && npm run test:unit -- src/services/bandesAggregator.test.ts
```
Attendu : 0 erreur, tous verts.

### Step 5 : Commit

```bash
git add src/config/farm.ts src/services/bandesAggregator.ts
git commit -m "feat(config): add ENGRAISSEMENT_DUREE_JOURS + FINITION_POIDS_MIN/MAX_KG, remove hardcoded 152"
```

---

## T2 — phaseEngine.ts : Moteur de détection des transitions

**Files:**
- Create: `src/services/phaseEngine.ts`
- Create: `src/services/phaseEngine.test.ts`

### Concept
Le moteur compare :
- `phaseTerrain` = phase calculée uniquement par l'âge et le poids (ignore le statut GAS)
- `phaseDeclaree` = phase effective (`computeBandePhase`, qui donne priorité au statut)

Si `phaseTerrain > phaseDeclaree` → transition en attente.

### Step 1 : Écrire les tests (TDD)

Créer `src/services/phaseEngine.test.ts` :

```typescript
import { describe, it, expect } from 'vitest';
import type { BandePorcelets } from '../types/farm';
import { detectPendingTransitions, computePhaseTerrain } from './phaseEngine';

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B01', idPortee: 'P01', statut: 'Sous mère',
    vivants: 12, synced: true, ...overrides,
  };
}

describe('computePhaseTerrain', () => {
  it('retourne POST_SEVRAGE pour une bande à J30 post-MB (>SEVRAGE_AGE=28)', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ dateMB: '26/03/2026' }); // J30
    expect(computePhaseTerrain(b, today)).toBe('POST_SEVRAGE');
  });

  it('retourne CROISSANCE pour J70 post-MB (> 28+35=63)', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ dateMB: '15/02/2026' }); // J69 ~
    expect(computePhaseTerrain(b, today)).toBe('CROISSANCE');
  });

  it('retourne ENGRAISSEMENT pour J110 post-MB (> 63+37=100)', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ dateMB: '05/01/2026' }); // J110
    expect(computePhaseTerrain(b, today)).toBe('ENGRAISSEMENT');
  });

  it('retourne FINITION pour J185 post-MB (> 152+1 pour avoir FINITION)', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ dateMB: '22/10/2025' }); // J185
    expect(computePhaseTerrain(b, today)).toBe('FINITION');
  });
});

describe('detectPendingTransitions', () => {
  it('détecte MATERNITE→POST_SEVRAGE quand statut=Sous mère et âge>=28j', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ statut: 'Sous mère', dateMB: '20/03/2026' }); // J36
    const transitions = detectPendingTransitions([b], today);
    expect(transitions).toHaveLength(1);
    expect(transitions[0].fromPhase).toBe('SOUS_MERE');
    expect(transitions[0].toPhase).toBe('POST_SEVRAGE');
  });

  it("ne détecte aucune transition si la bande est déjà au bon statut", () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({
      statut: 'Sevrés',
      dateSevrageReelle: '20/03/2026', // J36 post-sevrage = POST_SEVRAGE ✓
    });
    const transitions = detectPendingTransitions([b], today);
    expect(transitions).toHaveLength(0);
  });

  it('détecte POST_SEVRAGE→CROISSANCE quand J40 post-sevrage et statut=Sevrés', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({
      statut: 'Sevrés',
      dateSevrageReelle: '15/03/2026', // J41 post-sevrage > 35
    });
    const transitions = detectPendingTransitions([b], today);
    expect(transitions[0].fromPhase).toBe('POST_SEVRAGE');
    expect(transitions[0].toPhase).toBe('CROISSANCE');
  });

  it('ignore les bandes RECAP', () => {
    const today = new Date(2026, 3, 25);
    const b = makeBande({ statut: 'RECAP', dateMB: '01/01/2026' });
    expect(detectPendingTransitions([b], today)).toHaveLength(0);
  });
});
```

### Step 2 : Vérifier que les tests échouent

```bash
npm run test:unit -- src/services/phaseEngine.test.ts
```
Attendu : **FAIL** (module inexistant).

### Step 3 : Implémenter phaseEngine.ts

Créer `src/services/phaseEngine.ts` :

```typescript
/**
 * phaseEngine — Moteur de détection des transitions de phase biologiques.
 *
 * Principe :
 *   computePhaseTerrain() calcule la phase biologiquement attendue
 *   uniquement par l'âge depuis la mise-bas (jamais le statut GAS).
 *
 *   detectPendingTransitions() compare phaseTerrain vs phaseDeclaree
 *   (computeBandePhase, qui respecte le statut explicite).
 *   Si terrain > declaree → transition en attente.
 */

import { FARM_CONFIG } from '../config/farm';
import { computeBandePhase, type BandePhase } from './bandesAggregator';
import type { BandePorcelets } from '../types/farm';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PhaseAvecSortie = BandePhase | 'SORTIE';

export interface PendingTransition {
  /** ID de la bande concernée. */
  bandeId: string;
  /** Label court pour l'UI (idPortee ou id). */
  label: string;
  /** Phase actuelle déclarée. */
  fromPhase: BandePhase;
  /** Phase cible suggérée. */
  toPhase: PhaseAvecSortie;
  /** Âge de la bande en jours (depuis dateMB), ou null si dateMB absente. */
  ageJours: number | null;
  /** Poids estimé en kg, null si non applicable. */
  poidsEstimeKg: number | null;
  /** Référence vers la bande pour faciliter la confirmation. */
  bande: BandePorcelets;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse "DD/MM/YYYY" ou "YYYY-MM-DD" → Date | null. */
function parseDateFr(s: string | undefined): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(+fr[3], +fr[2] - 1, +fr[1]);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return null;
}

function floorDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

// ─── Seuils (dérivés de FARM_CONFIG, aucune valeur hardcodée) ─────────────

function seuils() {
  const PS  = FARM_CONFIG.SEVRAGE_AGE_JOURS;                          // 28
  const CR  = PS + FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS;             // 63
  const ENG = CR + FARM_CONFIG.CROISSANCE_DUREE_JOURS;               // 100
  const FIN = ENG + FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS;           // 180
  return { PS, CR, ENG, FIN };
}

// ─── computePhaseTerrain ─────────────────────────────────────────────────────

/**
 * Calcule la phase biologique attendue uniquement par l'âge depuis la MB.
 * N'utilise PAS le statut GAS — c'est ce que la biologie "dit".
 * Retourne null si dateMB absente (impossible de calculer).
 */
export function computePhaseTerrain(
  bande: BandePorcelets,
  today: Date = new Date(),
): BandePhase | null {
  const mbDate = parseDateFr(bande.dateMB);
  if (!mbDate) return null;

  const ageJours = floorDays(mbDate, today);
  const { PS, CR, ENG, FIN } = seuils();

  if (ageJours < PS)  return 'SOUS_MERE';
  if (ageJours < CR)  return 'POST_SEVRAGE';
  if (ageJours < ENG) return 'CROISSANCE';
  if (ageJours < FIN) return 'ENGRAISSEMENT';
  return 'FINITION';
}

// ─── ORDRE des phases (pour comparer terrain > déclarée) ─────────────────────

const PHASE_ORDER: Record<BandePhase, number> = {
  SOUS_MERE:    0,
  POST_SEVRAGE: 1,
  CROISSANCE:   2,
  ENGRAISSEMENT: 3,
  FINITION:     4,
  INCONNU:      -1,
};

function phaseOrder(p: BandePhase): number {
  return PHASE_ORDER[p] ?? -1;
}

// ─── nextPhase ────────────────────────────────────────────────────────────────

function nextPhase(current: BandePhase): PhaseAvecSortie | null {
  switch (current) {
    case 'SOUS_MERE':     return 'POST_SEVRAGE';
    case 'POST_SEVRAGE':  return 'CROISSANCE';
    case 'CROISSANCE':    return 'ENGRAISSEMENT';
    case 'ENGRAISSEMENT': return 'FINITION';
    case 'FINITION':      return 'SORTIE';
    default:              return null;
  }
}

// ─── Estimation poids ────────────────────────────────────────────────────────

/** Estimation linéaire simple du poids courant (kg) depuis sevrage. */
function estimerPoids(bande: BandePorcelets, today: Date): number | null {
  const sevDate = parseDateFr(bande.dateSevrageReelle ?? bande.dateSevragePrevue);
  if (!sevDate) return null;
  const POIDS_SEVRAGE = 7; // kg à J28 (norme K13)
  const GMQ_AVG = 0.65;    // kg/j moyen post-sevrage
  const jours = Math.max(0, floorDays(sevDate, today));
  return Math.min(POIDS_SEVRAGE + jours * GMQ_AVG, 150);
}

// ─── detectPendingTransitions ────────────────────────────────────────────────

/**
 * Détecte toutes les bandes dont la biologie (âge/poids) indique
 * qu'elles devraient passer à la phase suivante, mais dont le statut GAS
 * ne l'a pas encore enregistré.
 *
 * Ignore les bandes RECAP et celles sans dateMB.
 */
export function detectPendingTransitions(
  bandes: BandePorcelets[],
  today: Date = new Date(),
): PendingTransition[] {
  const result: PendingTransition[] = [];

  for (const b of bandes) {
    if (!b || b.statut === 'RECAP') continue;

    const terrain = computePhaseTerrain(b, today);
    if (!terrain) continue; // pas de dateMB → impossible de calculer

    const declaree = computeBandePhase(b, today);
    if (declaree === 'INCONNU') continue;

    // Cas FINITION → SORTIE (basé sur poids)
    if (declaree === 'FINITION') {
      const poids = estimerPoids(b, today);
      if (poids !== null && poids >= FARM_CONFIG.FINITION_POIDS_MAX_KG) {
        result.push({
          bandeId: b.id,
          label: b.idPortee ?? b.id,
          fromPhase: 'FINITION',
          toPhase: 'SORTIE',
          ageJours: parseDateFr(b.dateMB)
            ? floorDays(parseDateFr(b.dateMB)!, today)
            : null,
          poidsEstimeKg: poids,
          bande: b,
        });
      }
      continue;
    }

    // Cas standard : terrain > déclarée → proposer nextPhase
    if (phaseOrder(terrain) > phaseOrder(declaree)) {
      const next = nextPhase(declaree);
      if (!next) continue;

      const mbDate = parseDateFr(b.dateMB);
      result.push({
        bandeId: b.id,
        label: b.idPortee ?? b.id,
        fromPhase: declaree,
        toPhase: next,
        ageJours: mbDate ? floorDays(mbDate, today) : null,
        poidsEstimeKg: estimerPoids(b, today),
        bande: b,
      });
    }
  }

  return result;
}
```

### Step 4 : Vérifier que les tests passent

```bash
npm run test:unit -- src/services/phaseEngine.test.ts
```
Attendu : **PASS** (tous verts).

### Step 5 : tsc global

```bash
npx tsc --noEmit
```
Attendu : 0 erreur.

### Step 6 : Commit

```bash
git add src/services/phaseEngine.ts src/services/phaseEngine.test.ts
git commit -m "feat(engine): phaseEngine — détection transitions biologiques (TDD, 0 valeur hardcodée)"
```

---

## T3 — Type TransitionBande + enqueueTransition

**Files:**
- Modify: `src/types/farm.ts` (ajouter le type)
- Modify: `src/services/offlineQueue.ts` (ajouter la clé GAS)
- Create: `src/services/phaseEngine.test.ts` (extend, tests enqueue)

### Step 1 : Ajouter le type TransitionBande dans farm.ts

```typescript
/** Enregistrement d'une transition de phase confirmée par l'utilisateur. */
export interface TransitionBande {
  bandeId: string;
  anciennePhase: string;   // ex: 'SOUS_MERE'
  nouvellePhase: string;   // ex: 'POST_SEVRAGE' ou 'SORTIE'
  date: string;            // 'DD/MM/YYYY'
  utilisateur: string;     // rôle ou nom (ex: 'PORCHER')
  poidsKg?: number;
  ageJours?: number;
  notes?: string;
}
```

### Step 2 : Ajouter la clé GAS dans offlineQueue.ts

Localiser le mapping de clés GAS dans `offlineQueue.ts` et ajouter :

```typescript
'HISTORIQUE_TRANSITIONS': ['HISTORIQUE_TRANSITIONS'],
```

### Step 3 : Créer la fonction enqueueTransition

Dans `src/services/phaseEngine.ts`, ajouter à la fin :

```typescript
import { enqueueAppendRow } from './offlineQueue';

/**
 * Enregistre une transition confirmée dans HISTORIQUE_TRANSITIONS (GAS).
 * Appelé après validation utilisateur dans le modal.
 */
export async function enqueueTransition(
  transition: PendingTransition,
  utilisateur: string,
  poidsKg?: number,
): Promise<void> {
  const mbDate = parseDateFr(transition.bande.dateMB);
  const ageJours = mbDate
    ? floorDays(mbDate, new Date())
    : transition.ageJours ?? undefined;

  const today = new Date();
  const dateStr = [
    String(today.getDate()).padStart(2, '0'),
    String(today.getMonth() + 1).padStart(2, '0'),
    today.getFullYear(),
  ].join('/');

  await enqueueAppendRow('HISTORIQUE_TRANSITIONS', [
    transition.bandeId,
    transition.fromPhase,
    transition.toPhase,
    dateStr,
    utilisateur,
    poidsKg ?? '',
    ageJours ?? '',
  ]);
}
```

### Step 4 : Vérifier tsc

```bash
npx tsc --noEmit
```
Attendu : 0 erreur.

### Step 5 : Commit

```bash
git add src/types/farm.ts src/services/phaseEngine.ts src/services/offlineQueue.ts
git commit -m "feat(engine): TransitionBande type + enqueueTransition → GAS HISTORIQUE_TRANSITIONS"
```

---

## T4 — PhaseTransitionModal : Le popup de validation

**Files:**
- Create: `src/components/modals/PhaseTransitionModal.tsx`
- Create: `src/components/modals/PhaseTransitionModal.test.tsx`

### Concept visuel
```
╔══════════════════════════════╗
║  ⚡ TRANSITION REQUISE        ║
║  Bande P07 · J+41             ║
║  POST-SEVRAGE → CROISSANCE    ║
║                               ║
║  [✓ Confirmer]  [✕ Plus tard] ║
╚══════════════════════════════╝
```
Pour FINITION→SORTIE, ajouter un champ poids de confirmation.

### Step 1 : Écrire le test

Créer `src/components/modals/PhaseTransitionModal.test.tsx` :

```typescript
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PhaseTransitionModal from './PhaseTransitionModal';
import type { PendingTransition } from '../../services/phaseEngine';

const mockTransition: PendingTransition = {
  bandeId: 'B07',
  label: 'P07',
  fromPhase: 'POST_SEVRAGE',
  toPhase: 'CROISSANCE',
  ageJours: 41,
  poidsEstimeKg: 18,
  bande: { id: 'B07', idPortee: 'P07', statut: 'Sevrés', vivants: 20, synced: true },
};

vi.mock('@ionic/react', () => ({
  IonModal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
}));

function renderModal(props = {}) {
  const defaults = {
    transition: mockTransition,
    isOpen: true,
    onConfirm: vi.fn(),
    onDismiss: vi.fn(),
  };
  return render(
    <MemoryRouter>
      <PhaseTransitionModal {...defaults} {...props} />
    </MemoryRouter>,
  );
}

describe('PhaseTransitionModal', () => {
  it('affiche le label de la bande et les phases', () => {
    renderModal();
    expect(screen.getByText(/P07/)).toBeDefined();
    expect(screen.getByText(/POST.SEVRAGE/i)).toBeDefined();
    expect(screen.getByText(/CROISSANCE/i)).toBeDefined();
  });

  it('appelle onConfirm au clic Confirmer', () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm });
    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }));
    expect(onConfirm).toHaveBeenCalledWith(mockTransition, undefined);
  });

  it('appelle onDismiss au clic Plus tard', () => {
    const onDismiss = vi.fn();
    renderModal({ onDismiss });
    fireEvent.click(screen.getByRole('button', { name: /plus tard/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("affiche un champ poids pour la transition FINITION→SORTIE", () => {
    const finTransition: PendingTransition = {
      ...mockTransition,
      fromPhase: 'FINITION',
      toPhase: 'SORTIE',
    };
    renderModal({ transition: finTransition });
    expect(screen.getByLabelText(/poids.*kg/i)).toBeDefined();
  });
});
```

### Step 2 : Vérifier que les tests échouent

```bash
npm run test:unit -- src/components/modals/PhaseTransitionModal.test.tsx
```
Attendu : **FAIL** (module inexistant).

### Step 3 : Implémenter PhaseTransitionModal.tsx

Créer `src/components/modals/PhaseTransitionModal.tsx` :

```tsx
/**
 * PhaseTransitionModal — popup de confirmation de changement de phase.
 *
 * Affiché quand le moteur phaseEngine détecte qu'une bande devrait
 * passer à la phase biologique suivante.
 */
import React, { useState } from 'react';
import { IonModal } from '@ionic/react';
import { ArrowRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { PendingTransition, PhaseAvecSortie } from '../../services/phaseEngine';

// ─── Labels FR pour chaque phase ─────────────────────────────────────────────

const PHASE_LABEL: Record<string, string> = {
  SOUS_MERE:     'Maternité',
  POST_SEVRAGE:  'Post-sevrage',
  CROISSANCE:    'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION:      'Finition',
  SORTIE:        '🚚 Sortie abattoir',
};

const PHASE_COLOR: Record<string, string> = {
  SOUS_MERE:     'var(--gold)',
  POST_SEVRAGE:  'var(--teal)',
  CROISSANCE:    'var(--amber)',
  ENGRAISSEMENT: 'var(--accent)',
  FINITION:      'var(--coral)',
  SORTIE:        'var(--red)',
};

function isCritical(toPhase: PhaseAvecSortie): boolean {
  return toPhase === 'SORTIE';
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PhaseTransitionModalProps {
  transition: PendingTransition | null;
  isOpen: boolean;
  /** Appelé avec la transition + poids optionnel (SORTIE uniquement). */
  onConfirm: (transition: PendingTransition, poidsKg?: number) => void;
  onDismiss: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

const PhaseTransitionModal: React.FC<PhaseTransitionModalProps> = ({
  transition,
  isOpen,
  onConfirm,
  onDismiss,
}) => {
  const [poids, setPoids] = useState('');

  if (!transition) return null;

  const needsPoids = transition.toPhase === 'SORTIE';
  const critical = isCritical(transition.toPhase);

  const handleConfirm = (): void => {
    const poidsKg = needsPoids && poids ? parseFloat(poids) : undefined;
    onConfirm(transition, poidsKg);
    setPoids('');
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <div className="flex flex-col gap-5 p-6 pt-8 bg-bg-0 min-h-[320px]">
        {/* Header */}
        <div className="flex items-center gap-3">
          {critical
            ? <AlertTriangle size={24} className="text-red shrink-0" />
            : <Clock size={24} className="text-amber shrink-0" />
          }
          <div>
            <p className="ft-heading text-[11px] uppercase tracking-wider text-text-2">
              Transition requise
            </p>
            <p className="font-mono font-bold text-[18px] text-text-0">
              {transition.label}
              {transition.ageJours !== null
                ? <span className="text-[13px] font-normal text-text-2 ml-2">J+{transition.ageJours}</span>
                : null}
            </p>
          </div>
        </div>

        {/* Flèche phases */}
        <div className="flex items-center justify-center gap-4 py-4 card-dense">
          <span
            className="font-mono font-bold text-[13px] px-3 py-1.5 rounded-lg"
            style={{ background: `color-mix(in srgb, ${PHASE_COLOR[transition.fromPhase]} 15%, transparent)`, color: PHASE_COLOR[transition.fromPhase] }}
          >
            {PHASE_LABEL[transition.fromPhase] ?? transition.fromPhase}
          </span>
          <ArrowRight size={16} className="text-text-2" />
          <span
            className="font-mono font-bold text-[13px] px-3 py-1.5 rounded-lg"
            style={{ background: `color-mix(in srgb, ${PHASE_COLOR[transition.toPhase]} 15%, transparent)`, color: PHASE_COLOR[transition.toPhase] }}
          >
            {PHASE_LABEL[transition.toPhase] ?? transition.toPhase}
          </span>
        </div>

        {/* Champ poids (SORTIE uniquement) */}
        {needsPoids && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="poids-confirmation"
              className="font-mono text-[12px] text-text-1 uppercase tracking-wide"
            >
              Poids actuel (kg)
            </label>
            <input
              id="poids-confirmation"
              type="number"
              inputMode="decimal"
              placeholder="ex : 112"
              value={poids}
              onChange={(e) => setPoids(e.target.value)}
              className="w-full h-12 rounded-lg bg-bg-2 border border-border px-4 font-mono text-[16px] text-text-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-auto">
          <button
            type="button"
            aria-label="Plus tard"
            onClick={onDismiss}
            className="pressable flex-1 h-12 rounded-xl border border-border font-mono text-[13px] text-text-2 hover:text-text-0 transition-colors"
          >
            Plus tard
          </button>
          <button
            type="button"
            aria-label="Confirmer"
            onClick={handleConfirm}
            className={`pressable flex-[2] h-12 rounded-xl font-mono font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-colors ${
              critical ? 'bg-red' : 'bg-accent'
            }`}
          >
            <CheckCircle size={16} />
            {critical ? 'Confirmer sortie' : 'Confirmer'}
          </button>
        </div>
      </div>
    </IonModal>
  );
};

export default PhaseTransitionModal;
```

### Step 4 : Vérifier que les tests passent

```bash
npm run test:unit -- src/components/modals/PhaseTransitionModal.test.tsx
```
Attendu : **PASS**.

### Step 5 : tsc

```bash
npx tsc --noEmit
```
Attendu : 0 erreur.

### Step 6 : Commit

```bash
git add src/components/modals/PhaseTransitionModal.tsx src/components/modals/PhaseTransitionModal.test.tsx
git commit -m "feat(ui): PhaseTransitionModal — popup validation transition avec support SORTIE"
```

---

## T5 — usePhaseTransitions : Hook React

**Files:**
- Create: `src/hooks/usePhaseTransitions.ts`
- Create: `src/hooks/usePhaseTransitions.test.ts`

### Concept
Le hook :
1. Prend les bandes du FarmContext
2. Appelle `detectPendingTransitions()`
3. Filtre les transitions déjà "dismissées" ce cycle (sessionStorage)
4. Expose `current` (première transition à montrer), `confirm`, `dismiss`

### Step 1 : Écrire le test

```typescript
// src/hooks/usePhaseTransitions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BandePorcelets } from '../types/farm';

// Mock FarmContext
vi.mock('../context/FarmContext', () => ({
  useFarm: () => ({
    bandes: mockBandes,
    truies: [],
  }),
}));

// Mock phaseEngine
vi.mock('../services/phaseEngine', () => ({
  detectPendingTransitions: vi.fn(() => []),
  enqueueTransition: vi.fn(() => Promise.resolve()),
}));

import { usePhaseTransitions } from './usePhaseTransitions';
import { detectPendingTransitions } from '../services/phaseEngine';

const mockBandes: BandePorcelets[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('usePhaseTransitions', () => {
  it('retourne current=null quand aucune transition', () => {
    const { result } = renderHook(() => usePhaseTransitions());
    expect(result.current.current).toBeNull();
  });

  it('retourne la première transition comme current', () => {
    const mockTransition = {
      bandeId: 'B01', label: 'P01',
      fromPhase: 'POST_SEVRAGE' as const,
      toPhase: 'CROISSANCE' as const,
      ageJours: 40, poidsEstimeKg: 18,
      bande: { id: 'B01', idPortee: 'P01', statut: 'Sevrés', vivants: 10, synced: true },
    };
    (detectPendingTransitions as ReturnType<typeof vi.fn>).mockReturnValue([mockTransition]);
    const { result } = renderHook(() => usePhaseTransitions());
    expect(result.current.current?.bandeId).toBe('B01');
  });

  it('dismiss retire la transition de la liste courante', () => {
    const mockTransition = {
      bandeId: 'B01', label: 'P01',
      fromPhase: 'POST_SEVRAGE' as const,
      toPhase: 'CROISSANCE' as const,
      ageJours: 40, poidsEstimeKg: 18,
      bande: { id: 'B01', idPortee: 'P01', statut: 'Sevrés', vivants: 10, synced: true },
    };
    (detectPendingTransitions as ReturnType<typeof vi.fn>).mockReturnValue([mockTransition]);
    const { result } = renderHook(() => usePhaseTransitions());

    act(() => { result.current.dismiss('B01'); });
    expect(result.current.current).toBeNull();
  });
});
```

### Step 2 : Vérifier que les tests échouent

```bash
npm run test:unit -- src/hooks/usePhaseTransitions.test.ts
```
Attendu : **FAIL**.

### Step 3 : Implémenter usePhaseTransitions.ts

```typescript
// src/hooks/usePhaseTransitions.ts
import { useState, useMemo, useCallback } from 'react';
import { useFarm } from '../context/FarmContext';
import {
  detectPendingTransitions,
  enqueueTransition,
  type PendingTransition,
} from '../services/phaseEngine';

const SESSION_KEY = 'porctrack_dismissed_transitions';

function getDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export function usePhaseTransitions() {
  const { bandes } = useFarm();
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  const today = useMemo(() => new Date(), []);

  const pending = useMemo(
    () => detectPendingTransitions(bandes, today).filter(
      (t) => !dismissed.has(t.bandeId),
    ),
    [bandes, today, dismissed],
  );

  const current = pending[0] ?? null;

  const dismiss = useCallback((bandeId: string): void => {
    setDismissed((prev) => {
      const next = new Set(prev).add(bandeId);
      saveDismissed(next);
      return next;
    });
  }, []);

  const confirm = useCallback(
    async (transition: PendingTransition, poidsKg?: number): Promise<void> => {
      await enqueueTransition(transition, 'PORCHER', poidsKg);
      dismiss(transition.bandeId);
    },
    [dismiss],
  );

  return { pending, current, confirm, dismiss };
}
```

### Step 4 : Vérifier que les tests passent

```bash
npm run test:unit -- src/hooks/usePhaseTransitions.test.ts
```
Attendu : **PASS**.

### Step 5 : Commit

```bash
git add src/hooks/usePhaseTransitions.ts src/hooks/usePhaseTransitions.test.ts
git commit -m "feat(hook): usePhaseTransitions — détection + dismiss sessionStorage + confirm→GAS"
```

---

## T6 — Intégration dans Cockpit (mode Auto)

**Files:**
- Modify: `src/components/Dashboard.tsx` (ou `src/features/Cockpit.tsx` selon l'arbre)
- Render: PhaseTransitionModal au niveau du Cockpit

### Step 1 : Repérer le fichier Cockpit

```bash
grep -rn "route.*/" src/App.tsx | grep '"/"'
# Chercher quel composant est rendu sur "/"
```

### Step 2 : Ajouter le modal dans le Cockpit

Dans le composant qui correspond à `<Route path="/" />` :

```tsx
import { usePhaseTransitions } from '../hooks/usePhaseTransitions';
import PhaseTransitionModal from '../components/modals/PhaseTransitionModal';

// Dans le composant :
const { current, confirm, dismiss } = usePhaseTransitions();

// Dans le JSX, avant </IonPage> :
<PhaseTransitionModal
  transition={current}
  isOpen={current !== null}
  onConfirm={confirm}
  onDismiss={() => dismiss(current!.bandeId)}
/>
```

### Step 3 : Build + vérifier

```bash
npm run build 2>&1 | tail -5
```
Attendu : `✓ built`.

### Step 4 : Commit

```bash
git add src/features/... # (fichier Cockpit modifié)
git commit -m "feat(cockpit): afficher PhaseTransitionModal automatiquement au démarrage"
```

---

## T7 — Mode Manuel : Bouton "Passer à l'étape suivante"

**Files:**
- Modify: `src/features/troupeau/TroupeauPorceletsView.tsx`

### Concept
En mode manuel, chaque BandeRow dans TroupeauPorceletsView affiche un bouton
"→ Étape suivante" si une transition est détectée pour cette bande.

### Step 1 : Lire TroupeauPorceletsView.tsx, localiser BandeRow

```bash
grep -n "BandeRow\|onClick\|navigate" src/features/troupeau/TroupeauPorceletsView.tsx | head -20
```

### Step 2 : Passer les pending transitions comme prop

Dans `TroupeauPorceletsView` :

```tsx
import { usePhaseTransitions } from '../../hooks/usePhaseTransitions';
import PhaseTransitionModal from '../../components/modals/PhaseTransitionModal';

// Dans le composant :
const { pending, current, confirm, dismiss } = usePhaseTransitions();
const [manualTarget, setManualTarget] = useState<PendingTransition | null>(null);

// Dans BandeRow, ajouter un prop hasPendingTransition + onTransition
// Si hasPendingTransition, afficher un badge amber "→ Prochain transfert"
// qui ouvre le modal
```

### Step 3 : Modifier BandeRow pour afficher l'indicateur

Dans `BandeRow`, ajouter :

```tsx
interface BandeRowProps {
  // ... existant ...
  pendingTransition?: PendingTransition;
  onTransition?: (t: PendingTransition) => void;
}

// Dans le JSX, dans la colonne de droite (après le Chip phase) :
{pendingTransition && onTransition && (
  <button
    type="button"
    aria-label={`Confirmer transfert ${pendingTransition.label}`}
    onClick={(e) => { e.stopPropagation(); onTransition(pendingTransition); }}
    className="pressable px-2 py-1 rounded-md bg-amber/15 text-amber font-mono text-[10px] font-bold uppercase tracking-wide"
  >
    Transférer →
  </button>
)}
```

### Step 4 : Rendre PhaseTransitionModal dans TroupeauPorceletsView

```tsx
<PhaseTransitionModal
  transition={manualTarget}
  isOpen={manualTarget !== null}
  onConfirm={async (t, poids) => { await confirm(t, poids); setManualTarget(null); }}
  onDismiss={() => setManualTarget(null)}
/>
```

### Step 5 : Build + vérifier visuellement

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -3
```

### Step 6 : Commit

```bash
git add src/features/troupeau/TroupeauPorceletsView.tsx
git commit -m "feat(troupeau): bouton 'Transférer →' sur bandes avec transition pending (mode manuel)"
```

---

## T8 — Alertes intelligentes : Retard + Surdensité

**Files:**
- Modify: `src/services/alertEngine.ts` (nouvelles règles R7, R8)
- Modify: `src/services/alertEngine.test.ts`

### R7 — Retard de phase (> 3 jours au-delà du seuil)

Ajouter dans `alertEngine.ts` :

```typescript
/**
 * R7 — Alerte retard de phase.
 * Déclenchée si une bande dépasse de > 3 jours le seuil de transition
 * et que le statut n'a pas été mis à jour.
 */
export function checkRetardPhase(bande: BandePorcelets, today: Date): FarmAlert | null {
  const pending = detectPendingTransitions([bande], today);
  if (pending.length === 0) return null;
  const t = pending[0];
  // Retard seulement si > 3 jours de dépassement
  const TOLERANCE_JOURS = 3;
  const ageJours = t.ageJours ?? 0;
  // Calculer le seuil de transition pour fromPhase
  // Si ageJours > seuil + TOLERANCE_JOURS → alerte
  // (seuil calculé depuis FARM_CONFIG)
  const seuilPhase = getSeuilJours(t.fromPhase);
  if (seuilPhase === null || ageJours <= seuilPhase + TOLERANCE_JOURS) return null;

  return {
    id: `retard-${bande.id}`,
    type: 'RETARD_PHASE',
    priorite: 'NORMALE',
    titre: `Retard transfert — ${t.label}`,
    message: `${t.label} devrait être en ${PHASE_LABEL[t.toPhase]} depuis ${ageJours - seuilPhase}j.`,
    timestamp: today.toISOString(),
    bande,
  };
}
```

### R8 — Surdensité loge

```typescript
/**
 * R8 — Surdensité loge engraissement.
 * Déclenchée si CROISSANCE + ENGRAISSEMENT + FINITION > ENGRAISSEMENT_LOGES_CAPACITY.
 */
export function checkSurdensiteLoges(bandes: BandePorcelets[], today: Date): FarmAlert | null {
  const counts = countBandesByPhase(bandes, today);
  const total = counts.CROISSANCE + counts.ENGRAISSEMENT + counts.FINITION;
  const capacity = FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY;
  if (total <= capacity) return null;

  return {
    id: 'surdensite-engraissement',
    type: 'SURDENSITE',
    priorite: 'HAUTE',
    titre: 'Surdensité loges engraissement',
    message: `${total} bandes pour ${capacity} loges (${total - capacity} en trop).`,
    timestamp: today.toISOString(),
  };
}
```

### Tests à écrire avant l'implémentation

```typescript
describe('R7 — Retard de phase', () => {
  it('génère une alerte si retard > 3j sans mise à jour statut', () => {
    const today = new Date(2026, 3, 25);
    const b: BandePorcelets = {
      id: 'B01', idPortee: 'P01',
      statut: 'Sous mère',
      dateMB: '10/03/2026', // J46 — devrait être POST_SEVRAGE depuis J28+3=J31
      vivants: 12, synced: true,
    };
    const alert = checkRetardPhase(b, today);
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('RETARD_PHASE');
  });
});

describe('R8 — Surdensité', () => {
  it('génère une alerte si > ENGRAISSEMENT_LOGES_CAPACITY bandes', () => {
    const today = new Date(2026, 3, 25);
    // 7 bandes en ENGRAISSEMENT pour 6 loges
    const bandes = Array.from({ length: 7 }, (_, i) => ({
      id: `B${i}`, idPortee: `P${i}`,
      statut: 'Sevrés' as const,
      dateSevrageReelle: '01/01/2026', // J114 → ENGRAISSEMENT
      vivants: 20, synced: true,
    }));
    const alert = checkSurdensiteLoges(bandes, today);
    expect(alert).not.toBeNull();
    expect(alert?.priorite).toBe('HAUTE');
  });
});
```

### Commit

```bash
git add src/services/alertEngine.ts src/services/alertEngine.test.ts
git commit -m "feat(alerts): R7 retard-phase + R8 surdensité loges engraissement"
```

---

## T9 — UI Cohérence : TroupeauHub + CyclesHub

**Files:**
- Modify: `src/features/hubs/TroupeauHub.tsx` (Eng. = CROIS+ENG+FIN)
- Modify: `src/features/hubs/CyclesHub.tsx` (days → FARM_CONFIG)

### TroupeauHub : badge Loges

Vérifier que `logesEngraissementOccupation` est déjà fixé (user s'en occupe).
Si pas encore fait :
```typescript
// Dans TroupeauHub, tabCounts.loges :
const engrOcc = summary.eng; // doit inclure CROIS+ENG+FIN
```

### CyclesHub : days depuis FARM_CONFIG

Remplacer `days: 40` hardcodé dans PHASES :

```typescript
{ id: 'engrais', ..., days: FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS },
{ id: 'finition', ..., days: Math.round(
    (FARM_CONFIG.FINITION_POIDS_MAX_KG - FARM_CONFIG.FINITION_POIDS_MIN_KG)
    / 0.90  // GMQ finition kg/j
  )
},
```

### Commit

```bash
git add src/features/hubs/CyclesHub.tsx src/features/hubs/TroupeauHub.tsx
git commit -m "fix(hubs): CyclesHub days → FARM_CONFIG, TroupeauHub eng badge = CROIS+ENG+FIN"
```

---

## Récapitulatif des tâches

| Task | Fichiers créés/modifiés | Tests | Commit |
|------|------------------------|-------|--------|
| T1 | `config/farm.ts`, `bandesAggregator.ts` | ✅ existants | feat(config) |
| T2 | `services/phaseEngine.ts` (+test) | ✅ TDD | feat(engine) |
| T3 | `types/farm.ts`, `offlineQueue.ts`, `phaseEngine.ts` | tsc | feat(engine) |
| T4 | `components/modals/PhaseTransitionModal.tsx` (+test) | ✅ TDD | feat(ui) |
| T5 | `hooks/usePhaseTransitions.ts` (+test) | ✅ TDD | feat(hook) |
| T6 | `features/Cockpit.tsx` | build | feat(cockpit) |
| T7 | `features/troupeau/TroupeauPorceletsView.tsx` | build | feat(troupeau) |
| T8 | `services/alertEngine.ts` (+test) | ✅ TDD | feat(alerts) |
| T9 | `hubs/TroupeauHub.tsx`, `hubs/CyclesHub.tsx` | tsc | fix(hubs) |

**Ordre recommandé :** T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9

---

## Vérification finale

```bash
npx tsc --noEmit && npm run test:unit && npm run build
```
Attendu :
- tsc : 0 erreur
- tests : tous verts (+ nouveaux T2/T4/T5/T8)
- build : ✓ built
