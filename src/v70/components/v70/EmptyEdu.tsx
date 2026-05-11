/**
 * V70 — EmptyEdu (réplique mockup .empty-edu)
 *
 * Empty state pédagogique avec icône, titre, description et CTA optionnel.
 *
 * V71 — Anti-AI feel : icône par défaut Lucide BookOpen (trait fin,
 * couleur var(--pt-muted)) au lieu d'un emoji livre. Override possible
 * via prop `icon`, ou désactivation via `icon={null}`.
 */
import React from 'react';
import { BookOpen } from 'lucide-react';

export interface EmptyEduProps {
  /** Icon to render above the title. Defaults to a BookOpen. Pass `null` to hide. */
  icon?: React.ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

const DEFAULT_ICON = (
  <BookOpen
    size={20}
    strokeWidth={2}
    aria-hidden="true"
    style={{ color: 'var(--pt-muted)' }}
  />
);

export const EmptyEdu: React.FC<EmptyEduProps> = ({
  icon = DEFAULT_ICON,
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
        className="btn btn--secondary btn--sm"
        onClick={onCtaClick}
      >
        › {ctaLabel}
      </button>
    )}
  </div>
);
