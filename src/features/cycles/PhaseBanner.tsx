import React from 'react';

/**
 * PhaseBanner — header banner d'ambiance pour les vues cycle/repro/santé/stocks.
 *
 * Image full-width avec gradient sombre en bas et label phase en blanc.
 * Hauteur fluide clamp(140px, 18vw, 200px), border-radius var(--radius-card).
 */
export interface PhaseBannerProps {
  src: string;
  alt: string;
  label: string;
}

const PhaseBanner: React.FC<PhaseBannerProps> = ({ src, alt, label }) => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: 'clamp(140px, 18vw, 200px)',
      borderRadius: 'var(--radius-card, 24px)',
      overflow: 'hidden',
    }}
  >
    <img
      src={src}
      alt={alt}
      loading="lazy"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        display: 'block',
      }}
    />
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(180deg, rgba(6,78,59,0) 40%, rgba(6,78,59,0.55) 100%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 18,
        bottom: 14,
        color: 'var(--pt-bg)',
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: '-0.01em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  </div>
);

export default PhaseBanner;
