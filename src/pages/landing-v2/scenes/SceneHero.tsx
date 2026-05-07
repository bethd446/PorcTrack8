import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

type Kpi = { num: string; label: string; suffix?: string };

const KPI: ReadonlyArray<Kpi> = [
  { num: '115', suffix: 'j', label: 'Cycle gestation' },
  { num: '16', label: 'Règles GTTT' },
  { num: 'J18', suffix: '–J24', label: 'Retour chaleur' },
  { num: '100', suffix: '%', label: 'Hors-ligne' },
];

export function SceneHero() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sceneRef.current) return;
      gsap.fromTo(
        sceneRef.current.querySelector('.hero-title'),
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: sceneRef.current,
            start: 'top 80%',
            end: 'top 20%',
            scrub: 0.8,
          },
        },
      );
      sceneRef.current.querySelectorAll('.kpi-card').forEach((card, i) => {
        gsap.to(card, {
          y: -50 - i * 30,
          scrollTrigger: {
            trigger: sceneRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        });
      });
    },
    { scope: sceneRef },
  );

  return (
    <section
      ref={sceneRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundImage: 'url(/images/hero-1.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(6,78,59,0.2) 0%, rgba(6,78,59,0.7) 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 24px',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)',
            marginBottom: 24,
          }}
        >
          ● Smart App Élevage 2026 · Côte d&apos;Ivoire
        </span>
        <h1
          className="hero-title"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(48px, 10vw, 120px)',
            lineHeight: 0.92,
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
            margin: 0,
            maxWidth: 1200,
          }}
        >
          Pilotez votre élevage
          <br />
          en bandes
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.92)',
            marginTop: 24,
            maxWidth: 580,
          }}
        >
          Suivez vos truies, saillies et alertes biologiques en un coup d&apos;œil.
          Pensé pour vos bandes, votre rythme, votre ferme.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginTop: 64,
            width: '100%',
            maxWidth: 1000,
          }}
        >
          {KPI.map((k, i) => (
            <div
              key={i}
              className="kpi-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20,
                padding: '20px 16px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 36,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                {k.num}
                {k.suffix && (
                  <small style={{ fontSize: 18, opacity: 0.7 }}>{k.suffix}</small>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.75)',
                  marginTop: 8,
                }}
              >
                {k.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
