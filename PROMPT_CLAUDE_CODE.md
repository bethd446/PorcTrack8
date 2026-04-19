# PROMPT POUR CLAUDE CODE — Mise à jour complète PorcTrack 8

## Contexte

J'ai fait une vérification complète des Google Sheets avec un autre agent. Voici l'état réel des données au 19/04/2026. Ton audit précédent était basé sur des données qui ont depuis été mises à jour. Certains points sont résolus, d'autres restent à corriger.

**IMPORTANT : Pour chaque tâche ci-dessous, utilise TOUTES les compétences et agents à ta disposition. Découpe le travail en sous-tâches, lance des agents en parallèle quand c'est possible. Cherche dans tes skills installés — tu as notamment `mcp-magic-21` et `UI/UX Pro Max` déjà installés, prépare-les pour usage immédiat après les fixes data. Ne me demande pas confirmation pour les sous-étapes techniques — enchaîne jusqu'au résultat.**

---

## PARTIE 1 — FIXES DATA (priorité absolue)

### 1.1 — Numérotation TRUIES vs REPRODUCTION/MATERNITE

Le sheet MATERNITE utilise T1-T17, le sheet REPRODUCTION utilise T7/T8/T9..., mais TRUIES utilise T01-T19. Voici la table de correspondance RÉELLE vérifiée dans les Sheets :

| REPRODUCTION/MATERNITE | TRUIES (source app) | Boucle | Nom |
|------------------------|---------------------|--------|-----|
| T7 | T07 | B.21 | Choupette |
| T8 | T09 | B.31 | Zapata |
| T9 (REPRO) | T10 | B.37 | — |
| T14 (MATERNITE) | T15 | B.39 | Anillette |
| T15 (MATERNITE) | T16 | B.26 | Pirouette |
| T16 (REPRO) | T18 | B.85 | — |
| T17 | ❌ N'EXISTE PAS | B.86 | — |

**Action** : L'app utilise SUIVI_TRUIES_REPRODUCTION comme source de vérité. Les IDs dans REPRODUCTION/MATERNITE sont informatifs mais ne sont PAS lus par l'app. Donc **pas de renommage nécessaire dans l'app**. Par contre :
- **T17 (boucle 86)** : existe dans REPRODUCTION comme "Gestante MB 17/04" avec un log de mise-bas. **Décision : ne PAS l'ajouter dans TRUIES pour l'instant** — je vérifierai sur le terrain si c'est un animal réel ou une erreur de saisie.

### 1.2 — Statuts TRUIES à corriger (saillies du 05/04 non reflétées)

Le sheet REPRODUCTION montre des saillies le 05/04/2026, mais dans TRUIES ces truies sont encore "En attente saillie". **Corrige dans TRUIES via l'API GAS** :

| ID TRUIES | Ancien statut | Nouveau statut | Notes à ajouter |
|-----------|---------------|----------------|-----------------|
| T07 | En attente saillie | Saillie | Saillie 05/04/2026 — V1 ou V2 |
| T09 | En attente saillie | Saillie | Saillie 05/04/2026 — V1 ou V2 |
| T11 | En attente saillie | Saillie | Saillie 05/04/2026 — V1 ou V2 |
| T15 | En attente saillie | Saillie | Saillie 05/04/2026 — V1 ou V2 |
| T16 | En attente saillie | Saillie | Saillie 05/04/2026 — V1 ou V2 |

**T10** est déjà "En maternité" dans TRUIES (correctement). Ne pas toucher.

### 1.3 — Mapper STOCK_ALIMENTS (DÉJÀ CORRIGÉ)

✅ Le mapper a été corrigé pour lire `LIBELLE` au lieu de `NOM` et `STOCK_ACTUEL` au lieu de `QUANTITE`. Ce fix est déjà dans `src/mappers/index.ts`. **Vérifie juste que le build passe.**

### 1.4 — Mapper JOURNAL_SANTE (DÉJÀ CORRIGÉ)

✅ Le mapper utilise maintenant un mapping positionnel quand les headers sont vides (cas actuel du sheet SANTE). Ce fix est déjà dans `src/mappers/index.ts`. **Les 2 entrées santé (traitement T04 + observation mortalité) sont correctement parsées.**

### 1.5 — STOCK_ALIMENTS : toutes les quantités sont à 0

