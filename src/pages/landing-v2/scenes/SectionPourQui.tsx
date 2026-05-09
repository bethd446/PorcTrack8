import React from 'react';

type Profil = {
  titre: string;
  body: string;
  stat: string;
  imgWebp: string;
  imgJpg: string;
  imgAlt: string;
};

const PROFILS: Profil[] = [
  {
    titre: 'ÉLEVEUR SEUL',
    body: 'Tu fais tout. PorcTrack te garde la mémoire.',
    stat: '17 truies · 0 oubli',
    imgWebp: '/images/v73/landing/hero-wide.webp',
    imgJpg: '/images/v73/landing/hero-wide.jpg',
    imgAlt: 'Éleveur seul vérifiant ses truies dans le couloir d\'un bâtiment moderne',
  },
  {
    titre: 'ÉQUIPE FERME',
    body: '2 à 5 personnes. Rôles WORKER/OWNER, sync live.',
    stat: 'Tournée 2× plus rapide',
    imgWebp: '/images/v73/landing/reproduction.webp',
    imgJpg: '/images/v73/landing/reproduction.jpg',
    imgAlt: 'Équipe d\'éleveurs intervenant ensemble en zone maternité',
  },
  {
    titre: 'COOPÉRATIVE',
    body: 'Plusieurs fermes. KPIs consolidés, accès lecture.',
    stat: 'Vue groupe en 1 écran',
    imgWebp: '/images/v73/landing/alertes.webp',
    imgJpg: '/images/v73/landing/alertes.jpg',
    imgAlt: 'Tableau de bord coopérative avec KPIs multi-fermes',
  },
];

export function SectionPourQui() {
  return (
    <section
      style={{
        background: 'var(--pt-warm)',
        padding: '120px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: 'var(--pt-primary)',
            margin: '0 0 64px',
          }}
        >
          Pour qui ?
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32,
          }}
        >
          {PROFILS.map((p) => (
            <article
              key={p.titre}
              style={{
                background: 'var(--pt-bg)',
                borderRadius: 24,
                overflow: 'hidden',
                border: '1px solid var(--pt-line)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <picture>
                <source srcSet={p.imgWebp} type="image/webp" />
                <img
                  src={p.imgJpg}
                  alt={p.imgAlt}
                  loading="lazy"
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </picture>
              <div style={{ padding: '24px 28px 32px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    fontSize: 22,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    color: 'var(--pt-primary)',
                    margin: '0 0 12px',
                  }}
                >
                  {p.titre}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 16,
                    lineHeight: 1.5,
                    color: 'var(--pt-ink)',
                    margin: '0 0 16px',
                  }}
                >
                  {p.body}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 13,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--pt-accent)',
                    margin: 0,
                  }}
                >
                  {p.stat}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
