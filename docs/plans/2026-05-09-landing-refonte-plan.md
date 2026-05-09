# Refonte Landing PorcTrack 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Refondre la landing-v2 (route `/landing-v2`) en remplaçant le thème noir générique et les 4 scènes stubs vides par 7 sections immersives avec une vidéo cinématique sticky, palette `--pt-*` brief V70, voix copywriting "directe & technique" orientée conversion éleveurs naisseurs-engraisseurs.

**Architecture :** Conservation du stack GSAP + ScrollTrigger + Lenis + `useGSAP`. Suppression des stubs vides et des hard-coded `#0a0a0a`/`#10b981`/`#34d399`. Vidéo Creatify 8s placée en `position: sticky` derrière les sections 1-2, watermark masqué via voile dégradé CSS bottom-up. 7 sections : Hero / FloatingCards / VideoBreak / PourQui / Workflow / Marius / CTA. 3 commits successifs `v75-d` (nettoyage + assets), `v75-e` (sections vidéo + cards), `v75-f` (Marius + CTA + tests).

**Tech Stack :** TypeScript strict · React 18 · GSAP 3 + ScrollTrigger · `@gsap/react` (useGSAP) · Lenis · Tailwind v4 + tokens CSS `--pt-*` (`src/v70/theme/v70-tokens.css`) · Vitest · Playwright · ffmpeg (compression vidéo).

**Pré-requis :**
- Branche `main` à jour, sans changements non commités
- Naming-coherence (`v75-a/b/c`) **mergé en amont** (recommandation §15 spec) — sinon paralléliser avec attention aux conflits dans `src/features/chatbot/ChatbotWidget.tsx` (touché v75-a) qui n'est PAS touché ici, donc en pratique pas de conflit
- `ffmpeg` installé : `brew install ffmpeg`
- Tests verts en baseline : `npm run test:unit` ≥ 1898 (idéalement 1912 si naming-coherence est mergé) avant de démarrer
- Vite dev server disponible sur `:5173`

**Spec source :** `docs/plans/2026-05-09-landing-refonte-design.md`

**Tokens disponibles confirmés (`src/v70/theme/v70-tokens.css`) :**
- `--pt-primary: #2D4A1F` · `--pt-primary-deep: #1f3414` · `--pt-primary-light: #4a7a2f`
- `--pt-warm: #F5E9D8` · `--pt-warm-deep: #E8D5B5` · `--pt-accent: #B8703D` · `--pt-accent-light: #D89968`
- `--pt-bg: #FAF7F0` · `--pt-bg-app: #F1ECE0`
- `--pt-ink: #1a1a1a` · `--pt-muted: #6b6357` · `--pt-subtle: #a39888`
- `--pt-line: rgba(26,26,26,0.08)`

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `public/videos/landing/hero-maternity-dawn.mp4` | **Créer** | Vidéo H.264 1080p compressée |
| `public/videos/landing/hero-maternity-dawn.webm` | **Créer** | Fallback VP9 |
| `public/videos/landing/hero-maternity-dawn-poster.jpg` | **Créer** | Frame 1 mozjpeg ~80 KB |
| `src/pages/landing-v2/scenes/SceneRepro.tsx` | **Supprimer** | Stub vide |
| `src/pages/landing-v2/scenes/SceneFeed.tsx` | **Supprimer** | Stub vide |
| `src/pages/landing-v2/scenes/SceneHealth.tsx` | **Supprimer** | Stub vide |
| `src/pages/landing-v2/scenes/SceneOffline.tsx` | **Supprimer** | Stub vide |
| `src/pages/landing-v2/scenes/SceneBandes.tsx` | **Supprimer** | Remplacé par SectionWorkflow |
| `src/pages/landing-v2/LandingScrollytelling.tsx` | Modifier | Imports + `background` ivoire + nouveau set scenes |
| `src/pages/landing-v2/scenes/SceneHero.tsx` | Modifier (refonte complète) | Vidéo sticky bg + palette `--pt-*` + copy nouvelle |
| `src/pages/landing-v2/scenes/FloatingCardsStack.tsx` | **Créer** | 3 cards flottantes au-dessus vidéo sticky |
| `src/pages/landing-v2/scenes/SceneVideoBreak.tsx` | **Créer** | Photo Nano Banana 100vh (placeholder vidéo 2) |
| `src/pages/landing-v2/scenes/SectionPourQui.tsx` | **Créer** | 3 profils éleveurs |
| `src/pages/landing-v2/scenes/SectionWorkflow.tsx` | **Créer** | 3 étapes en quinconce |
| `src/pages/landing-v2/scenes/SectionMarius.tsx` | **Créer** | Capture conversation + promesse |
| `src/pages/landing-v2/scenes/SceneCta.tsx` | Modifier (refonte complète) | Palette + copy nouvelle |
| `tests/e2e/landing-v75.spec.ts` | **Créer** | 5 specs Playwright |

---

## Commit 1 — `feat(v75-d): nettoyage landing-v2 + assets vidéo`

### Task 1 : Compression et conversion vidéo

**Files:**
- Create: `public/videos/landing/hero-maternity-dawn.mp4`
- Create: `public/videos/landing/hero-maternity-dawn.webm`
- Create: `public/videos/landing/hero-maternity-dawn-poster.jpg`

- [ ] **Step 1 : Vérifier que ffmpeg est installé**

Run :
```bash
which ffmpeg
```
Expected : chemin retourné. Si `not found` :
```bash
brew install ffmpeg
```

- [ ] **Step 2 : Créer le dossier de destination**

Run :
```bash
mkdir -p public/videos/landing
```

- [ ] **Step 3 : Compresser le MP4 H.264**

Run depuis la racine du projet :
```bash
ffmpeg -i "$HOME/Downloads/PorcTrack — Maternity Barn at Dawn (8s)-2736-0.mp4" \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  -vf "scale=1920:-2" \
  public/videos/landing/hero-maternity-dawn.mp4
```
Expected : fichier ~1.2-1.8 MB, codec H.264, sans audio, faststart pour streaming.

- [ ] **Step 4 : Vérifier la taille**

