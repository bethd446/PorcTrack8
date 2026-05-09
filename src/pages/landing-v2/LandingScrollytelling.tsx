import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenisScroll } from './hooks/useLenisScroll';

gsap.registerPlugin(ScrollTrigger);
import { SceneHero } from './scenes/SceneHero';
import { FloatingCardsStack } from './scenes/FloatingCardsStack';
import { SceneVideoBreak } from './scenes/SceneVideoBreak';
import { SectionPourQui } from './scenes/SectionPourQui';
import { SectionWorkflow } from './scenes/SectionWorkflow';
import { SectionMarius } from './scenes/SectionMarius';
import { SceneCta } from './scenes/SceneCta';

/**
 * Override le shell Ionic (body fixed/overflow:hidden + ion-app
 * position:absolute inset:0) pour permettre le scroll natif sur window.
 * Restauration au démontage. C'est nécessaire pour que GSAP ScrollTrigger
 * et Lenis (sur window) puissent piloter les animations scroll-driven
 * à travers les 7 scènes (~6500-7500px de hauteur totale).
 */
function useScrollUnlock() {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const ionApp = document.querySelector('ion-app') as HTMLElement | null;

    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyHeight: body.style.height,
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      ionPosition: ionApp?.style.position ?? '',
      ionHeight: ionApp?.style.height ?? '',
      ionDisplay: ionApp?.style.display ?? '',
      ionContain: ionApp?.style.contain ?? '',
    };

    // body en overflow:visible (pas 'auto') pour ne PAS créer de scrolling
    // container interne qui casserait position:sticky des Scenes. Le scroll
    // se fait sur window (html), comme attendu par GSAP ScrollTrigger + Lenis.
    body.style.overflow = 'visible';
    body.style.position = 'static';
    body.style.height = 'auto';
    html.style.overflow = 'visible';
    html.style.height = 'auto';
    if (ionApp) {
      ionApp.style.position = 'static';
      ionApp.style.height = 'auto';
      ionApp.style.display = 'block';
      ionApp.style.contain = 'none';
    }

    // ScrollTrigger calcule ses positions au mount. Comme le useScrollUnlock
    // change la layout après le mount des Scenes, les positions sont
    // désaxées. On force un refresh asynchrone pour réaligner.
    const refreshIds: number[] = [];
    refreshIds.push(window.setTimeout(() => ScrollTrigger.refresh(true), 50));
    refreshIds.push(window.setTimeout(() => ScrollTrigger.refresh(true), 300));
    refreshIds.push(window.setTimeout(() => ScrollTrigger.refresh(true), 800));

    return () => {
      refreshIds.forEach((id) => window.clearTimeout(id));
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.height = prev.bodyHeight;
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      if (ionApp) {
        ionApp.style.position = prev.ionPosition;
        ionApp.style.height = prev.ionHeight;
        ionApp.style.display = prev.ionDisplay;
        ionApp.style.contain = prev.ionContain;
      }
    };
  }, []);
}

export default function LandingScrollytelling() {
  useScrollUnlock();
  useLenisScroll();
  return (
    <div style={{ background: 'var(--pt-bg)', overflowX: 'clip' }}>
      <SceneHero />
      <FloatingCardsStack />
      <SceneVideoBreak />
      <SectionPourQui />
      <SectionWorkflow />
      <SectionMarius />
      <SceneCta />
    </div>
  );
}
