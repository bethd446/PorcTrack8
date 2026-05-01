/**
 * TruieEventActionSheet — Bottom sheet contextuelle pour la saisie d'évènement
 * sur une fiche truie. Présente 4 actions (saillie / écho / mise-bas / mortalité)
 * réordonnées selon le statut de la truie.
 */
import React from 'react';
import { Heart, Stethoscope, Baby, Skull, ChevronRight } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { normaliseStatut, type TruieStatutCanonique } from '../../lib/truieStatut';

export type TruieEventAction = 'SAILLIE' | 'ECHOGRAPHIE' | 'MISE_BAS' | 'MORTALITE';

interface TruieEventActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  truieDisplayId: string;
  truieStatut: string;
  onSelect: (action: TruieEventAction) => void;
}

interface ActionItem {
  key: TruieEventAction;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: 'accent' | 'amber' | 'pig';
}

const baseActions: Record<TruieEventAction, ActionItem> = {
  SAILLIE: {
    key: 'SAILLIE',
    icon: <Heart size={18} aria-hidden="true" />,
    title: 'Saillie',
    subtitle: 'Enregistrer une saillie réussie',
    tone: 'accent',
  },
  ECHOGRAPHIE: {
    key: 'ECHOGRAPHIE',
    icon: <Stethoscope size={18} aria-hidden="true" />,
    title: 'Échographie',
    subtitle: 'Confirmer la gestation (J28)',
    tone: 'accent',
  },
  MISE_BAS: {
    key: 'MISE_BAS',
    icon: <Baby size={18} aria-hidden="true" />,
    title: 'Mise-bas',
    subtitle: 'Enregistrer la portée',
    tone: 'amber',
  },
  MORTALITE: {
    key: 'MORTALITE',
    icon: <Skull size={18} aria-hidden="true" />,
    title: 'Mortalité',
    subtitle: 'Déclarer la mort de la truie',
    tone: 'pig',
  },
};

export function orderActions(canonique: TruieStatutCanonique): TruieEventAction[] {
  switch (canonique) {
    case 'VIDE':
    case 'CHALEUR':
      return ['SAILLIE', 'ECHOGRAPHIE', 'MISE_BAS', 'MORTALITE'];
    case 'PLEINE':
      return ['ECHOGRAPHIE', 'MISE_BAS', 'SAILLIE', 'MORTALITE'];
    case 'MATERNITE':
      return ['MISE_BAS', 'SAILLIE', 'ECHOGRAPHIE', 'MORTALITE'];
    case 'REFORME':
      return ['MORTALITE', 'SAILLIE', 'ECHOGRAPHIE', 'MISE_BAS'];
    default:
      return ['SAILLIE', 'ECHOGRAPHIE', 'MISE_BAS', 'MORTALITE'];
  }
}

const TruieEventActionSheet: React.FC<TruieEventActionSheetProps> = ({
  isOpen,
  onClose,
  truieDisplayId,
  truieStatut,
  onSelect,
}) => {
  const canonique = normaliseStatut(truieStatut);
  const order = orderActions(canonique);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Saisir un évènement pour ${truieDisplayId}`}
      height="auto"
    >
      <div className="space-y-2 py-1">
        <p className="px-1 font-mono text-[10px] uppercase tracking-wide text-text-2">
          Statut courant : {truieStatut || '—'}
        </p>
        <ul className="card-dense !p-0 overflow-hidden">
          {order.map((key, i) => {
            const a = baseActions[key];
            const toneColor =
              a.tone === 'pig'
                ? 'var(--color-pig, var(--coral, #EF4444))'
                : a.tone === 'amber'
                ? 'var(--amber-pork-deep)'
                : 'var(--color-accent-500, var(--accent))';
            return (
              <li key={a.key}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(a.key);
                  }}
                  aria-label={`${a.title} — ${a.subtitle}`}
                  className="pressable flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-bg-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--border, var(--line))',
                  }}
                >
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md"
                    style={{
                      background: 'color-mix(in srgb, currentColor 12%, transparent)',
                      color: toneColor,
                    }}
                  >
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-[14px] uppercase tracking-wide text-text-0">
                      {a.title}
                    </span>
                    <span className="block font-mono text-[11px] text-text-2 mt-0.5">
                      {a.subtitle}
                    </span>
                  </span>
                  <ChevronRight size={14} className="text-text-2" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="pressable mt-3 w-full h-12 rounded-md bg-bg-1 border border-border text-text-1 font-mono text-[12px] font-bold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Annuler
        </button>
      </div>
    </BottomSheet>
  );
};

export default TruieEventActionSheet;
