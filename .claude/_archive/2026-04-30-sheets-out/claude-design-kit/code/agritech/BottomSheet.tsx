import React from 'react';
import { IonModal } from '@ionic/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional title rendered in the sheet header. */
  title?: string;
  children: React.ReactNode;
  /** `auto` uses breakpoint stops; `full` snaps to 0.9. */
  height?: 'auto' | 'full';
  /** Extra className on the inner content wrapper. */
  className?: string;
}

/**
 * Bottom sheet built on top of IonModal with breakpoints, styled dark.
 * Replaces ad-hoc IonModal usage for quick forms / action sheets.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  className,
}) => {
  const breakpoints = height === 'full' ? [0, 0.9] : [0, 0.5, 0.9];
  const initialBreakpoint = height === 'full' ? 0.9 : 0.5;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      breakpoints={breakpoints}
      initialBreakpoint={initialBreakpoint}
      handle={true}
      className="agritech-bottom-sheet"
      aria-label={title}
    >
      <div
        className={cn(
          'flex h-full flex-col bg-bg-1 text-text-0',
          className
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="agritech-heading text-[18px] uppercase tracking-wide">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-1 pressable focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </IonModal>
  );
};

export default BottomSheet;
