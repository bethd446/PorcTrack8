import React from 'react';

export function SectionMarius() {
  return (
    <section
      id="marius"
      style={{
        background: 'var(--pt-primary)',
        color: 'var(--pt-warm)',
        padding: '120px 24px',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'var(--pt-accent-light)',
            display: 'block',
            marginBottom: 16,
          }}
        >
          ASSISTANT IA
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: 'var(--pt-warm)',
            margin: '0 0 32px',
          }}
        >
          Marius connaît
          <br />
          ton élevage.
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            lineHeight: 1.5,
            color: 'rgba(245,233,216,0.85)',
            maxWidth: 720,
            margin: '0 0 48px',
          }}
        >
          Pas un chatbot générique. Marius lit tes truies, tes alertes, ton
          calendrier. Il répond avec tes données.
        </p>

        <article
          style={{
            background: 'rgba(250,247,240,0.06)',
            border: '1px solid rgba(245,233,216,0.18)',
            borderRadius: 24,
            padding: '28px 32px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--pt-accent-light)',
              margin: '0 0 12px',
            }}
          >
            Toi · Que dois-je faire aujourd'hui en priorité ?
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--pt-warm)',
              margin: 0,
            }}
          >
            <strong style={{ color: 'var(--pt-accent-light)' }}>Marius ·</strong>{' '}
            Priorité absolue : surveiller <strong>T-026</strong> (mise-bas imminente J-2).
            Vérifier <strong>T-016</strong> maternité (colostrum, mortalité &lt; 8%).
            Préparer le sevrage du 31/05 (bandes Mai 2026).
          </p>
        </article>
      </div>
    </section>
  );
}
