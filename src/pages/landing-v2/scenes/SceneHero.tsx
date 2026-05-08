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
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
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
        ref.current.querySelector('.hero-image'),
        { scale: 0.95 },
        {
          scale: 1.05,
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
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 24,
        }}
      >
        ● PorcTrack · Élevage 2026
      </span>
      <h1
        className="hero-title"
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: 'clamp(40px, 8vw, 96px)',
          lineHeight: 0.95,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          maxWidth: 1100,
          margin: 0,
          color: '#fff',
          willChange: 'transform, opacity',
        }}
      >
        Votre ferme,
        <br />
        <em style={{ fontStyle: 'normal', color: '#34d399' }}>
          au cœur de la donnée.
        </em>
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 18,
          lineHeight: 1.5,
          maxWidth: 580,
          color: 'rgba(255,255,255,0.7)',
          margin: '24px 0 40px',
        }}
      >
        Suivi reproductif, alertes biologiques, alimentation calculée — pensé
        pour les éleveurs de porcs.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: 60,
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
            padding: '16px 32px',
            background: '#10b981',
            color: '#fff',
            borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          Commencer
        </Link>
        <Link
          to="/login"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            padding: '16px 32px',
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          Se connecter
        </Link>
      </div>
      <img
        className="hero-image"
        src="/images/landing/scene-hero-devices.webp"
        alt="PorcTrack sur iPhone et iPad"
        loading="eager"
        fetchPriority="high"
        style={{
          width: '100%',
          maxWidth: 1100,
          height: 'auto',
          display: 'block',
          willChange: 'transform',
        }}
      />
    </section>
  );
}
