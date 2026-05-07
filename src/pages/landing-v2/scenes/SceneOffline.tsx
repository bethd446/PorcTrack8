import React from 'react';
import { SceneFrame } from './SceneFrame';

export function SceneOffline() {
  return (
    <SceneFrame
      theme="light"
      image="/images/landing/scene-offline-wifi.webp"
      imageAlt="Wifi métal brossé barré"
      eyebrow="● Hors-ligne"
      title={
        <>
          Hors-ligne ?
          <br />
          <em style={{ fontStyle: 'normal', color: '#10b981' }}>
            Aucun problème.
          </em>
        </>
      }
      subtitle="PorcTrack fonctionne au fin fond de la porcherie. Vos saisies se synchronisent automatiquement dès que le réseau revient."
    />
  );
}
