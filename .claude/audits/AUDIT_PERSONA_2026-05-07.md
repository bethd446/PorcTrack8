# Audit persona ÉLEVEUR — porctrack.tech (2026-05-07)

> **Persona** : Aïssata, éleveur professionnel curieux qui découvre PorcTrack pour la première fois. Bottes + gants, mobile Android sous plastique, 4G capricieux, contexte ferme moyenne (50-150 truies).
>
> **Compte test** : `audit-final@porctrack.test` (ADMIN, ferme "Ferme Audit Test" Belgique = devise EUR, 50 truies + 3 verrats + 31 saillies + 3 bandes + 11 porcelets seedés). T-001 = saillie J-113 → MB attendue J+2. T-004 = Gestante J57. B-AUDIT-MB = sous-mère 11 porcelets.
>
> **Méthode** : parcours méthodique mobile 390×844 viewport touch, hard refresh + SW unregister, navigation 5 tabs V70 + 1 fiche détail. Frictions notées au format AGENT_CONTRACT (PERSONA_ELEVEUR.md grille).
>
> **Branche prod** : main @ `5df68d9` (Deploy to Hostinger 2026-05-07 17:23 success).

---

## Verdict global (note /10)

| Dimension | Note | Commentaire |
|---|---|---|
| **Cohérence DS** | 5/10 | 4 tokens `--pt-*` propres mais emojis Unicode partout (BottomNav, ListItems Réglages, KPI cards, hero icons). Pas de Lucide cohérent. |
| **Données réelles** | 3/10 | **Hero Today T-018 hardcodé** (alors que T-001 est la vraie MB imminente), eyebrow "145 ANIMAUX" vs 64 réels, KPIs Performance partiellement stubs (16% taux MB, 12.4 NV, 3.2% mortalité), "MB 7J = 0" alors que T-001 J-113 = MB dans 2j. V71.1+V71.2 ont prétendu fixer ces stubs mais soit le déploiement n'a pas pris soit le code reste branché sur des constantes. |
| **Cohérence statuts** | 4/10 | T-001 affiché "VIDE / En attente saillie" alors que seed dit T-001 a saillie J-113 active. Régression depuis V38-A (cf `blockers.md` "T-001 statut 4 versions contradictoires"). Counts pills `Pleines (28) / Maternité (11) / Vides (6)` ne matchent pas les vrais 30/10/5 du seed. |
| **Lisibilité terrain** | 5/10 | UPPERCASE labels lisibles ✓, mais touch targets dismiss alerte/btn-sm/breadcrumb sub-44px (gants impossibles), JetBrains Mono déclarée mais @font-face manquant → fallback monospace système (rendu OEM variable). |
| **Workflows** | 6/10 | 5 onglets logiques ✓, FAB "Ajouter saillie" bien placé sur Repro ✓, fiche truie riche (Lignée + Repro + Vitales + Marius IA), mais navigation /today → action saillie reste 3+ taps. |
| **Pédagogie** | 8/10 | EduCard "Le saviez-vous ?" avec termes en accent ✓, encyclopédie 5 articles ✓, tooltips ISSE/IEM/Mortalité présents ✓. Excellent point. |
| **Mobile-first** | 6/10 | Viewport responsive ✓, BottomNav 5 tabs ✓, mais emojis BottomNav pas Lucide → rendu différent Samsung One UI vs stock Android. |

**Note moyenne : 5.3/10**. Pour devenir un produit pro incontournable, il faut viser ≥8/10. **Le bloquant principal est le décrochage entre les claims V71 et la réalité prod**. Toutes les data live promises (FarmContext branché) sont visiblement encore sur stubs en production.

---

## Top 20 frictions (priorisées P0 → P2)

### P0 — Critiques bloquantes (à fixer en V71.3 immédiat)

