import React from 'react';
import { SceneFrame } from './SceneFrame';

export function SceneFeed() {
  return (
    <SceneFrame
      theme="dark"
      image="/images/v73/landing/alimentation.jpg"
      imageAlt="Porcs mangeant à un feeder en inox, vue plongée"
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
