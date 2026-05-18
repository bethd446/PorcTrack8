/**
 * V70 — Dialog (Sprint 8 patterns transverses)
 *
 * Modal centré (différent du bottom-sheet). Backdrop rgba(0,0,0,0.55),
 * card centrée pattern .dialog__card. 2 boutons en footer : Annuler ghost
 * + Action variant. Trap focus, escape pour fermer.
 */
import React, { useEffect, useRef } from 'react';

export type DialogActionVariant = 'danger' | 'primary';

export interface DialogProps {
  isOpen: boolean;
  onDismiss: () => void;
  title: string;
  body?: React.ReactNode;
  cancelLabel?: string;
  actionLabel: string;
  actionVariant?: DialogActionVariant;
  onAction: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onDismiss,
  title,
  body,
  cancelLabel = 'Annuler',
  actionLabel,
  actionVariant = 'primary',
  onAction,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // ESC pour fermer
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onDismiss]);

  // focus trap minimal + restore focus
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    if (!card) return;
    const focusables = card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables.length > 0) focusables[0].focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    card.addEventListener('keydown', trap);
    return () => {
      card.removeEventListener('keydown', trap);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const actionClassName =
    actionVariant === 'danger'
      ? 'btn btn--primary btn--sm btn--danger'
      : 'btn btn--primary btn--sm';

  return (
    <div
      className="pt-backdrop pt-backdrop--center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div
        ref={cardRef}
        className="dialog__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pt-dialog-title"
      >
        <h2 id="pt-dialog-title" className="dialog__title">
          {title}
        </h2>
        {body && <p className="dialog__body">{body}</p>}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 6,
          }}
        >
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onDismiss}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={actionClassName}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