| # | Écran | Action | Observé | Friction | Fix proposé |
|---|---|---|---|---|---|
| **1** | `/today` Hero | Lecture priorité MB | "MISE-BAS IMMINENTE — T-018 · prévue demain" alors que T-018 n'existe pas dans ce compte. T-001 est la vraie MB imminente (saillie J-113). | F12 données fausses + perte confiance immédiate | `TodayV70.tsx` — lire la bande la plus proche de MB depuis `useFarm().bandes` filtrer `dateMB <= now+7j ORDER BY dateMB ASC LIMIT 1`, fallback "Aucune mise-bas dans 7 jours" si vide. Ne JAMAIS hardcoder un T-XXX. |
| **2** | `/today` Stats | Lecture cheptel | "MON ÉLEVAGE 50 / 3 / **92** / **6**" — 92 porcelets et 6 bandes hardcodés (vrais : 11 / 3) | F12 données fausses | `TodayV70.tsx` — `bandes.reduce((sum, b) => sum + (b.porcelets_vivants ?? 0), 0)` et `bandes.length`. V71.1 prétendait l'avoir fait mais le branchement ne sort pas en prod. Vérifier que le calcul est dans `useMemo` et que `useFarm()` retourne les bonnes data. |
| **3** | `/troupeau` eyebrow | Découverte page | "ÉLEVAGE · **145** ANIMAUX" hardcodé (vrai : 50 truies + 3 verrats + 11 porcelets = 64) | F12 + F13 identité ferme floue | `AnimalsV70.tsx:eyebrow` — `${truies.length + verrats.length + porceletsTotal}` calculé live. Mettre `useMemo` sur `useFarm()`. |
| **4** | `/troupeau` pills | Filtrer truies | "PLEINES (28) / MATERNITÉ (11) / VIDES (6)" — vrais 30/10/5 seed | F12 données fausses + filtres bug | `AnimalsV70.tsx:185-210` — counts via `truies.filter(t => /pleine|gestante|gestation/i.test(t.statut ?? ''))`. Tester chaque regex contre les valeurs réelles `'En attente saillie'`, `'Pleine'`, `'En maternité'` (cf `src/types/farm.ts:16`). Probablement off-by-one car la regex ne matche pas exactement le statut canonique. |
| **5** | `/troupeau` liste truies | Identifier T-001 | T-001 affiché "VIDE / En attente saillie" alors que seed dit saillie J-113 active = devrait être Gestante. **Régression V38-A**. | F12 données fausses (statut T-001 incohérent) | Re-run UPDATE SQL de V38-A : `UPDATE sows SET statut='Gestante' WHERE id IN (SELECT sow_id FROM saillies WHERE date_saillie > now() - interval '115 days' AND date_saillie <= now())`. Ajouter trigger Postgres pour maintenir cohérence statut/saillie auto. Cf `decisions.md` V36 + `blockers.md` 2026-05-03. |
| **6** | `/reproduction` stat | Lecture événements | "MB 7J = 0" alors que T-001 saillie J-113 → MB demain = devrait être 1 | F12 + F11 alertes ne marchent pas | `ReproV70.tsx` — calcul `bandes.filter(b => b.dateMB && diffDays(b.dateMB, now) <= 7).length` ou plus rigoureux : `truies.filter(t => derniereSaillie(t).dateSaillie + 115j <= now+7j).length`. La logique R1 du `alertEngine.ts` doit être réutilisée. |
| **7** | `/performance` finances | Lecture marge | "Marge mensuelle — **FCFA**" alors que ferme Belgique = EUR | F14 devise étrangère | `PerformanceV70.tsx:196` — lire `useFarm().troupeau.pays` et mapper via `src/lib/currency.ts` (Belgique→EUR, Côte d'Ivoire→FCFA, France→EUR…). V71.1 a juste swappé `€` → `FCFA` hardcoded = régression pour comptes non-CI. |
| **8** | `/reglages` profil | Identité utilisateur | "OWNER · audit final" alors que compte = ADMIN, ferme = "Ferme Audit Test" (tronqué à "audit final") | F13 identité floue + F12 mauvais rôle | `ReglagesV70.tsx:hero` — `const { profile, troupeau } = useFarm(); display = ${profile.role} · ${troupeau.nom_ferme}`. Correction du tronquage : ne pas split sur espace. |

### P1 — Importantes (V71.3 ou V71.4)

| # | Écran | Action | Observé | Friction | Fix proposé |
|---|---|---|---|---|---|
| **9** | BottomNav | Repérer onglet actif | Icônes emojis Unicode `⌂ 🐖 ❤ 📊 ⚙` — rendu variable Samsung One UI vs stock Android, taille pas fixe | F3 illisible + incohérence DS | `BottomNav.tsx:22-27` — remplacer par Lucide React 22px : `Home`, `PiggyBank`/`Beef`, `Heart`, `BarChart2`, `Settings`. Fixer taille via `<Icon size={22} className="text-[var(--pt-primary)]" />`. |
| **10** | `/reglages` ListItem | Naviguer config | Avatars emojis `🏠 👥 🌾 📋 📚 🎓` dans tous les ListItem — incohérent avec EntityAvatar SVG du reste de l'app | incohérence DS | `ReglagesV70.tsx:56-99` — utiliser Lucide : `<Home/>`, `<Users/>`, `<Wheat/>`, `<ClipboardList/>`, `<BookOpen/>`, `<GraduationCap/>` 20px. |
| **11** | `/today` hero icon | Hero card | Icône `🐖` emoji dans hero (ligne brief 1_4 du snapshot) | incohérence DS | `TodayV70.tsx:hero-icon` — `<EntityAvatar species="truie" size="md" />` (composant existe déjà V45). |
| **12** | `/performance` boutons | Export données | Bouton `📥 PDF` avec emoji + `🏆 🥈` sur podium TOP PERFORMANCES | incohérence DS + accessibilité | `PerformanceV70.tsx` — Lucide `<Download size={16} />` pour PDF, `<Trophy/Medal>` pour podium. |
| **13** | `/today` dismiss alerte | Acquitter alerte | Bouton `✓` dismiss : padding `4px 8px` → cible ~24×24px (gants impossibles) | F1 tap impossible | `TodayV70.tsx:button.acquitter` — `padding: 12px 14px; minHeight: 44px; minWidth: 44px`. Utiliser composant `<IconButton size="md">` partout. |
| **14** | `/troupeau` doublon statut | Lecture truie | "T-002 Gestante PLEINE" — affiche 2× le statut (long "Gestante" + pill "PLEINE"). Incohérent | bruit visuel + redondance | `AnimalsV70.tsx:list-item` — choisir UN seul affichage. Recommandation : pill court (PLEINE) seul, le statut long en hover/détail. |
| **15** | `/performance` UUID | Lecture top performances | "Bande **21af315c…**" UUID brut tronqué dans TOP PERFORMANCES | F12 + violation règle 10 brief V70 ("UUIDs jamais affichés") | `PerformanceV70.tsx:topBandes` — afficher `b.code_id ?? b.idPortee ?? 'B-???'`. Réutiliser `useNoUUID` guard de V38-A. |
| **16** | `/reglages` équipe | Lecture équipe | "Mon équipe **4 utilisateurs · Owner+Porcher+Admin**" alors que compte audit = 1 user | F12 stub hardcodé | `ReglagesV70.tsx:equipe` — query `SELECT count(*) FROM profiles WHERE farm_id = ?`. Si MCP write actif post-redémarrage, ajouter compteur live. |
| **17** | Hard refresh résultats | Service Worker | Hero T-018 **persiste après SW unregister + caches.delete + hard reload** (ignoreCache:true) | Sérieux : signifie que le hardcoding est dans le BUNDLE compilé, pas un cache. **Donc V71.1 n'est PAS effectif en prod.** | Investiguer `dist/assets/TodayV70-*.js` (grep "T-018" dans le bundle servi). Si présent → V71.1 a été commité mais pas re-buildé/déployé. Solution : forcer rebuild via `npm run build && npx cap sync android` côté dev, et `deploy-pilot v2` via pipeline pour prod. |
| **18** | Fiche `/troupeau/truies/T-004` | Lecture tab | Tab name "REPRODUCTION**1**" — un "1" qui colle au mot (probablement count saillies sans séparation) | confusion typo | `TruieDetailView.tsx:tab.reproduction` — `<span>{label}</span>{count > 0 && <span className="badge">{count}</span>}` avec gap CSS. |

### P2 — Mineures (V72+)

| # | Écran | Action | Observé | Friction | Fix proposé |
|---|---|---|---|---|---|
| **19** | `/reproduction` EmptyEdu | Découverte cycles | "📚 COMPRENDRE LES CYCLES" affiché en bas de Agenda même quand bandes existent | F7 bruit pédagogique pour utilisateur expérimenté | `ReproV70.tsx:245` — `{bandes.length === 0 && <EmptyEdu .../>}` — ne pas montrer si data riche. (Friction #14 audit V71 toujours non-fixée). |
| **20** | Fiche `/troupeau/truies/T-004` IDENTITÉ | Voir code/boucle | "Code · Boucle T-004 ·" — boucle vide affichée comme `T-004 ·` au lieu de `T-004` ou `T-004 · —` | typo affichage | `TruieDetailView.tsx:identite` — `T-004{boucle ? \` · ${boucle}\` : ''}` au lieu de toujours rendre `·`. |

---

## Recommandations stratégiques (au-delà des 20 frictions)

### A. Le décrochage claims V71 vs prod = problème système, pas tactique

Friction #17 est le plus important : V71.1 (commit f93d888 sur main) prétend brancher useFarm() sur 5 pages, mais en prod les stubs persistent. Soit :
- Le code branche bien `useFarm()` mais les valeurs sortent en stubs car des constantes par défaut sont retournées.
- Le code branche localement mais le bundle déployé n'a pas été régénéré (ce serait gravissime — le rapport VERIFICATION du commit l'aurait dû attraper).
- Régression entre V71.1 et V71.2 : V71.2 a peut-être réintroduit des stubs.

**Action** : faire un `grep -r "T-018\|hardcoded\|92\\b\|145\\b" src/v70/` pour traquer les nombres magiques restants. C'est exactement le genre de chose que le release-pilot v2 (commit 5df68d9) doit catcher dans son étape `[1] Pre-flight` (à enrichir d'un check `grep`).

