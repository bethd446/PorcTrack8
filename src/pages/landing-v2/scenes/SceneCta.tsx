import React from 'react';
import { Link } from 'react-router-dom';

export function SceneCta() {
  return (
    <section
      style={{
        position: 'relative',
        background: 'var(--pt-bg)',
        color: 'var(--pt-ink)',
        padding: '160px 24px 80px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: 'var(--pt-accent)',
          display: 'block',
          marginBottom: 16,
        }}
      >
        PRÊT ?
      </span>

      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: 'clamp(40px, 8vw, 96px)',
          lineHeight: 0.96,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          margin: '0 auto 32px',
          maxWidth: 1100,
          color: 'var(--pt-primary)',
        }}
      >
        Ton élevage mérite
        <br />
        <em
          style={{
            fontStyle: 'normal',
            color: 'var(--pt-accent)',
          }}
        >
          la précision.
        </em>
      </h2>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 18,
          lineHeight: 1.5,
          color: 'var(--pt-muted)',
          maxWidth: 580,
          margin: '0 auto 48px',
        }}
      >
        Démarre PorcTrack maintenant. Importe ton cheptel en quelques minutes
        et laisse les alertes biologiques travailler pour toi.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 80,
        }}
      >
        <Link
          to="/signup"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            background: 'var(--pt-primary)',
            color: 'var(--pt-warm)',
            padding: '18px 36px',
            borderRadius: 999,
            textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(45,74,31,0.25)',
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Démarrer mon élevage
        </Link>
      </div>

      <footer
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--pt-muted)',
          paddingTop: 32,
          borderTop: '1px solid var(--pt-line)',
        }}
      >
        PorcTrack · App :{' '}
        <a
          href="https://app.porctrack.tech"
          style={{ color: 'var(--pt-accent)', textDecoration: 'none' }}
        >
          app.porctrack.tech
        </a>{' '}
        · Mentions · Contact
      </footer>
    </section>
  );
}
