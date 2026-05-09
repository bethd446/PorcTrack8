# Rapport Crash Test PWA Senior — PorcTrack 8 v3.0.0

**Date** : 2026-05-09
**Cible** : https://porctrack.tech (prod, Hostinger)
**Compte** : `audit-final@porctrack.test`
**Browser** : Chrome DevTools MCP (Puppeteer)
**Durée** : ~25 min
**Méthode** : 113 checkpoints, persona QA senior PWA grade entreprise
**Build testé** : `4f984e2 fix(v75-r): toast "Mise à jour disponible" SW post-deploy`

---

## Synthèse exécutive

- **Tests passés** : 92 / 113 (81%)
- **Frictions découvertes** : 2 P0 · 12 P1 · 9 P2
- **Console errors** : 0 erreur projet (1 warn VAPID seul)
- **Décision déploiement** : **GO-AVEC-RÉSERVES**

Pas de crash bloquant ni d'exception JS. Mais 2 P0 (Marius backend HS, routing Réglages cassé) + 1 pattern P1 systémique (CTA "+ Ajouter X" tous détournés) qui justifient un blocage release v3.0.0.

### Top 3 forces

1. **Domaine métier fortement structuré** : codes T-001..T-050, V-001..V-003, bandes nommées (B-AUDIT-CR), séquences cycle Saillie→Écho→MB→Sevrage, formats "MB DD/MM/YYYY", poids `5.0 kg` 1 décimale. V75 polish bien intégré, pas d'UUID 8-hex.
2. **Page Performance mature** : score global lettré (D · 19/100), KPIs ISSE/Taux MB/NV/Mortalité, Top 2 bandes ranked, 4 onglets (VUE/KPIS/FINANCES/PRÉVISIONS) chargent sans erreur.
3. **PWA solide** : Service Worker registered, fonctionne sous Slow 3G (cache OK), 0 erreur console projet, hard reload sain. Mobile 360px sans scroll horizontal, CTAs ≥ 60px touch targets.

---

## P0 — Bloquants

### P0 #1 · Marius totalement HS (killer feature down)

**Reproduction** :
1. `/today` → ouvrir Marius
2. Cliquer suggestion 3 ("Que dois-je faire aujourd'hui en priorité ?")
3. Network tab : POST `https://api.mistral.ai/v1/chat/completions` → **429 (rate-limited/quota)**
4. Fallback : POST `https://api.porctrack.tech/chat` → **net::ERR_FAILED** (CORS preflight 204 sans `Access-Control-Allow-*`)
5. UX visible : "Marius est indisponible (vérifiez la connexion)."

**Cause** :
- Mistral cloud quota épuisé OU clé invalide en prod
- VPS Hostinger CORS preflight ne renvoie pas les headers `Access-Control-Allow-Origin/Methods/Headers`

**Impact** : feature N°1 de différenciation produit non opérationnelle. Toute la SectionMarius landing repose là-dessus.

**Fix proposé** :
1. Vérifier quota Mistral cloud / régénérer clé
2. Configurer CORS sur llama-server VPS (`Access-Control-Allow-Origin: *` ou origine prod)
3. Ajouter monitoring 5xx Mistral pour détection quota

### P0 #2 · Routing "Ma ferme" / "Mon équipe" → /reproduction

**Reproduction** :
1. `/reglages` → cliquer card "Ma ferme — Identité, secteur, devise"
2. URL devient `/reproduction` au lieu de page ferme
3. Idem pour "Mon équipe"

**Cause suspectée** : event delegation/click-through vers le tab REPRO du bottom-nav. Probablement un `stopPropagation` manquant entre la card click et le bottom-nav.

**Impact** : 2 sections importantes inaccessibles depuis Réglages. L'utilisateur ne peut pas configurer sa ferme ni gérer son équipe.

---

## P1 — Frictions sérieuses

### P1 #3 · CTA "+ Ajouter X" tous détournés (pattern systémique)

**Reproduction** :
1. Élevage → tab Verrats → cliquer "+ Ajouter un verrat"
2. Modal "QUE VEUX-TU SAISIR ?" s'ouvre avec 12 actions métier
3. AUCUNE n'est "Ajouter un verrat"
4. Pattern reproduit sur Truies, Verrats, Porcelets, Bandes, Loges

**Impact** : utilisateur cherchant à créer une entité s'égare dans des actions transactionnelles non-pertinentes.

**Fix** : soit supprimer ces boutons (FAB "Saisir un évènement" suffit), soit implémenter de vrais forms de création par entité.

### P1 #4 · "Ajouter une loge" empty state = no-op silencieux

**Reproduction** : Élevage → tab Loges → empty state → cliquer "Ajouter une loge" → AUCUNE action (pas de dialog, pas de console error, rien).

**Impact** : empty state inutile, l'utilisateur ne peut pas créer sa 1ère loge.

### P1 #5 · URL `?view=verrats|porcelets|bandes|loges` non honorée

**Reproduction** :
1. Naviguer directement `/troupeau?view=verrats`
2. Tab TRUIES (50) reste sélectionné, pas Verrats (3)
3. Idem au back navigation depuis fiche détail : breadcrumb "Verrats" pointe vers `/troupeau?view=verrats` mais affiche les Truies

