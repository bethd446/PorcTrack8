import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

type Theme = 'dark' | 'light';

export interface SceneFrameProps {
  theme: Theme;
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  imageMode?: 'cover' | 'contain';
  topSlot?: React.ReactNode;
}

const PALETTE: Record<Theme, { bg: string; fg: string; eyebrow: string; sub: string; accent: string }> = {
  dark: {
    bg: '#0a0a0a',
    fg: '#ffffff',
    eyebrow: 'rgba(255,255,255,0.6)',
    sub: 'rgba(255,255,255,0.7)',
    accent: '#34d399',
  },
  light: {
    bg: '#f5f5f7',
    fg: '#1d1d1f',
    eyebrow: 'rgba(29,29,31,0.6)',
    sub: 'rgba(29,29,31,0.7)',
    accent: '#10b981',
  },
};

export function SceneFrame({
  theme,
  image,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  imageMode = 'cover',
  topSlot,
}: SceneFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const palette = PALETTE[theme];

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

      const titleEl = ref.current.querySelector('.scene-title-block');
      if (titleEl) {
        // fromTo + immediateRender:false : le titre reste à son état CSS
        // (opacity 1) tant que ScrollTrigger n'a pas trigger. gsap.from()
        // figerait à opacity:0 au mount, ce qui bloque le rendu si Lenis
        // ou l'override Ionic empêche le trigger de se déclencher.
        gsap.fromTo(
          titleEl,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power2.out',
            immediateRender: false,
            scrollTrigger: {
              trigger: ref.current,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      }

      const imgEl = ref.current.querySelector('.scene-img');
      if (imgEl) {
        gsap.fromTo(
          imgEl,
          { scale: 1 },
          {
            scale: 1.08,
            ease: 'none',
            scrollTrigger: {
              trigger: ref.current,
              start: 'top top',
              end: 'bottom top',
              scrub: 1.2,
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
        minHeight: '180vh',
        background: palette.bg,
        color: palette.fg,
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          className="scene-img"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: imageMode,
            objectPosition: 'center',
            willChange: 'transform',
            opacity: imageMode === 'cover' ? 0.55 : 1,
          }}
        />
        {imageMode === 'cover' && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                theme === 'dark'
                  ? 'linear-gradient(180deg, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.85) 100%)'
                  : 'linear-gradient(180deg, rgba(245,245,247,0.45) 0%, rgba(245,245,247,0.85) 100%)',
            }}
          />
        )}

        <div
          className="scene-title-block"
          style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            padding: '0 24px',
            maxWidth: 960,
            willChange: 'transform, opacity',
          }}
        >
          {topSlot}
          <span
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: palette.eyebrow,
              marginBottom: 24,
            }}
          >
            {eyebrow}
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 'clamp(40px, 8vw, 104px)',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              margin: 0,
              color: palette.fg,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 18,
              lineHeight: 1.5,
              color: palette.sub,
              maxWidth: 620,
              margin: '24px auto 0',
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