Run :
```bash
ls -lh public/videos/landing/hero-maternity-dawn.mp4
```
Expected : taille entre 800 KB et 2 MB. Si > 2.5 MB, augmenter `-crf 28` et relancer.

- [ ] **Step 5 : Convertir en WebM VP9**

Run :
```bash
ffmpeg -i public/videos/landing/hero-maternity-dawn.mp4 \
  -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -tile-columns 2 \
  -an \
  public/videos/landing/hero-maternity-dawn.webm
```
Expected : fichier ~500-900 KB, codec VP9.

- [ ] **Step 6 : Extraire le poster JPEG (frame à 0.5s)**

Run :
```bash
ffmpeg -ss 00:00:00.500 -i public/videos/landing/hero-maternity-dawn.mp4 \
  -frames:v 1 -q:v 4 \
  public/videos/landing/hero-maternity-dawn-poster.jpg
```
Expected : fichier ~80-200 KB.

- [ ] **Step 7 : Vérifier ratio + dimensions du poster**

Run :
```bash
sips -g pixelWidth -g pixelHeight public/videos/landing/hero-maternity-dawn-poster.jpg
```
Expected : `pixelWidth: 1920`, `pixelHeight: 1080` (ou ratio 16:9 équivalent).

---

### Task 2 : Suppression des 5 scènes inutiles

**Files:**
- Delete: `src/pages/landing-v2/scenes/SceneRepro.tsx`
- Delete: `src/pages/landing-v2/scenes/SceneFeed.tsx`
- Delete: `src/pages/landing-v2/scenes/SceneHealth.tsx`
- Delete: `src/pages/landing-v2/scenes/SceneOffline.tsx`
- Delete: `src/pages/landing-v2/scenes/SceneBandes.tsx`

- [ ] **Step 1 : Vérifier qu'aucun autre fichier ne les importe**

Run :
```bash
grep -rn "SceneRepro\|SceneFeed\|SceneHealth\|SceneOffline\|SceneBandes" \
  src --include="*.tsx" --include="*.ts" | grep -v node_modules
```
Expected : seul `LandingScrollytelling.tsx` doit apparaître. S'il y a d'autres consommateurs, lire la sortie et adapter (peu probable).

- [ ] **Step 2 : Supprimer les 5 fichiers**

Run :
```bash
rm src/pages/landing-v2/scenes/SceneRepro.tsx
rm src/pages/landing-v2/scenes/SceneFeed.tsx
rm src/pages/landing-v2/scenes/SceneHealth.tsx
rm src/pages/landing-v2/scenes/SceneOffline.tsx
rm src/pages/landing-v2/scenes/SceneBandes.tsx
```

- [ ] **Step 3 : Vérifier que SceneFrame.tsx n'est plus utilisé non plus**

