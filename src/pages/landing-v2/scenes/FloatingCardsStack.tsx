import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

type CardData = {
  eyebrow: string;
  title: string;
  meta: string;
  align: 'left' | 'center' | 'right';
};

const CARDS: CardData[] = [
  {
    eyebrow: 'REPRO',
    title: 'T-031 · PLEINE J42',
    meta: 'Mise-bas prévue 03/07 · ISSE 12.4',
    align: 'left',
  },
  {
    eyebrow: 'BANDE',
    title: 'BANDE MAI 2026 · T-001',
    meta: '11 NV sous mère · Sevrage 31/05',
    align: 'center',
  },
  {
    eyebrow: 'ALERTE',
    title: 'À SORTIR BIENTÔT — T-018',
    meta: 'Trop âgée ou pas assez de portées',
    align: 'right',
  },
];

export function FloatingCardsStack() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      const cards = ref.current.querySelectorAll('.floating-card');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.18,
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        },
      );
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        minHeight: '120vh',
        padding: '80px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 40,
        background: 'var(--pt-bg)',
      }}
    >
      {CARDS.map((card, i) => {
        const justify =
          card.align === 'left' ? 'flex-start' : card.align === 'right' ? 'flex-end' : 'center';
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: justify,
              maxWidth: 1100,
              margin: '0 auto',
              width: '100%',
            }}
          >
            <article
              className="floating-card"
              style={{
                background: 'var(--pt-warm)',
                border: '1px solid var(--pt-line)',
                borderRadius: 24,
                padding: '24px 28px',
                maxWidth: 480,
                boxShadow: '0 12px 48px rgba(26,26,26,0.18)',
                willChange: 'transform, opacity',
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
                  marginBottom: 8,
                }}
              >
                {card.eyebrow}
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: 'clamp(22px, 3vw, 30px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: 'var(--pt-primary)',
                  margin: '0 0 8px',
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 13,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--pt-muted)',
                  margin: 0,
                }}
              >
                {card.meta}
              </p>
            </article>
          </div>
        );
      })}
    </section>
  );
}
