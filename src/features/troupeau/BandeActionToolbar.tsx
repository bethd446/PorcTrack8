import React from 'react';
import { Scale, Skull, HeartPulse, ArrowRightLeft } from 'lucide-react';

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
      <button
        onClick={onMortalite}
        aria-label="Déclarer mortalité (confirmation requise)"
        className="flex-1 h-14 rounded-2xl border flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
        style={{ background: 'transparent', borderColor: 'var(--color-pig, var(--color-danger, #EF4444))' }}
      >
        <Skull size={18} style={{ color: 'var(--color-pig, var(--color-danger, #EF4444))' }} />
        <span className="text-[9px] font-bold uppercase font-mono" style={{ color: 'var(--color-pig, var(--color-danger, #EF4444))' }}>Mortalité</span>
      </button>

      <button
        onClick={onSoin}
        className="flex-1 h-14 rounded-2xl bg-bg-2 border border-border flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
      >
        <HeartPulse size={18} className="text-text-2" />
        <span className="text-[9px] font-bold uppercase font-mono text-text-2">Soin</span>
      </button>

      {onTransfert && (
        <button
          onClick={onTransfert}
          className="flex-1 h-14 rounded-2xl border flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
          style={{ background: 'color-mix(in srgb, var(--amber-pork) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--amber-pork) 20%, transparent)' }}
        >
          <ArrowRightLeft size={18} style={{ color: 'var(--amber-pork-deep)' }} />
          <span className="text-[9px] font-bold uppercase font-mono" style={{ color: 'var(--amber-pork-deep)' }}>Transfert</span>
        </button>
      )}

      <button
        disabled={isBloquant}
        onClick={onPesee}
        className={`flex-[2] h-14 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg transition-all active:scale-95 ${
          isBloquant
            ? 'bg-bg-3 grayscale opacity-50 cursor-not-allowed'
            : 'bg-accent text-bg-0 shadow-accent/20'
        }`}
      >
        <Scale size={20} />
        <span className="text-[10px] font-bold uppercase font-mono">Nouvelle Pesée</span>
      </button>
    </div>
  );
};

export default BandeActionToolbar;
