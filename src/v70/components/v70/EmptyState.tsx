/**
 * V70 — EmptyState (Sprint 8 patterns transverses)
 *
 * Empty state générique : icône Lucide + titre + description optionnelle
 * + CTA optionnel. Utilise la classe CSS .empty (déjà dans v70-global.css).
 * Différent de EmptyEdu (qui est l'empty state pédagogique pour la couche
 * éducative).
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateCta {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description?: string;
  cta?: EmptyStateCta;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  iconColor,
  title,
  description,
  cta,
  className,
}) => (
  <div className={className ? `empty ${className}` : 'empty'}>
    <Icon
      size={48}
      strokeWidth={1.25}
      color={iconColor ?? 'var(--pt-subtle)'}
      aria-hidden="true"
    />
    <div
      style={{
        fontFamily: 'var(--pt-font-display)',
        fontWeight: 900,
        textTransform: 'uppercase',
        fontSize: 22,
        letterSpacing: '-0.005em',
        lineHeight: 1,
        color: 'var(--pt-ink)',
      }}
    >
      {title}
    </div>
    {description && (
      <div style={{ fontSize: 13, color: 'var(--pt-muted)', lineHeight: 1.5 }}>
        {description}
      </div>
    )}
    {cta && (
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={cta.onClick}
        style={{ marginTop: 4 }}
      >
        {cta.label}
      </button>
    )}
  </div>
);
