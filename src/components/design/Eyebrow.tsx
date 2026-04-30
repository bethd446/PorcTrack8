import React from 'react';

type DotColor = 'accent' | 'amber' | 'pig' | 'terre' | 'muted';

const DOT_BG: Record<DotColor, string> = {
  accent: 'var(--color-accent-500)',
  amber: 'var(--color-amber-pork)',
  pig: 'var(--color-pig)',
  terre: 'var(--color-secondary)',
  muted: 'var(--muted)',
};

interface EyebrowProps {
  children: React.ReactNode;
  dotColor?: DotColor;
  className?: string;
  withRule?: boolean;
}

export default function Eyebrow({
  children,
  dotColor = 'accent',
  className = '',
  withRule = true,
}: EyebrowProps) {
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      style={{
        fontFamily: 'DMMono, ui-monospace, monospace',
        fontSize: '9.5px',
        letterSpacing: '0.20em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        fontWeight: 500,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: DOT_BG[dotColor],
          flexShrink: 0,
        }}
      />
      <span>{children}</span>
      {withRule && (
        <span
          aria-hidden
          style={{
            flex: 1,
            height: 1,
            background: 'var(--line)',
          }}
        />
      )}
    </div>
  );
}
