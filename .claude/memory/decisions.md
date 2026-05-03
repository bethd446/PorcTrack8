# Decisions — PorcTrack 8

> Registre chronologique des décisions architecturales, métier et UX prises pendant le développement.
> Chaque décision a un contexte, des alternatives écartées, et la raison du choix.
> L'agent consulte ce fichier au démarrage pour ne pas remettre en cause des choix actés.

---

## Format type

```
## YYYY-MM-DD · [DECISION] Titre court
**Contexte** : pourquoi la décision se pose
**Options envisagées** :
- A — pros / cons
- B — pros / cons
**Décision** : option retenue
**Raison** : argument décisif
**Liens** : [[learnings]] / [[journal]] / fichiers `src/...`
```

---

## 2026-05-03 · [V36] Truies "en cycle" plutôt que "productives"

**Contexte** : `/pilotage/perf` affichait "0/50 productives" alors que 31 saillies actives.
**Options** :
- A — Garder définition stricte "productive = a sevré au moins 1 portée" → 0/50 honnête mais trompeur sur compte test sans portées
- B — Élargir à "en cycle = portée OU saillie active" → 31/50 honnête
**Décision** : B
**Raison** : pour un éleveur en démarrage sans portées sevrées, "0 productive" donne l'impression que rien ne marche alors que 31 truies sont en gestation.
**Liens** : [[learnings]] · `src/services/perfKpiAnalyzer.ts` · `src/features/pilotage/PerfKpiView.tsx`

---

## 2026-05-03 · [V36] Splitter une bande au lieu de tout re-saisir

**Contexte** : Christophe a 22 mâles dans une bande "ADDM" sans loge. Pour les répartir dans plusieurs loges, l'app actuelle l'oblige à supprimer + recréer.
**Options** :
- A — Garder workflow actuel (delete + create)
- B — Wizard dédié `QuickSplitBandeForm` qui sélectionne un sous-ensemble + nouvelle loge + INSERT batch + UPDATE porcelets
**Décision** : B
**Raison** : Workflow professionnel attendu, conserve l'historique, évite les erreurs de re-saisie.
**Liens** : `src/components/forms/QuickSplitBandeForm.tsx` · `src/components/forms/quickSplitBandeLogic.ts` · [[journal]]

---

## 2026-05-03 · [V36] Doublons boucles autorisés mais signalés

**Contexte** : Christophe a 3× la boucle `B45` dans son carnet (loges différentes, porcelets distincts).
**Options** :
- A — Bloquer la saisie (UNIQUE constraint stricte)
- B — Autoriser et signaler en warning amber non-bloquant
**Décision** : B
**Raison** : Réalité terrain — la boucle physique peut être réutilisée volontairement. Bloquer = empêche la saisie carnet papier.
**Liens** : `src/components/forms/quickAddPorceletLogic.ts` · `migrations/2026_05_02_v26d_porcelets_boucles_non_uniques.sql`

---

## 2026-05-02 · [V26] Pays par défaut Belgique pour christophe / EUR auto

**Contexte** : Compte christophe affichait FCFA partout (fallback métier Afrique de l'Ouest).
**Options** :
- A — Demander à christophe de setter son pays (friction)
- B — Setter directement `pays='Belgique'` côté DB pour ce farm_id
**Décision** : B
**Raison** : Christophe est belge, devise EUR évidente. Pas de friction.
**Liens** : `src/lib/currency.ts` · [[journal]]

---

## 2026-05-02 · [V26b] 1 sexe = 1 bande dans 1 loge

**Contexte** : Le carnet christophe utilise des numéros de boucle distincts pour les vertes (F) et bleues (M).
**Options** :
- A — Garder UNIQUE(farm, boucle) — exclut sexe
- B — UNIQUE(farm, boucle, sexe) — F-B27 et M-B27 distincts
**Décision** : B
**Raison** : Convention métier réelle de Christophe + lever batches_loge_active_unique pour permettre 2 bandes/loge.
**Liens** : `migrations/2026_05_02_v26b_loges_groupage_porcelets.sql` · [[learnings]]

---
