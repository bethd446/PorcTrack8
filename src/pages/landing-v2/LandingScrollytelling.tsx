import React from 'react';
import { useLenisScroll } from './hooks/useLenisScroll';
import { SceneHero } from './scenes/SceneHero';
import { SceneTimeline } from './scenes/SceneTimeline';
import { SceneTerritoire } from './scenes/SceneTerritoire';
import { SceneCta } from './scenes/SceneCta';

export default function LandingScrollytelling() {
  useLenisScroll();
  return (
    <div style={{ background: 'var(--pt-bg)', overflow: 'hidden' }}>
      <SceneHero />
      <SceneTimeline />
      <SceneTerritoire />
      <SceneCta />
    </div>
  );
}
