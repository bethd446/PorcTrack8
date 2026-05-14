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
    : 'Pose une question · contexte ferme en direct';

  const handleClick = () => {
    if (onClick) onClick();
    else window.dispatchEvent(new Event('open-chatbot'));
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new Event('close-chatbot'));
    navigate('/marius');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 8,
        margin: '0 16px 6px',
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          background: 'var(--pt-warm)',
          border: '1px solid var(--pt-line-strong)',
          borderRadius: 999,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 200ms ease, border-color 200ms ease',
          minHeight: 44,
        }}
        aria-label="Ouvrir l'assistant Marius"
      >
        <img
          src="/images/v73/marius/orb-emeraude.webp"
          alt=""
          aria-hidden="true"
          width={28}
          height={28}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
            boxShadow: '0 0 10px rgba(52, 211, 153, 0.5)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--pt-font-mono)',
              fontWeight: 600,
              fontSize: 10,
              color: 'var(--pt-accent)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Marius · Assistant IA
          </span>
          <span
            style={{
              fontSize: 12,
              color: 'var(--pt-ink)',
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tagline}
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={handleFullscreen}
        aria-label="Continuer la conversation en plein écran"
        title="Plein écran"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          minHeight: 44,
          padding: 0,
          background: 'var(--pt-warm)',
          border: '1px solid var(--pt-line-strong)',
          borderRadius: 999,
          cursor: 'pointer',
          color: 'var(--pt-ink)',
          flexShrink: 0,
          transition: 'background 200ms ease, border-color 200ms ease',
        }}
      >
        <Maximize2 size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
};