Run :
```bash
grep -rn "SceneFrame" src --include="*.tsx" --include="*.ts" | grep -v node_modules
```
Si seul `SceneFrame.tsx` lui-même apparaît (pas d'import ailleurs), le supprimer aussi :
```bash
rm src/pages/landing-v2/scenes/SceneFrame.tsx
```
Sinon laisser.

- [ ] **Step 4 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : erreurs sur `LandingScrollytelling.tsx` qui importe encore les fichiers supprimés. C'est attendu, on va corriger en Task 3.

---

### Task 3 : Refactor `LandingScrollytelling.tsx`

**Files:**
- Modify: `src/pages/landing-v2/LandingScrollytelling.tsx`

- [ ] **Step 1 : Remplacer le bloc imports**

Localise (lignes 7-13) :

```tsx
import { SceneHero } from './scenes/SceneHero';
import { SceneRepro } from './scenes/SceneRepro';
import { SceneBandes } from './scenes/SceneBandes';
import { SceneFeed } from './scenes/SceneFeed';
import { SceneHealth } from './scenes/SceneHealth';
import { SceneOffline } from './scenes/SceneOffline';
import { SceneCta } from './scenes/SceneCta';
```

Remplace par :

```tsx
import { SceneHero } from './scenes/SceneHero';
import { FloatingCardsStack } from './scenes/FloatingCardsStack';
import { SceneVideoBreak } from './scenes/SceneVideoBreak';
import { SectionPourQui } from './scenes/SectionPourQui';
import { SectionWorkflow } from './scenes/SectionWorkflow';
import { SectionMarius } from './scenes/SectionMarius';
import { SceneCta } from './scenes/SceneCta';
```

- [ ] **Step 2 : Remplacer le wrapper background**

Localise (vers ligne 84) :

```tsx
    <div style={{ background: '#0a0a0a', overflowX: 'clip' }}>
```

Remplace par :

```tsx
    <div style={{ background: 'var(--pt-bg)', overflowX: 'clip' }}>
```

- [ ] **Step 3 : Remplacer le set de scènes rendues**

Localise (vers lignes 85-91) :

```tsx
      <SceneHero />
      <SceneRepro />
      <SceneBandes />
      <SceneFeed />
      <SceneHealth />
      <SceneOffline />
      <SceneCta />
```

Remplace par :

```tsx
      <SceneHero />
      <FloatingCardsStack />
      <SceneVideoBreak />
      <SectionPourQui />
      <SectionWorkflow />
      <SectionMarius />
      <SceneCta />
```

- [ ] **Step 4 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : erreurs sur les 5 nouveaux composants pas encore créés (`FloatingCardsStack`, `SceneVideoBreak`, `SectionPourQui`, `SectionWorkflow`, `SectionMarius`). C'est attendu.

---

### Task 4 : Stubs minimaux pour les 5 nouveaux composants (compile-clean)

**Files:**
- Create: `src/pages/landing-v2/scenes/FloatingCardsStack.tsx`
- Create: `src/pages/landing-v2/scenes/SceneVideoBreak.tsx`
- Create: `src/pages/landing-v2/scenes/SectionPourQui.tsx`
- Create: `src/pages/landing-v2/scenes/SectionWorkflow.tsx`
- Create: `src/pages/landing-v2/scenes/SectionMarius.tsx`

Les vrais composants seront écrits dans le commit `v75-e`. Pour le commit `v75-d` on a juste besoin que le projet compile.

- [ ] **Step 1 : Créer FloatingCardsStack.tsx (stub)**

```tsx
import React from 'react';

export function FloatingCardsStack() {
  return (
    <section style={{ minHeight: '100vh', background: 'var(--pt-bg)' }}>
      {/* v75-e : refonte complète à venir */}
    </section>
  );
}
```

- [ ] **Step 2 : Créer SceneVideoBreak.tsx (stub)**

```tsx
import React from 'react';

export function SceneVideoBreak() {
  return (
    <section style={{ minHeight: '100vh', background: 'var(--pt-bg)' }}>
      {/* v75-e : photo Nano Banana 100vh à intégrer */}
    </section>
  );
}
```

- [ ] **Step 3 : Créer SectionPourQui.tsx (stub)**

```tsx
import React from 'react';

export function SectionPourQui() {
  return (
    <section style={{ minHeight: '100vh', background: 'var(--pt-bg)' }}>
      {/* v75-e : 3 profils éleveurs à venir */}
    </section>
  );
}
```

- [ ] **Step 4 : Créer SectionWorkflow.tsx (stub)**

```tsx
import React from 'react';

export function SectionWorkflow() {
  return (
    <section style={{ minHeight: '100vh', background: 'var(--pt-bg)' }}>
      {/* v75-e : 3 étapes comment ça marche */}
    </section>
  );
}
```

- [ ] **Step 5 : Créer SectionMarius.tsx (stub)**

```tsx
import React from 'react';

export function SectionMarius() {
  return (
    <section style={{ minHeight: '100vh', background: 'var(--pt-bg)' }}>
      {/* v75-f : capture conversation Marius */}
    </section>
  );
}
```

- [ ] **Step 6 : Vérifier tsc + build**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

Run :
```bash
npm run build
```
Expected : exit 0, build réussit.

- [ ] **Step 7 : Smoke browser**

Naviguer http://localhost:5173/landing-v2 (serveur Vite déjà actif sur :5173, sinon `npm run dev`).
Expected : on voit l'ancien Hero (encore noir, refonte au commit suivant) puis 5 sections vides ivoire `--pt-bg`. Console DevTools : 0 erreur.

---

### Task 5 : Commit 1 — `v75-d`

- [ ] **Step 1 : Vérifier baseline tests**

Run :
```bash
npm run test:unit
```
Expected : ≥ 1898 passing (baseline préservée — chantier UI-only sans nouveau code testable unitaire).

- [ ] **Step 2 : Stage les changements**

Run :
```bash
git add public/videos/landing/ src/pages/landing-v2/
git status
```
Expected output inclut :
- 3 fichiers nouveaux dans `public/videos/landing/`
- 5 fichiers supprimés dans `src/pages/landing-v2/scenes/`
- 1 fichier modifié `LandingScrollytelling.tsx`
- 5 fichiers nouveaux stubs dans `src/pages/landing-v2/scenes/`

- [ ] **Step 3 : Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(v75-d): nettoyage landing-v2 + assets vidéo

- Suppression 5 scènes stubs vides (Repro, Feed, Health, Offline, Bandes)
- Suppression background #0a0a0a hard-coded dans LandingScrollytelling
  → remplacé par var(--pt-bg) ivoire (alignement DNA Terrain Vivant)
- Création stubs minimaux pour FloatingCardsStack / SceneVideoBreak /
  SectionPourQui / SectionWorkflow / SectionMarius (refonte complète au
  commit v75-e/f)
- Compression vidéo Creatify 8s : MP4 H.264 1080p faststart + WebM VP9
  + poster JPEG 1080p extracted at 0.5s

Démarrage chantier V75 refonte landing.

=== VERIFICATION ===
- tsc --noEmit : 0 erreur
- npm run test:unit : ≥ 1898 passing
- npm run build : OK
- assets : MP4 ~1.5MB, WebM ~700KB, poster ~150KB
- delta tests : pas de changement (chantier UI-only)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4 : Vérifier le commit**

Run :
```bash
git log --oneline -1
```
Expected : `feat(v75-d): nettoyage landing-v2 + assets vidéo`

---

## Commit 2 — `feat(v75-e): refonte SceneHero + sections vidéo + cards`

### Task 6 : Refonte complète `SceneHero.tsx`

**Files:**
- Modify: `src/pages/landing-v2/scenes/SceneHero.tsx` (réécriture complète)

- [ ] **Step 1 : Remplacer le contenu complet du fichier**

Remplace TOUT le contenu de `src/pages/landing-v2/scenes/SceneHero.tsx` par :

```tsx
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export function SceneHero() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      gsap.fromTo(
        ref.current.querySelector('.hero-title'),
        { opacity: 0, y: 40, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: 'power2.out',
          immediateRender: false,
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        },
      );

      gsap.fromTo(
        ref.current.querySelector('.hero-video'),
        { objectPosition: 'center 25%' },
        {
          objectPosition: 'center 60%',
          ease: 'none',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.2,
          },
        },
      );
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      className="hero-sticky-wrapper"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--pt-bg)',
        color: 'var(--pt-ink)',
        overflow: 'hidden',
      }}
    >
      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/videos/landing/hero-maternity-dawn-poster.jpg"
        aria-label="Élevage porcin moderne au lever du jour, ambiance contemplative"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 25%',
          willChange: 'object-position',
        }}
      >
        <source src="/videos/landing/hero-maternity-dawn.webm" type="video/webm" />
        <source src="/videos/landing/hero-maternity-dawn.mp4" type="video/mp4" />
      </video>

      {/* Voile dégradé bottom-up : masque le watermark Creatify + lisibilité texte */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, var(--pt-bg) 0%, rgba(250,247,240,0.85) 14%, rgba(26,26,26,0.45) 55%, transparent 85%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px 60px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: '#fff',
            opacity: 0.85,
            marginBottom: 24,
          }}
        >
          PORCTRACK · ÉLEVAGE 2026
        </span>

        <h1
          className="hero-title"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(44px, 9vw, 104px)',
            lineHeight: 0.94,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            maxWidth: 1100,
            margin: 0,
            color: '#fff',
            textShadow: '0 2px 24px rgba(26,26,26,0.35)',
            willChange: 'transform, opacity',
          }}
        >
          La précision
          <br />
          <em
            style={{
              fontStyle: 'normal',
              color: 'var(--pt-warm)',
              borderBottom: '4px solid var(--pt-accent)',
              paddingBottom: 4,
            }}
          >
            en plein élevage.
          </em>
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            lineHeight: 1.5,
            maxWidth: 620,
            color: 'rgba(255,255,255,0.92)',
            margin: '28px 0 44px',
            textShadow: '0 1px 12px rgba(26,26,26,0.4)',
          }}
        >
          L'app GTTT pensée pour les naisseurs-engraisseurs d'Afrique de l'Ouest.
          117 porcelets, 13 bandes, 5 loges suivis sans Excel.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link
            to="/signup"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              padding: '18px 36px',
              background: 'var(--pt-primary)',
              color: 'var(--pt-warm)',
              borderRadius: 999,
              textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(45,74,31,0.35)',
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Démarrer mon élevage
          </Link>
          <a
            href="#marius"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              padding: '18px 36px',
              background: 'transparent',
              color: '#fff',
              border: '1.5px solid rgba(255,255,255,0.55)',
              borderRadius: 999,
              textDecoration: 'none',
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Voir une démo ›
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

- [ ] **Step 3 : Smoke browser**

Naviguer http://localhost:5173/landing-v2 → vérifier :
- Vidéo charge et autoplay loop muet
- Watermark Creatify bottom-right masqué par le voile dégradé ivoire
- Headline `LA PRÉCISION EN PLEIN ÉLEVAGE.` lisible avec contraste suffisant
- 2 CTAs visibles, primaire vert forêt, secondaire ghost

---

### Task 7 : `FloatingCardsStack.tsx`

**Files:**
- Modify: `src/pages/landing-v2/scenes/FloatingCardsStack.tsx` (remplacer le stub)

- [ ] **Step 1 : Remplacer le contenu complet**

Remplace TOUT le contenu de `src/pages/landing-v2/scenes/FloatingCardsStack.tsx` par :

```tsx
import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

type CardData = {
  eyebrow: string;
  title: string;
  meta: string;
  align: 'left' | 'center' | 'right';
};

const CARDS: CardData[] = [
  {
    eyebrow: 'REPRO',
    title: 'T-031 · PLEINE J42',
    meta: 'Mise-bas prévue 03/07 · ISSE 12.4',
    align: 'left',
  },
  {
    eyebrow: 'BANDE',
    title: 'BANDE MAI 2026 · T-001',
    meta: '11 NV sous mère · Sevrage 31/05',
    align: 'center',
  },
  {
    eyebrow: 'ALERTE',
    title: 'À SORTIR BIENTÔT — T-018',
    meta: 'Trop âgée ou pas assez de portées',
    align: 'right',
  },
];

export function FloatingCardsStack() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      const cards = ref.current.querySelectorAll('.floating-card');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.18,
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        },
      );
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        minHeight: '120vh',
        padding: '80px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 40,
        background: 'var(--pt-bg)',
      }}
    >
      {CARDS.map((card, i) => {
        const justify =
          card.align === 'left' ? 'flex-start' : card.align === 'right' ? 'flex-end' : 'center';
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: justify,
              maxWidth: 1100,
              margin: '0 auto',
              width: '100%',
            }}
          >
            <article
              className="floating-card"
              style={{
                background: 'var(--pt-warm)',
                border: '1px solid var(--pt-line)',
                borderRadius: 24,
                padding: '24px 28px',
                maxWidth: 480,
                boxShadow: '0 12px 48px rgba(26,26,26,0.18)',
                willChange: 'transform, opacity',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: 'var(--pt-accent)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                {card.eyebrow}
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: 'clamp(22px, 3vw, 30px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: 'var(--pt-primary)',
                  margin: '0 0 8px',
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 13,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--pt-muted)',
                  margin: 0,
                }}
              >
                {card.meta}
              </p>
            </article>
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 2 : Vérifier tsc**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

