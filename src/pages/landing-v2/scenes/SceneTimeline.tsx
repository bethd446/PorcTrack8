import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

const STAGES = ['Saillie', 'Écho', 'Gestation', 'Mise-bas'] as const;

const PHOTOS: Array<{ src: string; alt: string; left: string; top: string; width: number }> = [
  { src: '/images/ambiance-verrat.webp', alt: 'Verrat', left: '6%', top: '14%', width: 220 },
  { src: '/images/ambiance-maternite.webp', alt: 'Maternité', left: '50%', top: '8%', width: 260 },
  { src: '/images/ambiance-croissance.webp', alt: 'Croissance', left: '74%', top: '22%', width: 220 },
];

export function SceneTimeline() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sceneRef.current) return;

      gsap.to(sceneRef.current.querySelector('.timeline-fill'), {
        scaleX: 1,
        scrollTrigger: {
          trigger: sceneRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });

      const stageEls = sceneRef.current.querySelectorAll<HTMLElement>('.stage-label');
      stageEls.forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: i === 0 ? 1 : 0.25, scale: i === 0 ? 1 : 0.94 },
          {
            opacity: 1,
            scale: 1,
            scrollTrigger: {
              trigger: sceneRef.current,
              start: `top+=${i * 25}% top`,
              end: `top+=${(i + 1) * 25}% top`,
              scrub: true,
              toggleActions: 'play none none reverse',
            },
          },
        );
      });

      sceneRef.current.querySelectorAll<HTMLElement>('.parallax-photo').forEach((img, i) => {
        const dir = i % 2 === 0 ? -120 : 120;
        gsap.fromTo(
          img,
          { y: -dir },
          {
            y: dir,
            scrollTrigger: {
              trigger: sceneRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2,
            },
          },
        );
      });
    },
    { scope: sceneRef },
  );

  return (
    <section
      ref={sceneRef}
      style={{
        position: 'relative',
        height: '220vh',
        background: 'linear-gradient(180deg, #FAF7F0 0%, #F1ECE0 100%)',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        {PHOTOS.map((p, i) => (
          <img
            key={i}
            src={p.src}
            alt={p.alt}
            className="parallax-photo"
            loading="lazy"
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              width: p.width,
              height: 'auto',
              borderRadius: 24,
              boxShadow: '0 20px 60px rgba(6,78,59,0.18)',
              objectFit: 'cover',
              opacity: 0.92,
            }}
          />
        ))}

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            maxWidth: 720,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: '#065f46',
            }}
          >
            Cycle biologique · 115 jours
          </span>

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 'clamp(40px, 7vw, 88px)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              margin: '16px 0 32px',
              color: '#064e3b',
            }}
          >
            De la saillie
            <br />à la mise-bas
          </h2>

          <div
            style={{
              display: 'flex',
              gap: 20,
              justifyContent: 'center',
              marginBottom: 32,
              flexWrap: 'wrap',
            }}
          >
            {STAGES.map((s, i) => (
              <span
                key={i}
                className="stage-label"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#064e3b',
                  display: 'inline-block',
                }}
              >
                {s}
              </span>
            ))}
          </div>

          <div
            style={{
              position: 'relative',
              width: 'min(560px, 80vw)',
              height: 4,
              borderRadius: 999,
              background: 'rgba(6,78,59,0.12)',
              margin: '0 auto',
              overflow: 'hidden',
            }}
          >
            <div
              className="timeline-fill"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, #064e3b, #F4A261)',
                transformOrigin: 'left center',
                transform: 'scaleX(0)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
