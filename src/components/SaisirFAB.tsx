import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import SaisirSheet from './forms/SaisirSheet';

interface SaisirFABProps {
  className?: string;
  hidden?: boolean;
}

const SaisirFAB: React.FC<SaisirFABProps> = ({ className = '', hidden = false }) => {
  const [open, setOpen] = useState(false);

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Saisir un évènement métier"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`pressable fixed z-[55] flex items-center justify-center rounded-full transition-transform shadow-lg hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
        style={{
          // Positionné AU-DESSUS de MariusFAB (bottom: 18, hauteur 52). 18 + 52 + 6 = 76.
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
          right: 18,
          width: 56,
          height: 56,
          background: 'var(--color-accent-500)',
          color: 'var(--on-accent)',
          border: 0,
          cursor: 'pointer',
          boxShadow:
            '0 8px 22px -6px color-mix(in srgb, var(--color-accent-500) 55%, transparent)',
          transitionDuration: 'var(--duration-press, 160ms)',
          transitionTimingFunction:
            'var(--ease-emil, cubic-bezier(0.23,1,0.32,1))',
          outlineColor: 'var(--color-accent-500)',
        }}
      >
        <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
      </button>

      <SaisirSheet isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default SaisirFAB;
