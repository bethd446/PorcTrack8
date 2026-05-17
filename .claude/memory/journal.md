# Journal — PorcTrack 8

> Journal chronologique des sessions et vagues de développement.
> Chaque entrée résume ce qui a été livré, les commits, les tests, les écarts.
> L'agent met à jour ce fichier à la fin de chaque session.

---

## Format type

```
## YYYY-MM-DD · [Vague] Titre court · commit `xxxx`
**Livré** :
- ...
**Tests** : N pass · delta +X
**Écarts/notes** : ...
**Liens** : [[decisions]] · [[blockers]] · [[learnings]]
```

---

## 2026-05-09 · [V75-h] Listing porcelets dépliable · commit `c6a15b1`

**Contexte** : friction P1-3 audit V74 — `AnimalsV70.tsx` tab Porcelets affichait "92 porcelets" eyebrow mais seulement 4 stubs hardcodés (P-MAR-01..P-JAN-01). Décision UX brainstorming : grouping par bande dépliable (vs vrac virtualisé, vs représentant seul).

**Découverte clé pendant exploration** : `BandePorcelets.porcelets?: PorceletIndividuel[]` existe déjà (V25, `src/types/farm.ts:147`) et est auto-chargé via JOIN `porcelets_individuels(id, batch_id, boucle, sexe, poids_courant_kg, statut, notes)` dans `src/services/supabaseService.ts:178`. → Pas de modification FarmContext / TroupeauContext / farmDataLoader nécessaire. Spec §2.1 prévoyait un plumbing context inutile, simplifié dans le plan.

**Livré** :
- Helper `src/v70/lib/porceletPhase.ts` (40L) : `derivePorceletPhase(porcelet, bande)` retourne 5 phases (SOUS_MERE/POST_SEVRAGE/CROISSANCE/ENGRAISSEMENT/FINITION) avec priorité poids ≥ 100kg → FINITION. Seuils alignés `src/config/farm.ts` (J28/J63/J100/J180). 7 tests Vitest passing.
- Composant `src/v70/components/PorceletGroup.tsx` (175L) : ligne bande dépliable. Header `aria-expanded` toggleable (cliquable) + chevron `›` distinct vers fiche bande (zone séparée avec `aria-label`). Sub-items rendent boucle (mono tabular-nums) + poids + sexe + pill phase. Cas "0 vivants — bande terminée" rendu `disabled`.
- `AnimalsV70.tsx` : counts.porcelets depuis `bande.porcelets` actifs (filter `VIVANT|MALADE|QUARANTAINE`) au lieu de `bande.vivants` agrégé. State `expandedBandes: Set<string>`. 1er groupe ouvert par défaut via `useEffect` au passage `bandes.length 0 → N` (data lazy FarmContext). Branche conditionnelle rendu `PorceletGroup` sur `tab === 'porcelets'`, empty state V74 préservé. Search étendue : nom de bande OU boucle porcelet (force déplié si match boucle).
- 2 specs Playwright `tests/e2e/porcelets-listing.spec.ts` (gestion 3 cas selon état listing : tous disabled / tous expanded / au moins collapsed).

**Tests** : 1927 → 1934 passing (+7 porceletPhase). 12/12 specs Playwright V75 totales (3 naming + 5 landing + 2 porcelets + 2 préexistantes). tsc 0, build OK 3.16s.

**Limitation prod actuelle** : la ferme `audit-final@porctrack.test` n'a aucun `porcelet_individuel` peuplé en DB. Les 6 groupes affichent tous `0 vivants — bande terminée` disabled. Le code est fonctionnel ; le provisioning de la donnée porcelets est un sprint data séparé (insert SQL ou import Excel via `porcelets_individuels`).

**Hors-scope (sprints suivants)** :
- Fiche porcelet dédiée `/troupeau/porcelets/{id}` avec édition
- Bottom-sheet quick-actions (pesée, mortalité, vente) sur clic sub-item
- Tri/filtre par poids, phase, sexe
- Pagination si > 500 porcelets

**Méthode** : subagent-driven, 3 dispatches groupés (Tasks 1+2 helper+composant, Tasks 3-6 modifs AnimalsV70, Task 7 Playwright). 1 commit final inline. AGENT_CONTRACT bloc VERIFICATION respecté à chaque dispatch.

**Liens** : [[learnings]] (réutiliser JOIN existant > recharger via context, lecture du code AVANT plan évite plumbing inutile)

---

## 2026-05-09 · [V75 d/e/f] Refonte Landing Page · commits `8bbd5ca`→`5cf8c7e`→`c441bd1`

**Contexte** : Suite immédiate du chantier naming-coherence (V75 a/b/c). Diagnostic état initial landing-v2 : `LandingScrollytelling.tsx` orchestrant 7 scènes mais 4 stubs vides (Repro, Feed, Health, Offline) + scene Bandes refondue, `SceneHero` avec background `#0a0a0a` noir générique + texte blanc + CTA `#10b981` vert mint + accent `#34d399` — violation directe du DNA "Terrain Vivant" V70 (palette terre/cream/vert forêt). Vidéo Creatify 8s déjà rendue dans `~/Downloads/`, watermark Creatify bottom-right à masquer. Cible : senior testeur manuel + éleveurs naisseurs-engraisseurs PWA.

**Choix structurants validés en brainstorming** :
- Format : vidéo plein écran sticky bg + sections cards par-dessus (option recommandée vs landing classique vs scrollytelling pur)
- Voix copywriting : directe & technique (vs ironique, vs impérative) — promesse fonctionnelle, vocabulaire métier, chiffres réels
- Palette : tokens `--pt-*` brief V70 strict (`#2D4A1F` primary, `#F5E9D8` warm, `#B8703D` accent, `#FAF7F0` bg)
- Stack : conservé GSAP + ScrollTrigger + Lenis + useGSAP