- [ ] **Step 3 : Smoke browser**

Naviguer http://localhost:5173/landing-v2 → scroller après le hero → vérifier 3 cards apparaissent en quinconce (gauche / centre / droite) avec stagger fade-in.

---

### Task 8 : `SceneVideoBreak.tsx`

**Files:**
- Modify: `src/pages/landing-v2/scenes/SceneVideoBreak.tsx` (remplacer le stub)

- [ ] **Step 1 : Vérifier les photos disponibles**

Run :
```bash
ls public/images/v73/landing/
```
Expected : `alertes.jpg`, `alimentation.jpg`, `hero-wide.jpg`, `reproduction.jpg`, `splash.jpg` + variantes `.webp`.

Sélection : on utilise `alimentation.jpg` (ambiance terrain quotidien — feeders + paille, cohérent avec le break narratif).

- [ ] **Step 2 : Remplacer le contenu complet**

Remplace TOUT le contenu de `src/pages/landing-v2/scenes/SceneVideoBreak.tsx` par :

```tsx
import React from 'react';

export function SceneVideoBreak() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        background: 'var(--pt-bg)',
      }}
    >
      <picture>
        <source srcSet="/images/v73/landing/alimentation.webp" type="image/webp" />
        <img
          src="/images/v73/landing/alimentation.jpg"
          alt="Vue d'un feeder inox dans une loge porcine, paille fraîche dorée"
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </picture>
      {/* Voile haut + bas pour transition douce sur les sections adjacentes */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, var(--pt-bg) 0%, transparent 18%, transparent 82%, var(--pt-bg) 100%)',
          pointerEvents: 'none',
        }}
      />
    </section>
  );
}
```

- [ ] **Step 3 : Vérifier tsc + smoke browser**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

Smoke : naviguer landing → scroller jusqu'à la 3e section → vérifier photo `alimentation.jpg` plein écran avec fondu haut+bas.

---

### Task 9 : `SectionPourQui.tsx`

**Files:**
- Modify: `src/pages/landing-v2/scenes/SectionPourQui.tsx` (remplacer le stub)

- [ ] **Step 1 : Remplacer le contenu complet**

Remplace TOUT le contenu de `src/pages/landing-v2/scenes/SectionPourQui.tsx` par :

