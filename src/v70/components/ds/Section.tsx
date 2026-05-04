/**
 * V70 — Section (réplique mockup ligne 280-302)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html
 * - .section (l. 280) : margin-bottom 24px
 * - .section-label (l. 282-294) : 10px UPPERCASE letter-spacing 0.14em
 *   + puce 4px verte (::before) + ligne séparatrice (border-bottom var(--line))
 */
import React from 'react';

export interface SectionProps {
  label: string;
  children?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ label, children }) => {
  return (
    <section className="section">
      <div className="section-label">{label}</div>
      {children}
    </section>
  );
};