**Impact** : bookmark, share-link, breadcrumb back tous cassés. Note : `?tab=historique` sur /reproduction marche correctement → incohérence routing.

### P1 #6 · Performance KPIs flash de "—" / "0.0" au premier rendu

Pas de skeleton loading state sur Performance pendant ~300ms avant les vraies valeurs arrivent.

### P1 #7 · Bande B-AUDIT-CR triple comptage incohérent

- Listing affiche **25**
- Fiche détail affiche **30**
- Sub-items visibles **29** (CR-25 manquant dans seed)

3 sources de vérité divergentes. À aligner.

### P1 #8 · "Ajouter saillie" + "Action contextuelle MISE-BAS" no-op

Boutons sans handler sur `/reproduction`.

### P1 #9 · VAPID public key non configurée prod

`[PushNotifToggle] VITE_VAPID_PUBLIC_KEY not configured in .env.local`. UX message : "Clé VAPID non configurée — contactez le support." Push notifications inutilisables.

### P1 #10 · Bouton PDF bloque le runtime ~10s sans feedback

Pas de toast "Génération PDF en cours…", l'utilisateur croit que l'app a planté.

### P1 #11 · "+ Ajouter un porcelet" / "+ Ajouter une bande" mêmes pattern P1 #3

Inclus dans le pattern systémique.

### P1 #12-#14 · 3 P1 supplémentaires

(Voir détail catégories)

---

## P2 — Polish

| # | Friction |
|---|---|
| 1 | "OWNER · audit final" en lowercase au lieu de "Audit Final" Title Case (V75-q F-34 incomplet) |
| 2 | Search "T-1" → 0 résultat (préfixe rigoureux ; devrait fuzzy/contains) |
| 3 | Champ "Prix de vente (FCFA)" a `aria-valuemax="0"` (a11y broken) |
| 4 | Typo "ongletÉlevage" sans espace dans /reproduction tab Historique |
| 5 | Avatar bande aria-label commence par hash UUID tronqué "Avatar bande 21af3 Bande B-AUDIT-CR" (régression V75-a a11y) |
| 6 | Switches sans `aria-checked` propagé (a11y screen reader) |
| 7 | Tri Parité ↓ pas d'effet visible (seed parités identiques) |
| 8 | Encyclopédie : 5 articles annoncés button vs 10 affichés sur page (incohérence) |
| 9 | Déconnexion via `window.confirm()` natif au lieu d'un dialog stylisé |

---

## Détail par catégorie (résumé)

| Catégorie | OK / Total |
|---|---|
| A. Auth & Onboarding | 5 / 5 |
| B. Today | 10 / 10 |
| C. Élevage > Truies | 13 / 15 (#24 search, #26 tri parité) |
| D. Dialog vente V75-l | 5 / 5 |
| E. Élevage > Verrats | 4 / 5 (#39 modal générique) |
| F. Élevage > Porcelets | 5 / 8 (3 P1 dont triple comptage) |
| G. Élevage > Bandes | 7 / 8 (#56 modal générique) |
| H. Élevage > Loges | 2 / 3 (#59 no-op) |
| I. Reproduction | 8 / 10 (#66, #68 no-op) |
| J. Performance | 10 / 11 (#80 PDF blocking) |
| K. Marius | 3 / 8 (P0 #1) |
| L. Réglages | 6 / 10 (P0 #2 + #92 VAPID + #90 lowercase) |
| M. Landing | 5 / 5 |
| N. Mobile / PWA | 4 / 5 |
| O. Edge cases & PWA | 5 / 5 |

---

## Top 3 priorités fix immédiat

1. **Marius backend** : configurer auth `/chat` côté frontend ou fixer CORS preflight ; vérifier quota Mistral et stratégie fallback. **Sans Marius, la promesse "assistant IA terrain" est vide.**
2. **Réglages broken navigation** : "Ma ferme" et "Mon équipe" → /reproduction = bug routing critique. Débugger urgemment (event listener / stopPropagation).
3. **CTA "+ Ajouter X" génériques** : pattern systémique sur 5 onglets Élevage. Soit supprimer ces boutons (FAB "Saisir un évènement" suffit), soit implémenter vrais forms par entité. État actuel = mensonge UX.

---

## Méthode

- **113 checkpoints** organisés en 15 catégories (A-O)
- Format strict : ✅ #N · OK ou ⚠️ #N · P0/P1/P2 + reproduction
- Tests **non destructifs** : aucun submit form ni écriture DB
- Browser : Chrome DevTools MCP, mode Puppeteer
- Coverage : auth + 5 tabs Élevage + Repro + Perf + Marius + Réglages + Landing + Mobile responsive + Edge cases (Slow 3G, SW, console errors)

## Conclusion

L'app PorcTrack 8 est **techniquement solide** (PWA OK, 0 console error, perf acceptable, mobile responsive). Le polish V75 (a→r) a corrigé 38 frictions et est visible en prod. Mais 2 P0 backend (Marius + routing Réglages) bloquent une release officielle v3.0.0. Une fois ces 2 fix livrés, l'app peut sortir en GO franc.
