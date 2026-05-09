import React from 'react';

export function SceneVideoBreak() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        background: 'var(--pt-bg)',
      }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/videos/landing/finishing-pen-poster.jpg"
        aria-label="Bande arrivée à la finition six mois plus tard, deux porcs au feeder dans une lumière dorée de fin de journée"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      >
        <source src="/videos/landing/finishing-pen.webm" type="video/webm" />
        <source src="/videos/landing/finishing-pen.mp4" type="video/mp4" />
      </video>
      {/* Voile haut + bas : transition douce + masque watermark Creatify bottom-right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, var(--pt-bg) 0%, transparent 18%, transparent 70%, rgba(250,247,240,0.85) 88%, var(--pt-bg) 100%)',
          pointerEvents: 'none',
        }}
      />
    </section>
  );
}
