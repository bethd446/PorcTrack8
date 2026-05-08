/**
 * V70 — EduCard "Le saviez-vous ?" (réplique mockup .edu-card)
 *
 * V71.4 — Anti-AI feel : remplace l'emoji 💡 par un Lucide Lightbulb
 * (trait fin, couleur var(--pt-muted)). Override possible via prop `icon`,
 * ou désactivation via `icon={null}`.
 */
import React from 'react';
import { Lightbulb } from 'lucide-react';

export interface EduCardProps {
  label?: string;
  /** Icon to render before the label. Defaults to a Lightbulb. Pass `null` to hide. */
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const DEFAULT_ICON = (
  <Lightbulb
    size={14}
    strokeWidth={1.5}
    aria-hidden="true"
    style={{ color: 'var(--pt-muted)', flexShrink: 0 }}
  />
);

export const EduCard: React.FC<EduCardProps> = ({
  label = 'Le saviez-vous ?',
  icon = DEFAULT_ICON,
  children,
}) => (
  <div className="edu-card">
    <div
      className="edu-card-label"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {icon}
      <span>{label}</span>
    </div>
    <div className="edu-card-text">{children}</div>
  </div>
);
