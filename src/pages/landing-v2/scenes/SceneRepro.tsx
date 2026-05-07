import React from 'react';
import { SceneFrame } from './SceneFrame';

export function SceneRepro() {
  return (
    <SceneFrame
      theme="light"
      image="/images/landing/scene-repro-dna.webp"
      imageAlt="ADN entrelacé avec un cochon métallique"
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
