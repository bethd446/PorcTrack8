import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

const cards = [
  {
    img: '/images/ambiance-maternite.webp',
    tag: 'MATERNITÉ',
    caption: 'Mise-bas, allaitement, sevrage J28.',
  },
  {
    img: '/images/ambiance-verrat.webp',
    tag: 'SAILLIE',
    caption: 'Couple truie × verrat tracé. Échographie J25-J35.',
  },
  {
    img: '/images/ambiance-croissance.webp',
    tag: 'CROISSANCE',
    caption: "Passage de phase au poids ou à l'âge, jamais oublié.",
  },
];

export function SceneBandes() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      const header = ref.current.querySelector('.bandes-header');
      if (header) {
        gsap.fromTo(
          header,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: ref.current,
              start: 'top 80%',
              end: 'top 30%',
              scrub: 0.8,
            },
          },
        );
      }

      const grid = ref.current.querySelector('.bandes-grid');
      const cardsEl = ref.current.querySelectorAll('.bande-card');
      if (grid && cardsEl.length) {
        gsap.fromTo(
          cardsEl,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.15,
            ease: 'none',
            scrollTrigger: {
              trigger: grid,
              start: 'top 85%',
              end: 'top 40%',
              scrub: 1,
            },
          },
        );
      }
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        background: '#1d1d1f',
        color: '#fff',
        padding: '120px 24px',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          className="bandes-header"
          style={{ textAlign: 'center', marginBottom: 64, willChange: 'transform, opacity' }}
        >
          <span
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 16,
            }}
          >
            ● Conduite en bandes
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 'clamp(36px, 6vw, 80px)',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              margin: '0 0 16px',
              color: '#fff',
            }}
          >
            Vos bandes,
            <br />
            <em style={{ fontStyle: 'normal', color: '#34d399' }}>en clair.</em>
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 18,
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            Maternité, saillie, croissance — chaque phase a sa fiche, chaque action sa preuve.
          </p>
        </div>

        <div
          className="bandes-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {cards.map((card) => (
            <article
              key={card.tag}
              className="bande-card"
              style={{
                background: '#0a0a0a',
                borderRadius: 24,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                willChange: 'transform, opacity',
              }}
            >
              <img
                src={card.img}
                alt={card.tag}
                loading="lazy"
                style={{
                  width: '100%',
                  height: 240,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <div style={{ padding: '20px 22px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-body)',
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: '#34d399',
                    background: 'rgba(52, 211, 153, 0.12)',
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  {card.tag}
                </span>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: 'rgba(255,255,255,0.8)',
                    margin: 0,
                  }}
                >
                  {card.caption}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
