import React from 'react';
import { Link } from 'react-router-dom';

export function SceneCta() {
  return (
    <section
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)',
        color: '#fff',
        padding: '120px 24px 64px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        Prêt ?
      </span>

      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: 'clamp(40px, 8vw, 104px)',
          lineHeight: 0.95,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          margin: '16px auto 32px',
          maxWidth: 1100,
        }}
      >
        Prêt à passer
        <br />
        du cahier au pilotage&nbsp;?
      </h2>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 18,
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.85)',
          maxWidth: 580,
          margin: '0 auto 48px',
        }}
      >
        Essayez PorcTrack 8 gratuitement. Importez votre cheptel en quelques
        minutes et laissez les alertes biologiques travailler pour vous.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 96,
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
            background: '#F4A261',
            color: '#064e3b',
            padding: '18px 36px',
            borderRadius: 999,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Créer un compte
        </Link>
        <Link
          to="/login"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            padding: '18px 36px',
            borderRadius: 999,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Se connecter
        </Link>
      </div>

      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 32,
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
          display: 'flex',
          gap: 24,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span>© 2026 PorcTrack</span>
        <Link to="/a-propos" style={{ color: 'inherit', textDecoration: 'none' }}>
          À propos
        </Link>
        <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
          Confidentialité
        </Link>
        <Link to="/cgu" style={{ color: 'inherit', textDecoration: 'none' }}>
          CGU
        </Link>
      </footer>
    </section>
  );
}
