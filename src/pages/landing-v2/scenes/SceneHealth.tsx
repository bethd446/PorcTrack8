import React from 'react';
import { SceneFrame } from './SceneFrame';

export function SceneHealth() {
  return (
    <SceneFrame
      theme="dark"
      image="/images/landing/scene-health-shield.webp"
      imageAlt="Croix médicale et bouclier caducée néon vert"
      eyebrow="● Santé · Marius IA"
      title={
        <>
          Marius
          <br />
          <em style={{ fontStyle: 'normal', color: '#34d399' }}>veille.</em>
        </>
      }
      subtitle="16 règles biologiques surveillent votre troupeau 24h/24. Alertes au bon jour, jamais de pesée oubliée, jamais de sevrage manqué."
      topSlot={
        <img
          src="/images/marius-avatar.webp"
          alt="Marius, assistant IA"
          loading="lazy"
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            objectFit: 'cover',
            margin: '0 auto 20px',
            display: 'block',
            border: '2px solid rgba(52,211,153,0.45)',
            boxShadow: '0 0 24px rgba(52,211,153,0.25)',
          }}
        />
      }
    />
  );
}
