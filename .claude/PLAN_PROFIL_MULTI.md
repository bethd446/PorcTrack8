# PLAN — Onboarding profil ferme (Naisseur / Engraisseur / Cycle complet)

**Date** : 2026-05-12
**Statut** : Spec validée, prêt à découper en sub-tasks
**Périmètre** : P0 #1 de l'audit roadmap multi-profil (cf. session 2026-05-12)

---

## 1. Pourquoi

App actuelle = parti pris naisseur (« REPRODUCTION » bottom-nav, « ISSE / Taux MB » KPI principal). L'éleveur engraisseur ivoirien lambda installe → voit « 11 EN MATERNITÉ » → désinstalle dans la semaine. Couverture marché actuelle :

| Profil | Couverture | Friction principale |
|---|---|---|
| Engraisseur pur | ~40 % | Bottom-nav REPRO inutile, KPIs hors sujet, /today vide |
| Naisseur | ~85 % | Engraissement absent, pas de phase finition |
| Naisseur-engraisseur | ~95 % | Doit jongler entre 2 logiques mélangées |

**Levier** : 1 question d'onboarding (3 boutons) déverrouille +60 % du TAM cible.

---

## 2. Schéma DB

Pas d'`ALTER TABLE`. On exploite `farms.metadata` (jsonb, NOT NULL, déjà présente).

```jsonc
// farms.metadata
{
  "profil": "naisseur" | "engraisseur" | "cycle_complet",
  "profilSetAt": "2026-05-12T14:30:00Z",
  /* … reste du metadata existant */
}
```

**CHECK constraint optionnel (V2)** : pour valider l'enum côté DB. Différé phase 1a — pas critique au lancement (TS contraint déjà).

**Migration data existante** :
- Toutes les fermes actuelles n'ont pas `metadata.profil` → fallback applicatif `'cycle_complet'` (comportement le plus large, casse rien).
- Compte audit (`0f2577f1-...`) → on peut le set `'cycle_complet'` à la main pour cohérence test.

---

## 3. Helper TS

Nouveau fichier `src/lib/farmProfile.ts` :

```ts
export type FarmProfile = 'naisseur' | 'engraisseur' | 'cycle_complet';

export const FARM_PROFILES: { value: FarmProfile; label: string; description: string }[] = [
  { value: 'naisseur',       label: 'Naisseur',       description: 'Truies, saillies, mises-bas, vente porcelets sevrés' },
  { value: 'engraisseur',    label: 'Engraisseur',    description: 'Achat porcelets, pesées, finition, vente carcasses' },
  { value: 'cycle_complet',  label: 'Cycle complet',  description: 'Naisseur + engraisseur (de la saillie à la vente)' },
];

export function readFarmProfile(metadata: unknown): FarmProfile {
  if (!metadata || typeof metadata !== 'object') return 'cycle_complet';
  const p = (metadata as Record<string, unknown>).profil;
  if (p === 'naisseur' || p === 'engraisseur' || p === 'cycle_complet') return p;
  return 'cycle_complet';
}
```

Hook React `src/context/useFarmProfile.ts` :

```ts
export function useFarmProfile(): FarmProfile {
  const { metadata } = useFarm(); // ou farmContext.farm.metadata
  return useMemo(() => readFarmProfile(metadata), [metadata]);
}
```

Setter :

```ts
export async function setFarmProfile(farmId: string, profil: FarmProfile): Promise<void> {
  // merge dans metadata existante via Supabase RPC ou update direct
  const { data: current } = await supabase.from('farms').select('metadata').eq('id', farmId).single();
  const newMeta = { ...(current?.metadata ?? {}), profil, profilSetAt: new Date().toISOString() };
  await supabase.from('farms').update({ metadata: newMeta }).eq('id', farmId);
}
```

---

## 4. Step onboarding

Ajouter une **première étape obligatoire** au flow onboarding existant (`OnboardingWizard` ou équivalent). Si `metadata.profil` absent à la création de ferme → step bloquant.

UI minimaliste, 3 cards verticales, large tap target (mobile terrain) :

