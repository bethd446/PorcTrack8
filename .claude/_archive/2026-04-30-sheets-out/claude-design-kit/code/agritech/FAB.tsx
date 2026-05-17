import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export type FABActionTone = 'default' | 'accent' | 'red' | 'amber';

export interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: FABActionTone;
}

export interface FABProps {
  /** Liste d'actions rapides (max 5). */
  actions: FABAction[];
  /** Icône principale du bouton (défaut : Plus). */
  mainIcon?: React.ReactNode;
  /** aria-label pour le bouton principal. */
  ariaLabel?: string;
  /** Extra classes pour composition. */
  className?: string;
}

const TONE_CLASS: Record<FABActionTone, string> = {
  default: 'text-text-0',
  accent: 'text-accent',
  red: 'text-red',
  amber: 'text-amber',
};

/**
 * Floating Action Button central avec menu d'actions contextuelles.
 *
 * Comportement :
 * - Bouton rond 56px positionné au-dessus de la barre de navigation (80px bottom
 *   + safe-area). Centré horizontalement.
 * - Tap → ouvre un menu vertical (stacké au-dessus du bouton) avec stagger 40ms.
 * - Tap hors / Escape → ferme le menu, focus retourne au bouton principal.
 * - Focus trap simple : Tab cycle entre les actions quand le menu est ouvert.
 * - Icon principale tourne de 45° (Plus → X) quand le menu est ouvert.
 *
 * Accessibility :
 * - Menu : role="dialog" + aria-modal="true" quand ouvert.
 * - Bouton : aria-expanded + aria-haspopup="menu".
 * - Chaque action est un button avec aria-label=label.
 *
 * @example
 * ```tsx
 * <FAB
 *   actions={[
 *     { icon: <Syringe />, label: 'IA', onClick: onIA, tone: 'accent' },
 *     { icon: <Baby />, label: 'Mise-bas', onClick: onMB, tone: 'amber' },
 *   ]}
 * />
 * ```
 */
const FAB: React.FC<FABProps> = ({
  actions,
  mainIcon,
  ariaLabel = 'Actions rapides',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mainBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // On limite à 5 actions max pour garder la lisibilité.
  const visibleActions = actions.slice(0, 5);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  // Esc → ferme + tap hors → ferme
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        mainBtnRef.current?.focus();
      }
    };

    const handlePointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        close();
      }
    };

    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', handlePointer);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('pointerdown', handlePointer);
    };
  }, [open, close]);

  // Focus trap minimal : à l'ouverture, focus la première action.
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button[data-fab-action]');
    first?.focus();
  }, [open]);

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    close();
  };

  // Focus trap : Tab cycle sur les actions + bouton principal
  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const nodeList = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[data-fab-action]'
    );
    if (!nodeList || nodeList.length === 0) return;
    const list: HTMLButtonElement[] = Array.from(nodeList);
    const currentIndex = list.indexOf(document.activeElement as HTMLButtonElement);

    if (e.shiftKey) {
      if (currentIndex <= 0) {
        e.preventDefault();
        list[list.length - 1]?.focus();
      }
    } else {
      if (currentIndex === list.length - 1) {
        e.preventDefault();
        list[0]?.focus();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-40 flex flex-col items-center',
        className
      )}
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 80px)`,
      }}
    >
      {/* Menu actions — rendu seulement si ouvert pour éviter les tab-stops fantômes */}
      {open && (
        <div
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          onKeyDown={handleMenuKeyDown}
          className="mb-3 flex flex-col items-center gap-2"
        >
          {visibleActions.map((action, i) => {
            const tone = action.tone ?? 'default';
            return (
              <button
                key={`${action.label}-${i}`}
                type="button"
                data-fab-action
                onClick={() => handleActionClick(action)}
                aria-label={action.label}
                className={cn(
                  'card-v2 flex items-center gap-3 pl-3 pr-4 py-2',
                  'shadow-lg opacity-0',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
                )}
                style={{
                  animation: `fab-action-in 220ms var(--ease-spring) forwards`,
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full',
                    'bg-bg-2',
                    TONE_CLASS[tone]
                  )}
                  aria-hidden="true"
                >
                  {action.icon}
                </span>
                <span className="font-sans text-[13px] font-medium text-text-0 whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bouton principal */}
      <button
        ref={mainBtnRef}
        type="button"
        onClick={toggle}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'h-14 w-14 rounded-full',
          'flex items-center justify-center',
          'bg-accent text-bg-0',
          'shadow-lg shadow-accent/30',
          'transition-transform duration-200',
          'active:scale-[0.94]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
        )}
        style={{
          transitionTimingFunction: 'var(--ease-spring)',
        }}
      >
        <span
          className="inline-flex items-center justify-center transition-transform duration-200"
          style={{
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            transitionTimingFunction: 'var(--ease-spring)',
          }}
          aria-hidden="true"
        >
          {mainIcon ?? <Plus size={24} strokeWidth={2.5} />}
        </span>
      </button>

      {/* Keyframes inline — scoped ici pour éviter de polluer index.css */}
      <style>{`
        @keyframes fab-action-in {
          0%   { opacity: 0; transform: translateY(8px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes fab-action-in {
            0%, 100% { opacity: 1; transform: none; }
          }
        }
      `}</style>
    </div>
  );
};

export default FAB;
