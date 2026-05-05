/**
 * V70 — EduCard "Le saviez-vous ?" (réplique mockup .edu-card)
 */
import React from 'react';

export interface EduCardProps {
  label?: string;
  children: React.ReactNode;
}

export const EduCard: React.FC<EduCardProps> = ({
  label = '💡 Le saviez-vous ?',
  children,
}) => (
  <div className="edu-card">
    <div className="edu-card-label">{label}</div>
    <div className="edu-card-text">{children}</div>
  </div>
);