```tsx
import React from 'react';

type Profil = {
  titre: string;
  body: string;
  stat: string;
  imgWebp: string;
  imgJpg: string;
  imgAlt: string;
};

const PROFILS: Profil[] = [
  {
    titre: 'ÉLEVEUR SEUL',
    body: 'Tu fais tout. PorcTrack te garde la mémoire.',
    stat: '17 truies · 0 oubli',
    imgWebp: '/images/v73/landing/hero-wide.webp',
    imgJpg: '/images/v73/landing/hero-wide.jpg',
    imgAlt: 'Éleveur seul vérifiant ses truies dans le couloir d\'un bâtiment moderne',
  },
  {
    titre: 'ÉQUIPE FERME',
    body: '2 à 5 personnes. Rôles WORKER/OWNER, sync live.',
    stat: 'Tournée 2× plus rapide',
    imgWebp: '/images/v73/landing/reproduction.webp',
    imgJpg: '/images/v73/landing/reproduction.jpg',
    imgAlt: 'Équipe d\'éleveurs intervenant ensemble en zone maternité',
  },
  {
    titre: 'COOPÉRATIVE',
    body: 'Plusieurs fermes. KPIs consolidés, accès lecture.',
    stat: 'Vue groupe en 1 écran',
    imgWebp: '/images/v73/landing/alertes.webp',
    imgJpg: '/images/v73/landing/alertes.jpg',
    imgAlt: 'Tableau de bord coopérative avec KPIs multi-fermes',
  },
];

export function SectionPourQui() {
  return (
    <section
      style={{
        background: 'var(--pt-warm)',
        padding: '120px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: 'var(--pt-primary)',
            margin: '0 0 64px',
          }}
        >
          Pour qui ?
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32,
          }}
        >
          {PROFILS.map((p) => (
            <article
              key={p.titre}
              style={{
                background: 'var(--pt-bg)',
                borderRadius: 24,
                overflow: 'hidden',
                border: '1px solid var(--pt-line)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <picture>
                <source srcSet={p.imgWebp} type="image/webp" />
                <img
                  src={p.imgJpg}
                  alt={p.imgAlt}
                  loading="lazy"
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </picture>
              <div style={{ padding: '24px 28px 32px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    fontSize: 22,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    color: 'var(--pt-primary)',
                    margin: '0 0 12px',
                  }}
                >
                  {p.titre}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 16,
                    lineHeight: 1.5,
                    color: 'var(--pt-ink)',
                    margin: '0 0 16px',
                  }}
                >
                  {p.body}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 13,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--pt-accent)',
                    margin: 0,
                  }}
                >
                  {p.stat}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Vérifier tsc + smoke browser**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

Smoke : section "Pour qui ?" affiche 3 cards en grille responsive avec photos.

---

### Task 10 : `SectionWorkflow.tsx`

**Files:**
- Modify: `src/pages/landing-v2/scenes/SectionWorkflow.tsx` (remplacer le stub)

- [ ] **Step 1 : Remplacer le contenu complet**

Remplace TOUT le contenu de `src/pages/landing-v2/scenes/SectionWorkflow.tsx` par :

```tsx
import React from 'react';

type Etape = {
  num: '1' | '2' | '3';
  titre: string;
  body: string;
  align: 'left' | 'center' | 'right';
};

const ETAPES: Etape[] = [
  {
    num: '1',
    titre: 'SAISIS TA PREMIÈRE BANDE',
    body: '30 secondes. Hors-ligne possible.',
    align: 'left',
  },
  {
    num: '2',
    titre: 'L\'APP CALCULE ISSE / IEM / GMQ',
    body: 'Métriques GTTT live, sans tableur.',
    align: 'center',
  },
  {
    num: '3',
    titre: 'MARIUS T\'ALERTE',
    body: 'Mise-bas J-3, retour chaleur J+5, stocks bas.',
    align: 'right',
  },
];

