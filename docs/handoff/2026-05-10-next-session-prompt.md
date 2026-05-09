# Prompt de relance — prochaine session PorcTrack 8

> Copie-colle ce prompt complet au démarrage de la prochaine session Claude Code sur PorcTrack 8.

---

Tu reprends le projet PorcTrack 8 après une session de sprint V75 a→x très intense (36 commits poussés en prod sur 2 jours, 41+ frictions résolues). L'app est stable en prod sur https://porctrack.tech mais il reste des points à finir.

## Mise à jour mémoire — À FAIRE EN PREMIER

Lis ces 4 fichiers DANS L'ORDRE pour te briefer :

1. `~/Desktop/PorcTrack8/.claude/AGENT_CONTRACT.md` — garde-fou anti-hallucination (bloc `=== VERIFICATION ===` obligatoire à chaque sub-agent dispatché)
2. `~/Desktop/PorcTrack8/.claude/memory/journal.md` — journal chronologique, dernières entrées V75 a→f et h
3. `~/Desktop/PorcTrack8/docs/handoff/2026-05-09-brief-senior-testeur.md` — brief que je vais transmettre au testeur humain (URLs, compte, scénarios)
4. `~/Desktop/PorcTrack8/docs/handoff/2026-05-09-crash-test-report.md` — rapport QA senior 113 checkpoints, score 96% post-fix

Les 3 derniers commits :
```
e503b83 chore: retrigger deploy v75-w+x (FTP transient)
5dddce5 fix(v75-x): retire shell legacy AgritechLayout LogeDetailView
3f0ebb2 fix(v75-w): retire shell legacy AgritechLayout VerratDetailView
```

## Compte test prod

- URL : `https://porctrack.tech`
- Email : `audit-final@porctrack.test`
- Mot de passe : `AuditFinal2026!`
- Profil : OWNER, ferme "Ferme Audit Test" (50 truies / 3 verrats / 92 porcelets actifs / 6 bandes / 0 loge)

## TODO priorisée

### Bloquants — actions infrastructure utilisateur (pas de code à pousser)

