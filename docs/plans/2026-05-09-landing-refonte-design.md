# Refonte landing PorcTrack 2026 — design

> Type : spec design (pas plan d'implémentation). Le plan task-par-task suivra via `superpowers:writing-plans` (commits `v75-d/e/f`).

**Goal :** Remplacer la landing-v2 actuelle (thème sombre `#0a0a0a` générique, 4 scènes stubs vides, copy ironique non orienté conversion) par une landing immersive vidéo-first alignée DNA Terrain Vivant, voix directe et technique, structurée pour la conversion d'éleveurs naisseurs-engraisseurs francophones d'Afrique de l'Ouest.

**Contexte état actuel landing-v2** :
- `LandingScrollytelling.tsx` orchestre 7 scènes via GSAP + ScrollTrigger + Lenis
- 3 scènes seulement ont du contenu réel : `SceneHero` (189 L, fond noir), `SceneBandes` (211 L), `SceneCta` (134 L)
- 4 scènes vides : `SceneRepro` (23 L), `SceneFeed` (21 L), `SceneHealth` (37 L), `SceneOffline` (23 L)
- Hero : texte blanc sur fond `#0a0a0a`, CTA `#10b981` vert mint, headline accent `#34d399` — **violation directe du DNA Terrain Vivant** (palette terre/cream/vert forêt validée brief V70)
- Image hero statique `hero-wide.jpg` — pas de vidéo, pas d'immersion

**Tech Stack :** TypeScript strict · React 18 · GSAP 3 + ScrollTrigger · `@gsap/react` (useGSAP) · Lenis · Tailwind v4 + tokens `--pt-*` · Vitest · Playwright.

**Sources :**
- Vidéo cinématique 8s déjà rendue : `~/Downloads/PorcTrack — Maternity Barn at Dawn (8s)-2736-0.mp4` (1.9 MB, watermark Creatify bottom-right à masquer)
- 13 photos premium "Terrain Vivant" Nano Banana V73 : `public/images/v73/landing/`
- Brief V70 strict : `~/.claude/projects/-Users-13mac/memory/reference_porctrack8_v70_brief.md`

---

## 1. Choix structurants validés (brainstorming 2026-05-09)

| Choix | Décision validée |
|---|---|
| Format de scroll | **Vidéo plein écran sticky en arrière-plan + sections cards qui flottent par-dessus** |
| Voix copywriting | **Directe & technique** — promesse fonctionnelle, vocabulaire métier, chiffres réels |
| Palette | Tokens `--pt-*` brief V70 strict (vert forêt `#2D4A1F`, cream `#F5E9D8`, ambre `#B8703D`, ivoire `#FAF7F0`) |
| Stack JS | Conservé : GSAP + ScrollTrigger + Lenis (pas de migration) |
| Mobile vidéo | Fallback poster JPEG sur < 768px (pas de regen 9:16 v1) |

---

## 2. Architecture

### 2.1 Suppressions

- `src/pages/landing-v2/scenes/SceneRepro.tsx` (stub vide)
- `src/pages/landing-v2/scenes/SceneFeed.tsx` (stub vide)
- `src/pages/landing-v2/scenes/SceneHealth.tsx` (stub vide)
- `src/pages/landing-v2/scenes/SceneOffline.tsx` (stub vide)
- `src/pages/landing-v2/scenes/SceneBandes.tsx` (refondu en `SectionWorkflow`)

### 2.2 Refontes

- `src/pages/landing-v2/scenes/SceneHero.tsx` → réécrit complet (vidéo bg, palette `--pt-*`, copy nouvelle)
- `src/pages/landing-v2/scenes/SceneCta.tsx` → réécrit complet (palette + copy nouvelle)
- `src/pages/landing-v2/LandingScrollytelling.tsx` → nouveau set d'imports, suppression `background: '#0a0a0a'`

### 2.3 Créations

- `src/pages/landing-v2/scenes/FloatingCardsStack.tsx` (nouveau) — 3 cards floating au-dessus de la vidéo sticky
- `src/pages/landing-v2/scenes/SceneVideoBreak.tsx` (nouveau) — second moment vidéo (placeholder photo si vidéo 2 pas encore générée)
- `src/pages/landing-v2/scenes/SectionPourQui.tsx` (nouveau) — 3 profils éleveurs
- `src/pages/landing-v2/scenes/SectionWorkflow.tsx` (nouveau) — 3 étapes "comment ça marche"
- `src/pages/landing-v2/scenes/SectionMarius.tsx` (nouveau) — capture conversation Marius
- `public/videos/landing/hero-maternity-dawn.mp4` (assets) — copie compressée de la vidéo Creatify
- `public/videos/landing/hero-maternity-dawn.webm` (assets) — fallback VP9
- `public/videos/landing/hero-maternity-dawn-poster.jpg` (assets) — frame 1 mozjpeg ~80 KB

---

## 3. Structure narrative finale (7 sections, 1 vidéo bg sticky transverse aux 2 premières)

| # | Section | Composant | Contenu |
|---|---|---|---|
| 1 | Hero immersif | `SceneHero` | Vidéo sticky bg + eyebrow + H1 + body + 2 CTAs |
| 2 | 3 cards produit flottantes | `FloatingCardsStack` | Repro / Bande / Alerte — captures UI réelles |
| 3 | Video break (2e vidéo ou photo) | `SceneVideoBreak` | 100vh, ambient quiet, transition |
| 4 | Pour qui | `SectionPourQui` | 3 profils éleveurs avec photos Nano Banana |
| 5 | Comment ça marche | `SectionWorkflow` | 3 étapes en quinconce avec flèches manuscrites SVG |
| 6 | Marius assistant | `SectionMarius` | Capture conversation + promesse |
| 7 | CTA final | `SceneCta` | Réaffirmation + footer sobre |

---

## 4. Copywriting (voix "directe & technique")

### Section 1 — Hero
- Eyebrow : `PORCTRACK · ÉLEVAGE 2026`
- H1 : `LA PRÉCISION EN PLEIN ÉLEVAGE`
- Body : `L'app GTTT pensée pour les naisseurs-engraisseurs d'Afrique de l'Ouest. 117 porcelets, 13 bandes, 5 loges suivis sans Excel.`
- CTA primaire : `DÉMARRER MON ÉLEVAGE` → `/signup`
- CTA secondaire : `Voir une démo ›` → `#demo` (ancre vers SectionMarius pour v1)

### Section 2 — 3 floating cards
- Card Repro : eyebrow `REPRO` · titre `T-031 · PLEINE J42` · meta `Mise-bas prévue 03/07 · ISSE 12.4`
- Card Bande : eyebrow `BANDE` · titre `BANDE MAI 2026 · T-001` · meta `11 NV sous mère · Sevrage 31/05`
- Card Alerte : eyebrow `ALERTE` · titre `À SORTIR BIENTÔT — T-018` · meta `Trop âgée ou pas assez de portées`

### Section 3 — Video break
Aucun texte. Vidéo ou photo plein écran 100vh.

### Section 4 — Pour qui
- Titre : `POUR QUI ?`
- Profil 1 : `ÉLEVEUR SEUL` · `Tu fais tout. PorcTrack te garde la mémoire.` · stat `17 truies · 0 oubli`
- Profil 2 : `ÉQUIPE FERME` · `2 à 5 personnes. Rôles WORKER/OWNER, sync live.` · stat `Tournée 2× plus rapide`
- Profil 3 : `COOPÉRATIVE` · `Plusieurs fermes. KPIs consolidés, accès lecture.` · stat `Vue groupe en 1 écran`

### Section 5 — Comment ça marche
- Titre : `COMMENT ÇA MARCHE`
- Étape 1 : `SAISIS TA PREMIÈRE BANDE` · `30 secondes. Hors-ligne possible.`
- Étape 2 : `L'APP CALCULE ISSE / IEM / GMQ` · `Métriques GTTT live, sans tableur.`
- Étape 3 : `MARIUS T'ALERTE` · `Mise-bas J-3, retour chaleur J+5, stocks bas.`

### Section 6 — Marius
- Titre : `MARIUS · ASSISTANT IA QUI CONNAÎT TON ÉLEVAGE`
- Capture conversation réelle (cf. audit V74) :
  > Question : « Que dois-je faire aujourd'hui en priorité ? »
  > Marius : « Priorité absolue : surveiller T-026 (mise-bas imminente J-2). Vérifier T-016 maternité (colostrum, mortalité <8%). Préparer sevrage 31/05 bandes Mai 2026. »
- Body : `Pas un chatbot générique. Marius lit tes truies, tes alertes, ton calendrier. Il répond avec tes données.`

### Section 7 — CTA final
- Eyebrow : `PRÊT ?`
- H2 : `TON ÉLEVAGE MÉRITE LA PRÉCISION.`
- CTA primaire répété : `DÉMARRER MON ÉLEVAGE` → `/signup`
- Footer : 1 ligne avec Mentions / Contact / Lien app `app.porctrack.tech`

---

## 5. Vidéos — intégration et watermark

### 5.1 Vidéo 1 — Maternity Barn at Dawn (rendue)
- Source : `~/Downloads/PorcTrack — Maternity Barn at Dawn (8s)-2736-0.mp4` (1.9 MB)
- Destinations : `public/videos/landing/hero-maternity-dawn.{mp4,webm}` + poster JPEG
- Markup :
  ```html
  <video autoplay muted loop playsinline preload="metadata"
         poster="/videos/landing/hero-maternity-dawn-poster.jpg"
         aria-label="Élevage porcin moderne au lever du jour, ambiance contemplative">
    <source src="/videos/landing/hero-maternity-dawn.webm" type="video/webm">
    <source src="/videos/landing/hero-maternity-dawn.mp4" type="video/mp4">
  </video>
  ```
- Position : `position: sticky; top: 0; height: 100vh; z-index: 0` couvrant Section 1 + Section 2
- Watermark Creatify bottom-right :
  - Mitigation principale : voile dégradé CSS bottom-up
    ```css
    background-image: linear-gradient(to top, var(--pt-bg) 0%, rgba(250,247,240,0.85) 14%, transparent 38%);
    ```
  - Le voile masque les ~14% du bas de la vidéo où se trouve le watermark
  - Sur Hero : ce voile sert aussi de fond pour les CTAs (transition naturelle)
  - Si ce voile est insuffisant après smoke test : option B = `object-position: center 6%` qui repousse vers le haut. Option C = upgrade Creatify Pro pour regen propre (~30$/mois).

### 5.2 Vidéo 2 — Tournée du soir (à générer plus tard)
- Concept : main éleveur + tablette PorcTrack posée sur montant en bois, lumière chaude, 6s
- v1 : **non bloquant**. Section 3 affiche à la place une photo Nano Banana zoom 100vh parmi `public/images/v73/landing/`
- Génération différée à un sprint séparé (commit `v75-g` ou ultérieur)

### 5.3 Mobile portrait (< 768px)
- Pas de vidéo bg sticky (problèmes de perf + 16:9 mal cadré)
- Remplacement par poster JPEG fixe en background des sections 1-2
- Texte hero centré, CTAs full-width

---

## 6. Palette et typographie

### 6.1 Tokens couleur — strict `--pt-*`
| Variable | Hex | Usage |
|---|---|---|
| `--pt-primary` | `#2D4A1F` | H1/H2, CTA primaire bg, soulignés |
| `--pt-warm` | `#F5E9D8` | Fond cards, voile vidéo, panneaux |
| `--pt-accent` | `#B8703D` | Liens, hover, eyebrows accentués, soulignés H1 |
| `--pt-bg` | `#FAF7F0` | Fond global hors vidéo |
| `--pt-ink` | `#1F3416` | Texte sur cream/ivoire |
| `--pt-ink-soft` | `rgba(31,52,22,0.65)` | Body secondaire |
| `--pt-line` | `rgba(31,52,22,0.12)` | Bordures cards |

**Couleurs interdites (à supprimer du code) :** `#0a0a0a` (background SceneHero actuel), `#10b981` (CTA actuel), `#34d399` (accent actuel), tout cyan / magenta / bleu / néon.

### 6.2 Typographie
- `var(--font-heading)` Big Shoulders Display 900 — H1/H2 uppercase, `letter-spacing: -0.02em` sur `clamp(40px, 8vw, 96px)`
- `var(--font-body)` Instrument Sans 400/500/600 — body, CTA labels, eyebrows (uppercase 0.20em)
- `var(--font-mono)` JetBrains Mono 400/600 — chiffres tabular-nums (ISSE, T-031, dates), codes
- Aucune autre fonte (pas d'Inter, pas de system-ui, pas de Roboto)

---

## 7. Animations GSAP

| Élément | Animation | Trigger ScrollTrigger |
|---|---|---|
| Hero H1 | Fade + translateY 40 → 0, scale 0.95 → 1, duration 0.9s, ease `power2.out` | `start: 'top 80%'`, `toggleActions: 'play none none reverse'` |
| Vidéo bg | `object-position` glide `center 20%` → `center 60%` | `scrub: 1.2`, `start: 'top top'`, `end: 'bottom top'` |
| Floating cards | Stagger fade + translateY 60 → 0, en quinconce (gauche/centre/droite) | `start: 'top 70%'`, stagger 0.15 |
| Voile vidéo | Opacité 0 → 0.5 quand on quitte le hero | `scrub: 1` |
| Step numbers (1/2/3) | Drawing SVG path sur entrée | `start: 'top 75%'` |
| Section CTA | `pin: true` 800px puis release | classique |

**Reduced motion** :
```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
```
→ aucune animation, vidéo bg → poster JPEG statique.

---

## 8. Performance et accessibilité

- LCP cible < 2.5s sur 4G : poster JPEG mozjpeg ~80 KB en `fetchpriority="high"`, vidéo `preload="metadata"` seulement
- CLS cible < 0.1 : sticky height fixe `100vh`, sections suivantes hauteur prédéfinie
- Vidéo 1 ne démarre que si `IntersectionObserver` la voit dans le viewport
- Vidéo 2 : `loading="lazy"` strict
- Detection mobile / connexion lente : `navigator.connection?.effectiveType` ∈ `{'2g', 'slow-2g', '3g'}` → fallback poster
- Contraste WCAG AA : voile sombre sur vidéo zone texte `rgba(31,52,22,0.45)`
- Touch targets ≥ 44px sur tous les CTA et liens
- `aria-label` descriptif sur les vidéos
- Pas de texte sur la vidéo en mobile, texte sur fond ivoire avec photo en arrière-plan
- Préférence utilisateur `prefers-reduced-data` détectée si supportée → fallback poster

---

## 9. Découpage commits (3 commits, pattern V72-V74)

### Commit `feat(v75-d): nettoyage landing-v2 + refactor LandingScrollytelling`
- Suppression des 4 scènes stubs (Repro, Feed, Health, Offline)
- Suppression des couleurs hard-coded hors palette dans SceneHero, SceneCta, LandingScrollytelling
- Refactor des imports dans `LandingScrollytelling.tsx`
- Background `#0a0a0a` → `var(--pt-bg)` (ivoire)
- Compression vidéo source + génération WebM + poster JPEG dans `public/videos/landing/`

### Commit `feat(v75-e): nouvelles sections vidéo + cards + workflow + pour qui`
- Refonte `SceneHero` (vidéo bg, palette `--pt-*`, copy nouvelle — même nom de fichier pour minimiser diff d'imports)
- Création `FloatingCardsStack`, `SceneVideoBreak`, `SectionPourQui`, `SectionWorkflow`
- Intégration vidéo sticky bg, voile dégradé, copy "directe & technique"
- Animations GSAP cards + parallax vidéo
- Smoke browser smartphone + desktop

### Commit `feat(v75-f): SectionMarius + SceneCta refondue + tests Playwright`
- Création `SectionMarius` avec capture conversation
- Refonte `SceneCta` palette + copy
- Animations step numbers + section CTA pin
- Tests Playwright `tests/e2e/landing-v75.spec.ts` : palette respectée (pas de #0a0a0a / #10b981 dans le DOM rendu), 7 sections présentes, vidéo charge et autoplay
- Bloc `=== VERIFICATION ===` AGENT_CONTRACT

---

## 10. Plan de tests

### 10.1 Vitest
- Aucun test unitaire dédié pour les composants Scene (logique purement présentationnelle, GSAP testé via Playwright)
- Cible inchangée : ≥ 1898 baseline (chantier landing n'ajoute pas de logique métier)

### 10.2 Playwright `tests/e2e/landing-v75.spec.ts`
- Spec 1 : navigation `/` → 7 sections visibles au scroll progressif
- Spec 2 : audit DOM — aucune chaîne `#0a0a0a`, `#10b981`, `#34d399` rendue dans `getComputedStyle` des éléments principaux
- Spec 3 : vidéo charge et autoplay (`video.readyState >= 2` et `paused === false` après 3s)
- Spec 4 : CTAs primaires liés à `/signup` (assert `href`)
- Spec 5 : poster JPEG hero a `fetchpriority="high"` et est requesté en early fetch (assert via `page.on('request')` que le poster est demandé avant la vidéo)

### 10.3 Smoke browser après chaque commit
- Compte `audit-final@porctrack.test`, naviguer `/` (landing)
- Vérifier vidéo lit en boucle, watermark masqué par voile, copy lisible
- DevTools console : 0 erreur, 0 warning
- Mobile DevTools 360px width : poster fallback affiché, CTAs accessibles

### 10.4 AGENT_CONTRACT bloc VERIFICATION par commit
```
=== VERIFICATION ===
1. wc -l <fichiers nouveaux/modifiés>
2. git diff --stat HEAD~1
3. npx tsc --noEmit                  → 0 erreur
4. npm run test:unit                  → ≥ 1898 passing (baseline préservée)
5. npm run build                      → exit 0, taille bundle landing acceptable
6. git log --oneline -1               → hash + sujet
7. delta tests : 1898 → 1898 (chantier UI-only)
8. régression check : aucun test passing avant qui échoue après
```

---

## 11. Critères "done"

- 3 commits poussés (`v75-d`, `v75-e`, `v75-f`)
- 7 sections affichées dans l'ordre prévu sur `https://localhost:5173/` (route landing)
- Vidéo sticky autoplay loop avec watermark Creatify masqué visuellement
- Aucune occurrence de `#0a0a0a`, `#10b981`, `#34d399` dans le code rendu
- Tous les CTAs `DÉMARRER MON ÉLEVAGE` redirigent vers `/signup`
- Tous les textes en français hardcodés cohérents avec voix "directe & technique"
- Mobile 360px : poster fallback + texte lisible + CTAs full-width
- Lighthouse Performance ≥ 80 sur desktop, ≥ 70 sur mobile
- 5 specs Playwright vertes
- Smoke browser : 0 erreur console
- Push prod via deploy_vps.sh + smoke `https://porctrack.tech/`

---

## 12. Hors-scope (chantiers ultérieurs)

- **Vidéo 2** Tournée du soir / Tablette élevage — sprint séparé (`v75-g` ou +)
- **Régen 9:16 mobile** : si conversion mobile chute, ajouter au sprint suivant
- **Section Pricing** : décision produit séparée, pas dans v1
- **Section "Trust" / logos clients** : pas encore de clients à mettre en avant
- **i18n** : tout français hardcodé, cohérent app
- **Page démo dédiée `/demo`** : pas dans ce chantier — `Voir une démo ›` ancre vers `#marius` pour l'instant
- **Refactor `useScrollUnlock`** : risque conflit sticky / Ionic à mitiger en Task 1, refactor profond hors-scope
- **A/B test variantes copywriting** : pas dans v1, à brancher Plausible/PostHog plus tard

---

## 13. Risques

- **Performance vidéo bg sticky sur Android entry-level** : 8s loop H.264 1080p peut saccader. Mitigation : detection `effectiveType` 2g/3g → fallback poster. À valider en smoke test sur device bas de gamme via Chrome DevTools throttling.
- **Watermark Creatify visible malgré voile CSS** : si test browser réel laisse le watermark partiellement visible, escalade vers (a) `object-position` shift, (b) Creatify Pro regen, (c) crop manuel via ffmpeg en pré-prod.
- **`useScrollUnlock` hack DOM Ionic** : conflit potentiel avec sticky. Tester dès le Task 1 du plan d'exécution.
- **Texte hero illisible si vidéo trop claire** : voile sombre 45% par défaut, ajustable au pixel. Plan de fallback : si voile insuffisant, augmenter contrast à 55% sans casser l'esthétique.
- **GSAP ScrollTrigger refresh sur changement viewport mobile (clavier qui s'ouvre)** : à tester. Mitigation : `ScrollTrigger.config({ ignoreMobileResize: true })`.
- **Bundle size** : vidéo MP4 1.5 MB + WebM 800 KB + poster 80 KB = ~2.4 MB d'assets. Tolérable sur 4G mais à monitorer après commit `v75-d`.

---

## 14. Inputs prêts (présents sur disque)

- ✅ Vidéo source : `~/Downloads/PorcTrack — Maternity Barn at Dawn (8s)-2736-0.mp4`
- ✅ 13 photos premium V73 : `public/images/v73/landing/` (à confirmer noms exacts au démarrage)
- ✅ Tokens CSS `--pt-*` : `src/v70/theme/v70-tokens.css` (à confirmer fichier exact)
- ✅ Notes session designer + HugeIcons (style Stroke-Rounded recommandé) : `docs/landing/2026-05-09-designer-pro-conseils.md`

## 15. Prérequis avant Task 1 du plan d'exécution

- Branche `main` propre, sans changements en cours
- Tests baseline verts : `npm run test:unit` ≥ 1898 passing
- Déterminer si chantier naming-coherence (V75 a/b/c) est mergé en amont, ou paralléliser. **Recommandation** : exécuter naming-coherence d'abord (changements code dans `src/v70/`), puis landing (changements dans `src/pages/landing-v2/`) — pas de conflit de fichiers attendu, mais commit séquentiel évite les merges complexes.
- Installer `ffmpeg` côté machine dev pour compression vidéo (`brew install ffmpeg`) — nécessaire pour Task `v75-d`

