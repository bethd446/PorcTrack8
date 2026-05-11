/**
 * V70 — LongPressSheet (Sprint 8 patterns transverses)
 *
 * Action sheet bottom déclenché sur long-press. Eyebrow + titre + actions
 * verticales (avec variant danger pour les actions destructives) + bouton
 * Annuler en bas.
 */
import React, { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface LongPressAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'danger';
}

export interface LongPressSheetProps {
  isOpen: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  actions: LongPressAction[];
  cancelLabel?: string;
}

export const LongPressSheet: React.FC<LongPressSheetProps> = ({
  isOpen,
  onClose,
  eyebrow,
  title,
  actions,
  cancelLabel = 'Annuler',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="pt-backdrop pt-backdrop--bottom"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lp-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="lp-sheet__handle" aria-hidden="true" />
        <div className="lp-sheet__head">
          <div className="lp-sheet__head-main">
            <div
              style={{
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--pt-subtle)',
              }}
            >
              {eyebrow}
            </div>
            <div className="lp-sheet__title">{title}</div>
          </div>
        </div>
        <div className="lp-sheet__actions">
          {actions.map((action, i) => {
            const Icon = action.icon;
            const className =
              action.variant === 'danger' ? 'lp-action lp-action--danger' : 'lp-action';
            return (
              <button
                key={i}
                type="button"
                className={className}
                onClick={() => {
                  action.onClick();
                }}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="lp-cancel" onClick={onClose}>
          {cancelLabel}
        </button>
      </div>
    </div>
  );
};
