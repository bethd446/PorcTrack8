import React from 'react';
import { SceneFrame } from './SceneFrame';

export function SceneFeed() {
  return (
    <SceneFrame
      theme="dark"
      image="/images/landing/scene-feed-grains.webp"
      imageAlt="Grains dorés et hologrammes de données"
      eyebrow="● Alimentation"
      title={
        <>
          Chaque gramme
          <br />
          <em style={{ fontStyle: 'normal', color: '#34d399' }}>suivi.</em>
        </>
      }
      subtitle="Indice de consommation calculé en live. Plan alimentaire optimisé par phase — post-sevrage, croissance, finition."
    />
  );
}
