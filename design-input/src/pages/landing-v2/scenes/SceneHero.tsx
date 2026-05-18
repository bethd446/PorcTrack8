import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export function SceneHero() {
  const ref = useRef<HTMLDivElement>(null);

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

      gsap.fromTo(
        ref.current.querySelector('.hero-title'),
        { opacity: 0, y: 40, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: 'power2.out',
          immediateRender: false,
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        },
      );

      gsap.fromTo(
        ref.current.querySelector('.hero-video'),
        { objectPosition: 'center 25%' },
        {
          objectPosition: 'center 60%',
          ease: 'none',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.2,
          },
        },
      );
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      className="hero-sticky-wrapper"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--pt-bg)',
        color: 'var(--pt-ink)',
        overflow: 'hidden',
      }}
    >
      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/videos/landing/hero-maternity-dawn-poster.jpg"
        aria-label="Élevage porcin moderne au lever du jour, ambiance contemplative"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 25%',
          willChange: 'object-position',
        }}
      >
        <source src="/videos/landing/hero-maternity-dawn.webm" type="video/webm" />
        <source src="/videos/landing/hero-maternity-dawn.mp4" type="video/mp4" />
      </video>

      {/* Voile dégradé bottom-up : masque le watermark Creatify + lisibilité texte */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, var(--pt-bg) 0%, rgba(250,247,240,0.85) 14%, rgba(26,26,26,0.45) 55%, transparent 85%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px 60px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'white',
            opacity: 0.85,
            marginBottom: 24,
          }}
        >
          PORCTRACK · ÉLEVAGE 2026
        </span>

        <h1
          className="hero-title"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(44px, 9vw, 104px)',
            lineHeight: 0.94,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            maxWidth: 1100,
            margin: 0,
            color: 'white',
            textShadow: '0 2px 24px rgba(26,26,26,0.35)',
            willChange: 'transform, opacity',
          }}
        >
          La précision
          <br />
          <em
            style={{
              fontStyle: 'normal',
              color: 'var(--pt-warm)',
              borderBottom: '4px solid var(--pt-accent)',
              paddingBottom: 4,
            }}
          >
            en plein élevage.
          </em>
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            lineHeight: 1.5,
            maxWidth: 620,
            color: 'rgba(255,255,255,0.92)',
            margin: '28px 0 44px',
            textShadow: '0 1px 12px rgba(26,26,26,0.4)',
          }}
        >
          L'app GTTT pensée pour les naisseurs-engraisseurs d'Afrique de l'Ouest.
          Suivez vos truies, vos bandes et vos porcelets sans Excel.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
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
              padding: '18px 36px',
              background: 'var(--pt-primary)',
              color: 'var(--pt-warm)',
              borderRadius: 999,
              textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(45,74,31,0.35)',
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Démarrer mon élevage
          </Link>
          <a
            href="#marius"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              padding: '18px 36px',
              background: 'transparent',
              color: 'white',
              border: '1.5px solid rgba(255,255,255,0.55)',
              borderRadius: 999,
              textDecoration: 'none',
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Voir une démo ›
          </a>
        </div>
      </div>
    </section>
  );
}
