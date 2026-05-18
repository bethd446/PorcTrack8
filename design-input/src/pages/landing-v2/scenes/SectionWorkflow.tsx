import React from 'react';

type Etape = {
  num: '1' | '2' | '3';
  titre: string;
  body: string;
  align: 'left' | 'center' | 'right';
};

const ETAPES: Etape[] = [
  {
    num: '1',
    titre: 'SAISIS TA PREMIÈRE BANDE',
    body: '30 secondes. Hors-ligne possible.',
    align: 'left',
  },
  {
    num: '2',
    titre: 'L\'APP CALCULE ISSE / IEM / GMQ',
    body: 'Métriques GTTT live, sans tableur.',
    align: 'center',
  },
  {
    num: '3',
    titre: 'MARIUS T\'ALERTE',
    body: 'Mise-bas J-3, retour chaleur J+5, stocks bas.',
    align: 'right',
  },
];

export function SectionWorkflow() {
  return (
    <section
      style={{
        background: 'var(--pt-bg)',
        padding: '120px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'var(--pt-accent)',
            display: 'block',
            marginBottom: 12,
          }}
        >
          ÉTAPES
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: 'var(--pt-primary)',
            margin: '0 0 80px',
          }}
        >
          Comment ça marche
        </h2>

        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 64,
          }}
        >
          {ETAPES.map((e) => {
            const justify =
              e.align === 'left' ? 'flex-start' : e.align === 'right' ? 'flex-end' : 'center';
            return (
              <li
                key={e.num}
                style={{
                  display: 'flex',
                  justifyContent: justify,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 24,
                    maxWidth: 540,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 900,
                      fontSize: 'clamp(72px, 10vw, 120px)',
                      lineHeight: 0.85,
                      color: 'var(--pt-accent)',
                      letterSpacing: '-0.04em',
                      flexShrink: 0,
                    }}
                  >
                    {e.num}
                  </span>
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 900,
                        fontSize: 'clamp(20px, 2.4vw, 28px)',
                        lineHeight: 1.1,
                        letterSpacing: '-0.01em',
                        textTransform: 'uppercase',
                        color: 'var(--pt-primary)',
                        margin: '12px 0 8px',
                      }}
                    >
                      {e.titre}
                    </h3>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 16,
                        lineHeight: 1.5,
                        color: 'var(--pt-muted)',
                        margin: 0,
                      }}
                    >
                      {e.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
