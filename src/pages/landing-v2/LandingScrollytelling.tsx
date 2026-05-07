import React from 'react';
import { useLenisScroll } from './hooks/useLenisScroll';
import { SceneHero } from './scenes/SceneHero';
import { SceneRepro } from './scenes/SceneRepro';
import { SceneFeed } from './scenes/SceneFeed';
import { SceneHealth } from './scenes/SceneHealth';
import { SceneOffline } from './scenes/SceneOffline';
import { SceneCta } from './scenes/SceneCta';

export default function LandingScrollytelling() {
  useLenisScroll();
  return (
    <div style={{ background: '#0a0a0a', overflow: 'hidden' }}>
      <SceneHero />
      <SceneRepro />
      <SceneFeed />
      <SceneHealth />
      <SceneOffline />
      <SceneCta />
    </div>
  );
}
