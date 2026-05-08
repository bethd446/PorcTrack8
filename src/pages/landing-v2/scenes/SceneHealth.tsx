import React from 'react';
import { SceneFrame } from './SceneFrame';

export function SceneHealth() {
  return (
    <SceneFrame
      theme="dark"
      image="/images/v73/landing/alertes.jpg"
      imageAlt="Groupe de porcelets dans une loge propre, cercle holographique discret"
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
          src="/images/v73/marius/orb-emeraude.webp"
          alt="Marius, assistant IA"
          loading="lazy"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            objectFit: 'cover',
            margin: '0 auto 20px',
            display: 'block',
            boxShadow: '0 0 28px rgba(52,211,153,0.45)',
          }}
        />
      }
    />
  );
}
