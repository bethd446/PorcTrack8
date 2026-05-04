import React, { useEffect, useRef } from 'react';
import {
  Heart,
  Stethoscope,
  Baby,
  Milk,
  AlertOctagon,
  Scale,
  Syringe,
  Wheat,
  FileText,
  Sparkles,
  Layers,
  Repeat,
  X,
} from 'lucide-react';

import { useQuickActions, type QuickActionKind } from '../AgritechNavV2';
import { Button } from '@/design-system';

export interface SaisirSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActionKind = QuickActionKind | 'marius';

interface ActionDef {
  kind: ActionKind;
  title: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  tone: 'accent' | 'amber' | 'red' | 'default';
  separator?: boolean;
}

const ACTIONS: ActionDef[] = [
  {
    kind: 'saillie',
    title: 'Saillie',
    description: 'Truie × verrat à la date du jour',
    Icon: Heart,
    tone: 'accent',
  },
  {
    kind: 'echographie',
    title: 'Échographie',
    description: 'Confirmer ou infirmer la gestation (J28)',
    Icon: Stethoscope,
    tone: 'accent',
  },
  {
    kind: 'misebas',
    title: 'Mise-bas',
    description: 'Truie + nés vivants + morts-nés',
    Icon: Baby,
    tone: 'accent',
  },
  {
    kind: 'sevrage',
    title: 'Sevrage',
    description: 'Bande + date + nb porcelets',
    Icon: Milk,
    tone: 'default',
  },
  {
    kind: 'mortalite',
    title: 'Mortalité',
    description: 'Animal/bande + cause + date',
    Icon: AlertOctagon,
    tone: 'red',
  },
  {
    kind: 'adoption',
    title: 'Adoption',
    description: 'Transfert porcelets entre bandes en maternité',
    Icon: Repeat,
    tone: 'default',
  },
  {
    kind: 'pesee',
    title: 'Pesée',
    description: 'Bande + poids moyen + date',
    Icon: Scale,
    tone: 'amber',
  },
  {
    kind: 'conso',
    title: 'Conso aliment',
    description: 'Quantité livrée à une bande ou truie',
    Icon: Wheat,
    tone: 'amber',
  },
  {
    kind: 'tripoids',
    title: 'Tri par poids',
    description: 'Distribution engraissement / finition',
    Icon: Layers,
    tone: 'amber',
  },
  {
    kind: 'soin',
    title: 'Soin',
    description: 'Traitement véto + animal',
    Icon: Syringe,
    tone: 'accent',
  },
  {
    kind: 'note',
    title: 'Note',
    description: 'Observation libre',
    Icon: FileText,
    tone: 'default',
  },
  {
    kind: 'marius',
    title: 'Demander à Marius',
    description: 'Assistant IA terrain',
    Icon: Sparkles,
    tone: 'amber',
    separator: true,
  },
];

const TONE_BG: Record<ActionDef['tone'], string> = {
  default: 'var(--pt-surface-alt)',
  accent: 'color-mix(in srgb, var(--color-accent-500) 14%, transparent)',
  amber: 'color-mix(in srgb, var(--amber-pork) 18%, transparent)',
  red: 'color-mix(in srgb, var(--red) 14%, transparent)',
};

const TONE_FG: Record<ActionDef['tone'], string> = {
  default: 'var(--pt-text)',
  accent: 'var(--color-accent-500)',
  amber: 'var(--amber-pork)',
  red: 'var(--red)',
};

const SaisirSheet: React.FC<SaisirSheetProps> = ({ isOpen, onClose }) => {
  const { openAction } = useQuickActions();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousActiveRef.current = document.activeElement;
    const t = setTimeout(() => {
      const closeBtn = sheetRef.current?.querySelector<HTMLButtonElement>('[data-saisir-close]');
      closeBtn?.focus();
    }, 30);

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      if (previousActiveRef.current instanceof HTMLElement) {
        previousActiveRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePick = (kind: ActionKind): void => {
    // Ouvre le form cible AVANT de fermer le sheet : ainsi le state du
    // QuickActionsProvider est posé en synchrone, et la fermeture du sheet
    // (qui re-focus l'élément précédent) n'interfère pas avec le mount du
    // form. L'ancien setTimeout perdait l'ouverture si le sheet était
    // déjà unmount au moment du flush.
    if (kind === 'marius') {
      window.dispatchEvent(new Event('open-chatbot'));
    } else {
      openAction(kind);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saisir-sheet-title"
      className="fixed inset-0 z-[1100] flex items-end justify-center"
    >
      {/* V43.4 — Overlay = div avec onClick (pas un bouton). Le seul vrai
          bouton "Fermer" est le X dans la sheet ci-dessous (uid 245). */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />


      <div
        ref={sheetRef}
        className="relative w-full max-w-[520px] rounded-t-2xl shadow-2xl animate-fade-in-up"
        style={{
          background: 'var(--bg-app)',
          borderTop: '1px solid var(--pt-divider)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2
            id="saisir-sheet-title"
            className="text-[22px] uppercase tracking-wide"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--pt-text)',
              fontWeight: 700,
            }}
          >
            Que veux-tu saisir ?
          </h2>
          <Button
            type="button"
            variant="ghost"
            data-saisir-close
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex h-10 w-10 items-center justify-center active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: 'var(--pt-surface-alt)',
              color: 'var(--pt-text)',
              outlineColor: 'var(--color-accent-500)',
              transition: 'transform var(--duration-press) var(--ease-emil)',
              borderRadius: '9999px',
              height: '2.5rem',
              width: '2.5rem',
              padding: 0,
            }}
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        <div className="px-4 pt-2 pb-2 space-y-2">
          {ACTIONS.map(({ kind, title, description, Icon, tone, separator }) => (
            <React.Fragment key={kind}>
              {separator ? (
                <div
                  aria-hidden="true"
                  className="my-2 h-px"
                  style={{ background: 'var(--pt-divider)' }}
                />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => handlePick(kind)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: 'var(--pt-surface)',
                  border: '1px solid var(--pt-divider)',
                  outlineColor: 'var(--color-accent-500)',
                  transition: 'transform var(--duration-press) var(--ease-emil)',
                  borderRadius: '1rem',
                  textTransform: 'none',
                  height: 'auto',
                  justifyContent: 'flex-start',
                }}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                  style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}
                >
                  <Icon size={22} strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-[15px] font-semibold leading-tight"
                    style={{
                      fontFamily: 'var(--font-body)',
                      color: 'var(--pt-text)',
                    }}
                  >
                    {title}
                  </span>
                  <span
                    className="mt-0.5 block text-[12px] leading-snug"
                    style={{
                      fontFamily: 'var(--font-body)',
                      color: 'var(--pt-text-muted)',
                    }}
                  >
                    {description}
                  </span>
                </span>
              </Button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SaisirSheet;
