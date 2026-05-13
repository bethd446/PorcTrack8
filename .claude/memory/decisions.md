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

## 2026-05-02 · [V26] Pays par défaut Belgique pour christophe / EUR auto · **🚫 RÉVOQUÉE PAR V43.3 (2026-05-13)**

**Contexte** : Compte christophe affichait FCFA partout (fallback métier Afrique de l'Ouest).
**Options** :
- A — Demander à christophe de setter son pays (friction)
- B — Setter directement `pays='Belgique'` côté DB pour ce farm_id
**Décision** : B
**Raison** : Christophe est belge, devise EUR évidente. Pas de friction.
**Liens** : `src/lib/currency.ts` · [[journal]]

**🚫 STATUT 2026-05-13** : Cette décision est **révoquée** par la décision V43.3 — *"plateforme PorcTrack uniformisée en FCFA, peu importe le pays"*. Cf `src/lib/currency.ts:22` (commentaire d'entête), `CLAUDE.md:213`, et `MaFermeV70.tsx` (V77, *"la plateforme est FCFA only, pas dérivée du pays"*). L'affichage `Belgique · FCFA` sur `/reglages/ma-ferme` n'est PAS un bug — c'est le comportement attendu V43.3. Si multi-devise doit être restauré un jour, ce sera un sprint dédié (currency.ts, FarmContext, formatCurrency call sites, tests).

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

## 2026-05-08 · [DECISION] Une bande peut occuper jusqu'à 2 loges (F+M) {#bande-2-loges}

**Contexte** : éleveur Christophe a précisé le scénario métier : à 2 mois, les porcelets sont sexés et séparés F/M. Une "bande" (cohorte issue d'une portée) peut donc être logée sur 2 loges distinctes (1 femelles, 1 mâles), ou rester sur 1 loge mixte en cas de petit effectif d'urgence.

**Options envisagées** :
- A — Table de jointure `batch_loges (batch_id, loge_id, sex_filter)` avec trigger max 2 — propre mais migration lourde
- B — Colonnes `batches.loge_male_id` + `loge_female_id` — explicite mais rigide
- C — Colonne `porcelets_individuels.loge_id` (chaque porcelet a sa loge effective, dédoublonnage côté lecture) — minimal, flexible

**Décision** : C — `porcelets_individuels.loge_id` ajouté (FK loges, ON DELETE SET NULL).
**Raison** : permet aussi les déplacements futurs porcelet-par-porcelet sans toucher à la bande. Schéma minimal. Helper `listLogesEffectivesParBande` calcule les 1 ou 2 loges côté lecture.
**Liens** : `src/features/onboarding/PorceletsReorgWizard.tsx` · `src/services/supabaseWrites.ts:listLogesEffectivesParBande` · migration `v72_porcelets_loge_id`

---

## 2026-05-08 · [DECISION] Numéro de bande saisi librement par l'éleveur {#numero-bande-libre}

**Contexte** : ancien wizard générait un `code_id` auto type `B-2026-05-02-PAGE1-F` (date + suffixe technique). L'éleveur préfère saisir lui-même son code (ex: "001", "2026-A", "BANDE-MARS") pour matcher ses pratiques registre papier.

**Options envisagées** :
- A — Format imposé incrémental B-001/B-002 (calculé auto) — moins flexible
- B — Hybride pré-rempli modifiable — peut frustrer si template ne correspond pas
- C — Champ texte libre + validation unicité — match le besoin terrain

**Décision** : C — input texte libre, validation `validationNumeroBandeUnique(code, existingBatches)` (case-insensitive + trim).
**Raison** : respect des conventions existantes de l'éleveur. Migration douce depuis cahier papier.
**Liens** : `src/features/onboarding/PorceletsReorgWizard.tsx:validationNumeroBandeUnique`

---

## 2026-05-08 · [DECISION] Push notifications = Web Push standard (VAPID), pas FCM {#push-vapid}

**Contexte** : besoin de notifications push pour app fermée (mobile + desktop PWA). Choix protocole.

**Options envisagées** :
- A — FCM (Firebase Cloud Messaging) — multi-device mais ajoute dépendance Firebase
- B — APNs direct (iOS) + FCM (Android) — fragmente le code
- C — Web Push standard (VAPID) — protocole W3C, supporté Chrome/Firefox/Safari iOS 16.4+ (PWA installée)

**Décision** : C — Web Push VAPID + Edge Function Supabase `send-push` (web-push@3.6.7 sur Deno).
**Raison** : 0 dépendance externe (Firebase), même code pour tous browsers, RLS naturelle via Supabase. Limitation iOS (PWA installed only) acceptée.
**Liens** : `supabase/functions/send-push/index.ts` · `src/services/pushSubscription.ts` · `public/push-handler.js`

---
