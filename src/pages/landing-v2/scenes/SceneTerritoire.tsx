import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export function SceneTerritoire() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sceneRef.current) return;

      gsap.fromTo(
        sceneRef.current.querySelector('.territoire-bg'),
        { scale: 1 },
        {
          scale: 1.15,
          ease: 'none',
          scrollTrigger: {
            trigger: sceneRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
          },
        },
      );

      gsap.fromTo(
        sceneRef.current.querySelector('.territoire-text'),
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: sceneRef.current,
            start: 'top 30%',
            end: 'center center',
            scrub: 0.8,
          },
        },
      );
    },
    { scope: sceneRef },
  );

  return (
    <section
      ref={sceneRef}
      style={{
        position: 'relative',
        height: '150vh',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <div
          className="territoire-bg"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/images/ambiance-territoire.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(6,78,59,0.0) 30%, rgba(6,78,59,0.85) 100%)',
          }}
        />

        <div
          className="territoire-text"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '48px 24px 80px',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            Pensé pour le terrain
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 'clamp(40px, 7vw, 96px)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              margin: '16px auto 0',
              maxWidth: 1100,
            }}
          >
            Côte d&apos;Ivoire,
            <br />
            ferme par ferme
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 18,
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.92)',
              marginTop: 20,
              maxWidth: 620,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Le réseau coupe ? L&apos;app continue. Vous saisissez sur le terrain,
            on synchronise quand ça revient.
          </p>
        </div>
      </div>
    </section>
  );
}
