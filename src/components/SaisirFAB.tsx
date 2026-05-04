import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import SaisirSheet from './forms/SaisirSheet';
import { Button } from '@/design-system';

interface SaisirFABProps {
  className?: string;
  hidden?: boolean;
}

/**
 * SaisirFAB — V31-FIX-PACK-01
 * ════════════════════════════════════════════════════════════════════════════
 * FAB "Saisir évènement" rond (border-radius: 50%, ratio 1:1 strict).
 *
 * Spec V31 :
 *   - 56×56 carré → cercle parfait via border-radius 50%
 *   - Background var(--pt-primary) (vert forêt) + texte blanc
 *   - Ombre prononcée double couche (vert + neutre)
 *   - Position fixed bottom 80px (au-dessus de la nav Ionic) right 20px
 *   - z-index 1010 (au-dessus de la bottom nav et du contenu)
 *   - Icône Plus 24px centrée
 *
 * La présence est désormais contextuelle : voir `usePageFab()` + `App.tsx`.
 * `hidden={true}` reste supporté pour les routes qui veulent le masquer en
 * dehors du hook (ex : modale plein écran).
 */
const SaisirFAB: React.FC<SaisirFABProps> = ({ className = '', hidden = false }) => {
  const [open, setOpen] = useState(false);

  if (hidden) return null;

  return (
    <>
      <Button
        type="button"
        variant="primary"
        onClick={() => setOpen(true)}
        aria-label="Saisir un évènement métier"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-pt="fab"
        className={`pressable fixed flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--pt-primary)',
          color: 'var(--pt-primary-text)',
          border: 0,
          cursor: 'pointer',
          zIndex: 1010,
          boxShadow:
            '0 4px 16px rgba(45, 74, 31, 0.24), 0 2px 6px rgba(0, 0, 0, 0.08)',
          transitionDuration: 'var(--duration-press, 160ms)',
          transitionTimingFunction:
            'var(--ease-emil, cubic-bezier(0.23,1,0.32,1))',
          outlineColor: 'var(--pt-primary)',
        }}
      >
        <Plus size={24} strokeWidth={2.4} aria-hidden="true" />
      </Button>

      <SaisirSheet isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default SaisirFAB;
