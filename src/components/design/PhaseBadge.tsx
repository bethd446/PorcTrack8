import React from 'react';

export type Phase = 'repro' | 'mater' | 'sevr' | 'crois' | 'engr' | 'finit' | 'sortie';

const LABELS: Record<Phase, string> = {
  repro:  'Reproduction',
  mater:  'Maternité',
  sevr:   'Allaitement',
  crois:  'Croissance',
  engr:   'Engraissement',
  finit:  'Finition',
  sortie: 'Sortie',
};

interface Props {
  phase: Phase;
  /** Override le label par défaut */
  label?: string;
  /** Variant compact (10px font, padding réduit) */
  size?: 'sm' | 'md';
}

const PhaseBadge: React.FC<Props> = ({ phase, label, size = 'md' }) => {
  const isSm = size === 'sm';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: `var(--phase-${phase}-soft)`,
        color: `var(--phase-${phase})`,
        fontFamily: 'var(--font-mono)',
        fontSize: isSm ? 10 : 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        padding: isSm ? '3px 8px' : '4px 10px',
        borderRadius: 'var(--radius-pill, 9999px)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: `var(--phase-${phase})`,
        }}
      />
      {label ?? LABELS[phase]}
    </span>
  );
};

export default PhaseBadge;
