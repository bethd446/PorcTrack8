import React from 'react';

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Variant compact (padding réduit, pour cards) */
  size?: 'sm' | 'md' | 'lg';
}

const EmptyState: React.FC<Props> = ({ icon, title, description, action, size = 'md' }) => {
  const padding = size === 'sm' ? '24px 16px' : size === 'lg' ? '56px 32px' : '40px 24px';
  const iconBoxSize = size === 'sm' ? 48 : 64;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-card, 12px)',
        padding,
        boxShadow: 'var(--shadow-card, 0 1px 2px rgba(0,0,0,0.04))',
        border: '1px solid var(--line)',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            width: iconBoxSize,
            height: iconBoxSize,
            borderRadius: '50%',
            background: 'var(--color-accent-100)',
            color: 'var(--color-accent-500)',
            margin: '0 auto 16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontFamily: 'var(--font-heading, BigShoulders), system-ui, sans-serif',
          fontSize: size === 'sm' ? 18 : 22,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          margin: '0 0 8px',
          color: 'var(--ink)',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: 14,
            color: 'var(--muted)',
            margin: '0 auto 18px',
            maxWidth: 380,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