```
┌─────────────────────────────────┐
│ Quel est ton type d'élevage ?  │
│                                 │
│ ┌───────────────────────────┐  │
│ │ 🤰 Naisseur                │  │
│ │ Truies, saillies, MB,      │  │
│ │ vente porcelets sevrés     │  │
│ └───────────────────────────┘  │
│ ┌───────────────────────────┐  │
│ │ 🐷 Engraisseur             │  │
│ │ Achat porcelets, pesées,   │  │
│ │ finition, vente carcasses  │  │
│ └───────────────────────────┘  │
│ ┌───────────────────────────┐  │
│ │ 🔄 Cycle complet           │  │
│ │ Naisseur + engraisseur     │  │
│ └───────────────────────────┘  │
│                                 │
│ Tu pourras changer plus tard    │
│ depuis Réglages › Ferme         │
└─────────────────────────────────┘
```

Changement plus tard → écran Réglages › Ferme (existant) ajouter section « Type d'élevage ».

---

## 5. Mapping conditionnel par profil

### 5.1 Bottom-nav

| Position | Naisseur | Engraisseur | Cycle complet |
|---|---|---|---|
| 1 | AUJOURD'HUI | AUJOURD'HUI | AUJOURD'HUI |
| 2 | ÉLEVAGE | ÉLEVAGE | ÉLEVAGE |
| 3 | **REPRO** | **LOTS** | **REPRO** |
| 4 | PERFORMANCE | PERFORMANCE | PERFORMANCE |
| 5 | RÉGLAGES | RÉGLAGES | RÉGLAGES |

