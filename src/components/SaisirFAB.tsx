import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import SaisirSheet from './forms/SaisirSheet';

interface SaisirFABProps {
  className?: string;
  hidden?: boolean;
}

/**
 * SaisirFAB — V78 (mockup buttons-system V76 canonique)
 * ════════════════════════════════════════════════════════════════════════════
 * FAB "Saisir un évènement" aligné sur `.fab` canonique (cf. v70-global.css) :
 *   - Hérite des dimensions / radius / fond / shadow de `.fab`
 *   - Overrides contextuels inline : position fixed bottom safe-area, right 24,
 *     z-index 1010 (au-dessus de la bottom nav Ionic)
 *   - Wrapper `.pt-screen` conservé pour cohérence tokens V70+
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
        className={`fab pressable ${className}`}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          right: 24,
          zIndex: 1010,
        }}
      >
        <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
      </button>

      <SaisirSheet isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default SaisirFAB;
