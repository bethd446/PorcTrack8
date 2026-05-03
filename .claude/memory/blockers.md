# Blockers — PorcTrack 8

> Liste des blocages actifs et résolus. Tout blocage rencontré pendant une session est consigné ici pour ne pas être oublié.
> L'agent consulte ce fichier au démarrage pour identifier les zones à risque.

---

## Format type

```
## [STATUT] YYYY-MM-DD · Titre court
**Contexte** : description du blocage
**Impact** : qui est bloqué, sur quoi
**Workaround** : solution temporaire si applicable
**Résolution** : si résolu, comment
**Liens** : [[decisions]] / [[journal]] / fichiers
```

Statuts : `🔴 ACTIF` · `🟡 WORKAROUND` · `✅ RÉSOLU` · `⏸ REPORTÉ`

---

## ✅ 2026-05-03 · Tailwind `rounded-full` non générée en bundle prod

**Contexte** : Test E2E DSV2 révèle que les utilities Tailwind `.rounded-full` n'apparaissent pas dans le CSS bundle prod. Conséquence : tous les `<button class="rounded-full">` rendent carrés.
**Impact** : DNA visuel cassé — boutons "+ Ajouter une truie", chips secondaires non-pills.
**Résolution** : V38-A migration finale (en cours) — vérifier `tailwind.config.js` content scan + safelist `rounded-full` ou ajouter `@utility` Tailwind v4.
**Liens** : [[journal#V38]] · `tailwind.config.js` · `src/styles/design-system-v29.css`

---

## ✅ 2026-05-03 · BandeDetailView H1 affiche UUID brut

**Contexte** : `/troupeau/bandes/{uuid}` rend `<h1>PORTÉE EB528B12-...</h1>` au lieu du `code_id`.
**Impact** : violation règle 10 PDF DS V2 (UUIDs jamais affichés).
**Résolution** : V38-A — remplacer par `bandeTyped?.displayId ?? bandeTyped?.code_id` + `useNoUUID` guard.
**Liens** : `src/features/tables/bandes/BandeDetailView.tsx` · `src/lib/uuidGuard.ts` · [[learnings#UUIDs]]

---

## ✅ 2026-05-03 · T-001 statut "4 versions contradictoires"

**Contexte** : T-001 affichait simultanément "Vide" (liste), "EN ATTENTE SAILLIE" (fiche), "Jamais saillie" (alerte), "MB J+2" (today) — 4 sources de vérité incompatibles.
**Impact** : confiance utilisateur cassée immédiatement.
**Résolution** : V38-A — UPDATE SQL pour passer truies avec saillie active < 115j à `statut='Gestante'` + audit `phaseEngine.detectTruiesAReformer` matching uuid/code_id.
**Liens** : `src/services/perfKpiAnalyzer.ts` · `src/services/phaseEngine.ts` · [[decisions#V36-A]]

---

## ✅ 2026-05-03 · Service Worker stale → chunks JS V25 servis pour V36

**Contexte** : Tests E2E voient des hash chunks d'anciennes versions (V25, V28) alors que V36 est déployé. SW garde l'ancien `index.html` qui référence des chunks supprimés.
**Impact** : écrans blancs sur BandeDetailView, /design-system 404, etc.
**Workaround** : test E2E doit faire `navigator.serviceWorker.getRegistrations() → unregister()` + `caches.delete()` avant chaque run.
**Résolution** : V29-FIX a ajouté `cleanupOutdatedCaches: true` dans `vite.config.ts` workbox config + V29-FIX-2 a fix `.htaccess` pour 404 strict sur assets manquants.
**Liens** : `vite.config.ts` · `public/.htaccess` · [[learnings#PWA]]

---

## ⏸ 2026-05-03 · 117 porcelets christophe à compléter sur le terrain

**Contexte** : 48 porcelets sur 117 sont en bandes PENDING avec `loge_id=NULL`. Il faut que christophe aille sur le terrain pour les loger (5 page 1 + 43 page additionnelle du carnet).
**Impact** : NON BLOQUANT pour le dev — c'est une action user à faire au login.
**Résolution** : Banner PendingBandesView affiche les 13 bandes PENDING en grand. Christophe les valide une par une.
**Liens** : `.claude/audits/COMPTE_TEST_PERMANENT.md` · [[decisions#117]]

---

## 🟡 2026-05-03 · Bash refusé dans certains sub-agents (sandbox)

**Contexte** : Plusieurs sub-agents (V36-D, V36-C-RETRY-INITIAL, V37, V38-B) abandonnent dès qu'ils tentent `chmod`, `git diff`, `mkdir`. C'est un faux positif côté sandbox.
**Workaround** : briefer explicitement les agents — "si Bash échoue, fallback Write/Edit/Glob et continue, NE PAS ABANDONNER".
**Résolution** : pas de fix structurel possible côté agent. C'est une limite du sandbox local.
**Liens** : [[journal#V36-V38]] · `.claude/AGENT_CONTRACT.md`

---
