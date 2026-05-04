/**
 * V70 — EmptyEdu (réplique mockup .empty-edu)
 *
 * Empty state pédagogique avec icône, titre, description et CTA optionnel.
 */
import React from 'react';

export interface EmptyEduProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export const EmptyEdu: React.FC<EmptyEduProps> = ({
  icon = '📚',
  title,
  description,
  ctaLabel,
  onCtaClick,
}) => (
  <div className="empty-edu">
    <div className="empty-edu-icon">{icon}</div>
    <div className="empty-edu-title">{title}</div>
    <div className="empty-edu-desc">{description}</div>
    {ctaLabel && onCtaClick && (
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onCtaClick}
      >
        → {ctaLabel}
      </button>
    )}
  </div>
);