Engraisseur perd REPRO, gagne LOTS (page Engraissement = P0 #2, à faire après).

### 5.2 FAB Saisir (actions rapides)

`SaisirSheet.tsx` actuel = 13 actions. Filtrer par profil :

| Action | Naisseur | Engraisseur | Cycle complet |
|---|---|---|---|
| Saillie | ✅ | ❌ | ✅ |
| Mise-bas | ✅ | ❌ | ✅ |
| Échographie | ✅ | ❌ | ✅ |
| Sevrage | ✅ | ❌ | ✅ |
| Retour chaleur | ✅ | ❌ | ✅ |
| **Pesée bande** | ✅ | ✅ | ✅ |
| **Réception lot** | ❌ | ✅ | ✅ |
| **Vente lot** | ❌ | ✅ | ✅ |
| Note terrain | ✅ | ✅ | ✅ |
| Soin santé | ✅ | ✅ | ✅ |
| Stock aliment | ✅ | ✅ | ✅ |
| Stock véto | ✅ | ✅ | ✅ |
| Finance | ✅ | ✅ | ✅ |

### 5.3 Page Today (/today)

| Priorité | Naisseur | Engraisseur |
|---|---|---|
| Mise-Bas Imminente | ✅ | ❌ |
| Sevrage à faire | ✅ | ❌ |
| Retour chaleur attendu | ✅ | ❌ |
| Lot atteint poids vente | ❌ | ✅ |
| Pesée hebdo due | ❌ | ✅ |
| Quarantaine fin | ❌ | ✅ |
| À vendre | ✅ | ✅ |
| Stock bas | ✅ | ✅ |
| Vaccination due | ✅ | ✅ |

### 5.4 KPIs Performance

| KPI | Naisseur | Engraisseur | Cycle complet |
|---|---|---|---|
| ISSE | ✅ | ❌ | ✅ |
| Taux MB | ✅ | ❌ | ✅ |
| IEM | ✅ | ❌ | ✅ |
| NV moyen | ✅ | ❌ | ✅ |
| Mortalité maternité | ✅ | ❌ | ✅ |
| **GMQ** | ❌ | ✅ | ✅ |
| **IC (indice consommation)** | ❌ | ✅ | ✅ |
| **Mortalité engraissement** | ❌ | ✅ | ✅ |
| **Coût/kg carcasse** | ❌ | ✅ | ✅ |
| **Marge brute/lot** | ❌ | ✅ | ✅ |

Le score global (pondération) doit aussi être recalculé selon profil.

---

## 6. Découpage en sub-tasks

### Phase 1a — Fondation (2-3h, séquentiel, **commit isolé**)
1. Créer `src/lib/farmProfile.ts` (types + helpers + constants)
2. Créer `src/context/useFarmProfile.ts` (hook React)
3. Modifier `FarmContext` pour exposer `profil` calculé
4. Ajouter step "Profil ferme" dans onboarding existant
5. Ajouter section "Type d'élevage" dans Réglages › Ferme
6. Migration data : `UPDATE farms SET metadata = metadata || '{"profil":"cycle_complet"}' WHERE NOT (metadata ? 'profil');` (mais on garde fallback applicatif)
7. Tests : unit `readFarmProfile()`, integration `useFarmProfile()`
8. Validation visuelle onboarding sur nouveau compte

**Critère done** : éleveur peut choisir son profil, c'est persisté, `useFarmProfile()` retourne la valeur partout.

### Phase 1b — Bottom-nav + FAB (2-3h, agent dédié)
1. Modifier `AgritechNavV2.tsx` : items conditionnels selon `useFarmProfile()`
2. Modifier `SaisirSheet.tsx` : actions filtrées
3. Router : ajouter route `/lots` (placeholder pour P0 #2) qui rend un EmptyState « Bientôt disponible »
4. Tests visuels 3 profils

### Phase 1c — KPIs Performance (2-3h, agent dédié, parallèle à 1b)
1. Modifier `PerformanceV70.tsx` : KPIs strip conditionnel
2. Modifier `scoreGlobal.ts` : pondération conditionnelle
3. Modifier EduCard texte selon profil
4. Tests `perfKpiAnalyzer` avec dataset engraisseur (GMQ/IC à mocker)

### Critère done global P0 #1
- ✅ Engraisseur voit "LOTS" au lieu de "REPRO"
- ✅ Engraisseur voit GMQ/IC au lieu de ISSE/Taux MB
- ✅ Engraisseur ne voit pas action "Saillie" dans le FAB
- ✅ Naisseur conserve l'expérience actuelle (zéro régression)
- ✅ Cycle complet voit tout (super-set)
- ✅ tsc=0, tests verts, push origin/main

---

## 7. Risques + rollback

### Risques
1. **Régression naisseur** : fallback `cycle_complet` doit garantir comportement actuel = défaut.
2. **Pattern revert observé en session** : commits petits + tsc systématique entre phases.
3. **Tests à updater** : `SaisirSheet.test.tsx`, `AgritechNavV2.test.tsx`, `PerformanceV70.test.tsx` (si existe).
4. **Onboarding peut bloquer connexion existante** : si on rend le step obligatoire pour tous, les comptes existants se font intercepter. Solution : step obligatoire UNIQUEMENT si `metadata.profil` absent (fallback `cycle_complet` sinon = on n'intercepte personne).

### Rollback
- 100 % révocable par `git revert` (pas de migration DB destructive).
- Si bug critique en prod : `metadata.profil` ignoré côté front (helper retourne `cycle_complet`) → app revient au comportement actuel.

---

## 8. Hors scope (sprints suivants)

- **P0 #2 — Page Engraissement** (~8-12h) : nouvelle vue `/lots` avec réception, pesées, GMQ, IC, alerte poids vente
- **P0 #3 — Calendrier vaccinal auto** (~4-6h) : scheduler basé sur âge animal + rappels J-1
- **P1 — Suivi pointu** : retours chaleur auto, perfs verrats, ration auto, DLC pharmacie, pédigrée
- **P2 — Polish UX terrain** : voice-to-text (A12 fait), photo systématique, infobulles jargon, Marius compétent
- **P3 — Différenciation** : coûts unitaires, suggestions Marius proactives, export PDF ANADER

---

## 9. Décision attendue

**Question pivot** : on attaque Phase 1a maintenant (livrable testable en 2-3h), ou on bloque sur ce plan pour revue/ajustement ?
