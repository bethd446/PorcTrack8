import React from 'react';

interface MariusGreetingProps {
  onClick?: () => void;
  pageContext?: string;
}

export const MariusGreeting: React.FC<MariusGreetingProps> = ({ onClick, pageContext }) => {
  const tagline = pageContext
    ? `Marius vous accompagne sur votre ${pageContext}`
    : 'Marius vous écoute · poser une question';

  const handleClick = () => {
    if (onClick) onClick();
    else window.dispatchEvent(new Event('open-chatbot'));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'var(--color-amber-pork-soft, #fef3e0)',
        border: '1px solid color-mix(in srgb, var(--color-amber-pork, #F4A261) 30%, transparent)',
        borderRadius: 999,
        cursor: 'pointer',
        textAlign: 'left',
        margin: '0 16px 12px',
        transition: 'background 200ms ease',
      }}
      aria-label="Ouvrir l'assistant Marius"
    >
      <img
        src="/images/marius-avatar.webp"
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
  );
};