Les 5 aliments (Maïs grain, Truie gestation, Truie lactation, Porcelet démarrage, Engraissement) sont à 0 dans le Sheet. **C'est la réalité terrain — ne pas modifier.** L'app doit afficher ces ruptures correctement (ce qu'elle fait maintenant avec le mapper corrigé).

### 1.6 — STOCK_VETO : 85 lignes dont 78 inutiles

Seules les **7 premières lignes** sont de vrais produits véto :
1. Fer injectable — 0 doses — RUPTURE
2. Oxytetracycline — 3 flacons — BAS
3. Ivermectine — 0 ml — RUPTURE
4. Vitamines AD3E — 5 unités — OK
5. Désinfectant — 1 bidon — BAS
6. Calcium injectable — 1 bidon — BAS
7. Anti-diarrhéique — 0 ml — RUPTURE

Les lignes 8-85 contiennent un registre de traitements + protocoles biosécurité + protocoles prophylactiques mélangés. **Le mapper STOCK_VETO doit filtrer les lignes sans LIBELLE** pour ne pas créer 78 entrées fantômes. Ajoute un filtre dans `mapTable` pour STOCK_VETO :
```typescript
case 'STOCK_VETO': return rows.map(r => mapStockVeto(header, r)).filter(v => v.nom && v.nom.trim() !== '');
```

### 1.7 — ALERTES_ACTIVES : bug "Mortalité 100%"

Le sheet ALERTES_ACTIVES montre des alertes "Mortalité élevée: 100%" sur TOUTES les bandes sevrées (26-T7-01, 26-T11-01, 26-T1-01, etc.). C'est un **bug dans le calcul** — ces bandes sont sevrées normalement, la mortalité réelle est 0-16%. Vérifie `alertEngine.ts` : le calcul de mortalité semble comparer des timestamps au lieu des chiffres NV/Morts.

### 1.8 — Ligne RECAP dans PORCELETS_BANDES

La ligne `"TOTAL 15 portées"` (ID = "TOTAL 15 portées") est parsée comme une bande normale. **Filtre-la** dans mapTable :
```typescript
case 'PORCELETS_BANDES_DETAIL': return rows.map(r => mapBande(header, r)).filter(b => !b.id.startsWith('TOTAL'));
```

### 1.9 — NOTES_TERRAIN : onglet vide ou inexistant

L'API retourne `ok: false` pour NOTES_TERRAIN. Soit l'onglet n'existe pas, soit il est mal référencé. **Vérifie dans TABLES_INDEX** — s'il n'y est pas, ce n'est pas critique (les notes terrain fonctionnent sans).

---

## PARTIE 2 — VÉRIFICATION POST-FIX

Après tous les fixes :
1. `npx tsc --noEmit` → 0 erreurs
2. `npm run build` → succès
3. Relance l'audit data integrity : `node scripts/audit-sheets-data-integrity.mjs`
4. Vérifie que le Dashboard affiche :
   - **17 truies** (5 Saillie, 4 En maternité, 2 Pleine, 1 À surveiller, 5 En attente saillie)
   - **2 verrats** actifs
   - **14 bandes** (pas 15 — exclure la ligne RECAP)
   - **5 stocks aliment en rupture** (correctement nommés : Maïs grain, etc.)
   - **7 produits véto** (pas 85)
   - **0 fausses alertes mortalité 100%**

---

## PARTIE 3 — PRÉPARATION DESIGN (après fixes data)

Une fois que la data est propre et l'app à jour :

1. **Cherche et charge le skill `mcp-magic-21`** — il est installé dans le projet. Lis son SKILL.md pour comprendre ses capacités.
2. **Cherche et charge le skill `UI/UX Pro Max`** — déjà dans `.claude/skills/ui-ux-pro-max-skill/SKILL.md`. Lis-le.
3. **Prépare ces deux skills pour usage immédiat** — on va les utiliser pour refondre le design de l'app dans la prochaine session.
4. Confirme-moi quand les deux skills sont chargés et prêts, avec un résumé de leurs capacités respectives.

---

## Résumé exécutif

| # | Tâche | Statut | Action |
|---|-------|--------|--------|
| 1.1 | Numérotation T08/T17 | ℹ️ Info | Pas d'action app — différence entre sheets |
| 1.2 | Statuts saillies 05/04 | 🔴 À FAIRE | Update 5 truies via GAS API |
| 1.3 | Mapper STOCK_ALIMENTS | ✅ Fait | Vérifier build |
| 1.4 | Mapper JOURNAL_SANTE | ✅ Fait | Vérifier build |
| 1.5 | Stocks à 0 | ℹ️ Réalité | Pas d'action |
| 1.6 | STOCK_VETO 85 lignes | 🔴 À FAIRE | Filtrer lignes sans nom |
| 1.7 | Alertes mortalité 100% | 🔴 À FAIRE | Fix alertEngine.ts |
| 1.8 | Ligne RECAP bandes | 🟡 À FAIRE | Filtrer dans mapTable |
| 1.9 | NOTES_TERRAIN vide | 🟡 Vérifier | Check TABLES_INDEX |
| 2 | Vérification | 🔴 À FAIRE | Build + audit |
| 3 | Skills design | 🔴 À FAIRE | Charger mcp-magic-21 + UI/UX Pro Max |