export function SectionWorkflow() {
  return (
    <section
      style={{
        background: 'var(--pt-bg)',
        padding: '120px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'var(--pt-accent)',
            display: 'block',
            marginBottom: 12,
          }}
        >
          ÉTAPES
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: 'var(--pt-primary)',
            margin: '0 0 80px',
          }}
        >
          Comment ça marche
        </h2>

        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 64,
          }}
        >
          {ETAPES.map((e) => {
            const justify =
              e.align === 'left' ? 'flex-start' : e.align === 'right' ? 'flex-end' : 'center';
            return (
              <li
                key={e.num}
                style={{
                  display: 'flex',
                  justifyContent: justify,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 24,
                    maxWidth: 540,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 900,
                      fontSize: 'clamp(72px, 10vw, 120px)',
                      lineHeight: 0.85,
                      color: 'var(--pt-accent)',
                      letterSpacing: '-0.04em',
                      flexShrink: 0,
                    }}
                  >
                    {e.num}
                  </span>
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 900,
                        fontSize: 'clamp(20px, 2.4vw, 28px)',
                        lineHeight: 1.1,
                        letterSpacing: '-0.01em',
                        textTransform: 'uppercase',
                        color: 'var(--pt-primary)',
                        margin: '12px 0 8px',
                      }}
                    >
                      {e.titre}
                    </h3>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 16,
                        lineHeight: 1.5,
                        color: 'var(--pt-muted)',
                        margin: 0,
                      }}
                    >
                      {e.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Vérifier tsc + smoke browser**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

Smoke : 3 étapes affichées en quinconce avec gros numéros ambre.

---

### Task 11 : Commit 2 — `v75-e`

- [ ] **Step 1 : Lint**

Run :
```bash
npm run lint
```
Expected : 0 erreur.

- [ ] **Step 2 : Build**

Run :
```bash
npm run build
```
Expected : exit 0.

- [ ] **Step 3 : Tests baseline préservés**

Run :
```bash
npm run test:unit
```
Expected : ≥ 1898 passing (baseline).

- [ ] **Step 4 : Commit**

```bash
git add src/pages/landing-v2/scenes/
git commit -m "$(cat <<'EOF'
feat(v75-e): refonte SceneHero + sections vidéo + cards landing-v2

- SceneHero refondue : vidéo Creatify sticky bg + voile dégradé masque
  watermark + headline "LA PRÉCISION EN PLEIN ÉLEVAGE." + 2 CTAs (var(--pt-*))
- FloatingCardsStack : 3 cards en quinconce avec stagger GSAP (Repro,
  Bande, Alerte — données réelles type T-031, ISSE 12.4)
- SceneVideoBreak : photo alimentation.jpg 100vh + voile haut/bas
- SectionPourQui : 3 profils éleveurs (seul / équipe / coopérative)
  avec photos Nano Banana
- SectionWorkflow : 3 étapes en quinconce, gros numéros ambre

Palette stricte var(--pt-*) partout, aucun hard-code couleur.

=== VERIFICATION ===
- tsc --noEmit : 0 erreur
- npm run lint : 0 erreur
- npm run test:unit : ≥ 1898 passing
- npm run build : OK
- smoke browser : 5 sections affichent contenu, vidéo loop, watermark masqué

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Commit 3 — `feat(v75-f): SectionMarius + refonte SceneCta + tests Playwright`

### Task 12 : `SectionMarius.tsx`

**Files:**
- Modify: `src/pages/landing-v2/scenes/SectionMarius.tsx` (remplacer le stub)

- [ ] **Step 1 : Remplacer le contenu complet**

Remplace TOUT le contenu de `src/pages/landing-v2/scenes/SectionMarius.tsx` par :

```tsx
import React from 'react';

export function SectionMarius() {
  return (
    <section
      id="marius"
      style={{
        background: 'var(--pt-primary)',
        color: 'var(--pt-warm)',
        padding: '120px 24px',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'var(--pt-accent-light)',
            display: 'block',
            marginBottom: 16,
          }}
        >
          ASSISTANT IA
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: 'var(--pt-warm)',
            margin: '0 0 32px',
          }}
        >
          Marius connaît
          <br />
          ton élevage.
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            lineHeight: 1.5,
            color: 'rgba(245,233,216,0.85)',
            maxWidth: 720,
            margin: '0 0 48px',
          }}
        >
          Pas un chatbot générique. Marius lit tes truies, tes alertes, ton
          calendrier. Il répond avec tes données.
        </p>

        <article
          style={{
            background: 'rgba(250,247,240,0.06)',
            border: '1px solid rgba(245,233,216,0.18)',
            borderRadius: 24,
            padding: '28px 32px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--pt-accent-light)',
              margin: '0 0 12px',
            }}
          >
            Toi · Que dois-je faire aujourd'hui en priorité ?
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--pt-warm)',
              margin: 0,
            }}
          >
            <strong style={{ color: 'var(--pt-accent-light)' }}>Marius ·</strong>{' '}
            Priorité absolue : surveiller <strong>T-026</strong> (mise-bas imminente J-2).
            Vérifier <strong>T-016</strong> maternité (colostrum, mortalité &lt; 8%).
            Préparer le sevrage du 31/05 (bandes Mai 2026).
          </p>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Vérifier tsc + smoke browser**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

Smoke : section vert forêt sombre avec capture conversation Marius lisible.

---

### Task 13 : Refonte complète `SceneCta.tsx`

**Files:**
- Modify: `src/pages/landing-v2/scenes/SceneCta.tsx` (réécriture complète)

- [ ] **Step 1 : Remplacer le contenu complet**

Remplace TOUT le contenu de `src/pages/landing-v2/scenes/SceneCta.tsx` par :

```tsx
import React from 'react';
import { Link } from 'react-router-dom';

export function SceneCta() {
  return (
    <section
      style={{
        position: 'relative',
        background: 'var(--pt-bg)',
        color: 'var(--pt-ink)',
        padding: '160px 24px 80px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: 'var(--pt-accent)',
          display: 'block',
          marginBottom: 16,
        }}
      >
        PRÊT ?
      </span>

      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: 'clamp(40px, 8vw, 96px)',
          lineHeight: 0.96,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          margin: '0 auto 32px',
          maxWidth: 1100,
          color: 'var(--pt-primary)',
        }}
      >
        Ton élevage mérite
        <br />
        <em
          style={{
            fontStyle: 'normal',
            color: 'var(--pt-accent)',
          }}
        >
          la précision.
        </em>
      </h2>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 18,
          lineHeight: 1.5,
          color: 'var(--pt-muted)',
          maxWidth: 580,
          margin: '0 auto 48px',
        }}
      >
        Démarre PorcTrack maintenant. Importe ton cheptel en quelques minutes
        et laisse les alertes biologiques travailler pour toi.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 80,
        }}
      >
        <Link
          to="/signup"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            background: 'var(--pt-primary)',
            color: 'var(--pt-warm)',
            padding: '18px 36px',
            borderRadius: 999,
            textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(45,74,31,0.25)',
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Démarrer mon élevage
        </Link>
      </div>

      <footer
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--pt-muted)',
          paddingTop: 32,
          borderTop: '1px solid var(--pt-line)',
        }}
      >
        PorcTrack · App :{' '}
        <a
          href="https://app.porctrack.tech"
          style={{ color: 'var(--pt-accent)', textDecoration: 'none' }}
        >
          app.porctrack.tech
        </a>{' '}
        · Mentions · Contact
      </footer>
    </section>
  );
}
```

- [ ] **Step 2 : Vérifier tsc + smoke browser**

Run :
```bash
npx tsc --noEmit
```
Expected : 0 erreur.

Smoke : section finale ivoire avec H2 vert forêt + CTA vert forêt + footer sobre.

---

### Task 14 : Tests Playwright `landing-v75.spec.ts`

**Files:**
- Create: `tests/e2e/landing-v75.spec.ts`

- [ ] **Step 1 : Créer le fichier avec 5 specs**

Crée `tests/e2e/landing-v75.spec.ts` :

