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

---

## ✅ 2026-05-17 · F-01 CRITICAL · Clé Mistral + token VPS Marius leakés en prod

**Contexte** : Audit security-reviewer 2026-05-17 (Claude PC) découvre que `VITE_MISTRAL_API_KEY` (TQXuKoW07nHON72h1j0cCGyhJW4Rc7Rm) et `VITE_MARIUS_API_KEY` (marius-secret-key-2026) sont inlinées dans `dist/assets/index-D9ZZxbo1.js` du bundle servi sur porctrack.tech. Spot-check orchestrateur confirme : `grep TQXuKoW dist/assets/*.js` retourne 2 hits, et la même clé est servie en live via `curl https://porctrack.tech/assets/index-D9ZZxbo1.js`.
**Impact** : exfiltration possible en 30s via DevTools → Network. Facturation Mistral + accès non-autorisé VPS Marius.
**Résolution** (commit f475872) : rotation clé Mistral + injection server-side via Edge Function secrets + refactor mariusApi.ts/ChatbotWidget.tsx pour appeler uniquement l'Edge Function + retrait VITE_* du .env.local + rebuild + redeploy. Verify post-deploy : 0 occurrence des clés dans le bundle prod actuel.
**Liens** : [[learnings#Vite VITE_*]] · [[decisions#Marius Edge Function]]

---

## ✅ 2026-05-17 · F-04 HIGH · profiles UPDATE policy sans WITH CHECK (auto-promotion role)

**Contexte** : policy `profiles_update_own` avait `USING (auth.uid() = id)` mais aucun `WITH CHECK`, permettant à un user authentifié d'exécuter `UPDATE profiles SET role='OWNER', is_super_admin=true WHERE id=auth.uid()`.
**Impact** : escalation de privilège silencieuse possible pour tout user inscrit.
**Résolution** (migration v82_prevent_profile_role_escalation, commit f475872) : trigger BEFORE UPDATE qui RAISE EXCEPTION si `auth.role() != 'service_role'` et `NEW.role`/`is_super_admin`/`id` diffèrent de OLD. service_role bypass pour migrations admin.
**Liens** : [[learnings#Trigger BEFORE UPDATE]]

---

## ✅ 2026-05-17 · F-05 MEDIUM · Headers HTTP sécu absents en prod

**Contexte** : Hostinger CDN par défaut ne renvoie aucun header de sécurité (`curl -I https://porctrack.tech/` ne montrait ni HSTS, ni X-Frame-Options, ni Referrer-Policy).
**Impact** : risque clickjacking, MIME-sniffing, fuite référent.
**Résolution** (commit f475872) : 5 headers `always set` ajoutés dans `public/.htaccess` :
- HSTS `max-age=31536000; includeSubDomains; preload`
- X-Frame-Options DENY
- X-Content-Type-Options nosniff
- Referrer-Policy strict-origin-when-cross-origin
- Permissions-Policy (camera/mic en self pour Capacitor, payment/usb/geo désactivés)
**Liens** : `public/.htaccess` · OWASP A05 Security Misconfiguration