1. **Marius backend HS en prod** (P0 #1 du crash test)
   - Régénérer `VITE_MISTRAL_API_KEY` sur https://console.mistral.ai/api-keys (probable quota épuisé). Mettre à jour secret GitHub : `echo -n "NEW_KEY" | gh secret set VITE_MISTRAL_API_KEY` puis empty commit pour redeploy
   - OU configurer CORS sur VPS Hostinger llama-server (`Access-Control-Allow-Origin: https://porctrack.tech`, `Methods: POST, OPTIONS`, `Headers: Content-Type, X-API-Key`)
   - Côté code rien à faire — le message d'erreur a déjà été amélioré v75-t-2

2. **Push notifications HS** (P1 #9 crash test)
   - Configurer `VITE_VAPID_PUBLIC_KEY` (générer paire VAPID via `scripts/gen-vapid-keys.mjs` ou web-push CLI), pousser secret GitHub, redeploy

### Reste à faire côté code

3. **Tests `usePageFab.test.ts` cassés** (~30 min) — préexistants chore DS phase 2, hors scope V75 mais à investiguer
4. **F-14 Bouton retour explicite global mobile** (~1h) — feature UX
5. **F-27 Actions inline porcelets** (peser/mortalité/vente) (~2h) — feature
6. **F-35 Encyclopédie recherche** (~1h) — feature
7. **`enqueueAppendRow` migration des 2 callers** (notesApi + phaseEngine) (~1h) — finition refactor offline-queue
8. **Audit anti-AI feel transverse** (~1 jour, itératif) — voir mémoire `feedback_anti_ai_aesthetic.md` global

### Si l'utilisateur signale des frictions sur prod

Le testeur humain peut remonter de nouvelles frictions. Format attendu (cf brief testeur) :

```
F-N · titre court
- Gravité : P0/P1/P2
- Écran : URL ou nom onglet
- Reproduction : étapes 1-2-3
- Résultat attendu :
- Résultat observé :
```

Pour reproduire et fixer rapidement :
- Utilise Chrome DevTools MCP (`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`) pour naviguer en prod et confirmer
- Dispatche un sub-agent debugger ou general-purpose avec le brief précis
- Commit pattern `fix(v75-y): description`, push, surveille deploy en background
- Note les fix dans `.claude/memory/journal.md`

## Méthodes de travail confirmées

### Skill brainstorming + writing-plans + subagent-driven-development

- Toute demande non-triviale (modif >5 fichiers, nouvelle feature, migration DB) → `Skill superpowers:brainstorming` d'abord
- Spec validée par user → `Skill superpowers:writing-plans` pour plan task-par-task
- Plan validé → `Skill superpowers:subagent-driven-development` pour exécution

### Pour fix rapide (1-3 fichiers, scope clair)

- Lis le code pertinent en parallèle
- Edit/Write inline si trivial
- Sinon dispatch un subagent `general-purpose` ou `debugger` avec brief précis incluant l'AGENT_CONTRACT
- AGENT_CONTRACT bloc `=== VERIFICATION ===` obligatoire dans chaque rapport sub-agent

### Pour exécution prod

- Tests unit (`npm run test:unit`) avant commit
- `npx tsc --noEmit` doit retourner 0 erreur
- `npm run build` doit passer
- Commit conventional `fix(v75-y): description` ou `feat(v75-z): description`
- Push immédiat → Hostinger FTP deploy auto via `.github/workflows/deploy.yml`
- Surveille le run via `gh run list` puis `gh run view RUN_ID --json status,conclusion`
- Si FTP timeout transitoire (exit code 28 sur step canary), retrigger via empty commit

### Anti-patterns à éviter

- Ne pas committer sans tester (`tsc + tests + build`)
- Ne pas lancer un sub-agent sans AGENT_CONTRACT explicite
- Ne pas accepter "ça marche" sans output réel `=== VERIFICATION ===`
- Ne pas utiliser `enqueueUpdateRow` (supprimée v75-q) ni `enqueueAppendRow` (deprecated, no-op)
- Ne pas wrapper une nouvelle fiche dans `<AgritechLayout>` (pattern legacy, voir TruieDetailView pour le bon pattern V70)
- Ne pas hardcoder de couleurs hors palette `--pt-*` (vert forêt #2D4A1F, cream #F5E9D8, ambre #B8703D, ivoire #FAF7F0)
- Ne pas afficher d'UUID 8-hex à l'utilisateur (utiliser `formatBandeName()` partout)

## Helpers métier disponibles

`src/v70/lib/` :
- `formatBandeName(bande, options)` — nom lisible bande
- `reformLogic` — `isReformed`, `needsReformConsideration`, `alreadySortedOut`, `reformReason`, `formatSortieLabel`
- `porceletPhase` — `derivePorceletPhase(porcelet, bande)` 5 phases
- `truiePerformanceEco(truie, bandes, config)` — KPIs économiques
- `scoreGlobal(kpis)` — A/B/C/D
- `formatters` — `formatDateFr`, `formatPoids`, `titleCase`

## État technique

- 1950 unit tests passing | 5 skipped | 4 fails préexistants `usePageFab.test.ts`
- 19 specs Playwright (3 naming-coherence + 5 landing-v75 + 2 porcelets + 7 audit-éleveur-pro + 2 préexistantes)
- 0 erreur tsc, build OK 3s
- 0 caller runtime de `enqueueUpdateRow` (fonction supprimée)
- Toast SW post-deploy actif (`<PwaUpdatePrompt>` monté dans `main.tsx`)
- 3 secrets GitHub configurés (Mistral + Marius VPS) + 6 env vars exposées au build

## Première chose à faire

Demande à l'utilisateur :

> Salut. J'ai relu la mémoire — sprint V75 a→x clos, 36 commits, app prod stable à 96% crash test. Tu veux qu'on attaque quoi en priorité ?
> 
> 1. Configurer Marius (Mistral key + CORS VPS) → action infra que je guide
> 2. Configurer VAPID push notifs → action infra que je guide
> 3. Investiguer les 4 fails `usePageFab.test.ts` préexistants
> 4. Implémenter F-14 / F-27 / F-35 features restantes
> 5. Audit anti-AI feel transverse (~1 jour)
> 6. Retour testeur humain à intégrer (s'il a remonté des frictions)
> 7. Autre direction

N'enchaîne pas sans réponse explicite. Si l'utilisateur a déjà un retour testeur humain à donner, prends-le en priorité.

---

**Bonne reprise.**