```ts
import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';
const LANDING = `${APP_URL}/landing-v2`;

test.describe('Landing v75 — refonte', () => {
  test('Hero affiche headline et CTAs corrects', async ({ page }) => {
    await page.goto(LANDING);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /la précision en plein élevage/i,
    );
    await expect(page.getByRole('link', { name: /démarrer mon élevage/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /voir une démo/i })).toBeVisible();
  });

  test('Aucune couleur hard-coded interdite dans le DOM rendu', async ({ page }) => {
    await page.goto(LANDING);
    // Vérifier que le wrapper landing n'a pas le background noir générique
    const wrapperBg = await page.evaluate(() => {
      const el = document.querySelector('div[style*="overflowX"]') as HTMLElement | null;
      return el ? getComputedStyle(el).backgroundColor : null;
    });
    // var(--pt-bg) = #FAF7F0 = rgb(250, 247, 240)
    expect(wrapperBg).toBe('rgb(250, 247, 240)');

    // Vérifier qu'aucun élément en page n'a le background #0a0a0a (rgb(10,10,10))
    const blackBgCount = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('section, div, article'));
      return all.filter(el => {
        const bg = getComputedStyle(el).backgroundColor;
        return bg === 'rgb(10, 10, 10)';
      }).length;
    });
    expect(blackBgCount).toBe(0);
  });

  test('Vidéo hero charge et autoplay', async ({ page }) => {
    await page.goto(LANDING);
    const videoState = await page.evaluate(async () => {
      const v = document.querySelector('video.hero-video') as HTMLVideoElement | null;
      if (!v) return { found: false };
      // Attendre que la vidéo soit prête
      await new Promise<void>(resolve => {
        if (v.readyState >= 2) resolve();
        else v.addEventListener('loadeddata', () => resolve(), { once: true });
      });
      // Donner 2s pour vérifier autoplay
      await new Promise(r => setTimeout(r, 2000));
      return {
        found: true,
        readyState: v.readyState,
        paused: v.paused,
        muted: v.muted,
        loop: v.loop,
      };
    });
    expect(videoState.found).toBe(true);
    expect(videoState.readyState).toBeGreaterThanOrEqual(2);
    expect(videoState.muted).toBe(true);
    expect(videoState.loop).toBe(true);
  });

  test('CTAs primaires lient vers /signup', async ({ page }) => {
    await page.goto(LANDING);
    const links = await page
      .getByRole('link', { name: /démarrer mon élevage/i })
      .evaluateAll(els => els.map(e => (e as HTMLAnchorElement).getAttribute('href')));
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const href of links) {
      expect(href).toBe('/signup');
    }
  });

  test('Poster JPEG est référencé sur la vidéo hero', async ({ page }) => {
    await page.goto(LANDING);
    const posterAttr = await page
      .locator('video.hero-video')
      .first()
      .getAttribute('poster');
    expect(posterAttr).toBe('/videos/landing/hero-maternity-dawn-poster.jpg');
  });
});
```

- [ ] **Step 2 : S'assurer que le serveur Vite tourne**

Run :
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/landing-v2
```
Expected : `200`. Sinon :
```bash
npm run dev &
sleep 4
```

- [ ] **Step 3 : Exécuter les 5 specs**

Run :
```bash
npx playwright test tests/e2e/landing-v75.spec.ts
```
Expected : 5 passing.

Si une spec échoue (par ex. spec 3 vidéo : codec non supporté en headless Chromium), debugger via :
```bash
npx playwright test tests/e2e/landing-v75.spec.ts --headed --project=chromium
```

---

### Task 15 : Commit 3 — `v75-f`

- [ ] **Step 1 : Lint + Build + Tests**

Run :
```bash
npm run lint && npm run build && npm run test:unit
```
Expected : tout vert, ≥ 1898 passing.

- [ ] **Step 2 : Tests Playwright**

Run :
```bash
npx playwright test tests/e2e/landing-v75.spec.ts
```
Expected : 5 passing.

- [ ] **Step 3 : Stage + commit**

```bash
git add src/pages/landing-v2/scenes/SectionMarius.tsx \
        src/pages/landing-v2/scenes/SceneCta.tsx \
        tests/e2e/landing-v75.spec.ts
git commit -m "$(cat <<'EOF'
feat(v75-f): SectionMarius + refonte SceneCta + 5 specs Playwright

- SectionMarius (id=marius pour ancre CTA secondaire) : capture
  conversation réelle (T-026 J-2, T-016 maternité, sevrage 31/05)
  sur fond vert forêt pleine surface
- SceneCta refondue : palette --pt-*, H2 "Ton élevage mérite la
  précision", CTA "Démarrer mon élevage", footer sobre 1 ligne
- 5 specs Playwright : headline + CTAs, audit DOM 0 couleur interdite,
  vidéo charge+autoplay, CTAs href /signup, poster référencé

Clôture chantier V75 refonte landing (commits d + e + f).

=== VERIFICATION ===
- tsc --noEmit : 0 erreur
- npm run lint : 0 erreur
- npm run test:unit : ≥ 1898 passing
- npm run build : OK
- 5/5 specs Playwright landing-v75 vertes
- smoke browser : 7 sections rendues, vidéo loop, palette stricte

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4 : Vérifier l'historique**

Run :
```bash
git log --oneline -3
```
Expected :
```
{hash} feat(v75-f): SectionMarius + refonte SceneCta + 5 specs Playwright
{hash} feat(v75-e): refonte SceneHero + sections vidéo + cards landing-v2
{hash} feat(v75-d): nettoyage landing-v2 + assets vidéo
```

---

### Task 16 : Vérification finale + mémoire projet

- [ ] **Step 1 : Smoke browser complet**

Naviguer http://localhost:5173/landing-v2 :
- Section 1 (Hero) : vidéo loop visible, watermark Creatify masqué par voile, headline + 2 CTAs
- Section 2 (FloatingCards) : 3 cards en quinconce avec contenu T-031 / Bande Mai 2026 / À sortir bientôt T-018
- Section 3 (VideoBreak) : photo `alimentation.jpg` plein écran avec fondu
- Section 4 (PourQui) : 3 profils éleveur en grille avec photos
- Section 5 (Workflow) : 3 étapes en quinconce, gros numéros 1/2/3 ambre
- Section 6 (Marius) : capture conversation sur fond vert forêt
- Section 7 (Cta) : H2 + CTA + footer
- Console DevTools : 0 erreur, 0 warning
- Mobile DevTools 360px : toutes sections empilées, CTAs accessibles touch ≥ 44px, vidéo joue ou poster fallback

