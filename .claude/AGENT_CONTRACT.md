# AGENT_CONTRACT — Garde-fou anti-hallucination

**Tout agent Opus/Sonnet dispatché par l'orchestrateur de PorcTrack 8 doit
respecter ce contrat. Tout rapport non conforme est rejeté et la tâche
réassignée.**

---

## Pourquoi ce contrat

Les agents tendent à :
- Sur-affirmer ("déjà implémenté", "tout passe") sans preuve reproductible
- Halluciner l'existant pour éviter d'écrire le code
- Sauter la vérification car ils savent qu'un humain re-testera
- Sortir du périmètre quand on les laisse trop libres

Ce contrat impose des **preuves reproductibles** dans chaque rapport.

---

## Règle absolue

**Une affirmation sans preuve est réputée fausse.**

Mots déclencheurs qui exigent une preuve immédiate :
- "tsc 0 erreur" → output réel de `npx tsc --noEmit`
- "tests pass" → output réel de `npm run test:unit | grep "Tests"`
- "build OK" → output réel de `npm run build | tail -1`
- "déjà implémenté" → output réel de `git log --oneline -- <fichier>`
- "fichier créé/modifié" → output réel de `wc -l <fichier>` + `git diff --stat`

Pas d'output cité = travail réputé non fait.

---

## Format obligatoire du rapport

Chaque rapport d'agent **DOIT** se terminer par ce bloc, sans exception :

```
=== VERIFICATION ===

[1] Fichiers touchés (chemin absolu + lignes)
$ wc -l <abs_path_1> <abs_path_2> ...
<coller output réel>

[2] Diff stat depuis le début de la mission
$ git diff --stat HEAD
<coller output réel ; ou "git status --short" si pas commit>

[3] Type-check
$ npx tsc --noEmit
<coller output réel ; "OK" si vide>

[4] Tests
$ npm run test:unit 2>&1 | grep -E "Test Files|Tests "
<coller output réel — chiffres exacts>

[5] Build
$ npm run build 2>&1 | tail -1
<coller output réel>

[6] Si "déjà implémenté" est mentionné
$ git log --oneline -5 -- <fichier_concerné>
<coller output réel — prouve l'historique>

[7] Tests AJOUTÉS (count avant/après)
Avant: <N1 tests>
Après: <N2 tests>
Delta: +<N2-N1>

[8] Régression check (TOUS les tests passent encore)
$ npm run test:unit 2>&1 | grep -E "failed|FAIL"
<coller output réel ; doit être vide ou "0 failed">
```

**Si un bloc est sauté, l'agent justifie pourquoi en une ligne** (ex: "[5]
Build skip car aucune modif TS — vérifié"). Pas de skip silencieux.

---

## Périmètre — règles de non-débordement

1. **Lecture seule** sur tout fichier non explicitement listé dans la
   mission. Citer `Read` ne compte pas comme modification.
2. **NE PAS toucher** aux signatures publiques des services existants
   (alertEngine, phaseEngine, perfKpiAnalyzer, reproductionDashboard,
   supabaseService, supabaseWrites) sauf si la mission le dit
   explicitement.
3. **NE PAS supprimer** un fichier marqué `@deprecated` sans vérifier qu'il
   n'a plus aucun import (`grep -r "import.*<basename>" src`).
4. **NE PAS modifier** les tests existants — uniquement ajouter de nouveaux
   tests dans des `it()` ou `describe()` séparés.

---

## Cas "déjà implémenté"

Si tu prétends qu'un livrable est déjà en place dans le repo, **prouver** :

```
=== JUSTIFICATION DÉJÀ-IMPLÉMENTÉ ===
Fichier: <abs_path>
$ git log --oneline -- <abs_path> | head -5
<output réel>

$ wc -l <abs_path>
<output réel — taille du fichier>

$ grep -c "<symbole_clé>" <abs_path>
<output réel — confirme la présence>
```

Sans ces 3 outputs, le claim est rejeté et la mission doit être refaite.

---

## Mots interdits sans contexte

Bannir les phrases vagues :
- ❌ "Ça marche" → ✅ "Test X passe : `<output>`"
- ❌ "C'est bon" → ✅ "tsc retourne `<output>`"
- ❌ "Tout est en ordre" → ✅ "Bloc VERIFICATION ci-dessous"
- ❌ "Probablement OK" → ✅ outputs réels OU note explicite "non vérifié"

---

## Si une vérification échoue

Ne pas masquer. Reporter dans `=== VERIFICATION ===` avec note :

```
[3] Type-check
$ npx tsc --noEmit
src/services/foo.ts:42 - error TS2345: ...
[STATUS] FAILED — fix tenté ligne 45 mais erreur résiduelle, à investiguer
```

L'orchestrateur préfère un rapport "FAILED with notes" qu'un faux "OK".

---

## Sanctions orchestrateur

L'orchestrateur (humain ou Claude principal) :
- **Rejette** tout rapport sans bloc `=== VERIFICATION ===` complet
- **Re-dispatche** la mission avec note "rapport non conforme : préciser
  outputs réels dans VERIFICATION"
- **Ne marque jamais** un sprint `completed` dans TodoWrite sans avoir
  vu les chiffres exacts dans le rapport
- **Spot-check** systématique sur 1 fichier minimum si l'agent a rapporté
  "déjà implémenté"

---

## Exemple de rapport conforme (court)

```
Mission RT2 — Auto-flush queue offline + SyncStatusBadge

Livré:
- src/services/offlineQueue.ts: ajout installOnlineFlushListener + isOnline
- src/hooks/useOfflineQueue.ts (nouveau, 86L)
- src/components/SyncStatusBadge.tsx (nouveau, 142L)

=== VERIFICATION ===

[1] $ wc -l src/services/offlineQueue.ts src/hooks/useOfflineQueue.ts src/components/SyncStatusBadge.tsx
   312 src/services/offlineQueue.ts
    86 src/hooks/useOfflineQueue.ts
   142 src/components/SyncStatusBadge.tsx
   540 total

[2] $ git diff --stat HEAD
 src/services/offlineQueue.ts    | 28 +++++++++
 src/hooks/useOfflineQueue.ts    | 86 ++++++++++++++++++++++++
 src/components/SyncStatusBadge.tsx | 142 +++++++++++++++++++++++++++++
 ...

[3] $ npx tsc --noEmit
OK

[4] $ npm run test:unit 2>&1 | grep -E "Test Files|Tests "
 Test Files  90 passed (90)
      Tests  1194 passed | 6 skipped (1200)

[5] $ npm run build 2>&1 | tail -1
✓ built in 2.71s

[6] N/A — création de nouveaux fichiers, pas de "déjà implémenté"

[7] Avant: 1182 tests · Après: 1194 tests · Delta: +12

[8] $ npm run test:unit 2>&1 | grep -E "failed|FAIL"
(vide — 0 failed)
```

---

## TL;DR pour l'agent pressé

1. Code la mission
2. Run la commande de chaque ligne du bloc `=== VERIFICATION ===`
3. Colle l'output **brut** (pas paraphrasé)
4. Si une étape échoue, dit-le explicitement
5. Pas d'embellissement — l'orchestrateur préfère la vérité brute