### B. La cohérence statuts truies est un risque répété

T-001 affichage "VIDE" en mai 2026 alors que V38-A (mai 2026) a explicitement résolu "T-001 statut 4 versions contradictoires". Soit la règle SQL n'a pas été migrée vers Supabase, soit elle a été effacée par un seed ultérieur. **Recommandation** : créer un trigger Postgres `before insert/update on saillies` qui synchronise auto `sows.statut`. Cf `supabase-ops` agent pour DDL.

### C. L'audit V71_DESIGN_AUDIT.md (25 frictions) reste à 60% non-résolu

V71.2 disait "purger 15/20 erreurs". L'audit fresh en confirme : friction #18 farm.name (ok ici), #16 devise (régression € → FCFA hardcoded), #22 BottomNav emojis (toujours), #25 ListItem emojis Réglages (toujours), #21 touch target retour (à vérifier), #15 ISSE hardcoded (résolu — affiche 0.0 calculé). Cumul = ~60% audit V71 résolu, 40% restant.

### D. Workflow professionnel manquant

Tests non effectués mais à inclure dans la prochaine vague :
- **Export PDF** fiche truie : bouton "Imprimer la fiche" présent (uid 6_74) mais comportement à valider sur mobile (window.print() est desktop-friendly seulement, sur mobile = pas de feedback).
- **Saillie form** depuis FAB Repro : à dérouler le formulaire et vérifier `inputmode="numeric"`, validation, feedback succès, écriture Supabase.
- **Mise-bas form** (Quick Confirm Mise-bas) sur T-001 : devrait déclencher l'alerte R1 et le flow.
- **Daily Check** sur B-AUDIT-MB : bande sous-mère, 10 questions terrain.
- **Sevrage** B-AUDIT-MB : transition Sous-mère → Post-sevrage.
- **Photo porcelet** + caméra Capacitor : flow upload + resize <2000px (cf decisions V70.10).
- **Mode hors ligne** : couper réseau et tenter d'enregistrer une saillie → vérifier que `offlineQueue` accepte et resync à reconnexion.

