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
      <picture>
        <source srcSet="/images/v73/landing/alimentation.webp" type="image/webp" />
        <img
          src="/images/v73/landing/alimentation.jpg"
          alt="Vue d'un feeder inox dans une loge porcine, paille fraîche dorée"
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </picture>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, var(--pt-bg) 0%, transparent 18%, transparent 82%, var(--pt-bg) 100%)',
          pointerEvents: 'none',
        }}
      />
    </section>
  );
}