**Vague D — `8bbd5ca feat(v75-d): nettoyage landing-v2 + assets vidéo`**
- Suppression 5 scènes stubs vides (SceneRepro 23L, SceneFeed 21L, SceneHealth 37L, SceneOffline 23L, SceneBandes 211L) + SceneFrame.tsx orphelin (213L) → -315L de code mort
- Suppression background `#0a0a0a` hard-codé dans `LandingScrollytelling.tsx` → `var(--pt-bg)` ivoire
- Création stubs minimaux pour 5 nouveaux composants (FloatingCardsStack, SceneVideoBreak, SectionPourQui, SectionWorkflow, SectionMarius) — refonte au commit suivant
- Compression vidéo Creatify 8s via ffmpeg : MP4 H.264 1920×1080 faststart `2.6 MB`, WebM VP9 `1.8 MB`, poster JPEG mozjpeg `87 KB` extrait à 0.5s
- ffmpeg installé via `brew install ffmpeg` (n'était pas présent au démarrage)

**Vague E — `5cf8c7e feat(v75-e): refonte SceneHero + sections vidéo + cards landing-v2`**
- `SceneHero.tsx` refonte complète (232L) : vidéo `<video autoPlay muted loop playsInline>` MP4+WebM en `position: absolute inset: 0 objectFit: cover`, voile dégradé bottom-up `linear-gradient(to top, var(--pt-bg) 0%, rgba(250,247,240,0.85) 14%, rgba(26,26,26,0.45) 55%, transparent 85%)` qui masque le watermark Creatify ET assure la lisibilité texte. Headline "LA PRÉCISION EN PLEIN ÉLEVAGE." en Big Shoulders 900 blanc + soulignement ambre, body "L'app GTTT pensée pour les naisseurs-engraisseurs d'Afrique de l'Ouest. 117 porcelets, 13 bandes, 5 loges suivis sans Excel.", 2 CTAs (`Démarrer mon élevage` → `/signup` vert forêt, `Voir une démo ›` ghost). Animations GSAP : fade hero-title sur scroll start (`opacity 0→1, y 40→0, scale 0.96→1`), parallax video `objectPosition center 25% → center 60%` scrubbed. Reduced motion guard.
- `FloatingCardsStack.tsx` (153L) : 3 cards en quinconce gauche/centre/droite avec stagger fade-in 0.18s :
  - REPRO `T-031 · PLEINE J42` `Mise-bas prévue 03/07 · ISSE 12.4`
  - BANDE `BANDE MAI 2026 · T-001` `11 NV sous mère · Sevrage 31/05`
  - ALERTE `À SORTIR BIENTÔT — T-018` `Trop âgée ou pas assez de portées`
- `SceneVideoBreak.tsx` (41L) : photo `alimentation.{webp,jpg}` 100vh + dégradé haut/bas pour transition douce (placeholder vidéo 2 hors-scope v1)
- `SectionPourQui.tsx` (139L) : grid responsive 3 profils éleveur (`auto-fit, minmax(280px, 1fr)`) avec photos Nano Banana V73 (`hero-wide`, `reproduction`, `alertes`), titres en BigShoulders, body Instrument Sans, stats en JetBrains Mono tabular-nums ambre
- `SectionWorkflow.tsx` (146L) : 3 étapes en quinconce avec gros numéros 1/2/3 en ambre `clamp(72px, 10vw, 120px)` letter-spacing -0.04em, en vis-à-vis avec titre+body Instrument Sans

**Vague F — `c441bd1 feat(v75-f): SectionMarius + refonte SceneCta + 5 specs Playwright`**
- `SectionMarius.tsx` (94L) : section pleine surface en `var(--pt-primary)` vert forêt avec id `marius` (cible ancre CTA secondaire hero "Voir une démo"). Eyebrow `ASSISTANT IA` en ambre clair, H2 "Marius connaît ton élevage." en cream, body "Pas un chatbot générique. Marius lit tes truies, tes alertes, ton calendrier. Il répond avec tes données.", capture conversation réelle dans card semi-transparente avec contexte ferme : T-026 mise-bas J-2, T-016 maternité colostrum, sevrage 31/05 bandes Mai 2026
- `SceneCta.tsx` refonte complète (120L) : suppression `#0a0a0a`/`#10b981`/`#34d399`, palette `--pt-*` partout. Eyebrow `PRÊT ?`, H2 "TON ÉLEVAGE MÉRITE LA PRÉCISION." (vert forêt + souligné ambre), body "Démarre PorcTrack maintenant. Importe ton cheptel en quelques minutes et laisse les alertes biologiques travailler pour toi.", CTA répété `Démarrer mon élevage` → `/signup`, footer 1 ligne sobre `app.porctrack.tech` + Mentions + Contact
- 5 specs Playwright `tests/e2e/landing-v75.spec.ts` (102L) :
  1. Hero affiche headline "la précision en plein élevage" + 2 CTAs visibles
  2. Aucune couleur hard-coded interdite : wrapper bg = `rgb(250,247,240)`, 0 élément avec bg `rgb(10,10,10)`
  3. Vidéo hero charge et autoplay : `readyState ≥ 2`, `paused: false`, `muted: true`, `loop: true`
  4. ≥ 2 CTAs primaires `Démarrer mon élevage` avec `href="/signup"`
  5. Poster JPEG `/videos/landing/hero-maternity-dawn-poster.jpg` référencé sur `video.hero-video`

**Tests** :
- baseline 1927 passing préservée (chantier UI-only sans nouveau code testable unitaire)
- 5/5 specs Playwright `landing-v75.spec.ts` vertes en 7.1s sur mobile-chromium
- 3/3 specs Playwright `naming-coherence.spec.ts` toujours vertes
- tsc 0 erreur
- npm run build OK 3.06s

**Smoke browser live** sur `http://localhost:5173/landing-v2` :
- Hero : vidéo Creatify autoplay loop avec golden hour rim light visible, watermark Creatify bottom-right MASQUÉ par voile dégradé ivoire (verified visuellement). Headline blanc avec texte-shadow + soulignement ambre. CTAs accessibles touch ≥ 44px.
- Section 2 : 3 cards REPRO/BANDE/ALERTE en quinconce sur fond ivoire avec shadows subtiles
- Section 3 : photo `alimentation.jpg` plein écran avec dégradés haut+bas
- Section 4 : 3 profils éleveur en grid responsive
- Section 5 : COMMENT ÇA MARCHE avec gros 1/2/3 ambre — composition impactante DNA-aligned
- Section 6 : MARIUS sur fond vert forêt avec capture conversation
- Section 7 : CTA final + footer sobre
- Console DevTools : 0 erreur projet (1 erreur manifest pré-existante non liée — déjà présente avant V75)

**Frictions audit corrigées vs landing initiale** :
- Thème noir générique `#0a0a0a` éliminé sur 7 sections + wrapper
- Couleurs hors palette `#10b981`/`#34d399` éliminées (CTAs primaire et accent)
- 4 scènes vides remplacées par contenu utile + 1 réécrite (SceneBandes → SectionWorkflow)
- Copywriting passé d'ironique ("LE CARNET PAPIER, SANS LES PAGES FROISSÉES") à directe & technique ("LA PRÉCISION EN PLEIN ÉLEVAGE")
- Pas de chrome/néon/gradient générique, pas de glassmorphism

**Hors-scope (sprints suivants)** :
- Génération vidéo 2 (Tournée du soir / main+tablette) → placeholder photo `alimentation.jpg` v1
- Régen 9:16 mobile portrait → fallback poster v1 (à reconsidérer si conversion mobile chute)
- Section Pricing → décision produit séparée
- Page démo dédiée `/demo` → ancre `#marius` v1
- Watermark Creatify : voile CSS suffit visuellement v1, regen Creatify Pro à activer si test browser réel montre fuite

**Méthode** : suite subagent-driven. 1 dispatch pour Tasks 6-10 (5 sections), 1 dispatch pour Tasks 12-14 (Marius + CTA + tests). Tasks 1-5 + 11 + 15 inline (assets ffmpeg, suppressions, refactor LandingScrollytelling, commits). Total : 2 dispatches subagent + edits inline rapides.

**Liens** : [[decisions]] (palette `--pt-*` strict appliqué partout) · [[learnings]] (voile dégradé bottom-up pour masquer watermark vidéo, GSAP `objectPosition` scrub pour parallax léger)

---

## 2026-05-09 · [V75 a/b/c] Naming & Cohérence · commits `269333c`→`83159bf`→`510dd39`

**Contexte** : Session post-audit V74 sur compte `audit-final@porctrack.test`. 8 frictions identifiées : 2 P0 (UUID bandes exposés à l'éleveur ET à Marius, 5 fausses alertes "Réforme suggérée" sur truies déjà réformées), 4 P1 (H1 "Mes animaux" hors décision A brief V70, filtre RÉFORMÉES manquant, bouton "Passer en réforme" inadapté, breadcrumb "Outils" reliquat), 2 P2 (Marius pas d'auto-submit, Performance Top inconsistance UUID/mère). Brief utilisateur : langage simple pour éleveurs francophones niveau variable, app PWA cible senior testeur.

**Vague A — `269333c feat(v75-a): helper formatBandeName + propagation 5 sites`**
- Création `src/v70/lib/formatBandeName.ts` (51L) — pure helper avec 5 règles : `idPortee` custom non-UUID > `dateMB` mois français > `truieMere` seule "en cours" > fallback `id.slice(0, 8)`. Option `compact` pour cards étroites.
- Création `src/v70/lib/index.ts` re-export module.
- 6 tests Vitest passants.
- Propagation 5 sites : `AnimalsV70.tsx` (interface AnimalStub étendue `displayName?`, mapping bandes), `ReproV70.tsx` (timeline cycles compact), `PerformanceV70.tsx` (Top performances compact), `src/features/chatbot/buildFarmContext.ts` (vrai compositeur context Marius — découvert que `formatBande()` exposait `b.id` brut Supabase à Marius, fix la racine du bug "Marius cite UUID").
- 1 spec Playwright `tests/e2e/naming-coherence.spec.ts` valide bandes affichent un nom lisible (no UUID 8-hex).

**Vague B — `83159bf feat(v75-b): refonte AlertEngine + filtre À vendre + actions fiche truie`**
- Création `src/v70/lib/reformLogic.ts` (44L) — 4 prédicats métier : `isReformed`, `needsReformConsideration` (parité ≥6 OU 0 portée + âge ≥12 mois), `alreadySortedOut`, `reformReason` (textes simples).
- 11 tests Vitest reformLogic passants.
- `TodayV70.tsx` AlertEngine éclaté en 2 générateurs : "À sortir bientôt" (truies pas encore réformées, tag `Bientôt`) et "À vendre" (déjà réformées, tag `Cette semaine`). Plus de faux positifs dashboard.
- `AnimalsV70.tsx` : pill `À VENDRE (n)` ajoutée + count `truiesAVendre` + filtre listing étendu. Mapping `realStubs.truies` revu : retrait slice initial pour voir réformées, slice conditionnel après filtre.
- `TruieDetailView.tsx` : bouton conditionnel selon statut. Truie active "À surveiller" → "Sortir cette truie" (variant danger). Truie réformée → "Marquer comme vendue (bientôt)" disabled v1 (dialog persistence vente/abattoir hors-scope ce chantier). Dialog mise en réforme : message "doit être sortie du cheptel". Toast : "Truie marquée à sortir".
- `TruieDetailView.test.tsx` adapté au nouveau libellé.
- 2 specs Playwright additionnelles : alertes refondues + filtre À vendre.

**Vague C — `510dd39 feat(v75-c): H1 Élevage + breadcrumb + langage simplifié + Marius auto-send`**
- `AnimalsV70.tsx` H1 `"Mes animaux"` → `"Élevage"` (alignement strict décision A brief V70). Test associé adapté.
- `ControleQuotidien.tsx` breadcrumb `['Outils', 'Audit terrain']` → `[{label: "Aujourd'hui", href: '/today'}, 'Audit terrain']` (2 occurrences via `TopBarSync` crumbs prop). Élimine onglet Outils reliquat (décision B brief).
- `ChatbotWidget.tsx` Marius : ajout `formRef = useRef<HTMLFormElement>(null)` + `ref={formRef}` sur form. onClick suggestion : `formRef.current?.requestSubmit()` au lieu de `inputRef.current?.focus()`. Auto-submit immédiat type ChatGPT.
- Audit grep : 0 résidu "À décider" / "À planifier" / "Productivité insuffisante" / "Réforme suggérée" dans code utilisateur. 4 résidus tests rétro-compat (`alertSubject.test.ts`, `QuickConfirmReformeForm.test.tsx`) conservés volontairement.

**Tests** :
- baseline 1898 (selon plan) → réelle 1916 sur main avant chantier
- final : **1927 passing | 5 skipped (1932)** (+11 reformLogic, +6 formatBandeName intégrés dans le total)
- 3/3 specs Playwright `naming-coherence.spec.ts` vertes (5.3s mobile-chromium)
- tsc 0 erreur, build OK

**Smoke browser live** (compte `audit-final@porctrack.test`) :
- `/today` : 5 alertes affichent maintenant "À vendre — T-046..T-050" tag Cette semaine. Plus aucune "Réforme suggérée".
- `/troupeau` H1 = "ÉLEVAGE". Filtres truies : `Toutes(50)/Pleines(28)/Maternité(11)/Vides(6)/À VENDRE(5)` — total cohérent 50.
- `/troupeau` tab Bandes : 6 bandes affichent leurs `idPortee` métier (B-AUDIT-CR, 26-T16-01, 26-T1-01, B-20260503-M-02, B-AUDIT-MB, B-AUDIT-PS) — aucun UUID 8-hex tronqué.
- Console DevTools : 0 erreur projet (1 erreur manifest pré-existante non liée au chantier).

**Frictions audit V74 résolues** : P0-1 ✅, P0-2 ✅, P1-1 ✅, P1-2 ✅, P1-5 ✅, P1-6 ✅, P2-3 ✅, P2-6 ✅ (cascade fix).

**Hors-scope (chantiers ultérieurs)** :
- P1-3 : listing porcelets 92 vs 4 lignes (modèle data + UX décision)
- P1-4 : audit terrain "12 points" annoncé vs 3 questions réelles (extension rédaction)
- Dialog persistence sortie cheptel : permet "Marquer comme vendue" actif (vs disabled v1)
- Patch VPS llama-server system prompt : si Marius garde des UUIDs même après fix client (improbable, le compositeur fix client était la racine)

**Méthode** : exécution subagent-driven (skill `superpowers:subagent-driven-development`). 11 dispatches general-purpose pour les tasks d'implémentation + 1 spec-reviewer + 1 code-quality-reviewer pour Task 1 (helper). Tasks 2-5 review allégée vu nature mécanique des propagations identiques. Tasks 14+15+16 batched dans 1 dispatch. Bloc `=== VERIFICATION ===` AGENT_CONTRACT respecté à chaque dispatch.

**Liens** : [[decisions]] (décisions A et B brief V70 alignées) · [[learnings]] (helper pivot pour formatage métier, regex `réforme|reforme/i` partout)

---

## 2026-05-08 · [V71-P3] Audit mobile + Wizards bloquants + Trigger DB + Toast · commits `bb0d069`→`0e79c98`

**Contexte** : Session reprise après V71-P2 (multi-user schema + landing-v2). User a demandé audit mobile complet sur fiches individuelles + correction de tous les bugs identifiés + wizard onboarding obligatoire pour nouveaux users + workflow ré-organisation porcelets pour Christophe (compte EasyFarm K13 a 13 bandes orphelines de mère après migration depuis ancienne app).

**Livré (8 commits, +1100/-30 nets)** :
- `bb0d069` Fix mobile fiches détail (FAB chevauchement, `—` orphelin nom, séparateur orphelin)
- `c1dd7c2` Fix mobile UX (tabs scroll mask gradient, saisir-sheet wrap, alerts grid responsive 4→2 cols)
- `096d354` **PorceletsReorgWizard** + migration DB `loges.repartition` (MIXTE/MALES/FEMELLES/NA) + sync data Christophe (10 bandes ont récupéré leur loge text)
- `473acf1` Trigger DB `set_sow_pleine_on_saillie` AFTER INSERT (truie auto-Pleine post-saillie) + VITALES filter cohérent
- `0731510` Toast feedback unifié (ToastProvider + useToast hook) + cleanup gitignore PorcTrack8/
- `ff060e9` **OnboardingV2Wizard 5 étapes** obligatoire (Type/Cheptel/Races/Infrastructure/Confirmation) avec génération auto DB cascade (truies T-001..., verrats V-001..., cases mat M-01..., loges PS/Eng) + farms.metadata onboarding_v2 + backfill 7/7 users existants en auto-skip-v1
- `0e79c98` Export JSON 14 portées Excel SUIVI_FERME_A130 → docs/data/

**Sub-agents Opus 4.7 dispatchés (3 en parallèle final)** :
- Vague A : Toast sur 5 forms restants (Mise-bas/Soin/Pesée/Note/Mortalité)
- Vague B : UI switcher multi-farm + invitation membre dans MonEquipe
- Vague C : Tests E2E Playwright (signup→onboarding, saillie complète, multi-user RLS)

**Tests** : 1742 passing baseline préservée (avant et après chaque fix). tsc 0 erreur. Build OK (~3 sec).

**Migrations DB appliquées (3)** :
- `v71_p3_loges_repartition` : ALTER + backfill heuristique
- `v71_p3_auto_pleine_on_saillie` : trigger + helper SECURITY DEFINER
- `v71_p3_onboarding_v2_metadata` : ALTER farms + backfill auto-skip-v1

**Why** : User commence à voir l'app comme un produit propre, doit ouvrir aux nouveaux users (onboarding obligatoire avec génération auto data) tout en réparant l'historique de Christophe (porcelets-reorg). L'objectif final : ferme K13 production-ready + nouveaux signups frictionless.

**How to apply** :
- Pour Christophe (`bc96ddbd-c34d-46b1-b624-4a3dca181a2c`) : à sa prochaine connexion sur prod, OnboardingV2Gate skip auto, PorceletsReorgGate redirige vers /porcelets-reorg, il choisit mère + loge pour les 13 bandes (référence visuelle : docs/data/SUIVI_FERME_A130_portees.json).
- Pour nouveaux users : OnboardingV2Gate redirige vers /onboarding-v2 5 étapes obligatoires.
- Aucune migration DB additionnelle requise pour utiliser ces wizards.

**Liens** : [[learnings#trigger-rls-pattern]] · [[decisions#wizards-bloquants-V71P3]]

---

## 2026-05-08 · [V71-P2] Multi-user schema + landing-v2 fix + Verrat refonte + DESIGN.md · commits `43ac792`→`746623b`

**Contexte** : Reprise du brief d'hier (récap user : 5 priorités après 13 chantiers livrés en V71-P1). HEAD pré-session `f8f3481` (rollback / vers Landing classique car scrollytelling P2 buggé). Sub-agents Opus 4.7 utilisés en parallèle (3 dispatches : designer-pilot bloqué Edit, supabase-ops design, dev-troupeau frontend MVP).

**Livré (4 commits, +1551 / -53 nets)** :
- `43ac792` Fix scrollytelling /landing-v2 → bascule `/` :
  - Cause titres invisibles : `gsap.from(titleEl, {opacity:0})` + `immediateRender:true` (défaut) → fige opacity:0 si ScrollTrigger échoue à trigger (Lenis + override Ionic + sticky + refresh tardif). Fix : passage à `gsap.fromTo` + `immediateRender:false` + `toggleActions` (SceneFrame, SceneHero, SceneBandes).
  - Cause sticky cassé : `body.style.overflow = 'auto'` dans useScrollUnlock créait un scrolling container interne qui devenait le scope des `position:sticky` des Scenes → fix via `body.overflow:visible`. Aussi `overflowX:hidden` du wrapper root forçait `overflow-y:auto` (CSS spec) → fix via `overflowX:clip`.
  - Tracking git de `supabase/migrations/20260508_rls_quickwins.sql` + `supabase/functions/marius-chat/index.ts` (déjà appliqués prod) + `_DRAFT_v71_multi_user_schema.sql` (563 lignes designé par sub-agent supabase-ops Opus 4.7).
- `ff54a98` Apply migration V71-P2 multi-user via MCP (`20260508095426_v71_p2_multi_user_schema`) :
  - 2 tables (farms PK uuid, farm_members PK composite + role CHECK 'OWNER'|'ADMIN'|'PORCHER')
  - 3 helpers SECURITY DEFINER STABLE search_path locked (`user_farms(uid)`, `current_user_farms()`, `is_member_with_role(farm_id, ...roles)`)
  - 40 policies farm-scoped sur 24 tables refondues (USING `farm_id IN (SELECT current_user_farms())`)
  - handle_new_user étendu (signup crée farm + member OWNER)
  - Backfill zero-cost : farms.id = profiles.id (7 users existants → 7 farms + 7 farm_members OWNER)
  - Types Supabase régénérés (`src/types/database.types.ts` 1057→1929 lignes), 2 erreurs TS pré-existantes fixées (poids_initial_kg NOT NULL sur batches).
- `971b189` Frontend MVP multi-user + refonte Verrat :
  - FarmContext étendu : currentFarmId/availableFarms/switchFarm/currentRole, persistance kvStore `pt:current_farm_id`, useEffect dédié charge farm_members JOIN farms.
  - AuthContext.mapToLegacyRole(membershipRole, profileRole, fallback) — priorité farm_members.role > profiles.role.
  - supabaseWrites.getFarmId() : ref module-level `globalCurrentFarmIdRef` (set par FarmContext.setCurrentFarmIdRef), fallback auth.uid() si null. 103 consommateurs useFarm/useAuth/useMeta non cassés (shape additive).
  - VerratDetailView "Vue d'ensemble" → 4 cards V70 (IDENTITÉ, REPRODUCTION, JOURNAL TERRAIN, ACTIONS) alignées sur pattern TruieDetailView (`<Section label />` + div card-style inline).
- `746623b` DESIGN.md format Stitch/impeccable — formalisation V70 (248 lignes, 6 sections spec, frontmatter YAML 18 colors + 8 typo nommés + 4 components, 4 Named Rules).

**Tests** : 1739 → 1742 (+3 V71-P2 getFarmId via currentFarmIdRef). 0 régression. tsc 0 erreur. Build OK (92 entries / 3981 KiB).

**Sub-agents Opus 4.7 dispatchés (3)** :
- designer-pilot : bloqué Edit/Write par permissions sub-agent → diag fait, fix appliqué localement. Leçon : pour Edit critique, faire localement.
- supabase-ops : ✅ design draft V71-P2 (563 lignes) + audit 24 tables/40 policies/21 fichiers frontend.
- dev-troupeau : ✅ refactor frontend MVP multi-user (5 fichiers, +341/-20 lignes, 3 nouveaux tests).

**Écarts/notes** :
- Pixel-perfect V70 préservé : pas modifié les sizes typo (9/10/11/12/13/18/22/36) malgré ratios non-1.2. DESIGN.md formalise les noms (display/headline/title/body/caption/label/nav/tiny) sans toucher au code.
- Multi-user "complet" pas livré : refactor de peseePlanifieesService, mbWorkflowService, feedConsumptionAnalyzer, validationWorkflow, supabaseService, alertDismissals à faire en V71-P2 phase C (continuent via auth.uid() + RLS rétro-compat backfill pour l'instant).
- Task #7 (audit fonctionnel multi-user en condition réelle) reportée — demande 30-60 min de test 2 users browser.
- Pas push to remote (4 commits ahead `main`) — confirmation user requise.

**Liens** : [[decisions#V71-P2]] · [[learnings#scrollytelling]] · [[learnings#multi-user-rls]]

---

## 2026-05-04 · [V43.7] Cohérence DS V2 + perf CLS/LCP · commit `fcd2373`

**Contexte** : Audit prod V43.7 (chrome-devtools-mcp, 25 routes parcourues) après refactor BandeDetailView V43.6. 3 axes confirmés : vocabulaire résiduel ancienne structure, CLS élevé sur 3 pages clés, LCP bloquant `/pilotage`. Le user demande mode minutieux, zéro tolérance aux chevauchements ancienne/nouvelle structure.

**Livré** :
- **Vocabulaire DS V2** : TruieDetail breadcrumb `Troupeau`→`Élevage` + eyebrow `Fiche truie`→`Élevage · Truie` ; AlertsView eyebrow `Tables · Alertes`→`Outils · Alertes` ; SystemManagement swap eyebrow/title ; OnboardingWizard commentaires `Cheptel`→`Élevage`
- **Breadcrumb cliquable** : VerratDetailView migré du format string nu au format `[{label, href}]` cliquable, alignant TruieDetail
- **Tab nav** : `Perf` renommé `Pilotage` (alignement label/URL/h1) ; tab Élevage retire les match orphelins `/cheptel`+`/bandes` ; tab Repro ajoute `/cycles` au match (sous-vues post-sevrage/croissance/finition restent rattachées)
- **Routing** : redirects `/plus→/more`, `/troupeau/porcelets→view=porcelets` ; PendingValidationsView `navigate('/bandes')`+`'/finances'` réparés vers routes réelles
- **CLS** : TodayHub +80px reservés (confirmations + pesées async) ; CyclesHub +168px pipeline + 280px liste bandes ; TruieDetail +112px CTA mise-bas + 100px CycleTimeline
- **LCP /pilotage** : `genererRapportGlobal`+`prepareAuditSnapshot` déplacés en `useEffect`+`startTransition` + lazy init `useState` (compute synchrone au mount si data présente, async sinon — préserve les tests vitest synchrones)
- **Cleanup code mort** : suppression `CheptelView.tsx` (454L, @deprecated, 0 import) + `BandesView.tsx` (362L, @deprecated, 0 import) + commentaires App.tsx

**Tests** : 1681 pass · delta +7 vs sub-agent intermédiaire (lazy init PilotageHub a re-validé les 7 tests timeout) | 6 skipped · 136/136 Test Files

**Écarts/notes** :
- 5 "404 routes" remontés par le sub-agent d'audit étaient en partie des erreurs dans la spec d'audit que j'avais fournie (URLs `/tables`, `/perf`, `/cycles/saillie` n'ont jamais existé). J'ai documenté ce faux positif dans la réponse user.
- Le sub-agent CLS+LCP avait introduit une régression sur `PilotageHub.test.tsx` (timeout vitest worker) à cause du `startTransition` non-flushé en jsdom. Fix manuel via lazy init `useState` qui synchronise au mount quand `loading=false`.

**Files touched** : 13 src files (11M, 2D), +326/-1088 lignes (cleanup massif grâce aux 2 vues @deprecated)

**Liens** : [[decisions]] · [[learnings]] · `src/features/hubs/PilotageHub.tsx` · `src/components/AgritechNavV2.tsx`

---

## 2026-05-03 · [V38] Migration DS V2 finale · commit en cours

**Contexte** : PDF "PORCTRACK-MIGRATION-DS-V2-FINAL" reçu — plan de migration en 6 phases pour éliminer définitivement tout décalage visuel.

**Livré V38-A** (opus) :
- Fix 5 écarts test E2E DSV2 :
  - T1.1 BandeDetailView H1 sans UUID (utilise `idPortee` + `useNoUUID` guard)
  - T1.2 Tailwind `rounded-full` override `!important` 9999px (workaround bug Tailwind v4 calc(infinity))
  - T1.3 perfKpiAnalyzer matching truie ↔ saillie via UUID OU displayId OU boucle
  - T1.4 `.chip` agritech-utilities migrated `--pt-font-mono` → `--pt-font-body` (badges stade)
  - T1.5 Splitter étendu phases {SOUS_MERE, POST_SEVRAGE, CROISSANCE, ENGRAISSEMENT}
- 5 tokens `--pt-*` ajoutés (surface-warm, surface-warning, accent-deep, primary-soft, shadow-fab)
- Section/Empty/usePageFab wrappers exportés depuis design-system/index.ts
- script `scripts/migrate-ds.sh` créé (find/replace mécanique pour usage futur)
- 3 tests régression V38-A perfKpiAnalyzer

**Livré V38-B** (manuel orchestrateur) :
- `scripts/check-ds-compliance.sh` (8 checks bash)
- `.husky/pre-commit` (bloque commit si DS violé)
- `.github/workflows/ds-compliance.yml` (CI)
- `.github/pull_request_template.md` (déjà OK V33)

**À faire** :
- [ ] Appliquer SQL UPDATE truies Gestante (V38-A T1.3 data non appliqué)
- [ ] Commit + deploy
- [ ] Test E2E final post-V38

**Tests** : 1803 → 1806 (+3 V38-A)
**Liens** : [[decisions#V36]] · [[blockers#Tailwind]] · [[evals#V38]]

---

## 2026-05-03 · [V36] 5 bras armés parallèles · commit `5b37563`

**Livré** :
- V36-A : 4 bugs P0 (R12 INACTIVE_LONG, ROI 357%, 0/50 productives, porcelets 11→10) + 5 KPIs zoo (ICR / GMQ / IC / Marge / Mortalité par phase)
- V36-B : ~20 fichiers monospace cleanup
- V36-C : ESLint rule `no-uuid-jsx`
- V36-D : Migration `short_code` sur produits_veto + produits_aliments + service étendu
- V36-E : QuickSplitBandeForm Wizard 3 étapes + détection doublons boucles UI

**Tests** : 1739 → 1803 (+64)
**Liens** : [[decisions#V36-A]] · [[learnings#parallèle]]

---

## 2026-05-03 · [V35] Fix résiduels DSV2 · commit `a17d009`

**Livré** :
- T1 Plus DMMono purge (16 → 3, codes purs uniquement)
- T2 Bouton "Se déconnecter" pill destructive (variant `destructive` ajouté Button DS)
- T3 About rôles équipe RoleTag local Instrument Sans
- T4 Bottom-nav réordonné (Outils avant Perf)
- T5 /design-system 16/16 (AlertGroup + Wizard + FAB ajoutés showroom)
- T6 Ionicons `informationCircle` registered (purge 6 warnings)
- T7 BONUS 4 Quick*Form (TruieAdd/PorceletAdd/Edit/LogeAdd) -27 monospace

**Tests** : 1739 stable
**Liens** : [[decisions#V35]] · [[learnings#fonts]]

---

## 2026-05-03 · [V34] Mono cleanup massif · commit `33e66c4`

**Livré** : -39 fichiers, -105 occurrences `font-mono` (auth, design, agritech, ui, public pages)
**Tests** : 1739 stable
**Liens** : [[decisions#mono-règle-6]]

---

## 2026-05-03 · [V33] DS COMPLETION · commit `1b5ede0`

**Livré** :
- 7 nouveaux composants V33 (Segment, Chip, Search, ListItem, ActionRow, Stat, StatsGrid)
- Page `/outils` (5ème onglet bottom-nav)
- Page Plus épurée (sans outils métier)
- `.github/pull_request_template.md`
- `.claude/BRIEF_AGENTS_IA.md`

**Tests** : 1674 → 1739 (+65)
**Liens** : [[decisions#16-composants]] · [[evals#PDF-DS-v2]]

---

## 2026-05-02-03 · [V25-V32] Vagues majeures (résumé)

**V25-V27** : Pesée christophe (117 porcelets) + workflow MB + Wizard onboarding + PendingBandesView
**V28** : CTA Confirmer MB + Daily Check + cleanup legacy + audit 20pts + compte test permanent
**V29** : 5 composants V29 + cleanupOutdatedCaches PWA + htaccess strict
**V30-MASTER** : Tokens `--pt-*` + override Ionic + Phase 3 TroupeauHub
**V31-FIX-PACK-01** : Audit refait + UUIDs bannis + FAB rond contextuel
**V32** : 4 bugs P0 + fiche truie 4 onglets + Wizard 3 étapes

**Tests global** : 1450 → 1803 (+353 sur 9 jours)
**Liens** : [[decisions]] · [[learnings]] · [[blockers]]

---

## 2026-05-08 · [V72] Vagues M+N+O+P4 — push backend, queue 6 tables, Marius dynamique, wizard 2-loges · commit `93e8871`

**Livré** (4 sub-agents Opus 4.7 dispatched parallèle + 1 debugger) :
- **Vague M** — extension `offlineQueue` 6 tables (pesees/porcelets_individuels/loges/loge_movements/daily_checks_mb/feed_consumption_logs). 9 helpers thin pattern runInsert/runUpdate dans supabaseWrites. Wizard migré.
- **Vague N** — Marius suggestions dynamiques. 8 règles métier (mise-bas imminente, rupture stock, retour chaleur, écho, alertes critiques, surdensité, sevrage proche, fallback). Remplace HINTS statiques.
- **Vague O** — Push backend complet. Table `push_subscriptions` + Edge Function `send-push` (VAPID/web-push@3.6.7) + frontend `pushSubscription.ts` + SW handler `push-handler.js` + UI `PushNotifToggle` Réglages.
- **V72-P4** — refonte wizard `PorceletsReorgWizard` selon scénario éleveur Christophe. Migration `porcelets_individuels.loge_id` (1 bande peut occuper 2 loges F+M). Wizard 5 étapes : sélection → numéro libre → truie/verrat optionnel → loge1 (F/M/Mixte) → loge2 optionnelle → confirm. BandeDetailView multi-loges via `listLogesEffectivesParBande`.

**Reset DB Christophe** (`bc96ddbd-c34d-46b1-b624-4a3dca181a2c`) — 5 loges supprimées + backup `farms.metadata.v72_p4_reset_loges_bandes_backup`. État final : 0 loge / 0 batch / 117 porcelets vrac (batch_id NULL) / 117 pesées / 17 truies / 2 verrats / 10 saillies. Wizard auto-redirect au prochain login.

**Bug "Bande introuvable"** — diagnostiqué via sub-agent debugger : pas un bug code mais cache PWA stale + 0 batch DB. Les "4" affichées = 4 truies "En maternité" rendues comme portées dérivées avec liens vers fiche bande inexistante.

**Tests** : 1840 (Vague N) → 1855 (M) → 1866 (O) — +42 sur baseline pré-V72 (1824)
**TSC** : 0 erreur (3 erreurs offlineQueue.tables.test.ts fixées via type des mocks)
**Build** : OK 2.88s, PWA 95 entries

**Actions manuelles à charge user** : `node scripts/gen-vapid-keys.mjs` + configurer `VITE_VAPID_PUBLIC_KEY` (.env.local) + `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` (Dashboard Supabase Edge Functions secrets).

**Audit UI public** : login/landing-v2/a-propos/signup/privacy DNA V70 OK. 1 typo détectée à corriger ("FROISSEES" → "FROISSÉES" sur landing).

**Liens** : [[decisions#bande-2-loges]] · [[decisions#numero-bande-libre]] · src/features/onboarding/PorceletsReorgWizard.tsx · src/services/pushSubscription.ts

---

## 2026-05-08 · [V73] Vagues P+Q+R — landing 13 images + crash hardening + photos · commit `5709fbd`

**Livré** (3 sub-agents Opus 4.7 dispatched parallèle) :
- **Vague P** — Refonte landing-v2 avec 13 images premium photoréalistes (DNA "Terrain Vivant" : bois clair + inox + caillebotis béton). Compression sharp+mozjpeg ~30x (115MB → 3.7MB). Hero/repro/alertes/alimentation/Marius orb/avatars Truie+Verrat/empty states. Manifest PWA + OG meta. Fix typo "FROISSEES" → "FROISSÉES" (CSS uppercase + BigShoulders dépouillait accents → fix par écriture directe majuscules accentuées source).
- **Vague Q** — Tests crash + robustesse webapp pré-launch multi-utilisateurs. 2 bugs P1 fixés : (1) mutex `_inFlight` queue (coalesce flushs concurrents en network flapping) ; (2) cap 1000 items queue + `QueueFullError` (anti-saturation Preferences 4MB Android). Audit RLS : 0 table critique sans policy. 5 issues P2 backlog : SECURITY DEFINER REVOKE, search_path SET, leaked_password_protection toggle, vector ext move, optimistic locking truies multi-users.
- **Vague R** — Module photos webapp PWA. `browser-image-compression@2.0.2` + `heic2any` lazy. Bucket `farm-photos` étendu (1MB → 5MB + HEIC/HEIF) + 3 RLS V73 (INSERT/UPDATE/DELETE par farm_id). Service `uploadEntityPhoto/deleteEntityPhoto/listEntityPhotos`. Composants `<PhotoUpload>` (drag&drop + capture caméra) + `<PhotoGallery>` (lightbox + swipe + suppression confirmée). Intégrés Truie/Verrat/Bande/Loge DetailViews. Path : `<farm_id>/<entity_type>/<entity_id>/<uuid>.webp`.

**Tests** : 1866 → 1898 passing (+32 stress/race + photos). tsc OK 0 erreur. Build 2.95s.
**Bundle impact** : +30-50KB gzip sans HEIC, +400KB conditionnel HEIC. Acceptable.

**Compte audit identifié** : `audit-final@porctrack.test` / OWNER / "Ferme Audit Test" — à utiliser pour audit UI authentifié en suivant.

**Bugs pré-existants signalés non bloquants (à fixer en V74)** :
- `index.html` référence `/manifest.webmanifest` mais fichier réel = `/manifest.json`
- 3 images surplus 5_58PM* dans `~/Downloads/` (variantes hero/alertes/repro non utilisées)
- `EntityAvatar useV73Defaults` opt-in (false par défaut, activé Truie+Verrat xl uniquement)
- Empty states V73 branchés Animaux + Alerts (Today/Bandes/Loges en suivant)

**Liens** : [[decisions#bande-2-loges]] · src/services/photoUpload.ts · src/v70/components/v70/PhotoUpload.tsx · src/services/offlineQueue.ts:525-535

---

## 2026-05-09 · [V74-V] Vague V — loading guards listings + signaux cancelled async · commit `229b942`

**Livré** (1 session orchestrateur, suite logique de V74-U `2874558`) :

- **Pattern listings** : nouveau hook `src/hooks/useListingLoadingGuard.ts` (36L) + composant partagé `src/components/design/ListingSkeleton.tsx` (44L). Élimine la classe de bug "faux empty state" pendant le chargement initial du FarmContext (items=[] vu avant `refreshAll()`, "Aucune truie" affiché 1-2s puis 50 truies surgissent). Le hook retourne `true` tant que `loading=true` ; en `loading=false` + `count=0` on laisse l'appelant afficher son empty state légitime.

- **6 listings refactorés** : TroupeauTruiesView, TroupeauVerratsView, TroupeauPorceletsView, AnimalsV70 (onglets bandes/loges uniquement — truies/verrats restent stubs cosmétiques), PerformanceV70 (Top performances), TodayV70 (registre alertes).

- **9 useEffect async durcis** avec signal `{ cancelled: false }` (pattern uniforme cleanup) : PhotoStrip, PhotoGallery, EncyclopediaArticle, AdminDashboard (LogsPanel + main), PendingValidationsView, FournisseursView, LogeDetailView, PoidsTriView, TroupeauLogesListView. Évite warnings React "setState on unmounted" + fuites mémoire en navigation rapide.

- **Tests** : nouveau `useListingLoadingGuard.test.ts` (47L, 5 cas) + `PhotoGallery.cancelled.test.tsx` (60L, vérifie absence de warning console.error via mock photoUpload). 4 snapshots ajustés.

**Tests** : 1898 → 1910 passing (+12). 0 régression. tsc OK 0 erreur. Build 3.08s, PWA 103 entries.

**Liens** : src/hooks/useListingLoadingGuard.ts · src/components/design/ListingSkeleton.tsx · [[learnings#cancelled-signal-pattern]]

---

## 2026-05-08 · [V74] Vagues S+T — sécurité Supabase + empty states finalisés · commit `8d23a3d`

**Livré** (2 sub-agents Opus 4.7 dispatched parallèle) :
- **Vague S** — Backlog P2 sécurité Supabase. Audit advisor 11 → 6 WARN. Migrations appliquées :
  - `v74_security_search_path` : 4 fonctions (`set_updated_at`, `match_notes`, `tg_push_subs_touch_updated_at`, `get_user_role`) sécurisées avec `SET search_path = public, pg_temp`
  - `v74_security_vector_schema` : extension `vector` déplacée `public` → `extensions` schema
  - `v74_security_revoke_helpers` : ROLLBACK obligé. Le REVOKE des 5 SECURITY DEFINER helpers (`current_user_farms`, etc.) cassait RLS car les policies utilisent `farm_id IN (SELECT current_user_farms())` — la sous-requête s'exécute dans le role appelant `authenticated`, pas en SECURITY DEFINER. Test critique a déclenché rollback automatique — **bon comportement**.

- **Vague T** — Empty states V73 finalisés + fix manifest pré-existant :
  - `TodayV70.tsx` : image `aucune-alerte.webp` au-dessus du texte "Carnet vide"
  - `AnimalsV70.tsx` : empty states différenciés bandes/loges/truies (désactivation des stubs hardcodés 6 fausses bandes / 5 fausses loges)
  - `TroupeauLogesListView.tsx` : remplacement `<EmptyState>` minimal par pattern V73 immersif
  - **Fix manifest** : suppression `public/manifest.json` orphelin (jamais référencé). `index.html` pointait déjà sur `/manifest.webmanifest` généré par vite-plugin-pwa. Renforcement `vite.config.ts` avec icones PNG 192/512/maskable + `lang: 'fr'`.

**Tests** : 1898 stable (0 régression). tsc OK. Build 2.96s.

**Backlog V75** (décisions architecturales requises) :
- 5 SECURITY DEFINER helpers : trancher entre Option A (move to `private` schema, ~20 policies à réécrire), Option B (SECURITY INVOKER + SQL inline policies), Option C (accept risk — les helpers ne fuitent rien, retournent uniquement les farm_ids du caller). **Mon avis : C** sauf audit externe demandant explicitement le fix.
- Optimistic locking truies multi-users (P2 backlog UI, hors scope migration).

**Action manuelle utilisateur** :
- Dashboard Supabase → Authentication → Settings → **Enable HaveIBeenPwned check** (anti-passwords leaked)

**Liens** : [[decisions]] · vite.config.ts · src/v70/pages/TodayV70.tsx · src/v70/pages/AnimalsV70.tsx · src/features/troupeau/TroupeauLogesListView.tsx

---

---

## 2026-05-17 · Session "App parfaite" — Vagues A/B/C cleanup + Chantier 0 sécurité

### Contexte
Suite session V82 conformité visuelle (forms + tokens). User demande "test l'app et dis-moi ce qu'il nous manque pour une app parfaite" puis enchaîne sur le cleanup repo + structuration.

### Commits poussés sur main
- `86a7752` chore(repo): vague A — worktrees / screenshots / .DS_Store / .bak (.claude/ : 595M → 16M)
- `4cc30f7` chore(repo): vague B — untrack dist/ + supprime sous-projet PorcTrack8/
- `1082484` chore(p0): 0 erreur ESLint + strip console.log/debug/info en prod (esbuild.pure)
- `d500772` chore(repo): vague C — racine propre + doc actualisée (README/CLAUDE/DESIGN seuls)
- `f475872` fix(security): rotation Mistral + migration Edge Function + headers sécu

### Vague A — Cleanup zéro risque (gain ~600M)
- 9 worktrees git agents abandonnés supprimés (.claude/worktrees/)
- 9 .DS_Store nettoyés + .tmp/ (20M screenshots audit du 11/05)
- 3 fichiers .bak orphelins
- .gitignore étendu : .tmp/, .tmp-audit/, _test_screenshots/, .test-screenshots/

### Vague B — Restructuration git
- 19 branches locales + 14 distantes supprimées (v43-*, migration/v44/v45/v70, worktree-agent-*, claude/*)
- `dist/` retiré du tracking (182 fichiers) — CI = source unique du déploiement
- `PorcTrack8/` sous-projet parasite supprimé (~30M JPG Gemini, orchestrator.cjs abandonné)
- État final : 2 branches (main + migration/v71-consolidation)

### Vague C — Doc lisible
- 13 fichiers MIGRATION_V*.md / V*_AUDIT*.md → .claude/_archive/migrations/
- _archive/2026-04-30/ (21M Sheets-Out) → .claude/_archive/2026-04-30-sheets-out/
- .claude/audits/ élagué (15M → 9.8M, garde V70+ uniquement)
- README.md récrit pour l'état V82 actuel (monorepo fictif supprimé)
- DESIGN.md vérifié à jour
- Racine : README.md, CLAUDE.md, DESIGN.md (point)

### Mini-Chantier P0 — ESLint + console.log
- 2 erreurs ESLint résolues (ReproTracker `ProgressGauge` sorti du render, TabsMini useless-assignment)
- `esbuild.pure: ['console.log', 'console.debug', 'console.info']` en NODE_ENV=production → 80 logs source disparaissent du bundle prod (vérifié : 0 dans dist/assets hors vendors heic2any/image-compression)

### Audit complet livré par Claude PC (.claude/AUDIT_2026-05-17.md)
- Phase 1 (tests fonctionnels) : bloqué par mdp `AuditPorc2026!` rejeté
- Phase 1 alt : 15 routes publiques 200, scan code, données DB Christophe
- Phase 2 : qa-runner + code-reviewer + security-reviewer en // (avec spot-checks orchestrateur)
- 3 chantiers proposés : A workflow loges/bandes · B sécurité critique · C dette technique

### Chantier 0 sécurité — exécuté ici (~1h30)
F-01 CRITICAL confirmé en prod par spot-check : clé Mistral + token VPS dans `dist/assets/index-D9ZZxbo1.js` du bundle live.

**Actions** :
1. Nouvelle clé Mistral fournie par user (révocation ancienne côté Mistral = action manuelle)
2. Secret `MISTRAL_API_KEY` créé server-side via Supabase Management API (HTTP 201)
3. Edge Function `marius-chat` étendue pour accepter `{ messages: [...] }` (préserve historique conversationnel), borne 12 msgs × 2000 chars, CORS bornée
4. `mariusApi.ts` réécrit : 100% Edge Function, plus aucune réf direct Mistral/VPS
5. `ChatbotWidget.tsx` : suppression 88 lignes de duplication, import depuis `./mariusApi`
6. `.env.local` : retrait `VITE_MISTRAL_API_KEY` + `VITE_MARIUS_API_KEY` + `VITE_MARIUS_API_BASE`
7. Test `ChatbotWidget.test.tsx` adapté : stub `VITE_SUPABASE_*` + mock `supabase.auth.getSession`
8. Trigger `prevent_profile_role_escalation` (BEFORE UPDATE on profiles) — F-04 fermé
9. `public/.htaccess` : 5 headers OWASP (HSTS preload, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy) — F-05 fermé
10. Compte audit `audit-senior@porctrack.test / AuditSr2026.` PORCHER ferme Christophe créé pour Claude PC

**Vérifications post-deploy** (bundle live `index-BboK1U06.js`) :
- ✅ 0 occurrence `TQXuKoW...` (ancienne clé)
- ✅ 0 occurrence `marius-secret-key-2026` (ancien token VPS)
- ✅ 0 occurrence `8jVTqisc...` (nouvelle clé — server-side uniquement)
- ✅ HSTS + X-Frame-Options + nosniff + Referrer + Permissions headers présents

### Coordination Claude PC
- Brief envoyé à PC pour Chantier A workflow loges/bandes (1B = 2L F+M)
- Zones disjointes : PC sur `src/components/forms/` + `src/v70/pages/` + `src/types/`, moi sur `supabase/` + `.env` + secrets + migrations
- PC attend signal commit `f475872` pour démarrer Phase 1 plongée parcours Christophe

### Plan Vague D (préparé par sub-agent Plan)
4 chantiers indépendants (~22-30h total) :
- D1 workflow loges/bandes (1B=2L) — assigné à PC
- D2 FAB Saisir branché sur 9 routes (1 listener seulement actuellement)
- D3 collapse supabaseWrites.ts (1728L) vers repos par domaine
- D4 Supabase advisors quick wins (RLS initplan + FK indexes + dedupe) — **EN COURS ici**

### Métriques finales session
- tsc : 0 erreur
- vitest : 2145/2145 passing (178 fichiers)
- eslint : 0 erreur 0 warning bloquant
- build : OK, bundle prod 0 clé exposée
- branches : 2 (main + v71)
- .claude/ : 16M (vs 595M en début de session)