---

## Plan d'attaque V71.3 (4 vagues parallèles, ~3-4h dispatch)

**Vague A — Données live (P0 #1, #2, #3, #4, #6) — agent : `dev-cycles`**
- TodayV70 : hero MB depuis `bandes.dateMB ASC LIMIT 1`, stats 4 chiffres depuis useFarm
- AnimalsV70 : eyebrow `${total}` + counts pills depuis filter regex testées
- ReproV70 : stat MB 7J depuis logique R1 alertEngine

**Vague B — Cohérence statuts (P0 #5) — agent : `supabase-ops` (avec MCP write actif)**
- Re-run UPDATE V38-A (truies saillies < 115j → Gestante)
- Trigger Postgres maintenance auto

**Vague C — DS visuel (P1 #9, #10, #11, #12, #13, #14, #15) — agent : `designer-pilot`**
- BottomNav emojis → Lucide (5 icônes, 22px, color `var(--pt-primary)` actif)
- ReglagesV70 ListItem emojis → Lucide (6 icônes, 20px)
- TodayV70 hero-icon emoji → EntityAvatar truie
- PerformanceV70 boutons emojis (📥 🏆 🥈) → Lucide
- Touch targets dismiss + breadcrumb retour (44px min)
- Doublon statut/pill AnimalsV70 (pill seul)
- UUID brut PerformanceV70 → `b.code_id`

**Vague D — Devise + identité (P0 #7, #8) — agent : `dev-troupeau`**
- PerformanceV70 : `useCurrency()` hook depuis `troupeau.pays` via `src/lib/currency.ts`
- ReglagesV70 hero : `${role} · ${nom_ferme}` complet (pas de tronquage)

**Vague E — Polish P1/P2 (#16, #18, #19, #20)** : agent : `dev-cycles` ou nouveau passage `designer-pilot`

Toutes les vagues retournent `=== VERIFICATION ===` 8 blocs. L'orchestrateur cross-check via `grep` avant validation. Quand 4 vagues OK → `deploy-pilot v2` orchestre push + rsync + smoke 17 routes → tag `v3.0.0`.

---

## Critères de succès V71.3 → V70 final

- [ ] Compte audit affiche : T-001 Gestante (vrai statut), 64 animaux total, MB 7j = 1 (T-001 demain)
- [ ] Hero Today affiche T-001 (pas T-018) avec date MB calculée
- [ ] Stats Today : 50 / 3 / 11 / 3 (vraies data)
- [ ] PerformanceV70 : devise EUR pour ferme Belgique, FCFA pour CI/SN/etc.
- [ ] BottomNav 5 icônes Lucide cohérentes
- [ ] 0 emoji dans ListItem Réglages (Lucide partout)
- [ ] Touch target dismiss alerte ≥44px (testable via DevTools box model)
- [ ] EmptyEdu Repro masqué quand `bandes.length > 0`
- [ ] Tag `v3.0.0` poussé après pipeline `deploy-pilot v2` succès
- [ ] Smoke /today /troupeau /reproduction /performance /reglages tous 200
- [ ] V71_DESIGN_AUDIT 25/25 résolu (vs 15/20 actuel)

---

**Auteur** : Claude Opus 4.7 (orchestrateur audit)
**Date** : 2026-05-07 19h CEST
**Pour validation** : Christophe (openformac@gmail.com / contact@liegeoischristophe.com)
**Contexte snapshot** : porctrack.tech main @ 5df68d9 sur compte audit-final, viewport 390×844 mobile touch
