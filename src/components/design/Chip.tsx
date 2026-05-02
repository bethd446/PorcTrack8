import React from 'react';

type Tone = 'green' | 'amber' | 'terre' | 'pig' | 'neutral';

interface ChipProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

const TONE_STYLE: Record<Tone, React.CSSProperties> = {
  green: {
    background: 'var(--color-accent-100)',
    color: 'var(--color-accent-600)',
  },
  amber: {
    background: 'var(--color-amber-pork-soft)',
    color: 'var(--color-amber-pork-deep)',
  },
  terre: {
    background: 'var(--color-secondary-soft)',
    color: 'var(--color-secondary-deep)',
  },
  pig: {
    background: 'var(--color-pig-soft)',
    color: 'var(--color-pig-deep)',
  },
  neutral: {
    background: 'var(--bg-surface-2)',
    color: 'var(--muted)',
    border: '0.5px solid var(--line)',
  },
};

const Chip: React.FC<ChipProps> = ({ children, tone = 'green', className = '' }) => {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        fontWeight: 500,
        padding: '5px 10px',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        ...TONE_STYLE[tone],
      }}
    >
      {children}
    </span>
  );
};

export default Chip;
