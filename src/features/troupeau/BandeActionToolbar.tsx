import React from 'react';
import { Scale, Skull, HeartPulse, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/design-system';

interface BandeActionToolbarProps {
  onPesee: () => void;
  onMortalite: () => void;
  onSoin?: () => void;
  onTransfert?: () => void;
  isBloquant?: boolean;
}

/**
 * BandeActionToolbar — Barre d'action fixe en bas de l'écran pour les saisies terrain
 */
const BandeActionToolbar: React.FC<BandeActionToolbarProps> = ({
  onPesee,
  onMortalite,
  onSoin,
  onTransfert,
  isBloquant
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-1/80 backdrop-blur-xl border-t border-border px-4 py-3 flex gap-3 z-50 animate-fade-in-up">
      <Button
        variant="danger"
        onClick={onMortalite}
        ariaLabel="Déclarer mortalité (confirmation requise)"
        className="!flex-1 !flex-col !rounded-2xl !h-14 !gap-1"
        style={{ background: 'transparent', borderColor: 'var(--color-pig, var(--color-danger))', borderWidth: '1px', borderStyle: 'solid', color: 'var(--color-pig, var(--color-danger))', textTransform: 'uppercase' }}
      >
        <Skull size={18} />
        <span className="text-[9px] font-bold uppercase">Mortalité</span>
      </Button>

      <Button
        variant="secondary"
        onClick={onSoin}
        className="!flex-1 !flex-col !rounded-2xl !h-14 !gap-1"
      >
        <HeartPulse size={18} className="text-text-2" />
        <span className="text-[9px] font-bold uppercase text-text-2">Soin</span>
      </Button>

      {onTransfert && (
        <Button
          variant="ghost"
          onClick={onTransfert}
          className="!flex-1 !flex-col !rounded-2xl !h-14 !gap-1"
          style={{ background: 'color-mix(in srgb, var(--amber-pork) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--amber-pork) 20%, transparent)', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <ArrowRightLeft size={18} style={{ color: 'var(--amber-pork-deep)' }} />
          <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--amber-pork-deep)' }}>Transfert</span>
        </Button>
      )}

      <Button
        variant="primary"
        disabled={isBloquant}
        onClick={onPesee}
        className="!flex-[2] !flex-col !rounded-2xl !h-14 !gap-1"
      >
        <Scale size={20} />
        <span className="text-[10px] font-bold uppercase">Nouvelle Pesée</span>
      </Button>
    </div>
  );
};

export default BandeActionToolbar;
