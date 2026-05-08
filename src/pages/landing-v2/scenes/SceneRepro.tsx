import React from 'react';
import { SceneFrame } from './SceneFrame';

export function SceneRepro() {
  return (
    <SceneFrame
      theme="light"
      image="/images/v73/landing/reproduction.jpg"
      imageAlt="Truie gestante au repos sur la paille, lumière dorée"
      eyebrow="● Suivi reproductif"
      title={
        <>
          115 jours.
          <br />
          <em style={{ fontStyle: 'normal', color: '#10b981' }}>
            Zéro oubli.
          </em>
        </>
      }
      subtitle="Saillie, écho à J28, mise-bas à J115, sevrage à J28+28. Chaque étape signalée au bon moment."
    />
  );
}