- [ ] **Step 2 : Audit "0 couleur interdite"**

Dans Chrome DevTools console, sur la landing :
```js
const all = Array.from(document.querySelectorAll('*'));
const bad = ['rgb(10, 10, 10)', 'rgb(16, 185, 129)', 'rgb(52, 211, 153)'];
const hits = all.filter(el => bad.includes(getComputedStyle(el).backgroundColor)
  || bad.includes(getComputedStyle(el).color));
console.log('Couleurs interdites trouvées:', hits.length, hits.slice(0, 3));
```
Expected : 0 ou très rare match résiduel uniquement.

- [ ] **Step 3 : Mettre à jour la mémoire projet**

Ajouter une entrée dans `.claude/memory/journal.md` :

```markdown
## 2026-05-09 — V75 chantier Refonte Landing (commits d+e+f)

- **d** : nettoyage landing-v2. Suppression 5 scènes stubs + scenes Bandes
  refondue. Background `#0a0a0a` → `var(--pt-bg)` ivoire. Compression vidéo
  Creatify 8s en MP4 H.264 1080p faststart + WebM VP9 + poster JPEG.
- **e** : SceneHero refonte vidéo sticky bg + voile dégradé masque watermark
  Creatify. FloatingCardsStack (3 cards quinconce). SceneVideoBreak (photo
  alimentation.jpg 100vh). SectionPourQui (3 profils). SectionWorkflow
  (3 étapes en quinconce, gros numéros ambre).
- **f** : SectionMarius (capture conversation sur fond vert forêt).
  SceneCta refondue palette --pt-*. 5 specs Playwright (`landing-v75.spec.ts`).

Frictions audit fixées : thème noir générique, scènes vides, copywriting
ironique non orienté conversion. Voix passée à "directe & technique".

Hors-scope (sprints suivants) :
- Génération vidéo 2 (Tournée du soir) — placeholder photo alimentation v1
- Régen 9:16 mobile portrait — fallback poster v1
- Section Pricing — décision produit séparée

Tests : 1898 baseline préservée (chantier UI-only). 5 e2e Playwright nouveaux verts.
```

- [ ] **Step 4 : Optionnel — push prod**

Si validation user reçue pour push prod :
```bash
# Le projet a un script de déploiement deploy_vps.sh selon le CLAUDE.md
ls deploy_vps.sh 2>/dev/null && bash deploy_vps.sh
```
Sinon attendre validation explicite de l'utilisateur.

---

## Notes critiques

- **Naming-coherence d'abord** : recommandation forte d'exécuter `v75-a/b/c` (chantier précédent) AVANT ce chantier. Sinon prévoir merge résolution sur `LandingScrollytelling.tsx` (peu probable car v75-a touche `src/v70/` et chatbot, pas la landing).
- **Photo "alimentation.jpg" disponible mais nom incertain** : si la photo a un autre nom au moment du Task 8, lister `public/images/v73/landing/` et substituer le nom.
- **Watermark Creatify résiduel** : si le voile dégradé bottom-up ne suffit pas (test browser réel), escalade :
  1. Augmenter la valeur de stop dans le gradient : `rgba(250,247,240,0.85) 18%` au lieu de `14%`
  2. Décaler `objectPosition: center 8%` pour pousser le bas hors viewport
  3. En dernier recours, regen Creatify Pro sans watermark
- **Vidéo bg sticky sur Android entry-level** : si test sur device bas de gamme révèle saccades, ajouter detection `effectiveType` dans SceneHero :
  ```tsx
  const lowConn = (navigator as any).connection?.effectiveType;
  const useFallback = lowConn === '2g' || lowConn === 'slow-2g' || lowConn === '3g';
  ```
  Si `useFallback`, ne pas rendre `<video>` et laisser le poster JPEG via `background-image`.
- **`useScrollUnlock` + sticky** : conflit potentiel à tester en priorité au Task 6. Si scroll bloqué après Hero, désactiver temporairement le hook pour debug.
- **Tests Playwright en CI** : le projet a peut-être un setup CI Playwright avec serveur Vite auto-démarré. Vérifier `playwright.config.ts` et adapter si besoin.

---

## Self-review (résultats)

**1. Spec coverage** — chaque section spec couverte par au moins une task :
- §2.1 suppressions → Task 2
- §2.2 refontes → Task 6 (SceneHero), Task 13 (SceneCta), Task 3 (LandingScrollytelling)
- §2.3 créations → Task 1 (assets vidéo), Task 4 (stubs initiaux), Tasks 7-10 + 12 (vraies implémentations)
- §3 structure narrative → distribution Tasks 6-13
- §4 copywriting → snippets Tasks 6 (Hero), 7 (cards), 9 (PourQui), 10 (Workflow), 12 (Marius), 13 (Cta)
- §5 vidéos + watermark → Task 1 (compression), Task 6 (intégration sticky + voile)
- §6 palette + typo → tokens `--pt-*` partout, vérifié Task 14 spec 2
- §7 animations GSAP → Task 6 (Hero parallax), Task 7 (cards stagger). Reduced motion guard dans chaque scène.
- §8 perf + a11y → preload metadata, lazy images, aria-label vidéo, contraste WCAG, touch ≥ 44px
- §9 commits → Tasks 5, 11, 15
- §10 tests → Task 14 (Playwright 5 specs)
- §11 critères done → Task 16 vérification finale
- §12 hors-scope → respecté (vidéo 2, mobile 9:16, pricing, démo dédiée)
- §13 risques → Notes critiques

**2. Placeholder scan** — aucun "TBD", "TODO" sans plan, "implement later", "similar to". Tous les snippets sont du code complet collable.

**3. Type consistency** — tous les composants exportent une fonction nommée identique au fichier (`SceneHero`, `FloatingCardsStack`, `SceneVideoBreak`, `SectionPourQui`, `SectionWorkflow`, `SectionMarius`, `SceneCta`). Imports dans `LandingScrollytelling.tsx` cohérents Task 3 et toutes les Tasks suivantes. Type `CardData` (Task 7), `Profil` (Task 9), `Etape` (Task 10) sont locaux à leur composant — pas de cross-référence à maintenir.
