import React from 'react';

export interface InsightCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * InsightCard V30 — encart "ANALYSE MARIUS" / insight assistant.
 *
 * Card avec :
 *   - Bordure gauche orange 3px (var(--pt-accent))
 *   - Fond crème chaud (var(--pt-surface-insight))
 *   - Header SMALL CAPS letter-spacé en orange : "✨ <TITLE>"
 *   - Contenu body en Instrument Sans
 *
 * Usage : insights Marius, recommandations, suggestions IA.
 */
const InsightCard: React.FC<InsightCardProps> = ({
  title,
  children,
  className,
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        background: 'var(--pt-surface-insight)',
        borderLeft: '3px solid var(--pt-accent)',
        borderRadius: 'var(--pt-radius-md)',
        padding: 'var(--pt-space-4) var(--pt-space-5)',
        boxShadow: 'var(--pt-shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--pt-space-2)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--pt-font-body)',
          fontSize: 'var(--pt-text-label)',
          letterSpacing: 'var(--pt-tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--pt-accent)',
          fontWeight: 700,
        }}
      >
        <span aria-hidden="true">✨</span>
        <span>{title}</span>
      </div>
      <div
        style={{
          fontFamily: 'var(--pt-font-body)',
          fontSize: 'var(--pt-text-body)',
          color: 'var(--pt-text)',
          lineHeight: 1.5,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default InsightCard;
