import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';

interface MariusGreetingProps {
  onClick?: () => void;
  pageContext?: string;
}

export const MariusGreeting: React.FC<MariusGreetingProps> = ({ onClick, pageContext }) => {
  const navigate = useNavigate();
  const tagline = pageContext
    ? `Marius vous accompagne sur votre ${pageContext}`
    : 'Marius vous écoute · poser une question';

  const handleClick = () => {
    if (onClick) onClick();
    else window.dispatchEvent(new Event('open-chatbot'));
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/marius');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 6,
        margin: '0 16px 12px',
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: 'var(--color-amber-pork-soft, #fef3e0)',
          border: '1px solid color-mix(in srgb, var(--color-amber-pork, #F4A261) 30%, transparent)',
          borderRadius: 999,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 200ms ease',
        }}
        aria-label="Ouvrir l'assistant Marius"
      >
        <img
          src="/images/v73/marius/orb-emeraude.webp"
          alt=""
          aria-hidden="true"
          width={40}
          height={40}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--ink)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Marius
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{tagline}</span>
        </div>
      </button>
      <button
        type="button"
        onClick={handleFullscreen}
        aria-label="Continuer la conversation en plein écran"
        title="Continuer la conversation"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          padding: 0,
          background: 'var(--color-amber-pork-soft, #fef3e0)',
          border: '1px solid color-mix(in srgb, var(--color-amber-pork, #F4A261) 30%, transparent)',
          borderRadius: 999,
          cursor: 'pointer',
          color: 'var(--ink)',
          flexShrink: 0,
          transition: 'background 200ms ease',
        }}
      >
        <Maximize2 size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
};
