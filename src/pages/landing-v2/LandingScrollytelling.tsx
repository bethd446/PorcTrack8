import React, { useEffect } from 'react';
import { useLenisScroll } from './hooks/useLenisScroll';
import { SceneHero } from './scenes/SceneHero';
import { SceneRepro } from './scenes/SceneRepro';
import { SceneBandes } from './scenes/SceneBandes';
import { SceneFeed } from './scenes/SceneFeed';
import { SceneHealth } from './scenes/SceneHealth';
import { SceneOffline } from './scenes/SceneOffline';
import { SceneCta } from './scenes/SceneCta';

/**
 * Override le body fixed/overflow:hidden imposé par Ionic shell pour
 * permettre le scroll natif requis par GSAP ScrollTrigger + Lenis.
 * Sans ça, la page fait 100vh et les scènes 2-7 sont invisibles.
 */
function useNativeScroll() {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyHeight: body.style.height,
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
    };
    body.style.overflow = 'auto';
    body.style.position = 'static';
    body.style.height = 'auto';
    html.style.overflow = 'auto';
    html.style.height = 'auto';
    return () => {
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.height = prev.bodyHeight;
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
    };
  }, []);
}

export default function LandingScrollytelling() {
  useNativeScroll();
  useLenisScroll();
  return (
    <div style={{ background: '#0a0a0a', overflowX: 'hidden' }}>
      <SceneHero />
      <SceneRepro />
      <SceneBandes />
      <SceneFeed />
      <SceneHealth />
      <SceneOffline />
      <SceneCta />
    </div>
  );
}
