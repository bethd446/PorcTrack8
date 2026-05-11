import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import SaisirSheet from './forms/SaisirSheet';

interface SaisirFABProps {
  className?: string;
  hidden?: boolean;
}

/**
 * SaisirFAB — V77 (mockup onboarding-modals-v76 + constitution V77.1)
 * ════════════════════════════════════════════════════════════════════════════
 * FAB "Saisir un évènement" canonique V77 :
 *   - 64×64 carré radius 20px (block plat, pas cercle)
 *   - Background var(--pt-primary) + texte blanc
 *   - Shadow plate 0 4px 0 var(--pt-primary-deep) (style brutaliste V77)
 *   - Position fixed bottom 80px (au-dessus de la nav Ionic) right 24px
 *   - z-index 1010 (au-dessus de la bottom nav et du contenu)
 *   - Active state : translateY(2px) + shadow 0 2px 0
 *   - Wrapper `.pt-screen` requis pour activer les tokens scopés V77
 *
 * La présence est contextuelle : voir `usePageFab()` + `App.tsx`.
 * `hidden={true}` reste supporté pour les routes qui veulent le masquer en
 * dehors du hook (ex : modale plein écran).
 */
const SaisirFAB: React.FC<SaisirFABProps> = ({ className = '', hidden = false }) => {
  const [open, setOpen] = useState(false);

  if (hidden) return null;

  return (
    <div className="pt-screen">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Saisir un évènement métier"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-pt="fab"
        className={`fab--v77 pressable ${className}`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          right: 24,
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'var(--pt-primary)',
          color: 'white',
          border: 0,
          cursor: 'pointer',
          zIndex: 1010,
          boxShadow: '0 4px 0 var(--pt-primary-deep, #1F3315)',
        }}
      >
        <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
      </button>

      <SaisirSheet isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default SaisirFAB;
